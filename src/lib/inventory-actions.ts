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
    select: { currentStockBase: true, reservedStockBase: true, standardCost: true, minStockBase: true, unitScale: true }
  });

  const lowStockCount = allActive.filter(i => {
    const avail = i.currentStockBase - i.reservedStockBase;
    return avail > 0 && avail <= i.minStockBase;
  }).length;
  const outOfStockCount = allActive.filter(i => (i.currentStockBase - i.reservedStockBase) <= 0).length;
  
  let totalValue = 0;
  if (canView) {
    totalValue = allActive.reduce((sum, item) => sum + ((item.currentStockBase / item.unitScale) * (item.standardCost || 0)), 0);
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
  
  const orderBy: Prisma.InventoryItemOrderByWithRelationInput = { createdAt: 'desc' };

  let items = await db.inventoryItem.findMany({
    where,
    orderBy,
  });

  if (filters.alert === 'LOW_STOCK') {
    items = items.filter(i => {
      const avail = i.currentStockBase - i.reservedStockBase;
      return avail > 0 && avail <= i.minStockBase;
    });
  } else if (filters.alert === 'OUT_OF_STOCK') {
    items = items.filter(i => (i.currentStockBase - i.reservedStockBase) <= 0);
  }

  if (filters.sortBy === 'stockAsc') {
    items.sort((a, b) => (a.currentStockBase - a.reservedStockBase) - (b.currentStockBase - b.reservedStockBase));
  } else if (filters.sortBy === 'stockDesc') {
    items.sort((a, b) => (b.currentStockBase - b.reservedStockBase) - (a.currentStockBase - a.reservedStockBase));
  }

  return items.map(i => maskItemCost({
    ...i,
    availableStockBase: i.currentStockBase - i.reservedStockBase
  }, canView));
}

/**
 * Create Item
 */
