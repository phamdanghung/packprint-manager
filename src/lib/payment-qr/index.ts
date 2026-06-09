import { db } from '@/lib/db';

export function sanitizeTransferContent(text: string): string {
  // Remove accents, special characters, keep alphanumeric and spaces/dashes
  const str = text
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .replace(/[^a-zA-Z0-9 -]/g, '')
    .trim();
  return str.toUpperCase();
}

export function buildVietQrUrl(
  vietQrBankId: string,
  accountNo: string,
  amount: number,
  transferContent: string,
  accountName: string
): string {
  // Example: https://img.vietqr.io/image/970416-246292349-compact2.png?amount=10000&addInfo=TT%20BG123&accountName=HOA%20SEN%20VIET
  const bankId = vietQrBankId.trim();
  const accNo = accountNo.replace(/\s+/g, '').trim();
  const addInfo = encodeURIComponent(sanitizeTransferContent(transferContent));
  const accName = encodeURIComponent(accountName.trim());
  const template = 'compact2'; // 'compact', 'compact2', 'qr_only', 'print'

  return `https://img.vietqr.io/image/${bankId}-${accNo}-${template}.png?amount=${amount}&addInfo=${addInfo}&accountName=${accName}`;
}

export function formatBankAccountNo(no: string): string {
  // Optional formatting helper, currently just returning the original since ACB prefers exact
  return no;
}

export async function getDefaultCompanyBankAccount() {
  const account = await db.companyBankAccount.findFirst({
    where: { isActive: true, isDefault: true }
  });
  if (!account) {
    return await db.companyBankAccount.findFirst({
      where: { isActive: true }
    });
  }
  return account;
}

// Lấy payment request hợp lệ (PENDING hoặc PAID_REPORTED)
export async function getActivePaymentRequest(quoteId?: string, orderId?: string) {
  if (!quoteId && !orderId) return null;
  
  const whereClause: any = {
    status: { in: ['PENDING', 'PAID_REPORTED'] }
  };
  
  if (quoteId) whereClause.quoteId = quoteId;
  if (orderId) whereClause.orderId = orderId;

  return await db.paymentRequest.findFirst({
    where: whereClause,
    orderBy: { createdAt: 'desc' }
  });
}

// Calculate payable amount for Quote
export async function calculateQuotePayableAmount(quoteId: string): Promise<number> {
  const quote = await db.quote.findUnique({ where: { id: quoteId } });
  if (!quote) return 0;
  // If we had paidAmount in quote, we would subtract it. For MVP, Quotes are usually paid fully or partially based on PR.
  // Actually, we rely on active payment request first.
  const activePr = await getActivePaymentRequest(quoteId, undefined);
  if (activePr) return activePr.amount;
  return quote.totalAmount;
}

// Calculate payable amount for Order
export async function calculateOrderPayableAmount(orderId: string): Promise<number> {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return 0;
  const activePr = await getActivePaymentRequest(undefined, orderId);
  if (activePr) return activePr.amount;
  
  const remaining = order.totalAmount - (order.paidAmount || 0);
  return remaining > 0 ? remaining : 0;
}
