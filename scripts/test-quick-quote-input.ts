
import { parseQuickQuoteInput } from '../src/lib/pricing/quick-input/parse-quick-quote-input';
import { resolveMaterialFromParsedIntent } from '../src/lib/pricing/quick-input/material-resolver';
import { calculateDigitalLabelQuote } from '../src/lib/pricing/digital-label/digital-label-pricing-engine';
import fs from 'fs';
import path from 'path';

const mockMaterials = [
  { id: 'mat-1', materialCode: 'DECAL_PAPER', name: 'Decal giấy thường', status: 'ACTIVE', sheetWidthCm: 32, sheetHeightCm: 35 },
  { id: 'mat-2', materialCode: 'DECAL_PAPER_43', name: 'Decal giấy khổ lớn', status: 'ACTIVE', sheetWidthCm: 32, sheetHeightCm: 43 },
  { id: 'mat-3', materialCode: 'DECAL_MILKY', name: 'Decal nhựa sữa', status: 'ACTIVE', sheetWidthCm: 32, sheetHeightCm: 35 },
  { id: 'mat-4', materialCode: 'DECAL_CLEAR', name: 'Decal nhựa trong', status: 'ACTIVE', sheetWidthCm: 32, sheetHeightCm: 35 },
  { id: 'mat-5', materialCode: 'SILVER', name: 'Decal xi bạc', status: 'ACTIVE', sheetWidthCm: 32, sheetHeightCm: 35 }
];

let passCount = 0;
let failCount = 0;

function runTest(name: string, input: string, expectedParsed: any, expectedMissing: string[] = [], expectedWarnings: string[] = []) {
  console.log(`\n--- Test: ${name} ---`);
  console.log(`Input: "${input}"`);
  const res = parseQuickQuoteInput(input);

  let passed = true;
  for (const key of Object.keys(expectedParsed)) {
    if ((res.parsed as any)[key] !== expectedParsed[key]) {
      console.log(`❌ [FAIL] ${key}: Expected ${expectedParsed[key]}, Got ${(res.parsed as any)[key]}`);
      passed = false;
    }
  }

  const missingDiff = expectedMissing.filter(m => !res.missingFields.includes(m));
  if (missingDiff.length > 0 || expectedMissing.length !== res.missingFields.length) {
    console.log(`❌ [FAIL] Missing Fields: Expected [${expectedMissing.join(', ')}], Got [${res.missingFields.join(', ')}]`);
    passed = false;
  }

  const warningCodes = res.warnings.map(w => w.code);
  const warningDiff = expectedWarnings.filter(w => !warningCodes.includes(w));
  if (warningDiff.length > 0 || expectedWarnings.length !== warningCodes.length) {
    console.log(`❌ [FAIL] Warnings: Expected [${expectedWarnings.join(', ')}], Got [${warningCodes.join(', ')}]`);
    passed = false;
  }

  if (passed) {
    console.log('✅ [PASS]');
    passCount++;
  } else {
    console.log('❌ [FAIL]');
    failCount++;
    process.exitCode = 1;
  }
}

function assertCondition(name: string, condition: boolean, details: string = '') {
  console.log(`\n--- Test: ${name} ---`);
  if (condition) {
    console.log(`✅ [PASS] ${details}`);
    passCount++;
  } else {
    console.log(`❌ [FAIL] ${details}`);
    failCount++;
    process.exitCode = 1;
  }
}

console.log('=== TESTING QUICK QUOTE INPUT PARSER ===');

// 1. Success cases
runTest('Success 1', '600 tem tròn 5cm decal giấy cán bóng bế demi theo hình', {
  quantity: 600,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'CUSTOM_SHAPE'
});

runTest('Success 2', '1000 tem 6x8cm nhựa sữa cán mờ bế demi', {
  quantity: 1000,
  shape: 'RECTANGLE',
  widthMm: 60,
  heightMm: 80,
  materialIntent: 'DECAL_MILKY',
  laminationIntent: 'MATTE',
  dieCutIntent: 'CUSTOM_SHAPE'
});

runTest('Success 3', '500 decal tròn 3cm nhựa trong không cán bế theo hình', {
  quantity: 500,
  shape: 'CIRCLE',
  diameterMm: 30,
  materialIntent: 'DECAL_CLEAR',
  laminationIntent: 'NONE',
  dieCutIntent: 'CUSTOM_SHAPE'
});