export async function createInventoryItem(input: any) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền tạo vật tư');

  const { initialStockBase, ...data } = input;
  
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
        currentStockBase: 0,
        reservedStockBase: 0,
        minStockBase: input.minStockBase || 0,
        createdById: user.id
      }
    });

    if (initialStockBase && initialStockBase > 0) {
      await tx.inventoryItem.update({
        where: { id: newItem.id },
        data: {
          currentStockBase: initialStockBase,
        }
      });
      
      const txCode = `TX-${Date.now()}`;
      await tx.inventoryTransaction.create({
        data: {
          transactionCode: txCode,
          itemId: newItem.id,
          type: 'ADJUSTMENT_INCREASE',
          quantity: initialStockBase,
          stockBefore: 0,
          stockAfter: initialStockBase,
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
  purchaseQuantity: number;
  rollLengthM?: number;
  unitCost?: number;
  referenceCode?: string;
  note?: string;
  createdAt?: string;
  supplierName?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền nhập kho');

  const txRecord = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');

    if (input.purchaseQuantity <= 0) throw new Error('Số lượng mua phải > 0');
    
    let qtyBase = 0;
    if (item.purchaseUnit === 'ROLL' || item.displayUnit === 'ROLL' || item.stockBaseUnit === 'MILLIMETER') {
      if (!input.rollLengthM || input.rollLengthM <= 0) throw new Error('Chiều dài cuộn phải > 0');
      // ROLL -> MM
      qtyBase = Math.round(input.purchaseQuantity * input.rollLengthM * 1000);
    } else {
      qtyBase = Math.round(input.purchaseQuantity * item.unitScale);
    }

    if (qtyBase <= 0) throw new Error('Số lượng quy đổi (Base Unit) phải > 0');

    const stockBefore = item.currentStockBase;
    const stockAfter = stockBefore + qtyBase;
    
    // Update Item
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStockBase: stockAfter,
        lastPurchaseCost: input.unitCost || item.lastPurchaseCost,
        supplierName: input.supplierName || item.supplierName,
        rollLengthM: input.rollLengthM || item.rollLengthM,
      }
    });

    const txCode = `IN-${Date.now()}`;
    const newTx = await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: 'INBOUND',
        quantity: qtyBase,
        purchaseQuantity: input.purchaseQuantity,
        purchaseUnit: item.purchaseUnit || item.displayUnit || item.unit,
        unitCost: input.unitCost,
        totalCost: input.unitCost ? input.unitCost * input.purchaseQuantity : null,
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
  quantityBase: number;
  productionJobId?: string;
  orderId?: string;
  reason?: string;
  note?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'ACCOUNTANT') throw new Error('Kế toán không được xuất kho trực tiếp');

  const qtyBase = Math.abs(input.quantityBase);
  
  const txRecord = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');

    const availableStock = item.currentStockBase - item.reservedStockBase;
    if (availableStock < qtyBase) {
      throw new Error(`Kho không đủ. Chỉ còn ${availableStock}`);
    }

    const stockBefore = item.currentStockBase;
    const stockAfter = stockBefore - qtyBase;
    
    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStockBase: stockAfter,
      }
    });

    const txCode = `OUT-${Date.now()}`;
    const newTx = await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: 'OUTBOUND',
        quantity: qtyBase,
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
  quantityBase: number;
  reason: string;
  note?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION') throw new Error('Không có quyền điều chỉnh tồn kho');
  if (!input.reason) throw new Error('Bắt buộc phải nhập lý do điều chỉnh');

  const qtyBase = Math.abs(input.quantityBase);
  
  const txRecord = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');

    const stockBefore = item.currentStockBase;
    let stockAfter = stockBefore;

    if (input.type === 'ADJUSTMENT_INCREASE') {
      stockAfter += qtyBase;
    } else {
      if (stockBefore - qtyBase < item.reservedStockBase) {
        throw new Error('Không thể giảm tồn xuống thấp hơn lượng đã giữ (reserved)');
      }
      stockAfter -= qtyBase;
    }

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStockBase: stockAfter,
      }
    });

    const txCode = `ADJ-${Date.now()}`;
    const newTx = await tx.inventoryTransaction.create({
      data: {
        transactionCode: txCode,
        itemId: item.id,
        type: input.type,
        quantity: qtyBase,
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
export async function reserveInventory(input: { itemId: string; quantityBase: number; productionJobId?: string; orderId?: string; note?: string; }) {
  const user = await checkInventoryAccess();
  if (user.role === 'PRODUCTION' && !input.productionJobId) throw new Error('Production chỉ được reserve cho Job');

  const qtyBase = Math.abs(input.quantityBase);

  const reservation = await db.$transaction(async (tx) => {
    const item = await tx.inventoryItem.findUnique({ where: { id: input.itemId } });
    if (!item) throw new Error('Vật tư không tồn tại');
    
    const availableStock = item.currentStockBase - item.reservedStockBase;
    if (availableStock < qtyBase) throw new Error(`Kho không đủ để giữ. Chỉ còn ${availableStock}`);

    const newReserved = item.reservedStockBase + qtyBase;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: {
        reservedStockBase: newReserved,
      }
    });

    const res = await tx.inventoryReservation.create({
      data: {
        itemId: item.id,
        productionJobId: input.productionJobId,
        orderId: input.orderId,
        quantity: qtyBase,
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
        quantity: qtyBase,
        stockBefore: item.currentStockBase,
        stockAfter: item.currentStockBase,
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
    const newReserved = item.reservedStockBase - reservation.quantity;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { reservedStockBase: newReserved }
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
        stockBefore: item.currentStockBase,
        stockAfter: item.currentStockBase,
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
    const newReserved = item.reservedStockBase - reservation.quantity;
    const newCurrent = item.currentStockBase - reservation.quantity;

    await tx.inventoryItem.update({
      where: { id: item.id },
      data: { reservedStockBase: newReserved, currentStockBase: newCurrent }
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
        stockBefore: item.currentStockBase,
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

/**
 * Convert Material (Parent Sheet to Child Sheet)
 */
export async function convertMaterial(input: {
  fromMaterialId: string;
  toMaterialId: string;
  fromQuantityBase: number;
  toQuantityBase: number;
  wasteQuantityBase: number;
  note?: string;
}) {
  const user = await checkInventoryAccess();
  if (user.role === 'ACCOUNTANT') throw new Error('Kế toán không được thao tác kho');

  const { fromMaterialId, toMaterialId, fromQuantityBase, toQuantityBase, wasteQuantityBase } = input;

  const result = await db.$transaction(async (tx) => {
    const fromItem = await tx.inventoryItem.findUnique({ where: { id: fromMaterialId } });
    if (!fromItem) throw new Error('Vật tư nguồn không tồn tại');
    const toItem = await tx.inventoryItem.findUnique({ where: { id: toMaterialId } });
    if (!toItem) throw new Error('Vật tư đích không tồn tại');

    const fromAvailable = fromItem.currentStockBase - fromItem.reservedStockBase;
    if (fromAvailable < fromQuantityBase) {
      throw new Error(`Kho không đủ vật tư nguồn. Chỉ còn ${fromAvailable}`);
    }

    const conversion = await tx.inventoryConversion.create({
      data: {
        fromMaterialId,
        fromQuantityBase,
        wasteQuantityBase,
        note: input.note,
        createdById: user.id,
      }
    });

    await tx.inventoryConversionOutputLine.create({
      data: {
        conversionId: conversion.id,
        toMaterialId,
        toQuantityBase,
      }
    });

    const fromStockBefore = fromItem.currentStockBase;
    const fromStockAfter = fromStockBefore - fromQuantityBase;
    await tx.inventoryItem.update({
      where: { id: fromItem.id },
      data: { currentStockBase: fromStockAfter }
    });

    await tx.inventoryTransaction.create({
      data: {
        transactionCode: `CVO-${Date.now()}`,
        itemId: fromMaterialId,
        type: 'CONVERT_OUT',
        quantity: fromQuantityBase,
        stockBefore: fromStockBefore,
        stockAfter: fromStockAfter,
        referenceType: 'CONVERSION',
        referenceId: conversion.id,
        createdById: user.id
      }
    });

    const toStockBefore = toItem.currentStockBase;
    const toStockAfter = toStockBefore + toQuantityBase;
    await tx.inventoryItem.update({
      where: { id: toItem.id },
      data: { currentStockBase: toStockAfter }
    });

    await tx.inventoryTransaction.create({
      data: {
        transactionCode: `CVI-${Date.now()}`,
        itemId: toMaterialId,
        type: 'CONVERT_IN',
        quantity: toQuantityBase,
        stockBefore: toStockBefore,
        stockAfter: toStockAfter,
        referenceType: 'CONVERSION',
        referenceId: conversion.id,
        createdById: user.id
      }
    });

    if (wasteQuantityBase > 0) {
      await tx.inventoryTransaction.create({
        data: {
          transactionCode: `CVW-${Date.now()}`,
          itemId: fromMaterialId,
          type: 'CUTTING_WASTE',
          quantity: wasteQuantityBase,
          stockBefore: fromStockAfter,
          stockAfter: fromStockAfter,
          referenceType: 'CONVERSION',
          referenceId: conversion.id,
          createdById: user.id
        }
      });
    }

    return conversion;
  });

  await createAuditLog({
    action: 'INVENTORY_CONVERTED',
    entityType: 'InventoryConversion',
    entityId: result.id,
    actorId: user.id,
  });

  revalidatePath('/dashboard/inventory');
  return { success: true };
}

/**
 * Calculate Film Consumption in Base Unit (Millimeter)
 */
export async function calculateFilmConsumption(totalSheets: number, feedLengthCm: number, wasteRate: number) {
  // e.g. 100 sheets * 35cm (350mm) * 1.05 = 36750mm
  const feedLengthMm = feedLengthCm * 10;
  const requiredMm = totalSheets * feedLengthMm * (1 + wasteRate);
  return Math.ceil(requiredMm);
}


/**
 * Phase 22A.4: Create Conversion for Order
 */
export async function createConversionForOrder(input: {
  orderId?: string;
  productionJobId?: string;
  childMaterialId: string;
  parentMaterialId: string;
  requiredChildQtyBase: number;
  recipeId: string;
  note?: string;
}) {
  const user = await checkInventoryAccess();
  
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) {
    throw new Error('Không có quyền tạo phiếu cắt giấy');
  }

  const { orderId, productionJobId, childMaterialId, parentMaterialId, requiredChildQtyBase, recipeId } = input;

  const result = await db.$transaction(async (tx) => {
    const parentItem = await tx.inventoryItem.findUnique({ where: { id: parentMaterialId } });
    if (!parentItem) throw new Error('Vật tư mẹ không tồn tại');
    
    const childItem = await tx.inventoryItem.findUnique({ where: { id: childMaterialId } });
    if (!childItem) throw new Error('Vật tư con không tồn tại');

    const recipe = await tx.materialConversionRecipe.findUnique({ where: { id: recipeId } });
    if (!recipe || !recipe.isActive || recipe.fromMaterialId !== parentMaterialId || recipe.toMaterialId !== childMaterialId) {
      throw new Error('Định mức cắt không hợp lệ hoặc đã bị vô hiệu hóa');
    }

    const requiredParentQtyBase = Math.ceil(requiredChildQtyBase / recipe.piecesPerParentSheet);
    const expectedChildQtyBase = requiredParentQtyBase * recipe.piecesPerParentSheet;
    const wasteChildQtyBase = expectedChildQtyBase - requiredChildQtyBase;

    const parentAvailable = parentItem.currentStockBase - parentItem.reservedStockBase;
    if (parentAvailable < requiredParentQtyBase) {
      throw new Error(`Kho không đủ vật tư mẹ. Cần ${requiredParentQtyBase}, chỉ còn ${parentAvailable}`);
    }

    const conversion = await tx.inventoryConversion.create({
      data: {
        fromMaterialId: parentMaterialId,
        fromQuantityBase: requiredParentQtyBase,
        wasteQuantityBase: 0, // wasteChildQtyBase is recorded in note instead of CUTTING_WASTE to keep them in stock
        note: input.note ? `${input.note} (Dư sau cắt: ${wasteChildQtyBase})` : `Dư sau cắt: ${wasteChildQtyBase}`,
        orderId,
        productionJobId,
        status: 'COMPLETED',
        confirmedById: user.id,
        confirmedAt: new Date(),
        createdById: user.id,
      }
    });

    await tx.inventoryConversionOutputLine.create({
      data: {
        conversionId: conversion.id,
        toMaterialId: childMaterialId,
        toQuantityBase: expectedChildQtyBase,
      }
    });

    const parentStockBefore = parentItem.currentStockBase;
    const parentStockAfter = parentStockBefore - requiredParentQtyBase;
    await tx.inventoryItem.update({
      where: { id: parentItem.id },
      data: { currentStockBase: parentStockAfter }
    });

    await tx.inventoryTransaction.create({
      data: {
        transactionCode: `CVO-${Date.now()}`,
        itemId: parentMaterialId,
        type: 'CONVERT_OUT',
        quantity: requiredParentQtyBase,
        stockBefore: parentStockBefore,
        stockAfter: parentStockAfter,
        referenceType: 'CONVERSION',
        referenceId: conversion.id,
        conversionId: conversion.id,
        orderId,
        productionJobId,
        createdById: user.id
      }
    });

    const childStockBefore = childItem.currentStockBase;
    const childStockAfter = childStockBefore + expectedChildQtyBase;
    await tx.inventoryItem.update({
      where: { id: childItem.id },
      data: { currentStockBase: childStockAfter }
    });

    await tx.inventoryTransaction.create({
      data: {
        transactionCode: `CVI-${Date.now()}`,
        itemId: childMaterialId,
        type: 'CONVERT_IN',
        quantity: expectedChildQtyBase,
        stockBefore: childStockBefore,
        stockAfter: childStockAfter,
        referenceType: 'CONVERSION',
        referenceId: conversion.id,
        conversionId: conversion.id,
        orderId,
        productionJobId,
        createdById: user.id
      }
    });

    return { conversion, parentConsumedQtyBase: requiredParentQtyBase, childCreatedQtyBase: expectedChildQtyBase, wasteChildQtyBase };
  });

  await createAuditLog({
    action: 'INVENTORY_ORDER_CONVERSION_CREATED',
    entityType: 'InventoryConversion',
    entityId: result.conversion.id,
    actorId: user.id,
  });

  revalidatePath('/dashboard/inventory');
  revalidatePath('/dashboard/orders');
  revalidatePath('/dashboard/production');
  return { success: true, ...result };
}

