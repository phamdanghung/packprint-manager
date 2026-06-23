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

    const hideSensitiveRoles = ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
    if (hideSensitiveRoles.includes(auth.user?.role || '')) {
      jobs.forEach(job => {
        if (job.order) {
          delete (job.order as any).managementMarginFlag;
          delete (job.order as any).managementMarginNote;
          delete (job.order as any).managementMarginReviewedAt;
          delete (job.order as any).managementMarginReviewedById;
        }
      });
    }

    return { success: true, data: jobs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getProductionJobById(id: string) {
  try {
    const auth = await checkProductionAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    let job = await db.productionJob.findUnique({
      where: { id },
      include: {
        order: { include: { customer: true, items: true } },
        assignedTo: { select: { name: true } },
        steps: { 
          include: { assignedTo: { select: { name: true } } },
          orderBy: { createdAt: 'asc' }
        },
        logs: { 
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!job) return { success: false, error: 'Không tìm thấy lệnh sản xuất' };

    // Auto-generate QR Token if missing
    if (!job.qrToken) {
      const crypto = require('crypto');
      const randomToken = 'pjqr_' + crypto.randomBytes(16).toString('hex');
      
      await db.productionJob.update({
        where: { id },
        data: {
          qrToken: randomToken,
          qrIssuedAt: new Date()
        }
      });
      job.qrToken = randomToken;
      job.qrIssuedAt = new Date();
    }

    const hideSensitiveRoles = ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
    if (hideSensitiveRoles.includes(auth.user?.role || '') && job.order) {
      delete (job.order as any).managementMarginFlag;
      delete (job.order as any).managementMarginNote;
      delete (job.order as any).managementMarginReviewedAt;
      delete (job.order as any).managementMarginReviewedById;
    }

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

export async function sendOrderToProductionMobile(orderId: string) {
  try {
    const auth = await checkProductionAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const order = await db.order.findUnique({
      where: { id: orderId },
      include: { customer: true, items: true, productionJob: true }
    });

    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    // Checklist
    let missingFields: string[] = [];
    if (!order.customerId) missingFields.push('Khách hàng chưa được gán');
    if (!order.items || order.items.length === 0) missingFields.push('Đơn hàng chưa có sản phẩm (Order Item)');
    
    // For MVP, we check if items have specs. At least one item should have dimensions.
    const hasSpecs = order.items.some(item => item.widthCm > 0 && item.heightCm > 0);
    if (!hasSpecs) missingFields.push('Sản phẩm chưa có quy cách kích thước (Width/Height)');
    
    if (!order.dueDate && !order.internalNote && !order.note) {
      missingFields.push('Chưa có Ngày cần giao hoặc Ghi chú hẹn giao');
    }

    if (order.totalAmount > 0 && order.paidAmount === 0 && order.paymentStatus === 'UNPAID') {
      missingFields.push('Đơn hàng chưa được thanh toán hoặc đặt cọc');
    }

    // Log if blocked
    if (missingFields.length > 0) {
      await db.systemAuditLog.create({
        data: {
          actorId: auth.user!.id,
          actorName: auth.user!.name,
          actorRole: auth.user!.role,
          action: 'SALES_SENT_ORDER_TO_PRODUCTION',
          entityType: 'ORDER',
          entityId: orderId,
          entityCode: order.orderCode,
          description: 'Bị chặn gửi sản xuất do thiếu thông tin checklist',
          afterJson: JSON.stringify({ checklistPassed: false, missingFields })
        }
      });
      return { success: false, error: 'Chưa đủ điều kiện gửi sản xuất', missingFields };
    }

    // Passed checklist
    let productionJobId = order.productionJob?.id;

    if (!productionJobId) {
      // Create Production Job
      const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
      const count = await db.productionJob.count({ where: { jobCode: { startsWith: `LSX-${dateStr}` } } });
      const jobCode = `LSX-${dateStr}-${String(count + 1).padStart(3, '0')}`;

      const crypto = require('crypto');
      const randomToken = 'pjqr_' + crypto.randomBytes(16).toString('hex');

      const job = await db.productionJob.create({
        data: {
          orderId,
          jobCode,
          status: 'PENDING',
          qrToken: randomToken,
          qrIssuedAt: new Date(),
          steps: {
            create: [
              { stepCode: 'DESIGN_CHECK', stepName: 'Kiểm tra File / Thiết kế', status: 'PENDING' },
              { stepCode: 'PRINTING', stepName: 'In ấn', status: 'PENDING' },
              { stepCode: 'FINISHING', stepName: 'Gia công', status: 'PENDING' },
              { stepCode: 'QC', stepName: 'Kiểm tra chất lượng', status: 'PENDING' },
            ]
          }
        }
      });
      productionJobId = job.id;

      // Create Task for Design
      const taskCode = `TASK-DS-${Date.now()}`;
      await db.taskItem.create({
        data: {
          taskCode,
          title: `Kiểm tra File Thiết kế: Đơn ${order.orderCode}`,
          description: `Sales ${auth.user!.name} vừa gửi đơn hàng xuống sản xuất. Vui lòng kiểm tra file.`,
          type: 'DESIGN_APPROVAL',
          priority: 'HIGH',
          status: 'OPEN',
          sourceType: 'PRODUCTION_JOB',
          sourceId: productionJobId,
          orderId: order.id,
          customerId: order.customerId,
          assignedRole: 'DESIGNER',
          createdById: auth.user!.id,
        }
      });

      await db.order.update({
        where: { id: orderId },
        data: { status: 'WAITING_DESIGN', productionStatus: 'PENDING' }
      });
    }

    // Audit Log success
    await db.systemAuditLog.create({
      data: {
        actorId: auth.user!.id,
        actorName: auth.user!.name,
        actorRole: auth.user!.role,
        action: 'SALES_SENT_ORDER_TO_PRODUCTION',
        entityType: 'ORDER',
        entityId: orderId,
        entityCode: order.orderCode,
        description: 'Đã chuyển đơn hàng sang sản xuất thành công',
        afterJson: JSON.stringify({ checklistPassed: true, productionJobId })
      }
    });

    return { success: true, data: { productionJobId } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