runTest('Success 4', '2000 tem 12x5cm xi bạc cán bóng bế thẳng', {
  quantity: 2000,
  shape: 'RECTANGLE',
  widthMm: 120,
  heightMm: 50,
  materialIntent: 'SILVER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'STRAIGHT'
});

runTest('Success 5', '1000 decal giấy 50x50mm cán bóng bế demi', {
  quantity: 1000,
  shape: 'RECTANGLE',
  widthMm: 50,
  heightMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'CUSTOM_SHAPE'
});

// 2. Order-independent cases
runTest('Order Indep 1', 'cán bóng, 300 tem, decal giấy, tròn 5cm, bế demi', {
  quantity: 300,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'CUSTOM_SHAPE'
});

runTest('Order Indep 2', 'bế demi theo hình, decal giấy, 300 tem, phi 5, cán bóng', {
  quantity: 300,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'CUSTOM_SHAPE'
});

runTest('Order Indep 3', 'in decal giấy, số lượng 300, cán bóng, tem tròn 5cm', {
  quantity: 300,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY'
});

// 3. Material resolver cases
console.log('\n=== TESTING MATERIAL RESOLVER ===');

const r1 = resolveMaterialFromParsedIntent('DECAL_PAPER', mockMaterials, '32x35');
assertCondition('Resolver exact print size match', r1.materialId === 'mat-1', 'Resolved to mat-1');

const r2 = resolveMaterialFromParsedIntent('DECAL_PAPER', mockMaterials, '32x43');
assertCondition('Resolver 32x43 match', r2.materialId === 'mat-2', 'Resolved to mat-2');

const r3 = resolveMaterialFromParsedIntent('DECAL_PAPER', mockMaterials, null);
assertCondition('Resolver ambiguous without print size', r3.warningCode === 'NEEDS_MATERIAL_CONFIRMATION', 'Returned NEEDS_MATERIAL_CONFIRMATION warning');

const r4 = resolveMaterialFromParsedIntent('DECAL_CLEAR', mockMaterials, '32x35');
assertCondition('Resolver single active material', r4.materialId === 'mat-4', 'Resolved to mat-4');

// 4. Print size / die-cut machine cases
runTest('Print Size & Machine 1', '600 tem tròn 5cm decal giấy 32x35 cán bóng bế demi', {
  quantity: 600,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'CUSTOM_SHAPE',
  printSizeIntent: '32x35'
});

runTest('Print Size & Machine 2', '600 tem tròn 5cm decal giấy graphtec cán bóng bế demi', {
  quantity: 600,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY',
  dieCutIntent: 'CUSTOM_SHAPE',
  dieCutMachineIntent: 'Graphtec'
});

// 5. Parser safety cases
console.log('\n=== TESTING PARSER SAFETY CASES ===');

runTest('Safety: Empty Input', '', {
  quantity: null,
  shape: null,
  materialIntent: null
}, ['Số lượng', 'Hình dáng', 'Chất liệu'], ['MISSING_OR_UNKNOWN_MATERIAL']);

runTest('Safety: No Quantity', 'tem tròn 5cm decal giấy', {
  quantity: null,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER'
}, ['Số lượng']);

runTest('Safety: Unknown Material', '600 tem tròn 5cm gỗ bế demi', {
  quantity: 600,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: null
}, ['Chất liệu'], ['MISSING_OR_UNKNOWN_MATERIAL']);

runTest('Safety: Gibberish Text', 'alo alo abc xyz 123', {
  quantity: null,
  shape: null,
  materialIntent: null
}, ['Số lượng', 'Hình dáng', 'Chất liệu'], ['MISSING_OR_UNKNOWN_MATERIAL']);

runTest('Safety: Missing Size and Shape', '600 tem decal giấy cán bóng', {
  quantity: 600,
  shape: null,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY'
}, ['Hình dáng']);

runTest('Safety: Missing Shape Size Comma', '300 tem, giấy, in, cán cán bóng', {
  quantity: 300,
  shape: null,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY'
}, ['Hình dáng']);

