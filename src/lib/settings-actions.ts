'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { createAuditLog } from './audit-log';
import bcrypt from 'bcryptjs';

// ---- USER MANAGEMENT ----

export async function getUsers() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  const users = await db.user.findMany({
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      department: true,
      phone: true,
      status: true,
      createdAt: true,
      lastLoginAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return users;
}

export async function createUser(input: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  if (currentUser.role === 'MANAGER' && input.role === 'ADMIN') {
    throw new Error('Manager không được tạo tài khoản ADMIN.');
  }

  const existing = await db.user.findUnique({ where: { email: input.email } });
  if (existing) {
    throw new Error('Email này đã được sử dụng.');
  }

  const passwordHash = bcrypt.hashSync(input.password, 10);

  const newUser = await db.user.create({
    data: {
      name: input.name,
      email: input.email,
      phone: input.phone || null,
      department: input.department || null,
      role: input.role,
      passwordHash,
      status: input.status || 'ACTIVE',
    },
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'USER_CREATED',
    entityType: 'User',
    entityId: newUser.id,
    entityCode: newUser.email,
    description: `Tạo tài khoản mới: ${newUser.name} (${newUser.role})`,
    afterData: { ...input, password: '***' },
  });

  return newUser.id;
}

export async function updateUser(userId: string, input: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error('Người dùng không tồn tại.');

  if (currentUser.role === 'MANAGER' && targetUser.role === 'ADMIN') {
    throw new Error('Manager không được sửa tài khoản ADMIN.');
  }
  if (currentUser.role === 'MANAGER' && input.role === 'ADMIN') {
    throw new Error('Manager không được cấp quyền ADMIN cho người khác.');
  }
  
  if (currentUser.role === 'ADMIN' && targetUser.id === currentUser.id && input.role !== 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (adminCount <= 1) {
      throw new Error('Không thể đổi quyền khi bạn là ADMIN duy nhất còn hoạt động.');
    }
  }

  const updatedUser = await db.user.update({
    where: { id: userId },
    data: {
      name: input.name,
      phone: input.phone || null,
      department: input.department || null,
      role: input.role,
    },
  });

  const changedFields: any = {};
  if (targetUser.name !== input.name) changedFields.name = input.name;
  if (targetUser.phone !== input.phone) changedFields.phone = input.phone;
  if (targetUser.department !== input.department) changedFields.department = input.department;

  if (targetUser.role !== input.role) {
    changedFields.role = input.role;
    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'USER_ROLE_CHANGED',
      entityType: 'User',
      entityId: targetUser.id,
      entityCode: targetUser.email,
      description: `Đổi vai trò: ${targetUser.role} -> ${input.role}`,
      beforeData: { role: targetUser.role },
      afterData: { role: input.role },
    });
  }

  if (Object.keys(changedFields).length > 0) {
    await createAuditLog({
      actorId: currentUser.id,
      actorName: currentUser.name,
      actorRole: currentUser.role,
      action: 'USER_UPDATED',
      entityType: 'User',
      entityId: targetUser.id,
      entityCode: targetUser.email,
      description: `Cập nhật thông tin tài khoản`,
      beforeData: targetUser,
      afterData: input,
    });
  }

  return true;
}

export async function deactivateUser(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error('Người dùng không tồn tại.');

  if (currentUser.role === 'MANAGER' && targetUser.role === 'ADMIN') {
    throw new Error('Manager không được vô hiệu hóa ADMIN.');
  }

  if (targetUser.role === 'ADMIN') {
    const adminCount = await db.user.count({ where: { role: 'ADMIN', status: 'ACTIVE' } });
    if (adminCount <= 1) {
      throw new Error('Không thể vô hiệu hóa ADMIN duy nhất còn hoạt động.');
    }
  }

  await db.user.update({
    where: { id: userId },
    data: {
      status: 'INACTIVE',
      deactivatedAt: new Date(),
      deactivatedById: currentUser.id,
    },
  });

  // Xóa các session hiện tại của user để force logout
  await db.session.deleteMany({
    where: { userId },
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'USER_DEACTIVATED',
    entityType: 'User',
    entityId: targetUser.id,
    entityCode: targetUser.email,
    description: `Vô hiệu hóa tài khoản`,
  });

  return true;
}

