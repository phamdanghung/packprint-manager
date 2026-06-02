import { CalculatorInput, EngineConfig, CalculatorOutput } from './types';
import { packLabels } from './packer';
import { getUsableArea } from './machine-safe-zone';

export function calculatePricing(
  input: CalculatorInput,
  config: EngineConfig
): CalculatorOutput {
  const warnings: string[] = [];
  const notes: string[] = [];
  const appliedRules: string[] = [];

  let labelsPerSheet = input.labelsPerSheet || 0;
  let packingResult = undefined;

  // Rule 1: ROUND_5CM_LABEL_RULE
  if (input.labelShape === 'CIRCLE' && input.diameterCm === 5) {
    const r5Rule = config.pricingRules.find(r => r.ruleCode === 'ROUND_5CM_LABEL_RULE');
    if (r5Rule) {
      try {
        const rConf = JSON.parse(r5Rule.configJson);
        if (input.quantity >= rConf.thresholdQuantity) {
          labelsPerSheet = rConf.labelsPerSheetAboveThreshold;
        } else {
          labelsPerSheet = rConf.labelsPerSheetBelowThreshold;
        }
        appliedRules.push('ROUND_5CM_LABEL_RULE');
      } catch (e) {
        // Parse error
      }
    }
  }

  // 1. Tính toán số tem trên tờ (nếu chưa được cung cấp)
  if (!labelsPerSheet) {
    if (!config.machineConfig) {
      warnings.push('Không có cấu hình máy bế để tính khổ in.');
    } else {
      const usableArea = getUsableArea(config.machineConfig);
      packingResult = packLabels({
        sheetWidthCm: config.machineConfig.sheetWidthCm,
        sheetHeightCm: config.machineConfig.sheetHeightCm,
        usableWidthCm: usableArea.usableWidthCm,
        usableHeightCm: usableArea.usableHeightCm,
        labelShape: input.labelShape,
        widthCm: input.widthCm,
        heightCm: input.heightCm,
        diameterCm: input.diameterCm,
        gapCm: input.gapCm,
        layoutType: input.layoutType,
        machineConfig: config.machineConfig,
        avoidCornerMarks: config.machineConfig.avoidCornerMarks
      });
      labelsPerSheet = packingResult.labelsPerSheet;
      if (packingResult.warnings.length > 0) {
        warnings.push(...packingResult.warnings);
      }
    }
  }

  if (labelsPerSheet <= 0) {
    warnings.push('Số tem trên tờ bằng 0. Không thể tính giá.');
    return buildEmptyResult(warnings);
  }

  // 2. Tính số tờ
  const printSheets = Math.ceil(input.quantity / labelsPerSheet);
  const totalSheets = printSheets + input.wasteSheets;

  // 3. Tính Giá Vật Tư
  let materialDiscountPercent = 0;
  
  // Rule: MATERIAL_DISCOUNT_OVER_200_SHEETS
  const matDiscRule = config.pricingRules.find(r => r.ruleCode === 'MATERIAL_DISCOUNT_OVER_200_SHEETS');
  if (matDiscRule) {
    try {
      const rConf = JSON.parse(matDiscRule.configJson);
      if (printSheets >= rConf.minSheets) {
        materialDiscountPercent = rConf.discountPercent;
        appliedRules.push('MATERIAL_DISCOUNT_OVER_200_SHEETS');
      }
    } catch (e) { }
  }

  const finalMaterialPricePerSheet = config.materialPricePerSheet * (1 - materialDiscountPercent / 100);
  const materialCost = totalSheets * finalMaterialPricePerSheet;

  // 4. Tính Giá Cán Màng
  let laminationPricePerSheet = config.laminationPricePerSheet;
  const laminationCost = totalSheets * laminationPricePerSheet;

  // 5. Tính Giá Bế (Die Cut)
  let baseDieCutPrice = 0;
  const dcTier = config.dieCutPrices.find(t => totalSheets >= t.minSheets && (t.maxSheets === null || totalSheets <= t.maxSheets));
  if (dcTier) {
    baseDieCutPrice = input.dieCutType === 'SHAPE' ? dcTier.shapeCutPrice : dcTier.straightCutPrice;
  } else if (config.dieCutPrices.length > 0) {
    // Fallback to max tier
    const lastTier = config.dieCutPrices[config.dieCutPrices.length - 1];
    baseDieCutPrice = input.dieCutType === 'SHAPE' ? lastTier.shapeCutPrice : lastTier.straightCutPrice;
  }

  // Apply Die Cut Rules
  let dieCutMultiplier = 1.0;
  
  if (labelsPerSheet <= 7) {
    const ruleLess8 = config.pricingRules.find(r => r.ruleCode === 'DIE_CUT_LESS_THAN_8_LABELS');
    if (ruleLess8) {
      try {
        const rc = JSON.parse(ruleLess8.configJson);
        if (totalSheets >= rc.minTotalSheets && labelsPerSheet <= rc.maxLabelsPerSheet) {
          dieCutMultiplier = rc.priceMultiplier;
          appliedRules.push('DIE_CUT_LESS_THAN_8_LABELS');
        }
      } catch (e) { }
    }
  } else if (labelsPerSheet >= 200) {
    const ruleOver200 = config.pricingRules.find(r => r.ruleCode === 'DIE_CUT_OVER_200_LABELS');
    if (ruleOver200) {
      try {
        const rc = JSON.parse(ruleOver200.configJson);
        dieCutMultiplier = rc.priceMultiplier;
        appliedRules.push('DIE_CUT_OVER_200_LABELS');
      } catch (e) { }
    }
  } else if (labelsPerSheet >= 100) {
    const ruleOver100 = config.pricingRules.find(r => r.ruleCode === 'DIE_CUT_OVER_100_LABELS');
    if (ruleOver100) {
      try {
        const rc = JSON.parse(ruleOver100.configJson);
        dieCutMultiplier = rc.priceMultiplier;
        appliedRules.push('DIE_CUT_OVER_100_LABELS');
      } catch (e) { }
    }
  }

  const dieCutPricePerSheet = baseDieCutPrice * dieCutMultiplier;
  const dieCutCost = totalSheets * dieCutPricePerSheet;

  // 6. Tính Tiền In
  const printingCost = totalSheets * input.printingPricePerSheet;

  // 7. Tính Tiền Cắt/Phụ phí
  let fileHandlingFee = input.fileHandlingFee;
  if (fileHandlingFee === undefined) {
    fileHandlingFee = 0;
    const feeTier = config.fileHandlingFees.find(t => input.quantity >= t.minQuantity && (t.maxQuantity === null || input.quantity <= t.maxQuantity));
    if (feeTier) {
      fileHandlingFee = feeTier.feeAmount;
    } else if (config.fileHandlingFees.length > 0) {
      fileHandlingFee = config.fileHandlingFees[config.fileHandlingFees.length - 1].feeAmount;
    }
  }

  const otherFee = input.otherFee || 0;

  // 8. TỔNG CỘNG
  const costAmount = materialCost + laminationCost + dieCutCost + printingCost + fileHandlingFee + otherFee;
  const saleAmount = costAmount * (1 + input.profitRate / 100);
  const grossProfit = saleAmount - costAmount;
  const grossProfitRate = saleAmount > 0 ? (grossProfit / saleAmount) * 100 : 0;
  
  const vatAmount = saleAmount * (input.vatRate / 100);
  const totalAmount = saleAmount + vatAmount + input.shippingFee;

  return {
    labelsPerSheet,
    printSheets,
    totalSheets,
    materialPricePerSheet: config.materialPricePerSheet,
    materialDiscountPercent,
    finalMaterialPricePerSheet,
    materialCost,
    laminationPricePerSheet,
    laminationCost,
    dieCutPricePerSheet,
    dieCutCost,
    printingCost,
    fileHandlingFee,
    otherFee,
    costAmount,
    saleAmount,
    grossProfit,
    grossProfitRate,
    vatAmount,
    shippingFee: input.shippingFee,
    totalAmount,
    packingResult,
    appliedRules,
    warnings,
    notes
  };
}

function buildEmptyResult(warnings: string[]): CalculatorOutput {
  return {
    labelsPerSheet: 0,
    printSheets: 0,
    totalSheets: 0,
    materialPricePerSheet: 0,
    materialDiscountPercent: 0,
    finalMaterialPricePerSheet: 0,
    materialCost: 0,
    laminationPricePerSheet: 0,
    laminationCost: 0,
    dieCutPricePerSheet: 0,
    dieCutCost: 0,
    printingCost: 0,
    fileHandlingFee: 0,
    otherFee: 0,
    costAmount: 0,
    saleAmount: 0,
    grossProfit: 0,
    grossProfitRate: 0,
    vatAmount: 0,
    shippingFee: 0,
    totalAmount: 0,
    appliedRules: [],
    warnings,
    notes: []
  };
}
