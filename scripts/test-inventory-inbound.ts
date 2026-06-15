import { PrismaClient } from '@prisma/client';
import { createInboundReceipt, cancelInboundReceipt } from '../src/lib/inventory-inbound-actions';

const db = new PrismaClient();

async function runTests() {
  console.log('--- Phase 22A.8: Standardized Inbound Receipts Tests ---');
  let passCount = 0;
  let failCount = 0;
  
  const runId = `INBOUND_${Date.now()}`;
  let currentRole = 'ADMIN';

  // Ensure mock user exists for foreign key constraints
  const testUserId = 'test-admin';
  await db.user.upsert({
    where: { id: testUserId },
    update: { role: 'ADMIN' },
    create: { id: testUserId, email: 'admin@test.com', name: 'Test Admin', role: 'ADMIN', passwordHash: 'test' }
  });

  // We don't need initial cleanup since runId makes itemCode unique.

  const createdReceiptIds: string[] = [];
  
  // Upsert test items
  const activeCode = "GIAY-COUCHE-120-65X86-ME";
  let itemActive = await db.inventoryItem.findUnique({ where: { itemCode: activeCode } });
  if (itemActive) {
    itemActive = await db.inventoryItem.update({
      where: { id: itemActive.id },
      data: { currentStockBase: 100, reservedStockBase: 0, status: 'ACTIVE', averageCost: 1000 }
    });
  } else {
    itemActive = await db.inventoryItem.create({
      data: {
        itemCode: activeCode,
        name: 'Vật tư test active',
        category: 'PAPER',
        unit: 'SHEET',
        currentStockBase: 100,
        reservedStockBase: 0,
        status: 'ACTIVE',
        averageCost: 1000,
        stockBaseUnit: 'SHEET'
      }
    });
  }

  const inactiveCode = "GIAY-COUCHE-120-32X35-CON";
  let itemInactive = await db.inventoryItem.findUnique({ where: { itemCode: inactiveCode } });
  if (itemInactive) {
    itemInactive = await db.inventoryItem.update({
      where: { id: itemInactive.id },
      data: { currentStockBase: 0, reservedStockBase: 0, status: 'INACTIVE' }
    });
  } else {
    itemInactive = await db.inventoryItem.create({
      data: {
        itemCode: inactiveCode,
        name: 'Vật tư test inactive',
        category: 'PAPER',
        unit: 'SHEET',
        currentStockBase: 0,
        reservedStockBase: 0,
        status: 'INACTIVE',
        stockBaseUnit: 'SHEET'
      }
    });
  }

  const itemUnstandard = await db.inventoryItem.create({
    data: {
      itemCode: `TEST-IN-UNSTANDARD-${runId}`,
      name: 'Vật tư test chưa chuẩn',
      category: 'OTHER',
      unit: 'SHEET',
      currentStockBase: 0,
      status: 'ACTIVE',
      stockBaseUnit: 'SHEET'
    }
  });

  // Test 1: Generate receipt code (handled inside action, we verify output)
  // Test 2: Create valid receipt (1 item, positive qty)
  try {
    const res1 = await createInboundReceipt({
      supplierName: 'NCC Test',
      documentNo: 'HD123',
      items: [
        {
          inventoryItemId: itemActive.id,
          quantityBase: 50,
          unitCost: 1200,
          note: 'Nhập test'
        }
      ]
    }, currentRole);
    
    if (res1.receipt && res1.receipt.receiptCode.startsWith('PNK-')) {
      createdReceiptIds.push(res1.receipt.id);
      console.log('✅ Test 1: Receipt code format PNK-YYYYMMDD-XXX - PASS');
      passCount++;
    } else {
      console.log('❌ Test 1: Receipt code format failed');
      failCount++;
    }

    const updatedItem1 = await db.inventoryItem.findUnique({ where: { id: itemActive.id } });
    if (updatedItem1?.currentStockBase === 150) {
      console.log('✅ Test 2: Tạo phiếu nhập cộng tồn đúng (100 + 50) - PASS');
      passCount++;
    } else {
      console.log('❌ Test 2: Tạo phiếu nhập cộng tồn sai');
      failCount++;
    }

    // Check average cost
    // Old stock 100 * 1000 = 100,000
    // New stock 50 * 1200 = 60,000
    // Total cost = 160,000 / 150 = 1067
    if (updatedItem1?.averageCost === 1067) {
      console.log('✅ Test 9: Tính bình quân gia quyền đúng - PASS');
      passCount++;
    } else {
      console.log('❌ Test 9: Tính bình quân sai. Expected 1067, got', updatedItem1?.averageCost);
      failCount++;
    }

    // Check lastPurchaseCost
    if (updatedItem1?.lastPurchaseCost === 1200) {
      console.log('✅ Test 8: Cập nhật lastPurchaseCost đúng - PASS');
      passCount++;
    } else {
      console.log('❌ Test 8: Cập nhật lastPurchaseCost sai');
      failCount++;
    }

    // Verify transaction
    const tx = await db.inventoryTransaction.findFirst({ where: { referenceId: res1.receipt.id } });
    if (tx && tx.type === 'IMPORT' && tx.referenceType === 'INBOUND_RECEIPT' && tx.referenceCode === res1.receipt.receiptCode) {
      console.log('✅ Test 6 & 7: InventoryTransaction được tạo với reference đúng - PASS');
      passCount++;
    } else {
      console.log('❌ Test 6 & 7: InventoryTransaction thiếu hoặc sai reference');
      failCount++;
    }

    // Verify stockBefore and stockAfter
    const rItem = await db.inventoryInboundReceiptItem.findFirst({ where: { receiptId: res1.receipt.id } });
    if (rItem && rItem.stockBeforeBase === 100 && rItem.stockAfterBase === 150) {
      console.log('✅ Test 4 & 5: stockBeforeBase và stockAfterBase lưu đúng - PASS');
      passCount++;
    } else {
      console.log('❌ Test 4 & 5: stockBeforeBase/stockAfterBase sai');
      failCount++;
    }

  } catch (e: any) {
    console.log('❌ Tests failed unexpectedly:', e.message);
    failCount += 6;
  }

  // Test 10: Reject quantity <= 0
  try {
    await createInboundReceipt({
      items: [{ inventoryItemId: itemActive.id, quantityBase: 0 }]
    }, currentRole);
    console.log('❌ Test 10: Fail. Allowed quantity <= 0');
    failCount++;
  } catch (e: any) {
    if (e.message.includes('số nguyên > 0')) {
      console.log('✅ Test 10: quantityBase <= 0 bị reject - PASS');
      passCount++;
    } else {
      console.log('❌ Test 10: Fail with wrong message', e.message);
      failCount++;
    }
  }

  // Test 11: Reject unitCost < 0
  try {
    await createInboundReceipt({
      items: [{ inventoryItemId: itemActive.id, quantityBase: 10, unitCost: -5 }]
    }, currentRole);
    console.log('❌ Test 11: Fail. Allowed unitCost < 0');
    failCount++;
  } catch (e: any) {
    if (e.message.includes('số nguyên >= 0')) {
      console.log('✅ Test 11: unitCost < 0 bị reject - PASS');
      passCount++;
    } else {
      console.log('❌ Test 11: Fail with wrong message', e.message);
      failCount++;
    }
  }

  // Test 12: Reject inactive item
  try {
    await createInboundReceipt({
      items: [{ inventoryItemId: itemInactive.id, quantityBase: 10 }]
    }, currentRole);
    console.log('❌ Test 12: Fail. Allowed inactive item');
    failCount++;
  } catch (e: any) {
    if (e.message.includes('đã ngưng sử dụng')) {
      console.log('✅ Test 12: item inactive bị reject - PASS');
      passCount++;
    } else {
      console.log('❌ Test 12: Fail with wrong message', e.message);
      failCount++;
    }
  }

  // Test 14: Reject unstandard item code
  try {
    await createInboundReceipt({
      items: [{ inventoryItemId: itemUnstandard.id, quantityBase: 10 }]
    }, currentRole);
    console.log('❌ Test 14: Fail. Allowed unstandard item code');
    failCount++;
  } catch (e: any) {
    if (e.message.includes('chưa có mã chuẩn')) {
      console.log('✅ Test 14: STRICT mode chặn item chưa chuẩn - PASS');
      passCount++;
    } else {
      console.log('❌ Test 14: Fail with wrong message', e.message);
      failCount++;
    }
  }

  // Test 15: Reject duplicate item
  try {
    await createInboundReceipt({
      items: [
        { inventoryItemId: itemActive.id, quantityBase: 10 },
        { inventoryItemId: itemActive.id, quantityBase: 20 }
      ]
    }, currentRole);
    console.log('❌ Test 15: Fail. Allowed duplicate items');
    failCount++;
  } catch (e: any) {
    if (e.message.includes('bị trùng')) {
      console.log('✅ Test 15: Duplicate item trong cùng phiếu bị reject - PASS');
      passCount++;
    } else {
      console.log('❌ Test 15: Fail with wrong message', e.message);
      failCount++;
    }
  }

  // Test 21: Cancel rollback
  try {
    const res2 = await createInboundReceipt({
      items: [{ inventoryItemId: itemActive.id, quantityBase: 20 }]
    }, currentRole);
    
    if (res2.receipt) createdReceiptIds.push(res2.receipt.id);
    
    await cancelInboundReceipt(res2.receipt.id, 'Test cancel', currentRole);
    
    const updatedItem2 = await db.inventoryItem.findUnique({ where: { id: itemActive.id } });
    if (updatedItem2?.currentStockBase === 150) { // Should rollback 20
      console.log('✅ Test 21: Cancel rollback tồn đúng - PASS');
      passCount++;
    } else {
      console.log('❌ Test 21: Cancel rollback tồn sai');
      failCount++;
    }

    const receipt2 = await db.inventoryInboundReceipt.findUnique({ where: { id: res2.receipt.id } });
    if (receipt2?.status === 'CANCELLED') {
      console.log('✅ Test 26: Receipt chuyển CANCELLED - PASS');
      passCount++;
    } else {
      console.log('❌ Test 26: Receipt status is not CANCELLED');
      failCount++;
    }

    // Test 27: Reject cancel already cancelled
    try {
      await cancelInboundReceipt(res2.receipt.id, 'Test again', currentRole);
      console.log('❌ Test 27: Fail. Allowed cancel on already cancelled receipt');
      failCount++;
    } catch(e: any) {
      if (e.message.includes('COMPLETED')) {
        console.log('✅ Test 27: Không cho cancel receipt đã CANCELLED - PASS');
        passCount++;
      } else {
        console.log('❌ Test 27: Fail with wrong message', e.message);
        failCount++;
      }
    }

  } catch (e: any) {
    console.log('❌ Cancel tests failed:', e.message);
    failCount++;
  }

  // Test 22: Cancel reject if stock not enough
  try {
    const res3 = await createInboundReceipt({
      items: [{ inventoryItemId: itemActive.id, quantityBase: 100 }]
    }, currentRole);
    
    if (res3.receipt) createdReceiptIds.push(res3.receipt.id);
    
    // Simulate consuming stock to simulate usage
    await db.inventoryItem.update({
      where: { id: itemActive.id },
      data: { currentStockBase: 50 }
    });

    try {
      await cancelInboundReceipt(res3.receipt.id, 'Test insufficient stock', currentRole);
      console.log('❌ Test 22: Fail. Allowed cancel with insufficient stock');
      failCount++;
    } catch(e: any) {
      if (e.message.includes('được sử dụng/xuất kho')) {
        console.log('✅ Test 22: Cancel reject nếu tồn không đủ - PASS');
        passCount++;
      } else {
        console.log('❌ Test 22: Fail with wrong message', e.message);
        failCount++;
      }
    }

  } catch (e: any) {
    console.log('❌ Test 22 failed:', e.message);
    failCount++;
  }

  // Final cleanup using tracked IDs
  console.log('\nCleaning up test data...');
  if (createdReceiptIds.length > 0) {
    // transaction has referenceId = receipt.id
    await db.inventoryTransaction.deleteMany({
      where: { referenceId: { in: createdReceiptIds } }
    });
    await db.inventoryInboundReceiptItem.deleteMany({
      where: { receiptId: { in: createdReceiptIds } }
    });
    await db.inventoryInboundReceipt.deleteMany({
      where: { id: { in: createdReceiptIds } }
    });
  }
  
  await db.inventoryItem.deleteMany({
    where: { itemCode: `TEST-IN-UNSTANDARD-${runId}` }
  });
  
  // reset active items stock to 0 to be safe
  await db.inventoryItem.update({
    where: { id: itemActive.id },
    data: { currentStockBase: 0 }
  });
  
  console.log('Cleanup finished.');

  console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
  process.exit(failCount === 0 ? 0 : 1);
}

runTests();
