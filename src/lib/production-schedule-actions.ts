'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { Prisma } from '@prisma/client';
import { createAuditLog } from './audit-log';
import { revalidatePath } from 'next/cache';
import { reserveInventory } from './inventory-actions';
import { createPostPrintRoute } from './post-print-actions';

/**
 * Access Check
 */
export async function checkProductionAccess() {
  const user = await getCurrentUser();
  if (!user) throw new Error('Không có quyền truy cập');
  
  if (['SALES', 'DESIGNER', 'DELIVERY', 'ACCOUNTANT'].includes(user.role)) {
    throw new Error('Unauthorized'); // 403
  }
  return user;
}

/**
 * Audit Log Helper
 */
async function logQueueAction(itemId: string, actorId: string, action: string, data: any) {
  await db.printQueueLog.create({
    data: {
      printQueueItemId: itemId,
      actorId,
      action,
      ...data
    }
  });
}

/**
 * Get Machines
 */
export async function getProductionMachines() {
  await checkProductionAccess();
  return db.productionMachine.findMany({
    orderBy: { createdAt: 'asc' }
  });
}

/**
 * Get Print Queue
 */
export async function getPrintQueue(machineId?: string) {
  const user = await checkProductionAccess();
  
  const where: any = {};
  if (machineId) where.machineId = machineId;
  // Exclude fully printed/cancelled from active queue
  where.status = { notIn: ['PRINTED', 'CANCELLED'] };

  if (user.role === 'PRODUCTION') {
    // Production can only see their own assigned jobs if we want strict scope,
    // but usually they can SEE all, just not ACT on others. We let them see all.
  }

  return db.printQueueItem.findMany({
    where,
    orderBy: { queuePosition: 'asc' },
    include: {
      productionJob: { select: { jobCode: true, status: true } },
      order: { select: { customer: { select: { name: true } } } },
      machine: true,
      assignedTo: { select: { name: true } },
      printFile: { select: { fileUrl: true, isFinal: true, status: true } },
      material: { select: { name: true, itemCode: true, availableStock: true, unit: true } },
      logs: { 
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' }
      }
    }
  });
}

/**
 * Create Print Queue Item
 */
export async function createPrintQueueItem(input: any) {
  const user = await checkProductionAccess();
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Chỉ Admin/Manager được tạo thẻ in');
  }

  let status = 'WAITING_ASSIGNMENT';
  let fileStatus = 'NOT_CHECKED';
  let materialStatus = 'NOT_CHECKED';
  let waitingReason = undefined;

  // Check file
  if (input.printFileId) {
    const file = await db.designFile.findUnique({ where: { id: input.printFileId } });
    if (file && file.isFinal && file.status === 'SENT_TO_PRODUCTION') {
      fileStatus = 'READY';
    } else {
      fileStatus = 'NOT_READY';
      status = 'WAITING_FILE';
      waitingReason = 'File thiết kế chưa sẵn sàng (chưa final hoặc chưa duyệt chuyển in).';
    }
  } else {
    fileStatus = 'MISSING';
    status = 'WAITING_FILE';
    waitingReason = 'Chưa đính kèm file in.';
  }

  // Check material if file is ready
  if (status !== 'WAITING_FILE' && input.materialId) {
    const mat = await db.inventoryItem.findUnique({ where: { id: input.materialId } });
    if (mat) {
      if (mat.availableStock >= input.totalSheets) {
        materialStatus = 'READY';
      } else {
        materialStatus = 'MISSING';
        status = 'WAITING_MATERIAL';
        waitingReason = `Thiếu vật tư. Cần ${input.totalSheets}, Kho còn ${mat.availableStock}.`;
      }
    } else {
      materialStatus = 'MISSING';
      status = 'WAITING_MATERIAL';
      waitingReason = 'Vật tư không tồn tại.';
    }
  } else if (!input.materialId) {
    materialStatus = 'READY'; // Not required
  }

  // Determine Queue Position (append to end if machine assigned)
  let queuePos = 0;
  if (input.machineId && status !== 'WAITING_FILE' && status !== 'WAITING_MATERIAL') {
    status = 'READY_TO_PRINT';
    const lastItem = await db.printQueueItem.findFirst({
      where: { machineId: input.machineId },
      orderBy: { queuePosition: 'desc' }
    });
    queuePos = lastItem ? lastItem.queuePosition + 1 : 1;
  }

  const item = await db.printQueueItem.create({
    data: {
      ...input,
      status,
      fileStatus,
      materialStatus,
      queuePosition: queuePos,
      waitingReason
    }
  });

  await logQueueAction(item.id, user.id, 'CREATE', { note: 'Khởi tạo thẻ in mới', toStatus: status });
  revalidatePath('/dashboard/production-schedule');
  return { success: true, item };
}

