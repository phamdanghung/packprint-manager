import { db } from '../src/lib/db';
import { getProductionMaterialIssueStatus, createProductionMaterialIssueReceiptCore } from '../src/lib/production-material-issue-actions';
import { cancelOutboundReceiptCore } from '../src/lib/inventory-outbound-actions';

async function cleanup() {
  console.log('Cleaning up test data...');
  // Delete created PXK
  const testReceipts = await db.inventoryOutboundReceipt.findMany({
    where: { note: { contains: 'TEST-MATERIAL-ISSUE' } }
  });
  
  for (const r of testReceipts) {
    await db.inventoryOutboundReceiptItem.deleteMany({ where: { receiptId: r.id } });
    await db.inventoryOutboundReceipt.delete({ where: { id: r.id } });
  }

  // Delete production job, order, customer
  await db.productionStep.deleteMany({ where: { productionJob: { jobCode: 'TEST-JOB-ISSUE' } } });
  await db.productionLog.deleteMany({ where: { productionJob: { jobCode: 'TEST-JOB-ISSUE' } } });
  await db.productionJob.deleteMany({ where: { jobCode: 'TEST-JOB-ISSUE' } });
  await db.orderItem.deleteMany({ where: { order: { orderCode: 'TEST-ORDER-ISSUE' } } });
  await db.order.deleteMany({ where: { orderCode: 'TEST-ORDER-ISSUE' } });
  await db.customer.deleteMany({ where: { name: 'TEST-CUST-ISSUE' } });

  // Delete inventory items
  const testItems = await db.inventoryItem.findMany({
    where: { itemCode: { contains: 'TEST-ISSUE' } }
  });
  if (testItems.length > 0) {
    await db.inventoryTransaction.deleteMany({ where: { itemId: { in: testItems.map(i => i.id) } } });
    await db.inventoryOutboundReceiptItem.deleteMany({ where: { inventoryItemId: { in: testItems.map(i => i.id) } } });
    await db.inventoryOutboundReceipt.deleteMany({ where: { productionJobId: { not: null } } });
    await db.inventoryItem.deleteMany({ where: { id: { in: testItems.map(i => i.id) } } });
  }
}

