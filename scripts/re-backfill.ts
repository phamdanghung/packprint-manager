import { db } from '../src/lib/db';
import { backfillInventoryWarehouseZones } from '../src/lib/warehouse-zone-actions';

async function run() {
  const otherZone = await db.warehouseZone.findFirst({ where: { code: 'KHO-KHAC' } });
  if (otherZone) {
    const updated = await db.inventoryItem.updateMany({
      where: { warehouseZoneId: otherZone.id },
      data: { warehouseZoneId: null }
    });
    console.log(`Reset ${updated.count} items from KHO-KHAC to null.`);
  }
  
  const res = await backfillInventoryWarehouseZones(true);
  if (!res.success || !res.data) {
    console.error('Failed to re-backfill:', res.error || 'Unknown error');
    process.exit(1);
  }
  
  console.log(`Re-backfill success: Assigned ${res.data.assignedCount}, Unknown ${res.data.unknownCount}`);
}

run().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
