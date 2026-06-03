import { db } from '@/lib/db';

export async function resolveSmartQR(token: string, user: any, userAgent: string = 'Unknown', ipAddress: string = 'Unknown') {
  if (!user) {
    return { result: 'LOGIN_REQUIRED', targetUrl: `/login?callbackUrl=/r/${token}`, reason: 'User not logged in' };
  }

  const job = await db.productionJob.findUnique({
    where: { qrToken: token },
    include: {
      order: {
        include: {
          designFiles: true,
          payments: true,
        }
      },
      printQueueItems: true,
      operations: true,
    }
  });

  if (!job) {
    await logScan(token, null, user, 'INVALID', null, 'Token not found or does not exist', userAgent, ipAddress);
    return { result: 'INVALID', targetUrl: null, reason: 'Token not found or does not exist' };
  }

  if (job.qrRevokedAt) {
    await logScan(token, job.id, user, 'FORBIDDEN', null, 'Token has been revoked', userAgent, ipAddress);
    return { result: 'FORBIDDEN', targetUrl: null, reason: 'Token has been revoked' };
  }

  const deliveryJob = await db.deliveryJob.findFirst({
    where: { orderId: job.orderId }
  });

  const role = user.role;
  let targetUrl: string | null = null;
  let result = 'NO_TARGET';
  let reason = 'Không tìm thấy công việc phù hợp';

  if (role === 'ADMIN' || role === 'MANAGER') {
    targetUrl = `/dashboard/production/${job.id}/trace`;
    result = 'REDIRECT';
    reason = 'Redirect Admin/Manager to Trace Timeline';
  } 
  else if (role === 'DESIGNER') {
    const hasPendingDesign = job.order.designFiles.some((f: any) => 
      !['LOCKED_FOR_PRODUCTION', 'SENT_TO_PRODUCTION', 'READY_FOR_PRINT'].includes(f.status)
    );
    if (hasPendingDesign) {
      targetUrl = `/dashboard/design-files`;
      result = 'REDIRECT';
      reason = 'Có file thiết kế cần xử lý';
    } else if (job.order.designFiles.length === 0) {
      targetUrl = `/dashboard/design-files`;
      result = 'REDIRECT';
      reason = 'Chưa có file thiết kế nào';
    } else {
      reason = 'Toàn bộ file đã SENT_TO_PRODUCTION / APPROVED';
    }
  }
  else if (role === 'PRODUCTION') {
    const activePrintQueue = job.printQueueItems.find((p: any) => 
      ['WAITING_FILE', 'WAITING_MATERIAL', 'WAITING_ASSIGNMENT', 'READY_TO_PRINT', 'PRINTING', 'PAUSED', 'PRINT_ERROR'].includes(p.status)
    );
    
    if (activePrintQueue) {
      targetUrl = `/dashboard/production-schedule`;
      result = 'REDIRECT';
      reason = `Chuyển hướng đến Print Queue (status: ${activePrintQueue.status})`;
    } else {
      const activeOp = job.operations.find((o: any) => 
        ['READY', 'IN_PROGRESS', 'PAUSED', 'ERROR'].includes(o.status)
      );
      if (activeOp) {
        targetUrl = `/dashboard/post-print/mobile/operation/${activeOp.id}`;
        result = 'REDIRECT';
        reason = `Chuyển hướng đến Công đoạn sau in: ${activeOp.operationName}`;
      } else {
        reason = 'Không có lệnh in hoặc công đoạn sau in khả dụng';
      }
    }
  }
  else if (role === 'DELIVERY') {
    if (deliveryJob && ['READY_FOR_DELIVERY', 'DELIVERING', 'FAILED', 'RETURNED'].includes(deliveryJob.status)) {
      targetUrl = `/dashboard/delivery/mobile/job/${deliveryJob.id}`;
      result = 'REDIRECT';
      reason = `Chuyển hướng đến Giao hàng (status: ${deliveryJob.status})`;
    } else {
      reason = 'Không có lệnh giao hàng khả dụng (Chưa tạo hoặc đã Giao xong)';
    }
  }
  else if (role === 'SALES') {
    if ((job.order as any).assignedSalesId && (job.order as any).assignedSalesId !== user.id) {
      result = 'FORBIDDEN';
      reason = 'Đơn hàng không thuộc quyền quản lý của Sales này';
    } else {
      targetUrl = `/dashboard/production/${job.id}/trace`;
      result = 'REDIRECT';
      reason = 'Redirect Sales to Trace Timeline';
    }
  }
  else if (role === 'ACCOUNTANT') {
    const pendingPayment = job.order.payments.find((p: any) => p.paymentStatus === 'PENDING');
    targetUrl = `/dashboard/production/${job.id}/trace`;
    result = 'REDIRECT';
    reason = pendingPayment ? 'Có thanh toán PENDING' : 'Redirect Accountant to Trace Timeline';
  }
  else {
    result = 'INVALID';
    reason = 'Role không hợp lệ cho tác vụ này';
  }

  await logScan(token, job.id, user, result, targetUrl, reason, userAgent, ipAddress);

  return { result, targetUrl, reason, job };
}

async function logScan(token: string, jobId: string | null, user: any, result: string, targetUrl: string | null, reason: string, userAgent: string, ipAddress: string) {
  try {
    await db.productionQrScanLog.create({
      data: {
        token,
        productionJobId: jobId,
        userId: user?.id,
        userRole: user?.role,
        result,
        resolvedTarget: targetUrl,
        reason,
        userAgent,
        ipAddress
      }
    });
  } catch (err) {
    console.error('Failed to log QR scan', err);
  }
}
