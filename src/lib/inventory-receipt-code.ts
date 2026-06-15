import { db } from './db';

/**
 * Generate a new inbound receipt code in the format PNK-YYYYMMDD-XXX
 */
export async function generateInboundReceiptCode(): Promise<string> {
  const dateStr = new Date().toISOString().split('T')[0].replace(/-/g, '');
  const prefix = `PNK-${dateStr}-`;

  // Find the highest sequence number for today
  const latestReceipt = await db.inventoryInboundReceipt.findFirst({
    where: {
      receiptCode: {
        startsWith: prefix,
      },
    },
    orderBy: {
      receiptCode: 'desc',
    },
    select: {
      receiptCode: true,
    },
  });

  let nextSeq = 1;
  if (latestReceipt) {
    const parts = latestReceipt.receiptCode.split('-');
    if (parts.length === 3) {
      const lastSeq = parseInt(parts[2], 10);
      if (!isNaN(lastSeq)) {
        nextSeq = lastSeq + 1;
      }
    }
  }

  const seqStr = nextSeq.toString().padStart(3, '0');
  return `${prefix}${seqStr}`;
}