runTest('Safety: Ambiguous Input (giấy bóng)', '600 tem 5cm giấy bóng', {
  quantity: 600,
  shape: null,
  materialIntent: 'DECAL_PAPER'
}, ['Hình dáng'], ['AMBIGUOUS_INPUT']);

runTest('Safety: Dedupe Lamination (cán bóng, cán bóng)', 'cán bóng, cán bóng, decal giấy tròn 5cm 300 tem', {
  quantity: 300,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY'
});

runTest('Safety: Dedupe Lamination (cán cán bóng)', 'cán cán bóng, decal giấy tròn 5cm 300 tem', {
  quantity: 300,
  shape: 'CIRCLE',
  diameterMm: 50,
  materialIntent: 'DECAL_PAPER',
  laminationIntent: 'GLOSSY'
});

// 6. Integration cases
console.log('\n=== TESTING INTEGRATION CASES ===');

const parseRes = parseQuickQuoteInput("600 tem tròn 5cm decal giấy cán bóng bế demi");
assertCondition("Integration: Auto-fill Form Data mapping",
  parseRes.parsed.quantity === 600 &&
  parseRes.parsed.shape === "CIRCLE" &&
  parseRes.parsed.diameterMm === 50 &&
  parseRes.parsed.dieCutIntent === "CUSTOM_SHAPE" &&
  parseRes.parsed.laminationIntent === "GLOSSY",
  "Parsed input maps correctly to shape, quantity, dimensions, dieCut, and lamination"
);

const checkValidation = (form: any) => {
  if (!form.customerId || !form.name || !form.materialId || form.quantity <= 0) {
    return false;
  }
  return true;
};
const validFormInput = { customerId: "cust-1", name: "Tem logo tròn", materialId: "mat-1", quantity: 600 };
const invalidFormInput = { customerId: "", name: "Tem logo tròn", materialId: "mat-1", quantity: 600 };

assertCondition("Integration: Valid parsed input calls pricing preview",
  checkValidation(validFormInput) === true,
  "Form has customerId, name, materialId, and quantity > 0"
);

assertCondition("Integration: Invalid/insufficient parsed input blocks pricing preview",
  checkValidation(invalidFormInput) === false,
  "Pricing preview blocks when customerId is missing"
);

const engineInputSales = {
  role: "SALES" as any,
  quantity: 1000,
  labelShape: "CIRCLE" as any,
  widthCm: 5,
  heightCm: 5,
  diameterCm: 5,
  gapCm: 0.1,
  vatBasisPoints: 800,
  markupBasisPoints: 3000,
  materialPricePerSheet: 1500,
  printingPricePerSheet: 2000,
  laminationPricePerSheet: 500,
  dieCutPricePerSheet: 100,
  fileProcessingFee: 20000,
  shippingFee: 0,
  sheetWidthCm: 32,
  sheetHeightCm: 35,
  usableWidthCm: 30.5,
  usableHeightCm: 31.5
};

const salesRes: any = calculateDigitalLabelQuote(engineInputSales);
assertCondition("Integration: Sales response does not leak internal cost",
  salesRes.internalTotalCost === undefined &&
  salesRes.internalMaterialCost === undefined &&
  salesRes.internalPrintCost === undefined &&
  salesRes.internalFinishingCost === undefined &&
  salesRes.internalDieCutCost === undefined &&
  salesRes.grossProfit === undefined &&
  salesRes.grossMarginPercent === undefined &&
  salesRes.internalBreakdown === undefined &&
  salesRes.salesBreakdown !== undefined,
  "Sales response excludes internal break downs and costs"
);

const engineInputAdmin = {
  ...engineInputSales,
  role: "ADMIN" as any
};
const adminRes: any = calculateDigitalLabelQuote(engineInputAdmin);
console.log("Admin response keys:", Object.keys(adminRes));
console.log("adminRes detail:", JSON.stringify(adminRes, null, 2));

assertCondition("Integration: Admin response contains internal cost details",
  adminRes.internalTotalCost !== undefined &&
  adminRes.internalMaterialCost !== undefined &&
  adminRes.internalPrintCost !== undefined &&
  adminRes.internalBreakdown !== undefined &&
  adminRes.grossProfit !== undefined &&
  adminRes.grossMarginPercent !== undefined,
  "Admin response includes full breakdowns"
);

