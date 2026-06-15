import { db } from '../src/lib/db';
import { createWarehouseZone, updateWarehouseZone, deleteWarehouseZone, seedDefaultWarehouseZones, backfillInventoryWarehouseZones } from '../src/lib/warehouse-zone-actions';
import { createInventoryItem } from '../src/lib/inventory-actions';

async function runTests() {
  console.log('=== STARTING WAREHOUSE ZONES TESTS ===\n');

  // SAFE CLEANUP: Only delete default zones if they have no inventory items
  const defaultCodes = ['KHO-GIAY', 'KHO-DECAL', 'KHO-MANG', 'KHO-MUC', 'KHO-PHU-LIEU', 'KHO-KHAC'];
  let deletedCount = 0;
  for (const code of defaultCodes) {
    const zone = await db.warehouseZone.findUnique({ where: { code } });
    if (zone) {
      const itemsCount = await db.inventoryItem.count({ where: { warehouseZoneId: zone.id } });
      if (itemsCount === 0) {
        await db.warehouseZone.delete({ where: { id: zone.id } });
        deletedCount++;
      }
    }
  }
  console.log(`PASS: Safe cleanup deleted ${deletedCount} unused default zones.`);

  // 1. Seed creates default zones
  const seedRes1 = await seedDefaultWarehouseZones(true);
  if (seedRes1.success) {
    console.log(`PASS: Seeded ${seedRes1.data!.createdCount} default zones.`);
  } else {
    console.error('FAIL: Seed 1', seedRes1);
  }

  // 2. Run seed second time -> idempotent (createdCount = 0)
  const seedRes2 = await seedDefaultWarehouseZones(true);
  if (seedRes2.success && seedRes2.data!.createdCount === 0) {
    console.log('PASS: Seed is idempotent.');
  } else {
    console.error('FAIL: Seed 2 should be 0', seedRes2);
  }

  // 3 & 4. If KHO-GIAY exists, seed does not overwrite name/description
  const paperZone = await db.warehouseZone.findUnique({ where: { code: 'KHO-GIAY' } });
  if (paperZone) {
    await db.warehouseZone.update({
      where: { id: paperZone.id },
      data: { name: 'Kho Giấy Custom', description: 'Test Custom Desc' }
    });
    const seedRes3 = await seedDefaultWarehouseZones(true);
    const paperZoneAfter = await db.warehouseZone.findUnique({ where: { code: 'KHO-GIAY' } });
    if (paperZoneAfter?.name === 'Kho Giấy Custom' && paperZoneAfter?.description === 'Test Custom Desc' && seedRes3.success && seedRes3.data!.createdCount === 0) {
      console.log('PASS: Seed does not overwrite existing custom zone names/descriptions.');
    } else {
      console.error('FAIL: Seed overwrote custom zone properties or failed', paperZoneAfter);
    }
    // Revert
    await db.warehouseZone.update({
      where: { id: paperZone.id },
      data: { name: 'Kho giấy', description: 'Lưu trữ các loại giấy' }
    });
  }

  // 5-11. Backfill testing
  // Create mock items for testing backfill (if not already existing)
  const testCodes = ['GIAY-TEST1', 'DECAL-TEST1', 'MANG-TEST1', 'MUC-TEST1', 'KEO-TEST1', 'VAT-TU-PHU-TEST1', 'RANDOM-TEST1'];
  for (const code of testCodes) {
    const existing = await db.inventoryItem.findUnique({ where: { itemCode: code } });
    if (existing) {
      await db.inventoryItem.update({ where: { id: existing.id }, data: { warehouseZoneId: null } });
    } else {
      await db.inventoryItem.create({
        data: {
          itemCode: code,
          name: `Test Item ${code}`,
          unit: 'KG',
          category: code.split('-')[0] === 'PAPER' ? 'PAPER' : code.split('-')[0],
          warehouseZoneId: null,
          stockBaseUnit: 'SHEET',
          currentStockBase: 0,
          unitScale: 1
        }
      });
    }
  }

  const backfillRes1 = await backfillInventoryWarehouseZones(true);
  if (backfillRes1.success) {
    console.log(`PASS: Backfill 1 assigned: ${backfillRes1.data?.assignedCount}, skipped: ${backfillRes1.data?.skippedCount}, unknown: ${backfillRes1.data?.unknownCount}`);
  } else {
    console.error('FAIL: Backfill 1', backfillRes1);
  }

  // Verify mappings
  const verifyMap = async (code: string, expectedZoneCode: string) => {
    const item = await db.inventoryItem.findUnique({ where: { itemCode: code }, include: { warehouseZone: true } });
    if (item?.warehouseZone?.code === expectedZoneCode) return true;
    return false;
  };

  const v1 = await verifyMap('GIAY-TEST1', 'KHO-GIAY');
  const v2 = await verifyMap('DECAL-TEST1', 'KHO-DECAL');
  const v3 = await verifyMap('MANG-TEST1', 'KHO-MANG');
  const v4 = await verifyMap('MUC-TEST1', 'KHO-MUC');
  const v5 = await verifyMap('KEO-TEST1', 'KHO-PHU-LIEU');
  const v6 = await verifyMap('VAT-TU-PHU-TEST1', 'KHO-PHU-LIEU');
  const v7 = await verifyMap('RANDOM-TEST1', 'KHO-KHAC');

  if (v1 && v2 && v3 && v4 && v5 && v6 && v7) {
    console.log('PASS: All backfill mappings are correct.');
  } else {
    console.error('FAIL: Some backfill mappings were incorrect.', { v1, v2, v3, v4, v5, v6, v7 });
  }

  // 12. Idempotency of backfill
  const backfillRes2 = await backfillInventoryWarehouseZones(true);
  if (backfillRes2.success && backfillRes2.data?.assignedCount === 0 && backfillRes2.data?.unknownCount === 0) {
    console.log('PASS: Backfill is idempotent (does not overwrite existing).');
  } else {
    console.error('FAIL: Backfill 2 should have 0 assigned', backfillRes2);
  }

  // 13. Cleanup test items
  for (const code of testCodes) {
    await db.inventoryItem.delete({ where: { itemCode: code } });
  }
  console.log('PASS: Cleaned up backfill test items.');

  console.log('\n=== WAREHOUSE ZONES TESTS COMPLETED ===');
}

runTests().then(() => process.exit(0)).catch(e => {
  console.error(e);
  process.exit(1);
});
