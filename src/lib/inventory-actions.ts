'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { Prisma } from '@prisma/client';
import { createAuditLog } from './audit-log';
import { revalidatePath } from 'next/cache';

/**
 * Access Check Helper
 */
export async function checkInventoryAccess() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Không có quyền truy cập');
  
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) {
    throw new Error('Unauthorized'); // 403 like
  }

  return user;
}

/**
 * Cost Visibility Helper
 */
function canViewCost(role: string) {
  return ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role);
}

/**
 * Data masking for Production
 */
function maskItemCost(item: any, canView: boolean) {
  if (canView) return item;
  return {
    ...item,
    standardCost: null,
    lastPurchaseCost: null,
  };
}

function maskTxCost(tx: any, canView: boolean) {
  if (canView) return tx;
  return {
    ...tx,
    unitCost: null,
    totalCost: null,
  };
}

/**
 * Page Data
 */
export async function getInventoryPageData() {
  const user = await checkInventoryAccess();
  const canView = canViewCost(user.role);

  // Statistics
  const totalItems = await db.inventoryItem.count({ where: { status: 'ACTIVE' } });
  
  const allActive = await db.inventoryItem.findMany({
    where: { status: 'ACTIVE' },
    select: { currentStock: true, standardCost: true, minStock: true, availableStock: true }
  });

  const lowStockCount = allActive.filter(i => i.availableStock > 0 && i.availableStock <= i.minStock).length;
  const outOfStockCount = allActive.filter(i => i.availableStock <= 0).length;
  
  let totalValue = 0;
  if (canView) {
    totalValue = allActive.reduce((sum, item) => sum + (item.currentStock * (item.standardCost || 0)), 0);
  }

  return {
    kpis: {
      totalItems,
      lowStockCount,
      outOfStockCount,
      totalValue: canView ? totalValue : null,
    }
  };
}

/**
 * Get Items
 */
export async function getInventoryItems(filters: any = {}) {
  const user = await checkInventoryAccess();
  const canView = canViewCost(user.role);

  const where: Prisma.InventoryItemWhereInput = {};
  
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search } },
      { itemCode: { contains: filters.search } },
    ];
  }
  if (filters.category) where.category = filters.category;
  if (filters.materialType) where.materialType = filters.materialType;
  if (filters.status) where.status = filters.status;
  
  if (filters.alert === 'LOW_STOCK') {
    where.availableStock = { lte: db.inventoryItem.fields.minStock, gt: 0 };
  } else if (filters.alert === 'OUT_OF_STOCK') {
    where.availableStock = { lte: 0 };
  }

  const orderBy: Prisma.InventoryItemOrderByWithRelationInput = {};
  if (filters.sortBy === 'stockAsc') orderBy.availableStock = 'asc';
  else if (filters.sortBy === 'stockDesc') orderBy.availableStock = 'desc';
  else orderBy.createdAt = 'desc';

  const items = await db.inventoryItem.findMany({
    where,
    orderBy,
  });

  return items.map(i => maskItemCost(i, canView));
}

/**
 * Create Item
 */
export async function createInventoryItem(input: any) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền tạo vật tư');

  const { initialStock, ...data } = input;
  
  if (data.standardCost && !canViewCost(user.role)) {
    delete data.standardCost;
    delete data.lastPurchaseCost;
  }

  const existing = await db.inventoryItem.findUnique({ where: { itemCode: data.itemCode } });
  if (existing) throw new Error('Mã vật tư đã tồn tại');

  const item = await db.$transaction(async (tx) => {
    const newItem = await tx.inventoryItem.create({
      data: {
        ...data,
        supplierName: input.supplierName || null,
        currentStock: 0,
        availableStock: 0,
        createdById: user.id
      }
    });

    if (initialStock && initialStock > 0) {
      await tx.inventoryItem.update({
        where: { id: newItem.id },
        data: {
          currentStock: initialStock,
          availableStock: initialStock
        }
      });
      
      const txCode = `TX-${Date.now()}`;
      await tx.inventoryTransaction.create({
        data: {
          transactionCode: txCode,
          itemId: newItem.id,
          type: 'ADJUSTMENT_INCREASE',
          quantity: initialStock,
          stockBefore: 0,
          stockAfter: initialStock,
          reason: 'Tồn đầu kỳ',
          referenceType: 'MANUAL_ADJUSTMENT',
          createdById: user.id
        }
      });
    }

    return newItem;
  });

  await createAuditLog({
    action: 'INVENTORY_ITEM_CREATED',
    entityType: 'InventoryItem',
    entityId: item.id,
    actorId: user.id,
    afterData: item
  });

  revalidatePath('/dashboard/inventory');
  return { success: true, id: item.id };
}

/**
 * Update Item
 */
