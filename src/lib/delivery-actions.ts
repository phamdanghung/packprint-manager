'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function checkDeliveryAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Chưa đăng nhập' };
  }
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Bạn không có quyền truy cập chức năng này' };
  }
  return { ok: true, user };
}

async function createDeliveryLog(deliveryJobId: string, orderId: string, actorId: string, actionType: string, fromStatus?: string, toStatus?: string, note?: string) {
  await db.deliveryLog.create({
    data: {
      deliveryJobId,
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

export async function getDeliveryJobs(filters?: any) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'DELIVERY', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const finalFilters = { ...filters };
    if (auth.user?.role === 'DELIVERY') {
      // Giao hàng có thể thấy các đơn chưa gán, hoặc đơn được gán cho mình
      // Tùy logic công ty, ở đây cho thấy toàn bộ để tự nhận đơn, hoặc chỉ hiển thị danh sách chung
    } else if (auth.user?.role === 'SALES') {
      // Sales chỉ thấy đơn của khách mình phụ trách (tùy chỉnh sau)
    }

    const jobs = await db.deliveryJob.findMany({
      where: finalFilters,
      include: {
        order: {
          include: { customer: { select: { name: true, phone: true } }, createdBy: { select: { name: true } } }
        },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' }
    });

    console.log("NEXTJS DEBUG: getDeliveryJobs returned", jobs.length, "jobs.");

    return { success: true, data: jobs };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDeliveryJobById(id: string) {
  try {
    const auth = await checkDeliveryAuth(['ALL']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({
      where: { id },
      include: {
        order: { include: { customer: true, items: true } },
        assignedTo: { select: { name: true } },
        logs: { 
          include: { actor: { select: { name: true } } },
          orderBy: { createdAt: 'desc' }
        }
      }
    });

    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };
    return { success: true, data: job };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getDeliveryUsers() {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };
    
    const users = await db.user.findMany({
      where: { role: 'DELIVERY', status: 'ACTIVE' },
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

async function syncOrderStatus(orderId: string, deliveryStatus: string, currentOrderAmount?: number, paidAmount?: number) {
  let mappedOrderStatus = '';
  switch (deliveryStatus) {
    case 'READY_FOR_DELIVERY':
    case 'SCHEDULED':
    case 'FAILED':
    case 'RETURNED':
      mappedOrderStatus = 'READY_FOR_DELIVERY'; break;
    case 'DELIVERING':
      mappedOrderStatus = 'DELIVERING'; break;
    case 'DELIVERED':
      mappedOrderStatus = 'COMPLETED'; break;
    case 'CANCELLED':
      // Không tự hủy order
      break;
  }

  if (mappedOrderStatus) {
    const updateData: any = { status: mappedOrderStatus };
    
    // Nếu DELIVERED thì cập nhật paymentStatus
    if (deliveryStatus === 'DELIVERED' && currentOrderAmount !== undefined && paidAmount !== undefined) {
      if (paidAmount >= currentOrderAmount) {
        updateData.paymentStatus = 'PAID';
      } else if (paidAmount > 0) {
        updateData.paymentStatus = 'PARTIAL';
      } else {
        updateData.paymentStatus = 'UNPAID';
      }
    }
    
    await db.order.update({
      where: { id: orderId },
      data: updateData
    });
  }
}

export async function createDeliveryJobFromOrder(orderId: string) {
  try {
    const order = await db.order.findUnique({ 
      where: { id: orderId },
      include: { customer: true }
    });
    if (!order) return { success: false, error: 'Không tìm thấy đơn hàng' };

    const existingJob = await db.deliveryJob.findUnique({ where: { orderId } });
    if (existingJob) return { success: true, data: existingJob, message: 'Đã có delivery job' };

    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const count = await db.deliveryJob.count({
      where: { deliveryCode: { startsWith: `GH-${dateStr}` } }
    });
    const deliveryCode = `GH-${dateStr}-${String(count + 1).padStart(3, '0')}`;

    const job = await db.deliveryJob.create({
      data: {
        orderId,
        deliveryCode,
        status: 'READY_FOR_DELIVERY',
        deliveryMethod: 'COMPANY_SHIPPER', // Default
        deliveryAddress: order.deliveryAddress || order.customer.address || '',
        receiverName: order.customer.name,
        receiverPhone: order.customer.phone,
        shippingFee: order.shippingFee,
        createdById: order.createdById
      }
    });

    // Ai là người kích hoạt thì người đó log. Do hàm này chạy ngầm bởi Production/Admin nên có thể lấy current user.
    const user = await getCurrentUser();
    const actorId = user ? user.id : order.createdById || ''; // fallback
    
    if (actorId) {
      await createDeliveryLog(job.id, order.id, actorId, 'DELIVERY_CREATED', undefined, 'READY_FOR_DELIVERY', 'Tự động tạo lệnh giao hàng');
    }

    return { success: true, data: job };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function assignDeliveryUser(deliveryJobId: string, userId: string) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status === 'DELIVERED' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Không thể thay đổi người giao sau khi đã giao hàng' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { assignedDeliveryId: userId }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'ASSIGNED', undefined, undefined, `Gán cho người giao hàng ID: ${userId}`);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function scheduleDelivery(deliveryJobId: string, scheduledAt: Date, deliveryMethod: string) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    let newStatus = job.status;
    if (job.status === 'READY_FOR_DELIVERY' || job.status === 'FAILED') {
      newStatus = 'SCHEDULED';
    } else if (job.status === 'DELIVERED') {
      return { success: false, error: 'Không thể lên lịch cho đơn đã giao' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { scheduledAt, deliveryMethod, status: newStatus }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'SCHEDULED', job.status, newStatus, `Hẹn giao lúc: ${scheduledAt.toISOString()} bằng: ${deliveryMethod}`);
    await syncOrderStatus(job.orderId, newStatus);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDeliveryStatus(deliveryJobId: string, status: string, note?: string) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId }, include: { order: true } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    // Strict state machine validation
    const validTransitions: Record<string, string[]> = {
      READY_FOR_DELIVERY: ['SCHEDULED'],
      SCHEDULED: ['DELIVERING'],
      DELIVERING: ['DELIVERED', 'FAILED'],
      FAILED: ['SCHEDULED'],
      DELIVERED: ['RETURNED'],
      RETURNED: [],
      CANCELLED: []
    };

    const allowedNextStatuses = validTransitions[job.status] || [];
    if (!allowedNextStatuses.includes(status) && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) { // Admin can override
      return { success: false, error: `Không thể chuyển trạng thái giao hàng từ ${job.status} sang ${status}` };
    }

    if (status === 'DELIVERED') {
      return { success: false, error: 'Vui lòng sử dụng hàm markDelivered để xác nhận người nhận và bằng chứng' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { status }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'STATUS_CHANGED', job.status, status, note);
    await syncOrderStatus(job.orderId, status);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markDelivered(deliveryJobId: string, input: { receiverName: string, deliveredAt: Date, proofNote?: string, proofImageUrl?: string }) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    if (!input.receiverName) return { success: false, error: 'Bắt buộc nhập Tên người nhận' };
    if (!input.proofNote && !input.proofImageUrl) return { success: false, error: 'Bắt buộc nhập Ghi chú giao hàng hoặc Ảnh bằng chứng' };
    
    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId }, include: { order: true } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'DELIVERING' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Chỉ có thể đánh dấu Đã giao khi trạng thái đang là Đang giao (DELIVERING)' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { 
        status: 'DELIVERED',
        receiverName: input.receiverName,
        deliveredAt: input.deliveredAt,
        proofNote: input.proofNote || null,
        proofImageUrl: input.proofImageUrl || null
      }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'DELIVERED', job.status, 'DELIVERED', `Người nhận: ${input.receiverName}. Ghi chú: ${input.proofNote || ''}`);
    await syncOrderStatus(job.orderId, 'DELIVERED', job.order.totalAmount, job.order.paidAmount);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function markDeliveryFailed(deliveryJobId: string, failedReason: string) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    if (!failedReason) return { success: false, error: 'Bắt buộc nhập lý do giao thất bại' };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'DELIVERING' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Chỉ có thể báo lỗi khi trạng thái đang là Đang giao (DELIVERING)' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { 
        status: 'FAILED',
        failedReason
      }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'FAILED', job.status, 'FAILED', `Lý do: ${failedReason}`);
    await syncOrderStatus(job.orderId, 'FAILED');

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function updateDeliveryInfo(deliveryJobId: string, input: { deliveryAddress?: string, receiverName?: string, receiverPhone?: string, deliveryMethod?: string }) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status === 'DELIVERED' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Không thể chỉnh sửa thông tin sau khi đã giao hàng' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: input
    });

    await createDeliveryLog(
      job.id, 
      job.orderId, 
      auth.user!.id, 
      'INFO_UPDATED', 
      undefined, 
      undefined, 
      job.status === 'DELIVERED' ? 'Cập nhật thông tin giao hàng (Sau khi đã giao)' : 'Cập nhật thông tin nhận hàng'
    );

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function addDeliveryNote(deliveryJobId: string, note: string) {
  try {
    const auth = await checkDeliveryAuth(['ADMIN', 'MANAGER', 'DELIVERY', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'NOTE_ADDED', undefined, undefined, note);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
