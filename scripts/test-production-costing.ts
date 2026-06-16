import { db } from '../src/lib/db';
import { getProductionJobCosting, getOrderProfitability } from '../src/lib/production-costing-actions';

async function runTests() {
  console.log('--- STARTING PRODUCTION COSTING & PROFITABILITY TESTS ---');
  
  const runId = Date.now().toString().slice(-6);

  // 1. Create a mock customer
  const customer = await db.customer.create({
    data: {
      customerCode: `CUST-${runId}`,
      name: `Customer ${runId}`,
      phone: `0900${runId}`
    }
  });

  // 2. Create users with different roles for testing
  const adminUser = await db.user.create({
    data: {
      email: `admin-${runId}@test.com`,
      passwordHash: 'dummy',
      name: 'Admin Test',
      role: 'ADMIN'
    }
  });

  const accountantUser = await db.user.create({
    data: {
      email: `accountant-${runId}@test.com`,
      passwordHash: 'dummy',
      name: 'Accountant Test',
      role: 'ACCOUNTANT'
    }
  });

  const salesUser = await db.user.create({
    data: {
      email: `sales-${runId}@test.com`,
      passwordHash: 'dummy',
      name: 'Sales Test',
      role: 'SALES'
    }
  });

  const productionUser = await db.user.create({
    data: {
      email: `prod-${runId}@test.com`,
      passwordHash: 'dummy',
      name: 'Production Test',
      role: 'PRODUCTION'
    }
  });

  const designerUser = await db.user.create({
    data: {
      email: `design-${runId}@test.com`,
      passwordHash: 'dummy',
      name: 'Designer Test',
      role: 'DESIGNER'
    }
  });

  const deliveryUser = await db.user.create({
    data: {
      email: `delivery-${runId}@test.com`,
      passwordHash: 'dummy',
      name: 'Delivery Test',
      role: 'DELIVERY'
    }
  });

  // 3. Create a mock order with totalAmount
  const order = await db.order.create({
    data: {
      orderCode: `ORD-${runId}`,
      customerId: customer.id,
      status: 'PRODUCTION',
      subtotal: 5000000,
      totalAmount: 5400000, // Revenue to use
      paidAmount: 2000000
    }
  });

  // 4. Create a production job
  const job = await db.productionJob.create({
    data: {
      orderId: order.id,
      jobCode: `JOB-${runId}`,
      status: 'PRINTING'
    }
  });

  // 5. Create dummy inventory items
  const item1 = await db.inventoryItem.create({
    data: {
      itemCode: `MAT-${runId}-1`,
      name: 'Material 1',
      category: 'PAPER',
      unit: 'SHEET',
      stockBaseUnit: 'SHEET'
    }
  });

  const item2 = await db.inventoryItem.create({
    data: {
      itemCode: `MAT-${runId}-2`,
      name: 'Material 2',
      category: 'PAPER',
      unit: 'SHEET',
      stockBaseUnit: 'SHEET'
    }
  });

  // 6. Create some InventoryOutboundReceipts
  
  // Completed PXK 1 (PRODUCTION_ISSUE)
  const pxk1 = await db.inventoryOutboundReceipt.create({
    data: {
      receiptCode: `PXK-${runId}-1`,
      productionJobId: job.id,
      outboundType: 'PRODUCTION_ISSUE',
      status: 'COMPLETED',
      items: {
        create: [
          {
            inventoryItemId: item1.id,
            itemCode: item1.itemCode,
            itemName: item1.name,
            stockBaseUnit: 'SHEET',
            quantityBase: 100,
            unitCost: 1000,
            totalCost: 100000,
            stockBeforeBase: 1000,
            stockAfterBase: 900
          },
          {
            inventoryItemId: item2.id,
            itemCode: item2.itemCode,
            itemName: item2.name,
            stockBaseUnit: 'SHEET',
            quantityBase: 50,
            unitCost: 2000,
            totalCost: 100000,
            stockBeforeBase: 1000,
            stockAfterBase: 950
          }
        ]
      }
    }
  });

  // Completed PXK 2 (PRODUCTION_ISSUE)
  const pxk2 = await db.inventoryOutboundReceipt.create({
    data: {
      receiptCode: `PXK-${runId}-2`,
      productionJobId: job.id,
      outboundType: 'PRODUCTION_ISSUE',
      status: 'COMPLETED',
      items: {
        create: [
          {
            inventoryItemId: item1.id,
            itemCode: item1.itemCode,
            itemName: item1.name,
            stockBaseUnit: 'SHEET',
            quantityBase: 200,
            unitCost: 1000,
            totalCost: 200000,
            stockBeforeBase: 900,
            stockAfterBase: 700
          }
        ]
      }
    }
  });

  // Cancelled PXK (should be ignored)
  await db.inventoryOutboundReceipt.create({
    data: {
      receiptCode: `PXK-${runId}-CANCEL`,
      productionJobId: job.id,
      outboundType: 'PRODUCTION_ISSUE',
      status: 'CANCELLED',
      items: {
        create: [
          {
            inventoryItemId: item1.id,
            itemCode: item1.itemCode,
            itemName: item1.name,
            stockBaseUnit: 'SHEET',
            quantityBase: 50,
            unitCost: 1000,
            totalCost: 50000,
            stockBeforeBase: 700,
            stockAfterBase: 650
          }
        ]
      }
    }
  });

  // Other type PXK (should be ignored)
  await db.inventoryOutboundReceipt.create({
    data: {
      receiptCode: `PXK-${runId}-DAMAGED`,
      productionJobId: job.id,
      outboundType: 'DAMAGED',
      status: 'COMPLETED',
      items: {
        create: [
          {
            inventoryItemId: item1.id,
            itemCode: item1.itemCode,
            itemName: item1.name,
            stockBaseUnit: 'SHEET',
            quantityBase: 10,
            unitCost: 1000,
            totalCost: 10000,
            stockBeforeBase: 650,
            stockAfterBase: 640
          }
        ]
      }
    }
  });

  let passCount = 0;
  let totalTests = 0;

  function assert(condition: boolean, msg: string) {
    totalTests++;
    if (condition) {
      console.log(`✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`❌ FAIL: ${msg}`);
    }
  }

  // TEST 1: ADMIN Costing
  process.env.TEST_USER_ID = adminUser.id;
  const jobCostAdmin = await getProductionJobCosting(job.id);
  assert(jobCostAdmin.success === true, 'getProductionJobCosting successful for ADMIN');
  const d = jobCostAdmin.data as any;
  assert(d.canViewCost === true, 'ADMIN canViewCost = true');
  
  // pxk1 = 100k + 100k = 200k
  // pxk2 = 200k
  // total actual = 400k
  assert(d.actualMaterialCost === 400000, `Actual Material Cost should be 400,000, got ${d.actualMaterialCost}`);
  assert(d.issueSummary.completedOutboundReceipts === 2, 'Should count 2 completed receipts');
  assert(d.issueSummary.cancelledOutboundReceipts === 1, 'Should count 1 cancelled receipt');
  assert(d.materialCostLines.length === 3, 'Should have 3 item cost rows');

  // TEST 2: ORDER PROFITABILITY (ADMIN)
  const orderProfitAdmin = await getOrderProfitability(order.id);
  assert(orderProfitAdmin.success === true, 'getOrderProfitability successful for ADMIN');
  const od = orderProfitAdmin.data as any;
  assert(od.canViewCost === true, 'ADMIN canViewCost = true');
  assert(od.order.revenue === 5400000, 'Revenue should equal totalAmount (5,400,000)');
  assert(od.costs.actualMaterialCost === 400000, 'Order total actual material cost should be 400,000');
  assert(od.profit.grossProfit === 5000000, 'Gross profit should be 5,000,000');
  assert(Math.abs(od.profit.grossMarginPercent - (5000000/5400000)*100) < 0.01, 'Gross margin percent is calculated correctly');

  // TEST 3: ACCOUNTANT Costing
  process.env.TEST_USER_ID = accountantUser.id;
  const jobCostAcc = await getProductionJobCosting(job.id);
  assert(jobCostAcc.data?.canViewCost === true, 'ACCOUNTANT canViewCost = true');

  // TEST 4: UNAUTHORIZED ROLES (SALES, PRODUCTION, DESIGNER, DELIVERY)
  const restrictedUsers = [
    { role: 'SALES', user: salesUser },
    { role: 'PRODUCTION', user: productionUser },
    { role: 'DESIGNER', user: designerUser },
    { role: 'DELIVERY', user: deliveryUser },
  ];

  for (const { role, user } of restrictedUsers) {
    process.env.TEST_USER_ID = user.id;

    const jobCost = await getProductionJobCosting(job.id);
    assert(jobCost.data?.canViewCost === false, `${role} canViewCost = false`);
    assert(jobCost.data?.actualMaterialCost === undefined, `${role} cannot see actualMaterialCost`);
    assert(jobCost.data?.actualAdditionalCost === undefined, `${role} cannot see actualAdditionalCost`);
    assert(jobCost.data?.actualProductionCost === undefined, `${role} cannot see actualProductionCost`);
    assert(jobCost.data?.materialCostLines === undefined || jobCost.data?.materialCostLines[0]?.totalCost === undefined, `${role} itemCost rows have undefined totalCost`);
    assert(jobCost.data?.materialCostLines === undefined || jobCost.data?.materialCostLines[0]?.unitCost === undefined, `${role} itemCost rows have undefined unitCost`);

    const orderProfit = await getOrderProfitability(order.id);
    assert(orderProfit.data?.canViewCost === false, `${role} order profit canViewCost = false`);
    assert(orderProfit.data?.profit === undefined, `${role} cannot see profit`);
    assert(orderProfit.data?.costs === undefined, `${role} cannot see costs on order`);
    assert(orderProfit.data?.productionJobs[0]?.actualMaterialCost === undefined, `${role} productionJobs list has undefined cost`);
  }

  // TEST 5: ORDER NO REVENUE
  const emptyOrder = await db.order.create({
    data: {
      orderCode: `ORD-EMPTY-${runId}`,
      customerId: customer.id,
      status: 'PRODUCTION',
      subtotal: 0,
      totalAmount: 0, 
      paidAmount: 0
    }
  });
  
  process.env.TEST_USER_ID = adminUser.id;
  const emptyOrderProfit = await getOrderProfitability(emptyOrder.id);
  const eod = emptyOrderProfit.data as any;
  assert(eod.order.revenue === 0, 'Empty order has 0 revenue');
  assert(eod.profit.grossMarginPercent === undefined, 'Gross margin percent is undefined when revenue <= 0');

  console.log(`--- TEST RESULTS: ${passCount} / ${totalTests} PASSED ---`);
  
  if (passCount !== totalTests) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
