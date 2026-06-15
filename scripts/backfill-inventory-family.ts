import { db } from '../src/lib/db';
import { extractMaterialInfo } from '../src/lib/inventory-recipe-validation';

async function main() {
  console.log('--- STARTING BACKFILL INVENTORY FAMILY ---');
  
  const items = await db.inventoryItem.findMany();
  let updatedCount = 0;
  
  for (const item of items) {
    let updateData: any = {};
    
    // Parse info from name using the new helper
    const info = extractMaterialInfo(item.name);
    
    // Only update if not already set to avoid overwriting user edits
    if (!item.sheetWidthCm && info.widthCm > 0) updateData.sheetWidthCm = info.widthCm;
    if (!item.sheetHeightCm && info.heightCm > 0) updateData.sheetHeightCm = info.heightCm;
    if (!item.gsm && info.gsm) updateData.gsm = info.gsm;
    
    if (!item.familyKey && info.familyKey) {
      updateData.familyKey = info.familyKey;
      updateData.familyName = info.familyName;
    }
    
    if (Object.keys(updateData).length > 0) {
      await db.inventoryItem.update({
        where: { id: item.id },
        data: updateData
      });
      console.log(`[UPDATED] ${item.name} ->`, updateData);
      updatedCount++;
    } else {
      console.log(`[SKIPPED] ${item.name} (No new info or already populated)`);
    }
  }
  
  console.log(`--- BACKFILL COMPLETED: Updated ${updatedCount}/${items.length} items ---`);
}

main().catch(console.error).finally(() => process.exit(0));
