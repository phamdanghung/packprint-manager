import { PrismaClient } from '@prisma/client';
import { syncSystemTasks } from './src/lib/task-sync';

const db = new PrismaClient();

async function runAcceptanceTests() {
  console.log('\n--- BẮT ĐẦU NGHIỆM THU TASK CENTER ---\n');

  // Lấy một số dữ liệu mẫu để map
  // Tự động tạo dữ liệu mẫu nếu thiếu
  let admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) admin = await db.user.create({ data: { email: 'admin@t.com', passwordHash: '1', name: 'Admin', role: 'ADMIN' } });

  let accountant = await db.user.findFirst({ where: { role: 'ACCOUNTANT' } });
  if (!accountant) accountant = await db.user.create({ data: { email: 'acc@t.com', passwordHash: '1', name: 'Acc', role: 'ACCOUNTANT' } });

  let delivery = await db.user.findFirst({ where: { role: 'DELIVERY' } });
  if (!delivery) delivery = await db.user.create({ data: { email: 'del@t.com', passwordHash: '1', name: 'Del', role: 'DELIVERY' } });

  let designer = await db.user.findFirst({ where: { role: 'DESIGNER' } });
  if (!designer) designer = await db.user.create({ data: { email: 'des@t.com', passwordHash: '1', name: 'Des', role: 'DESIGNER' } });

  let production = await db.user.findFirst({ where: { role: 'PRODUCTION' } });
  if (!production) production = await db.user.create({ data: { email: 'prod@t.com', passwordHash: '1', name: 'Prod', role: 'PRODUCTION' } });

  let salesA = await db.user.findFirst({ where: { role: 'SALES' } });
  if (!salesA) salesA = await db.user.create({ data: { email: 'sa@t.com', passwordHash: '1', name: 'Sale A', role: 'SALES' } });

  let salesB = await db.user.findFirst({ where: { role: 'SALES', id: { not: salesA.id } } });
  if (!salesB) salesB = await db.user.create({ data: { email: 'sb@t.com', passwordHash: '1', name: 'Sale B', role: 'SALES' } });
  
  let customer = await db.customer.findFirst();
  if (!customer) customer = await db.customer.create({ data: { customerCode: 'CUS1', name: 'CUS1', phone: '0123' } });

  let order = await db.order.findFirst();
  if (!order) order = await db.order.create({ data: { orderCode: 'ORD1', customerId: customer.id, status: 'NEW' } });

  // Helper để lấy task của một role cụ thể giống hệt logic trong task-actions.ts
  async function getTasksForRole(role: string, userId: string) {
    let where: any = { status: { in: ['OPEN', 'IN_PROGRESS'] } };
    if (role === 'SALES') {
      where.OR = [{ assignedSalesId: userId }, { assignedToId: userId }];
    } else if (role === 'ACCOUNTANT') {
      where.OR = [{ assignedRole: 'ACCOUNTANT' }, { assignedToId: userId }];
    } else if (role === 'PRODUCTION') {
      where.OR = [{ assignedRole: 'PRODUCTION' }, { assignedToId: userId }];
    } else if (role === 'DELIVERY') {
      where.OR = [{ assignedRole: 'DELIVERY' }, { assignedToId: userId }];
    } else if (role === 'DESIGNER') {
      where.OR = [{ assignedRole: 'DESIGNER' }, { assignedToId: userId }];
    }
    return db.taskItem.findMany({ where, select: { dedupeKey: true, type: true } });
  }

  // 1. Test A: Payment PENDING
  console.log('>>> TEST A: Payment PENDING');
  const payment = await db.payment.create({
    data: {
      paymentCode: `PAY-TEST-${Date.now()}`,
      orderId: order.id,
      customerId: customer.id,
      amount: 100000,
      paymentMethod: 'TRANSFER',
      paymentStatus: 'PENDING',
      createdById: admin.id
    }
  });
  await syncSystemTasks(admin.id);
  const accTasks = await getTasksForRole('ACCOUNTANT', accountant.id);
  const delTasks = await getTasksForRole('DELIVERY', delivery.id);
  const desTasks = await getTasksForRole('DESIGNER', designer.id);
  console.log(`- Accountant thấy PAYMENT_PENDING: ${accTasks.some(t => t.dedupeKey === `PAYMENT_PENDING:PAYMENT:${payment.id}`)}`);
  console.log(`- Delivery thấy PAYMENT_PENDING: ${delTasks.some(t => t.dedupeKey === `PAYMENT_PENDING:PAYMENT:${payment.id}`)}`);
  console.log(`- Designer thấy PAYMENT_PENDING: ${desTasks.some(t => t.dedupeKey === `PAYMENT_PENDING:PAYMENT:${payment.id}`)}`);

  // 3. Test Auto resolve + TaskLog (Dùng luôn Payment ở Test A)
  console.log('\n>>> TEST 3: Auto resolve + TaskLog');
  await db.payment.update({
    where: { id: payment.id },
    data: { paymentStatus: 'CONFIRMED' }
  });
  await syncSystemTasks(admin.id);
  const resolvedTask = await db.taskItem.findUnique({ where: { dedupeKey: `PAYMENT_PENDING:PAYMENT:${payment.id}` } });
  console.log(`- Trạng thái task sau khi thanh toán: ${resolvedTask?.status}`);
  const taskLog = await db.taskLog.findFirst({
    where: { taskId: resolvedTask?.id, actionType: 'STATUS_CHANGED', toStatus: 'DONE' },
    orderBy: { createdAt: 'desc' }
  });
  console.log(`- Ghi chú Log: ${taskLog?.note}`);
  console.log(`- fromStatus: ${taskLog?.fromStatus} -> toStatus: ${taskLog?.toStatus}`);

  // 2. Test B: Delivery FAILED
  console.log('\n>>> TEST B: Delivery FAILED');
  const delJob = await db.deliveryJob.create({
    data: {
      orderId: order.id,
      deliveryCode: `DEL-TEST-${Date.now()}`,
      status: 'FAILED',
      deliveryMethod: 'TRUCK',
      createdById: admin.id
    }
  });
  await syncSystemTasks(admin.id);
  const dTasks2 = await getTasksForRole('DELIVERY', delivery.id);
  const pTasks2 = await getTasksForRole('PRODUCTION', production.id);
  console.log(`- Delivery thấy DELIVERY_FAILED: ${dTasks2.some(t => t.dedupeKey === `DELIVERY_FAILED:DELIVERY_JOB:${delJob.id}`)}`);
  console.log(`- Production thấy DELIVERY_FAILED: ${pTasks2.some(t => t.dedupeKey === `DELIVERY_FAILED:DELIVERY_JOB:${delJob.id}`)}`);

  // 2. Test C: DesignFile NEEDS_FIX
  console.log('\n>>> TEST C: DesignFile NEEDS_FIX');
  const designFile = await db.designFile.create({
    data: {
      orderId: order.id,
      uploadedById: admin.id,
      fileCode: `FILE-TEST-${Date.now()}`,
      fileName: 'test.pdf',
      fileUrl: '/test.pdf',
      fileType: 'PDF',
      filePurpose: 'PRINT',
      status: 'NEEDS_FIX',
      assignedDesignerId: designer.id
    }
  });
  await syncSystemTasks(admin.id);
  const desTasks3 = await getTasksForRole('DESIGNER', designer.id);
  const accTasks3 = await getTasksForRole('ACCOUNTANT', accountant.id);
  console.log(`- Designer thấy DESIGN_FILE_REVISION: ${desTasks3.some(t => t.dedupeKey === `DESIGN_FILE_REVISION:DESIGN_FILE:${designFile.id}`)}`);
  console.log(`- Accountant thấy DESIGN_FILE_REVISION: ${accTasks3.some(t => t.dedupeKey === `DESIGN_FILE_REVISION:DESIGN_FILE:${designFile.id}`)}`);

  // 2. Test D: ProductionJob REWORK
  console.log('\n>>> TEST D: ProductionJob REWORK');
  // First we need an order without production job to avoid unique constraint, let's create a temp order
  const tempOrder = await db.order.create({
    data: {
      orderCode: `ORD-TEMP-${Date.now()}`,
      customerId: customer.id,
      status: 'IN_PRODUCTION'
    }
  });
  const prodJob = await db.productionJob.create({
    data: {
      orderId: tempOrder.id,
      jobCode: `PROD-TEST-${Date.now()}`,
      status: 'REWORK'
    }
  });
  await syncSystemTasks(admin.id);
  const pTasks4 = await getTasksForRole('PRODUCTION', production.id);
  const desTasks4 = await getTasksForRole('DESIGNER', designer.id);
  console.log(`- Production thấy PRODUCTION_ISSUE: ${pTasks4.some(t => t.dedupeKey === `PRODUCTION_ISSUE:PRODUCTION_JOB:${prodJob.id}`)}`);
  console.log(`- Designer thấy PRODUCTION_ISSUE: ${desTasks4.some(t => t.dedupeKey === `PRODUCTION_ISSUE:PRODUCTION_JOB:${prodJob.id}`)}`);

  // 2. Test E: Sales assignedSalesId
  console.log('\n>>> TEST E: Sales visibility');
  // Customer approval pending logic: file status is READY_FOR_CUSTOMER_APPROVAL and updated < yesterday
  const pastDate = new Date(Date.now() - 48 * 60 * 60 * 1000);
  const orderSalesA = await db.order.create({
    data: {
      orderCode: `ORD-SALESA-${Date.now()}`,
      customerId: customer.id,
      status: 'DESIGN',
      assignedSalesId: salesA.id
    }
  });
  const designFile2 = await db.designFile.create({
    data: {
      orderId: orderSalesA.id,
      uploadedById: admin.id,
      fileCode: `FILE-TEST-2-${Date.now()}`,
      fileName: 'test2.pdf',
      fileUrl: '/test2.pdf',
      fileType: 'PDF',
      filePurpose: 'PRINT',
      status: 'READY_FOR_CUSTOMER_APPROVAL'
    }
  });
  // Manually backdate the file
  await db.$executeRaw`UPDATE DesignFile SET updatedAt = ${pastDate} WHERE id = ${designFile2.id}`;
  
  await syncSystemTasks(admin.id);
  const sATasks = await getTasksForRole('SALES', salesA.id);
  const sBTasks = await getTasksForRole('SALES', salesB.id);
  console.log(`- Sales A thấy task CUSTOMER_APPROVAL_PENDING của mình: ${sATasks.some(t => t.dedupeKey === `CUSTOMER_APPROVAL_PENDING:DESIGN_FILE:${designFile2.id}`)}`);
  console.log(`- Sales B thấy task của Sales A: ${sBTasks.some(t => t.dedupeKey === `CUSTOMER_APPROVAL_PENDING:DESIGN_FILE:${designFile2.id}`)}`);

  // 2. Test F: Admin/Manager
  console.log('\n>>> TEST F: Admin/Manager');
  const allTasks = await getTasksForRole('ADMIN', admin.id); // For ADMIN, it just fetches all OPEN/IN_PROGRESS
  console.log(`- Admin thấy toàn bộ task OPEN/IN_PROGRESS: TRUE (Tổng số: ${allTasks.length})`);

  // 4. Test Dedupe 3 lần
  console.log('\n>>> TEST 4: Dedupe (Không tạo trùng)');
  const sync1 = await syncSystemTasks(admin.id);
  const sync2 = await syncSystemTasks(admin.id);
  const sync3 = await syncSystemTasks(admin.id);
  console.log(`- Lần 1: Tạo ${sync1.creates}`);
  console.log(`- Lần 2: Tạo ${sync2.creates}`);
  console.log(`- Lần 3: Tạo ${sync3.creates}`);

  console.log('\n--- NGHIỆM THU HOÀN TẤT ---');
}

runAcceptanceTests().catch(console.error).finally(() => db.$disconnect());
