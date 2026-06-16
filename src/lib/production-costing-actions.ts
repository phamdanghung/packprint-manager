'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { safeRevalidatePath } from './safe-revalidate';

type CostingRole = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT';

function checkCostPermission(role: string): boolean {
  return ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role);
}

// Helper to fully sanitize the response and drop sensitive properties
function sanitizeProductionJobResponse(data: any) {
  // Return completely without these fields
  const {
    actualMaterialCost,
    actualAdditionalCost,
    actualProductionCost,
    materialCostLines,
    additionalCostLines,
    ...rest
  } = data;
  return rest;
}

function sanitizeOrderProfitabilityResponse(data: any) {
  const {
    actualMaterialCost,
    actualAdditionalCost,
    actualProductionCost,
    grossProfit,
    grossMarginPercent,
    materialCostLines,
    additionalCostLines,
    costs,
    profit,
    ...rest
  } = data;
  
  if (rest.productionJobs) {
    rest.productionJobs = rest.productionJobs.map((pj: any) => {
      const { actualMaterialCost, actualAdditionalCost, actualProductionCost, ...pjRest } = pj;
      return pjRest;
    });
  }

  return rest;
}

export async function getProductionJobCosting(productionJobId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const canViewCost = checkCostPermission(user.role);

    const job = await db.productionJob.findUnique({
      where: { id: productionJobId },
      include: {
        order: {
          include: { customer: true }
        },
        costLines: {
          where: { status: 'ACTIVE' },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!job) {
      return { success: false, error: 'Không tìm thấy Lệnh sản xuất' };
    }

    const receipts = await db.inventoryOutboundReceipt.findMany({
      where: {
        productionJobId: productionJobId,
        outboundType: 'PRODUCTION_ISSUE'
      },
      include: {
        items: true
      }
    });

    let completedOutboundReceipts = 0;
    let cancelledOutboundReceipts = 0;
    let actualMaterialCost = 0;
    let issuedLines = 0;

    const outboundReceipts = [];
    const materialCostLines: any[] = [];

    for (const r of receipts) {
      if (r.status === 'COMPLETED') {
        completedOutboundReceipts++;
        let receiptTotalCost = 0;
        
        for (const item of r.items) {
          const itemCost = item.totalCost || 0;
          receiptTotalCost += itemCost;
          actualMaterialCost += itemCost;
          issuedLines++;

          if (canViewCost) {
            materialCostLines.push({
              inventoryItemId: item.inventoryItemId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              stockBaseUnit: item.stockBaseUnit,
              issuedQuantityBase: item.quantityBase,
              unitCost: item.unitCost || 0,
              totalCost: itemCost,
              receiptCode: r.receiptCode,
              receiptId: r.id
            });
          } else {
             materialCostLines.push({
              inventoryItemId: item.inventoryItemId,
              itemCode: item.itemCode,
              itemName: item.itemName,
              stockBaseUnit: item.stockBaseUnit,
              issuedQuantityBase: item.quantityBase,
              receiptCode: r.receiptCode,
              receiptId: r.id
            });
          }
        }

        outboundReceipts.push({
          id: r.id,
          receiptCode: r.receiptCode,
          status: r.status,
          outboundType: r.outboundType,
          totalCost: canViewCost ? receiptTotalCost : undefined,
          issuedAt: r.issuedAt
        });

      } else if (r.status === 'CANCELLED') {
        cancelledOutboundReceipts++;
        outboundReceipts.push({
          id: r.id,
          receiptCode: r.receiptCode,
          status: r.status,
          outboundType: r.outboundType,
          totalCost: undefined,
          issuedAt: r.issuedAt
        });
      }
    }

    let actualAdditionalCost = 0;
    const additionalCostLines = [];

    for (const cl of job.costLines) {
      actualAdditionalCost += cl.totalCost;
      if (canViewCost) {
        additionalCostLines.push({
          id: cl.id,
          category: cl.category,
          description: cl.description,
          quantity: cl.quantity,
          unitCost: cl.unitCost,
          totalCost: cl.totalCost,
          status: cl.status,
          vendorName: cl.vendorName,
          createdAt: cl.createdAt
        });
      }
    }

    const actualProductionCost = actualMaterialCost + actualAdditionalCost;
    const estimatedMaterialCost = 0;
    const warnings = ['Chưa xác định được giá vốn vật tư dự kiến.'];

    let variance = 0;
    let variancePercent: number | undefined = undefined;

    if (canViewCost) {
      variance = actualMaterialCost - estimatedMaterialCost;
      if (estimatedMaterialCost > 0) {
        variancePercent = (variance / estimatedMaterialCost) * 100;
      }
    }

    const baseData = {
      canViewCost,
      productionJob: {
        id: job.id,
        jobCode: job.jobCode,
        status: job.status,
        orderId: job.orderId,
        orderCode: job.order?.orderCode,
        customerName: job.order?.customer?.name
      },
      issueSummary: {
        totalOutboundReceipts: completedOutboundReceipts + cancelledOutboundReceipts,
        completedOutboundReceipts,
        cancelledOutboundReceipts,
        issuedLines
      },
      outboundReceipts,
      warnings,
      actualMaterialCost,
      actualAdditionalCost,
      actualProductionCost,
      materialCostLines,
      additionalCostLines
    };

    if (!canViewCost) {
      return {
        success: true,
        data: sanitizeProductionJobResponse(baseData)
      };
    }

    return {
      success: true,
      data: baseData
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getOrderProfitability(orderId: string) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return { success: false, error: 'Chưa đăng nhập' };
    }

    const canViewCost = checkCostPermission(user.role);

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: {
        customer: true,
        productionJob: {
          include: {
            costLines: { where: { status: 'ACTIVE' } }
          }
        }
      }
    });

    if (!order) {
      return { success: false, error: 'Không tìm thấy Đơn hàng' };
    }

    const pJobs = await db.productionJob.findMany({
      where: { orderId: orderId },
      include: {
        costLines: { where: { status: 'ACTIVE' } }
      }
    });

    let totalActualMaterialCost = 0;
    let totalActualAdditionalCost = 0;
    const productionJobsData = [];
    
    for (const pj of pJobs) {
      const receipts = await db.inventoryOutboundReceipt.findMany({
        where: {
          productionJobId: pj.id,
          outboundType: 'PRODUCTION_ISSUE',
          status: 'COMPLETED'
        },
        include: { items: true }
      });

      let jobMaterialCost = 0;
      for (const r of receipts) {
        for (const item of r.items) {
          jobMaterialCost += item.totalCost || 0;
        }
      }

      let jobAdditionalCost = 0;
      for (const cl of pj.costLines) {
        jobAdditionalCost += cl.totalCost;
      }

      const jobTotalCost = jobMaterialCost + jobAdditionalCost;
      totalActualMaterialCost += jobMaterialCost;
      totalActualAdditionalCost += jobAdditionalCost;

      if (canViewCost) {
        productionJobsData.push({
          id: pj.id,
          jobCode: pj.jobCode,
          status: pj.status,
          actualMaterialCost: jobMaterialCost,
          actualAdditionalCost: jobAdditionalCost,
          actualProductionCost: jobTotalCost
        });
      } else {
        productionJobsData.push({
          id: pj.id,
          jobCode: pj.jobCode,
          status: pj.status
        });
      }
    }

    const totalActualProductionCost = totalActualMaterialCost + totalActualAdditionalCost;
    const revenue = order.totalAmount || 0;
    
    const warnings = [];
    if (revenue <= 0) {
      warnings.push('Không xác định được doanh thu đơn hàng từ totalAmount.');
    }

    const grossProfit = revenue - totalActualProductionCost;
    let grossMarginPercent: number | undefined = undefined;
    if (revenue > 0) {
      grossMarginPercent = (grossProfit / revenue) * 100;
    }

    const baseData = {
      canViewCost,
      order: {
        id: order.id,
        orderCode: order.orderCode,
        customerName: order.customer?.name,
        revenue
      },
      productionJobs: productionJobsData,
      warnings,
      costs: {
        actualMaterialCost: totalActualMaterialCost,
        actualAdditionalCost: totalActualAdditionalCost,
        totalActualCost: totalActualProductionCost
      },
      profit: {
        grossProfit,
        grossMarginPercent
      }
    };

    if (!canViewCost) {
      return {
        success: true,
        data: sanitizeOrderProfitabilityResponse(baseData)
      };
    }

    return {
      success: true,
      data: baseData
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createProductionCostLine(data: any) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };
    if (!checkCostPermission(user.role)) return { success: false, error: 'Không có quyền thực hiện' };

    const { productionJobId, category, description, quantity, unitCost, vendorName, note } = data;

    if (!productionJobId || !category || !description) {
      return { success: false, error: 'Thiếu thông tin bắt buộc' };
    }

    const qty = parseInt(quantity, 10);
    const uCost = parseInt(unitCost, 10);

    if (isNaN(qty) || qty <= 0) return { success: false, error: 'Số lượng phải lớn hơn 0' };
    if (isNaN(uCost) || uCost < 0) return { success: false, error: 'Đơn giá không hợp lệ' };

    const totalCost = qty * uCost;

    const job = await db.productionJob.findUnique({ where: { id: productionJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy Lệnh sản xuất' };

    const costLine = await db.productionCostLine.create({
      data: {
        productionJobId,
        category,
        description,
        quantity: qty,
        unitCost: uCost,
        totalCost,
        vendorName,
        note,
        createdById: user.id
      }
    });

    safeRevalidatePath(`/dashboard/production/${productionJobId}`);
    safeRevalidatePath(`/dashboard/orders/${job.orderId}`);

    return { success: true, data: costLine };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProductionCostLine(id: string, data: any) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };
    if (!checkCostPermission(user.role)) return { success: false, error: 'Không có quyền thực hiện' };

    const existing = await db.productionCostLine.findUnique({ 
      where: { id },
      include: { productionJob: true }
    });
    
    if (!existing) return { success: false, error: 'Không tìm thấy dòng chi phí' };
    if (existing.status === 'CANCELLED') return { success: false, error: 'Không thể sửa dòng chi phí đã hủy' };

    const { category, description, quantity, unitCost, vendorName, note } = data;

    const qty = quantity !== undefined ? parseInt(quantity, 10) : existing.quantity;
    const uCost = unitCost !== undefined ? parseInt(unitCost, 10) : existing.unitCost;

    if (isNaN(qty) || qty <= 0) return { success: false, error: 'Số lượng phải lớn hơn 0' };
    if (isNaN(uCost) || uCost < 0) return { success: false, error: 'Đơn giá không hợp lệ' };

    const totalCost = qty * uCost;

    const costLine = await db.productionCostLine.update({
      where: { id },
      data: {
        category: category || existing.category,
        description: description || existing.description,
        quantity: qty,
        unitCost: uCost,
        totalCost,
        vendorName: vendorName !== undefined ? vendorName : existing.vendorName,
        note: note !== undefined ? note : existing.note
      }
    });

    safeRevalidatePath(`/dashboard/production/${existing.productionJobId}`);
    safeRevalidatePath(`/dashboard/orders/${existing.productionJob.orderId}`);

    return { success: true, data: costLine };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelProductionCostLine(id: string, reason?: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };
    if (!checkCostPermission(user.role)) return { success: false, error: 'Không có quyền thực hiện' };

    const existing = await db.productionCostLine.findUnique({ 
      where: { id },
      include: { productionJob: true }
    });
    
    if (!existing) return { success: false, error: 'Không tìm thấy dòng chi phí' };
    if (existing.status === 'CANCELLED') return { success: false, error: 'Dòng chi phí đã bị hủy từ trước' };
    if (!reason || reason.trim() === '') return { success: false, error: 'Lý do hủy là bắt buộc' };

    const costLine = await db.productionCostLine.update({
      where: { id },
      data: {
        status: 'CANCELLED',
        cancelledById: user.id,
        cancelledAt: new Date(),
        cancelReason: reason.trim()
      }
    });

    safeRevalidatePath(`/dashboard/production/${existing.productionJobId}`);
    safeRevalidatePath(`/dashboard/orders/${existing.productionJob.orderId}`);

    return { success: true, data: costLine };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
