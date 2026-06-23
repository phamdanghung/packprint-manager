import { db } from '../src/lib/db';
import {
  createDieCutMachineConfig,
  updateDieCutMachineConfig,
  toggleDieCutMachineConfigStatus,
  getDieCutMachineConfigs,
  getActiveDieCutMachineOptionsForQuote
} from '../src/lib/diecut-machine-actions';
import { calculateDigitalLabelQuotePreviewAction } from '../src/lib/quote-actions';
import { Role } from '../src/lib/pricing/shared/types';

async function runTests() {
  console.log('--- TESTING DYNAMIC DIE-CUT MACHINE CONFIGS ---');
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

  // 1. Setup mock users
  const testUsers: Record<string, string> = {};
  const roles: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'];

  await db.user.deleteMany({
    where: { email: { startsWith: 'test_diecut_' } }
  });

  for (const r of roles) {
    const user = await db.user.create({
      data: {
        email: `test_diecut_${r.toLowerCase()}@test.com`,
        passwordHash: 'dummy',
        name: `Test Diecut ${r}`,
        role: r,
        status: 'ACTIVE'
      }
    });
    testUsers[r] = user.id;
  }

  // Setup basic material for calculations
  const material = await db.material.create({
    data: {
      materialCode: 'TEST_DIECUT_MAT',
      name: 'Test Diecut Material',
      basePrice: 2000,
      unit: 'Tờ',
      materialType: 'DECAL'
    }
  });

  // Ensure fresh start by cleaning up previous TEST_DIECUT_* configs
  await db.dieCutMachineConfig.deleteMany({
    where: {
      OR: [
        { machineCode: { startsWith: 'TEST_DIECUT_' } },
        { sheetSizeCode: { startsWith: 'test_diecut_' } }
      ]
    }
  });

  try {
    // 2. Test Authorization & Permission Enforcement
    console.log('\n--- 2. Testing Authorization ---');
    
    // ADMIN can create
    process.env.TEST_USER_ID = testUsers['ADMIN'];
    const createResAdmin = await createDieCutMachineConfig({
      machineCode: 'TEST_DIECUT_M1',
      machineName: 'Test Machine 1',
      sheetSizeCode: 'test_diecut_32x35',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5,
      note: 'Admin test'
    });
    assert(createResAdmin.success, 'ADMIN is allowed to create machine config');
    const configId1 = createResAdmin.data?.id;

    // ACCOUNTANT cannot create
    process.env.TEST_USER_ID = testUsers['ACCOUNTANT'];
    const createResAcc = await createDieCutMachineConfig({
      machineCode: 'TEST_DIECUT_M2',
      machineName: 'Test Machine 2',
      sheetSizeCode: 'test_diecut_32x35',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5
    });
    assert(!createResAcc.success && createResAcc.error?.includes('Bạn không có quyền'), 'ACCOUNTANT is blocked from creating config');

    // ACCOUNTANT can read
    try {
      const allConfigsAcc = await getDieCutMachineConfigs();
      assert(allConfigsAcc.length > 0, 'ACCOUNTANT is allowed to read config list');
    } catch (e: any) {
      assert(false, `ACCOUNTANT read config failed: ${e.message}`);
    }

    // SALES cannot read configs list via management action
    process.env.TEST_USER_ID = testUsers['SALES'];
    let salesReadFailed = false;
    try {
      await getDieCutMachineConfigs();
    } catch (e: any) {
      salesReadFailed = true;
      assert(e.message.includes('Bạn không có quyền'), 'SALES is blocked from reading management config list');
    }
    if (!salesReadFailed) assert(false, 'SALES was allowed to read management configs list');

    // SALES can read active options for quote
    try {
      const activeOptionsSales = await getActiveDieCutMachineOptionsForQuote();
      assert(activeOptionsSales.length > 0, 'SALES is allowed to read quote-safe active machine options');
    } catch (e: any) {
      assert(false, `SALES quote-safe read failed: ${e.message}`);
    }


    // 3. Test Technical & Size Validations
    console.log('\n--- 3. Testing Technical Validations ---');
    process.env.TEST_USER_ID = testUsers['ADMIN'];
    
    // Width > sheet width
    const invWidthRes = await createDieCutMachineConfig({
      machineCode: 'TEST_DIECUT_M2',
      machineName: 'Test Machine 2',
      sheetSizeCode: 'test_diecut_32x35',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 33, // Invalid
      usableHeightCm: 31.5
    });
    assert(!invWidthRes.success && invWidthRes.error?.includes('không được lớn hơn chiều rộng khổ in'), 'usableWidthCm > sheetWidthCm is rejected');

    // Dimension <= 0
    const zeroRes = await createDieCutMachineConfig({
      machineCode: 'TEST_DIECUT_M2',
      machineName: 'Test Machine 2',
      sheetSizeCode: 'test_diecut_32x35',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 0, // Invalid
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5
    });
    assert(!zeroRes.success && zeroRes.error?.includes('phải lớn hơn 0'), 'sheetWidthCm <= 0 is rejected');


    // 4. Test Constraints & Unique Duplicate Checks
    console.log('\n--- 4. Testing Unique Constraint ---');
    
    // Duplicate create
    const dupCreateRes = await createDieCutMachineConfig({
      machineCode: 'TEST_DIECUT_M1', // duplicate
      machineName: 'Dup Machine',
      sheetSizeCode: 'test_diecut_32x35', // duplicate
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5
    });
    assert(!dupCreateRes.success && dupCreateRes.error?.includes('đã tồn tại'), 'Duplicate machineCode + sheetSizeCode in create is blocked');

    // Update check duplicate exclude current record
    const selfUpdateRes = await updateDieCutMachineConfig(configId1!, {
      machineName: 'Test Machine 1 Updated Name',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5,
      note: 'Updated successfully',
      machineCode: 'TEST_DIECUT_M1', // Keep same
      sheetSizeCode: 'test_diecut_32x35' // Keep same
    });
    assert(selfUpdateRes.success, 'Updating current record with same machineCode + sheetSizeCode is allowed (self excluded)');

    // Duplicate check on update with different record
    // First create M2
    const createM2 = await createDieCutMachineConfig({
      machineCode: 'TEST_DIECUT_M2',
      machineName: 'Test Machine 2',
      sheetSizeCode: 'test_diecut_32x35',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5
    });
    const configId2 = createM2.data?.id;

    // Try to update M2 to M1 (duplicate)
    const dupUpdateRes = await updateDieCutMachineConfig(configId2!, {
      machineName: 'Updated to M1',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5,
      machineCode: 'TEST_DIECUT_M1', // Duplicate
      sheetSizeCode: 'test_diecut_32x35' // Duplicate
    });
    assert(!dupUpdateRes.success && dupUpdateRes.error?.includes('đã tồn tại ở bản ghi khác'), 'Updating to duplicate machineCode + sheetSizeCode of another record is blocked');


    // 5. Test Calculation Engine Dynamic Scaling
    console.log('\n--- 5. Testing Pricing Engine Integration ---');
    
    const quoteInput = {
      materialId: material.id,
      quantity: 1000,
      labelShape: 'CIRCLE',
      diameterCm: 5,
      gapMm: 1,
      profitRate: 30,
      vatRate: 8,
      printingPricePerSheet: 1000,
      dieCutMachine: 'TEST_DIECUT_M1',
      sheetSize: 'test_diecut_32x35',
      dieCutType: 'SHAPE'
    };

    // Calculate with 30.5 x 31.5
    const calcRes1 = await calculateDigitalLabelQuotePreviewAction(quoteInput);
    assert(calcRes1.success && !(calcRes1.data as any)?.blockPreview, 'Calculation runs successfully with TEST_DIECUT_M1 (30.5x31.5)');
    if (calcRes1.success && calcRes1.data) {
      const b = (calcRes1.data as any).internalBreakdown;
      assert(b.usableWidthCm === 30.5 && b.usableHeightCm === 31.5, 'Pricing engine picked up the configured usable size (30.5 x 31.5 cm)');
    }

    // Update config to 30.6 x 31.6
    const updateScaleRes = await updateDieCutMachineConfig(configId1!, {
      machineName: 'Test Machine 1 Scale',
      sheetLabel: 'Test 32x35',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.6,
      usableHeightCm: 31.6,
      machineCode: 'TEST_DIECUT_M1',
      sheetSizeCode: 'test_diecut_32x35'
    });
    assert(updateScaleRes.success, 'Successfully scaled usable size to 30.6 x 31.6');

    // Recalculate and verify scaling
    const calcRes2 = await calculateDigitalLabelQuotePreviewAction(quoteInput);
    assert(calcRes2.success && !(calcRes2.data as any)?.blockPreview, 'Recalculation runs successfully');
    if (calcRes2.success && calcRes2.data) {
      const b = (calcRes2.data as any).internalBreakdown;
      assert(b.usableWidthCm === 30.6 && b.usableHeightCm === 31.6, 'Pricing engine dynamic scaled: correctly loaded updated config (30.6 x 31.6 cm)');
    }

    // 6. Test Empty/Missing Config Block logic
    console.log('\n--- 6. Testing Missing Config Block ---');
    
    // Toggle status to inactive
    const toggleRes = await toggleDieCutMachineConfigStatus(configId1!);
    assert(toggleRes.success && toggleRes.data?.isActive === false, 'Deactivated TEST_DIECUT_M1 configuration');

    // Calculate with deactivated config
    const calcRes3 = await calculateDigitalLabelQuotePreviewAction(quoteInput);
    assert(calcRes3.success && (calcRes3.data as any)?.blockPreview === true, 'Deactivated config blocks preview computation');
    if (calcRes3.success && calcRes3.data) {
      assert(calcRes3.data.safeWarnings.includes('MISSING_DIECUT_MACHINE_CONFIG'), 'Response contains MISSING_DIECUT_MACHINE_CONFIG warning');
    }

  } finally {
    // 7. Cleanup
    console.log('\n--- 7. Cleaning up test records ---');
    
    await db.user.deleteMany({
      where: { id: { in: Object.values(testUsers) } }
    });
    await db.material.delete({
      where: { id: material.id }
    });
    
    // Strictly delete only configs starting with TEST_DIECUT_* or test_diecut_
    const deleteConfigs = await db.dieCutMachineConfig.deleteMany({
      where: {
        OR: [
          { machineCode: { startsWith: 'TEST_DIECUT_' } },
          { sheetSizeCode: { startsWith: 'test_diecut_' } }
        ]
      }
    });
    console.log(`Deleted ${deleteConfigs.count} test configs.`);
    console.log('✅ Cleanup successful.');
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
