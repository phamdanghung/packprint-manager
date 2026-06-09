import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('--- Starting backfill of InventoryItem base units ---');

  const items = await prisma.inventoryItem.findMany();
  console.log(`Found ${items.length} items to update.`);

  let updatedCount = 0;
  for (const item of items) {
    await prisma.inventoryItem.update({
      where: { id: item.id },
      data: {
        currentStockBase: item.currentStock,
        reservedStockBase: item.reservedStock,
        minStockBase: item.minStock,
        stockBaseUnit: 'SHEET',
        unitScale: 1,
      },
    });
    updatedCount++;
  }

  console.log(`Successfully updated ${updatedCount} items.`);
}

main()
  .catch((e) => {
    console.error('Error during backfill:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
