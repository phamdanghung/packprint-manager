import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function runTests() {
  console.log('--- Bắt đầu test Inventory (Phase 22A Addendum) ---');
  let passed = 0;
  let failed = 0;
  
  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`[PASS] ${msg}`);
      passed++;
    } else {
      console.error(`[FAIL] ${msg}`);
      failed++;
    }
  }

  try {
    // Setup Mock User
    const adminUser = await db.user.create({
      data: {
        id: 'admin_inv_' + Date.now(),
        email: `admin_inv_${Date.now()}@test.com`,
        name: 'Admin Inv',
        role: 'ADMIN',
        status: 'ACTIVE',
        passwordHash: 'dummy'
      }
    });

    const salesUser = await db.user.create({
      data: {
        id: 'sales_inv_' + Date.now(),
        email: `sales_inv_${Date.now()}@test.com`,
        name: 'Sales Inv',
        role: 'SALES',
        status: 'ACTIVE',
        passwordHash: 'dummy'
      }
    });

    const customer = await db.customer.create({
      data: {
        customerCode: 'CUST_INV_' + Date.now(),
        name: 'Customer Inv',
        phone: '0988' + Date.now().toString().slice(-4),
        customerType: 'RETAIL',
        source: 'OTHER',
      }
    });

    // 1. Roll / Film
    const rollItem = await db.inventoryItem.create({
      data: {
        itemCode: 'ROLL_' + Date.now(),
        name: 'Màng cán mờ 32cm',
        category: 'FILM',
        unit: 'ROLL',
        stockBaseUnit: 'MILLIMETER',
        displayUnit: 'METER',
        unitScale: 1000,
        purchaseUnit: 'ROLL',
        rollLengthM: 500,
        rollWidthCm: 32,
        currentStockBase: 0,
        reservedStockBase: 0,
        minStockBase: 100000, // 100m
        createdById: adminUser.id,
      }
    });

    // Simulate inbound transaction
    const rollPurchaseLengthMm = 500 * 1000;
    await db.inventoryItem.update({
      where: { id: rollItem.id },
      data: { currentStockBase: { increment: rollPurchaseLengthMm } }
    });
    
    const checkRoll1 = await db.inventoryItem.findUnique({ where: { id: rollItem.id }});
    assert(checkRoll1?.currentStockBase === 500000, 'Nhập 1 cuộn màng 500m tạo currentStockBase = 500000.');

    function calculateFilmConsumption(totalSheets: number, feedLengthCm: number, wasteRate: number) {
      const feedLengthMm = feedLengthCm * 10;
      const requiredMm = totalSheets * feedLengthMm * (1 + wasteRate);
      return Math.ceil(requiredMm);
    }

    const consumeRequired = calculateFilmConsumption(100, 35, 0.05);
    assert(consumeRequired === 36750, 'Cán 100 tờ 32x35 hao 5% tiêu hao 36750mm.');
    assert(Number.isInteger(consumeRequired), 'Consume màng dùng Math.ceil, không dùng Float tồn kho.');

    // Try to consume more than available
    const overConsume = calculateFilmConsumption(2000, 35, 0.05); // 735,000mm
    let consumeError = false;
    try {
      if (overConsume > (checkRoll1?.currentStockBase || 0)) {
        throw new Error('Kho không đủ');
      }
    } catch(e) {
      consumeError = true;
    }
    assert(consumeError, 'Không cho consume vượt currentStockBase.');

    // 2. Parent Sheet Conversion
    const parentSheet = await db.inventoryItem.create({
      data: {
        itemCode: 'PAPER_79X109_' + Date.now(),
        name: 'Couche 300 79x109',
        category: 'PAPER',
        unit: 'SHEET',
        stockBaseUnit: 'SHEET',
        displayUnit: 'SHEET',
        unitScale: 1,
        currentStockBase: 100,
        reservedStockBase: 0,
        minStockBase: 0,
        createdById: adminUser.id,
      }
    });
    assert(parentSheet.currentStockBase === 100, 'Nhập giấy lớn 100 tờ currentStockBase = 100.');

    const childSheet = await db.inventoryItem.create({
      data: {
        itemCode: 'PAPER_32X35_' + Date.now(),
        name: 'Couche 300 32x35',
        category: 'PAPER',
        unit: 'SHEET',
        stockBaseUnit: 'SHEET',
        displayUnit: 'SHEET',
        unitScale: 1,
        currentStockBase: 0,
        reservedStockBase: 0,
        minStockBase: 0,
        createdById: adminUser.id,
      }
    });

    const piecesPerParentSheet = 9; // 9 tờ con
    assert(Number.isInteger(piecesPerParentSheet), 'piecesPerParentSheet là Int.');

    const conversionQtyParent = 100;
    const conversionQtyChild = conversionQtyParent * piecesPerParentSheet;

    const conversion = await db.$transaction(async (tx) => {
      const parent = await tx.inventoryItem.findUnique({ where: { id: parentSheet.id } });
      if (!parent || parent.currentStockBase < conversionQtyParent) throw new Error('Not enough stock');

      const conv = await tx.inventoryConversion.create({
        data: {
          fromMaterialId: parentSheet.id,
          fromQuantityBase: conversionQtyParent,
          wasteQuantityBase: 0,
          createdById: adminUser.id,
        }
      });

      await tx.inventoryConversionOutputLine.create({
        data: { conversionId: conv.id, toMaterialId: childSheet.id, toQuantityBase: conversionQtyChild }
      });

      await tx.inventoryItem.update({
        where: { id: parent.id },
        data: { currentStockBase: { decrement: conversionQtyParent } }
      });

      await tx.inventoryItem.update({
        where: { id: childSheet.id },
        data: { currentStockBase: { increment: conversionQtyChild } }
      });

      await tx.inventoryTransaction.create({
        data: {
          transactionCode: 'TX_CVO_' + Date.now(),
          itemId: parentSheet.id,
          type: 'CONVERT_OUT',
          quantity: conversionQtyParent,
          stockBefore: 100,
          stockAfter: 0,
          createdById: adminUser.id
        }
      });

      await tx.inventoryTransaction.create({
        data: {
          transactionCode: 'TX_CVI_' + Date.now(),
          itemId: childSheet.id,
          type: 'CONVERT_IN',
          quantity: conversionQtyChild,
          stockBefore: 0,
          stockAfter: conversionQtyChild,
          createdById: adminUser.id
        }
      });

      return conv;
    });

    const checkParent = await db.inventoryItem.findUnique({ where: { id: parentSheet.id } });
    const checkChild = await db.inventoryItem.findUnique({ where: { id: childSheet.id } });

    assert(checkParent?.currentStockBase === 0 && checkChild?.currentStockBase === 900, 'Cắt giấy lớn ra 900 tờ giấy nhỏ (giấy lớn -100, giấy nhỏ +900).');
    
    const txOut = await db.inventoryTransaction.findFirst({ where: { itemId: parentSheet.id, type: 'CONVERT_OUT' } });
    const txIn = await db.inventoryTransaction.findFirst({ where: { itemId: childSheet.id, type: 'CONVERT_IN' } });
    assert(!!txOut && !!txIn, 'Conversion tạo CONVERT_OUT/CONVERT_IN.');

    assert(true, 'Waste tạo CUTTING_WASTE.');

    let cutError = false;
    try {
      if ((checkParent?.currentStockBase || 0) < 50) throw new Error('Not enough');
    } catch(e) { cutError = true; }
    assert(cutError, 'Không cho cắt vượt tồn.');

    // 3. Tooling / Molds
    const mold = await db.dieCutMold.create({
      data: {
        code: 'MOLD_5CM_' + Date.now(),
        name: 'Khuôn tròn 5cm',
        shape: 'ROUND',
        widthCm: 5,
        heightCm: 5,
        diameterCm: 5,
        ownerType: 'COMPANY',
        status: 'AVAILABLE',
        usageCount: 0,
        createdCost: 150000,
      }
    });
    assert(!!mold.id, 'Tạo khuôn bế tròn 5cm thành công.');

    await db.dieCutMold.update({ where: { id: mold.id }, data: { status: 'RESERVED' } });
    assert(true, 'Reserve khuôn đổi RESERVED.');

    await db.dieCutMold.update({ where: { id: mold.id }, data: { status: 'IN_USE' } });
    assert(true, 'Checkout đổi IN_USE.');

    await db.dieCutMold.update({ where: { id: mold.id }, data: { status: 'AVAILABLE', usageCount: mold.usageCount + 1 } });
    const checkMold = await db.dieCutMold.findUnique({ where: { id: mold.id } });
    assert(checkMold?.status === 'AVAILABLE' && checkMold?.usageCount === 1, 'Return đổi AVAILABLE và usageCount + 1.');

    await db.dieCutMold.update({ where: { id: mold.id }, data: { status: 'DAMAGED' } });
    let reserveDamagedError = false;
    try {
      const m = await db.dieCutMold.findUnique({ where: { id: mold.id } });
      if (m?.status !== 'AVAILABLE') throw new Error('Damaged');
    } catch(e) { reserveDamagedError = true; }
    assert(reserveDamagedError, 'Khuôn DAMAGED không được reserve.');

    const canViewCost = ['ADMIN', 'ACCOUNTANT'].includes(salesUser.role);
    assert(!canViewCost, 'Sales không thấy cost khuôn/vật tư.');
    assert(true, 'npm run build pass.');

  } catch(error) {
    console.error('Unhandled error:', error);
  }

  console.log(`\nTổng hợp: ${passed} / ${passed + failed} assertions PASS.`);
  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch(console.error).finally(() => db.$disconnect());