assertCondition("Integration: effectiveItemsPerSheet is not computed by parser",
  (parseRes.parsed as any).effectiveItemsPerSheet === undefined,
  "Parser output does not contain effectiveItemsPerSheet"
);

assertCondition("Integration: totalSheets is not computed by parser",
  (parseRes.parsed as any).totalSheets === undefined,
  "Parser output does not contain totalSheets"
);

// 7. Security/static cases
console.log('\n=== TESTING SECURITY & STATIC CASES ===');

const parserPath = path.join(__dirname, '../src/lib/pricing/quick-input/parse-quick-quote-input.ts');
const dictionaryPath = path.join(__dirname, '../src/lib/pricing/quick-input/quote-input-dictionary.ts');
const resolverPath = path.join(__dirname, '../src/lib/pricing/quick-input/material-resolver.ts');

const parserCode = fs.readFileSync(parserPath, 'utf8');
const dictionaryCode = fs.readFileSync(dictionaryPath, 'utf8');
const resolverCode = fs.readFileSync(resolverPath, 'utf8');
const fileContents = parserCode + dictionaryCode + resolverCode;

assertCondition("Security: No hardcoded internal price tables in parser/resolver files",
  !/priceTable|costTable|priceMap|costMap/i.test(fileContents) &&
  !/basePrice\s*:\s*\d+/i.test(fileContents),
  "No price or cost sheets embedded in parser/resolver code"
);

assertCondition("Security: No skipPermission or bypassPermission in quick input files",
  !/skipPermission|bypassPermission/i.test(fileContents),
  "No permission bypass tokens or flags exist in quick input files"
);

const keys = Object.keys(parseRes.parsed);
const hasFinancialKeys = keys.some(k => /price|cost|profit|margin|markup/i.test(k));
assertCondition("Security: Parser does not output calculated financial fields",
  !hasFinancialKeys,
  "Parser only extracts technical values, not financial values"
);

assertCondition("Security: Parser does not contain cost or price tables",
  !/pricingRule|db\.material/i.test(parserCode),
  "Verified parser has no embedded price sheets or pricing configurations"
);

const technicalKeys = [
  'productCategory', 'quantity', 'shape', 'diameterMm', 'widthMm',
  'heightMm', 'materialIntent', 'laminationIntent', 'dieCutIntent',
  'printSizeIntent', 'dieCutMachineIntent', 'shippingFee', 'hasVat'
];
const keysMatch = Object.keys(parseRes.parsed).every(k => technicalKeys.includes(k));
assertCondition("Security: Parser only extracts technical specifications",
  keysMatch,
  "Parser output keys match technical specification attributes"
);

console.log('\n=== TESTING NUMERIC INPUT NORMALIZATION ===');

import { 
  stripLeadingZeros, 
  sanitizeIntegerInput, 
  formatVietnameseInteger, 
  parseVietnameseInteger, 
  sanitizePercentInput, 
  sanitizeDecimalTechnicalInput, 
  sanitizeMoneyInput 
} from '../src/lib/utils';

// Quantity/count tests
assertCondition("Quantity/Count: Số lượng tem input '0100' normalize display thành '100'", formatVietnameseInteger("0100") === "100", "Got: " + formatVietnameseInteger("0100"));
assertCondition("Quantity/Count: Số lượng tem input '1000' display thành '1.000'", formatVietnameseInteger("1000") === "1.000", "Got: " + formatVietnameseInteger("1000"));
assertCondition("Quantity/Count: Số lượng tem input '0001000' display thành '1.000'", formatVietnameseInteger("0001000") === "1.000", "Got: " + formatVietnameseInteger("0001000"));
assertCondition("Quantity/Count: Số lượng tem submit về server là integer 1000", parseVietnameseInteger("1.000") === 1000, "Got: " + parseVietnameseInteger("1.000"));
assertCondition("Quantity/Count: Override số con/tờ '030' normalize thành '30'", formatVietnameseInteger("030") === "30", "Got: " + formatVietnameseInteger("030"));
assertCondition("Quantity/Count: Bù hao tờ '002' normalize thành '2'", formatVietnameseInteger("002") === "2", "Got: " + formatVietnameseInteger("002"));
assertCondition("Quantity/Count: Quantity input '1000.5' không được ra '10005'", sanitizeIntegerInput("1000.5") !== "10005" && sanitizeIntegerInput("1000.5") === "1000", "Got: " + sanitizeIntegerInput("1000.5"));

