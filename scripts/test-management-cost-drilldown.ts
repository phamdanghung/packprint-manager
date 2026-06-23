import { db } from '../src/lib/db';
import { getManagementCostDrilldown, updateManagementMarginReview } from '../src/lib/management-cost-report-actions';
import { getOrderById } from '../src/lib/order-actions';
import assert from 'assert';

async function main() {
  console.log('--- STARTING PHASE 22A.15 MANAGEMENT COST DRILLDOWN TESTS ---');

  const runId = Date.now().toString().slice(-6);

  const cleanupIds = {
    customerIds: [] as string[],
    orderIds: [] as string[],
    jobIds: [] as string[],
    receiptIds: [] as string[],
    costLineIds: [] as string[],
    itemIds: [] as string[],
  };

  // 1. Setup Users
  const roles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
  const testUsers: Record<string, any> = {};

  for (const role of roles) {
    let user = await db.user.findFirst({ where: { role, status: 'ACTIVE' } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: `test_${role.toLowerCase()}_${runId}@example.com`,
          name: `Test ${role}`,
          role: role,
          passwordHash: 'mock',
          status: 'ACTIVE'
        }
      });
    }
    testUsers[role] = user;
  }

  // 2. Setup Data
  const customer = await db.customer.create({
    data: {
      name: `TEST_CUST_${runId}`,
      customerCode: `CUST_${runId}`,
      phone: `099${runId}`
    }
  });
  cleanupIds.customerIds.push(customer.id);

  const order1 = await db.order.create({
    data: {
      orderCode: `ORD_${runId}`,
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 1000000,
      managementMarginFlag: false,
    }
  });
  cleanupIds.orderIds.push(order1.id);

  const job1 = await db.productionJob.create({
    data: {
      jobCode: `JOB_${runId}`,
      orderId: order1.id,
      status: 'IN_PROGRESS'
    }
  });
  cleanupIds.jobIds.push(job1.id);

  const item = await db.inventoryItem.create({
    data: {
      itemCode: `ITEM_${runId}`,
      name: `Test Item ${runId}`,
      category: 'PAPER',
      unit: 'SHEET',
      stockBaseUnit: 'SHEET',
      minStockBase: 100,
    }
  });
  cleanupIds.itemIds.push(item.id);

  // Completed PXK
  const pxk1 = await db.inventoryOutboundReceipt.create({
    data: {
      receiptCode: `PXK_${runId}_1`,
      productionJobId: job1.id,
      outboundType: 'PRODUCTION_ISSUE',
      status: 'COMPLETED',
      items: {
        create: [{
          inventoryItemId: item.id,
          itemCode: 'DUMMY',
          itemName: 'Dummy Item',
          stockBaseUnit: 'SHEET',
          quantityBase: 100,
          stockBeforeBase: 100,
          stockAfterBase: 0,
          unitCost: 1500,
          totalCost: 150000 // SNAPSHOT
        }]
      }
    }
  });
  cleanupIds.receiptIds.push(pxk1.id);

  // Cancelled PXK (should be ignored for cost)
  const pxk2 = await db.inventoryOutboundReceipt.create({
    data: {
      receiptCode: `PXK_${runId}_2`,
      productionJobId: job1.id,
      outboundType: 'PRODUCTION_ISSUE',
      status: 'CANCELLED',
      items: {
        create: [{
          inventoryItemId: item.id,
          itemCode: 'DUMMY',
          itemName: 'Dummy Item',
          stockBaseUnit: 'SHEET',
          quantityBase: 50,
          stockBeforeBase: 50,
          stockAfterBase: 0,
          unitCost: 1500,
          totalCost: 75000
        }]
      }
    }
  });
  cleanupIds.receiptIds.push(pxk2.id);

  // Active CostLine
  const cl1 = await db.productionCostLine.create({
    data: {
      productionJobId: job1.id,
      category: 'OUTSOURCING',
      description: 'Test Active',
      quantity: 1,
      unitCost: 50000,
      totalCost: 50000,
      status: 'ACTIVE',
      createdById: testUsers['ADMIN'].id
    }
  });
  cleanupIds.costLineIds.push(cl1.id);

  // Cancelled CostLine
  const cl2 = await db.productionCostLine.create({
    data: {
      productionJobId: job1.id,
      category: 'OUTSOURCING',
      description: 'Test Cancelled',
      quantity: 1,
      unitCost: 30000,
      totalCost: 30000,
      status: 'CANCELLED',
      createdById: testUsers['ADMIN'].id
    }
  });
  cleanupIds.costLineIds.push(cl2.id);

  console.log('✓ Test Data Setup Completed');

  let passCount = 0;
  let totalCount = 0;

  function runAssert(condition: boolean, msg: string) {
    totalCount++;
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
    }
  }

  // --- TESTS ---
  console.log('\n--- RBAC TESTS ---');

  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  let resAdmin = await getManagementCostDrilldown(order1.id);
  runAssert(resAdmin.success === true, 'ADMIN can fetch drilldown detail');

  process.env.TEST_USER_ID = testUsers['MANAGER'].id;
  let resManager = await getManagementCostDrilldown(order1.id);
  runAssert(resManager.success === true, 'MANAGER can fetch drilldown detail');

  process.env.TEST_USER_ID = testUsers['ACCOUNTANT'].id;
  let resAcc = await getManagementCostDrilldown(order1.id);
  runAssert(resAcc.success === true, 'ACCOUNTANT can fetch drilldown detail');

  process.env.TEST_USER_ID = testUsers['SALES'].id;
  let resSales = await getManagementCostDrilldown(order1.id);
  runAssert(resSales.success === false && resSales.error === 'PERMISSION_DENIED', 'SALES get PERMISSION_DENIED');
  runAssert(!(resSales as any).data, 'SALES gets no sensitive data in response');

  process.env.TEST_USER_ID = testUsers['PRODUCTION'].id;
  let resProd = await getManagementCostDrilldown(order1.id);
  runAssert(resProd.success === false && resProd.error === 'PERMISSION_DENIED', 'PRODUCTION get PERMISSION_DENIED');

  console.log('\n--- CALCULATION & DATA TESTS ---');
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  let data = (resAdmin as any).data;
  
  runAssert(data.revenue === 1000000, 'Gross profit uses Order.totalAmount');
  runAssert(data.actualMaterialCost === 150000, 'Drilldown material cost only counts completed PRODUCTION_ISSUE PXK using exact snapshot totalCost');
  runAssert(data.actualAdditionalCost === 50000, 'ACTIVE ProductionCostLine included, CANCELLED excluded from cost');
  runAssert(data.actualProductionCost === 200000, 'Total actual cost is sum of valid material and additional');
  runAssert(data.grossProfit === 800000, 'Gross profit calculated correctly');
  runAssert(data.grossMarginPercent === 80, 'Gross margin percent calculated correctly');

  // Cancelled cost line should be visible as warning/audit if allowed
  let costLinesReturned = data.order.productionJob.costLines;
  runAssert(costLinesReturned.some((cl: any) => cl.status === 'CANCELLED'), 'CANCELLED ProductionCostLine visible as warning/audit in drilldown');

  console.log('\n--- ACTION TESTS ---');
  process.env.TEST_USER_ID = testUsers['SALES'].id;
  let updateSales = await updateManagementMarginReview(order1.id, true, 'Test Leak');
  runAssert(updateSales.success === false, 'Unauthorized roles cannot update management review note');

  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  let updateAdmin = await updateManagementMarginReview(order1.id, true, 'Review Note by Admin');
  runAssert(updateAdmin.success === true, 'Mark low-margin review action works and Internal note action works');

  // Verify it actually saved
  let verifyOrder = await db.order.findUnique({ where: { id: order1.id } });
  runAssert(verifyOrder?.managementMarginFlag === true, 'Update action saves flag');
  runAssert(verifyOrder?.managementMarginNote === 'Review Note by Admin', 'Update action saves note');
  runAssert(verifyOrder?.managementMarginReviewedById === testUsers['ADMIN'].id, 'Update action saves reviewedById');
  runAssert(verifyOrder?.managementMarginReviewedAt !== null, 'Update action saves reviewedAt');

  // Order Details Anti-Leak Test
  console.log('\n--- ANTI-LEAK TESTS ---');
  process.env.TEST_USER_ID = testUsers['SALES'].id;
  let orderDetailRes = await getOrderById(order1.id);
  let scrubbedOrder = (orderDetailRes as any).data;
  runAssert(scrubbedOrder.managementMarginNote === undefined, 'Order detail query does not leak managementMarginNote to SALES');
  runAssert(scrubbedOrder.managementMarginFlag === undefined, 'Order detail query does not leak managementMarginFlag to SALES');

  // Zero revenue safe test
  console.log('\n--- ZERO REVENUE TEST ---');
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  const orderZero = await db.order.create({
    data: {
      orderCode: `ORD_Z_${runId}`,
      customerId: customer.id,
      status: 'PRODUCTION',
      totalAmount: 0,
      managementMarginFlag: false,
    }
  });
  cleanupIds.orderIds.push(orderZero.id);
  let resZero = await getManagementCostDrilldown(orderZero.id);
  runAssert((resZero as any).data.grossMarginPercent === 0, 'Zero revenue safe, no NaN/Infinity');


  console.log(`\nRESULTS: ${passCount}/${totalCount} PASSED`);

  // --- CLEANUP ---
  console.log('\nCleaning up test data...');
  await db.inventoryOutboundReceiptItem.deleteMany({ where: { receiptId: { in: cleanupIds.receiptIds } } });
  await db.inventoryOutboundReceipt.deleteMany({ where: { id: { in: cleanupIds.receiptIds } } });
  await db.productionCostLine.deleteMany({ where: { id: { in: cleanupIds.costLineIds } } });
  await db.productionJob.deleteMany({ where: { id: { in: cleanupIds.jobIds } } });
  await db.order.deleteMany({ where: { id: { in: cleanupIds.orderIds } } });
  await db.inventoryItem.deleteMany({ where: { id: { in: cleanupIds.itemIds } } });
  await db.customer.deleteMany({ where: { id: { in: cleanupIds.customerIds } } });
  console.log('Cleanup completed safely.');

  if (passCount === totalCount) {
    console.log('ALL TESTS PASSED!');
    process.exit(0);
  } else {
    console.error('SOME TESTS FAILED!');
    process.exit(1);
  }
}

main().catch(console.error);
