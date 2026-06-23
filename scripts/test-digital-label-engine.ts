import { calculateLayout } from '../src/lib/pricing/digital-label/layout-engine';
import { calculateDigitalLabelQuote } from '../src/lib/pricing/digital-label/digital-label-pricing-engine';
import { DigitalLabelInput } from '../src/lib/pricing/digital-label/types';
import { Role } from '../src/lib/pricing/shared/types';

async function runTests() {
  console.log('--- TESTING DIGITAL LABEL ENGINE (STRICT) ---\n');
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

  // 1. Layout cases
  console.log('--- 1. Layout / Items-per-sheet cases ---');
  const layoutCases = [
    { shape: 'CIRCLE', w: 5, h: 5, q: 1000, target: 30, name: 'Tem tròn 5cm, qty <= 1000' },
    { shape: 'CIRCLE', w: 5, h: 5, q: 1001, target: 34, name: 'Tem tròn 5cm, qty > 1000' },
    { shape: 'RECTANGLE', w: 6.9, h: 7.2, q: 1000, target: 16, name: 'Tem 6.9 x 7.2cm' },
    { shape: 'RECTANGLE', w: 18, h: 4, q: 1000, target: 9, name: 'Tem 18 x 4cm' },
    { shape: 'RECTANGLE', w: 22, h: 5, q: 1000, target: 7, name: 'Tem 22 x 5cm' },
    { shape: 'RECTANGLE', w: 12, h: 5, q: 1000, target: 12, name: 'Tem 12 x 5cm' },
    { shape: 'RECTANGLE', w: 5, h: 19, q: 1000, target: 7, name: 'Tem 5 x 19cm' },
    { shape: 'CIRCLE', w: 2, h: 2, q: 1000, target: 144, name: 'Tem tròn 2cm' },
  ];

  for (const c of layoutCases) {
    const res = calculateLayout(c.shape as any, c.w, c.h, 0.1, c.q, undefined, 30.5, 31.5);
    assert(
      res.effectiveItemsPerSheet === c.target,
      `${c.name} - Target: ${c.target}, Got: ${res.effectiveItemsPerSheet} (Auto: ${res.autoPackedItemsPerSheet})`
    );
  }

  // 2. Calculation cases
  console.log('\n--- 2. Calculation cases ---');
  const baseInput: DigitalLabelInput = {
    role: 'ADMIN',
    quantity: 1000,
    labelShape: 'CIRCLE',
    widthCm: 5,
    heightCm: 5, // Target 30
    gapCm: 0.1,
    vatBasisPoints: 800, // 8%
    markupBasisPoints: 3000, // 30%
    materialPricePerSheet: 3000,
    printingPricePerSheet: 1000,
    laminationPricePerSheet: 500,
    dieCutPricePerSheet: 800,
    fileProcessingFee: 50000,
    sheetWidthCm: 32,
    sheetHeightCm: 35,
    usableWidthCm: 30.5,
    usableHeightCm: 31.5
  };

  const adminRes: any = calculateDigitalLabelQuote(baseInput);

  assert(
    adminRes.internalBreakdown.effectiveItemsPerSheet === 30,
    `effectiveItemsPerSheet is exactly 30: ${adminRes.internalBreakdown.effectiveItemsPerSheet}`
  );
  
  const expectedSheets = Math.ceil(1000 / 30); // 34
  assert(
    adminRes.internalBreakdown.totalSheets === expectedSheets,
    `totalSheets = ceil(quantity / effectiveItemsPerSheet) : Expected ${expectedSheets}, Got ${adminRes.internalBreakdown.totalSheets}`
  );

  const expectedTotalItems = expectedSheets * 30; // 34 * 30 = 1020
  assert(
    adminRes.internalBreakdown.totalPrintedItems === expectedTotalItems,
    `totalPrintedItems = totalSheets * effectiveItemsPerSheet : Expected ${expectedTotalItems}, Got ${adminRes.internalBreakdown.totalPrintedItems}`
  );

  assert(
    adminRes.internalBreakdown.wasteItems === expectedTotalItems - 1000,
    `wasteItems correct : Got ${adminRes.internalBreakdown.wasteItems}`
  );

  const exceedRes = calculateDigitalLabelQuote({ ...baseInput, labelShape: 'RECTANGLE', widthCm: 18, heightCm: 4 });
  assert(
    exceedRes.safeWarnings.includes('AUTO_PACK_EXCEEDS_PRODUCTION_POLICY'),
    `Warning AUTO_PACK_EXCEEDS_PRODUCTION_POLICY included for 18x4 (Auto: 10, Policy: 9).`
  );

  // Override items per sheet test
  const overrideRes: any = calculateDigitalLabelQuote({ ...baseInput, overrideItemsPerSheet: 25 });
  assert(
    overrideRes.internalBreakdown.effectiveItemsPerSheet === 25,
    `Override items per sheet is respected.`
  );
  assert(
    overrideRes.safeWarnings.includes('ITEMS_PER_SHEET_OVERRIDDEN'),
    `Warning ITEMS_PER_SHEET_OVERRIDDEN included.`
  );
  try {
    calculateDigitalLabelQuote({ ...baseInput, overrideItemsPerSheet: 0 });
    assert(false, "Should reject override <= 0");
  } catch (e) {
    assert(true, "Override <= 0 rejected");
  }

  // Float check
  const isInt = (n: any) => typeof n === 'number' && Number.isInteger(n);
  assert(
    isInt(adminRes.sellingPrice) && isInt(adminRes.vatAmount) && isInt(adminRes.totalAmount) && isInt(adminRes.internalTotalCost),
    "Money fields contain no decimals"
  );

  // Validation
  try { calculateDigitalLabelQuote({ ...baseInput, quantity: 0 }); assert(false, ""); } catch { assert(true, "Reject qty <= 0"); }
  try { calculateDigitalLabelQuote({ ...baseInput, widthCm: 0 }); assert(false, ""); } catch { assert(true, "Reject width <= 0"); }
  try { calculateDigitalLabelQuote({ ...baseInput, heightCm: 0 }); assert(false, ""); } catch { assert(true, "Reject height <= 0"); }

  // Missing config
  const missingRes: any = calculateDigitalLabelQuote({ ...baseInput, materialPricePerSheet: undefined as any });
  assert(missingRes.safeWarnings.includes('MISSING_MATERIAL_CONFIG'), "Missing material config triggers warning");

  // 3. RBAC cases (All 7 roles)
  console.log('\n--- 3. RBAC cases ---');
  
  const canViewRoles: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT'];
  const cannotViewRoles: Role[] = ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];

  for (const role of canViewRoles) {
    const res: any = calculateDigitalLabelQuote({ ...baseInput, role });
    assert('internalTotalCost' in res && 'grossProfit' in res, `${role} CAN see internal costs`);
  }

  for (const role of cannotViewRoles) {
    const res: any = calculateDigitalLabelQuote({ ...baseInput, role });
    const hasKeys = 
      'internalMaterialCost' in res || 
      'internalPrintCost' in res || 
      'internalFinishingCost' in res || 
      'internalDieCutCost' in res || 
      'internalCuttingCost' in res || 
      'internalTotalCost' in res || 
      'markupAmount' in res || 
      'grossProfit' in res || 
      'grossMarginPercent' in res || 
      'internalBreakdown' in res;
    assert(!hasKeys, `${role} CANNOT see ANY internal costs (keys fully omitted)`);
    assert('sellingPrice' in res && 'unitPrice' in res, `${role} CAN see selling price`);
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
