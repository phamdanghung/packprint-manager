import { db } from '../src/lib/db';

async function check() {
  const zones = await db.warehouseZone.findMany({
    include: { _count: { select: { inventoryItems: true } } }
  });
  
  for (const z of zones) {
    console.log(`${z.code}: ${z._count.inventoryItems} items`);
  }
}

check().then(() => process.exit(0));
