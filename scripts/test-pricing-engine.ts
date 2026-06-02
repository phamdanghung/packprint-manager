import { calculatePricing } from '../src/lib/pricing-engine/calculator';
import { EngineConfig, CalculatorInput } from '../src/lib/pricing-engine/types';

function runTests() {
  console.log('--- TEST PRICING ENGINE ---');
  
  const baseConfig: EngineConfig = {
    materialName: 'Decal Giấy',
    materialPricePerSheet: 2500,
    laminationName: 'Không cán',
    laminationPricePerSheet: 0,
    machineConfig: {
      machineCode: 'BE-3235-DEFAULT',
      machineName: 'Máy bế decal 32x35 mặc định',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5,
      marginTopCm: 0.75,
      marginBottomCm: 0.75,
      marginLeftCm: 0.75,
      marginRightCm: 0.75,
      cornerMarkWidthCm: 0,
      cornerMarkHeightCm: 0,
      avoidCornerMarks: false
    },
    dieCutPrices: [
      { minSheets: 1, maxSheets: 20, shapeCutPrice: 8000, straightCutPrice: 5600 },
      { minSheets: 21, maxSheets: 30, shapeCutPrice: 7000, straightCutPrice: 4900 },
      { minSheets: 31, maxSheets: 50, shapeCutPrice: 6000, straightCutPrice: 4200 },
      { minSheets: 51, maxSheets: 80, shapeCutPrice: 5000, straightCutPrice: 3500 },
    ],
    fileHandlingFees: [
      { minQuantity: 1, maxQuantity: 500, feeAmount: 20000 },
      { minQuantity: 501, maxQuantity: 1000, feeAmount: 40000 },
    ],
    pricingRules: [
      {
        ruleCode: 'ROUND_5CM_LABEL_RULE',
        configJson: JSON.stringify({ thresholdQuantity: 1000, labelsPerSheetAboveThreshold: 34, labelsPerSheetBelowThreshold: 30 })
      },
      {
        ruleCode: 'MATERIAL_DISCOUNT_OVER_200_SHEETS',
        configJson: JSON.stringify({ minSheets: 201, discountPercent: 5 })
      },
      {
        ruleCode: 'DIE_CUT_LESS_THAN_8_LABELS',
        configJson: JSON.stringify({ maxLabelsPerSheet: 7, minTotalSheets: 101, priceMultiplier: 0.9 })
      },
      {
        ruleCode: 'DIE_CUT_OVER_100_LABELS',
        configJson: JSON.stringify({ priceMultiplier: 1.1 })
      },
      {
        ruleCode: 'DIE_CUT_OVER_200_LABELS',
        configJson: JSON.stringify({ priceMultiplier: 1.2 })
      }
    ]
  };

  const runCase = (name: string, inputParams: Partial<CalculatorInput>) => {
    const defaultInput: CalculatorInput = {
      quantity: 1000,
      labelShape: 'CIRCLE',
      widthCm: 5,
      heightCm: 5,
      diameterCm: 5,
      gapCm: 0.2,
      layoutType: 'MIXED',
      wasteSheets: 2,
      dieCutType: 'SHAPE',
      printingPricePerSheet: 0,
      otherFee: 0,
      profitRate: 30,
      vatRate: 8,
      shippingFee: 0
    };
    const input = { ...defaultInput, ...inputParams };
    const res = calculatePricing(input, baseConfig);
    console.log(`\n--- ${name} ---`);
    console.log(`labelsPerSheet: ${res.labelsPerSheet}`);
    console.log(`printSheets: ${res.printSheets}`);
    console.log(`totalSheets: ${res.totalSheets}`);
    console.log(`dieCutPricePerSheet: ${res.dieCutPricePerSheet}`);
    console.log(`materialCost: ${res.materialCost}`);
    console.log(`dieCutCost: ${res.dieCutCost}`);
    console.log(`fileHandlingFee: ${res.fileHandlingFee}`);
    console.log(`costAmount: ${res.costAmount}`);
    console.log(`saleAmount: ${res.saleAmount}`);
    console.log(`vatAmount: ${res.vatAmount}`);
    console.log(`totalAmount: ${res.totalAmount}`);
    console.log(`appliedRules: ${res.appliedRules.join(', ')}`);
  };

  runCase('CASE 1: Decal giấy tròn 5cm, 1.000 cái', { quantity: 1000, labelShape: 'CIRCLE', diameterCm: 5 });
  runCase('CASE 2: Decal giấy tròn 5cm, 500 cái', { quantity: 500, labelShape: 'CIRCLE', diameterCm: 5 });
  runCase('CASE 3: labelsPerSheet = 120 (Tăng 10%)', { quantity: 1000, labelsPerSheet: 120, labelShape: 'RECTANGLE', diameterCm: 0 });
  runCase('CASE 4: labelsPerSheet = 220 (Tăng 20%)', { quantity: 1000, labelsPerSheet: 220, labelShape: 'RECTANGLE', diameterCm: 0 });
  runCase('CASE 5: printSheets > 200 (Giảm 5% vật tư)', { quantity: 1000, labelsPerSheet: 4, wasteSheets: 5, labelShape: 'RECTANGLE', diameterCm: 0 }); // 250 printSheets => total 255
}

runTests();
