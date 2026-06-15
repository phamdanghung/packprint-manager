import { PrismaClient } from '@prisma/client';
import { deleteOrDeactivateInventoryItem, reactivateInventoryItem } from '../src/lib/inventory-actions';

const db = new PrismaClient();

// Mock auth for testing backend actions directly
// Removed jest.mock to fix build

async function runTests() {
  console.log('--- Phase 22A.7: Safe Delete / Deactivate Inventory Item Tests ---');
  let passCount = 0;
  let failCount = 0;

  // Ensure mock user exists
  await db.user.upsert({
    where: { id: 'test-admin' },
    update: { role: 'ADMIN' },
    create: { id: 'test-admin', email: 'admin@test.com', name: 'Test Admin', role: 'ADMIN', passwordHash: 'test' }
  });

  // Cleanup old test data
  await db.inventoryTransaction.deleteMany({ where: { transactionCode: { startsWith: 'TEST-DEL-' } } });
  await db.inventoryItem.deleteMany({ where: { itemCode: { startsWith: 'TEST-DEL-' } } });

  // 1. Hard Delete Test (0 stock, no tx)
  const item1 = await db.inventoryItem.create({
    data: {
      itemCode: 'TEST-DEL-1',
      name: 'Vật tư test xóa hẳn',
      category: 'OTHER',
      unit: 'SHEET',
      currentStockBase: 0,
      reservedStockBase: 0
    }
  });

  try {
    const res = await deleteOrDeactivateInventoryItem(item1.id);
    if (res.status === 'DELETED') {
      console.log('✅ Test 1: Hard Delete (0 stock, no tx) - PASS');
      passCount++;
    } else {
      console.log('❌ Test 1: Failed. Expected DELETED, got:', res);
      failCount++;
    }
  } catch (e: any) {
    console.log('❌ Test 1: Exception:', e.message);
    failCount++;
  }

  // 2. Reject Deactivation Test (>0 stock)
  const item2 = await db.inventoryItem.create({
    data: {
      itemCode: 'TEST-DEL-2',
      name: 'Vật tư test reject (có tồn)',
      category: 'OTHER',
      unit: 'SHEET',
      currentStockBase: 10,
      reservedStockBase: 0
    }
  });

  try {
    await deleteOrDeactivateInventoryItem(item2.id);
    console.log('❌ Test 2: Failed. Expected error but succeeded.');
    failCount++;
  } catch (e: any) {
    if (e.message.includes('vẫn còn tồn kho')) {
      console.log('✅ Test 2: Reject Deactivation (>0 stock) - PASS');
      passCount++;
    } else {
      console.log('❌ Test 2: Failed with unexpected error:', e.message);
      failCount++;
    }
  }

  // 3. Deactivate Instead of Delete Test (0 stock, with tx)
  const item3 = await db.inventoryItem.create({
    data: {
      itemCode: 'TEST-DEL-3',
      name: 'Vật tư test deactivate (có tx)',
      category: 'OTHER',
      unit: 'SHEET',
      currentStockBase: 0,
      reservedStockBase: 0
    }
  });
  await db.inventoryTransaction.create({
    data: {
      transactionCode: 'TEST-DEL-TX-1',
      itemId: item3.id,
      type: 'INBOUND',
      quantity: 10,
      stockBefore: 0,
      stockAfter: 10,
      referenceType: 'MANUAL_ADJUSTMENT',
      createdById: 'test-admin'
    }
  });

  try {
    const res = await deleteOrDeactivateInventoryItem(item3.id);
    if (res.status === 'DEACTIVATED_INSTEAD') {
      console.log('✅ Test 3: Deactivate instead of Delete (has Tx) - PASS');
      passCount++;
      
      // Verify in DB
      const dbItem = await db.inventoryItem.findUnique({ where: { id: item3.id } });
      if (dbItem?.status === 'INACTIVE') {
        console.log('✅ Test 3.1: Status updated to INACTIVE in DB - PASS');
        passCount++;
      } else {
        console.log('❌ Test 3.1: Status not INACTIVE in DB');
        failCount++;
      }
    } else {
      console.log('❌ Test 3: Failed. Expected DEACTIVATED_INSTEAD, got:', res);
      failCount++;
    }
  } catch (e: any) {
    console.log('❌ Test 3: Exception:', e.message);
    failCount++;
  }

  // 4. Reactivate Test
  try {
    await reactivateInventoryItem(item3.id);
    const dbItemRe = await db.inventoryItem.findUnique({ where: { id: item3.id } });
    if (dbItemRe?.status === 'ACTIVE') {
      console.log('✅ Test 4: Reactivate Item - PASS');
      passCount++;
    } else {
      console.log('❌ Test 4: Failed to reactivate in DB.');
      failCount++;
    }
  } catch (e: any) {
    console.log('❌ Test 4: Exception:', e.message);
    failCount++;
  }

  console.log(`\nResults: ${passCount} Passed, ${failCount} Failed.`);
  process.exit(failCount === 0 ? 0 : 1);
}

runTests();
