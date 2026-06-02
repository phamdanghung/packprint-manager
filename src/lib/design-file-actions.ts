'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function checkFileAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Chưa đăng nhập' };
  }
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Bạn không có quyền truy cập chức năng này' };
  }
  return { ok: true, user };
}

export async function getDesigners() {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };
    
    const designers = await db.user.findMany({
      where: { role: 'DESIGNER', status: 'ACTIVE' },
      select: { id: true, name: true }
    });
    return { success: true, data: designers };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

async function createLog(designFileId: string, orderId: string, actorId: string, actionType: string, fromStatus?: string, toStatus?: string, note?: string) {
  await db.designFileLog.create({
    data: {
      designFileId,
      orderId,
      actorId,
      actionType,
      fromStatus,
      toStatus,
      note
    }
  });
}

async function generateFileCode(orderCode: string): Promise<string> {
  const count = await db.designFile.count({
    where: { order: { orderCode } }
  });
  return `${orderCode}-F${String(count + 1).padStart(3, '0')}`;
}

export async function getDesignFiles(filters?: any) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    // Bổ sung filter theo role:
    // - DESIGNER: Có thể chỉ thấy file mà mình được gán, hoặc file chung chưa gán
    // - PRODUCTION: Chỉ thấy isFinal = true HOẶC status = SENT_TO_PRODUCTION / LOCKED_FOR_PRODUCTION
    const finalFilters = { ...filters };
    if (auth.user?.role === 'PRODUCTION') {
      finalFilters.status = { in: ['LOCKED_FOR_PRODUCTION', 'SENT_TO_PRODUCTION'] };
    }

    const files = await db.designFile.findMany({
      where: finalFilters,
      include: {
        order: { select: { orderCode: true, customer: { select: { name: true } } } },
        uploadedBy: { select: { name: true } },
        assignedDesigner: { select: { name: true } },
      },
      orderBy: { updatedAt: 'desc' }
    });
    return { success: true, data: files };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDesignFilesByOrder(orderId: string) {
  try {
    const auth = await checkFileAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const filters: any = { orderId };
    if (auth.user?.role === 'PRODUCTION') {
      filters.status = { in: ['LOCKED_FOR_PRODUCTION', 'SENT_TO_PRODUCTION'] };
    }

    const files = await db.designFile.findMany({
      where: filters,
      include: {
        uploadedBy: { select: { name: true } },
        assignedDesigner: { select: { name: true } },
        approvedBy: { select: { name: true } },
        lockedBy: { select: { name: true } },
        logs: { 
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, data: files };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createDesignFile(data: any) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES', 'DESIGNER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const order = await db.order.findUnique({ where: { id: data.orderId } });
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    const fileCode = await generateFileCode(order.orderCode);
    const initialStatus = 'RECEIVED';

    const file = await db.designFile.create({
      data: {
        orderId: data.orderId,
        uploadedById: auth.user!.id,
        fileCode,
        fileName: data.fileName,
        fileUrl: data.fileUrl,
        fileType: data.fileType || 'OTHER',
        filePurpose: data.filePurpose || 'CUSTOMER_ORIGINAL',
        status: initialStatus,
        saleNote: data.note || null
      }
    });

    await createLog(file.id, file.orderId, auth.user!.id, 'UPLOADED', undefined, initialStatus, data.note);
    
    return { success: true, data: file };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDesignFileStatus(fileId: string, status: string, note?: string) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES', 'DESIGNER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = await db.designFile.findUnique({ where: { id: fileId } });
    if (!file) return { success: false, error: 'Không tìm thấy file' };

    if (file.isLocked) return { success: false, error: 'File đã khóa, không thể đổi trạng thái' };

    const validTransitions: Record<string, string[]> = {
      RECEIVED: ['CHECKING'],
      CHECKING: ['NEEDS_FIX', 'READY_FOR_CUSTOMER_APPROVAL'],
      NEEDS_FIX: ['DESIGNING'],
      DESIGNING: ['READY_FOR_CUSTOMER_APPROVAL'],
      READY_FOR_CUSTOMER_APPROVAL: ['CUSTOMER_APPROVED', 'CUSTOMER_REJECTED'],
      CUSTOMER_REJECTED: ['DESIGNING'],
      CUSTOMER_APPROVED: ['LOCKED_FOR_PRODUCTION'],
      LOCKED_FOR_PRODUCTION: ['SENT_TO_PRODUCTION'],
    };

    const allowedNextStatuses = validTransitions[file.status] || [];
    if (!allowedNextStatuses.includes(status)) {
      return { success: false, error: `Không thể chuyển trạng thái từ ${file.status} sang ${status}` };
    }

    // Validate logic
    if (status === 'CUSTOMER_APPROVED') {
      if (!['ADMIN', 'MANAGER', 'SALES'].includes(auth.user!.role)) {
        return { success: false, error: 'Chỉ có Sale hoặc Quản lý mới được đánh dấu Khách đã duyệt' };
      }
    }

    const updated = await db.designFile.update({
      where: { id: fileId },
      data: { status }
    });

    await createLog(fileId, file.orderId, auth.user!.id, 'STATUS_CHANGED', file.status, status, note);

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignDesigner(fileId: string, designerId: string) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = await db.designFile.findUnique({ where: { id: fileId } });
    if (!file) return { success: false, error: 'Không tìm thấy file' };

    const updated = await db.designFile.update({
      where: { id: fileId },
      data: { assignedDesignerId: designerId }
    });

    await createLog(fileId, file.orderId, auth.user!.id, 'ASSIGNED_DESIGNER', undefined, undefined, `Gán cho designer: ${designerId}`);

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markCustomerApproved(fileId: string) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = await db.designFile.findUnique({ where: { id: fileId } });
    if (!file) return { success: false, error: 'Không tìm thấy file' };

    const updated = await db.designFile.update({
      where: { id: fileId },
      data: { 
        status: 'CUSTOMER_APPROVED',
        approvedAt: new Date(),
        approvedById: auth.user!.id
      }
    });

    await createLog(fileId, file.orderId, auth.user!.id, 'CUSTOMER_APPROVED', file.status, 'CUSTOMER_APPROVED');

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function lockDesignFileForProduction(fileId: string) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = await db.designFile.findUnique({ where: { id: fileId } });
    if (!file) return { success: false, error: 'Không tìm thấy file' };

    if (file.status !== 'CUSTOMER_APPROVED') {
      return { success: false, error: 'Chỉ có thể khóa file khi khách đã duyệt (CUSTOMER_APPROVED)' };
    }

    // Un-final all other files in this order
    await db.designFile.updateMany({
      where: { orderId: file.orderId, id: { not: fileId } },
      data: { isFinal: false }
    });

    const updated = await db.designFile.update({
      where: { id: fileId },
      data: { 
        isFinal: true,
        isLocked: true,
        status: 'LOCKED_FOR_PRODUCTION',
        lockedAt: new Date(),
        lockedById: auth.user!.id
      }
    });

    await createLog(fileId, file.orderId, auth.user!.id, 'FILE_LOCKED', file.status, 'LOCKED_FOR_PRODUCTION');

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function sendFileToProduction(fileId: string) {
  try {
    const auth = await checkFileAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = await db.designFile.findUnique({ where: { id: fileId } });
    if (!file) return { success: false, error: 'Không tìm thấy file' };

    if (file.status !== 'LOCKED_FOR_PRODUCTION' && !file.isLocked) {
      return { success: false, error: 'File phải được khóa trước khi chuyển sản xuất' };
    }

    const updated = await db.designFile.update({
      where: { id: fileId },
      data: { status: 'SENT_TO_PRODUCTION' }
    });

    await createLog(fileId, file.orderId, auth.user!.id, 'SENT_TO_PRODUCTION', file.status, 'SENT_TO_PRODUCTION');

    // Cập nhật Order status nếu cần
    const order = await db.order.findUnique({ where: { id: file.orderId } });
    if (order && ['NEW', 'WAITING_DESIGN', 'WAITING_APPROVAL'].includes(order.status)) {
      await db.order.update({
        where: { id: order.id },
        data: { status: 'READY_FOR_PRINT' }
      });
    }

    // Tự động tạo ProductionJob
    if (order) {
      const existingJob = await db.productionJob.findUnique({ where: { orderId: order.id } });
      if (!existingJob) {
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, ''); // YYYYMMDD
        const count = await db.productionJob.count({
          where: { jobCode: { startsWith: `SX-${dateStr}` } }
        });
        const jobCode = `SX-${dateStr}-${String(count + 1).padStart(3, '0')}`;
        
        await db.productionJob.create({
          data: {
            orderId: order.id,
            jobCode,
            status: 'READY_FOR_PRINT',
            steps: {
              create: [
                { stepCode: 'PRINTING', stepName: 'In' },
                { stepCode: 'LAMINATING', stepName: 'Cán màng' },
                { stepCode: 'DIE_CUTTING', stepName: 'Bế' },
                { stepCode: 'QC', stepName: 'Kiểm tra chất lượng' },
                { stepCode: 'PACKING', stepName: 'Đóng gói' }
              ]
            },
            logs: {
              create: [
                { actorId: auth.user!.id, orderId: order.id, actionType: 'JOB_CREATED', toStatus: 'READY_FOR_PRINT' }
              ]
            }
          }
        });
      }
    }

    return { success: true, data: updated };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addDesignFileNote(fileId: string, note: string) {
  try {
    const auth = await checkFileAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const file = await db.designFile.findUnique({ where: { id: fileId } });
    if (!file) return { success: false, error: 'Không tìm thấy file' };

    await createLog(fileId, file.orderId, auth.user!.id, 'NOTE_ADDED', undefined, undefined, note);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
