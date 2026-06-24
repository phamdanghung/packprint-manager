import { calculateDigitalLabelQuote } from './src/lib/pricing/digital-label/digital-label-pricing-engine';

const result = calculateDigitalLabelQuote({
  quantity: 50000,
  labelShape: 'RECTANGLE',
  widthCm: 10,
  heightCm: 10,
  vatBasisPoints: 800,
  markupBasisPoints: 3000,
  materialPricePerSheet: 1000,
  printingPricePerSheet: 0,
  laminationPricePerSheet: 0,
  dieCutPricePerSheet: 0,
  fileProcessingFee: 0,
  activeRules: [{ ruleCode: 'FREE_SHIPPING_INNER_CITY', configJson: '{"minOrderValueInclVat": 2000000}' }],
  shippingFee: 0,
  sheetWidthCm: 32,
  sheetHeightCm: 35,
  usableWidthCm: 30,
  usableHeightCm: 33,
  role: 'ADMIN'
} as any);

console.log(JSON.stringify(result, null, 2));