export async function reactivateUser(userId: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error('Người dùng không tồn tại.');

  if (currentUser.role === 'MANAGER' && targetUser.role === 'ADMIN') {
    throw new Error('Manager không được khôi phục ADMIN.');
  }

  await db.user.update({
    where: { id: userId },
    data: {
      status: 'ACTIVE',
      deactivatedAt: null,
      deactivatedById: null,
    },
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'USER_REACTIVATED',
    entityType: 'User',
    entityId: targetUser.id,
    entityCode: targetUser.email,
    description: `Khôi phục tài khoản`,
  });

  return true;
}

export async function resetUserPassword(userId: string, newPasswordPlain: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  const targetUser = await db.user.findUnique({ where: { id: userId } });
  if (!targetUser) throw new Error('Người dùng không tồn tại.');

  if (currentUser.role === 'MANAGER' && targetUser.role === 'ADMIN') {
    throw new Error('Manager không được reset mật khẩu của ADMIN.');
  }

  const passwordHash = bcrypt.hashSync(newPasswordPlain, 10);

  await db.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  // Đăng xuất user trên các thiết bị khác
  await db.session.deleteMany({
    where: { userId },
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'USER_PASSWORD_RESET',
    entityType: 'User',
    entityId: targetUser.id,
    entityCode: targetUser.email,
    description: `Đặt lại mật khẩu`,
  });

  return true;
}

// ---- COMPANY SETTINGS ----

export async function getCompanySettings() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized'); // Any logged in user might need info like logo for invoice

  let settings = await db.companySettings.findUnique({
    where: { id: 'default' },
  });

  if (!settings) {
    // Create default if not exists
    settings = await db.companySettings.create({
      data: {
        id: 'default',
        companyName: 'Công ty TNHH PackPrint',
      }
    });
  }

  return settings;
}

export async function updateCompanySettings(input: any) {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  const beforeData = await db.companySettings.findUnique({ where: { id: 'default' } });

  const updated = await db.companySettings.upsert({
    where: { id: 'default' },
    update: {
      companyName: input.companyName,
      brandName: input.brandName || null,
      taxCode: input.taxCode || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      logoUrl: input.logoUrl || null,
      quoteFooterNote: input.quoteFooterNote || null,
      paymentTerms: input.paymentTerms || null,
      bankName: input.bankName || null,
      bankAccountNumber: input.bankAccountNumber || null,
      bankAccountHolder: input.bankAccountHolder || null,
      bankBranch: input.bankBranch || null,
      updatedById: currentUser.id,
    },
    create: {
      id: 'default',
      companyName: input.companyName,
      brandName: input.brandName || null,
      taxCode: input.taxCode || null,
      address: input.address || null,
      phone: input.phone || null,
      email: input.email || null,
      website: input.website || null,
      logoUrl: input.logoUrl || null,
      quoteFooterNote: input.quoteFooterNote || null,
      paymentTerms: input.paymentTerms || null,
      bankName: input.bankName || null,
      bankAccountNumber: input.bankAccountNumber || null,
      bankAccountHolder: input.bankAccountHolder || null,
      bankBranch: input.bankBranch || null,
      updatedById: currentUser.id,
    }
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'COMPANY_SETTINGS_UPDATED',
    entityType: 'CompanySettings',
    entityId: 'default',
    description: `Cập nhật thông tin công ty`,
    beforeData,
    afterData: updated,
  });

  return updated;
}

// ---- AUDIT LOGS ----

export async function getSystemAuditLogs() {
  const currentUser = await getCurrentUser();
  if (!currentUser || (currentUser.role !== 'ADMIN' && currentUser.role !== 'MANAGER')) {
    throw new Error('Unauthorized');
  }

  let logs = await db.systemAuditLog.findMany({
    orderBy: { createdAt: 'desc' },
    take: 500, // Limit for MVP
  });

  // Nếu là MANAGER, ẩn bớt log nhạy cảm của ADMIN (ví dụ liên quan tới user ADMIN khác)
  if (currentUser.role === 'MANAGER') {
    logs = logs.map(log => {
      // Ẩn detail data nếu thao tác liên quan ADMIN
      if (log.actorRole === 'ADMIN' || (log.description && log.description.includes('ADMIN'))) {
        return {
          ...log,
          beforeJson: null,
          afterJson: null,
          description: log.description + ' (Detail hidden by Security Policy)'
        };
      }
      return log;
    });
  }

  return logs;
}
