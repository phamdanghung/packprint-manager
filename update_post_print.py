import sys

content = '''"use server";

import { db } from './db';
import { getCurrentUser } from './auth';
import { revalidatePath } from 'next/cache';

export async function checkPostPrintAccess() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Không có quy?n truy c?p');
  if (['SALES', 'DESIGNER', 'ACCOUNTANT'].includes(user.role)) {
    throw new Error('Unauthorized');
  }
  return user;
}

async function logOperationAction(tx: any, operationId: string, actorId: string, action: string, data: any) {
  await tx.productionOperationLog.create({
    data: {
      productionOperationId: operationId,
      actorId,
      action,
      ...data
    }
  });
}

export async function createPostPrintRoute(printQueueItemId: string) {
  const pqItem = await db.printQueueItem.findUnique({
    where: { id: printQueueItemId },
    include: {
      order: {
        include: { items: true }
      }
    }
  });

  if (!pqItem) return { success: false, message: 'PrintQueueItem not found' };

  const existingOps = await db.productionOperation.findFirst({
    where: { printQueueItemId }
  });
  if (existingOps) return { success: false, message: 'Route already exists' };

  let orderItem = pqItem.order.items[0];
  if (pqItem.order.items.length > 1) {
    const matchedByMaterial = pqItem.order.items.find(i => i.materialId === pqItem.materialId);
    if (matchedByMaterial) orderItem = matchedByMaterial;
  }

  if (!orderItem) return { success: false, message: 'No OrderItem found' };

  const inputSheets = pqItem.printedSheets || pqItem.totalSheets;
  const opsToCreate: { code: string; name: string }[] = [];

  if (orderItem.laminationId) {
    opsToCreate.push({ code: 'LAMINATION', name: 'Cán màng' });
  }

  const dtLower = (orderItem.dieCutType || '').toLowerCase();
  
  if (dtLower.includes('bethang')) {
    opsToCreate.push({ code: 'DIE_CUTTING', name: 'B? demi' });
  } else if (dtLower.includes('cat')) {
    opsToCreate.push({ code: 'CUTTING', name: 'C?t/xén' });
  } else if (dtLower && dtLower !== 'none') {
    opsToCreate.push({ code: 'DIE_CUTTING', name: 'B? demi' });
  }

  if (orderItem.productionNote && orderItem.productionNote.toLowerCase().includes('outsource')) {
    opsToCreate.push({ code: 'OUTSOURCE', name: 'Gia công ngoài' });
  }

  opsToCreate.push({ code: 'QC', name: 'Ki?m hàng' });
  opsToCreate.push({ code: 'PACKING', name: 'Ðóng gói' });

  let sequence = 10;
  
  await db.\(async (tx) => {
    // We assume SYSTEM actor ID if no user is provided, but since this might run in a webhook or user action,
    // let's try to get current user if possible, otherwise use a fallback.
    let actorId = 'SYSTEM';
    try {
      const user = await getCurrentUser();
      if (user) actorId = user.id;
    } catch (e) {}

    for (let i = 0; i < opsToCreate.length; i++) {
      const op = opsToCreate[i];
      const status = i === 0 ? 'READY' : 'WAITING_PREVIOUS';

      const createdOp = await tx.productionOperation.create({
        data: {
          productionJobId: pqItem.productionJobId,
          printQueueItemId,
          orderItemId: orderItem.id,
          operationCode: op.code,
          operationName: op.name,
          sequence,
          status,
          inputSheets: i === 0 ? inputSheets : 0,
          plannedSheets: inputSheets
        }
      });
      
      // If actorId == SYSTEM, we might need a dummy system user or we make actorId optional.
      // But in schema, actorId is String (required).
      // If it's required, we need a valid user ID. 
      // This is a problem if we don't have a system user. Let's find an admin user.
      if (actorId === 'SYSTEM') {
         const adminUser = await tx.user.findFirst({ where: { role: 'ADMIN' } });
         if (adminUser) actorId = adminUser.id;
      }
      
      await logOperationAction(tx, createdOp.id, actorId, 'CREATE_ROUTE', {
        note: \Created operation \\
      });

      sequence += 10;
    }
  });

  return { success: true };
}
'''
with open('src/lib/post-print-actions.ts', 'w', encoding='utf-8') as f:
    f.write(content)
