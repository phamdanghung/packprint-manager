export type LabelShape = 'RECTANGLE' | 'CIRCLE' | 'ROUNDED_RECTANGLE' | 'HEXAGON' | 'CUSTOM';
export type LayoutType = 'NORMAL' | 'ROTATED' | 'MIXED';

export interface MachineConfig {
  machineCode?: string;
  machineName?: string;
  sheetWidthCm: number;
  sheetHeightCm: number;
  usableWidthCm: number;
  usableHeightCm: number;
  marginTopCm: number;
  marginBottomCm: number;
  marginLeftCm: number;
  marginRightCm: number;
  cornerMarkWidthCm: number;
  cornerMarkHeightCm: number;
  avoidCornerMarks: boolean;
  note?: string | null;
}

export interface PackingInput {
  sheetWidthCm: number;
  sheetHeightCm: number;
  usableWidthCm: number;
  usableHeightCm: number;
  labelShape: LabelShape;
  widthCm: number;
  heightCm: number;
  diameterCm?: number;
  gapCm: number;
  layoutType: LayoutType;
  machineConfig?: MachineConfig;
  avoidCornerMarks: boolean;
}

export interface PackingItem {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number; // 0 or 90
  shape: LabelShape;
}

export interface PackingOutput {
  labelsPerSheet: number;
  totalPrintedLabels?: number;
  layoutTypeUsed: LayoutType;
  items: PackingItem[];
  warnings: string[];
  notes: string[];
}

export interface DieCutType {
  type: 'STRAIGHT' | 'SHAPE';
}

export interface EngineConfig {
  materialName: string;
  materialPricePerSheet: number;
  laminationName: string;
  laminationPricePerSheet: number;
  machineConfig?: MachineConfig;
  
  // Pricing rules from DB
  dieCutPrices: Array<{
    minSheets: number;
    maxSheets: number | null;
    shapeCutPrice: number;
    straightCutPrice: number;
  }>;
  fileHandlingFees: Array<{
    minQuantity: number;
    maxQuantity: number | null;
    feeAmount: number;
  }>;
  pricingRules: Array<{
    ruleCode: string;
    configJson: string;
  }>;
}

export interface CalculatorInput {
  quantity: number;
  labelShape: LabelShape;
  widthCm: number;
  heightCm: number;
  diameterCm?: number;
  gapCm: number;
  layoutType: LayoutType;
  labelsPerSheet?: number; // Override if packing is done elsewhere or fixed
  wasteSheets: number;
  dieCutType: 'STRAIGHT' | 'SHAPE';
  printingPricePerSheet: number;
  fileHandlingFee?: number; // Override
  otherFee: number;
  profitRate: number; // e.g., 30 for 30%
  vatRate: number;    // e.g., 8 for 8%
  shippingFee: number;
}

export interface CalculatorOutput {
  labelsPerSheet: number;
  printSheets: number;
  totalSheets: number;
  materialPricePerSheet: number;
  materialDiscountPercent: number;
  finalMaterialPricePerSheet: number;
  materialCost: number;
  laminationPricePerSheet: number;
  laminationCost: number;
  dieCutPricePerSheet: number;
  dieCutCost: number;
  printingCost: number;
  fileHandlingFee: number;
  otherFee: number;
  costAmount: number;
  saleAmount: number;
  grossProfit: number;
  grossProfitRate: number;
  vatAmount: number;
  shippingFee: number;
  totalAmount: number;
  packingResult?: PackingOutput;
  appliedRules: string[];
  warnings: string[];
  notes: string[];
}
