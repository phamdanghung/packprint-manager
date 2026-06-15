import { db } from './src/lib/db';

async function main() {
  try {
    const res = await db.warehouseZone.create({
      data: {
        code: 'KHO-DECAL NHUA',
        name: 'KHO GIẤY',
        type: 'PAPER',
        description: null,
        isActive: true,
        sortOrder: 2
      }
    });
    console.log('SUCCESS:', res);
  } catch (e: any) {
    console.log('ERROR:', e.message);
  }
}
main().then(() => process.exit(0)).catch(e => { console.log(e); process.exit(1); });
