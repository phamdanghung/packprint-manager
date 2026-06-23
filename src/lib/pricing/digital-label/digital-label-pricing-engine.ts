import { DigitalLabelInput } from './types';
import { PricingResponse, FullPricingResponse } from '../shared/types';
import { calculateLayout } from './layout-engine';
import { applyBasisPoints, roundMoneyVnd, ceilMoneyVnd, roundUnitPrice } from '../shared/money';
import { filterPricingResponseByRole as rbacFilter } from '../shared/rbac-filter';

export function calculateDigitalLabelQuote(input: DigitalLabelInput): PricingResponse {
  const warnings: string[] = [];

  // Validation
  if (input.quantity <= 0) {
    throw new Error('Số lượng phải lớn hơn 0');
  }
  if (input.widthCm <= 0 || input.heightCm <= 0) {
    throw new Error('Kích thước phải lớn hơn 0');
  }
  if (!input.sheetWidthCm || !input.sheetHeightCm || !input.usableWidthCm || !input.usableHeightCm || input.sheetWidthCm <= 0 || input.sheetHeightCm <= 0 || input.usableWidthCm <= 0 || input.usableHeightCm <= 0) {
    throw new Error('Kích thước khổ in và vùng bế khả dụng phải được cung cấp đầy đủ và lớn hơn 0');
  }
  
  if (input.materialPricePerSheet === undefined || input.materialPricePerSheet === null) {
    warnings.push('MISSING_MATERIAL_CONFIG');
  }
  if (input.printingPricePerSheet === undefined || input.printingPricePerSheet === null) {
    warnings.push('MISSING_PRINT_CONFIG');
  }

  // 1. Layout Calculation
  const layout = calculateLayout(
    input.labelShape,
    input.widthCm,
    input.heightCm,
    input.gapCm || 0.1,
    input.quantity,
    input.overrideItemsPerSheet,
    input.usableWidthCm,
    input.usableHeightCm,
    input.edgePaddingCm,
    input.forceLayoutType
  );

  warnings.push(...layout.warnings);

  // 2. Production Quantities using Effective Items Per Sheet
  const itemsPerSheet = layout.effectiveItemsPerSheet;
  const totalSheets = Math.ceil(input.quantity / itemsPerSheet);
  const totalPrintedItems = totalSheets * itemsPerSheet;
  const wasteItems = totalPrintedItems - input.quantity;

  // 3. Costs Calculation (using Integer money directly)
  const internalMaterialCost = totalSheets * (input.materialPricePerSheet || 0);
  const internalPrintCost = totalSheets * (input.printingPricePerSheet || 0);
  const internalFinishingCost = totalSheets * (input.laminationPricePerSheet || 0);
  const internalDieCutCost = totalSheets * (input.dieCutPricePerSheet || 0);
  const internalCuttingCost = totalSheets * (input.cuttingPricePerSheet || 0);

  const internalTotalCost = 
    internalMaterialCost + 
    internalPrintCost + 
    internalFinishingCost + 
    internalDieCutCost + 
    internalCuttingCost + 
    (input.fileProcessingFee || 0);

  // 4. Markup & Sale Amount
  const markupAmount = applyBasisPoints(internalTotalCost, input.markupBasisPoints);
  const sellingPrice = internalTotalCost + markupAmount; // selling price before VAT

  const shippingFee = input.shippingFee || 0;
  const taxableAmount = sellingPrice + shippingFee;

  // 5. VAT & Total
  const vatAmount = applyBasisPoints(taxableAmount, input.vatBasisPoints);
  const totalAmount = taxableAmount + vatAmount;

  // 6. Margins
  const grossProfit = sellingPrice - internalTotalCost;
  const grossMarginPercent = sellingPrice > 0 ? Math.round((grossProfit / sellingPrice) * 100) : 0;

  // 7. Full Response Construction
  const unitPrice = input.quantity > 0 ? roundUnitPrice(totalAmount / input.quantity) : 0;
  
  const fullResponse: FullPricingResponse = {
    sellingPrice,
    vatAmount,
    totalAmount,
    unitPrice,
    
    internalMaterialCost,
    internalPrintCost,
    internalFinishingCost,
    internalDieCutCost,
    internalCuttingCost,
    internalTotalCost,
    
    markupAmount,
    grossProfit,
    grossMarginPercent,
    
    internalBreakdown: {
      autoPackedItemsPerSheet: layout.autoPackedItemsPerSheet,
      effectiveItemsPerSheet: layout.effectiveItemsPerSheet,
      itemsPerSheet: layout.effectiveItemsPerSheet, // Legacy alias
      totalSheets,
      totalPrintedItems,
      wasteItems,
      layoutType: layout.layoutType,
      sheetWidthCm: input.sheetWidthCm,
      sheetHeightCm: input.sheetHeightCm,
      usableWidthCm: input.usableWidthCm,
      usableHeightCm: input.usableHeightCm
    },
    safeWarnings: warnings
  };

  // 8. RBAC Filter
  return rbacFilter(fullResponse, input.role, input.quantity);
}
