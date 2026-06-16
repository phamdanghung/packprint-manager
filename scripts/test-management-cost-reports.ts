import { db } from '../src/lib/db';
import { getManagementCostReport, ManagementCostReportResponse, ManagementCostReportForbiddenResponse } from '../src/lib/management-cost-report-actions';
import assert from 'assert';

async function main() {
  console.log('--- STARTING PHASE 22A.14 MANAGEMENT COST REPORT TESTS ---');

  const runId = Date.now().toString().slice(-6);

  // Safely collect IDs generated for this test run for cleanup
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

  const now = new Date();
  
  const order1 = await db.order.create({
    data: {
      orderCode: `ORD_NORM_${runId}`,
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 1000000,
      paidAmount: 100000, // Should be ignored
      createdAt: now // Use exact `now` so it falls into current WEEK, MONTH, QUARTER, YEAR
    }
  });
  cleanupIds.orderIds.push(order1.id);

  const job1 = await db.productionJob.create({
    data: {
      jobCode: `JOB_NORM_${runId}`,
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
  // Note: we might not need to clean up inventory item for this simple test, or we can just let it be. 
  // Let's clean it up to be safe. We'll add it to the cleanup.
  cleanupIds.itemIds.push(item.id);
  
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
          unitCost: 1000,
          totalCost: 100000,
          stockBeforeBase: 1000,
          stockAfterBase: 900
        }]
      }
    }
  });
  cleanupIds.receiptIds.push(pxk1.id);

  const cl1 = await db.productionCostLine.create({
    data: {
      productionJobId: job1.id,
      category: 'LABOR',
      description: 'Test',
      quantity: 1,
      unitCost: 50000,
      totalCost: 50000,
      status: 'ACTIVE',
      createdById: testUsers['ADMIN'].id
    }
  });
  cleanupIds.costLineIds.push(cl1.id);

  // Order with Zero Revenue & Missing data & high cost (high cost only triggers if totalAmount > 0)
  const order2 = await db.order.create({
    data: {
      orderCode: `ORD_ZERO_${runId}`,
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 0,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 16)
    }
  });
  cleanupIds.orderIds.push(order2.id);

  const job2 = await db.productionJob.create({
    data: {
      jobCode: `JOB_ZERO_${runId}`,
      orderId: order2.id,
      status: 'IN_PROGRESS'
    }
  });
  cleanupIds.jobIds.push(job2.id);

  // Order Cancelled Cost Line
  const order3 = await db.order.create({
    data: {
      orderCode: `ORD_CANCEL_${runId}`,
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 100000,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 17)
    }
  });
  cleanupIds.orderIds.push(order3.id);

  const job3 = await db.productionJob.create({
    data: {
      jobCode: `JOB_CANCEL_${runId}`,
      orderId: order3.id,
      status: 'IN_PROGRESS'
    }
  });
  cleanupIds.jobIds.push(job3.id);

  const cl2 = await db.productionCostLine.create({
    data: {
      productionJobId: job3.id,
      category: 'LABOR',
      description: 'Test',
      quantity: 1,
      unitCost: 50000,
      totalCost: 50000,
      status: 'CANCELLED',
      cancelReason: 'Test',
      createdById: testUsers['ADMIN'].id,
      cancelledById: testUsers['ADMIN'].id
    }
  });
  cleanupIds.costLineIds.push(cl2.id);

  // High Cost Order (margin < 20 and high cost > 80%)
  const order4 = await db.order.create({
    data: {
      orderCode: `ORD_HIGH_${runId}`,
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 100000,
      createdAt: new Date(now.getFullYear(), now.getMonth(), 18)
    }
  });
  cleanupIds.orderIds.push(order4.id);

  const job4 = await db.productionJob.create({
    data: {
      jobCode: `JOB_HIGH_${runId}`,
      orderId: order4.id,
      status: 'IN_PROGRESS'
    }
  });
  cleanupIds.jobIds.push(job4.id);

  const cl3 = await db.productionCostLine.create({
    data: {
      productionJobId: job4.id,
      category: 'OUTSOURCING',
      description: 'Test',
      quantity: 1,
      unitCost: 90000,
      totalCost: 90000,
      status: 'ACTIVE',
      createdById: testUsers['ADMIN'].id
    }
  });
  cleanupIds.costLineIds.push(cl3.id);

  console.log('✓ Test Data Setup Completed');

  // --- TESTS ---

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

  // 3. RBAC TESTS
  console.log('\n--- RBAC TESTS ---');
  
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  let resAdmin = await getManagementCostReport({});
  runAssert(resAdmin.success === true, 'ADMIN can fetch cost report');

  process.env.TEST_USER_ID = testUsers['MANAGER'].id;
  let resManager = await getManagementCostReport({});
  runAssert(resManager.success === true, 'MANAGER can fetch cost report');

  process.env.TEST_USER_ID = testUsers['ACCOUNTANT'].id;
  let resAcc = await getManagementCostReport({});
  runAssert(resAcc.success === true, 'ACCOUNTANT can fetch cost report');

  for (const role of ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY']) {
    process.env.TEST_USER_ID = testUsers[role].id;
    let resBlocked = await getManagementCostReport({});
    runAssert(resBlocked.success === false && resBlocked.error === 'PERMISSION_DENIED', `${role} gets PERMISSION_DENIED`);
  }

  // 4. PERIOD TESTS
  console.log('\n--- PERIOD TESTS ---');
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  
  // Custom past order
  const pastOrder = await db.order.create({
    data: {
      orderCode: `ORD_PAST_${runId}`,
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'COMPLETED',
      totalAmount: 500000,
      createdAt: new Date(2020, 0, 1) // 1/1/2020
    }
  });
  cleanupIds.orderIds.push(pastOrder.id);

  const customRes = await getManagementCostReport({ periodType: 'CUSTOM', fromDate: '2020-01-01', toDate: '2020-12-31' }) as ManagementCostReportResponse;
  runAssert(customRes.success && customRes.rows.some(r => r.orderId === pastOrder.id), 'CUSTOM period correctly fetches past order');
  runAssert(customRes.success && !customRes.rows.some(r => r.orderId === order1.id), 'CUSTOM period correctly excludes current order');

  const defaultRes = await getManagementCostReport({}) as ManagementCostReportResponse;
  runAssert(defaultRes.success && defaultRes.rows.some(r => r.orderId === order1.id), 'Default current month behavior works when no filter is provided');

  const weekRes = await getManagementCostReport({ periodType: 'WEEK' }) as ManagementCostReportResponse;
  runAssert(weekRes.success && weekRes.rows.some(r => r.orderId === order1.id), 'WEEK period correctly fetches matching order');
  runAssert(weekRes.success && !weekRes.rows.some(r => r.orderId === pastOrder.id), 'WEEK period correctly excludes order outside week');

  const monthRes = await getManagementCostReport({ periodType: 'MONTH' }) as ManagementCostReportResponse;
  runAssert(monthRes.success && monthRes.rows.some(r => r.orderId === order1.id), 'MONTH period correctly fetches current month order');
  
  const quarterRes = await getManagementCostReport({ periodType: 'QUARTER' }) as ManagementCostReportResponse;
  runAssert(quarterRes.success && quarterRes.rows.some(r => r.orderId === order1.id), 'QUARTER period correctly fetches matching order');
  runAssert(quarterRes.success && !quarterRes.rows.some(r => r.orderId === pastOrder.id), 'QUARTER period correctly excludes order outside quarter');

  const yearRes = await getManagementCostReport({ periodType: 'YEAR' }) as ManagementCostReportResponse;
  runAssert(yearRes.success && yearRes.rows.some(r => r.orderId === order1.id), 'YEAR period correctly fetches current year order');

  // 5. COST & WARNING RULES
  console.log('\n--- COST & WARNING RULES ---');
  const d = resAdmin as ManagementCostReportResponse;

  const r1 = d.rows.find(r => r.orderId === order1.id);
  runAssert(!!r1, 'Normal order found in current month report');
  runAssert(r1!.totalAmount === 1000000, 'Revenue uses totalAmount exactly');
  runAssert(r1!.actualMaterialCost === 100000, 'Material Cost from completed PXK only');
  runAssert(r1!.actualAdditionalCost === 50000, 'Additional Cost from active CostLines only');
  runAssert(r1!.grossProfit === 1000000 - 150000, 'Gross profit calculates correctly');

  const r2 = d.rows.find(r => r.orderId === order2.id);
  runAssert(r2!.totalAmount === 0, 'Zero order revenue is 0');
  runAssert(r2!.grossMarginPercent === 0, 'Zero order grossMarginPercent is safely 0 (Not NaN)');
  runAssert(r2!.warnings.missingCostData === true, 'Zero order missing Cost Data warning triggered');

  const r3 = d.rows.find(r => r.orderId === order3.id);
  runAssert(r3!.actualAdditionalCost === 0, 'Cancelled cost line NOT added to actualAdditionalCost');
  runAssert(r3!.warnings.hasCancelledCostLines === true, 'Cancelled cost line flag is TRUE');

  const r4 = d.rows.find(r => r.orderId === order4.id);
  runAssert(r4!.warnings.lowMargin === true, 'Low Margin flag is TRUE (<20%)');
  runAssert(r4!.warnings.highProductionCost === true, 'High Production Cost flag is TRUE (>80%)');

  // 6. SAFE CLEANUP
  console.log('\n--- SAFE CLEANUP ---');
  await db.productionCostLine.deleteMany({ where: { id: { in: cleanupIds.costLineIds } } });
  
  // We need to delete receipt items before deleting receipts due to FK constraint
  for (const rid of cleanupIds.receiptIds) {
    await db.inventoryOutboundReceiptItem.deleteMany({ where: { receiptId: rid }});
  }
  await db.inventoryOutboundReceipt.deleteMany({ where: { id: { in: cleanupIds.receiptIds } } });
  
  await db.productionJob.deleteMany({ where: { id: { in: cleanupIds.jobIds } } });
  await db.order.deleteMany({ where: { id: { in: cleanupIds.orderIds } } });
  await db.customer.deleteMany({ where: { id: { in: cleanupIds.customerIds } } });
  await db.inventoryItem.deleteMany({ where: { id: { in: cleanupIds.itemIds } } });

  console.log(`\nCleanup successfully removed explicit generated IDs.`);

  if (passCount === totalCount) {
    console.log(`\n🎉 ALL TESTS PASSED (${passCount}/${totalCount})`);
    process.exit(0);
  } else {
    console.error(`\n❌ FAILED (${totalCount - passCount} fail out of ${totalCount})`);
    process.exit(1);
  }
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
