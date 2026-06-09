'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export async function getCompanyBankAccounts() {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Chưa đăng nhập' };

  try {
    const accounts = await db.companyBankAccount.findMany({
      where: { isActive: true },
      orderBy: { isDefault: 'desc' }
    });
    return { success: true, data: accounts };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

function sanitizeTransferContent(content: string) {
  // Remove special characters, keep alphanumeric and spaces, uppercase
  return content.replace(/[^a-zA-Z0-9 ]/g, '').toUpperCase().trim();
}

export async function createPaymentRequest(data: {
  amount: number;
  sourceType: 'QUOTE' | 'ORDER' | 'CUSTOM';
  quoteId?: string;
  orderId?: string;
  customerId: string;
  note?: string;
  customPrefix?: string;
}) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Chưa đăng nhập' };

  try {
    if (data.amount <= 0) return { success: false, error: 'Số tiền phải lớn hơn 0' };

    // Validations based on sourceType
    let transferContent = '';
    
    if (data.sourceType === 'ORDER') {
      if (!data.orderId) return { success: false, error: 'Thiếu ID đơn hàng' };
      const order = await db.order.findUnique({ where: { id: data.orderId } });
      if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };
      
      // Limit check for SALES: Amount cannot exceed remaining debt
      if (user.role === 'SALES' && data.amount > order.debtAmount) {
        return { success: false, error: `Số tiền (${data.amount}) vượt quá số còn phải thu (${order.debtAmount})` };
      }
      
      transferContent = sanitizeTransferContent(`TT ${order.orderCode}`);
    } else if (data.sourceType === 'QUOTE') {
      if (!data.quoteId) return { success: false, error: 'Thiếu ID báo giá' };
      const quote = await db.quote.findUnique({ where: { id: data.quoteId } });
      if (!quote) return { success: false, error: 'Không tìm thấy báo giá' };
      transferContent = sanitizeTransferContent(`COC ${quote.quoteNumber}`);
    } else {
      transferContent = sanitizeTransferContent(`TT ${data.customPrefix || ''} KH${data.customerId.slice(-6)}`);
    }

    const accounts = await db.companyBankAccount.findMany({ where: { isActive: true, isDefault: true } });
    const fallbackAccounts = await db.companyBankAccount.findMany({ where: { isActive: true } });
    const bankAccount = accounts[0] || fallbackAccounts[0];

    if (!bankAccount) {
      return { success: false, error: 'Chưa có tài khoản ngân hàng nào được cấu hình.' };
    }

    // Build VietQR URL (img.vietqr.io format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-compact.png?amount=<AMOUNT>&addInfo=<CONTENT>&accountName=<ACCOUNT_NAME>)
    // Wait, the user prompt said template can be used. We'll use compact2.
    // Replace spaces in addInfo with %20
    const addInfoEncoded = encodeURIComponent(transferContent);
    const accountNameEncoded = encodeURIComponent(bankAccount.accountHolder);
    const qrUrl = `https://img.vietqr.io/image/${bankAccount.bankName}-${bankAccount.accountNumber}-compact2.png?amount=${data.amount}&addInfo=${addInfoEncoded}&accountName=${accountNameEncoded}`;

    const pr = await db.paymentRequest.create({
      data: {
        quoteId: data.quoteId,
        orderId: data.orderId,
        customerId: data.customerId,
        createdById: user.id,
        amount: data.amount,
        transferContent,
        qrUrl,
        status: 'PENDING',
        note: data.note,
        sourceType: data.sourceType,
        createdFrom: 'SALES_MOBILE',
      }
    });

    return { success: true, data: { ...pr, bankAccount } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reportPaymentRequestPaid(id: string) {
  const user = await getCurrentUser();
  if (!user || !['SALES', 'ADMIN', 'MANAGER'].includes(user.role)) {
    return { success: false, error: 'Bạn không có quyền báo cáo thanh toán' };
  }

  try {
    const pr = await db.paymentRequest.findUnique({ where: { id }, include: { order: true, quote: true } });
    if (!pr) return { success: false, error: 'Không tìm thấy yêu cầu thanh toán' };
    if (pr.status !== 'PENDING') return { success: false, error: 'Yêu cầu thanh toán không ở trạng thái PENDING' };

    // Tạo Payment record (PENDING) + PaymentLog
    // Lấy order ID. Nếu tạo từ Quote thì có thể chưa có orderId.
    // Wait, createPayment function requires orderId!
    // What if it's a quote deposit? We should probably just create a task for accountant or create an unlinked payment?
    // Let's check payment schema: orderId is REQUIRED in Payment model.
    // If quote is not converted to order, we cannot create a Payment!
    
    return await db.$transaction(async (tx) => {
      // Đánh dấu PaymentRequest thành PAID_REPORTED
      const updatedPr = await tx.paymentRequest.update({
        where: { id },
        data: {
          status: 'PAID_REPORTED',
          reportedPaidAt: new Date()
        }
      });
      
      let createdPaymentId = null;

      if (pr.orderId) {
        // Tạo Payment
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const count = await tx.payment.count({
          where: { paymentCode: { startsWith: `PT-${dateStr}` } }
        });
        const paymentCode = `PT-${dateStr}-${String(count + 1).padStart(3, '0')}`;

        const payment = await tx.payment.create({
          data: {
            paymentCode,
            orderId: pr.orderId,
            customerId: pr.customerId,
            amount: pr.amount,
            paymentMethod: 'TRANSFER',
            paymentStatus: 'PENDING', // PENDING for Accountant to confirm
            note: pr.note,
            referenceCode: pr.transferContent,
            createdById: user.id
          }
        });

        createdPaymentId = payment.id;
        
        // Cập nhật confirmedPaymentId (dù chưa confirm nhưng link vào record)
        await tx.paymentRequest.update({
          where: { id },
          data: { confirmedPaymentId: payment.id }
        });

        // Tạo log
        await tx.paymentLog.create({
          data: {
            paymentId: payment.id,
            orderId: pr.orderId,
            customerId: pr.customerId,
            actorId: user.id,
            actionType: 'PAYMENT_CREATED',
            fromStatus: null,
            toStatus: 'PENDING',
            amount: pr.amount,
            note: 'Tạo từ báo cáo QR thanh toán'
          }
        });
      }

      // Sinh Task cho Kế toán
      const taskCode = `TASK-KT-${Date.now()}`;
      await tx.taskItem.create({
        data: {
          taskCode,
          title: `Xác nhận chuyển khoản: ${pr.transferContent} (${pr.amount.toLocaleString()}đ)`,
          description: `Sales ${user.name} báo khách đã chuyển khoản mã: ${pr.transferContent}. Vui lòng kiểm tra sao kê.`,
          type: 'PAYMENT_VERIFICATION',
          priority: 'HIGH',
          status: 'OPEN',
          sourceType: 'PAYMENT_REQUEST',
          sourceId: pr.id,
          customerId: pr.customerId,
          orderId: pr.orderId,
          assignedRole: 'ACCOUNTANT',
          createdById: user.id,
        }
      });

      return { success: true, data: updatedPr };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getPaymentRequests(filters?: any) {
  const user = await getCurrentUser();
  if (!user) return { success: false, error: 'Chưa đăng nhập' };

  try {
    let where: any = {};
    if (user.role === 'SALES') {
      where.createdById = user.id;
    }
    
    if (filters?.status) where.status = filters.status;
    if (filters?.orderId) where.orderId = filters.orderId;
    if (filters?.quoteId) where.quoteId = filters.quoteId;

    const prs = await db.paymentRequest.findMany({
      where,
      include: {
        order: { select: { orderCode: true, totalAmount: true, debtAmount: true } },
        quote: { select: { quoteNumber: true, totalAmount: true } },
        customer: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: prs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
