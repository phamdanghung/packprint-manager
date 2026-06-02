'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { revalidatePath } from 'next/cache';
import { syncSystemTasks } from './task-sync';

export async function checkPostPrintAccess() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Không có quyền truy cập');
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
    opsToCreate.push({ code: 'DIE_CUTTING', name: 'Bế demi' });
  } else if (dtLower.includes('cat')) {
    opsToCreate.push({ code: 'CUTTING', name: 'Cắt/xén' });
  } else if (dtLower && dtLower !== 'none') {
    opsToCreate.push({ code: 'DIE_CUTTING', name: 'Bế demi' });
  }

  if (orderItem.productionNote && orderItem.productionNote.toLowerCase().includes('outsource')) {
    opsToCreate.push({ code: 'OUTSOURCE', name: 'Gia công ngoài' });
  }

  opsToCreate.push({ code: 'QC', name: 'Kiểm hàng' });
  opsToCreate.push({ code: 'PACKING', name: 'Đóng gói' });

  let sequence = 10;
  
  await db.$transaction(async (tx) => {
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
      
      if (actorId === 'SYSTEM') {
         const adminUser = await tx.user.findFirst({ where: { role: 'ADMIN' } });
         if (adminUser) actorId = adminUser.id;
      }
      
      await logOperationAction(tx, createdOp.id, actorId, 'CREATE_ROUTE', {
        note: `Tự động tạo công đoạn ${op.code}`
      });

      sequence += 10;
    }
  });

  return { success: true };
}

