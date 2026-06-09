'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { syncCustomerAfterOrder } from '@/lib/crm-actions';
import { createQuote } from './quote-actions';

async function checkOrderAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Bạn không có quyền truy cập chức năng này' };
  }
  return { ok: true, user };
}

async function generateOrderCode(): Promise<string> {
  const dateObj = new Date();
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  const datePrefix = `DH-${year}${month}${day}`;

  const count = await db.order.count({
    where: { orderCode: { startsWith: datePrefix } }
  });

  const nextSeq = count + 1;
  return `${datePrefix}-${String(nextSeq).padStart(3, '0')}`;
}

export async function convertQuoteToOrder(quoteId: string) {
  try {
    const auth = await checkOrderAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const quote = await db.quote.findUnique({
      where: { id: quoteId },
      include: { items: true, customer: { select: { assignedSalesId: true } } }
    });

    if (!quote) return { success: false, error: 'Không tìm thấy báo giá' };
    
    if (auth.user!.role === 'SALES') {
      if (quote.customer?.assignedSalesId && quote.customer.assignedSalesId !== auth.user!.id) {
        return { success: false, error: 'Bạn không thể chuyển đổi báo giá của khách hàng do nhân viên Sales khác phụ trách.' };
      }
    }

    if (quote.status !== 'APPROVED' && quote.status !== 'ACCEPTED') return { success: false, error: 'Chỉ báo giá đã được duyệt (APPROVED/ACCEPTED) mới có thể chuyển thành đơn hàng' };

    // Kiểm tra xem đã có đơn hàng nào link với quote này chưa
    const existingOrder = await db.order.findFirst({ where: { quoteId } });
    if (existingOrder) return { success: false, error: 'Báo giá này đã được chuyển thành đơn hàng rồi' };

    const orderCode = await generateOrderCode();

    const order = await db.$transaction(async (tx) => {
      const newOrder = await tx.order.create({
        data: {
          orderCode,
          quoteId: quote.id,
          customerId: quote.customerId,
          status: 'NEW',
          paymentStatus: 'UNPAID',
          subtotal: quote.subtotal,
          vatRate: quote.vatRate,
          vatAmount: quote.vatAmount,
          shippingFee: quote.shippingFee,
          totalAmount: quote.totalAmount,
          totalCost: quote.totalCost,
          grossProfit: quote.grossProfit,
          grossProfitRate: quote.grossProfitRate,
          depositAmount: 0,
          paidAmount: 0,
          debtAmount: quote.totalAmount,
          internalNote: quote.internalNote,
          createdById: auth.user!.id,
          assignedSalesId: quote.assignedSalesId,
          items: {
            create: quote.items.map(qi => ({
              quoteItemId: qi.id,
              productType: qi.productType,
              name: qi.name,
              materialId: qi.materialId,
              labelShape: qi.labelShape,
              widthCm: qi.widthCm,
              heightCm: qi.heightCm,
              diameterCm: qi.diameterCm,
              quantity: qi.quantity,
              labelsPerSheet: qi.labelsPerSheet,
              printSheets: qi.printSheets,
              wasteSheets: qi.wasteSheets,
              totalSheets: qi.totalSheets,
              laminationId: qi.laminationId,
              dieCutType: qi.dieCutType,
              materialCost: qi.materialCost,
              laminationCost: qi.laminationCost,
              dieCutCost: qi.dieCutCost,
              printingCost: qi.printingCost,
              fileHandlingFee: qi.fileHandlingFee,
              otherFee: qi.otherFee,
              costAmount: qi.costAmount,
              saleAmount: qi.saleAmount,
              pricingDetails: qi.pricingDetails,
              layoutDetails: qi.layoutDetails
            }))
          }
        }
      });

      if (quote.status !== 'ACCEPTED') {
        await tx.quote.update({
          where: { id: quote.id },
          data: { status: 'ACCEPTED' }
        });
      }

      await tx.quote.update({
        where: { id: quoteId },
        data: { status: 'CONVERTED' }
      });

      return newOrder;
    });

    await syncCustomerAfterOrder(quote.customerId, order.totalAmount);

    return { success: true, data: order };
  } catch (error: any) {
    if (error.code === 'P2002' && error.meta?.target?.includes('quoteId')) {
      return { success: false, error: 'Báo giá này đã được chuyển thành đơn hàng (Unique constraint).' };
    }
    return { success: false, error: error.message || 'Lỗi chuyển báo giá thành đơn hàng' };
  }
}

