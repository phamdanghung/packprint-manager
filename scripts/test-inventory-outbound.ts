import { db } from '../src/lib/db';
import { createOutboundReceiptCore, cancelOutboundReceiptCore } from '../src/lib/inventory-outbound-actions';
import { generateOutboundReceiptCode } from '../src/lib/inventory-outbound-code';
import { validateGeneratedCode } from '../src/lib/material-code-generator';

async function cleanup() {
  console.log('Cleaning up test data...');
  const testItems = await db.inventoryItem.findMany({
    where: { itemCode: { contains: 'TEST-OUT' } }
  });
  const itemIds = testItems.map(i => i.id);

  if (itemIds.length > 0) {
    await db.inventoryTransaction.deleteMany({
      where: { itemId: { in: itemIds } }
    });
  }

  // Find all outbound receipts created in test
  const testReceipts = await db.inventoryOutboundReceipt.findMany({
    where: { note: { contains: 'TEST-OUTBOUND' } }
  });

  for (const r of testReceipts) {
    await db.inventoryOutboundReceiptItem.deleteMany({ where: { receiptId: r.id } });
    await db.inventoryOutboundReceipt.delete({ where: { id: r.id } });
  }

  // Delete test items
  await db.inventoryItem.deleteMany({
    where: { itemCode: { contains: 'TEST-OUT' } }
  });

  console.log('Cleanup finished.\n');
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

  try {
    await cleanup();

    console.log('--- Phase 22A.9: Standardized Outbound Receipts Tests ---');

    // Setup: Create 3 items:
    // 1. Active item with standard code, averageCost = 1000, lastPurchaseCost = 1200
    // 2. Inactive item
    // 3. Item with non-standard code
    // All items have initial stock to allow testing exports.

    const runId = Date.now();

    const item1 = await db.inventoryItem.create({
      data: {
        itemCode: `GIAY-TEST-OUT-1-${runId}`, // Standard format simulator
        name: 'Vật tư test active',
        category: 'PAPER',
        materialType: 'ROLL',
        unit: 'ROLL',
        stockBaseUnit: 'MILLIMETER',
        displayUnit: 'METER',
        unitScale: 1000,
        currentStockBase: 5000, // 5000 units
        averageCost: 1000,
        lastPurchaseCost: 1200,
        status: 'ACTIVE'
      }
    });

    const item2 = await db.inventoryItem.create({
      data: {
        itemCode: `GIAY-TEST-OUT-2-${runId}`,
        name: 'Vật tư test inactive',
        category: 'PAPER',
        materialType: 'ROLL',
        unit: 'ROLL',
        stockBaseUnit: 'MILLIMETER',
        displayUnit: 'METER',
        unitScale: 1000,
        currentStockBase: 1000,
        status: 'INACTIVE'
      }
    });

    const item3 = await db.inventoryItem.create({
      data: {
        itemCode: `TEST-OUT-UNSTANDARD_${runId}`, // Non standard
        name: 'Vật tư test chưa chuẩn',
        category: 'OTHER',
        materialType: 'OTHER',
        unit: 'SHEET',
        stockBaseUnit: 'SHEET',
        displayUnit: 'SHEET',
        unitScale: 1,
        currentStockBase: 1000,
        status: 'ACTIVE'
      }
    });

    // Test 1: Receipt code format
    const code = await generateOutboundReceiptCode();
    assert(code.startsWith('PXK-') && code.length >= 16, `Receipt code format PXK-YYYYMMDD-XXX (${code})`);

    // Test 2: Create valid outbound receipt (single item)
    const res1 = await createOutboundReceiptCore({
      outboundType: 'PRODUCTION_ISSUE',
      note: 'TEST-OUTBOUND-1',
      items: [
        { inventoryItemId: item1.id, quantityBase: 1000 }
      ]
    }, productionUser);
    
    assert(res1.success, 'Tạo phiếu xuất 1 item thành công');
    
    const dbItem1 = await db.inventoryItem.findUnique({ where: { id: item1.id }});
    assert(dbItem1!.currentStockBase === 4000, `Trừ tồn đúng: 5000 - 1000 = ${dbItem1!.currentStockBase}`);

    // Test 3 & 4 & 5: Outbound receipt item validation (Cost & Stock snapshot)
    const r1 = await db.inventoryOutboundReceipt.findUnique({
      where: { id: res1.data.id },
      include: { items: true }
    });
    const r1Item = r1!.items[0];
    assert(r1Item.unitCost === 1000, `unitCost lấy từ averageCost (1000) = ${r1Item.unitCost}`);
    assert(r1Item.totalCost === 1000 * 1000, `totalCost tính đúng = ${r1Item.totalCost}`);
    assert(r1Item.stockBeforeBase === 5000, `stockBeforeBase lưu đúng = 5000`);
    assert(r1Item.stockAfterBase === 4000, `stockAfterBase lưu đúng = 4000`);

    const dbItem1_afterExport = await db.inventoryItem.findUnique({ where: { id: item1.id }});
    assert(dbItem1_afterExport!.averageCost === 1000, `averageCost không bị thay đổi sau khi xuất kho = 1000`);

    // Test 6: Transaction creation
    const txs1 = await db.inventoryTransaction.findMany({
      where: { referenceId: r1!.id }
    });
    assert(txs1.length === 1, 'Tạo 1 InventoryTransaction');
    assert(txs1[0].type === 'EXPORT', 'InventoryTransaction type = EXPORT');
    assert(txs1[0].quantity === 1000, 'InventoryTransaction quantity = 1000');

    // Test 7: Export more than stock
    try {
      await createOutboundReceiptCore({
        outboundType: 'PRODUCTION_ISSUE',
        note: 'TEST-OUTBOUND-FAIL-STOCK',
        items: [
          { inventoryItemId: item1.id, quantityBase: 10000 } // only 4000 left
        ]
      }, productionUser);
      assert(false, 'Should reject export more than stock');
    } catch (e: any) {
      assert(e.message.includes('Không đủ tồn kho'), 'Reject export quá tồn: ' + e.message);
    }

    // Test 8: quantityBase <= 0
    try {
      await createOutboundReceiptCore({
        outboundType: 'PRODUCTION_ISSUE',
        note: 'TEST-OUTBOUND',
        items: [
          { inventoryItemId: item1.id, quantityBase: -50 }
        ]
      }, productionUser);
      assert(false, 'Should reject quantity <= 0');
    } catch (e: any) {
      assert(e.message.includes('phải là số nguyên > 0'), 'quantityBase <= 0 bị reject');
    }

    // Test 9: inactive item
    try {
      await createOutboundReceiptCore({
        outboundType: 'PRODUCTION_ISSUE',
        note: 'TEST-OUTBOUND',
        items: [
          { inventoryItemId: item2.id, quantityBase: 10 }
        ]
      }, productionUser);
      assert(false, 'Should reject inactive item');
    } catch (e: any) {
      assert(e.message.includes('ngừng sử dụng'), 'item inactive bị reject');
    }

    // Test 10: STRICT mode unstandard code
    try {
      await createOutboundReceiptCore({
        outboundType: 'PRODUCTION_ISSUE',
        note: 'TEST-OUTBOUND',
        items: [
          { inventoryItemId: item3.id, quantityBase: 10 }
        ]
      }, productionUser);
      assert(false, 'Should reject non-standard item');
    } catch (e: any) {
      assert(e.message.includes('chưa có mã chuẩn'), 'STRICT mode chặn item chưa chuẩn');
    }

    // Test 11: Duplicate item
    try {
      await createOutboundReceiptCore({
        outboundType: 'PRODUCTION_ISSUE',
        note: 'TEST-OUTBOUND',
        items: [
          { inventoryItemId: item1.id, quantityBase: 10 },
          { inventoryItemId: item1.id, quantityBase: 20 }
        ]
      }, productionUser);
      assert(false, 'Should reject duplicate item');
    } catch (e: any) {
      assert(e.message.includes('Vật tư bị trùng'), 'Duplicate item bị reject');
    }

    // Test 12: Roles validation
    const blockRoles = ['SALES', 'DESIGNER', 'DELIVERY', 'ACCOUNTANT'];
    for (const r of blockRoles) {
      try {
        await createOutboundReceiptCore({
          outboundType: 'PRODUCTION_ISSUE',
          note: 'TEST-OUTBOUND',
          items: [{ inventoryItemId: item1.id, quantityBase: 10 }]
        }, { id: 'test', role: r, name: 'Test' });
        assert(false, `Role ${r} should not be able to create`);
      } catch (e: any) {
        assert(e.message.includes('không có quyền'), `Role ${r} bị chặn tạo phiếu`);
      }
    }

    // Cancel Outbound Receipt Tests
    const res2 = await createOutboundReceiptCore({
      outboundType: 'OTHER',
      note: 'TEST-OUTBOUND-CANCEL',
      items: [
        { inventoryItemId: item1.id, quantityBase: 500 }
      ]
    }, adminUser);
    
    // Test 13: Cancel rollback
    const r2Id = res2.data.id;
    const cancelRes = await cancelOutboundReceiptCore(r2Id, 'Sai số lượng', adminUser);
    assert(cancelRes.success, 'Hủy phiếu xuất thành công');

    const dbItem1_afterCancel = await db.inventoryItem.findUnique({ where: { id: item1.id }});
    // It was 4000, exported 500 => 3500, cancelled 500 => 4000
    assert(dbItem1_afterCancel!.currentStockBase === 4000, `Cancel rollback tồn đúng: 3500 + 500 = ${dbItem1_afterCancel!.currentStockBase}`);
    assert(dbItem1_afterCancel!.averageCost === 1000, `averageCost không bị thay đổi sau khi cancel xuất kho = 1000`);

    const r2Db = await db.inventoryOutboundReceipt.findUnique({ where: { id: r2Id }});
    assert(r2Db!.status === 'CANCELLED', 'Trạng thái phiếu chuyển sang CANCELLED');

    // Test 14: Cancel already cancelled
    try {
      await cancelOutboundReceiptCore(r2Id, 'Thử hủy lại', adminUser);
      assert(false, 'Should reject cancel again');
    } catch (e: any) {
      assert(e.message.includes('đã bị hủy rồi'), 'Không cho hủy phiếu đã CANCELLED');
    }

    // Test 15: Transaction cancellation
    const txsCancel = await db.inventoryTransaction.findMany({
      where: { referenceId: r2Id, type: 'EXPORT_CANCELLED' }
    });
    assert(txsCancel.length === 1, 'Tạo 1 InventoryTransaction EXPORT_CANCELLED');

    await cleanup();

    console.log(`\nResults: ${passedCount} Passed, ${failedCount} Failed.`);

  } catch (err) {
    console.error('❌ Tests failed unexpectedly:');
    console.error(err);
    process.exit(1);
  }
}

runTests();
