import { calculateDigitalLabelQuotePreviewAction } from '../src/lib/quote-actions';
import { db } from '../src/lib/db';
import { Role } from '../src/lib/pricing/shared/types';

async function runTests() {
  console.log('--- TESTING DIGITAL LABEL UI INTEGRATION ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  // 1. Setup mock users and data
  const testUsers: Record<Role, string> = {} as any;
  const roles: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];

  await db.user.deleteMany({
    where: { email: { startsWith: 'test_' } }
  });
  await db.material.deleteMany({
    where: { materialCode: 'TEST_MAT_LABEL' }
  });

  for (const r of roles) {
    const user = await db.user.create({
      data: {
        email: `test_${r.toLowerCase()}@test.com`,
        passwordHash: 'dummy',
        name: `Test ${r}`,
        role: r,
        status: 'ACTIVE'
      }
    });
    testUsers[r] = user.id;
  }

  // Setup test config
  await db.dieCutMachineConfig.deleteMany({
    where: {
      OR: [
        { machineCode: 'TEST_DIECUT_GRAPHTEC' },
        { sheetSizeCode: 'test_diecut_32x35' }
      ]
    }
  });

  await db.dieCutMachineConfig.create({
    data: {
      machineCode: 'TEST_DIECUT_GRAPHTEC',
      machineName: 'Graphtec Test Integration',
      sheetSizeCode: 'test_diecut_32x35',
      sheetLabel: '32 x 35 cm',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5,
      isActive: true
    }
  });

  // Setup basic material so it doesn't fail on missing
  const material = await db.material.create({
    data: {
      materialCode: 'TEST_MAT_LABEL',
      name: 'Test Material',
      basePrice: 2000, // per sheet
      unit: 'Tờ',
      materialType: 'DECAL'
    }
  });

  const baseInput = {
    materialId: material.id,
    quantity: 1000,
    labelShape: 'CIRCLE',
    diameterCm: 5,
    gapCm: 0.1,
    profitRate: 0.3, // 30% -> 3000 basis points
    vatRate: 0.08,   // 8% -> 800 basis points
    printingPricePerSheet: 1000,
    dieCutMachine: 'TEST_DIECUT_GRAPHTEC',
    sheetSize: 'test_diecut_32x35'
  };

  try {
    // 2. Test Invalid Input
    process.env.TEST_USER_ID = testUsers['ADMIN'];
    const invalidRes = await calculateDigitalLabelQuotePreviewAction({ ...baseInput, quantity: 0 });
    assert(!invalidRes.success && invalidRes.error?.includes('Số lượng phải lớn hơn 0'), "Invalid input (qty <= 0) rejected by action");

    // 3. Test Missing Config
    const missingRes = await calculateDigitalLabelQuotePreviewAction({ ...baseInput, materialId: 'invalid-id' });
    assert(missingRes.success && !!missingRes.data?.safeWarnings.includes('MISSING_MATERIAL_CONFIG'), "Missing material config triggers warning in response");

    // 4. RBAC Tests
    for (const role of roles) {
      process.env.TEST_USER_ID = testUsers[role];
      const res = await calculateDigitalLabelQuotePreviewAction(baseInput);
      
      assert(res.success, `Action ran successfully for ${role}`);
      if (!res.success) continue;

      const data: any = res.data;
      
      // All roles must receive safe fields
      assert('sellingPrice' in data && 'unitPrice' in data && 'totalAmount' in data, `${role} nhận các trường cơ bản (sellingPrice, unitPrice, totalAmount)`);

      const canViewInternal = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role);

      if (canViewInternal) {
        assert('internalTotalCost' in data && 'internalBreakdown' in data, `${role} nhận full internal breakdown`);
      } else {
        const hasLeakedKeys = 
          'internalMaterialCost' in data || 
          'internalPrintCost' in data || 
          'internalFinishingCost' in data || 
          'internalDieCutCost' in data || 
          'internalCuttingCost' in data || 
          'internalTotalCost' in data || 
          'markupAmount' in data || 
          'grossProfit' in data || 
          'grossMarginPercent' in data || 
          'internalBreakdown' in data;
        assert(!hasLeakedKeys, `${role} KHÔNG bị leak internal fields (cost, profit, breakdown)`);
        assert('salesBreakdown' in data, `${role} nhận được salesBreakdown`);
      }

      // Check Int rule
      assert(Number.isInteger(data.sellingPrice) && Number.isInteger(data.totalAmount), `${role} money output là Integer`);
    }

    // 5. Check effectiveItemsPerSheet calculations
    process.env.TEST_USER_ID = testUsers['ADMIN'];
    const calcRes = await calculateDigitalLabelQuotePreviewAction(baseInput);
    if (calcRes.success && calcRes.data) {
      const b = (calcRes.data as any).internalBreakdown;
      assert(b.effectiveItemsPerSheet === 30, `effectiveItemsPerSheet = 30 (chính sách Tem Tròn 5cm <= 1000 con)`);
      assert(b.totalSheets === Math.ceil(1000 / 30), `totalSheets = ceil(quantity / effectiveItemsPerSheet)`);
    }

  } finally {
    // Cleanup
    await db.user.deleteMany({
      where: { id: { in: Object.values(testUsers) } }
    });
    await db.material.delete({
      where: { id: material.id }
    });
    await db.dieCutMachineConfig.deleteMany({
      where: {
        OR: [
          { machineCode: { startsWith: 'TEST_DIECUT_' } },
          { sheetSizeCode: { startsWith: 'test_diecut_' } }
        ]
      }
    });
    console.log('\n[INFO] Cleanup successful.');
  }

  console.log(`\nTESTS COMPLETED. PASS: ${passCount}, FAIL: ${failCount}`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