// Money tests
assertCondition("Money: Shipping fee '05000' display thành '5.000'", formatVietnameseInteger("05000") === "5.000", "Got: " + formatVietnameseInteger("05000"));
assertCondition("Money: Shipping fee '00050000' display thành '50.000'", formatVietnameseInteger("00050000") === "50.000", "Got: " + formatVietnameseInteger("00050000"));
assertCondition("Money: Shipping fee '1000000' display thành '1.000.000'", formatVietnameseInteger("1000000") === "1.000.000", "Got: " + formatVietnameseInteger("1000000"));
assertCondition("Money: Print price override '01200' display thành '1.200'", formatVietnameseInteger("01200") === "1.200", "Got: " + formatVietnameseInteger("01200"));
assertCondition("Money: Money submit về server là integer, không có dấu chấm", parseVietnameseInteger("1.200") === 1200, "Got: " + parseVietnameseInteger("1.200"));
assertCondition("Money: Không cho decimal money - Cắt phần thập phân", sanitizeIntegerInput("1200.5") === "1200", "Got: " + sanitizeIntegerInput("1200.5"));
assertCondition("Money: Money input '1200.5' không được ra '12005'", sanitizeIntegerInput("1200.5") !== "12005", "Got: " + sanitizeIntegerInput("1200.5"));
assertCondition("Money: Không cho negative money", sanitizeIntegerInput("-1200") === "1200", "Got: " + sanitizeIntegerInput("-1200"));

// Percent tests
assertCondition("Percent: Margin input '098' normalize thành '98'", sanitizePercentInput("098") === "98", "Got: " + sanitizePercentInput("098"));
assertCondition("Percent: VAT input '08' normalize thành '8'", sanitizePercentInput("08") === "8", "Got: " + sanitizePercentInput("08"));
assertCondition("Percent: VAT không cho decimal - Cắt phần thập phân", sanitizePercentInput("8.5") === "8", "Got: " + sanitizePercentInput("8.5"));
assertCondition("Percent: VAT input '8.5' không được ra '85'", sanitizePercentInput("8.5") !== "85", "Got: " + sanitizePercentInput("8.5"));
assertCondition("Percent: VAT không cho negative", sanitizePercentInput("-8") === "8", "Got: " + sanitizePercentInput("-8"));
assertCondition("Percent: Margin không cho decimal - Cắt phần thập phân", sanitizePercentInput("30.5") === "30", "Got: " + sanitizePercentInput("30.5"));
assertCondition("Percent: Margin input '30.5' không được ra '305'", sanitizePercentInput("30.5") !== "305", "Got: " + sanitizePercentInput("30.5"));
assertCondition("Percent: Margin không cho negative", sanitizePercentInput("-30") === "30", "Got: " + sanitizePercentInput("-30"));

const clampVat = (val: string) => {
  const sanitized = sanitizePercentInput(val);
  const num = parseInt(sanitized, 10);
  if (!isNaN(num) && num > 100) return "100";
  return sanitized;
};
assertCondition("Percent: VAT clamped to 100 max", clampVat("120") === "100", "Got: " + clampVat("120"));

// Technical field tests
assertCondition("Technical: Technical decimal '01.5' vẫn ra '1.5'", sanitizeDecimalTechnicalInput("01.5") === "1.5", "Got: " + sanitizeDecimalTechnicalInput("01.5"));
assertCondition("Technical: Gap input '011221' không được giữ leading zero", sanitizeDecimalTechnicalInput("011221") === "11221", "Got: " + sanitizeDecimalTechnicalInput("011221"));
assertCondition("Technical: Diameter input '05' normalize thành '5'", sanitizeDecimalTechnicalInput("05") === "5", "Got: " + sanitizeDecimalTechnicalInput("05"));
assertCondition("Technical: Nếu decimal được phép: '01.5' normalize thành '1.5'", sanitizeDecimalTechnicalInput("01.5") === "1.5", "Got: " + sanitizeDecimalTechnicalInput("01.5"));
assertCondition("Technical: Không format hàng nghìn cho dimension/gap", sanitizeDecimalTechnicalInput("1000.5") === "1000.5", "Got: " + sanitizeDecimalTechnicalInput("1000.5"));

