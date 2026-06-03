import { db } from '@/lib/db';
import { UserSession } from '@/lib/auth';

export async function getProductionTrace(productionJobId: string, currentUser: UserSession) {
  try {
    const job = await db.productionJob.findUnique({
      where: { id: productionJobId },
      include: {
        order: {
          include: {
            customer: true,
            items: true,
            designFiles: {
              orderBy: { createdAt: 'asc' }
            },
            payments: {
              orderBy: { createdAt: 'desc' }
            },
            tasks: {
              orderBy: { createdAt: 'desc' }
            }
          }
        },
        printQueueItems: {
          orderBy: { createdAt: 'asc' },
          include: { assignedTo: true }
        },
        operations: {
          orderBy: { createdAt: 'asc' },
          include: { assignedTo: true }
        },
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { actor: true }
        },
        qrScanLogs: {
          orderBy: { createdAt: 'desc' },
          take: 50
        }
      }
    });

    if (!job) return { success: false, error: 'Không tìm thấy Lệnh sản xuất' };

    // Phân quyền Server-Side
    if (currentUser.role === 'SALES') {
      if (job.order.assignedSalesId && job.order.assignedSalesId !== currentUser.id) {
        return { success: false, error: 'Không có quyền truy cập Đơn hàng này' };
      }
    }

    const deliveryJob = await db.deliveryJob.findFirst({
      where: { orderId: job.orderId },
      include: {
        logs: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          include: { actor: true }
        },
        assignedTo: true
      }
    });

    const operationLogs = await db.productionOperationLog.findMany({
      where: { productionOperation: { productionJobId: job.id } },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: { actor: true, productionOperation: true }
    });

    // Mask financial data if not authorized
    let traceData = {
      ...job,
      deliveryJob,
      operationLogs
    };

    if (['PRODUCTION', 'DELIVERY'].includes(currentUser.role)) {
      // Mask pricing / payment info
      traceData.order.items = traceData.order.items.map(item => ({
        ...item,
        costAmount: 0,
        saleAmount: 0,
        materialCost: 0,
        printingCost: 0,
        laminationCost: 0,
        dieCutCost: 0
      }));
      traceData.order.subtotal = 0;
      traceData.order.totalAmount = 0;
      traceData.order.depositAmount = 0;
      traceData.order.paidAmount = 0;
      traceData.order.debtAmount = 0;
      traceData.order.grossProfit = 0;
      traceData.order.grossProfitRate = 0;
      traceData.order.payments = [];
    }

    return { success: true, data: traceData };
  } catch (err: any) {
    console.error('Error in getProductionTrace:', err);
    return { success: false, error: err.message };
  }
}