/**
 * Assign / Change Machine
 */
export async function assignMachine(id: string, machineId: string) {
  const user = await checkProductionAccess();
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Chỉ Admin/Manager được gán/đổi máy');
  }

  const item = await db.printQueueItem.findUnique({ where: { id } });
  if (!item) throw new Error('Không tìm thấy thẻ in');

  const lastItem = await db.printQueueItem.findFirst({
    where: { machineId },
    orderBy: { queuePosition: 'desc' }
  });
  const queuePos = lastItem ? lastItem.queuePosition + 1 : 1;

  let newStatus = item.status;
  if (item.status === 'WAITING_ASSIGNMENT') {
    newStatus = 'READY_TO_PRINT';
  }

  const updated = await db.printQueueItem.update({
    where: { id },
    data: { machineId, queuePosition: queuePos, status: newStatus }
  });

  await logQueueAction(id, user.id, 'ASSIGN_MACHINE', { note: `Gán/Đổi sang máy ${machineId}`, fromStatus: item.status, toStatus: newStatus });
  revalidatePath('/dashboard/production-schedule');
  return { success: true };
}

/**
 * Change Status FSM
 */
export async function changePrintStatus(id: string, newStatus: string, reason?: string) {
  const user = await checkProductionAccess();
  const item = await db.printQueueItem.findUnique({ where: { id }, include: { machine: true } });
  if (!item) throw new Error('Không tìm thấy thẻ in');

  // RBAC scope check for Production
  if (user.role === 'PRODUCTION' && item.assignedToId !== user.id) {
    throw new Error('Bạn chỉ có thể thao tác thẻ in được giao cho mình');
  }

  const dataToUpdate: any = { status: newStatus };
  const logData: any = { fromStatus: item.status, toStatus: newStatus, note: reason };

  if (newStatus === 'PRINTING') {
    if (item.fileStatus !== 'READY') throw new Error('Không thể bắt đầu: File chưa sẵn sàng');
    if (item.materialStatus === 'MISSING') throw new Error('Không thể bắt đầu: Thiếu vật tư');
    if (item.status !== 'READY_TO_PRINT' && item.status !== 'PAUSED') throw new Error('Trạng thái không hợp lệ để bắt đầu in');
    
    if (item.materialStatus === 'READY' && !item.isMaterialReserved) {
      logData.note = (reason || '') + ' [LƯU Ý: Bắt đầu in khi vật tư CHƯA GIỮ (Reserve)]';
    }

    if (!item.actualStartAt) dataToUpdate.actualStartAt = new Date();
    dataToUpdate.pauseReason = null;
    dataToUpdate.errorReason = null;
  }

  if (newStatus === 'PAUSED') {
    if (!reason) throw new Error('Bắt buộc nhập lý do tạm dừng');
    dataToUpdate.pauseReason = reason;
  }

  if (newStatus === 'PRINT_ERROR') {
    if (!reason) throw new Error('Bắt buộc nhập lý do lỗi');
    dataToUpdate.errorReason = reason;
  }

  if (newStatus === 'PRINTED') {
    dataToUpdate.actualEndAt = new Date();
    if (item.printedSheets < item.totalSheets) {
       dataToUpdate.printedSheets = item.totalSheets; // Tự fill nếu thiếu
       logData.printedSheetsBefore = item.printedSheets;
       logData.printedSheetsAfter = item.totalSheets;
    }
  }

  await db.printQueueItem.update({ where: { id }, data: dataToUpdate });
  await logQueueAction(id, user.id, `CHANGE_STATUS_${newStatus}`, logData);

  if (newStatus === 'PRINTED') {
    // Generate post-print route based on PrintQueueItem
    await createPostPrintRoute(id);
  }

  // Auto-resolve tasks if PRINTED or CANCELLED
  if (['PRINTED', 'CANCELLED'].includes(newStatus)) {
    const relatedTasks = await db.taskItem.findMany({
      where: {
        sourceType: 'PRINT_QUEUE',
        sourceId: id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });

    if (relatedTasks.length > 0) {
      await db.taskItem.updateMany({
        where: { id: { in: relatedTasks.map(t => t.id) } },
        data: { status: 'DONE', resolvedAt: new Date() }
      });

      await Promise.all(relatedTasks.map(t => 
        db.taskLog.create({
          data: {
            taskId: t.id,
            actorId: user.id,
            actionType: 'STATUS_CHANGED',
            fromStatus: t.status,
            toStatus: 'DONE',
            note: `Hệ thống tự động đóng (Auto resolve) do lệnh in đã ${newStatus}`
          }
        })
      ));
    }
  }

  revalidatePath('/dashboard/production-schedule');
  return { success: true };
}

/**
 * Update Progress
 */
export async function updatePrintProgress(id: string, printedSheets: number) {
  const user = await checkProductionAccess();
  const item = await db.printQueueItem.findUnique({ where: { id } });
  if (!item) throw new Error('Không tìm thấy thẻ in');

  if (user.role === 'PRODUCTION' && item.assignedToId !== user.id) {
    throw new Error('Bạn chỉ có thể thao tác thẻ in được giao cho mình');
  }

  if (printedSheets > item.totalSheets) {
    throw new Error('Không thể nhập số lượng in lớn hơn Tổng tờ chạy máy. Hãy liên hệ Quản lý.');
  }

  await db.printQueueItem.update({
    where: { id },
    data: { printedSheets }
  });

  await logQueueAction(id, user.id, 'UPDATE_PROGRESS', { 
    printedSheetsBefore: item.printedSheets, 
    printedSheetsAfter: printedSheets 
  });
  revalidatePath('/dashboard/production-schedule');
  return { success: true };
}

/**
 * Reserve Material
 */
export async function reserveMaterialForPrintJob(id: string) {
  const user = await checkProductionAccess();
  const item = await db.printQueueItem.findUnique({ where: { id }, include: { material: true } });
  if (!item) throw new Error('Không tìm thấy thẻ in');
  if (!item.materialId) throw new Error('Không yêu cầu vật tư');
  if (item.isMaterialReserved) throw new Error('Vật tư đã được giữ');

  // Gọi logic inventory
  await reserveInventory({
    itemId: item.materialId,
    quantity: item.totalSheets,
    productionJobId: item.productionJobId,
    note: `Giữ vật tư cho lệnh in (Queue ID: ${item.id})`
  });

  const res = await db.inventoryReservation.findFirst({
    where: { itemId: item.materialId, productionJobId: item.productionJobId },
    orderBy: { createdAt: 'desc' }
  });

  await db.printQueueItem.update({
    where: { id },
    data: { 
      isMaterialReserved: true, 
      reservedQuantity: item.totalSheets,
      inventoryReservationId: res?.id,
      materialStatus: 'RESERVED'
    }
  });

  await logQueueAction(id, user.id, 'RESERVE_MATERIAL', { note: `Đã giữ ${item.totalSheets} tờ ${item.material?.name}` });
  revalidatePath('/dashboard/production-schedule');
  return { success: true };
}

/**
 * Reorder Queue
 */
export async function reorderPrintQueue(machineId: string, itemIds: string[]) {
  const user = await checkProductionAccess();
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Chỉ Admin/Manager được đổi thứ tự');
  }

  await db.$transaction(
    itemIds.map((id, index) => 
      db.printQueueItem.update({
        where: { id },
        data: { queuePosition: index + 1 }
      })
    )
  );

  revalidatePath('/dashboard/production-schedule');
  return { success: true };
}
