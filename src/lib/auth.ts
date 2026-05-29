'use server';

import { cookies, headers } from 'next/headers';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { db } from './db';

const SESSION_COOKIE_NAME = 'packprint_session';

export interface UserSession {
  id: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'MANAGER' | 'SALES' | 'DESIGNER' | 'PRODUCTION' | 'ACCOUNTANT' | 'DELIVERY';
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/**
 * Đăng nhập người dùng bằng email và password
 */
export async function login(email: string, passwordPlain: string): Promise<{ success: boolean; error?: string }> {
  try {
    const user = await db.user.findUnique({
      where: { email },
    });

    if (!user) {
      return { success: false, error: 'Tài khoản không tồn tại trên hệ thống.' };
    }

    if (user.status === 'INACTIVE') {
      return { success: false, error: 'Tài khoản đã bị khóa hoặc ngừng hoạt động.' };
    }

    const isMatch = bcrypt.compareSync(passwordPlain, user.passwordHash);
    if (!isMatch) {
      return { success: false, error: 'Mật khẩu không chính xác.' };
    }

    // Sinh token ngẫu nhiên, dài và khó đoán
    const sessionToken = crypto.randomBytes(32).toString('hex');
    const tokenHash = hashToken(sessionToken);

    // Lưu session vào database
    const expiresAt = new Date(Date.now() + 60 * 60 * 24 * 7 * 1000); // 7 ngày
    
    // Lấy user-agent và ip từ request headers nếu có
    let userAgent: string | undefined = undefined;
    let ipAddress: string | undefined = undefined;
    try {
      const headersList = await headers();
      userAgent = headersList.get('user-agent') || undefined;
      ipAddress = headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || undefined;
    } catch (e) {
      // Bỏ qua nếu chạy trong ngữ cảnh không có headers (như build time)
    }

    await db.session.create({
      data: {
        userId: user.id,
        tokenHash,
        expiresAt,
        userAgent,
        ipAddress,
      },
    });

    // Chỉ lưu sessionToken raw trong cookie
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionToken, {
      httpOnly: true,
      secure: (process.env.NODE_ENV as string) === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 ngày
    });

    return { success: true };
  } catch (error: any) {
    console.error('Lỗi đăng nhập:', error);
    const errMsg = error instanceof Error ? error.message : String(error);
    return { success: false, error: `Lỗi kết nối CSDL hoặc lỗi hệ thống: ${errMsg}` };
  }
}

/**
 * Đăng xuất người dùng, xóa cookie session và revoke session trong database
 */
export async function logout(): Promise<void> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    
    if (cookie && cookie.value) {
      const tokenHash = hashToken(cookie.value);
      
      // Revoke hoặc xóa hẳn session khỏi database
      await db.session.deleteMany({
        where: { tokenHash },
      });
    }

    cookieStore.delete(SESSION_COOKIE_NAME);
  } catch (error) {
    console.error('Lỗi đăng xuất:', error);
  }
}

/**
 * Lấy thông tin user hiện tại bằng cách truy vấn database dựa trên sessionToken
 */
export async function getCurrentUser(): Promise<UserSession | null> {
  try {
    const cookieStore = await cookies();
    const cookie = cookieStore.get(SESSION_COOKIE_NAME);
    if (!cookie || !cookie.value) return null;

    const tokenHash = hashToken(cookie.value);

    // Query session trong database
    const session = await db.session.findUnique({
      where: { tokenHash },
      include: {
        user: true,
      },
    });

    // Kiểm tra session hợp lệ
    if (!session || (session as any).revokedAt || session.expiresAt < new Date()) {
      // Nếu session không hợp lệ nhưng vẫn còn cookie, xóa cookie và session thừa
      if (session) {
        await db.session.deleteMany({ where: { tokenHash } });
      }
      return null;
    }

    // Kiểm tra trạng thái hoạt động của User
    const user = session.user;
    if (!user || user.status === 'INACTIVE') {
      // Thu hồi session
      await db.session.deleteMany({ where: { tokenHash } });
      return null;
    }

    // Trả về UserSession an toàn, loại bỏ hoàn toàn passwordHash
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role as any,
    };
  } catch (error) {
    return null;
  }
}

/**
 * Server Action chuyển đổi vai trò nhanh dành cho mục đích DEMO hệ thống.
 * QUAN TRỌNG: Server Action này được bảo vệ hai lớp:
 *   1. UI layer: isDemoMode=false → component không render → không có event trigger
 *   2. Server layer: NODE_ENV phải là 'development', mọi call trong production đều bị từ chối
 */
export async function switchRoleDemo(newRole: 'ADMIN' | 'MANAGER' | 'SALES' | 'DESIGNER' | 'PRODUCTION' | 'ACCOUNTANT' | 'DELIVERY'): Promise<boolean> {
  // Lớp bảo vệ server: tuyệt đối từ chối trên production
  if (process.env.NODE_ENV !== 'development') {
    console.error('[SECURITY] switchRoleDemo bị từ chối: không phải môi trường development.');
    return false;
  }
  
  try {
    const headersList = await headers();
    const host = headersList.get('host') || '';
    if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
      console.error('[SECURITY] switchRoleDemo bị từ chối: không phải localhost.');
      return false;
    }
  } catch (e) {
    return false;
  }

  try {
    const currentUser = await getCurrentUser();
    if (!currentUser) return false;

    // Chỉ cập nhật vai trò trong development
    await db.user.update({
      where: { id: currentUser.id },
      data: { role: newRole },
    });

    return true;
  } catch (error) {
    console.error('Lỗi khi chuyển vai trò demo:', error);
    return false;
  }
}