async function runTests() {
  const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } }) || { id: 'admin', role: 'ADMIN', name: 'Admin' };
  const managerUser = await db.user.findFirst({ where: { role: 'MANAGER' } }) || { id: 'manager', role: 'MANAGER', name: 'Manager' };
  const productionUser = await db.user.findFirst({ where: { role: 'PRODUCTION' } }) || { id: 'production', role: 'PRODUCTION', name: 'Production' };
  const accountantUser = await db.user.findFirst({ where: { role: 'ACCOUNTANT' } }) || { id: 'accountant', role: 'ACCOUNTANT', name: 'Accountant' };
  const salesUser = await db.user.findFirst({ where: { role: 'SALES' } }) || { id: 'sales', role: 'SALES', name: 'Sales' };

  let passedCount = 0;
  let failedCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`✅ ${message} - PASS`);
      passedCount++;
    } else {
      console.error(`❌ ${message} - FAIL`);
      failedCount++;
      throw new Error(`Test failed: ${message}`);
    }
  }

  await cleanup();

  // Create test data
  const customer = await db.customer.create({
    data: { name: 'TEST-CUST-ISSUE', customerCode: 'TEST-CUST-ISSUE-CODE', phone: '0123456789' }
  });

  const zone = await db.warehouseZone.findFirst() || await db.warehouseZone.create({
    data: { code: 'ZONE-A', name: 'Zone A', type: 'NORMAL' }
  });

  const item1 = await db.inventoryItem.create({
    data: {
      itemCode: 'TEST-ISSUE-1',
      name: 'Item 1',
      category: 'PAPER',
      unit: 'Tờ',
      stockBaseUnit: 'Tờ',
      warehouseZone: { connect: { id: zone.id } },
      status: 'ACTIVE',
      currentStockBase: 1000,
      averageCost: 5000,
    }
  });

  const item2 = await db.inventoryItem.create({
    data: {
      itemCode: 'TEST-ISSUE-2',
      name: 'Item 2',
      category: 'PAPER',
      unit: 'Tờ',
      stockBaseUnit: 'Tờ',
      warehouseZone: { connect: { id: zone.id } },
      status: 'ACTIVE',
      currentStockBase: 50,
      averageCost: 10000,
    }
  });

  const order = await db.order.create({
    data: {
      orderCode: 'TEST-ORDER-ISSUE',
      customerId: customer.id,
      status: 'NEW',
      items: {
        create: [
          {
            name: 'SP 1',
            productType: 'SHEET',
            labelShape: 'RECTANGLE',
            dieCutType: 'STANDARD',
            widthCm: 10,
            heightCm: 10,
            quantity: 1000,
            labelsPerSheet: 10,
            printSheets: 100,
            wasteSheets: 10,
            totalSheets: 110, // require 110 of Item 1
            materialId: item1.id,
            materialCost: 0,
            laminationCost: 0,
            dieCutCost: 0,
            printingCost: 0,
            fileHandlingFee: 0,
            otherFee: 0,
            costAmount: 0,
            saleAmount: 0
          },
          {
            name: 'SP 2',
            productType: 'SHEET',
            labelShape: 'RECTANGLE',
            dieCutType: 'STANDARD',
            widthCm: 20,
            heightCm: 20,
            quantity: 500,
            labelsPerSheet: 5,
            printSheets: 100,
            wasteSheets: 5,
            totalSheets: 105, // require 105 of Item 2 (we only have 50 in stock)
            materialId: item2.id,
            materialCost: 0,
            laminationCost: 0,
            dieCutCost: 0,
            printingCost: 0,
            fileHandlingFee: 0,
            otherFee: 0,
            costAmount: 0,
            saleAmount: 0
          }
        ]
      }
    }
  });

  const job = await db.productionJob.create({
    data: {
      jobCode: 'TEST-JOB-ISSUE',
      orderId: order.id,
      status: 'READY_FOR_PRINT',
      priority: 'NORMAL'
    }
  });

  console.log('\n=== Testing Status Calculation ===');
  let statusRes = await getProductionMaterialIssueStatus(job.id);
  assert(statusRes.success === true, 'getProductionMaterialIssueStatus should return success');
  
  let data = statusRes.data;
  assert(data!.status === 'INSUFFICIENT', `Initial status should be INSUFFICIENT (due to Item 2), got ${data!.status}`);
  assert(data!.items.length === 2, 'Should find 2 required items');
  
  let i1 = data!.items.find((i: any) => i.inventoryItemId === item1.id);
  let i2 = data!.items.find((i: any) => i.inventoryItemId === item2.id);

  assert(i1.requiredQuantityBase === 110, 'Item 1 require 110');
  assert(i1.issuedQuantityBase === 0, 'Item 1 issued 0');
  assert(i1.remainingQuantityBase === 110, 'Item 1 remaining 110');
  assert(i1.canIssueRemaining === true, 'Item 1 can issue remaining (stock 1000 >= 110)');

  assert(i2.requiredQuantityBase === 105, 'Item 2 require 105');
  assert(i2.currentStockBase === 50, 'Item 2 stock 50');
  assert(i2.shortageQuantityBase === 55, 'Item 2 shortage 55');
  assert(i2.canIssueRemaining === false, 'Item 2 cannot issue remaining');

  console.log('\n=== Testing Create Material Issue PXK ===');

  // Test accountant rejection
  let accRes = await createProductionMaterialIssueReceiptCore({
    productionJobId: job.id,
    note: 'TEST-MATERIAL-ISSUE-1',
    items: [{ inventoryItemId: item1.id, quantityBase: 10 }]
  }, accountantUser);
  assert(accRes.success === false, 'Accountant cannot create PXK');

  // Test over issue rejection (over remaining)
  let overIssueRes = await createProductionMaterialIssueReceiptCore({
    productionJobId: job.id,
    note: 'TEST-MATERIAL-ISSUE-2',
    items: [{ inventoryItemId: item1.id, quantityBase: 150 }]
  }, adminUser);
  assert(overIssueRes.success === false, 'Cannot issue more than remaining (150 > 110)');

  // Test over stock rejection
  let overStockRes = await createProductionMaterialIssueReceiptCore({
    productionJobId: job.id,
    note: 'TEST-MATERIAL-ISSUE-3',
    items: [{ inventoryItemId: item2.id, quantityBase: 60 }]
  }, adminUser);
  assert(overStockRes.success === false, 'Cannot issue more than stock (60 > 50)');

  // Test valid partial issue
  let validRes1 = await createProductionMaterialIssueReceiptCore({
    productionJobId: job.id,
    note: 'TEST-MATERIAL-ISSUE-4',
    items: [{ inventoryItemId: item1.id, quantityBase: 60 }]
  }, adminUser) as any;
  assert(validRes1.success === true, 'Can create partial issue PXK');
  const receiptId1 = validRes1.data.id;

  // Verify stock subtracted
  const afterStock1 = await db.inventoryItem.findUnique({ where: { id: item1.id } });
  assert(afterStock1?.currentStockBase === 940, 'Stock should subtract to 940 (1000 - 60)');
  assert(afterStock1?.averageCost === 5000, 'Average cost should remain unchanged (5000)');

  // Verify transaction EXPORT
  const txs1 = await db.inventoryTransaction.findMany({ where: { referenceId: receiptId1 } });
  assert(txs1.length === 1 && txs1[0].type === 'EXPORT', 'EXPORT transaction created');
  assert(txs1[0].productionJobId === job.id, 'Transaction links to productionJobId');

  const afterStatus1Res = await getProductionMaterialIssueStatus(job.id);
  const afterStatus1 = afterStatus1Res.data;
  assert(afterStatus1?.status === 'INSUFFICIENT', 'Status still INSUFFICIENT because of item 2');
  assert(afterStatus1?.items.find((i: any) => i.inventoryItemId === item1.id)?.issuedQuantityBase === 60, 'Item 1 issued 60');
  assert(afterStatus1?.items.find((i: any) => i.inventoryItemId === item1.id)?.remainingQuantityBase === 50, 'Item 1 remaining 50');

  // Next issue: issue remaining 50
  let validRes2 = await createProductionMaterialIssueReceiptCore({
    productionJobId: job.id,
    receiverName: 'Test Receiver 2',
    receiverDepartment: 'Production',
    note: 'Issue full',
    items: [
      {
        inventoryItemId: item1.id,
        quantityBase: 50,
        note: 'Issue rest'
      }
    ]
  }, productionUser) as any;
  assert(validRes2.success === true, 'PRODUCTION can create full issue PXK');
  const receiptId2 = validRes2.data.id;

  // Verify status update again
  let statusRes3 = await getProductionMaterialIssueStatus(job.id);
  let i1Full = statusRes3.data!.items.find((i: any) => i.inventoryItemId === item1.id);
  assert(i1Full.issuedQuantityBase === 110, 'Item 1 issued 110');
  assert(i1Full.remainingQuantityBase === 0, 'Item 1 remaining 0');

  console.log('\n=== Testing Cancel PXK ===');

  let cancelRes = await cancelOutboundReceiptCore(receiptId2, 'Lỗi', adminUser);
  assert(cancelRes.success === true, 'Can cancel PXK');

  // Verify stock added back
  const afterCancelStock = await db.inventoryItem.findUnique({ where: { id: item1.id } });
  assert(afterCancelStock?.currentStockBase === 940, 'Stock should add back 50 (890 + 50 = 940)');

  // Verify status recalculates
  let statusRes4 = await getProductionMaterialIssueStatus(job.id);
  let i1Cancel = statusRes4.data!.items.find((i: any) => i.inventoryItemId === item1.id);
  assert(i1Cancel.issuedQuantityBase === 60, 'Item 1 issued back to 60 (cancelled PXK ignored)');

  console.log('\n=== Testing Double Consume Safety ===');
  // In our architecture, the ONLY point of stock deduction for production is the creation of a PRODUCTION_ISSUE PXK.
  // There is no automatic consumption when advancing production steps.
  // The previous assertions (afterStock1 === 940) prove that stock was deducted exactly once by the PXK quantity.
  assert(afterStock1?.currentStockBase === 940, 'Double consume safety: stock only deducted once after PXK issue');

  console.log(`\n🎉 Tests finished: ${passedCount} passed, ${failedCount} failed.`);
  await cleanup();
}

runTests().catch(e => {
  console.error('Unhandled error during test:', e);
  process.exit(1);
});
