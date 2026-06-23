import { PrismaClient } from '@prisma/client';
import { exportManagementCostReport } from '../src/lib/management-cost-report-actions';
import * as auth from '../src/lib/auth';

const db = new PrismaClient();

async function runExportTests() {
  console.log('--- STARTING PHASE 22A.16 EXPORT TESTS ---');

  // --- 1. SETUP MOCK DATA ---
  const MOCK_ADMIN_ID = 'test-admin-export-id';
  const MOCK_SALES_ID = 'test-sales-export-id';
  const TEST_CUSTOMER_ID = 'test-customer-export-id';
  const TEST_ORDER_ID = 'test-order-export-id';
  const TEST_JOB_ID = 'test-job-export-id';
  const TEST_PXK_ID = 'test-pxk-export-id';
  const TEST_CANCELLED_PXK_ID = 'test-pxk-cancelled-export-id';
  const testMaterialId = 'test-mat-export';

  // 0. INITIAL CLEANUP OF OLD CRASH DATA
  await db.inventoryOutboundReceiptItem.deleteMany({ where: { receiptId: { in: [TEST_PXK_ID, TEST_CANCELLED_PXK_ID] } } });
  await db.inventoryOutboundReceipt.deleteMany({ where: { id: { in: [TEST_PXK_ID, TEST_CANCELLED_PXK_ID] } } });
  await db.inventoryItem.deleteMany({ where: { id: testMaterialId } });
  await db.productionCostLine.deleteMany({ where: { productionJobId: TEST_JOB_ID } });
  await db.productionJob.deleteMany({ where: { id: TEST_JOB_ID } });
  await db.order.deleteMany({ where: { id: TEST_ORDER_ID } });
  await db.customer.deleteMany({ where: { id: TEST_CUSTOMER_ID } });
  await db.user.deleteMany({ where: { email: { endsWith: '-ex@test.com' } } });

  await db.user.createMany({
    data: [
      { id: MOCK_ADMIN_ID, name: 'Admin', email: 'admin-ex@test.com', role: 'ADMIN', passwordHash: 'hash' },
      { id: 'test-manager-export-id', name: 'Manager', email: 'manager-ex@test.com', role: 'MANAGER', passwordHash: 'hash' },
      { id: 'test-accountant-export-id', name: 'Accountant', email: 'accountant-ex@test.com', role: 'ACCOUNTANT', passwordHash: 'hash' },
      { id: MOCK_SALES_ID, name: 'Sales', email: 'sales-ex@test.com', role: 'SALES', passwordHash: 'hash' },
      { id: 'test-production-export-id', name: 'Production', email: 'prod-ex@test.com', role: 'PRODUCTION', passwordHash: 'hash' },
      { id: 'test-designer-export-id', name: 'Designer', email: 'designer-ex@test.com', role: 'DESIGNER', passwordHash: 'hash' },
      { id: 'test-delivery-export-id', name: 'Delivery', email: 'delivery-ex@test.com', role: 'DELIVERY', passwordHash: 'hash' }
    ]
  });

  await db.customer.create({
    data: { id: TEST_CUSTOMER_ID, customerCode: 'CUST-EX', name: 'Customer Export', phone: '0999888777123', customerType: 'STANDARD' }
  });

  await db.order.create({
    data: {
      id: TEST_ORDER_ID,
      orderCode: 'ORD-EX',
      customerId: TEST_CUSTOMER_ID,
      status: 'COMPLETED',
      totalAmount: 10000000,
      paidAmount: 2000000,
      createdById: MOCK_ADMIN_ID,
      managementMarginFlag: true,
      managementMarginNote: 'Needs review Export',
      managementMarginReviewedAt: new Date(),
      managementMarginReviewedById: MOCK_ADMIN_ID,
      createdAt: new Date(), // TODAY
      productionJob: {
        create: {
          id: TEST_JOB_ID,
          jobCode: 'JOB-EX',
          status: 'COMPLETED',
          costLines: {
            create: [
              { description: 'Active Cost', category: 'LABOR', quantity: 1, unitCost: 500000, totalCost: 500000, status: 'ACTIVE', createdById: MOCK_ADMIN_ID },
              { description: 'Cancelled Cost', category: 'OUTSOURCING', quantity: 1, unitCost: 999999, totalCost: 999999, status: 'CANCELLED', createdById: MOCK_ADMIN_ID }
            ]
          }
        }
      }
    }
  });

  await db.inventoryItem.deleteMany({ where: { id: testMaterialId } });
  await db.inventoryItem.create({
    data: {
      id: testMaterialId, itemCode: 'MAT-EX', name: 'Material EX', category: 'PAPER',
      stockBaseUnit: 'SHEET', unit: 'SHEET', unitScale: 1, minStockBase: 0,
      currentStockBase: 1000, status: 'ACTIVE',
      createdById: MOCK_ADMIN_ID
    }
  });

  // Valid PXK
  await db.inventoryOutboundReceipt.create({
    data: {
      id: TEST_PXK_ID,
      receiptCode: 'PXK-EX',
      outboundType: 'PRODUCTION_ISSUE',
      status: 'COMPLETED',
      productionJobId: TEST_JOB_ID,
      issuedAt: new Date(),
      createdById: MOCK_ADMIN_ID,
      items: {
        create: [
          { inventoryItemId: testMaterialId, itemCode: 'MAT-EX', itemName: 'Material EX', stockBaseUnit: 'SHEET', stockBeforeBase: 1000, stockAfterBase: 900, quantityBase: 100, unitCost: 2000, totalCost: 200000 }
        ]
      }
    }
  });

  // Cancelled PXK (should be ignored)
  await db.inventoryOutboundReceipt.create({
    data: {
      id: TEST_CANCELLED_PXK_ID,
      receiptCode: 'PXK-EX-CAN',
      outboundType: 'PRODUCTION_ISSUE',
      status: 'CANCELLED',
      productionJobId: TEST_JOB_ID,
      issuedAt: new Date(),
      createdById: MOCK_ADMIN_ID,
      items: {
        create: [
          { inventoryItemId: testMaterialId, itemCode: 'MAT-EX', itemName: 'Material EX', stockBaseUnit: 'SHEET', stockBeforeBase: 900, stockAfterBase: 850, quantityBase: 50, unitCost: 2000, totalCost: 100000 }
        ]
      }
    }
  });

  let passCount = 0;
  const assert = (condition: boolean, msg: string) => {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passCount++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      process.exit(1);
    }
  };

  // --- 2. ANTI-LEAK / RBAC TESTS ---
  console.log('\n--- RBAC & ANTI-LEAK TESTS ---');
  
  const testUsers = {
    ADMIN: MOCK_ADMIN_ID,
    MANAGER: 'test-manager-export-id',
    ACCOUNTANT: 'test-accountant-export-id',
    SALES: MOCK_SALES_ID,
    PRODUCTION: 'test-production-export-id',
    DESIGNER: 'test-designer-export-id',
    DELIVERY: 'test-delivery-export-id'
  };

  for (const role of ['ADMIN', 'MANAGER', 'ACCOUNTANT'] as const) {
    process.env.TEST_USER_ID = testUsers[role];
    const allowedExport = await exportManagementCostReport({ periodType: 'MONTH', includeDrilldown: true });
    assert(allowedExport.success === true, `${role} can successfully export report`);
  }

  for (const role of ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'] as const) {
    process.env.TEST_USER_ID = testUsers[role];
    const blockedExport = await exportManagementCostReport({ periodType: 'MONTH', includeDrilldown: true });
    
    assert(blockedExport.success === false, `${role} gets error response`);
    if (!blockedExport.success) {
      assert(blockedExport.error === 'PERMISSION_DENIED', `${role} error is PERMISSION_DENIED`);
    }
    
    assert(!('summary' in blockedExport), `${role} cannot see summary`);
    assert(!('orders' in blockedExport), `${role} cannot see orders`);
    assert(!('drilldowns' in blockedExport), `${role} cannot see drilldowns`);
    
    const leakCheck = JSON.stringify(blockedExport);
    assert(!leakCheck.includes('managementMarginNote'), `${role} completely blocked from margin note`);
    assert(!leakCheck.includes('actualMaterialCost'), `${role} completely blocked from materialCost`);
    assert(!leakCheck.includes('actualAdditionalCost'), `${role} completely blocked from additionalCost`);
    assert(!leakCheck.includes('grossProfit'), `${role} completely blocked from grossProfit`);
    assert(!leakCheck.includes('grossMarginPercent'), `${role} completely blocked from grossMarginPercent`);
  }

  // --- 3. EXPORT CALCULATION TESTS ---
  console.log('\n--- EXPORT CALCULATION TESTS ---');

  // Mock ADMIN
  process.env.TEST_USER_ID = MOCK_ADMIN_ID;
  const adminExport = await exportManagementCostReport({ periodType: 'MONTH', includeDrilldown: true });

  assert(adminExport.success === true, 'ADMIN export successful');
  if (adminExport.success) {
    const summary = adminExport.summary;
    const orders = adminExport.orders;
    const drilldowns = adminExport.drilldowns;

    const testOrder = orders.find(o => o.orderId === TEST_ORDER_ID);
    assert(!!testOrder, 'Test order found in export');
    
    if (testOrder) {
      assert(testOrder.totalAmount === 10000000, 'Revenue uses totalAmount exactly (10,000,000)');
      assert(testOrder.actualMaterialCost === 200000, 'Material cost from completed PXK only (200,000)');
      assert(testOrder.actualAdditionalCost === 500000, 'Additional cost from active CostLines only (500,000)');
      assert(testOrder.actualProductionCost === 700000, 'Total actual cost is sum of Material and Additional');
      assert(testOrder.grossProfit === 9300000, 'Gross profit calculates correctly (10M - 700k)');
      assert(testOrder.managementMarginFlag === true, 'Flag is exported');
      assert(testOrder.managementMarginNote === 'Needs review Export', 'Note is exported');
      assert(testOrder.reviewedBy === 'Admin', 'Reviewer name is joined');
    }

    assert(!!drilldowns, 'Drilldown details are included');
    if (drilldowns) {
      const orderDrilldowns = drilldowns.filter(d => d.orderId === TEST_ORDER_ID);
      assert(orderDrilldowns.length === 3, 'Should have 3 drilldown rows (1 material, 2 cost lines)');
      
      const matRow = orderDrilldowns.find(d => d.type === 'MATERIAL_ISSUE');
      assert(!!matRow && matRow.totalCost === 200000, 'Material row present with correct cost');
      
      const actRow = orderDrilldowns.find(d => d.type === 'ADDITIONAL_COST');
      assert(!!actRow && actRow.totalCost === 500000, 'Active additional cost present');
      
      const canRow = orderDrilldowns.find(d => d.type === 'CANCELLED_ADDITIONAL_COST_AUDIT');
      assert(!!canRow && canRow.totalCost === 999999, 'Cancelled additional cost audited in details');
    }

    // Check summary aggregation
    assert(summary.totalRevenue >= 10000000, 'Executive summary revenue aggregated');
  }

  // Check without drilldown
  const noDrilldownExport = await exportManagementCostReport({ periodType: 'MONTH', includeDrilldown: false });
  assert(noDrilldownExport.success === true, 'ADMIN export no-drilldown successful');
  if (noDrilldownExport.success) {
    assert(!('drilldowns' in noDrilldownExport), 'includeDrilldown=false absolutely prevents drilldowns array');
  }

  // 4. CLEANUP
  console.log('\n--- CLEANING UP ---');
  await db.inventoryOutboundReceiptItem.deleteMany({ where: { receiptId: { in: [TEST_PXK_ID, TEST_CANCELLED_PXK_ID] } } });
  await db.inventoryOutboundReceipt.deleteMany({ where: { id: { in: [TEST_PXK_ID, TEST_CANCELLED_PXK_ID] } } });
  await db.inventoryItem.deleteMany({ where: { id: testMaterialId } });
  await db.productionCostLine.deleteMany({ where: { productionJobId: TEST_JOB_ID } });
  await db.productionJob.deleteMany({ where: { id: TEST_JOB_ID } });
  await db.order.deleteMany({ where: { id: TEST_ORDER_ID } });
  await db.customer.deleteMany({ where: { id: TEST_CUSTOMER_ID } });
  await db.user.deleteMany({ where: { email: { endsWith: '-ex@test.com' } } });
  console.log('Cleanup finished safely.');

  console.log(`\n🎉 ALL TESTS PASSED (${passCount}/${passCount})`);
}

runExportTests().catch(console.error).finally(() => db.$disconnect());
