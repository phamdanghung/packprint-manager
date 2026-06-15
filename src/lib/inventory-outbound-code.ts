import { db } from './db';
// No date-fns needed

/**
 * Sinh mã phiếu xuất kho tự động
 * Định dạng: PXK-YYYYMMDD-XXX
 * Ví dụ: PXK-20260613-001
 */
export async function generateOutboundReceiptCode(): Promise<string> {
  const now = new Date();
  const dateStr = now.getFullYear().toString() + 
    (now.getMonth() + 1).toString().padStart(2, '0') + 
    now.getDate().toString().padStart(2, '0');
  const prefix = `PXK-${dateStr}-`;

  // Tìm phiếu xuất mới nhất trong ngày
  const latestReceipt = await db.inventoryOutboundReceipt.findFirst({
    where: {
      receiptCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptCode: 'desc',
    },
  });

  let nextSequence = 1;
  if (latestReceipt) {
    const lastCode = latestReceipt.receiptCode;
    const lastSequenceStr = lastCode.split('-').pop();
    if (lastSequenceStr) {
      const lastSequence = parseInt(lastSequenceStr, 10);
      if (!isNaN(lastSequence)) {
        nextSequence = lastSequence + 1;
      }
    }
  }

  const sequenceStr = nextSequence.toString().padStart(3, '0');
  return `${prefix}${sequenceStr}`;
}