export async function updateOperationStatus(opId: string, newStatus: string, payload: any = {}) {
  const user = await checkPostPrintAccess();
  
  const op = await db.productionOperation.findUnique({ where: { id: opId } });
  if (!op) throw new Error('Operation not found');

  if (user.role === 'PRODUCTION' && op.assignedToId !== user.id) {
    throw new Error('Chỉ thao tác trên công đoạn được giao cho bạn');
  }

  const dataToUpdate: any = { status: newStatus };
  const logNote = payload.reason || '';

  if (newStatus === 'IN_PROGRESS') {
    if (!['READY', 'PAUSED', 'ERROR'].includes(op.status)) {
      throw new Error('Chỉ có thể bắt đầu khi trạng thái là READY, PAUSED hoặc ERROR');
    }
    if (!op.startedAt) dataToUpdate.startedAt = new Date();
    dataToUpdate.pauseReason = null;
    dataToUpdate.errorReason = null;
  }

  if (newStatus === 'PAUSED') {
    const pReason = payload.pauseReason || payload.reason;
    if (!pReason) throw new Error('Bắt buộc nhập lý do tạm dừng');
    dataToUpdate.pauseReason = pReason;
  }

  if (newStatus === 'ERROR') {
    const eReason = payload.errorReason || payload.reason;
    if (!eReason) throw new Error('Bắt buộc nhập lý do lỗi');
    dataToUpdate.errorReason = eReason;
  }

  if (newStatus === 'SKIPPED') {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new Error('Chỉ Admin/Manager được bỏ qua công đoạn');
    }
    if (!payload.reason) throw new Error('Bắt buộc nhập lý do bỏ qua');
    dataToUpdate.completedAt = new Date();
    dataToUpdate.completedSheets = 0;
    dataToUpdate.goodSheets = 0;
    dataToUpdate.wasteSheets = 0;
  }

  if (newStatus === 'COMPLETED') {
    if (payload.goodSheets === undefined || payload.wasteSheets === undefined) {
       throw new Error('Bắt buộc nhập số lượng đạt và hỏng');
    }
    const good = Number(payload.goodSheets);
    const waste = Number(payload.wasteSheets);
    
    if (good < 0 || waste < 0) {
      throw new Error('Số lượng không được âm');
    }
    
    const completed = good + waste;
    
    if (payload.completedSheets !== undefined && Number(payload.completedSheets) !== completed) {
      throw new Error('Số lượng đạt và hỏng không khớp với tổng số lượng hoàn thành');
    }
    
    if (completed > op.inputSheets) {
      throw new Error('Số lượng hoàn thành (good + waste) không được lớn hơn đầu vào (inputSheets)');
    }
    
    dataToUpdate.completedAt = new Date();
    dataToUpdate.goodSheets = good;
    dataToUpdate.wasteSheets = waste;
    dataToUpdate.completedSheets = completed;
  }

  await db.$transaction(async (tx) => {
    await tx.productionOperation.update({
      where: { id: opId },
      data: dataToUpdate
    });

    await logOperationAction(tx, opId, user.id, `STATUS_CHANGE_${newStatus}`, {
      fromStatus: op.status,
      toStatus: newStatus,
      note: logNote
    });

    if (newStatus === 'COMPLETED' || newStatus === 'SKIPPED') {
      // Find next operation
      const nextOp = await tx.productionOperation.findFirst({
        where: { 
          printQueueItemId: op.printQueueItemId,
          sequence: { gt: op.sequence },
          status: 'WAITING_PREVIOUS'
        },
        orderBy: { sequence: 'asc' }
      });

      if (nextOp) {
        await tx.productionOperation.update({
          where: { id: nextOp.id },
          data: { 
            status: 'READY',
            inputSheets: newStatus === 'SKIPPED' ? op.inputSheets : (dataToUpdate.goodSheets !== undefined ? dataToUpdate.goodSheets : op.inputSheets)
          }
        });
        await logOperationAction(tx, nextOp.id, user.id, 'AUTO_READY_NEXT_OPERATION', {
          fromStatus: 'WAITING_PREVIOUS',
          toStatus: 'READY',
          note: `Tự động READY vì công đoạn trước đã ${newStatus}`
        });
      } else {
        // Sync ProductionJob to READY_FOR_DELIVERY if all are completed/skipped
        const allOps = await tx.productionOperation.findMany({
          where: { productionJobId: op.productionJobId }
        });
        const allDone = allOps.every(o => o.id === opId || o.status === 'COMPLETED' || o.status === 'SKIPPED');
        if (allDone) {
           await tx.productionJob.update({
             where: { id: op.productionJobId },
             data: { status: 'READY_FOR_DELIVERY' }
           });
           await logOperationAction(tx, op.id, user.id, 'AUTO_READY_FOR_DELIVERY', {
             note: 'Tất cả công đoạn hoàn tất, chuyển Job sang chờ giao hàng'
           });
           
           // Create DeliveryJob if not exists
           const pJob = await tx.productionJob.findUnique({ where: { id: op.productionJobId }, include: { order: true } });
           if (pJob) {
              const existingDelivery = await tx.deliveryJob.findFirst({ where: { orderId: pJob.orderId } });
              if (!existingDelivery) {
                 await tx.deliveryJob.create({
                    data: {
                       deliveryCode: `DEL-${pJob.order.orderCode}-${Date.now().toString().slice(-4)}`,
                       orderId: pJob.orderId,
                       status: 'PENDING',
                       deliveryAddress: pJob.order.deliveryAddress || 'Nhận tại xưởng',
                       deliveryMethod: 'PICKUP',
                       scheduledAt: pJob.order.dueDate || new Date()
                    }
                 });
              }
           }
        }
      }
    }
    
    if (newStatus === 'ERROR') {
       // Sync ProductionJob to POST_PRINT_ERROR
       await tx.productionJob.update({
         where: { id: op.productionJobId },
         data: { status: 'POST_PRINT_ERROR' }
       });
    }
  });

  await syncSystemTasks('SYSTEM').catch(console.error);

  try {
    revalidatePath('/dashboard/post-print');
    revalidatePath('/dashboard/post-print/mobile');
    revalidatePath(`/dashboard/post-print/mobile/operation/${opId}`);
    revalidatePath('/dashboard/production-schedule');
  } catch (e) {}
  return { success: true };
}

export async function claimProductionOperation(opId: string) {
  const user = await checkPostPrintAccess();
  
  const op = await db.productionOperation.findUnique({ where: { id: opId } });
  if (!op) throw new Error('Operation not found');
  
  if (op.status !== 'READY') {
    throw new Error('Chỉ có thể nhận việc khi trạng thái là READY');
  }
  if (op.assignedToId) {
    throw new Error('Công việc này đã có người nhận');
  }

  await db.$transaction(async (tx) => {
    await tx.productionOperation.update({
      where: { id: opId },
      data: { assignedToId: user.id }
    });

    await logOperationAction(tx, opId, user.id, 'CLAIM_OPERATION', {
      note: 'Nhận việc'
    });
  });

  await syncSystemTasks('SYSTEM').catch(console.error);

  try {
    revalidatePath('/dashboard/post-print');
    revalidatePath('/dashboard/post-print/mobile');
  } catch (e) {}
  return { success: true };
}