export function buildUnifiedProductionEvents(traceData: any) {
  const events: any[] = [];

  // Order created
  if (traceData.order?.createdAt) {
    events.push({
      type: 'ORDER',
      title: 'Tạo đơn hàng',
      description: `Đơn hàng ${traceData.order.orderCode} được tạo cho khách hàng ${traceData.order.customer?.name}`,
      timestamp: traceData.order.createdAt,
      status: 'DONE',
      icon: 'FileText'
    });
  }

  // Design files
  if (traceData.order?.designFiles) {
    traceData.order.designFiles.forEach((file: any) => {
      events.push({
        type: 'DESIGN',
        title: `Upload file thiết kế: ${file.fileName}`,
        description: `Trạng thái: ${file.status}`,
        timestamp: file.createdAt,
        status: file.status === 'APPROVED' || file.status === 'LOCKED_FOR_PRODUCTION' || file.status === 'SENT_TO_PRODUCTION' ? 'DONE' : 'IN_PROGRESS',
        icon: 'PenTool'
      });
      if (file.approvedAt) {
        events.push({
          type: 'DESIGN_APPROVED',
          title: `Duyệt file: ${file.fileName}`,
          description: `Bởi người dùng ID: ${file.approvedById}`,
          timestamp: file.approvedAt,
          status: 'DONE',
          icon: 'CheckCircle'
        });
      }
    });
  }

  // Production Job
  if (traceData.createdAt) {
    events.push({
      type: 'PRODUCTION_CREATED',
      title: 'Tạo lệnh sản xuất',
      description: `Mã LSX: ${traceData.jobCode}`,
      timestamp: traceData.createdAt,
      status: 'DONE',
      icon: 'Settings'
    });
  }

  // Print Queue
  if (traceData.printQueueItems) {
    traceData.printQueueItems.forEach((print: any) => {
      if (print.startedAt) {
        events.push({
          type: 'PRINT_STARTED',
          title: `Bắt đầu in: ${print.machineCode}`,
          description: `In bài: ${print.itemName}`,
          timestamp: print.startedAt,
          status: 'IN_PROGRESS',
          icon: 'Printer'
        });
      }
      if (print.completedAt) {
        events.push({
          type: 'PRINT_COMPLETED',
          title: `Hoàn tất in: ${print.machineCode}`,
          description: `Sản lượng: ${print.actualSheets} tờ`,
          timestamp: print.completedAt,
          status: 'DONE',
          icon: 'Printer'
        });
      }
    });
  }

  // Operations
  if (traceData.operations) {
    traceData.operations.forEach((op: any) => {
      if (op.startedAt) {
        events.push({
          type: 'OPERATION_STARTED',
          title: `Bắt đầu gia công: ${op.operationName}`,
          description: `Bởi: ${op.assignedTo?.name || 'Chưa gán'}`,
          timestamp: op.startedAt,
          status: 'IN_PROGRESS',
          icon: 'Scissors'
        });
      }
      if (op.completedAt) {
        events.push({
          type: 'OPERATION_COMPLETED',
          title: `Hoàn tất gia công: ${op.operationName}`,
          description: `SL đạt: ${op.goodQuantity || 0}`,
          timestamp: op.completedAt,
          status: 'DONE',
          icon: 'CheckCircle'
        });
      }
    });
  }

  // Delivery
  if (traceData.deliveryJob) {
    events.push({
      type: 'DELIVERY_CREATED',
      title: 'Tạo lệnh giao hàng',
      description: `Mã giao: ${traceData.deliveryJob.deliveryCode}`,
      timestamp: traceData.deliveryJob.createdAt,
      status: 'DONE',
      icon: 'Truck'
    });
    if (traceData.deliveryJob.startedAt) {
      events.push({
        type: 'DELIVERY_STARTED',
        title: 'Bắt đầu giao hàng',
        description: `NV: ${traceData.deliveryJob.assignedTo?.name || 'N/A'}`,
        timestamp: traceData.deliveryJob.startedAt,
        status: 'IN_PROGRESS',
        icon: 'Truck'
      });
    }
    if (traceData.deliveryJob.deliveredAt) {
      events.push({
        type: 'DELIVERY_COMPLETED',
        title: 'Giao hàng thành công',
        description: `Bàn giao lúc: ${new Date(traceData.deliveryJob.deliveredAt).toLocaleString()}`,
        timestamp: traceData.deliveryJob.deliveredAt,
        status: 'DONE',
        icon: 'CheckCircle'
      });
    }
  }

  // Payments
  if (traceData.order?.payments) {
    traceData.order.payments.forEach((payment: any) => {
      events.push({
        type: 'PAYMENT',
        title: `Thanh toán: ${payment.paymentCode}`,
        description: `Số tiền: ${payment.amount.toLocaleString()}đ - ${payment.paymentStatus}`,
        timestamp: payment.paidAt || payment.createdAt,
        status: payment.paymentStatus === 'COMPLETED' ? 'DONE' : 'IN_PROGRESS',
        icon: 'CreditCard'
      });
    });
  }

  // Sort chronologically and take last 100
  events.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  
  if (events.length > 100) {
    return events.slice(events.length - 100);
  }
  
  return events;
}
