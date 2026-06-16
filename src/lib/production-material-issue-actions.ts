'use server';

import { db } from './db';
import { createOutboundReceiptCore } from './inventory-outbound-actions';
import { getCurrentUser } from './auth';

export async function getProductionOutboundReceipts(productionJobId: string) {
  return await db.inventoryOutboundReceipt.findMany({
    where: { 
      productionJobId, 
      outboundType: 'PRODUCTION_ISSUE' 
    },
    orderBy: { issuedAt: 'desc' }
  });
}

export async function getProductionIssuedQuantities(productionJobId: string) {
  const receipts = await db.inventoryOutboundReceipt.findMany({
    where: {
      productionJobId,
      outboundType: 'PRODUCTION_ISSUE',
      status: 'COMPLETED'
    },
    include: {
      items: true
    }
  });

  const issuedQuantities: Record<string, number> = {};
  
  for (const receipt of receipts) {
    for (const item of receipt.items) {
      if (!issuedQuantities[item.inventoryItemId]) {
        issuedQuantities[item.inventoryItemId] = 0;
      }
      issuedQuantities[item.inventoryItemId] += item.quantityBase;
    }
  }

  return issuedQuantities;
}

export async function getProductionMaterialIssueStatus(productionJobId: string) {
  const job = await db.productionJob.findUnique({
    where: { id: productionJobId },
    include: {
      order: {
        include: {
          items: true,
          customer: true
        }
      },
      inventoryReservations: {
        include: {
          item: {
            include: { warehouseZone: true }
          }
        }
      }
    }
  });

  if (!job) {
    return { success: false, error: 'Không tìm thấy Lệnh sản xuất' };
  }

  // 1. Resolve requirements
  const requirementMap = new Map<string, any>();

  // Use reservations first if available
  if (job.inventoryReservations && job.inventoryReservations.length > 0) {
    for (const res of job.inventoryReservations) {
      if (!requirementMap.has(res.itemId)) {
        requirementMap.set(res.itemId, {
          inventoryItemId: res.itemId,
          itemCode: res.item.itemCode,
          itemName: res.item.name,
          warehouseZoneName: res.item.warehouseZone?.name || '',
          stockBaseUnit: res.item.stockBaseUnit,
          requiredQuantityBase: res.quantity,
          currentStockBase: res.item.currentStockBase,
          reservedStockBase: res.item.reservedStockBase,
          averageCost: res.item.averageCost,
          lastPurchaseCost: res.item.lastPurchaseCost,
          standardCost: res.item.standardCost,
        });
      } else {
        const existing = requirementMap.get(res.itemId);
        existing.requiredQuantityBase += res.quantity;
      }
    }
  } 
  // Fallback to OrderItems
  else if (job.order?.items && job.order.items.length > 0) {
    for (const orderItem of job.order.items) {
      const invItem = await db.inventoryItem.findUnique({
        where: { id: orderItem.materialId },
        include: { warehouseZone: true }
      });
      if (invItem) {
        if (!requirementMap.has(invItem.id)) {
          requirementMap.set(invItem.id, {
            inventoryItemId: invItem.id,
            itemCode: invItem.itemCode,
            itemName: invItem.name,
            warehouseZoneName: invItem.warehouseZone?.name || '',
            stockBaseUnit: invItem.stockBaseUnit,
            requiredQuantityBase: orderItem.totalSheets,
            currentStockBase: invItem.currentStockBase,
            reservedStockBase: invItem.reservedStockBase,
            averageCost: invItem.averageCost,
            lastPurchaseCost: invItem.lastPurchaseCost,
            standardCost: invItem.standardCost,
          });
        } else {
          requirementMap.get(invItem.id).requiredQuantityBase += orderItem.totalSheets;
        }
      }
    }
  }

  // 2. Get issued quantities
  const issuedQuantities = await getProductionIssuedQuantities(productionJobId);

  // 3. Process items and determine status
  const items = [];
  let fullyIssuedLines = 0;
  let shortageLines = 0;
  let estimatedIssueCost = 0;
  let hasPartial = false;
  let hasInsufficient = false;
  let hasMissing = false;

  for (const [itemId, req] of requirementMap.entries()) {
    const issuedQty = issuedQuantities[itemId] || 0;
    const remainingQty = Math.max(0, req.requiredQuantityBase - issuedQty);
    const shortageQty = Math.max(0, remainingQty - req.currentStockBase);
    const canIssueRemaining = remainingQty > 0 && req.currentStockBase >= remainingQty;
    
    let unitCost = req.averageCost || req.lastPurchaseCost || req.standardCost || 0;
    const estTotalCost = remainingQty * unitCost;

    items.push({
      ...req,
      issuedQuantityBase: issuedQty,
      remainingQuantityBase: remainingQty,
      shortageQuantityBase: shortageQty,
      canIssueRemaining,
      estimatedUnitCost: unitCost,
      estimatedTotalCost: estTotalCost
    });

    estimatedIssueCost += estTotalCost;

    if (remainingQty === 0) {
      fullyIssuedLines++;
    } else {
      if (issuedQty > 0) hasPartial = true;
      else hasMissing = true;
      
      if (shortageQty > 0) {
        shortageLines++;
        hasInsufficient = true;
      }
    }
  }

  let status = 'NOT_ISSUED';
  if (items.length === 0) {
    status = 'NOT_ISSUED';
  } else if (hasInsufficient) {
    status = 'INSUFFICIENT';
  } else if (fullyIssuedLines === items.length) {
    status = 'FULLY_ISSUED';
  } else if (fullyIssuedLines > 0 || hasPartial) {
    status = 'PARTIALLY_ISSUED';
  } else {
    status = 'NOT_ISSUED';
  }

  const outboundReceipts = await getProductionOutboundReceipts(productionJobId);

  return {
    success: true,
    data: {
      productionJob: {
        id: job.id,
        jobCode: job.jobCode,
        orderCode: job.order?.orderCode,
        status: job.status,
        customerName: job.order?.customer?.name,
      },
      status,
      items,
      outboundReceipts,
      totals: {
        requiredLines: items.length,
        fullyIssuedLines,
        shortageLines,
        estimatedIssueCost
      }
    }
  };
}