export async function resolveProductionOperationError(opId: string, note?: string) {
  const user = await checkPostPrintAccess();
  
  const op = await db.productionOperation.findUnique({ where: { id: opId } });
  if (!op) throw new Error('Operation not found');
  
  if (user.role === 'PRODUCTION' && op.assignedToId !== user.id) {
    throw new Error('Chỉ thao tác trên công đoạn được giao cho bạn');
  }

  if (op.status !== 'ERROR') {
    throw new Error('Công đoạn không ở trạng thái lỗi');
  }

  await db.$transaction(async (tx) => {
    await tx.productionOperation.update({
      where: { id: opId },
      data: { 
        status: 'PAUSED',
        errorReason: null
      }
    });

    await logOperationAction(tx, opId, user.id, 'RESOLVE_ERROR', {
      fromStatus: 'ERROR',
      toStatus: 'PAUSED',
      note: note || 'Đã xử lý lỗi, chuyển về Tạm dừng'
    });
  });

  await syncSystemTasks('SYSTEM').catch(console.error);

  try {
    revalidatePath('/dashboard/post-print');
    revalidatePath('/dashboard/post-print/mobile');
    revalidatePath(`/dashboard/post-print/mobile/operation/${opId}`);
  } catch (e) {}
  return { success: true };
}

export async function updateOperationQuantity(opId: string, goodSheets: number, wasteSheets: number) {
  const user = await checkPostPrintAccess();
  const op = await db.productionOperation.findUnique({ where: { id: opId } });
  if (!op) throw new Error('Operation not found');
  
  if (user.role === 'PRODUCTION' && op.assignedToId !== user.id) {
    throw new Error('Chỉ thao tác trên công đoạn được giao cho bạn');
  }

  const completed = goodSheets + wasteSheets;
  if (completed > op.inputSheets) {
    throw new Error('Số lượng (good + waste) không được lớn hơn đầu vào');
  }

  await db.$transaction(async (tx) => {
    await tx.productionOperation.update({
      where: { id: opId },
      data: { goodSheets, wasteSheets, completedSheets: completed }
    });
    
    await logOperationAction(tx, opId, user.id, 'UPDATE_QUANTITY', {
      beforeData: JSON.stringify({ goodSheets: op.goodSheets, wasteSheets: op.wasteSheets }),
      afterData: JSON.stringify({ goodSheets, wasteSheets })
    });
  });

  await syncSystemTasks('SYSTEM').catch(console.error);

  try { revalidatePath('/dashboard/post-print'); } catch (e) {}
  return { success: true };
}

export async function assignOperationUserOrMachine(opId: string, payload: { userId?: string, machineId?: string }) {
  const user = await checkPostPrintAccess();
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Chỉ Admin/Manager được giao việc');
  }

  await db.$transaction(async (tx) => {
    const dataToUpdate: any = {};
    const notes = [];
    
    if (payload.userId !== undefined) {
       dataToUpdate.assignedToId = payload.userId || null;
       notes.push(payload.userId ? 'Gán User' : 'Bỏ gán User');
    }
    if (payload.machineId !== undefined) {
       dataToUpdate.machineId = payload.machineId || null;
       notes.push(payload.machineId ? 'Gán Máy' : 'Bỏ gán Máy');
    }

    await tx.productionOperation.update({
      where: { id: opId },
      data: dataToUpdate
    });
    
    await logOperationAction(tx, opId, user.id, 'ASSIGNMENT_UPDATE', {
      note: notes.join(', ')
    });
  });

  await syncSystemTasks('SYSTEM').catch(console.error);

  try { revalidatePath('/dashboard/post-print'); } catch (e) {}
  return { success: true };
}

export async function getPostPrintOperations(machineId?: string, operationCode?: string) {
  const user = await checkPostPrintAccess();
  
  const where: any = {};
  if (machineId) where.machineId = machineId;
  if (operationCode) where.operationCode = operationCode;
  
  // By default, hide COMPLETED and SKIPPED, unless we want a history tab, 
  // but let's just fetch all active operations for now
  where.status = { notIn: ['COMPLETED', 'SKIPPED'] };

  if (user.role === 'PRODUCTION') {
     // Usually can see all, but maybe filtered in UI
  }

  return db.productionOperation.findMany({
    where,
    orderBy: [
      { productionJobId: 'asc' },
      { sequence: 'asc' }
    ],
    include: {
      productionJob: { select: { jobCode: true, status: true, order: { select: { orderCode: true, dueDate: true, customer: { select: { name: true } } } } } },
      printQueueItem: { select: { id: true, material: { select: { name: true } } } },
      orderItem: { select: { name: true, widthCm: true, heightCm: true } },
      machine: { select: { machineName: true, machineCode: true } },
      assignedTo: { select: { name: true } },
      logs: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
}

export async function getOperationDefinitions() {
  await checkPostPrintAccess();
  return db.operationDefinition.findMany({
    where: { isActive: true },
    orderBy: { defaultSequence: 'asc' }
  });
}