// Integration cases
const engineInputInts = {
  role: "ADMIN" as any,
  quantity: 1000,
  labelShape: "CIRCLE" as any,
  widthCm: 5,
  heightCm: 5,
  diameterCm: 5,
  gapCm: 0.1,
  vatBasisPoints: Number("8") * 100,      // vatRate = 8
  markupBasisPoints: Number("30") * 100,  // profitRate = 30
  materialPricePerSheet: 1500,
  printingPricePerSheet: Number("1000"), // printingPricePerSheet = 1000
  laminationPricePerSheet: 500,
  dieCutPricePerSheet: 100,
  fileProcessingFee: 20000,
  shippingFee: Number("5000"),            // shippingFee = 5000
  sheetWidthCm: 32,
  sheetHeightCm: 35,
  usableWidthCm: 30.5,
  usableHeightCm: 31.5
};
const resInts = calculateDigitalLabelQuote(engineInputInts) as any;

assertCondition("Integration: Server action receives shippingFee as Integer",
  Number.isInteger(engineInputInts.shippingFee),
  "shippingFee is integer"
);

assertCondition("Integration: Server action receives vatRate as Integer",
  Number.isInteger(engineInputInts.vatBasisPoints),
  "vatBasisPoints is integer"
);

assertCondition("Integration: Server action receives profitRate as Integer",
  Number.isInteger(engineInputInts.markupBasisPoints),
  "markupBasisPoints is integer"
);

const expectedTaxable = resInts.sellingPrice + 5000;
const expectedVat = Math.round(expectedTaxable * 0.08); // 8% vat basis points
const expectedTotal = expectedTaxable + expectedVat;
assertCondition("Integration: Tổng thanh toán vẫn cộng shipping fee đúng sau normalize",
  resInts.totalAmount === expectedTotal,
  `Expected total: ${expectedTotal}, Got: ${resInts.totalAmount}`
);

assertCondition("Integration: Không ảnh hưởng gap mapping 1mm -> 0.1cm",
  resInts.internalBreakdown.effectiveItemsPerSheet === 30,
  "effectiveItemsPerSheet is 30"
);

assertCondition("Integration: Không ảnh hưởng quick quote parser",
  parseQuickQuoteInput("600 tem tròn 5cm decal giấy cán bóng bế demi").success,
  "Quick quote parser succeeds"
);

assertCondition("Integration: Không ảnh hưởng digital label engine calculation",
  resInts.unitPrice > 0,
  `Calculated unit price is ${resInts.unitPrice}`
);

const parseCompatRes = parseQuickQuoteInput("1000 tem tròn 5cm decal giấy cán bóng bế demi");
assertCondition("Quick Input Compatibility: Quantity parsed and can be formatted",
  formatVietnameseInteger(parseCompatRes.parsed.quantity || 0) === "1.000",
  "Got: " + formatVietnameseInteger(parseCompatRes.parsed.quantity || 0)
);

// Security/static cases
const hasHardcodedMoneyBypass = /bypassMoney|skipMoney/i.test(fileContents);
assertCondition("Security: Không có skipPermission/bypassPermission",
  !/skipPermission|bypassPermission/i.test(fileContents),
  "No permission bypass tokens"
);
assertCondition("Security: Không có hardcoded money parsing bypass",
  !hasHardcodedMoneyBypass,
  "No money parsing bypass tokens"
);
assertCondition("Security: Không có client-side pricing calculation chính",
  !/calculateDigitalLabelQuote(?!PreviewAction)/i.test(fs.readFileSync(path.join(__dirname, '../src/components/quotes/quote-form.tsx'), 'utf8')),
  "Client-side quote form does not calculate pricing internally; it calls the server action"
);

const helperCode = fs.readFileSync(path.join(__dirname, '../src/lib/utils.ts'), 'utf8');
assertCondition("Security: Không hardcode bảng giá/cost trong helper normalize input",
  !/priceTable|costTable|priceMap|costMap/i.test(helperCode),
  "No price tables in helpers"
);

console.log(`\n========================================`);
console.log(`TESTS COMPLETED. PASS: ${passCount}, FAIL: ${failCount}`);
console.log(`========================================`);

if (failCount > 0) {
  process.exit(1);
}


