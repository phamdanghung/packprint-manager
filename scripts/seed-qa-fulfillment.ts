import { db } from '../src/lib/db';
import { createConversionForOrder } from '../src/lib/inventory-conversion-actions';

async function seedQA() {
  console.log('--- SEEDING QA DATA cho Fulfillment ---');

  const admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
  if (!admin) {
    console.error('Không tìm thấy ADMIN');
    return;
  }

  const customer = await db.customer.findFirst();
  if (!customer) {
    console.error('Không tìm thấy KH');
    return;
  }

  // 1. Tạo Parent & Child InventoryItem
  const parent = await db.inventoryItem.create({
    data: {
      itemCode: 'MAT-PARENT-QA-' + Date.now(),
      name: 'Giấy Mẹ QA (79x109)',
      category: 'PAPER',
      materialType: 'PAPER',
      unit: 'SHEET',
      stockBaseUnit: 'SHEET',
      displayUnit: 'SHEET',
      unitScale: 1,
      minStockBase: 100,
      currentStockBase: 500,
      standardCost: 10000,
      createdById: admin.id
    }
  });

  const child = await db.inventoryItem.create({
    data: {
      itemCode: 'MAT-CHILD-QA-' + Date.now(),
      name: 'Giấy Con QA (39x54)',
      category: 'PAPER',
      materialType: 'PAPER',
      unit: 'SHEET',
      stockBaseUnit: 'SHEET',
      displayUnit: 'SHEET',
      unitScale: 1,
      minStockBase: 100,
      currentStockBase: 0,
      standardCost: 3000,
      createdById: admin.id
    }
  });

  // 2. Tạo Recipe
  await db.materialConversionRecipe.create({
    data: {
      fromMaterialId: parent.id,
      toMaterialId: child.id,
      piecesPerParentSheet: 4, // 1 mẹ = 4 con -> 100 mẹ = 400 con (Dư = 0)
      isActive: true
    }
  });

  // 3. Tạo Order
  const orderCode = 'ORD-QA-' + Date.now();
  const order = await db.order.create({
    data: {
      orderCode,
      customerId: customer.id,
      totalAmount: 1500000,
      paymentStatus: 'UNPAID',
      status: 'DRAFT',
      createdById: admin.id,
      items: {
        create: {
          productType: 'BOX',
          name: 'Hộp QA Test Cắt Giấy',
          totalSheets: 400, // Cần 400 tờ con
          printSheets: 400,
          materialId: child.id,
          labelShape: 'RECTANGLE',
          widthCm: 10,
          heightCm: 10,
          quantity: 400,
          wasteSheets: 0,
          materialCost: 0,
          laminationCost: 0,
          dieCutCost: 0,
          printingCost: 0,
          fileHandlingFee: 0,
          otherFee: 0,
          costAmount: 0,
          saleAmount: 0,
          dieCutType: 'SHAPE',
          labelsPerSheet: 1
        }
      }
    }
  });

  console.log(`\n================================`);
  console.log(`THÀNH CÔNG! Đã tạo dữ liệu QA.`);
  console.log(`================================`);
  console.log(`👉 Link kiểm tra Order Detail: http://localhost:3000/dashboard/orders/${order.id}`);
  console.log(`- Để test Production Detail, vui lòng duyệt Order này -> Chuyển sang Production Job -> Vào Production Detail xem block "Vật tư & Gợi ý cắt giấy".`);
}

seedQA()
  .catch(e => console.error(e))
  .finally(() => process.exit(0));
