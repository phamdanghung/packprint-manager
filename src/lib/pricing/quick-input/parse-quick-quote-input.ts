import { LabelShape } from '../digital-label/types';
import { quickQuoteDictionary } from './quote-input-dictionary';
import { ParseQuickQuoteResult, ParsedQuickQuoteData, QuickQuoteWarning } from './types';

export function parseQuickQuoteInput(input: string): ParseQuickQuoteResult {
  const normalizedText = input.toLowerCase().trim();
  const warnings: QuickQuoteWarning[] = [];
  const missingFields: string[] = [];

  const parsed: ParsedQuickQuoteData = {
    productCategory: null,
    quantity: null,
    shape: null,
    diameterMm: null,
    widthMm: null,
    heightMm: null,
    materialIntent: null,
    laminationIntent: null,
    dieCutIntent: null,
    printSizeIntent: null,
    dieCutMachineIntent: null,
    shippingFee: null,
    hasVat: null
  };

  // 1. Parse Quantity
  const explicitQtyRegex = /(?:số lượng|sl)\s*(\d+)/i;
  const suffixQtyRegex = /(\d+)\s*(?:tem|cái|nhãn|decal)/i;
  
  const explicitQtyMatch = normalizedText.match(explicitQtyRegex);
  if (explicitQtyMatch && explicitQtyMatch[1]) {
    parsed.quantity = parseInt(explicitQtyMatch[1], 10);
  } else {
    const suffixQtyMatch = normalizedText.match(suffixQtyRegex);
    if (suffixQtyMatch && suffixQtyMatch[1]) {
      parsed.quantity = parseInt(suffixQtyMatch[1], 10);
    } else {
      const startNumMatch = normalizedText.match(/^(\d+)\s/);
      if (startNumMatch && startNumMatch[1]) {
        parsed.quantity = parseInt(startNumMatch[1], 10);
      }
    }
  }

  // 2. Dictionary lookups
  for (const cat of quickQuoteDictionary.productCategory) {
    if (cat.regex.test(normalizedText)) {
      parsed.productCategory = cat.value;
      break;
    }
  }

  let materialMatched = false;
  for (const mat of quickQuoteDictionary.material) {
    if (mat.regex.test(normalizedText)) {
      parsed.materialIntent = mat.value as any;
      materialMatched = true;
      break;
    }
  }

  for (const lam of quickQuoteDictionary.lamination) {
    // If it says "cán bóng, cán bóng", regex .test will just match it once and set.
    if (lam.regex.test(normalizedText)) {
      parsed.laminationIntent = lam.value as any;
      break;
    }
  }

  for (const dc of quickQuoteDictionary.dieCut) {
    if (dc.regex.test(normalizedText)) {
      parsed.dieCutIntent = dc.value as any;
      break;
    }
  }

  for (const ps of quickQuoteDictionary.printSize) {
    if (ps.regex.test(normalizedText)) {
      parsed.printSizeIntent = ps.value as any;
      break;
    }
  }

  for (const m of quickQuoteDictionary.machine) {
    if (m.regex.test(normalizedText)) {
      parsed.dieCutMachineIntent = m.value as any;
      break;
    }
  }

  // 3. Parse Sizes & Shapes
  // Rectangle sizes: 6x8cm, 60x80mm, 6 x 8 cm
  const rectRegex = /(\d+(?:\.\d+)?)\s*x\s*(\d+(?:\.\d+)?)\s*(cm|mm)/i;
  const rectMatch = normalizedText.match(rectRegex);
  if (rectMatch) {
    parsed.shape = 'RECTANGLE';
    const w = parseFloat(rectMatch[1]);
    const h = parseFloat(rectMatch[2]);
    const unit = rectMatch[3].toLowerCase();
    const multiplier = unit === 'cm' ? 10 : 1;
    parsed.widthMm = w * multiplier;
    parsed.heightMm = h * multiplier;
  }

  // Circle sizes: tròn 5cm, phi 5, đường kính 5cm, d5cm, 50mm (if shape is circle)
  const circleExplicitRegex = /(?:tròn|phi|đường kính|d)\s*(\d+(?:\.\d+)?)\s*(cm|mm)?/i;
  const circleMatch = normalizedText.match(circleExplicitRegex);
  if (circleMatch) {
    parsed.shape = 'CIRCLE';
    const d = parseFloat(circleMatch[1]);
    const unit = circleMatch[2] ? circleMatch[2].toLowerCase() : (d < 10 ? 'cm' : 'mm'); // heuristic: 5->5cm, 50->50mm
    const multiplier = unit === 'cm' ? 10 : 1;
    parsed.diameterMm = d * multiplier;
  }

  // If "tròn" is mentioned but no explicit size caught by circleExplicitRegex
  if (!parsed.shape && /(tròn)/i.test(normalizedText)) {
    parsed.shape = 'CIRCLE';
    // Look for any trailing measurement like "50mm"
    const fallbackSize = normalizedText.match(/(\d+(?:\.\d+)?)\s*(cm|mm)/i);
    if (fallbackSize) {
      const d = parseFloat(fallbackSize[1]);
      const unit = fallbackSize[2].toLowerCase();
      parsed.diameterMm = d * (unit === 'cm' ? 10 : 1);
    }
  }

  // Ambiguity check
  if (rectMatch && circleMatch) {
    warnings.push({ code: 'AMBIGUOUS_SHAPE_SIZE', message: 'Tìm thấy cả kích thước hình chữ nhật và hình tròn, vui lòng kiểm tra lại.' });
    parsed.shape = null; // Don't guess
  }

  // 4. Shipping & VAT
  const shipRegex = /(?:giao hàng|ship|phí ship)\s*(\d+(?:[\.\,]\d+)*)\s*(?:k|đ|vnđ)?/i;
  const shipMatch = normalizedText.match(shipRegex);
  if (shipMatch) {
    let feeStr = shipMatch[1].replace(/[\.\,]/g, '');
    let fee = parseInt(feeStr, 10);
    // If user types "50k", the 'k' is captured outside, but wait, the regex doesn't multiply by 1000 if 'k' is there.
    if (normalizedText.match(/(?:giao hàng|ship|phí ship)\s*(\d+(?:[\.\,]\d+)*)\s*k/i)) {
      fee = fee * 1000;
    }
    parsed.shippingFee = fee;
  }

  if (/(có vat|thêm vat|\+vat)/i.test(normalizedText)) {
    parsed.hasVat = true;
  } else if (/(không vat|ko vat)/i.test(normalizedText)) {
    parsed.hasVat = false;
  }

  // 5. Validation & Missing Fields
  if (!parsed.quantity) missingFields.push('Số lượng');
  if (!parsed.shape) missingFields.push('Hình dáng');
  if (parsed.shape === 'CIRCLE' && !parsed.diameterMm) missingFields.push('Kích thước đường kính');
  if (parsed.shape === 'RECTANGLE' && (!parsed.widthMm || !parsed.heightMm)) missingFields.push('Kích thước dài x rộng');
  if (!parsed.materialIntent && !materialMatched) {
    missingFields.push('Chất liệu');
    warnings.push({ code: 'MISSING_OR_UNKNOWN_MATERIAL', message: 'Chưa rõ chất liệu.' });
  }
  
  if (/(giấy bóng)/i.test(normalizedText) && !parsed.laminationIntent) {
    warnings.push({ code: 'AMBIGUOUS_INPUT', message: 'Chưa chắc "giấy bóng" là chất liệu hay cán bóng. Vui lòng xác nhận.' });
  }

  const success = missingFields.length === 0 && warnings.filter(w => w.code.includes('AMBIGUOUS')).length === 0;

  return {
    success,
    confidence: success ? 0.9 : 0.5,
    parsed,
    missingFields,
    warnings,
    rawInput: input,
    normalizedText
  };
}
