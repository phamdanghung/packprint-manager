'use server';

import { db } from './db';
import { checkInventoryAccess } from './inventory-actions';

export interface CreateConversionInput {
  childMaterialId: string;
  parentMaterialId: string;
  recipeId: string;
  requiredParentQtyBase: number;
  expectedChildQtyBase: number;
  surplusChildQtyBase: number;
  orderId?: string;
  productionJobId?: string;
  optimizationMode?: string;
  note?: string;
  estimatedParentCost?: number;
  estimatedChildUnitCost?: number;
  totalParentCost?: number;
  optimizationNote?: string;
}

export async function createConversionForOrder(input: CreateConversionInput) {
  const user = await checkInventoryAccess();
  
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) {
    throw new Error('Không có quyền tạo phiếu cắt giấy');
  }

  const {
    childMaterialId,
    parentMaterialId,
    recipeId,
    requiredParentQtyBase,
    expectedChildQtyBase,
    surplusChildQtyBase,
    orderId,
    productionJobId,
    optimizationMode,
    note,
    estimatedParentCost,
    estimatedChildUnitCost,
    totalParentCost,
    optimizationNote,
  } = input;

  if (requiredParentQtyBase <= 0) {
    throw new Error('Số lượng tờ mẹ cắt phải lớn hơn 0');
  }

  const result = await db.$transaction(async (tx) => {
    // 1. Fetch materials
    const parentMaterial = await tx.inventoryItem.findUnique({ where: { id: parentMaterialId } });
    const childMaterial = await tx.inventoryItem.findUnique({ where: { id: childMaterialId } });

    if (!parentMaterial || !childMaterial) {
      throw new Error('Không tìm thấy vật tư');
    }

    const parentAvailable = parentMaterial.currentStockBase - parentMaterial.reservedStockBase;
    if (parentAvailable < requiredParentQtyBase) {
      throw new Error('Vật tư mẹ không đủ tồn kho để cắt');
    }

    // 2. Create conversion record
    const conversion = await tx.inventoryConversion.create({
      data: {
        fromMaterialId: parentMaterialId,
        fromQuantityBase: requiredParentQtyBase,
        wasteQuantityBase: 0, // Waste is only for real waste, not surplus
        createdById: user.id,
        note: note,
        orderId: orderId,
        productionJobId: productionJobId,
        status: 'COMPLETED',
        selectedOptimizationMode: optimizationMode,
        selectedRecipeId: recipeId,
        selectedParentMaterialId: parentMaterialId,
        estimatedParentCost: estimatedParentCost,
        estimatedChildUnitCost: estimatedChildUnitCost,
        totalParentCost: totalParentCost,
        optimizationNote: optimizationNote,
        surplusChildQtyBase: surplusChildQtyBase,
        outputLines: {
          create: [
            {
              toMaterialId: childMaterialId,
              toQuantityBase: expectedChildQtyBase,
              note: 'Cắt từ giấy mẹ',
            }
          ]
        }
      }
    });

    // 3. Update Parent Material Stock & Create Transaction
    const parentStockBefore = parentMaterial.currentStockBase;
    const parentStockAfter = parentStockBefore - requiredParentQtyBase;
    
    await tx.inventoryItem.update({
      where: { id: parentMaterialId },
      data: { currentStockBase: parentStockAfter },
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
        productionJobId: productionJobId,
        orderId: orderId,
        note: `Cắt giấy ra ${childMaterial.name}`,
        createdById: user.id,
        conversionId: conversion.id,
      }
    });

    // 4. Update Child Material Stock & Create Transaction
    const childStockBefore = childMaterial.currentStockBase;
    const childStockAfter = childStockBefore + expectedChildQtyBase;

    await tx.inventoryItem.update({
      where: { id: childMaterialId },
      data: { currentStockBase: childStockAfter },
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
        productionJobId: productionJobId,
        orderId: orderId,
        note: `Nhập từ giấy mẹ ${parentMaterial.name}`,
        createdById: user.id,
        conversionId: conversion.id,
      }
    });

    return conversion;
  });

  return { success: true, data: result };
}
