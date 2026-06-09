'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { DecalQuoteRequest, calculateDecalQuoteFromDb } from './pricing-engine/adapter';
import { CalculatorOutput } from './pricing-engine/types';

export async function checkQuoteAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Chưa đăng nhập' };
  }
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Bạn không có quyền truy cập chức năng này' };
  }
  return { ok: true, user };
}

export async function getActiveMaterials() {
  const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
  if (!auth.ok) return { success: false, error: auth.error };
  const data = await db.material.findMany({ where: { status: 'ACTIVE' }, orderBy: { materialCode: 'asc' } });
  return { success: true, data };
}

export async function getActiveLaminations() {
  const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
  if (!auth.ok) return { success: false, error: auth.error };
  const data = await db.laminationPrice.findMany({ where: { status: 'ACTIVE' }, orderBy: { name: 'asc' } });
  return { success: true, data };
}

export async function getActiveMachines() {
  const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
  if (!auth.ok) return { success: false, error: auth.error };
  const data = await db.machineConfig.findMany({ where: { status: 'ACTIVE' } });
  return { success: true, data };
}

// 1. Tính giá preview
export async function calculateQuotePreview(input: DecalQuoteRequest): Promise<{ success: boolean; data?: CalculatorOutput; error?: string }> {
  try {
    const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    let result = await calculateDecalQuoteFromDb(input);
    if (auth.user!.role === 'SALES') {
      result.costAmount = 0;
      result.grossProfit = 0;
    }
    return { success: true, data: result };
  } catch (error: any) {
    console.error('Lỗi tính giá preview:', error);
    return { success: false, error: error.message || 'Có lỗi xảy ra khi tính giá' };
  }
}

async function generateQuoteNumber(): Promise<string> {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const datePrefix = `BG-${year}${month}${day}`;

  const count = await db.quote.count({
    where: {
      quoteNumber: { startsWith: datePrefix }
    }
  });

  const nextSeq = count + 1;
  return `${datePrefix}-${String(nextSeq).padStart(3, '0')}`;
}

// 2. Tạo báo giá
export async function createQuote(data: any) {
  try {
    const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const quoteNumber = await generateQuoteNumber();

    const customer = await db.customer.findUnique({
      where: { id: data.customerId },
      select: { id: true, assignedSalesId: true, customerCode: true }
    });

    if (!customer) return { success: false, error: 'Khách hàng không tồn tại' };

    let assignedSalesId = customer.assignedSalesId;
    let isAutoAssigned = false;

    if (auth.user!.role === 'SALES') {
      if (assignedSalesId && assignedSalesId !== auth.user!.id) {
        return { success: false, error: 'Bạn không thể tạo báo giá cho khách hàng do nhân viên Sales khác phụ trách.' };
      }
      if (!assignedSalesId) {
        assignedSalesId = auth.user!.id;
        isAutoAssigned = true;
      }
    }

    const quote = await db.quote.create({
      data: {
        quoteNumber,
        customerId: data.customerId,
        assignedSalesId,
        status: data.status || 'DRAFT',
        subtotal: data.subtotal,
        vatRate: data.vatRate,
        vatAmount: data.vatAmount,
        shippingFee: data.shippingFee,
        totalAmount: data.totalAmount,
        totalCost: data.totalCost,
        grossProfit: data.grossProfit,
        grossProfitRate: data.grossProfitRate,
        notes: data.notes,
        internalNote: data.internalNote,
        createdById: auth.user!.id,
        items: {
          create: data.items.map((item: any) => ({
            productType: item.productType,
            name: item.name,
            materialId: item.materialId,
            labelShape: item.labelShape,
            widthCm: item.widthCm,
            heightCm: item.heightCm,
            diameterCm: item.diameterCm,
            quantity: item.quantity,
            labelsPerSheet: item.labelsPerSheet,
            printSheets: item.printSheets,
            wasteSheets: item.wasteSheets,
            totalSheets: item.totalSheets,
            laminationId: item.laminationId,
            dieCutType: item.dieCutType,
            materialPricePerSheet: item.materialPricePerSheet,
            materialDiscountPercent: item.materialDiscountPercent,
            finalMaterialPricePerSheet: item.finalMaterialPricePerSheet,
            laminationPricePerSheet: item.laminationPricePerSheet,
            dieCutPricePerSheet: item.dieCutPricePerSheet,
            printingPricePerSheet: item.printingPricePerSheet,
            fileHandlingFee: item.fileHandlingFee,
            otherFee: item.otherFee,
            materialCost: item.materialCost,
            laminationCost: item.laminationCost,
            dieCutCost: item.dieCutCost,
            printingCost: item.printingCost,
            costAmount: item.costAmount,
            profitRate: item.profitRate,
            saleAmount: item.saleAmount,
            pricingDetails: item.pricingDetails,
            layoutDetails: item.layoutDetails,
            calculationNote: item.calculationNote,
            warningNote: item.warningNote,
          }))
        }
      }
    });

    // Sync Customer
    const customerUpdateData: any = { lastQuoteAt: new Date() };
    if (isAutoAssigned) {
      customerUpdateData.assignedSalesId = assignedSalesId;
      await db.systemAuditLog.create({
        data: {
          actorId: auth.user!.id,
          action: 'CUSTOMER_ASSIGNED_SALES_CHANGED',
          entityType: 'CUSTOMER',
          entityId: data.customerId,
          entityCode: customer.customerCode,
          description: `Tự động gán khách hàng khi tạo báo giá/đơn hàng.`,
          afterJson: JSON.stringify({ assignedSalesId })
        }
      });
    }
    await db.customer.update({
      where: { id: data.customerId },
      data: customerUpdateData
    });

    return { success: true, data: quote };
  } catch (error: any) {
    console.error('Lỗi tạo báo giá:', error);
    return { success: false, error: error.message || 'Lỗi tạo báo giá' };
  }
}

