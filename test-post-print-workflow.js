// test-post-print-workflow.js

// Mock Next.js imports before importing anything else
const Module = require('module');
const originalRequire = Module.prototype.require;
Module.prototype.require = function(path) {
  if (path === 'next/cache') {
    return { revalidatePath: () => {} };
  }
  return originalRequire.apply(this, arguments);
};

// Set env variable to bypass Auth logic inside auth.ts
process.env.TEST_USER_ROLE = 'ADMIN';

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Use ts-node register so we can require typescript files directly
require('ts-node').register({
  compilerOptions: { module: 'commonjs' }
});

const { createPostPrintRoute, updateOperationStatus, updateOperationQuantity, assignOperationUserOrMachine } = require('./src/lib/post-print-actions');
const { syncSystemTasks } = require('./src/lib/task-sync');

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`✅ PASS: ${message}`);
    passed++;
  } else {
    console.error(`❌ FAIL: ${message}`);
    failed++;
  }
}

async function setupTestData() {
  let customer = await prisma.customer.findFirst({ where: { customerCode: 'CUST-TEST-POST-PRINT' } });
  if (!customer) {
     customer = await prisma.customer.create({
       data: { customerCode: 'CUST-TEST-POST-PRINT', name: 'Test Customer', phone: '1234' }
     });
  }
  return { customer };
}

