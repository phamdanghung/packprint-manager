import { PrismaClient } from '@prisma/client';
import { deriveInventoryFieldsFromCodeOrInput } from '../src/lib/material-code-generator';

const db = new PrismaClient();

async function run() {
  const args = process.argv.slice(2);
  const isApply = args.includes('--apply');
  const isDryRun = !isApply;

  console.log(`Bắt đầu chạy normalize-inventory-codes in ${isDryRun ? 'DRY-RUN' : 'APPLY'} mode`);

  const items = await db.inventoryItem.findMany();
  let updatedCount = 0;
  let manualReviewCount = 0;

  for (const item of items) {
    let proposedInput: any = null;
    let category = item.category;

    // Check for old suffix codes
    if (item.itemCode.endsWith('-PARENT') || item.itemCode.endsWith('-CHILD') || item.itemCode.endsWith('-BOTH')) {
      const parts = item.itemCode.split('-');
      const oldSuffix = parts[parts.length - 1];
      const newSuffix = oldSuffix === 'PARENT' ? 'ME' : (oldSuffix === 'CHILD' ? 'CON' : 'CHUNG');
      const newCode = item.itemCode.slice(0, -oldSuffix.length) + newSuffix;

      // We don't really need to parse the whole input, we can just derive fields from item directly.
      // But we can construct a fake input to get the proper name.
      const sheetRole = oldSuffix;
      const sheetSize = parts[parts.length - 2];
      const gsmStr = parts.length >= 4 ? parts[parts.length - 3] : null;
      // material type might be multiple parts
      const matParts = parts.slice(1, parts.length - (gsmStr ? 3 : 2));
      const materialType = matParts.join('-');

      proposedInput = {
        category: category,
        materialType: materialType,
        gsm: gsmStr && !isNaN(Number(gsmStr)) ? Number(gsmStr) : null,
        sheetSize: sheetSize,
        sheetRole: sheetRole
      };
      
      // DECAL doesn't have GSM in the code. 
      // Example: DECAL-GIAY-32X35-BOTH
      // parts = ['DECAL', 'GIAY', '32X35', 'BOTH']
      // sheetSize = '32X35', gsmStr = 'GIAY' -> isNaN -> null.
      // matParts = ['GIAY'] -> materialType = 'GIAY'. 
    }
    // VERY BASIC legacy parse for testing / legacy data
    else if (item.itemCode === 'C300_79X109' || (item.name.toLowerCase().includes('couche 300') && item.name.includes('79x109'))) {
      proposedInput = { category: 'GIAY', materialType: 'COUCHE', gsm: 300, sheetSize: '79X109', sheetRole: 'PARENT' };
    }
    // GIAY C300 legacy but missing size
    else if (item.name.toUpperCase().includes('GIAY C300') || item.name.toUpperCase().includes('GIẤY C300')) {
      proposedInput = { error: 'Thiếu thông tin khổ giấy, không thể tự sinh mã' };
    }
    // Add more patterns here if needed in production

    if (!proposedInput) {
      // Could not automatically parse this code
      console.log(`[SKIP] Không thể parse vật tư: ${item.itemCode} - ${item.name}`);
      manualReviewCount++;
      continue;
    }

    if (proposedInput.error) {
      console.log(`[MANUAL_REVIEW] ${item.itemCode} - ${item.name} -> ${proposedInput.error}`);
      manualReviewCount++;
      continue;
    }

    try {
      const derived = deriveInventoryFieldsFromCodeOrInput(proposedInput);
      
      // If code is the same, no need to update
      if (item.itemCode === derived.itemCode) {
        continue;
      }

      console.log(`[PROPOSE] ${item.itemCode} (${item.name}) -> ${derived.itemCode} (${derived.name})`);

      if (isApply) {
        // Check if new code exists
        const existing = await db.inventoryItem.findUnique({ where: { itemCode: derived.itemCode } });
        if (existing) {
          console.log(`  -> LỖI: Mã mới đã tồn tại, không thể update!`);
          manualReviewCount++;
        } else {
          await db.inventoryItem.update({
            where: { id: item.id },
            data: {
              itemCode: derived.itemCode,
              name: derived.name,
              familyKey: derived.familyKey,
              familyName: derived.familyName,
              gsm: derived.gsm,
              sheetWidthCm: derived.sheetWidthCm,
              sheetHeightCm: derived.sheetHeightCm,
              sheetRole: derived.sheetRole,
              stockBaseUnit: derived.stockBaseUnit,
            }
          });
          console.log(`  -> Đã cập nhật thành công!`);
          updatedCount++;
        }
      } else {
        updatedCount++; // Count as would-be-updated in dry-run
      }

    } catch (e: any) {
      console.log(`[ERROR] Lỗi khi xử lý ${item.itemCode}: ${e.message}`);
      manualReviewCount++;
    }
  }

  console.log(`\nTổng kết:`);
  console.log(`- Cập nhật thành công / Sẽ cập nhật: ${updatedCount}`);
  console.log(`- Cần review thủ công: ${manualReviewCount}`);

  await db.$disconnect();
}

run().catch(e => {
  console.error(e);
  process.exit(1);
});
