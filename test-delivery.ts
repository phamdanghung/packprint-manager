import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runTest() {
  console.log('--- BẮT ĐẦU TEST LUỒNG GIAO HÀNG ---');
  
  let admin = await prisma.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    admin = await prisma.user.create({
      data: { email: 'admin_test_2@test.com', passwordHash: '123', name: 'Admin Test 2', role: 'ADMIN', status: 'ACTIVE' }
    });
  }

  let deliveryUser = await prisma.user.findFirst({ where: { role: 'DELIVERY' } });
  if (!deliveryUser) {
    deliveryUser = await prisma.user.create({
      data: { email: 'shipper_1@test.com', passwordHash: '123', name: 'Shipper 1', role: 'DELIVERY', status: 'ACTIVE' }
    });
  }
  
  // Set Auth Mock to Delivery User to test strict RBAC
  process.env.TEST_USER_ID = deliveryUser.id;

  let customer = await prisma.customer.findFirst();
  if (!customer) {
    customer = await prisma.customer.create({
      data: { name: 'Khách hàng Test Giao hàng', customerCode: 'KH-TEST-GH', phone: '0901234568', customerType: 'RETAIL' }
    });
  }

  // 1. Tạo Order mới
  const order = await prisma.order.create({
    data: {
      orderCode: `DH-GH-${Date.now()}`,
      customerId: customer.id,
      status: 'QC',
      paymentStatus: 'UNPAID',
      subtotal: 5000,
      vatRate: 0, vatAmount: 0,
      shippingFee: 50,
      totalAmount: 5050,
      totalCost: 2000,
      grossProfit: 3000,
      grossProfitRate: 60,
      depositAmount: 0,
      paidAmount: 2050, // Khách đã trả 2050, còn nợ 3000
      debtAmount: 3000,
      createdById: admin.id
    }
  });

  // 2. Tạo Job Sản Xuất để kích hoạt chuyển sang READY_FOR_DELIVERY
  const job = await prisma.productionJob.create({
    data: {
      orderId: order.id,
      jobCode: `SX-GH-${Date.now()}`,
      status: 'PACKING',
    }
  });

  console.log(`\n✅ 1. Order đã ở bước QC, Job đang đóng gói.`);

  // Import functions
  const { createDeliveryJobFromOrder, scheduleDelivery, updateDeliveryStatus, markDelivered } = await import('./src/lib/delivery-actions');

  console.log(`\n✅ 2. GỌI HOOK: createDeliveryJobFromOrder`);
  const createRes = await createDeliveryJobFromOrder(order.id);
  const deliveryJob = createRes.data;
  if (!deliveryJob) throw new Error("Job creation failed!");
  
  let orderState = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`   -> Đã tự đẻ ra Lệnh giao: ${deliveryJob.deliveryCode}`);
  console.log(`   -> Order.status đồng bộ thành: ${orderState?.status}`);

  console.log(`\n🚨 3. Thử nhảy sai trạng thái: Từ READY_FOR_DELIVERY -> DELIVERING`);
  const errRes = await updateDeliveryStatus(deliveryJob.id, 'DELIVERING');
  if (!errRes.success) {
    console.log(`   => BỊ CHẶN BỞI HỆ THỐNG! Lỗi: ${errRes.error}`);
  }

  console.log(`\n⏳ 4. HẸN LỊCH GIAO (SCHEDULED)`);
  
  // Đổi role thành Admin để gán quyền (Delivery không tự hẹn nếu logic ko cho, nhưng ở đây có cho DELIVERY hẹn lịch trong delivery-actions)
  process.env.TEST_USER_ID = admin.id;
  await scheduleDelivery(deliveryJob.id, new Date(), 'COMPANY_SHIPPER');
  
  process.env.TEST_USER_ID = deliveryUser.id; // Chuyển lại cho Shipper thực hiện việc giao
  
  let midJob = await prisma.deliveryJob.findUnique({ where: { id: deliveryJob.id } });
  console.log(`   -> Trạng thái Delivery: ${midJob?.status}`);

  console.log(`\n🚚 5. Đánh dấu ĐANG GIAO (DELIVERING)`);
  await updateDeliveryStatus(deliveryJob.id, 'DELIVERING');
  
  midJob = await prisma.deliveryJob.findUnique({ where: { id: deliveryJob.id } });
  orderState = await prisma.order.findUnique({ where: { id: order.id } });
  console.log(`   -> Trạng thái Delivery: ${midJob?.status}`);
  console.log(`   -> Order Status đồng bộ: ${orderState?.status}`);

  console.log(`\n✅ 6. Đánh dấu GIAO HÀNG THÀNH CÔNG (DELIVERED)`);
  await markDelivered(deliveryJob.id, {
    receiverName: 'A Trưởng Lễ Tân',
    deliveredAt: new Date(),
    proofNote: 'Thu hộ đủ 3 triệu',
  });

  const finalJob = await prisma.deliveryJob.findUnique({ where: { id: deliveryJob.id } });
  const finalOrder = await prisma.order.findUnique({ where: { id: order.id } });

  console.log(`   -> Job Status: ${finalJob?.status}`);
  console.log(`   -> Order Status: ${finalOrder?.status} (Đơn hàng đã tự hoàn tất)`);
  console.log(`   -> Payment Status: ${finalOrder?.paymentStatus} (Chưa thu đủ nên vẫn PARTIAL)`);
  console.log(`   -> Người nhận thực tế: ${finalJob?.receiverName}`);
  
  const logs = await prisma.deliveryLog.findMany({
    where: { deliveryJobId: deliveryJob.id },
    include: { actor: true },
    orderBy: { createdAt: 'asc' }
  });

  console.log(`\n--- LỊCH SỬ DELIVERY LOG ---`);
  logs.forEach(log => {
    console.log(`[${log.createdAt.toLocaleTimeString()}] ${log.actor?.name || 'Hệ thống'}: ${log.actionType} - ${log.note || ''} (From: ${log.fromStatus || 'none'}, To: ${log.toStatus || 'none'})`);
  });

  console.log('\n--- KẾT THÚC TEST ---');
}

runTest().catch(console.error).finally(() => prisma.$disconnect());
