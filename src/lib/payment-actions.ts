'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export async function checkPaymentAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Unauthorized' };
  if (!allowedRoles.includes(user.role)) return { ok: false, error: 'Permission denied' };
  return { ok: true, user };
}

// Hàm ghi log PaymentLog
async function createPaymentLog(tx: any, paymentId: string, orderId: string, customerId: string, actorId: string, actionType: string, fromStatus?: string | null, toStatus?: string | null, amount?: number | null, note?: string | null) {
  await tx.paymentLog.create({
    data: {
      paymentId,
      orderId,
      customerId,
      actorId,
      actionType,
      fromStatus,
      toStatus,
      amount,
      note
    }
  });
}

// Tính lại Customer.debtBalance
async function updateCustomerDebtBalance(tx: any, customerId: string) {
  const orders = await tx.order.findMany({
    where: { 
      customerId, 
      status: { not: 'CANCELLED' },
      paymentStatus: { not: 'PAID' }
    },
    select: { debtAmount: true }
  });
  
  const balance = orders.reduce((sum: number, o: any) => sum + o.debtAmount, 0);
  await tx.customer.update({
    where: { id: customerId },
    data: { debtBalance: balance }
  });
}

export async function createPayment(orderId: string, amount: number, paymentMethod: string, status: string, note?: string, referenceCode?: string, proofImageUrl?: string) {
  try {
    const auth = await checkPaymentAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    if (amount <= 0) return { success: false, error: 'Số tiền thanh toán phải lớn hơn 0' };

    const order = await db.order.findUnique({ where: { id: orderId } });
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    // Không cho thu vượt nợ (MVP) cho tất cả role
    if (amount > order.debtAmount) {
      return { success: false, error: `Số tiền thu (${amount}) vượt quá số nợ của đơn hàng (${order.debtAmount})` };
    }

    // Role hạn chế (SALES, DELIVERY) chỉ được tạo PENDING
    if (['SALES', 'DELIVERY'].includes(auth.user!.role) && status === 'CONFIRMED') {
      return { success: false, error: 'Bạn không có quyền xác nhận phiếu thu, chỉ được tạo yêu cầu thu tiền.' };
    }

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    
    return await db.$transaction(async (tx) => {
      // Đếm lấy số tự tăng
      const count = await tx.payment.count({
        where: { paymentCode: { startsWith: `PT-${dateStr}` } }
      });
      const paymentCode = `PT-${dateStr}-${String(count + 1).padStart(3, '0')}`;

      // Tạo payment
      const payment = await tx.payment.create({
        data: {
          paymentCode,
          orderId: order.id,
          customerId: order.customerId,
          amount,
          paymentMethod,
          paymentStatus: status,
          note,
          referenceCode,
          proofImageUrl,
          createdById: auth.user!.id,
          receivedById: status === 'CONFIRMED' ? auth.user!.id : undefined,
          paidAt: status === 'CONFIRMED' ? new Date() : undefined
        }
      });

      await createPaymentLog(tx, payment.id, order.id, order.customerId, auth.user!.id, 'PAYMENT_CREATED', null, status, amount, 'Khởi tạo phiếu thu');

      // Nếu tạo thẳng CONFIRMED, cập nhật công nợ
      if (status === 'CONFIRMED') {
        const newPaidAmount = order.paidAmount + amount;
        const newDebtAmount = order.totalAmount - newPaidAmount;
        let paymentStatus = 'UNPAID';
        if (newPaidAmount >= order.totalAmount) paymentStatus = 'PAID';
        else if (newPaidAmount > 0) paymentStatus = 'PARTIAL';

        await tx.order.update({
          where: { id: order.id },
          data: {
            paidAmount: newPaidAmount,
            debtAmount: newDebtAmount,
            paymentStatus
          }
        });

        await updateCustomerDebtBalance(tx, order.customerId);
      }

      return { success: true, data: payment };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function confirmPayment(paymentId: string) {
  try {
    const auth = await checkPaymentAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!auth.ok) return { success: false, error: auth.error };

    return await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
      if (!payment) return { success: false, error: 'Không tìm thấy phiếu thu' };
      if (payment.paymentStatus === 'CONFIRMED') return { success: false, error: 'Phiếu thu đã được xác nhận trước đó' };
      if (payment.paymentStatus === 'CANCELLED') return { success: false, error: 'Không thể xác nhận phiếu thu đã bị hủy' };

      const order = payment.order;
      // Re-check debt
      if (payment.amount > order.debtAmount) {
         return { success: false, error: `Số tiền thu (${payment.amount}) vượt quá số nợ hiện tại của đơn hàng (${order.debtAmount})` };
      }

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'CONFIRMED',
          paidAt: new Date(),
          receivedById: auth.user!.id
        }
      });

      const newPaidAmount = order.paidAmount + payment.amount;
      const newDebtAmount = order.totalAmount - newPaidAmount;
      let paymentStatus = 'UNPAID';
      if (newPaidAmount >= order.totalAmount) paymentStatus = 'PAID';
      else if (newPaidAmount > 0) paymentStatus = 'PARTIAL';

      await tx.order.update({
        where: { id: order.id },
        data: {
          paidAmount: newPaidAmount,
          debtAmount: newDebtAmount,
          paymentStatus
        }
      });

      await updateCustomerDebtBalance(tx, order.customerId);

      await createPaymentLog(tx, payment.id, order.id, order.customerId, auth.user!.id, 'PAYMENT_CONFIRMED', 'PENDING', 'CONFIRMED', payment.amount, 'Xác nhận phiếu thu');

      return { success: true, data: updatedPayment };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelPayment(paymentId: string, cancelReason: string) {
  try {
    const auth = await checkPaymentAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
    if (!auth.ok) return { success: false, error: auth.error };

    return await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id: paymentId }, include: { order: true } });
      if (!payment) return { success: false, error: 'Không tìm thấy phiếu thu' };
      if (payment.paymentStatus === 'CANCELLED') return { success: false, error: 'Phiếu thu đã bị hủy trước đó' };

      const order = payment.order;
      const oldStatus = payment.paymentStatus;

      const updatedPayment = await tx.payment.update({
        where: { id: paymentId },
        data: {
          paymentStatus: 'CANCELLED',
          note: payment.note ? `${payment.note}\nLý do hủy: ${cancelReason}` : `Lý do hủy: ${cancelReason}`
        }
      });

      if (oldStatus === 'CONFIRMED') {
        const newPaidAmount = Math.max(0, order.paidAmount - payment.amount);
        const newDebtAmount = order.totalAmount - newPaidAmount;
        let paymentStatus = 'UNPAID';
        if (newPaidAmount >= order.totalAmount) paymentStatus = 'PAID';
        else if (newPaidAmount > 0) paymentStatus = 'PARTIAL';

        await tx.order.update({
          where: { id: order.id },
          data: {
            paidAmount: newPaidAmount,
            debtAmount: newDebtAmount,
            paymentStatus
          }
        });

        await updateCustomerDebtBalance(tx, order.customerId);
      }

      await createPaymentLog(tx, payment.id, order.id, order.customerId, auth.user!.id, 'PAYMENT_CANCELLED', oldStatus, 'CANCELLED', payment.amount, `Hủy phiếu thu: ${cancelReason}`);

      return { success: true, data: updatedPayment };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPayments(filters?: any) {
  try {
    const auth = await checkPaymentAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    let where: any = {};
    if (auth.user!.role === 'SALES') {
      where.customer = { assignedSalesId: auth.user!.id }; // SALES chỉ xem phiếu thu khách mình phụ trách
    }
    
    if (filters?.status) where.paymentStatus = filters.status;
    if (filters?.method) where.paymentMethod = filters.method;
    if (filters?.q) {
      where.OR = [
        { paymentCode: { contains: filters.q } },
        { order: { orderCode: { contains: filters.q } } },
        { customer: { name: { contains: filters.q } } }
      ];
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        order: { select: { orderCode: true } },
        customer: { select: { name: true, phone: true } },
        receivedBy: { select: { name: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: payments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCustomerDebts(filters?: any) {
  try {
    const auth = await checkPaymentAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    let where: any = {};
    if (auth.user!.role === 'SALES') {
      where.assignedSalesId = auth.user!.id;
    }

    if (filters?.q) {
      where.OR = [
        { customerCode: { contains: filters.q } },
        { name: { contains: filters.q } },
        { phone: { contains: filters.q } }
      ];
    }

    let customers = await db.customer.findMany({
      where,
      include: {
        createdBy: { select: { name: true } },
        assignedSales: { select: { name: true } },
        orders: {
          where: { paymentStatus: { not: 'PAID' }, status: { not: 'CANCELLED' }, debtAmount: { gt: 0 } },
          select: { id: true, orderCode: true, debtAmount: true, createdAt: true, totalAmount: true, paidAmount: true }
        }
      }
    });

    // Tính toán lại debtBalance từ tổng nợ các đơn hàng
    customers = customers.map(c => {
      const actualDebt = c.orders.reduce((sum, o) => sum + o.debtAmount, 0);
      return { ...c, debtBalance: actualDebt };
    }).filter(c => c.debtBalance > 0).sort((a, b) => b.debtBalance - a.debtBalance);

    return { success: true, data: customers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