export async function getOrders(filters?: any) {
  try {
    const auth = await checkOrderAuth(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'PRODUCTION', 'DELIVERY', 'DESIGNER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const orders = await db.order.findMany({
      where: filters,
      include: {
        customer: true,
        items: true
      },
      orderBy: { createdAt: 'desc' }
    });

    if (auth.user!.role === 'SALES') {
      orders.forEach(order => {
        order.totalCost = 0;
        order.grossProfit = 0;
        order.grossProfitRate = 0;
        order.items.forEach(item => {
          item.materialCost = 0;
          item.laminationCost = 0;
          item.dieCutCost = 0;
          item.printingCost = 0;
          item.costAmount = 0;
          item.pricingDetails = null;
        });
      });
    }

    return { success: true, data: orders };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi lấy danh sách đơn hàng' };
  }
}

export async function getOrderById(id: string) {
  try {
    const auth = await checkOrderAuth(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'PRODUCTION', 'DELIVERY', 'DESIGNER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const order = await db.order.findUnique({
      where: { id },
      include: {
        customer: true,
        items: true,
        quote: { select: { quoteNumber: true } },
        productionJob: { include: { steps: { orderBy: { createdAt: 'asc' } } } },
        deliveryJob: { include: { assignedTo: true } },
        payments: { orderBy: { createdAt: 'desc' } }
      }
    });
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    if (auth.user!.role === 'SALES') {
      order.totalCost = 0;
      order.grossProfit = 0;
      order.grossProfitRate = 0;
      order.items.forEach(item => {
        item.materialCost = 0;
        item.laminationCost = 0;
        item.dieCutCost = 0;
        item.printingCost = 0;
        item.costAmount = 0;
        item.pricingDetails = null;
      });
    }

    return { success: true, data: order };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi lấy đơn hàng' };
  }
}

export async function updateOrderStatus(orderId: string, status: string) {
  try {
    const user = await getCurrentUser();
    if (!user) return { success: false, error: 'Chưa đăng nhập' };

    // Check RBAC based on status
    const allowed = (() => {
      if (['ADMIN', 'MANAGER'].includes(user.role)) return true;
      if (user.role === 'SALES' && ['NEW', 'WAITING_DESIGN', 'WAITING_APPROVAL'].includes(status)) return true;
      if (user.role === 'DESIGNER' && ['WAITING_DESIGN', 'WAITING_APPROVAL'].includes(status)) return true;
      if (user.role === 'PRODUCTION' && ['READY_FOR_PRINT', 'PRINTING', 'FINISHING', 'QC'].includes(status)) return true;
      if (user.role === 'DELIVERY' && ['READY_FOR_DELIVERY', 'DELIVERING', 'COMPLETED'].includes(status)) return true;
      return false;
    })();

    if (!allowed) return { success: false, error: 'Không có quyền cập nhật trạng thái này' };

    const order = await db.order.update({
      where: { id: orderId },
      data: { status }
    });

    return { success: true, data: order };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi cập nhật trạng thái' };
  }
}

export async function updateOrderPayment(orderId: string, paidAmount: number) {
  try {
    const auth = await checkOrderAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!auth.ok) return { success: false, error: auth.error };

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    const debtAmount = order.totalAmount - paidAmount;
    let paymentStatus = 'UNPAID';
    if (paidAmount > 0 && paidAmount < order.totalAmount) paymentStatus = 'PARTIAL';
    else if (paidAmount >= order.totalAmount) paymentStatus = 'PAID';

    const updatedOrder = await db.order.update({
      where: { id: orderId },
      data: {
        paidAmount,
        debtAmount,
        paymentStatus
      }
    });

    return { success: true, data: updatedOrder };
  } catch (error: any) {
    return { success: false, error: error.message || 'Lỗi cập nhật thanh toán' };
  }
}

export async function createDirectOrderFromCrm(quoteData: any) {
  try {
    const auth = await checkOrderAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    quoteData.status = 'APPROVED';
    quoteData.internalNote = quoteData.internalNote || 'CRM_DIRECT_ORDER: Tạo đơn trực tiếp từ CRM';
    
    const quoteRes = await createQuote(quoteData);
    if (!quoteRes.success || !quoteRes.data) {
      return { success: false, error: quoteRes.error || 'Lỗi tạo báo giá tự động' };
    }

    const convertRes = await convertQuoteToOrder(quoteRes.data.id);
    if (!convertRes.success) {
      // Rollback
      await db.quote.update({
        where: { id: quoteRes.data.id },
        data: { status: 'CANCELLED', internalNote: 'Convert to order failed. Rollback.' }
      });
      return { success: false, error: convertRes.error || 'Lỗi chuyển đổi thành đơn hàng' };
    }

    return { success: true, data: convertRes.data };
  } catch (error: any) {
    console.error('Lỗi tạo direct order:', error);
    return { success: false, error: error.message || 'Có lỗi xảy ra khi tạo đơn hàng trực tiếp' };
  }
}
