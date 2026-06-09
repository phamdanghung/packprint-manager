'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export async function checkAccountantAuth() {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };
  
  if (!['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role)) {
    return { ok: false, error: 'Bạn không có quyền xác nhận thanh toán. Chỉ dành cho kế toán / quản lý.' };
  }
  return { ok: true, user };
}

// Hàm tính lại dư nợ khách hàng
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

export async function getAccountingMobileDashboard() {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    const [
      pendingPayments,
      pendingPaymentTotal,
      pendingCodPayments,
      reportedPaymentRequests,
      debtCustomers,
      confirmedToday
    ] = await Promise.all([
      db.payment.count({ where: { paymentStatus: 'PENDING' } }),
      db.payment.aggregate({
        where: { paymentStatus: 'PENDING' },
        _sum: { amount: true }
      }),
      db.payment.count({ where: { paymentStatus: 'PENDING', paymentMethod: { in: ['COD', 'CASH'] }, note: { contains: 'COD' } } }),
      db.paymentRequest.count({ where: { status: 'PAID_REPORTED' } }),
      db.customer.count({ where: { debtBalance: { gt: 0 } } }),
      db.payment.count({
        where: {
          paymentStatus: 'CONFIRMED',
          paidAt: {
            gte: new Date(new Date().setHours(0, 0, 0, 0))
          }
        }
      })
    ]);

    return {
      success: true,
      data: {
        pendingPayments,
        pendingPaymentTotal: pendingPaymentTotal._sum.amount || 0,
        pendingCodPayments,
        reportedPaymentRequests,
        debtCustomers,
        confirmedToday
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPendingPayments(filters?: any) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    let where: any = { paymentStatus: 'PENDING' };

    if (filters?.method) {
      if (filters.method === 'COD') {
        where.paymentMethod = { in: ['COD', 'CASH'] };
        where.note = { contains: 'COD' };
      } else {
        where.paymentMethod = filters.method;
      }
    }

    const payments = await db.payment.findMany({
      where,
      include: {
        order: { select: { orderCode: true, debtAmount: true } },
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: payments };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPaymentMobileDetail(id: string) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    const payment = await db.payment.findUnique({
      where: { id },
      include: {
        order: { select: { orderCode: true, totalAmount: true, debtAmount: true, paidAmount: true } },
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true, role: true } },
        receivedBy: { select: { name: true } },
        logs: { 
          orderBy: { createdAt: 'desc' },
          include: { actor: { select: { name: true } } }
        }
      }
    });

    if (!payment) return { success: false, error: 'Không tìm thấy phiếu thu' };

    return { success: true, data: payment };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function confirmPaymentMobile(id: string) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    return await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id }, include: { order: true } });
      if (!payment) return { success: false, error: 'Không tìm thấy phiếu thu' };
      
      // Chống double confirm
      if (payment.paymentStatus === 'CONFIRMED') {
        return { success: false, error: 'Khoản thanh toán này đã được xác nhận trước đó.' };
      }
      if (payment.paymentStatus === 'CANCELLED') {
        return { success: false, error: 'Không thể xác nhận phiếu thu đã bị hủy' };
      }

      const order = payment.order;
      if (payment.amount > order.debtAmount) {
        return { success: false, error: `Số tiền thu (${payment.amount}) vượt quá số nợ hiện tại của đơn hàng (${order.debtAmount})` };
      }

      // Update Payment
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          paymentStatus: 'CONFIRMED',
          paidAt: new Date(),
          receivedById: auth.user!.id
        }
      });

      // Logic cập nhật order.paidAmount / debtAmount
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

      // Update customer debt balance
      await updateCustomerDebtBalance(tx, order.customerId);

      // Create PaymentLog
      await tx.paymentLog.create({
        data: {
          paymentId: payment.id,
          orderId: order.id,
          customerId: order.customerId,
          actorId: auth.user!.id,
          actionType: 'PAYMENT_CONFIRMED',
          fromStatus: 'PENDING',
          toStatus: 'CONFIRMED',
          amount: payment.amount,
          note: 'Kế toán xác nhận qua Mobile'
        }
      });

      // Update PaymentRequest if linked
      const paymentRequestLinked = await tx.paymentRequest.findFirst({
        where: { confirmedPaymentId: payment.id }
      });
      if (paymentRequestLinked && paymentRequestLinked.status !== 'CONFIRMED') {
        await tx.paymentRequest.update({
          where: { id: paymentRequestLinked.id },
          data: { status: 'CONFIRMED' }
        });
      }

      // Resolve TaskItems (như TASK-KT-* hoặc TASK-COD-*)
      await tx.taskItem.updateMany({
        where: {
          OR: [
            { dedupeKey: `DELIVERY_COD_PENDING_CONFIRMATION_${payment.orderId}` }, // If linked by order
            // Try to match sourceId if we linked it, but for Payment Request it's sourceId = paymentRequest.id
            // For COD it's sourceId = deliveryJob.id. We might not have the direct link in Payment.
            // We resolve task items assigned to ACCOUNTANT and related to this orderId
            { orderId: payment.orderId, type: 'PAYMENT_VERIFICATION', status: { in: ['OPEN', 'IN_PROGRESS'] } }
          ]
        },
        data: {
          status: 'DONE',
          resolvedAt: new Date(),
          resolvedById: auth.user!.id
        }
      });

      return { success: true, data: updatedPayment };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function cancelPaymentMobile(id: string, reason: string) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };
    if (!reason || reason.trim() === '') return { success: false, error: 'Vui lòng nhập lý do từ chối/hủy' };

    return await db.$transaction(async (tx) => {
      const payment = await tx.payment.findUnique({ where: { id }, include: { order: true } });
      if (!payment) return { success: false, error: 'Không tìm thấy phiếu thu' };
      if (payment.paymentStatus === 'CONFIRMED') {
         return { success: false, error: 'Khoản thanh toán này đã được xác nhận trước đó.' };
      }
      if (payment.paymentStatus === 'CANCELLED') return { success: false, error: 'Phiếu thu đã bị hủy trước đó' };

      const oldStatus = payment.paymentStatus;
      
      const updatedPayment = await tx.payment.update({
        where: { id },
        data: {
          paymentStatus: 'CANCELLED',
          note: payment.note ? `${payment.note}\nLý do từ chối: ${reason}` : `Lý do từ chối: ${reason}`
        }
      });

      // Không cập nhật order.paidAmount / debtAmount, chỉ log
      await tx.paymentLog.create({
        data: {
          paymentId: payment.id,
          orderId: payment.orderId,
          customerId: payment.customerId,
          actorId: auth.user!.id,
          actionType: 'PAYMENT_CANCELLED',
          fromStatus: oldStatus,
          toStatus: 'CANCELLED',
          amount: payment.amount,
          note: `Từ chối xác nhận: ${reason}`
        }
      });

      // Update linked PaymentRequest to CANCELLED as well
      const paymentRequestLinked = await tx.paymentRequest.findFirst({
        where: { confirmedPaymentId: payment.id }
      });
      if (paymentRequestLinked) {
        await tx.paymentRequest.update({
          where: { id: paymentRequestLinked.id },
          data: { status: 'CANCELLED', cancelReason: reason }
        });
      }

      // Resolve TaskItems with CANCELLED status maybe? Or keep them open for SALES? 
      // Actually we should resolve the accountant's task and maybe create one for sales.
      await tx.taskItem.updateMany({
        where: { orderId: payment.orderId, type: 'PAYMENT_VERIFICATION', status: { in: ['OPEN', 'IN_PROGRESS'] } },
        data: {
          status: 'DONE',
          resolvedAt: new Date(),
          resolvedById: auth.user!.id
        }
      });

      return { success: true, data: updatedPayment };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPaymentRequestsMobile(filters?: any) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    let where: any = {};
    if (filters?.status) where.status = filters.status;

    const prs = await db.paymentRequest.findMany({
      where,
      include: {
        order: { select: { orderCode: true, debtAmount: true } },
        quote: { select: { quoteNumber: true } },
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: prs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPaymentRequestMobileDetail(id: string) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    const pr = await db.paymentRequest.findUnique({
      where: { id },
      include: {
        order: { select: { orderCode: true, totalAmount: true, debtAmount: true } },
        quote: { select: { quoteNumber: true, totalAmount: true } },
        customer: { select: { name: true, phone: true } },
        createdBy: { select: { name: true } }
      }
    });

    if (!pr) return { success: false, error: 'Không tìm thấy QR thanh toán' };

    return { success: true, data: pr };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function confirmPaymentRequestMobile(id: string, input?: { forceManualConfirm?: boolean, manualConfirmReason?: string }) {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    return await db.$transaction(async (tx) => {
      const pr = await tx.paymentRequest.findUnique({ where: { id }, include: { order: true } });
      if (!pr) return { success: false, error: 'Không tìm thấy Payment Request' };
      
      if (pr.status === 'CONFIRMED') return { success: false, error: 'Payment Request đã được xác nhận trước đó' };
      if (pr.status === 'CANCELLED' || pr.status === 'EXPIRED') return { success: false, error: 'Không thể xác nhận QR đã hủy hoặc hết hạn' };
      if (!pr.orderId) return { success: false, error: 'Chưa hỗ trợ xác nhận cọc từ Báo giá chưa tạo Đơn hàng (Cần liên kết Đơn hàng trước)' };

      // Manual Confirm Logic for PENDING
      let confirmNote = 'Xác nhận thông qua Payment Request';
      if (pr.status === 'PENDING') {
        if (!input?.forceManualConfirm || !input?.manualConfirmReason?.trim()) {
          return { success: false, error: 'PaymentRequest chưa được khách báo đã chuyển. Vui lòng nhập lý do xác nhận thủ công.' };
        }
        confirmNote = `Xác nhận thủ công từ PaymentRequest PENDING: ${input.manualConfirmReason}`;
      }

      const order = pr.order!;
      if (pr.amount > order.debtAmount) {
        return { success: false, error: `Số tiền (${pr.amount}) vượt nợ của đơn hàng (${order.debtAmount})` };
      }

      let targetPaymentId = pr.confirmedPaymentId;

      if (!targetPaymentId) {
        // Chưa có Payment, tự động tạo mới một Payment PENDING rồi lập tức CONFIRMED
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await tx.payment.count({
          where: { paymentCode: { startsWith: `PT-${dateStr}` } }
        });
        const paymentCode = `PT-${dateStr}-${String(count + 1).padStart(3, '0')}`;

        const newPayment = await tx.payment.create({
          data: {
            paymentCode,
            orderId: pr.orderId,
            customerId: pr.customerId,
            amount: pr.amount,
            paymentMethod: pr.paymentMethod || 'TRANSFER',
            paymentStatus: 'CONFIRMED', // Set thẳng CONFIRMED
            paidAt: new Date(),
            receivedById: auth.user!.id,
            createdById: pr.createdById, // Hoặc actor, nhưng createdById là sales
            note: confirmNote,
            referenceCode: pr.transferContent
          }
        });
        targetPaymentId = newPayment.id;
        
        await tx.paymentLog.create({
          data: {
            paymentId: newPayment.id,
            orderId: pr.orderId,
            customerId: pr.customerId,
            actorId: auth.user!.id,
            actionType: 'PAYMENT_CREATED',
            toStatus: 'CONFIRMED',
            amount: pr.amount,
            note: confirmNote
          }
        });

      } else {
        // Đã có Payment PENDING do Sales báo cáo, cập nhật nó thành CONFIRMED
        const existingPayment = await tx.payment.findUnique({ where: { id: targetPaymentId } });
        if (existingPayment?.paymentStatus === 'CONFIRMED') {
          return { success: false, error: 'Khoản thanh toán này đã được xác nhận trước đó.' };
        }
        await tx.payment.update({
          where: { id: targetPaymentId },
          data: {
            paymentStatus: 'CONFIRMED',
            paidAt: new Date(),
            receivedById: auth.user!.id
          }
        });
        await tx.paymentLog.create({
          data: {
            paymentId: targetPaymentId,
            orderId: pr.orderId,
            customerId: pr.customerId,
            actorId: auth.user!.id,
            actionType: 'PAYMENT_CONFIRMED',
            fromStatus: 'PENDING',
            toStatus: 'CONFIRMED',
            amount: pr.amount,
            note: confirmNote
          }
        });
      }

      // Update PR status
      await tx.paymentRequest.update({
        where: { id },
        data: { status: 'CONFIRMED', confirmedPaymentId: targetPaymentId }
      });

      // Cập nhật Order & Customer
      const newPaidAmount = order.paidAmount + pr.amount;
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

      // Resolve Task
      await tx.taskItem.updateMany({
        where: { sourceId: pr.id, type: 'PAYMENT_VERIFICATION' },
        data: {
          status: 'DONE',
          resolvedAt: new Date(),
          resolvedById: auth.user!.id
        }
      });

      return { success: true, data: { paymentId: targetPaymentId } };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDebtCustomersMobile() {
  try {
    const auth = await checkAccountantAuth();
    if (!auth.ok) return { success: false, error: auth.error };

    // Query customers with debtBalance > 0
    let customers = await db.customer.findMany({
      where: { debtBalance: { gt: 0 } },
      include: {
        assignedSales: { select: { name: true } },
        orders: {
          where: { paymentStatus: { not: 'PAID' }, status: { not: 'CANCELLED' }, debtAmount: { gt: 0 } },
          select: { id: true, orderCode: true, debtAmount: true, createdAt: true }
        },
        payments: {
          where: { paymentStatus: 'CONFIRMED' },
          orderBy: { paidAt: 'desc' },
          take: 1,
          select: { paidAt: true, amount: true }
        }
      }
    });

    // Sắp xếp nợ nhiều lên đầu
    customers.sort((a, b) => b.debtBalance - a.debtBalance);

    return { success: true, data: customers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
