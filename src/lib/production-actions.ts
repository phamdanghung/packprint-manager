'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function checkProductionAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Chưa đăng nhập' };
  }
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Bạn không có quyền truy cập chức năng này' };
  }
  return { ok: true, user };
}

async function createProductionLog(jobId: string, orderId: string, actorId: string, actionType: string, fromStatus?: string, toStatus?: string, note?: string) {
  await db.productionLog.create({
    data: {
      productionJobId: jobId,
      orderId,
      actorId,
      actionType,
      fromStatus,
      toStatus,
      note
    }
  });
}

// -------------------------------------------------------------
// GET ACTIONS
// -------------------------------------------------------------

export async function getProductionJobs(filters?: any) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const finalFilters = { ...filters };
    if (auth.user?.role === 'DELIVERY') {
      finalFilters.status = 'READY_FOR_DELIVERY';
    }

    const jobs = await db.productionJob.findMany({
      where: finalFilters,
      include: {
        order: {
          include: { customer: true, items: true }
        },
        assignedTo: { select: { name: true } },
        steps: { orderBy: { createdAt: 'asc' } }
      },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, data: jobs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductionJobById(id: string) {
  try {
    const auth = await checkProductionAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.productionJob.findUnique({
      where: { id },
      include: {
        order: { include: { customer: true, items: true } },
        assignedTo: { select: { name: true } },
        steps: { 
          include: { assignedTo: { select: { name: true } } },
          orderBy: { createdAt: 'asc' } // Ensure logical order: PRINTING -> LAMINATING -> DIE_CUTTING -> QC -> PACKING
        },
        logs: { 
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!job) return { success: false, error: 'Không tìm thấy lệnh sản xuất' };
    return { success: true, data: job };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductionUsers() {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };
    
    const users = await db.user.findMany({
      where: { role: 'PRODUCTION', status: 'ACTIVE' },
      select: { id: true, name: true }
    });
    return { success: true, data: users };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// -------------------------------------------------------------
// UPDATE ACTIONS
// -------------------------------------------------------------

async function syncOrderStatus(orderId: string, jobStatus: string) {
  // READY_FOR_PRINT, PRINTING, LAMINATING, DIE_CUTTING, QC, PACKING, READY_FOR_DELIVERY, ON_HOLD, REWORK, CANCELLED, COMPLETED
  let mappedOrderStatus = '';
  switch (jobStatus) {
    case 'READY_FOR_PRINT':
      mappedOrderStatus = 'READY_FOR_PRINT'; break;
    case 'PRINTING':
      mappedOrderStatus = 'PRINTING'; break;
    case 'LAMINATING':
    case 'DIE_CUTTING':
      mappedOrderStatus = 'FINISHING'; break;
    case 'QC':
    case 'PACKING':
      mappedOrderStatus = 'QC'; break;
    case 'READY_FOR_DELIVERY':
      mappedOrderStatus = 'READY_FOR_DELIVERY'; break;
    case 'COMPLETED':
      mappedOrderStatus = 'COMPLETED'; break;
    // We intentionally don't map ON_HOLD, REWORK, CANCELLED directly to change order status in this simple mapping
  }

  if (mappedOrderStatus) {
    await db.order.update({
      where: { id: orderId },
      data: { status: mappedOrderStatus }
    });
  }
}

async function checkAndUpdateJobStatus(jobId: string, orderId: string, actorId: string, triggerStepCode: string, triggerStepAction: string) {
  const job = await db.productionJob.findUnique({
    where: { id: jobId },
    include: { steps: { orderBy: { createdAt: 'asc' } } }
  });
  if (!job) return;

  const currentStatus = job.status;
  let newStatus = currentStatus;

  if (triggerStepAction === 'START') {
    if (triggerStepCode === 'PRINTING') newStatus = 'PRINTING';
    else if (triggerStepCode === 'LAMINATING') newStatus = 'LAMINATING';
    else if (triggerStepCode === 'DIE_CUTTING') newStatus = 'DIE_CUTTING';
    else if (triggerStepCode === 'QC') newStatus = 'QC';
    else if (triggerStepCode === 'PACKING') newStatus = 'PACKING';
  } else if (triggerStepAction === 'COMPLETE' || triggerStepAction === 'SKIP') {
    const allDoneOrSkipped = job.steps.every(s => s.status === 'DONE' || s.status === 'SKIPPED');
    if (allDoneOrSkipped) {
      newStatus = 'READY_FOR_DELIVERY';
    } else {
      // Find the next step that is not DONE or SKIPPED
      const nextStep = job.steps.find(s => s.status === 'PENDING' || s.status === 'IN_PROGRESS');
      if (nextStep && nextStep.status === 'IN_PROGRESS') {
        newStatus = nextStep.stepCode;
      }
    }
  }

  if (newStatus !== currentStatus) {
    const updateData: any = { status: newStatus };
    if (newStatus === 'READY_FOR_DELIVERY' && !job.completedAt) {
      updateData.completedAt = new Date();
    }
    
    await db.productionJob.update({
      where: { id: jobId },
      data: updateData
    });
    await createProductionLog(jobId, orderId, actorId, 'STATUS_CHANGED', currentStatus, newStatus, 'Hệ thống tự động cập nhật theo tiến độ bước');
    await syncOrderStatus(orderId, newStatus);
    
    if (newStatus === 'READY_FOR_DELIVERY') {
      const { createDeliveryJobFromOrder } = await import('@/lib/delivery-actions');
      await createDeliveryJobFromOrder(orderId);
    }
  }
}

export async function startProductionStep(stepId: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const step = await db.productionStep.findUnique({ where: { id: stepId }, include: { productionJob: { include: { steps: { orderBy: { createdAt: 'asc' } } } } } });
    if (!step) return { success: false, error: 'Không tìm thấy bước sản xuất' };

    // Check dependency
    const allSteps = step.productionJob.steps;
    const currentIndex = allSteps.findIndex(s => s.id === stepId);
    if (currentIndex > 0) {
      const prevStep = allSteps[currentIndex - 1];
      if (prevStep.status !== 'DONE' && prevStep.status !== 'SKIPPED') {
        return { success: false, error: `Không thể bắt đầu. Bước "${prevStep.stepName}" chưa hoàn thành.` };
      }
    }

    const updatedStep = await db.productionStep.update({
      where: { id: stepId },
      data: { status: 'IN_PROGRESS', startedAt: new Date(), assignedToId: auth.user!.id }
    });

    await createProductionLog(step.productionJobId, step.productionJob.orderId, auth.user!.id, 'STEP_STARTED', step.status, 'IN_PROGRESS', `Bắt đầu bước: ${step.stepName}`);
    await checkAndUpdateJobStatus(step.productionJobId, step.productionJob.orderId, auth.user!.id, step.stepCode, 'START');

    return { success: true, data: updatedStep };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function completeProductionStep(stepId: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const step = await db.productionStep.findUnique({ where: { id: stepId }, include: { productionJob: true } });
    if (!step) return { success: false, error: 'Không tìm thấy bước sản xuất' };

    const updatedStep = await db.productionStep.update({
      where: { id: stepId },
      data: { status: 'DONE', completedAt: new Date() }
    });

    await createProductionLog(step.productionJobId, step.productionJob.orderId, auth.user!.id, 'STEP_COMPLETED', step.status, 'DONE', `Hoàn thành bước: ${step.stepName}`);
    await checkAndUpdateJobStatus(step.productionJobId, step.productionJob.orderId, auth.user!.id, step.stepCode, 'COMPLETE');

    return { success: true, data: updatedStep };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function skipProductionStep(stepId: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const step = await db.productionStep.findUnique({ where: { id: stepId }, include: { productionJob: true } });
    if (!step) return { success: false, error: 'Không tìm thấy bước sản xuất' };

    const updatedStep = await db.productionStep.update({
      where: { id: stepId },
      data: { status: 'SKIPPED', completedAt: new Date() } // SKIPPED is considered resolved
    });

    await createProductionLog(step.productionJobId, step.productionJob.orderId, auth.user!.id, 'STEP_COMPLETED', step.status, 'SKIPPED', `Bỏ qua bước: ${step.stepName}`);
    await checkAndUpdateJobStatus(step.productionJobId, step.productionJob.orderId, auth.user!.id, step.stepCode, 'SKIP');

    return { success: true, data: updatedStep };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function reportProductionIssue(stepId: string, issueType: string, issueSeverity: string, issueNote: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const step = await db.productionStep.findUnique({ where: { id: stepId }, include: { productionJob: true } });
    if (!step) return { success: false, error: 'Không tìm thấy bước sản xuất' };

    await db.productionStep.update({
      where: { id: stepId },
      data: { status: 'REWORK', issueType, issueSeverity, issueNote }
    });

    await db.productionJob.update({
      where: { id: step.productionJobId },
      data: { status: 'REWORK' }
    });

    await createProductionLog(step.productionJobId, step.productionJob.orderId, auth.user!.id, 'ISSUE_REPORTED', step.status, 'REWORK', `Báo lỗi ở bước ${step.stepName}: [${issueType}] - ${issueNote}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignProductionUser(jobId: string, userId: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.productionJob.findUnique({ where: { id: jobId } });
    if (!job) return { success: false, error: 'Không tìm thấy job' };

    await db.productionJob.update({
      where: { id: jobId },
      data: { assignedProductionId: userId }
    });

    await createProductionLog(jobId, job.orderId, auth.user!.id, 'ASSIGNED', undefined, undefined, `Gán người phụ trách lệnh: ${userId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateProductionPriority(jobId: string, priority: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.productionJob.findUnique({ where: { id: jobId } });
    if (!job) return { success: false, error: 'Không tìm thấy job' };

    await db.productionJob.update({
      where: { id: jobId },
      data: { priority }
    });

    await createProductionLog(jobId, job.orderId, auth.user!.id, 'NOTE_ADDED', undefined, undefined, `Cập nhật ưu tiên thành: ${priority}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addProductionNote(jobId: string, note: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.productionJob.findUnique({ where: { id: jobId } });
    if (!job) return { success: false, error: 'Không tìm thấy job' };

    await createProductionLog(jobId, job.orderId, auth.user!.id, 'NOTE_ADDED', undefined, undefined, note);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