export async function updateInventoryItem(id: string, input: any) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền sửa vật tư');

  const data = { ...input };
  if (!canViewCost(user.role)) {
    delete data.standardCost;
    delete data.lastPurchaseCost;
  }
  
  const existingCode = await db.inventoryItem.findFirst({
    where: { itemCode: data.itemCode, id: { not: id } }
  });
  if (existingCode) throw new Error('Mã vật tư đã tồn tại ở mục khác');

  const item = await db.inventoryItem.update({
    where: { id },
    data: {
      ...data,
      updatedById: user.id
    }
  });

  await createAuditLog({
    action: 'INVENTORY_ITEM_UPDATED',
    entityType: 'InventoryItem',
    entityId: item.id,
    actorId: user.id,
    afterData: item
  });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

/**
 * Inbound (Nhập kho)
 */
export async function createInboundTransaction(input: {
  itemId: string;
  quantity: number;
  unitCost?: number;
  referenceCode?: string;
  note?: string;
  createdAt?: string;
  supplierName?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền nhập kho');

  const qty = Math.abs(input.quantity);
  
  const txRecord = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');

    const stockBefore = item.currentStock;
    const stockAfter = stockBefore + qty;
    const availableStock = stockAfter - item.reservedStock;
    
    // Update Item
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStock: stockAfter,
        availableStock: availableStock,
        lastPurchaseCost: input.unitCost || item.lastPurchaseCost,
        supplierName: input.supplierName || item.supplierName,
      }
    });

    const txCode = `IN-${Date.now()}`;
    const newTx = await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: 'INBOUND',
        quantity: qty,
        unitCost: input.unitCost,
        totalCost: input.unitCost ? input.unitCost * qty : null,
        stockBefore,
        stockAfter,
        referenceType: 'PURCHASE',
        referenceCode: input.referenceCode,
        note: input.note,
        createdById: user.id,
        createdAt: input.createdAt ? new Date(input.createdAt) : undefined
      }
    });

    return newTx;
  });

  await createAuditLog({
    action: 'INVENTORY_INBOUND_CREATED',
    entityType: 'InventoryTransaction',
    entityId: txRecord.id,
    actorId: user.id,
  });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

/**
 * Outbound (Xuất kho)
 */
export async function createOutboundTransaction(input: {
  itemId: string;
  quantity: number;
  productionJobId?: string;
  orderId?: string;
  reason?: string;
  note?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'ACCOUNTANT') throw new Error('Kế toán không được xuất kho trực tiếp');

  const qty = Math.abs(input.quantity);
  
  const txRecord = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');

    if (item.availableStock < qty) {
      throw new Error(`Kho không đủ. Chỉ còn ${item.availableStock}`);
    }

    const stockBefore = item.currentStock;
    const stockAfter = stockBefore - qty;
    const availableStock = stockAfter - item.reservedStock;
    
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStock: stockAfter,
        availableStock: availableStock,
      }
    });

    const txCode = `OUT-${Date.now()}`;
    const newTx = await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: 'OUTBOUND',
        quantity: qty,
        stockBefore,
        stockAfter,
        referenceType: input.productionJobId ? 'PRODUCTION_JOB' : (input.orderId ? 'ORDER' : 'OTHER'),
        productionJobId: input.productionJobId || null,
        orderId: input.orderId || null,
        reason: input.reason,
        note: input.note,
        createdById: user.id
      }
    });

    return newTx;
  });

  await createAuditLog({
    action: 'INVENTORY_OUTBOUND_CREATED',
    entityType: 'InventoryTransaction',
    entityId: txRecord.id,
    actorId: user.id,
  });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

/**
 * Adjustment (Điều chỉnh)
 */
export async function createAdjustmentTransaction(input: {
  itemId: string;
  type: 'ADJUSTMENT_INCREASE' | 'ADJUSTMENT_DECREASE';
  quantity: number;
  reason: string;
  note?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền điều chỉnh tồn kho');
  if (!input.reason) throw new Error('Bắt buộc phải nhập lý do điều chỉnh');

  const qty = Math.abs(input.quantity);
  
  const txRecord = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');

    const stockBefore = item.currentStock;
    let stockAfter = stockBefore;

    if (input.type === 'ADJUSTMENT_INCREASE') {
      stockAfter += qty;
    } else {
      if (stockBefore - qty < item.reservedStock) {
        throw new Error('Không thể giảm tồn xuống thấp hơn lượng đã giữ (reserved)');
      }
      stockAfter -= qty;
    }

    const availableStock = stockAfter - item.reservedStock;
    
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStock: stockAfter,
        availableStock: availableStock,
      }
    });

    const txCode = `ADJ-${Date.now()}`;
    const newTx = await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: input.type,
        quantity: qty,
        stockBefore,
        stockAfter,
        referenceType: 'MANUAL_ADJUSTMENT',
        reason: input.reason,
        note: input.note,
        createdById: user.id
      }
    });

    return newTx;
  });

  await createAuditLog({
    action: 'INVENTORY_ADJUSTMENT_CREATED',
    entityType: 'InventoryTransaction',
    entityId: txRecord.id,
    actorId: user.id,
  });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

