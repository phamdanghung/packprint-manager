import { Role } from '../shared/types';

export type LabelShape = 'CIRCLE' | 'RECTANGLE' | 'ROUNDED_RECTANGLE' | 'HEXAGON' | 'CUSTOM';

export interface DigitalLabelInput {
  role: Role;
  quantity: number;
  labelShape: LabelShape;
  widthCm: number;
  heightCm: number;
  diameterCm?: number; // For CIRCLE
  gapCm?: number; // default 0.1
  
  // Overrides
  overrideItemsPerSheet?: number;
  forceLayoutType?: 'AUTO' | 'NORMAL';
  
  // Dimensions
  sheetWidthCm?: number;
  sheetHeightCm?: number;
  usableWidthCm?: number;
  usableHeightCm?: number;
  edgePaddingCm?: number;
  
  
  // Pricing config (in basis points or permille or INT VND)
  vatBasisPoints: number; // e.g. 800 for 8%
  markupBasisPoints: number; // e.g. 3000 for 30%
  
  // Unit costs (Int VND)
  materialPricePerSheet: number;
  printingPricePerSheet: number;
  laminationPricePerSheet: number;
  dieCutPricePerSheet: number;
  cuttingPricePerSheet?: number;
  fileProcessingFee: number;
  shippingFee?: number;
  
  // Rules
  activeRules?: any[];
}
