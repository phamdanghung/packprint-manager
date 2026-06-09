'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { createAuditLog } from './audit-log';
import { revalidatePath } from 'next/cache';
import { checkInventoryAccess } from './inventory-actions';

export const MOLD_SHAPES = ['ROUND', 'RECTANGLE', 'ROUNDED_RECTANGLE', 'OVAL', 'CUSTOM'];
export const MOLD_OWNER_TYPES = ['COMPANY', 'CUSTOMER'];
export const MOLD_STATUSES = ['AVAILABLE', 'RESERVED', 'IN_USE', 'DAMAGED', 'LOST', 'RETIRED'];

/**
 * Filter cost fields if user is not authorized
 */
function maskMoldCost(mold: any, canView: boolean) {
  if (canView) return mold;
  return {
    ...mold,
    createdCost: null,
    maintenanceCost: null,
  };
}

export async function createMold(input: any) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Production không được tạo khuôn');

  if (!MOLD_SHAPES.includes(input.shape)) throw new Error('Hình dáng không hợp lệ');
  if (!MOLD_OWNER_TYPES.includes(input.ownerType)) throw new Error('Owner Type không hợp lệ');

  const canViewCost = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role);
  if (!canViewCost) {
    delete input.createdCost;
    delete input.maintenanceCost;
  }

  const existing = await db.dieCutMold.findUnique({ where: { code: input.code } });
  if (existing) throw new Error('Mã khuôn đã tồn tại');

  const mold = await db.dieCutMold.create({
    data: {
      ...input,
      status: 'AVAILABLE',
      usageCount: 0,
    }
  });

  await createAuditLog({ action: 'MOLD_CREATED', entityType: 'DieCutMold', entityId: mold.id, actorId: user.id });
  revalidatePath('/dashboard/inventory/molds');
  return { success: true, id: mold.id };
}

export async function findMatchingMolds(input: {
  shape: string;
  widthCm: number;
  heightCm: number;
  diameterCm?: number;
  cornerRadiusCm?: number;
  customerId?: string;
}) {
  const tolerance = 0.1;

  const molds = await db.dieCutMold.findMany({
    where: {
      shape: input.shape,
      status: { in: ['AVAILABLE', 'RESERVED', 'IN_USE'] },
    }
  });

  const exactMatches: any[] = [];
  const nearMatches: any[] = [];
  const unavailableMatches: any[] = [];

  molds.forEach(mold => {
    let matches = false;
    let exact = false;

    if (input.shape === 'ROUND' || input.shape === 'OVAL') {
      const dDiff = Math.abs((mold.diameterCm || 0) - (input.diameterCm || 0));
      if (dDiff === 0) exact = true;
      if (dDiff <= tolerance) matches = true;
    } else {
      const wDiff = Math.abs(mold.widthCm - input.widthCm);
      const hDiff = Math.abs(mold.heightCm - input.heightCm);
      const rDiff = Math.abs((mold.cornerRadiusCm || 0) - (input.cornerRadiusCm || 0));

      if (wDiff === 0 && hDiff === 0 && rDiff === 0) exact = true;
      if (wDiff <= tolerance && hDiff <= tolerance && rDiff <= tolerance) matches = true;
    }

    if (matches) {
      // Prioritize customer's mold
      const isCustomerMold = mold.customerId === input.customerId;
      
      if (mold.status !== 'AVAILABLE') {
        unavailableMatches.push({ ...mold, isCustomerMold });
      } else if (exact) {
        exactMatches.push({ ...mold, isCustomerMold });
      } else {
        nearMatches.push({ ...mold, isCustomerMold });
      }
    }
  });

  exactMatches.sort((a, b) => (b.isCustomerMold ? 1 : 0) - (a.isCustomerMold ? 1 : 0));
  nearMatches.sort((a, b) => (b.isCustomerMold ? 1 : 0) - (a.isCustomerMold ? 1 : 0));

  const needNewMold = exactMatches.length === 0 && nearMatches.length === 0;

  return { exactMatches, nearMatches, unavailableMatches, needNewMold };
}

