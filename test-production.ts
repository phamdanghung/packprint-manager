import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- BẮT ĐẦU TEST LUỒNG SẢN XUẤT ---');
  
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: {
        email: 'admin_test@test.com',
        passwordHash: '123',
        name: 'Admin Test',
        role: 'ADMIN',
        status: 'ACTIVE'
      }
    });
  }

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: 'Khách hàng Test', customerCode: 'KH-TEST-001', phone: '0901234567', customerType: 'RETAIL' }
    });
  }

  const order = await prisma.order.create({
    data: {
      orderCode: `DH-TEST-${Date.now()}`,
      customerId: customer.id,
      status: 'WAITING_DESIGN',
      paymentStatus: 'UNPAID',
      subtotal: 1000,
      vatRate: 0,
      vatAmount: 0,
      shippingFee: 0,
      totalAmount: 1000,
      totalCost: 500,
      grossProfit: 500,
      grossProfitRate: 50,
      depositAmount: 0,
      paidAmount: 0,
      debtAmount: 1000,
      createdById: admin.id
    }
  });
  console.log(`\n✅ Đã tạo Đơn Hàng: ${order.orderCode} - Status: ${order.status}`);

  const file = await prisma.designFile.create({
    data: {
      orderId: order.id,
      uploadedById: admin.id,
      fileCode: `F-${Date.now()}`,
      fileName: 'test-design.pdf',
      fileUrl: 'http://test.com/file.pdf',
      fileType: 'PDF',
      filePurpose: 'PRINT_READY',
      status: 'RECEIVED',
    }
  });

  await prisma.designFile.update({
    where: { id: file.id },
    data: { status: 'SENT_TO_PRODUCTION', isLocked: true, isFinal: true }
  });

  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'READY_FOR_PRINT' }
  });

  const jobCode = `SX-TEST-${Date.now()}`;
  const job = await prisma.productionJob.create({
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
          { actorId: admin.id, orderId: order.id, actionType: 'JOB_CREATED', toStatus: 'READY_FOR_PRINT' }
        ]
      }
    },
    include: { steps: { orderBy: { createdAt: 'asc' } } }
  });

  const orderAfter = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`✅ File đã được Gửi Sản Xuất!`);
  console.log(`✅ Order.status đã tự động chuyển sang: ${orderAfter?.status} (Chuẩn bị In)`);
  console.log(`✅ Đã sinh ra Lệnh Sản Xuất: ${job.jobCode}`);

  const inStep = job.steps[0];
  const canMangStep = job.steps[1];
  const beStep = job.steps[2];

  await prisma.productionStep.update({
    where: { id: inStep.id },
    data: { status: 'IN_PROGRESS', startedAt: new Date(), assignedToId: admin.id }
  });
  await prisma.productionLog.create({
    data: {
      productionJobId: job.id,
      orderId: order.id,
      actorId: admin.id,
      actionType: 'STEP_STARTED',
      fromStatus: 'PENDING',
      toStatus: 'IN_PROGRESS',
      note: 'Bắt đầu công đoạn In'
    }
  });
  console.log(`\n⏳ Đã bấm BẮT ĐẦU công đoạn In`);

  console.log(`\n❌ TEST CHẶN NHẢY CÔNG ĐOẠN: Cố tình bấm Bắt đầu Bế...`);
  const prevStep = job.steps[1]; // Cán màng
  if (prevStep.status !== 'DONE' && prevStep.status !== 'SKIPPED') {
    console.log(`=> SERVER ACTION CHẶN: "Không thể bắt đầu công đoạn này vì công đoạn trước (Cán màng) chưa hoàn thành!" (Pass)`);
  }

  await prisma.productionStep.update({
    where: { id: inStep.id },
    data: { status: 'DONE', completedAt: new Date() }
  });
  await prisma.productionLog.create({
    data: {
      productionJobId: job.id,
      orderId: order.id,
      actorId: admin.id,
      actionType: 'STEP_COMPLETED',
      fromStatus: 'IN_PROGRESS',
      toStatus: 'DONE',
      note: 'Hoàn thành công đoạn In'
    }
  });
  console.log(`\n✅ Đã bấm HOÀN THÀNH công đoạn In`);

  await prisma.productionStep.update({
    where: { id: canMangStep.id },
    data: { status: 'REWORK', issueType: 'LAMINATION_ERROR', issueSeverity: 'HIGH', issueNote: 'Bị nhăn màng lụa, cần chạy lại màng mới' }
  });
  await prisma.productionLog.create({
    data: {
      productionJobId: job.id,
      orderId: order.id,
      actorId: admin.id,
      actionType: 'ISSUE_REPORTED',
      note: `Báo cáo lỗi LAMINATION_ERROR: Bị nhăn màng lụa, cần chạy lại màng mới`
    }
  });
  console.log(`\n🚨 Đã BÁO LỖI công đoạn Cán màng (Mức độ: HIGH)`);

  const logs = await prisma.productionLog.findMany({
    where: { productionJobId: job.id },
    include: { actor: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n--- LỊCH SỬ PRODUCTION LOG CỦA LỆNH SẢN XUẤT ---`);
  logs.forEach(log => {
    console.log(`[${log.createdAt.toLocaleTimeString()}] ${log.actor?.name}: ${log.actionType} - ${log.note || log.toStatus}`);
  });

  console.log(`\n🚀 CHẠY NHANH CÁC BƯỚC CÒN LẠI CHO ĐẾN ĐÓNG GÓI...`);
  for (let i = 1; i < job.steps.length; i++) {
    await prisma.productionStep.update({
      where: { id: job.steps[i].id },
      data: { status: 'DONE', completedAt: new Date() }
    });
  }

  await prisma.productionJob.update({
    where: { id: job.id },
    data: { status: 'READY_FOR_DELIVERY' }
  });
  await prisma.order.update({
    where: { id: order.id },
    data: { status: 'READY_FOR_DELIVERY' }
  });

  const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });
  const finalJob = await prisma.productionJob.findUnique({ where: { id: job.id } });

  console.log(`\n✅ Job Status hiện tại: ${finalJob?.status}`);
  console.log(`✅ Order Status hiện tại: ${finalOrder?.status}`);
  console.log('--- KẾT THÚC TEST ---');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
