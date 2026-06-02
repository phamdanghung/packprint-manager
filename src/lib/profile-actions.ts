'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { createAuditLog } from './audit-log';
import bcrypt from 'bcryptjs';

export async function getMyProfile() {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  const user = await db.user.findUnique({
    where: { id: currentUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      phone: true,
      department: true,
      role: true,
      status: true,
    }
  });

  return user;
}

export async function updateMyProfile(input: { name: string; phone?: string }) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  const beforeData = await db.user.findUnique({ where: { id: currentUser.id } });

  const updatedUser = await db.user.update({
    where: { id: currentUser.id },
    data: {
      name: input.name,
      phone: input.phone || null,
    }
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: updatedUser.name,
    actorRole: updatedUser.role,
    action: 'USER_PROFILE_UPDATED',
    entityType: 'User',
    entityId: currentUser.id,
    description: `Cập nhật hồ sơ cá nhân`,
    beforeData,
    afterData: updatedUser,
  });

  return true;
}

export async function updateMyPassword(currentPasswordPlain: string, newPasswordPlain: string) {
  const currentUser = await getCurrentUser();
  if (!currentUser) throw new Error('Unauthorized');

  const user = await db.user.findUnique({ where: { id: currentUser.id } });
  if (!user) throw new Error('User not found');

  const isMatch = bcrypt.compareSync(currentPasswordPlain, user.passwordHash);
  if (!isMatch) {
    throw new Error('Mật khẩu hiện tại không chính xác.');
  }

  const newPasswordHash = bcrypt.hashSync(newPasswordPlain, 10);

  await db.user.update({
    where: { id: currentUser.id },
    data: { passwordHash: newPasswordHash }
  });

  // Log out other sessions by deleting all sessions except the current one? 
  // For MVP, just delete all sessions so user has to re-login.
  await db.session.deleteMany({
    where: { userId: currentUser.id },
  });

  await createAuditLog({
    actorId: currentUser.id,
    actorName: currentUser.name,
    actorRole: currentUser.role,
    action: 'USER_PASSWORD_CHANGED',
    entityType: 'User',
    entityId: currentUser.id,
    description: `Tự thay đổi mật khẩu`,
  });

  return true;
}