export async function createProductionMaterialIssueReceiptCore(input: {
  productionJobId: string;
  receiverName?: string;
  receiverDepartment?: string;
  note?: string;
  items: {
    inventoryItemId: string;
    quantityBase: number;
    note?: string;
  }[];
}, user: any) {
  

  if (!user || !['ADMIN', 'MANAGER', 'PRODUCTION'].includes(user.role)) {
    return { success: false, error: 'Không có quyền tạo phiếu xuất vật tư sản xuất' };
  }

  const { productionJobId, receiverName, receiverDepartment, note, items } = input;

  if (!items || items.length === 0) {
    return { success: false, error: 'Vui lòng chọn ít nhất 1 vật tư' };
  }

  // Duplicate check
  const uniqueItems = new Set(items.map(i => i.inventoryItemId));
  if (uniqueItems.size !== items.length) {
    return { success: false, error: 'Vật tư bị trùng lặp trong danh sách' };
  }

  const job = await db.productionJob.findUnique({ where: { id: productionJobId } });
  if (!job) {
    return { success: false, error: 'Không tìm thấy Lệnh sản xuất' };
  }
  if (job.status === 'CANCELLED' || job.status === 'REJECTED') {
    return { success: false, error: 'Lệnh sản xuất đã bị hủy' };
  }

  // Double-consume safety validation
  const statusRes = await getProductionMaterialIssueStatus(productionJobId);
  if (!statusRes.success || !statusRes.data) {
    return { success: false, error: statusRes.error || 'Lỗi khi kiểm tra định mức' };
  }

  const requirementItems = statusRes.data.items;

  for (const item of items) {
    if (item.quantityBase <= 0) {
      return { success: false, error: 'Số lượng cấp phải lớn hơn 0' };
    }
    
    const req = requirementItems.find(r => r.inventoryItemId === item.inventoryItemId);
    if (!req) {
      return { success: false, error: 'Vật tư không nằm trong danh sách cần cấp' };
    }

    if (item.quantityBase > req.remainingQuantityBase) {
      return { success: false, error: `Số lượng xuất vượt quá số lượng còn cần cấp cho lệnh sản xuất (${req.itemCode})` };
    }

    const currentStock = req.currentStockBase;
    if (currentStock < item.quantityBase) {
      return { success: false, error: `Không đủ tồn kho để cấp vật tư ${req.itemCode}. Tồn hiện tại: ${currentStock}, cần cấp: ${item.quantityBase}.` };
    }
  }

  // Delegate to existing outbound creation
  return await createOutboundReceiptCore({
    outboundType: 'PRODUCTION_ISSUE',
    productionJobId,
    receiverName,
    receiverDepartment,
    note: note || `Cấp vật tư cho lệnh sản xuất ${job.jobCode}`,
    items
  }, user);
}

export async function createProductionMaterialIssueReceipt(input: {
  productionJobId: string;
  receiverName?: string;
  receiverDepartment?: string;
  note?: string;
  items: {
    inventoryItemId: string;
    quantityBase: number;
    note?: string;
  }[];
}) {
  const user = await getCurrentUser();
  return await createProductionMaterialIssueReceiptCore(input, user);
}