/**
 * Transactions
 */
export async function getInventoryTransactions(filters: any = {}) {
  const user = await checkInventoryAccess();
  const canView = canViewCost(user.role);

  const where: Prisma.InventoryTransactionWhereInput = {};
  if (filters.itemId) where.itemId = filters.itemId;
  if (filters.type) where.type = filters.type;
  
  const txs = await db.inventoryTransaction.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 100,
    include: {
      item: { select: { itemCode: true, name: true, unit: true } },
      createdBy: { select: { name: true } },
      productionJob: { select: { jobCode: true } }
    }
  });

  return txs.map(t => maskTxCost(t, canView));
}

/**
 * Reservation Logic
 */
export async function reserveInventory(input: { itemId: string; quantity: number; productionJobId?: string; orderId?: string; note?: string; }) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION' && !input.productionJobId) throw new Error('Production chỉ được reserve cho Job');

  const qty = Math.abs(input.quantity);

  const reservation = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');
    if (item.availableStock < qty) throw new Error(`Kho không đủ để giữ. Chỉ còn ${item.availableStock}`);

    const newReserved = item.reservedStock + qty;
    const newAvailable = item.currentStock - newReserved;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        reservedStock: newReserved,
        availableStock: newAvailable,
      }
    });

    const res = await tx.inventoryReservation.create({
      data: {
        itemId: item.id,
        productionJobId: input.productionJobId,
        orderId: input.orderId,
        quantity: qty,
        status: 'RESERVED',
        note: input.note,
        createdById: user.id
      }
    });

    const txCode = `RES-${Date.now()}`;
    await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: 'RESERVE',
        quantity: qty,
        stockBefore: item.currentStock,
        stockAfter: item.currentStock,
        referenceType: 'PRODUCTION_JOB',
        referenceId: res.id,
        createdById: user.id
      }
    });

    return res;
  });

  await createAuditLog({ action: 'INVENTORY_RESERVED', entityType: 'InventoryReservation', entityId: reservation.id, actorId: user.id });
  revalidatePath('/dashboard/inventory');
  return { success: true };
}

export async function releaseReservation(reservationId: string) {
  const user = await checkInventoryAccess();
  
  const res = await db.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({ where: { id: reservationId }, include: { item: true } });
    if (!reservation || reservation.status !== 'RESERVED') throw new Error('Không hợp lệ');

    const item = reservation.item;
    const newReserved = item.reservedStock - reservation.quantity;
    const newAvailable = item.currentStock - newReserved;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { reservedStock: newReserved, availableStock: newAvailable }
    });

    const updatedRes = await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: 'RELEASED', releasedAt: new Date() }
    });

    await tx.inventoryTransaction.create({
      data: {
        transactionCode: `REL-${Date.now()}`,
        itemId: item.id,
        type: 'RELEASE_RESERVE',
        quantity: reservation.quantity,
        stockBefore: item.currentStock,
        stockAfter: item.currentStock,
        referenceType: 'PRODUCTION_JOB',
        referenceId: reservation.id,
        createdById: user.id
      }
    });

    return updatedRes;
  });

  await createAuditLog({ action: 'INVENTORY_RESERVATION_RELEASED', entityType: 'InventoryReservation', entityId: res.id, actorId: user.id });
  revalidatePath('/dashboard/inventory');
  return { success: true };
}

export async function consumeReservation(reservationId: string) {
  const user = await checkInventoryAccess();
  
  const res = await db.$transaction(async (tx) => {
    const reservation = await tx.inventoryReservation.findUnique({ where: { id: reservationId }, include: { item: true } });
    if (!reservation || reservation.status !== 'RESERVED') throw new Error('Không hợp lệ');

    const item = reservation.item;
    const newReserved = item.reservedStock - reservation.quantity;
    const newCurrent = item.currentStock - reservation.quantity;
    const newAvailable = newCurrent - newReserved;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { reservedStock: newReserved, currentStock: newCurrent, availableStock: newAvailable }
    });

    const updatedRes = await tx.inventoryReservation.update({
      where: { id: reservationId },
      data: { status: 'CONSUMED', consumedAt: new Date() }
    });

    await tx.inventoryTransaction.create({
      data: {
        transactionCode: `CON-${Date.now()}`,
        itemId: item.id,
        type: 'CONSUME_RESERVED',
        quantity: reservation.quantity,
        stockBefore: item.currentStock,
        stockAfter: newCurrent,
        referenceType: 'PRODUCTION_JOB',
        referenceId: reservation.id,
        createdById: user.id
      }
    });

    return updatedRes;
  });

  await createAuditLog({ action: 'INVENTORY_RESERVATION_CONSUMED', entityType: 'InventoryReservation', entityId: res.id, actorId: user.id });
  revalidatePath('/dashboard/inventory');
  return { success: true };
}
