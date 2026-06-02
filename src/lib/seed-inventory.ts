import { PrismaClient } from '@prisma/client';
const db = new PrismaClient();

async function main() {
  console.log('Seeding Inventory Data...');

  const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } });
  if (!adminUser) {
    console.log('No ADMIN user found.');
    return;
  }

  // 1. Decal giấy
  const item1 = await db.inventoryItem.create({
    data: {
      itemCode: 'VT-DCG-001',
      name: 'Decal giấy 32x35',
      category: 'DECAL',
      materialType: 'DECAL_GIAY',
      unit: 'SHEET',
      currentStock: 5000,
      availableStock: 5000,
      minStock: 500,
      standardCost: 1500,
      createdById: adminUser.id,
      status: 'ACTIVE'
    }
  });

  await db.inventoryTransaction.create({
    data: {
      transactionCode: `IN-${Date.now()}-1`,
      itemId: item1.id,
      type: 'INBOUND',
      quantity: 5000,
      unitCost: 1500,
      totalCost: 1500 * 5000,
      stockBefore: 0,
      stockAfter: 5000,
      referenceType: 'OTHER',
      reason: 'Nhập kho ban đầu',
      createdById: adminUser.id
    }
  });

  // 2. Decal nhựa sữa
  const item2 = await db.inventoryItem.create({
    data: {
      itemCode: 'VT-DCNS-001',
      name: 'Decal nhựa sữa 32x35',
      category: 'DECAL',
      materialType: 'DECAL_NHUA_SUA',
      unit: 'SHEET',
      currentStock: 800,
      availableStock: 800,
      minStock: 300,
      standardCost: 2200,
      createdById: adminUser.id,
      status: 'ACTIVE'
    }
  });

  await db.inventoryTransaction.create({
    data: {
      transactionCode: `IN-${Date.now()}-2`,
      itemId: item2.id,
      type: 'INBOUND',
      quantity: 800,
      unitCost: 2200,
      stockBefore: 0,
      stockAfter: 800,
      referenceType: 'OTHER',
      createdById: adminUser.id
    }
  });

  // 3. Màng cán bóng (Low stock)
  const item3 = await db.inventoryItem.create({
    data: {
      itemCode: 'VT-MB-001',
      name: 'Màng cán bóng',
      category: 'LAMINATION_FILM',
      materialType: 'MANG_BONG',
      unit: 'ROLL',
      currentStock: 3,
      availableStock: 3,
      minStock: 5,
      standardCost: 150000,
      createdById: adminUser.id,
      status: 'ACTIVE'
    }
  });

  await db.inventoryTransaction.create({
    data: {
      transactionCode: `ADJ-${Date.now()}-3`,
      itemId: item3.id,
      type: 'ADJUSTMENT_INCREASE',
      quantity: 3,
      stockBefore: 0,
      stockAfter: 3,
      reason: 'Tồn đầu kỳ',
      referenceType: 'MANUAL_ADJUSTMENT',
      createdById: adminUser.id
    }
  });

  // 4. Màng cán mờ (Out of stock)
  const item4 = await db.inventoryItem.create({
    data: {
      itemCode: 'VT-MM-001',
      name: 'Màng cán mờ',
      category: 'LAMINATION_FILM',
      materialType: 'MANG_MO',
      unit: 'ROLL',
      currentStock: 0,
      availableStock: 0,
      minStock: 5,
      standardCost: 160000,
      createdById: adminUser.id,
      status: 'ACTIVE'
    }
  });

  // 5. Dao bế
  const item5 = await db.inventoryItem.create({
    data: {
      itemCode: 'VT-DB-001',
      name: 'Dao bế tròn 5cm',
      category: 'DIE_CUT_KNIFE',
      materialType: 'KHAC',
      unit: 'PCS',
      currentStock: 2,
      availableStock: 2,
      minStock: 1,
      standardCost: 500000,
      createdById: adminUser.id,
      status: 'ACTIVE'
    }
  });

  console.log('Seed done!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
