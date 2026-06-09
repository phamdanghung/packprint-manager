import { db } from "./db";

type TaskCandidate = {
  dedupeKey: string;
  title: string;
  description: string;
  type: string;
  priority: string;
  sourceType: string;
  sourceId: string;
  customerId?: string | null;
  orderId?: string | null;
  assignedRole: string;
  assignedSalesId?: string | null;
  assignedToId?: string | null;
};

export async function syncSystemTasks(systemUserId: string = "SYSTEM") {
  const candidates: TaskCandidate[] = [];

  const now = new Date();
  const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);

  // 1. QUOTE_FOLLOW_UP
  const quotes = await db.quote.findMany({
    where: { status: { in: ["DRAFT", "SENT"] }, orders: { none: {} } },
    select: {
      id: true,
      quoteNumber: true,
      customerId: true,
      assignedSalesId: true,
      createdAt: true,
    },
  });
  for (const q of quotes) {
    candidates.push({
      dedupeKey: `QUOTE_FOLLOW_UP:QUOTE:${q.id}`,
      title: `Chăm sóc báo giá ${q.quoteNumber}`,
      description: "Báo giá đang chờ phản hồi từ khách hàng.",
      type: "QUOTE_FOLLOW_UP",
      priority: q.createdAt < threeDaysAgo ? "HIGH" : "NORMAL",
      sourceType: "QUOTE",
      sourceId: q.id,
      customerId: q.customerId,
      assignedRole: "SALES",
      assignedSalesId: q.assignedSalesId,
    });
  }

  // 2. CUSTOMER_APPROVAL_PENDING, 3. DESIGN_FILE_REVISION, 4. DESIGN_FILE_REVIEW
  const designFiles = await db.designFile.findMany({
    where: {
      status: {
        in: [
          "READY_FOR_CUSTOMER_APPROVAL",
          "NEEDS_FIX",
          "CUSTOMER_REJECTED",
          "RECEIVED",
          "CHECKING",
        ],
      },
    },
    include: { order: { select: { customerId: true, assignedSalesId: true } } },
  });
  for (const f of designFiles) {
    if (f.status === "READY_FOR_CUSTOMER_APPROVAL" && f.updatedAt < yesterday) {
      candidates.push({
        dedupeKey: `CUSTOMER_APPROVAL_PENDING:DESIGN_FILE:${f.id}`,
        title: `Nhắc khách duyệt file ${f.fileCode}`,
        description: "File đã gửi cho khách duyệt hơn 1 ngày chưa có phản hồi.",
        type: "CUSTOMER_APPROVAL_PENDING",
        priority: "NORMAL",
        sourceType: "DESIGN_FILE",
        sourceId: f.id,
        customerId: f.order.customerId,
        orderId: f.orderId,
        assignedRole: "SALES",
        assignedSalesId: f.order.assignedSalesId,
      });
    } else if (f.status === "NEEDS_FIX" || f.status === "CUSTOMER_REJECTED") {
      candidates.push({
        dedupeKey: `DESIGN_FILE_REVISION:DESIGN_FILE:${f.id}`,
        title: `Sửa file ${f.fileCode} (${f.status === "CUSTOMER_REJECTED" ? "Khách từ chối" : "Cần sửa"})`,
        description: "File thiết kế cần được chỉnh sửa.",
        type: "DESIGN_FILE_REVISION",
        priority: "HIGH",
        sourceType: "DESIGN_FILE",
        sourceId: f.id,
        customerId: f.order.customerId,
        orderId: f.orderId,
        assignedRole: "DESIGNER",
        assignedToId: f.assignedDesignerId,
      });
    } else if (f.status === "RECEIVED" || f.status === "CHECKING") {
      candidates.push({
        dedupeKey: `DESIGN_FILE_REVIEW:DESIGN_FILE:${f.id}`,
        title: `Kiểm tra file mới ${f.fileCode}`,
        description: "Cần kiểm tra file do Sales hoặc khách tải lên.",
        type: "DESIGN_FILE_REVIEW",
        priority: "NORMAL",
        sourceType: "DESIGN_FILE",
        sourceId: f.id,
        customerId: f.order.customerId,
        orderId: f.orderId,
        assignedRole: "DESIGNER",
        assignedToId: f.assignedDesignerId,
      });
    }
  }

  // 5. PRODUCTION_READY, 6. PRODUCTION_ISSUE, 7. PRODUCTION_DELAYED
  const prodJobs = await db.productionJob.findMany({
    where: {
      OR: [
        { status: { in: ["READY_FOR_PRINT", "REWORK", "ON_HOLD"] } },
        {
          dueDate: { lt: now },
          status: { notIn: ["READY_FOR_DELIVERY", "COMPLETED", "CANCELLED"] },
        },
      ],
    },
    include: { order: { select: { customerId: true } } },
  });
  for (const pj of prodJobs) {
    if (pj.status === "READY_FOR_PRINT") {
      candidates.push({
        dedupeKey: `PRODUCTION_READY:PRODUCTION_JOB:${pj.id}`,
        title: `Sẵn sàng in lệnh ${pj.jobCode}`,
        description: "Đã có file, chờ tiến hành in.",
        type: "PRODUCTION_READY",
        priority: "NORMAL",
        sourceType: "PRODUCTION_JOB",
        sourceId: pj.id,
        customerId: pj.order.customerId,
        orderId: pj.orderId,
        assignedRole: "PRODUCTION",
      });
    } else if (pj.status === "REWORK" || pj.status === "ON_HOLD") {
      candidates.push({
        dedupeKey: `PRODUCTION_ISSUE:PRODUCTION_JOB:${pj.id}`,
        title: `Lệnh sản xuất có vấn đề ${pj.jobCode}`,
        description:
          pj.status === "REWORK"
            ? "Có công đoạn phải làm lại."
            : "Đang tạm dừng.",
        type: "PRODUCTION_ISSUE",
        priority: "HIGH",
        sourceType: "PRODUCTION_JOB",
        sourceId: pj.id,
        customerId: pj.order.customerId,
        orderId: pj.orderId,
        assignedRole: "PRODUCTION",
      });
    }

    if (
      pj.dueDate &&
      pj.dueDate < now &&
      !["READY_FOR_DELIVERY", "COMPLETED", "CANCELLED"].includes(pj.status)
    ) {
      candidates.push({
        dedupeKey: `PRODUCTION_DELAYED:PRODUCTION_JOB:${pj.id}`,
        title: `Sản xuất trễ hạn ${pj.jobCode}`,
        description: "Đã vượt quá hạn giao hàng dự kiến.",
        type: "PRODUCTION_DELAYED",
        priority: "URGENT",
        sourceType: "PRODUCTION_JOB",
        sourceId: pj.id,
        customerId: pj.order.customerId,
        orderId: pj.orderId,
        assignedRole: "PRODUCTION",
      });
    }
  }

  // 8. DELIVERY_READY, 9. DELIVERY_FAILED
  const delJobs = await db.deliveryJob.findMany({
    where: { status: { in: ["READY", "SCHEDULED", "FAILED"] } },
    include: { order: { select: { customerId: true } } },
  });
  for (const dj of delJobs) {
    if (dj.status === "READY" || dj.status === "SCHEDULED") {
      candidates.push({
        dedupeKey: `DELIVERY_READY:DELIVERY_JOB:${dj.id}`,
        title: `Chờ giao hàng ${dj.deliveryCode}`,
        description:
          dj.status === "READY" ? "Sẵn sàng giao." : "Đã lên lịch giao.",
        type: "DELIVERY_READY",
        priority: "NORMAL",
        sourceType: "DELIVERY_JOB",
        sourceId: dj.id,
        customerId: dj.order.customerId,
        orderId: dj.orderId,
        assignedRole: "DELIVERY",
      });
    } else if (dj.status === "FAILED") {
      candidates.push({
        dedupeKey: `DELIVERY_FAILED:DELIVERY_JOB:${dj.id}`,
        title: `Giao hàng thất bại ${dj.deliveryCode}`,
        description: "Lần giao hàng gần nhất không thành công.",
        type: "DELIVERY_FAILED",
        priority: "HIGH",
        sourceType: "DELIVERY_JOB",
        sourceId: dj.id,
        customerId: dj.order.customerId,
        orderId: dj.orderId,
        assignedRole: "DELIVERY",
      });
    }
  }

  // 10. COD_PENDING, 11. PAYMENT_PENDING
  const payments = await db.payment.findMany({
    where: { paymentStatus: "PENDING" },
    include: { order: { select: { orderCode: true } } },
  });
  for (const pm of payments) {
    if (pm.paymentMethod === "COD") {
      candidates.push({
        dedupeKey: `COD_PENDING:PAYMENT:${pm.id}`,
        title: `Xác nhận thu COD ${pm.paymentCode}`,
        description: "Chờ xác nhận tiền COD.",
        type: "COD_PENDING",
        priority: "HIGH",
        sourceType: "PAYMENT",
        sourceId: pm.id,
        customerId: pm.customerId,
        orderId: pm.orderId,
        assignedRole: "ACCOUNTANT",
      });
    } else {
      candidates.push({
        dedupeKey: `PAYMENT_PENDING:PAYMENT:${pm.id}`,
        title: `Xác nhận phiếu thu ${pm.paymentCode}`,
        description: "Phiếu thu chờ kế toán duyệt.",
        type: "PAYMENT_PENDING",
        priority: "NORMAL",
        sourceType: "PAYMENT",
        sourceId: pm.id,
        customerId: pm.customerId,
        orderId: pm.orderId,
        assignedRole: "ACCOUNTANT",
      });
    }
  }

  // 12. ORDER_COMPLETED_UNPAID
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const unpaidOrders = await db.order.findMany({
    where: {
      status: "COMPLETED",
      debtAmount: { gt: 0 },
      paymentStatus: { not: "PAID" },
    },
    select: {
      id: true,
      orderCode: true,
      customerId: true,
      assignedSalesId: true,
      updatedAt: true,
    },
  });
  for (const uo of unpaidOrders) {
    candidates.push({
      dedupeKey: `ORDER_COMPLETED_UNPAID:ORDER:${uo.id}`,
      title: `Đơn đã giao còn nợ ${uo.orderCode}`,
      description: "Đơn hàng hoàn thành nhưng chưa thanh toán đủ.",
      type: "ORDER_COMPLETED_UNPAID",
      priority: uo.updatedAt < sevenDaysAgo ? "HIGH" : "NORMAL",
      sourceType: "ORDER",
      sourceId: uo.id,
      customerId: uo.customerId,
      orderId: uo.id,
      assignedRole: "ACCOUNTANT",
      assignedSalesId: uo.assignedSalesId,
    });
  }

  // 13. DEBT_OVERDUE
  const debtors = await db.customer.findMany({
    where: { debtBalance: { gt: 1000000 } },
    select: { id: true, name: true, assignedSalesId: true, debtBalance: true },
  });
  for (const d of debtors) {
    candidates.push({
      dedupeKey: `DEBT_OVERDUE:CUSTOMER:${d.id}`,
      title: `Khách nợ cao: ${d.name}`,
      description: `Công nợ hiện tại: ${d.debtBalance.toLocaleString("vi-VN")} đ`,
      type: "DEBT_OVERDUE",
      priority: "HIGH",
      sourceType: "CUSTOMER",
      sourceId: d.id,
      customerId: d.id,
      assignedRole: "ACCOUNTANT",
      assignedSalesId: d.assignedSalesId,
    });
  }

  // 14. CUSTOMER_FOLLOW_UP
  const followUps = await db.customerFollowUp.findMany({
    where: { status: { in: ["OPEN", "IN_PROGRESS"] } },
  });
  for (const fu of followUps) {
    if (fu.dueAt <= now) {
      candidates.push({
        dedupeKey: `CUSTOMER_FOLLOW_UP_DUE:${fu.id}`,
        title: `Đến lịch chăm sóc: ${fu.title}`,
        description: fu.note || "Lịch nhắc đã đến hạn.",
        type: "CUSTOMER_FOLLOW_UP_DUE",
        priority: fu.priority,
        sourceType: "CUSTOMER_FOLLOW_UP",
        sourceId: fu.id,
        customerId: fu.customerId,
        assignedRole: "SALES",
        assignedToId: fu.assignedToId,
      });
    }

    if (fu.dueAt < yesterday) {
      candidates.push({
        dedupeKey: `CUSTOMER_FOLLOW_UP_OVERDUE:${fu.id}`,
        title: `Quá hạn chăm sóc: ${fu.title}`,
        description: fu.note || "Lịch nhắc đã quá hạn.",
        type: "CUSTOMER_FOLLOW_UP_OVERDUE",
        priority: fu.dueAt < threeDaysAgo ? "URGENT" : "HIGH",
        sourceType: "CUSTOMER_FOLLOW_UP",
        sourceId: fu.id,
        customerId: fu.customerId,
        assignedRole: "SALES",
        assignedToId: fu.assignedToId,
      });
    }
  }

  // 15. INVENTORY_LOW_STOCK, 16. INVENTORY_OUT_OF_STOCK
  const inventoryItems = await db.inventoryItem.findMany({
    where: {
      status: "ACTIVE",
      availableStock: { lte: db.inventoryItem.fields.minStock },
    },
    select: {
      id: true,
      name: true,
      itemCode: true,
      availableStock: true,
      minStock: true,
    },
  });

  let assignedRole = "ADMIN";
  let assignedToId: string | undefined = undefined;

  const candidatesForInv = await db.user.findMany({
    where: {
      status: "ACTIVE",
      role: { in: ["MANAGER", "ADMIN", "ACCOUNTANT"] },
    },
  });
  const manager = candidatesForInv.find((u) => u.role === "MANAGER");
  const admin = candidatesForInv.find((u) => u.role === "ADMIN");
  const accountant = candidatesForInv.find((u) => u.role === "ACCOUNTANT");
  const chosen = manager || admin || accountant;
  if (chosen) {
    assignedRole = chosen.role;
    assignedToId = chosen.id;
  }

  for (const item of inventoryItems) {
    if (item.availableStock <= 0) {
      candidates.push({
        dedupeKey: `INVENTORY_OUT_OF_STOCK:${item.id}`,
        title: `Hết hàng: ${item.itemCode} - ${item.name}`,
        description: `Vật tư đã hết hàng trong kho. Vui lòng nhập thêm.`,
        type: "INVENTORY_OUT_OF_STOCK",
        priority: "HIGH",
        sourceType: "INVENTORY",
        sourceId: item.id,
        assignedRole,
        assignedToId,
      });
    } else if (item.availableStock <= item.minStock) {
      candidates.push({
        dedupeKey: `INVENTORY_LOW_STOCK:${item.id}`,
        title: `Tồn kho thấp: ${item.itemCode} - ${item.name}`,
        description: `Vật tư dưới mức tối thiểu (${item.availableStock}/${item.minStock}).`,
        type: "INVENTORY_LOW_STOCK",
        priority: "NORMAL",
        sourceType: "INVENTORY",
        sourceId: item.id,
        assignedRole,
        assignedToId,
      });
    }
  }

  // 17. PRINT_QUEUE tasks
  const printQueueItems = await db.printQueueItem.findMany({
    where: { status: { notIn: ["PRINTED", "CANCELLED"] } },
    include: { productionJob: { select: { jobCode: true } } }
  });

  for (const pq of printQueueItems) {
    if (pq.status === "WAITING_FILE") {
      candidates.push({
        dedupeKey: `PRINT_JOB_WAITING_FILE:${pq.id}`,
        title: `Chờ File In: ${pq.productionJob.jobCode}`,
        description: pq.waitingReason || "Thiếu file thiết kế hoặc file chưa được duyệt sản xuất.",
        type: "PRINT_JOB_WAITING_FILE",
        priority: "HIGH",
        sourceType: "PRINT_QUEUE",
        sourceId: pq.id,
        assignedRole: "DESIGNER",
        orderId: pq.orderId
      });
    } else if (pq.status === "WAITING_MATERIAL") {
      candidates.push({
        dedupeKey: `PRINT_JOB_WAITING_MATERIAL:${pq.id}`,
        title: `Chờ Vật Tư: ${pq.productionJob.jobCode}`,
        description: pq.waitingReason || "Thiếu vật tư trong kho để chạy in.",
        type: "PRINT_JOB_WAITING_MATERIAL",
        priority: "HIGH",
        sourceType: "PRINT_QUEUE",
        sourceId: pq.id,
        assignedRole: "MANAGER",
        orderId: pq.orderId
      });
      // Phase 22A.4 Integration
      if (pq.materialId) {
        candidates.push({
          dedupeKey: `INVENTORY_CONVERSION_NEEDED:${pq.orderId}:${pq.materialId}`,
          title: `Cần tạo phiếu cắt giấy cho ${pq.productionJob.jobCode}`,
          description: "Thiếu vật tư nhỏ, nhưng có thể cắt từ vật tư lớn.",
          type: "INVENTORY_CONVERSION_NEEDED",
          priority: "HIGH",
          sourceType: "PRINT_QUEUE",
          sourceId: pq.id,
          assignedRole: "MANAGER",
          orderId: pq.orderId
        });
        candidates.push({
          dedupeKey: `INVENTORY_MISSING_CONVERSION_RECIPE:${pq.materialId}`,
          title: `Thiếu định mức cắt giấy cho vật tư`,
          description: "Thiếu vật tư và không có định mức cắt.",
          type: "INVENTORY_MISSING_CONVERSION_RECIPE",
          priority: "NORMAL",
          sourceType: "INVENTORY",
          sourceId: pq.materialId,
          assignedRole: "MANAGER",
          orderId: pq.orderId
        });
      }
    } else if (pq.status === "PRINT_ERROR") {
      candidates.push({
        dedupeKey: `PRINT_JOB_ERROR:${pq.id}`,
        title: `Lỗi In Ấn: ${pq.productionJob.jobCode}`,
        description: pq.errorReason || "Máy in gặp sự cố, cần xử lý ngay.",
        type: "PRINT_JOB_ERROR",
        priority: "URGENT",
        sourceType: "PRINT_QUEUE",
        sourceId: pq.id,
        assignedRole: "PRODUCTION",
        assignedToId: pq.assignedToId || undefined,
        orderId: pq.orderId
      });
    }

    if (pq.deadline && pq.deadline < now) {
      candidates.push({
        dedupeKey: `PRINT_JOB_OVERDUE:${pq.id}`,
        title: `Quá hạn lệnh in: ${pq.productionJob.jobCode}`,
        description: "Lệnh in đã vượt quá deadline dự kiến.",
        type: "PRINT_JOB_OVERDUE",
        priority: "URGENT",
        sourceType: "PRINT_QUEUE",
        sourceId: pq.id,
        assignedRole: "PRODUCTION",
        assignedToId: pq.assignedToId || undefined,
        orderId: pq.orderId
      });
    }
  }

  // 18. POST_PRINT tasks
  const postPrintOps = await db.productionOperation.findMany({
    where: { status: { notIn: ["COMPLETED", "SKIPPED", "CANCELLED"] } },
    include: { productionJob: { select: { jobCode: true, orderId: true, order: { select: { customerId: true } } } } }
  });

  for (const op of postPrintOps) {
    if (op.status === "ERROR") {
      candidates.push({
        dedupeKey: `POST_PRINT_OPERATION_ERROR:${op.id}`,
        title: `Lỗi công đoạn ${op.operationName}: ${op.productionJob.jobCode}`,
        description: op.errorReason || "Công đoạn gặp sự cố, cần xử lý ngay.",
        type: "POST_PRINT_OPERATION_ERROR",
        priority: "URGENT",
        sourceType: "PRODUCTION_OPERATION",
        sourceId: op.id,
        assignedRole: "MANAGER",
        assignedToId: op.assignedToId || undefined,
        orderId: op.productionJob.orderId,
        customerId: op.productionJob.order.customerId
      });
    }

    if (op.status === "READY" && !op.assignedToId) {
      candidates.push({
        dedupeKey: `POST_PRINT_OPERATION_READY_UNASSIGNED:${op.id}`,
        title: `Chưa giao việc ${op.operationName}: ${op.productionJob.jobCode}`,
        description: "Công đoạn đã sẵn sàng nhưng chưa được phân công.",
        type: "POST_PRINT_OPERATION_READY_UNASSIGNED",
        priority: "HIGH",
        sourceType: "PRODUCTION_OPERATION",
        sourceId: op.id,
        assignedRole: "MANAGER",
        orderId: op.productionJob.orderId,
        customerId: op.productionJob.order.customerId
      });
    }

    if (op.operationCode === "OUTSOURCE" && op.outsourceExpectedReturnAt && op.outsourceExpectedReturnAt < now) {
      candidates.push({
        dedupeKey: `OUTSOURCE_OVERDUE:${op.id}`,
        title: `Quá hạn gia công ngoài: ${op.productionJob.jobCode}`,
        description: "Thời gian trả hàng gia công ngoài đã quá hạn.",
        type: "OUTSOURCE_OVERDUE",
        priority: "URGENT",
        sourceType: "PRODUCTION_OPERATION",
        sourceId: op.id,
        assignedRole: "MANAGER",
        orderId: op.productionJob.orderId,
        customerId: op.productionJob.order.customerId
      });
    }
  }

  // Now process candidates against existing tasks
  const candidateKeys = new Set(candidates.map((c) => c.dedupeKey));

  // Get all tasks that could be updated or checked
  // We check tasks that have a dedupeKey and are either OPEN/IN_PROGRESS or they are in the candidates list
  const existingTasks = await db.taskItem.findMany({
    where: { dedupeKey: { not: null } },
    select: { id: true, dedupeKey: true, status: true },
  });

  const existingMap = new Map<string, { id: string; status: string }>();
  existingTasks.forEach((t) => {
    if (t.dedupeKey)
      existingMap.set(t.dedupeKey, { id: t.id, status: t.status });
  });

  const ops = {
    creates: [] as TaskCandidate[],
    reopens: [] as { id: string; fromStatus: string }[],
    resolves: [] as { id: string; fromStatus: string }[],
  };

  for (const c of candidates) {
    const existing = existingMap.get(c.dedupeKey);
    if (!existing) {
      ops.creates.push(c);
    } else {
      // If it exists but was closed, reopen it
      if (
        existing.status === "DONE" ||
        existing.status === "DISMISSED" ||
        existing.status === "CANCELLED"
      ) {
        ops.reopens.push({ id: existing.id, fromStatus: existing.status });
      }
      // If it's OPEN/IN_PROGRESS, do nothing (it stays open)
    }
  }

  // For tasks that are currently OPEN/IN_PROGRESS but NOT in candidates -> auto resolve
  for (const [key, t] of Array.from(existingMap.entries())) {
    if (
      (t.status === "OPEN" || t.status === "IN_PROGRESS") &&
      !candidateKeys.has(key)
    ) {
      ops.resolves.push({ id: t.id, fromStatus: t.status });
    }
  }

  // Execute in transaction
  if (
    ops.creates.length > 0 ||
    ops.reopens.length > 0 ||
    ops.resolves.length > 0
  ) {
    await db.$transaction(async (tx) => {
      // 1. Creates
      for (const c of ops.creates) {
        // Generate a unique taskCode? We can let it be null or generate it.
        await tx.taskItem.create({
          data: {
            ...c,
            status: "OPEN",
            createdById: systemUserId !== "SYSTEM" ? systemUserId : null,
          },
        });
        // We won't log creation to save DB size, or we can:
        // Actually user requested TaskLog for status changes, let's skip for simple CREATED unless requested.
      }

      // 2. Reopens
      if (ops.reopens.length > 0) {
        await tx.taskItem.updateMany({
          where: { id: { in: ops.reopens.map((r) => r.id) } },
          data: { status: "OPEN", resolvedAt: null, resolvedById: null },
        });
        // Need a valid actor for taskLog, find an admin if SYSTEM
        let adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
        let validActorId =
          systemUserId !== "SYSTEM" ? systemUserId : adminUser?.id || "";
        if (validActorId) {
          for (const r of ops.reopens) {
            await tx.taskLog.create({
              data: {
                taskId: r.id,
                actorId: validActorId,
                actionType: "STATUS_CHANGED",
                fromStatus: r.fromStatus,
                toStatus: "OPEN",
                note: "Hệ thống tự động mở lại do nguồn thoả mãn điều kiện",
              },
            });
          }
        }
      }

      // 3. Resolves
      if (ops.resolves.length > 0) {
        await tx.taskItem.updateMany({
          where: { id: { in: ops.resolves.map((r) => r.id) } },
          data: { status: "DONE", resolvedAt: now },
        });
        let adminUser = await tx.user.findFirst({ where: { role: "ADMIN" } });
        let validActorId =
          systemUserId !== "SYSTEM" ? systemUserId : adminUser?.id || "";
        if (validActorId) {
          for (const r of ops.resolves) {
            await tx.taskLog.create({
              data: {
                taskId: r.id,
                actorId: validActorId,
                actionType: "STATUS_CHANGED",
                fromStatus: r.fromStatus,
                toStatus: "DONE",
                note: "Hệ thống tự đóng vì nguồn đã hoàn tất",
              },
            });
          }
        }
      }
    });
  }

  return {
    creates: ops.creates.length,
    reopens: ops.reopens.length,
    resolves: ops.resolves.length,
  };
}
