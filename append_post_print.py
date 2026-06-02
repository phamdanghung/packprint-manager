import sys

content = '''
export async function updateOperationStatus(opId: string, newStatus: string, payload: any = {}) {
  const user = await checkPostPrintAccess();
  
  const op = await db.productionOperation.findUnique({ where: { id: opId } });
  if (!op) throw new Error('Operation not found');

  if (user.role === 'PRODUCTION' && op.assignedToId !== user.id) {
    throw new Error('Ch? thao tác trên công do?n du?c giao cho b?n');
  }

  const dataToUpdate: any = { status: newStatus };
  const logNote = payload.reason || '';

  if (newStatus === 'IN_PROGRESS') {
    if (op.status !== 'READY' && op.status !== 'PAUSED') {
      throw new Error('Ch? có th? b?t d?u khi tr?ng thái là READY ho?c PAUSED');
    }
    if (!op.startedAt) dataToUpdate.startedAt = new Date();
    dataToUpdate.pauseReason = null;
    dataToUpdate.errorReason = null;
  }

  if (newStatus === 'PAUSED') {
    if (!payload.reason) throw new Error('B?t bu?c nh?p lý do t?m d?ng');
    dataToUpdate.pauseReason = payload.reason;
  }

  if (newStatus === 'ERROR') {
    if (!payload.reason) throw new Error('B?t bu?c nh?p lý do l?i');
    dataToUpdate.errorReason = payload.reason;
  }

  if (newStatus === 'SKIPPED') {
    if (!['ADMIN', 'MANAGER'].includes(user.role)) {
      throw new Error('Ch? Admin/Manager du?c b? qua công do?n');
    }
    if (!payload.reason) throw new Error('B?t bu?c nh?p lý do b? qua');
    dataToUpdate.completedAt = new Date();
    // completedSheets is 0
    dataToUpdate.completedSheets = 0;
    dataToUpdate.goodSheets = 0;
    dataToUpdate.wasteSheets = 0;
  }

  if (newStatus === 'COMPLETED') {
    dataToUpdate.completedAt = new Date();
    
    let good = payload.goodSheets !== undefined ? Number(payload.goodSheets) : op.inputSheets;
    let waste = payload.wasteSheets !== undefined ? Number(payload.wasteSheets) : 0;
    
    const completed = good + waste;
    
    if (completed > op.inputSheets) {
      throw new Error('S? lu?ng hoàn thành (good + waste) không du?c l?n hon d?u vào (inputSheets)');
    }
    
    dataToUpdate.goodSheets = good;
    dataToUpdate.wasteSheets = waste;
    dataToUpdate.completedSheets = completed;
  }

  await db.\(async (tx) => {
    await tx.productionOperation.update({
      where: { id: opId },
      data: dataToUpdate
    });

    await logOperationAction(tx, opId, user.id, \STATUS_CHANGE_\\, {
      fromStatus: op.status,
      toStatus: newStatus,
      note: logNote
    });

    if (newStatus === 'COMPLETED' || newStatus === 'SKIPPED') {
      // Find next operation
      const nextOp = await tx.productionOperation.findFirst({
        where: { 
          printQueueItemId: op.printQueueItemId,
          sequence: { >: op.sequence },
          status: 'WAITING_PREVIOUS'
        },
        orderBy: { sequence: 'asc' }
      });

      if (nextOp) {
        await tx.productionOperation.update({
          where: { id: nextOp.id },
          data: { 
            status: 'READY',
            inputSheets: dataToUpdate.goodSheets // inputSheets of next op is goodSheets of current
          }
        });
        await logOperationAction(tx, nextOp.id, user.id, 'AUTO_READY_NEXT_OPERATION', {
          fromStatus: 'WAITING_PREVIOUS',
          toStatus: 'READY',
          note: \T? d?ng READY vì công do?n tru?c dã \\
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
           
           // TODO: trigger logic tao DeliveryJob dung 1 lan 
           // We might need to check if DeliveryJob exists first
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

  revalidatePath('/dashboard/post-print');
  revalidatePath('/dashboard/production-schedule');
  return { success: true };
}

export async function updateOperationQuantity(opId: string, goodSheets: number, wasteSheets: number) {
  const user = await checkPostPrintAccess();
  const op = await db.productionOperation.findUnique({ where: { id: opId } });
  if (!op) throw new Error('Operation not found');
  
  if (user.role === 'PRODUCTION' && op.assignedToId !== user.id) {
    throw new Error('Ch? thao tác trên công do?n du?c giao cho b?n');
  }

  const completed = goodSheets + wasteSheets;
  if (completed > op.inputSheets) {
    throw new Error('S? lu?ng (good + waste) không du?c l?n hon d?u vào');
  }

  await db.\(async (tx) => {
    await tx.productionOperation.update({
      where: { id: opId },
      data: { goodSheets, wasteSheets, completedSheets: completed }
    });
    
    await logOperationAction(tx, opId, user.id, 'UPDATE_QUANTITY', {
      beforeData: JSON.stringify({ goodSheets: op.goodSheets, wasteSheets: op.wasteSheets }),
      afterData: JSON.stringify({ goodSheets, wasteSheets })
    });
  });

  revalidatePath('/dashboard/post-print');
  return { success: true };
}

export async function assignOperationUserOrMachine(opId: string, payload: { userId?: string, machineId?: string }) {
  const user = await checkPostPrintAccess();
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Ch? Admin/Manager du?c giao vi?c');
  }

  await db.\(async (tx) => {
    const dataToUpdate: any = {};
    const notes = [];
    
    if (payload.userId !== undefined) {
       dataToUpdate.assignedToId = payload.userId || null;
       notes.push(payload.userId ? 'Gán User' : 'B? gán User');
    }
    if (payload.machineId !== undefined) {
       dataToUpdate.machineId = payload.machineId || null;
       notes.push(payload.machineId ? 'Gán Máy' : 'B? gán Máy');
    }

    await tx.productionOperation.update({
      where: { id: opId },
      data: dataToUpdate
    });
    
    await logOperationAction(tx, opId, user.id, 'ASSIGNMENT_UPDATE', {
      note: notes.join(', ')
    });
  });

  revalidatePath('/dashboard/post-print');
  return { success: true };
}
'''
with open('src/lib/post-print-actions.ts', 'a', encoding='utf-8') as f:
    f.write(content)