// 3. Sửa báo giá
export async function updateQuote(id: string, data: any) {
  try {
    const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const existingQuote = await db.quote.findUnique({ where: { id } });
    if (!existingQuote) return { success: false, error: 'Không tìm thấy báo giá' };

    if (existingQuote.status !== 'DRAFT') {
      return { success: false, error: 'Chỉ báo giá nháp (DRAFT) mới được chỉnh sửa' };
    }

    // Xoá các items cũ
    await db.quoteItem.deleteMany({ where: { quoteId: id } });

    const updatedQuote = await db.quote.update({
      where: { id },
      data: {
        customerId: data.customerId,
        status: data.status || 'DRAFT',
        subtotal: data.subtotal,
        vatRate: data.vatRate,
        vatAmount: data.vatAmount,
        shippingFee: data.shippingFee,
        totalAmount: data.totalAmount,
        totalCost: data.totalCost,
        grossProfit: data.grossProfit,
        grossProfitRate: data.grossProfitRate,
        notes: data.notes,
        internalNote: data.internalNote,
        items: {
          create: data.items.map((item: any) => ({
            productType: item.productType,
            name: item.name,
            materialId: item.materialId,
            labelShape: item.labelShape,
            widthCm: item.widthCm,
            heightCm: item.heightCm,
            diameterCm: item.diameterCm,
            quantity: item.quantity,
            labelsPerSheet: item.labelsPerSheet,
            printSheets: item.printSheets,
            wasteSheets: item.wasteSheets,
            totalSheets: item.totalSheets,
            laminationId: item.laminationId,
            dieCutType: item.dieCutType,
            materialPricePerSheet: item.materialPricePerSheet,
            materialDiscountPercent: item.materialDiscountPercent,
            finalMaterialPricePerSheet: item.finalMaterialPricePerSheet,
            laminationPricePerSheet: item.laminationPricePerSheet,
            dieCutPricePerSheet: item.dieCutPricePerSheet,
            printingPricePerSheet: item.printingPricePerSheet,
            fileHandlingFee: item.fileHandlingFee,
            otherFee: item.otherFee,
            materialCost: item.materialCost,
            laminationCost: item.laminationCost,
            dieCutCost: item.dieCutCost,
            printingCost: item.printingCost,
            costAmount: item.costAmount,
            profitRate: item.profitRate,
            saleAmount: item.saleAmount,
            pricingDetails: item.pricingDetails,
            layoutDetails: item.layoutDetails,
            calculationNote: item.calculationNote,
            warningNote: item.warningNote,
          }))
        }
      }
    });

    return { success: true, data: updatedQuote };
  } catch (error: any) {
    console.error('Lỗi sửa báo giá:', error);
    return { success: false, error: error.message || 'Lỗi sửa báo giá' };
  }
}

// 4. Đổi trạng thái báo giá
export async function updateQuoteStatus(id: string, status: string) {
  try {
    const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const quote = await db.quote.update({
      where: { id },
      data: { status }
    });

    return { success: true, data: quote };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi cập nhật trạng thái' };
  }
}

export async function getQuotes(filters?: any) {
  try {
    const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT']);
    if (!auth.ok) return { success: false, error: auth.error };

    const quotes = await db.quote.findMany({
      where: filters,
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true } },
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (auth.user!.role === 'SALES') {
      quotes.forEach(quote => {
        quote.totalCost = 0;
        quote.grossProfit = 0;
        quote.grossProfitRate = 0;
        quote.items.forEach(item => {
          item.materialCost = 0;
          item.laminationCost = 0;
          item.dieCutCost = 0;
          item.printingCost = 0;
          item.costAmount = 0;
          item.profitRate = 0;
          item.pricingDetails = null;
        });
      });
    }

    return { success: true, data: quotes };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi lấy danh sách báo giá' };
  }
}

export async function getQuoteById(id: string) {
  try {
    const auth = await checkQuoteAuth(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT']);
    if (!auth.ok) return { success: false, error: auth.error };

    const quote = await db.quote.findUnique({
      where: { id },
      include: {
        customer: true,
        createdBy: { select: { id: true, name: true, email: true } },
        items: true
      }
    });
    if (!quote) return { success: false, error: 'Không tìm thấy báo giá' };

    if (auth.user!.role === 'SALES') {
      quote.totalCost = 0;
      quote.grossProfit = 0;
      quote.grossProfitRate = 0;
      quote.items.forEach(item => {
        item.materialCost = 0;
        item.laminationCost = 0;
        item.dieCutCost = 0;
        item.printingCost = 0;
        item.costAmount = 0;
        item.profitRate = 0;
        item.pricingDetails = null;
      });
    }

    return { success: true, data: quote };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi lấy báo giá' };
  }
}