export async function reserveMold(moldId: string, orderId?: string, productionJobId?: string) {
  const user = await checkInventoryAccess();

  const mold = await db.$transaction(async (tx) => {
    const m = await tx.dieCutMold.findUnique({ where: { id: moldId } });
    if (!m) throw new Error('Khuôn không tồn tại');
    if (m.status !== 'AVAILABLE') throw new Error(`Khuôn đang ở trạng thái ${m.status}, không thể giữ`);

    await tx.dieCutMold.update({
      where: { id: moldId },
      data: { status: 'RESERVED' }
    });

    await tx.dieCutMoldUsage.create({
      data: {
        moldId,
        orderId,
        productionJobId,
        status: 'RESERVED',
        note: 'Reserved for upcoming production',
      }
    });

    return m;
  });

  revalidatePath('/dashboard/inventory/molds');
  return { success: true };
}

export async function checkoutMold(moldId: string, orderId?: string, productionJobId?: string) {
  const user = await checkInventoryAccess();

  const mold = await db.$transaction(async (tx) => {
    const m = await tx.dieCutMold.findUnique({ where: { id: moldId } });
    if (!m) throw new Error('Khuôn không tồn tại');
    if (m.status === 'DAMAGED' || m.status === 'LOST' || m.status === 'RETIRED') {
      throw new Error(`Khuôn hỏng/mất/hủy, không thể dùng`);
    }

    await tx.dieCutMold.update({
      where: { id: moldId },
      data: { status: 'IN_USE' }
    });

    // Update existing reservation if exists, else create new
    const existing = await tx.dieCutMoldUsage.findFirst({
      where: { moldId, status: 'RESERVED', OR: [{ orderId }, { productionJobId }] }
    });

    if (existing) {
      await tx.dieCutMoldUsage.update({
        where: { id: existing.id },
        data: {
          status: 'IN_USE',
          checkedOutById: user.id,
          checkedOutAt: new Date(),
        }
      });
    } else {
      await tx.dieCutMoldUsage.create({
        data: {
          moldId,
          orderId,
          productionJobId,
          status: 'IN_USE',
          checkedOutById: user.id,
          checkedOutAt: new Date(),
        }
      });
    }

    return m;
  });

  revalidatePath('/dashboard/inventory/molds');
  return { success: true };
}

export async function returnMold(moldId: string, statusAfterReturn: string = 'AVAILABLE', note?: string) {
  const user = await checkInventoryAccess();

  if (!['AVAILABLE', 'DAMAGED', 'LOST'].includes(statusAfterReturn)) {
    throw new Error('Trạng thái trả khuôn không hợp lệ');
  }

  const mold = await db.$transaction(async (tx) => {
    const m = await tx.dieCutMold.findUnique({ where: { id: moldId } });
    if (!m) throw new Error('Khuôn không tồn tại');
    if (m.status !== 'IN_USE') throw new Error('Khuôn chưa được checkout');

    const newUsageCount = statusAfterReturn === 'AVAILABLE' ? m.usageCount + 1 : m.usageCount;

    await tx.dieCutMold.update({
      where: { id: moldId },
      data: { 
        status: statusAfterReturn,
        usageCount: newUsageCount
      }
    });

    const activeUsage = await tx.dieCutMoldUsage.findFirst({
      where: { moldId, status: 'IN_USE' },
      orderBy: { checkedOutAt: 'desc' }
    });

    if (activeUsage) {
      await tx.dieCutMoldUsage.update({
        where: { id: activeUsage.id },
        data: {
          status: 'RETURNED',
          returnedById: user.id,
          returnedAt: new Date(),
          note: note ? `${activeUsage.note || ''} | Return: ${note}` : activeUsage.note
        }
      });
    }

    return m;
  });

  revalidatePath('/dashboard/inventory/molds');
  return { success: true };
}
