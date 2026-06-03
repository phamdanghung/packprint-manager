'use server';

import { db } from './db';
import { getCurrentUser } from './auth';
import { getDeliveryCodAmount } from './utils';

// Helper function to check auth
async function checkAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };
  if (!allowedRoles.includes(user.role) && !allowedRoles.includes('ALL')) {
    return { ok: false, error: 'Bạn không có quyền truy cập chức năng này' };
  }
  return { ok: true, user };
}

// Log helper
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

// Auto resolve task helper
async function autoResolveTask(dedupeKeyStart: string, userId: string) {
  await db.taskItem.updateMany({
    where: {
      dedupeKey: { startsWith: dedupeKeyStart },
      status: { in: ['OPEN', 'IN_PROGRESS'] }
    },
    data: {
      status: 'DONE',
      resolvedAt: new Date(),
      resolvedById: userId
    }
  });
}



// ACTION: Claim
export async function claimDeliveryJob(deliveryJobId: string) {
  try {
    const auth = await checkAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'READY_FOR_DELIVERY') {
      return { success: false, error: 'Chỉ có thể nhận đơn ở trạng thái Chờ giao' };
    }
    if (job.assignedDeliveryId) {
      return { success: false, error: 'Đơn này đã có người nhận' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { assignedDeliveryId: auth.user!.id }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'CLAIM_DELIVERY', job.status, job.status, 'Nhận đơn giao hàng');
    
    // Auto resolve task DELIVERY_UNASSIGNED_READY
    await autoResolveTask(`DELIVERY_UNASSIGNED_READY_${job.id}`, auth.user!.id);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ACTION: Start Delivery
export async function startDeliveryJob(deliveryJobId: string) {
  try {
    const auth = await checkAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'READY_FOR_DELIVERY') {
      return { success: false, error: 'Trạng thái không hợp lệ để bắt đầu giao' };
    }
    if (job.assignedDeliveryId !== auth.user!.id && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Bạn không thể bắt đầu giao đơn của người khác. Hãy nhận đơn trước.' };
    }

    await db.deliveryJob.update({
      where: { id: deliveryJobId },
      data: { 
        status: 'DELIVERING',
        startedAt: new Date()
      }
    });

    await createDeliveryLog(job.id, job.orderId, auth.user!.id, 'START_DELIVERY', job.status, 'DELIVERING', 'Bắt đầu đi giao hàng');
    
    // Đồng bộ order status nếu cần
    await db.order.update({
      where: { id: job.orderId },
      data: { deliveryStatus: 'DELIVERING', status: 'DELIVERING' } // Giả định mapped status
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ACTION: Mark Delivered
export async function markDeliveryJobDelivered(deliveryJobId: string, input: { receiverName?: string, collectedAmount?: number, paymentMethod?: string, proofImageUrl?: string, note?: string }) {
  try {
    const auth = await checkAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId }, include: { order: true } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'DELIVERING' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Chỉ có thể xác nhận đã giao khi đang đi giao' };
    }
    if (job.assignedDeliveryId !== auth.user!.id && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Bạn không thể xác nhận đơn của người khác' };
    }

    const codAmount = getDeliveryCodAmount(job.order);
    const collectedAmount = input.collectedAmount || 0;

    if (codAmount > 0) {
      if (input.collectedAmount === undefined || input.collectedAmount === null) {
        return { success: false, error: 'Vui lòng nhập số tiền đã thu (COD)' };
      }
      if (collectedAmount < 0) {
        return { success: false, error: 'Số tiền thu không được là số âm' };
      }
      if (collectedAmount > codAmount && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
        return { success: false, error: `Số tiền thu không được lớn hơn tiền COD (${codAmount.toLocaleString()}đ)` };
      }
      if (collectedAmount < codAmount && !input.note) {
        return { success: false, error: 'Vui lòng nhập ghi chú lý do thu thiếu tiền COD' };
      }
    }

    await db.$transaction(async (tx) => {
      // 1. Cập nhật DeliveryJob
      await tx.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: 'DELIVERED',
          deliveredAt: new Date(),
          receiverName: input.receiverName,
          proofImageUrl: input.proofImageUrl,
          proofNote: input.note
        }
      });

      await tx.deliveryLog.create({
        data: {
          deliveryJobId: job.id,
          orderId: job.orderId,
          actorId: auth.user!.id,
          actionType: 'MARK_DELIVERED',
          fromStatus: job.status,
          toStatus: 'DELIVERED',
          note: `Đã giao. Người nhận: ${input.receiverName || 'Không nhập'}. Tiền thu: ${collectedAmount.toLocaleString()}đ. Ghi chú: ${input.note || ''}`
        }
      });

      // 2. Nếu có thu tiền, tạo Payment PENDING
      if (collectedAmount > 0) {
        const paymentCode = `PT-${Date.now().toString().slice(-6)}`;
        await tx.payment.create({
          data: {
            paymentCode,
            orderId: job.orderId,
            customerId: job.order.customerId,
            amount: collectedAmount,
            paymentMethod: input.paymentMethod || 'CASH',
            paymentStatus: 'PENDING',
            note: `Thu tiền COD khi giao hàng - ${job.deliveryCode}. Ghi chú: ${input.note || ''}`,
            createdById: auth.user!.id
          }
        });

        // Tạo task cho Kế toán
        await tx.taskItem.create({
          data: {
            taskCode: `TASK-COD-${job.id.substring(0,6)}`,
            dedupeKey: `DELIVERY_COD_PENDING_CONFIRMATION_${job.id}`,
            title: `Xác nhận tiền COD - Đơn ${job.order.orderCode}`,
            description: `Nhân viên giao hàng đã thu ${collectedAmount.toLocaleString()}đ qua ${input.paymentMethod || 'CASH'}. Vui lòng kiểm tra và xác nhận.`,
            type: 'PAYMENT_VERIFICATION',
            priority: 'HIGH',
            status: 'OPEN',
            sourceType: 'DELIVERY_JOB',
            sourceId: job.id,
            orderId: job.orderId,
            customerId: job.order.customerId,
            assignedRole: 'ACCOUNTANT',
            createdById: auth.user!.id
          }
        });
      }

      // 3. Auto resolve Overdue & Failed Review Tasks
      await tx.taskItem.updateMany({
        where: {
          dedupeKey: { in: [`DELIVERY_OVERDUE_${job.id}`, `DELIVERY_FAILED_REVIEW_${job.id}`] },
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        data: {
          status: 'DONE',
          resolvedAt: new Date(),
          resolvedById: auth.user!.id
        }
      });

      // 4. Update order status
      const paidAmount = job.order.paidAmount + (collectedAmount > 0 && false ? collectedAmount : 0); // PENDING should not add to paidAmount until confirmed
      await tx.order.update({
        where: { id: job.orderId },
        data: {
          status: 'COMPLETED',
          deliveryStatus: 'DELIVERED',
          // paymentStatus remains PARTIAL/UNPAID until the accountant confirms the PENDING payment
        }
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ACTION: Mark Failed
export async function markDeliveryFailed(deliveryJobId: string, failedReason: string, rescheduleAt?: Date, note?: string) {
  try {
    const auth = await checkAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    if (!failedReason) return { success: false, error: 'Vui lòng chọn lý do thất bại' };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId }, include: { order: true } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'DELIVERING' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Chỉ có thể báo lỗi khi đang đi giao' };
    }
    if (job.assignedDeliveryId !== auth.user!.id && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Bạn không thể báo lỗi đơn của người khác' };
    }

    await db.$transaction(async (tx) => {
      await tx.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: 'FAILED',
          failedReason,
          note: note ? `${job.note || ''}\n[Thất bại]: ${note}` : job.note,
          scheduledAt: rescheduleAt || job.scheduledAt
        }
      });

      await tx.deliveryLog.create({
        data: {
          deliveryJobId: job.id,
          orderId: job.orderId,
          actorId: auth.user!.id,
          actionType: 'MARK_FAILED',
          fromStatus: job.status,
          toStatus: 'FAILED',
          note: `Giao thất bại. Lý do: ${failedReason}. ${note || ''}`
        }
      });

      // Tạo task báo cho quản lý / sales
      await tx.taskItem.create({
        data: {
          taskCode: `TASK-FAIL-${job.id.substring(0,6)}`,
          dedupeKey: `DELIVERY_FAILED_REVIEW_${job.id}`,
          title: `Đơn giao thất bại - ${job.order.orderCode}`,
          description: `Lý do: ${failedReason}. Ghi chú: ${note || ''}`,
          type: 'DELIVERY_ISSUE',
          priority: 'HIGH',
          status: 'OPEN',
          sourceType: 'DELIVERY_JOB',
          sourceId: job.id,
          orderId: job.orderId,
          customerId: job.order.customerId,
          assignedRole: 'MANAGER',
          createdById: auth.user!.id
        }
      });
      
      await tx.order.update({
        where: { id: job.orderId },
        data: { deliveryStatus: 'FAILED' }
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ACTION: Reschedule
export async function rescheduleDeliveryJob(deliveryJobId: string, rescheduleAt: Date, reason: string) {
  try {
    const auth = await checkAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    if (!rescheduleAt) return { success: false, error: 'Vui lòng chọn thời gian hẹn lại' };
    if (!reason) return { success: false, error: 'Vui lòng nhập lý do hẹn lại' };

    const job = await db.deliveryJob.findUnique({ where: { id: deliveryJobId }, include: { order: true } });
    if (!job) return { success: false, error: 'Không tìm thấy đơn giao hàng' };

    if (job.status !== 'FAILED' && job.status !== 'RETURNED' && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Chỉ có thể hẹn giao lại đơn đang bị Lỗi/Thất bại' };
    }
    if (job.assignedDeliveryId !== auth.user!.id && !['ADMIN', 'MANAGER'].includes(auth.user!.role)) {
      return { success: false, error: 'Bạn không thể thao tác đơn của người khác' };
    }

    await db.$transaction(async (tx) => {
      await tx.deliveryJob.update({
        where: { id: deliveryJobId },
        data: {
          status: 'READY_FOR_DELIVERY', // Theo MVP đề xuất
          scheduledAt: rescheduleAt,
          failedReason: null, // Reset failed reason
          note: `${job.note || ''}\n[Hẹn lại]: ${reason}`
        }
      });

      await tx.deliveryLog.create({
        data: {
          deliveryJobId: job.id,
          orderId: job.orderId,
          actorId: auth.user!.id,
          actionType: 'RESCHEDULE_DELIVERY',
          fromStatus: job.status,
          toStatus: 'READY_FOR_DELIVERY',
          note: `Hẹn giao lại lúc ${rescheduleAt.toLocaleString('vi-VN')}. Lý do: ${reason}`
        }
      });

      // Auto resolve task DELIVERY_FAILED_REVIEW
      await tx.taskItem.updateMany({
        where: {
          dedupeKey: `DELIVERY_FAILED_REVIEW_${job.id}`,
          status: { in: ['OPEN', 'IN_PROGRESS'] }
        },
        data: {
          status: 'DONE',
          resolvedAt: new Date(),
          resolvedById: auth.user!.id
        }
      });
      
      await tx.order.update({
        where: { id: job.orderId },
        data: { deliveryStatus: 'READY_FOR_DELIVERY' }
      });
    });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
