import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import ConversionClient from './conversion-client';

export default async function ConversionsPage() {
  const user = await getCurrentUser();
  if (!user) return <div>Không có quyền truy cập</div>;

  const items = await db.inventoryItem.findMany({
    where: { category: 'PAPER' },
    select: { id: true, name: true, itemCode: true, currentStockBase: true, stockBaseUnit: true }
  });

  const conversions = await db.inventoryConversion.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      fromMaterial: { select: { name: true } },
      outputLines: { include: { toMaterial: { select: { name: true } } } },
      createdBy: { select: { name: true } },
      order: { select: { orderCode: true } },
      productionJob: { select: { jobCode: true } }
    }
  });

  return <ConversionClient initialItems={items} initialConversions={conversions} userRole={user.role} />;
}
