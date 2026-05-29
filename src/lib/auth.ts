'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';
import { db } from './db';

const SESSION_COOKIE_NAME = 'packprint_session';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'SALE' | 'DESIGNER' | 'PRODUCTION' | 'ACCOUNTANT';
}

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * Đăng nhập người dùng bằng email và password
 */
export async function login(email: string, passwordPlain: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      return { success: false, error: 'Tài khoản không tồn tại hoặc đã bị khóa.' };
    }

    const hashed = hashPassword(passwordPlain);
    if (user.passwordHash !== hashed) {
      return { success: false, error: 'Mật khẩu không chính xác.' };
    }

    // Tạo session
    const sessionData: UserSession = {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    };

    // Encode thành base64 để lưu vào cookie
    const serialized = Buffer.from(JSON.stringify(sessionData)).toString('base64');
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, serialized, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi đăng nhập:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Lỗi kết nối CSDL: ${errMsg}` };
  }
}

/**
 * Đăng xuất người dùng, xóa cookie session
 */
export async function logout(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Lấy thông tin user hiện tại từ cookie session
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie || !cookie.value) return null;

    const decoded = Buffer.from(cookie.value, 'base64').toString('utf-8');
    const user = JSON.parse(decoded) as UserSession;
    return user;
  } catch (error) {
    return null;
  }
}

/**
 * Server Action chuyển đổi vai trò nhanh dành cho mục đích DEMO hệ thống
 */
export async function switchRoleDemo(newRole: 'ADMIN' | 'SALE' | 'DESIGNER' | 'PRODUCTION' | 'ACCOUNTANT'): Promise<boolean> {
  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    // Cập nhật vai trò trong session hiện tại
    const updatedSession: UserSession = {
      ...currentUser,
      role: newRole,
    };

    const serialized = Buffer.from(JSON.stringify(updatedSession)).toString('base64');
    
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, serialized, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7,
    });

    return true;
  } catch (error) {
    console.error('Lỗi khi chuyển vai trò demo:', error);
    return false;
  }
}