async function createTestJob(customer, dtLower, hasOutsource, hasLamination) {
  const order = await prisma.order.create({
    data: {
      orderCode: `ORD-TEST-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      customerId: customer.id,
      status: 'PRODUCTION',
      items: {
        create: [{
          name: 'Sản phẩm Test',
          widthCm: 10, heightCm: 10, quantity: 1000,
          dieCutType: dtLower,
          productionNote: hasOutsource ? 'outsource' : '',
          laminationId: hasLamination ? 'some-id' : null
        }]
      }
    },
    include: { items: true }
  });

  const pJob = await prisma.productionJob.create({
    data: {
      jobCode: `JOB-TEST-${Date.now()}-${Math.random().toString().slice(2, 6)}`,
      orderId: order.id,
      status: 'READY_FOR_PRINT'
    }
  });

  const pq = await prisma.printQueueItem.create({
    data: {
      productionJobId: pJob.id,
      orderId: order.id,
      orderItemId: order.items[0].id,
      totalSheets: 1000,
      printedSheets: 1000,
      status: 'WAITING_FILE'
    }
  });

  return { order, pJob, pq };
}

async function runTests() {
  console.log("=== BẮT ĐẦU TEST POST-PRINT WORKFLOW ===");
  const { customer } = await setupTestData();

  try {
    // === Case 1: Route generation ===
    console.log("\n--- TEST CASE 1: Route Generation ---");
    
    // 1a. Chỉ bế (DIE_CUTTING -> QC -> PACKING)
    const t1a = await createTestJob(customer, 'bethang', false, false);
    await createPostPrintRoute(t1a.pq.id);
    let ops1a = await prisma.productionOperation.findMany({ where: { printQueueItemId: t1a.pq.id }, orderBy: { sequence: 'asc' } });
    assert(ops1a.map(o => o.operationCode).join('->') === 'DIE_CUTTING->QC->PACKING', 'Sinh đúng tuyến: Chỉ bế (DIE_CUTTING -> QC -> PACKING)');

    // 1b. Cán + bế
    const t1b = await createTestJob(customer, 'bethang', false, true);
    await createPostPrintRoute(t1b.pq.id);
    let ops1b = await prisma.productionOperation.findMany({ where: { printQueueItemId: t1b.pq.id }, orderBy: { sequence: 'asc' } });
    assert(ops1b.map(o => o.operationCode).join('->') === 'LAMINATION->DIE_CUTTING->QC->PACKING', 'Sinh đúng tuyến: Cán + bế (LAMINATION -> DIE_CUTTING -> QC -> PACKING)');

    // 1c. Chỉ cắt
    const t1c = await createTestJob(customer, 'catxang', false, false);
    await createPostPrintRoute(t1c.pq.id);
    let ops1c = await prisma.productionOperation.findMany({ where: { printQueueItemId: t1c.pq.id }, orderBy: { sequence: 'asc' } });
    assert(ops1c.map(o => o.operationCode).join('->') === 'CUTTING->QC->PACKING', 'Sinh đúng tuyến: Chỉ cắt (CUTTING -> QC -> PACKING)');

    // 1d. Không gia công
    const t1d = await createTestJob(customer, 'none', false, false);
    await createPostPrintRoute(t1d.pq.id);
    let ops1d = await prisma.productionOperation.findMany({ where: { printQueueItemId: t1d.pq.id }, orderBy: { sequence: 'asc' } });
    assert(ops1d.map(o => o.operationCode).join('->') === 'QC->PACKING', 'Sinh đúng tuyến: Không gia công (QC -> PACKING)');

    // 1e. Outsource
    const t1e = await createTestJob(customer, 'none', true, false);
    await createPostPrintRoute(t1e.pq.id);
    let ops1e = await prisma.productionOperation.findMany({ where: { printQueueItemId: t1e.pq.id }, orderBy: { sequence: 'asc' } });
    assert(ops1e.map(o => o.operationCode).join('->') === 'OUTSOURCE->QC->PACKING', 'Sinh đúng tuyến: Outsource (OUTSOURCE -> QC -> PACKING)');


    // === Case 2 & 3: Dependency (ERROR/COMPLETED) ===
    console.log("\n--- TEST CASE 2 & 3: Dependency ---");
    let lamOp = ops1b[0]; // LAMINATION
    let dieOp = ops1b[1]; // DIE_CUTTING
    
    // ERROR Lamination
    await updateOperationStatus(lamOp.id, 'ERROR', { reason: 'Rách màng' });
    let lamOpErr = await prisma.productionOperation.findUnique({ where: { id: lamOp.id } });
    let dieOpErr = await prisma.productionOperation.findUnique({ where: { id: dieOp.id } });
    assert(lamOpErr.status === 'ERROR' && lamOpErr.errorReason === 'Rách màng', 'Lamination lưu đúng trạng thái ERROR và errorReason');
    assert(dieOpErr.status === 'WAITING_PREVIOUS', 'Lamination ERROR thì Die-Cutting vẫn WAITING_PREVIOUS');
    
    // Check Task Generation for ERROR
    await syncSystemTasks('SYSTEM');
    const errTask = await prisma.taskItem.findFirst({ where: { dedupeKey: `POST_PRINT_OPERATION_ERROR:${lamOp.id}` } });
    assert(errTask !== null, 'Task POST_PRINT_OPERATION_ERROR được sinh ra khi báo lỗi công đoạn');

    // PAUSED -> IN_PROGRESS -> COMPLETED
    await updateOperationStatus(lamOp.id, 'IN_PROGRESS'); // resume from ERROR
    await updateOperationStatus(lamOp.id, 'COMPLETED', { goodSheets: 980, wasteSheets: 20 });
    let lamOpDone = await prisma.productionOperation.findUnique({ where: { id: lamOp.id } });
    let dieOpReady = await prisma.productionOperation.findUnique({ where: { id: dieOp.id } });
    assert(lamOpDone.status === 'COMPLETED', 'Lamination COMPLETED');
    assert(dieOpReady.status === 'READY', 'Lamination COMPLETED thì Die-Cutting tự READY');
    
    // Test 7: Quantity transmission
    assert(lamOpDone.goodSheets === 980 && lamOpDone.wasteSheets === 20 && lamOpDone.completedSheets === 1000, 'Lamination lưu đúng số lượng');
    assert(dieOpReady.inputSheets === 980, 'Công đoạn sau nhận inputSheets = goodSheets của công đoạn trước');

    // Resolve task auto
    await syncSystemTasks('SYSTEM');
    const resolvedErrTask = await prisma.taskItem.findUnique({ where: { id: errTask.id } });
    assert(resolvedErrTask.status === 'DONE', 'Task ERROR tự động Resolve khi công đoạn hết ERROR');


    // === Case 4: SKIPPED dependency ===
    console.log("\n--- TEST CASE 4: Skipped Dependency ---");
    // skip die cutting
    await updateOperationStatus(dieOp.id, 'SKIPPED', { reason: 'Khách đổi ý không bế' });
    let dieOpSkip = await prisma.productionOperation.findUnique({ where: { id: dieOp.id } });
    let qcOpReady = await prisma.productionOperation.findUnique({ where: { id: ops1b[2].id } });
    assert(dieOpSkip.status === 'SKIPPED', 'Công đoạn đã được SKIPPED');
    assert(qcOpReady.status === 'READY', 'SKIPPED có reason thì công đoạn sau tự READY');


    // === Case 5 & 6: Quantity Validation ===
    console.log("\n--- TEST CASE 5 & 6: Quantity Validation ---");
    await updateOperationStatus(qcOpReady.id, 'IN_PROGRESS');
    let qcOp = await prisma.productionOperation.findUnique({ where: { id: qcOpReady.id } });
    
    let overInputFailed = false;
    try {
      // completedSheets > inputSheets (good: 1000 + waste: 0 > 980)
      await updateOperationStatus(qcOp.id, 'COMPLETED', { goodSheets: 1000, wasteSheets: 0, completedSheets: 1000 });
    } catch(e) {
      if (e.message.includes('lớn hơn đầu vào')) overInputFailed = true;
    }
    assert(overInputFailed, 'completedSheets > inputSheets bị server chặn');

    let mismatchFailed = false;
    try {
      // good + waste !== completed
      await updateOperationStatus(qcOp.id, 'COMPLETED', { goodSheets: 900, wasteSheets: 50, completedSheets: 900 });
    } catch(e) {
      if (e.message.includes('không khớp')) mismatchFailed = true;
    }
    assert(mismatchFailed, 'goodSheets + wasteSheets !== completedSheets bị server chặn');


    // === Case 8 & 9: READY_FOR_DELIVERY & DeliveryJob dedupe ===
    console.log("\n--- TEST CASE 8 & 9: READY_FOR_DELIVERY & Dedupe ---");
    await updateOperationStatus(qcOp.id, 'COMPLETED', { goodSheets: 980, wasteSheets: 0, completedSheets: 980 });
    let packOpReady = await prisma.productionOperation.findUnique({ where: { id: ops1b[3].id } });
    await updateOperationStatus(packOpReady.id, 'IN_PROGRESS');
    await updateOperationStatus(packOpReady.id, 'COMPLETED', { goodSheets: 980, wasteSheets: 0, completedSheets: 980 });
    
    // Now all ops for t1b are done
    let pJob1b = await prisma.productionJob.findUnique({ where: { id: t1b.pJob.id } });
    assert(pJob1b.status === 'READY_FOR_DELIVERY', 'Tất cả COMPLETED/SKIPPED thì ProductionJob READY_FOR_DELIVERY');

    let dels = await prisma.deliveryJob.findMany({ where: { orderId: t1b.order.id } });
    assert(dels.length === 1, 'DeliveryJob tạo đúng 1 lần');

    // Simulate clicking complete again on packing to test dedupe
    await updateOperationStatus(packOpReady.id, 'COMPLETED', { goodSheets: 980, wasteSheets: 0, completedSheets: 980 });
    dels = await prisma.deliveryJob.findMany({ where: { orderId: t1b.order.id } });
    assert(dels.length === 1, 'Dedupe: Hoàn thành lần 2 không sinh thêm DeliveryJob');


    // === Case 10: Task Center & Outsource Overdue ===
    console.log("\n--- TEST CASE 10: Task Center & Outsource Overdue ---");
    let outOp = ops1e[0]; // OUTSOURCE
    // force outsourceExpectedReturnAt to be in the past
    await prisma.productionOperation.update({
      where: { id: outOp.id },
      data: { outsourceExpectedReturnAt: new Date(Date.now() - 24 * 3600 * 1000) }
    });
    
    await syncSystemTasks('SYSTEM');
    const overdueTask = await prisma.taskItem.findFirst({ where: { dedupeKey: `OUTSOURCE_OVERDUE:${outOp.id}` } });
    assert(overdueTask !== null, 'Task OUTSOURCE_OVERDUE được tạo đúng');
    
    const readyUnassignedTask = await prisma.taskItem.findFirst({ where: { dedupeKey: `POST_PRINT_OPERATION_READY_UNASSIGNED:${outOp.id}` } });
    assert(readyUnassignedTask !== null, 'Task POST_PRINT_OPERATION_READY_UNASSIGNED được tạo đúng khi status READY và chưa ai gán');


    // === Case 12: ProductionOperationLog ===
    console.log("\n--- TEST CASE 12: Logs ---");
    const logs = await prisma.productionOperationLog.findMany({
      where: { productionOperationId: lamOp.id },
      orderBy: { createdAt: 'asc' }
    });
    const actions = logs.map(l => l.action);
    assert(actions.includes('CREATE_ROUTE'), 'Log có CREATE_ROUTE');
    assert(actions.includes('STATUS_CHANGE_IN_PROGRESS'), 'Log có báo IN_PROGRESS (START_OPERATION)');
    assert(actions.includes('STATUS_CHANGE_COMPLETED'), 'Log có báo COMPLETED');
    
    const dieLogs = await prisma.productionOperationLog.findMany({
      where: { productionOperationId: dieOp.id }
    });
    assert(dieLogs.map(l => l.action).includes('AUTO_READY_NEXT_OPERATION'), 'Log có AUTO_READY_NEXT_OPERATION');

    const packLogs = await prisma.productionOperationLog.findMany({
      where: { productionOperationId: packOpReady.id }
    });
    assert(packLogs.map(l => l.action).includes('AUTO_READY_FOR_DELIVERY'), 'Log có AUTO_READY_FOR_DELIVERY');

  } catch (err) {
    console.error('Lỗi khi chạy test:', err);
    failed++;
  }

  console.log("\n=== TỔNG KẾT BÁO CÁO ===");
  console.log(`Total: ${passed + failed}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
}).finally(() => {
  prisma.$disconnect();
});
