import { LabelShape } from '../digital-label/types';

export type MaterialIntent = 'DECAL_PAPER' | 'DECAL_MILKY' | 'DECAL_CLEAR' | 'SILVER' | 'KRAFT' | 'UNKNOWN';
export type LaminationIntent = 'GLOSSY' | 'MATTE' | 'NONE' | 'UNKNOWN';
export type DieCutIntent = 'CUSTOM_SHAPE' | 'STRAIGHT' | 'NONE' | 'UNKNOWN';
export type PrintSizeIntent = '32x35' | '32x43' | 'UNKNOWN';
export type MachineIntent = 'Graphtec' | 'Avitech' | 'UNKNOWN';

export interface ParsedQuickQuoteData {
  productCategory: string | null;
  quantity: number | null;
  shape: LabelShape | null;
  diameterMm: number | null;
  widthMm: number | null;
  heightMm: number | null;
  materialIntent: MaterialIntent | null;
  laminationIntent: LaminationIntent | null;
  dieCutIntent: DieCutIntent | null;
  printSizeIntent: PrintSizeIntent | null;
  dieCutMachineIntent: MachineIntent | null;
  shippingFee: number | null;
  hasVat: boolean | null;
}

export interface QuickQuoteWarning {
  code: string;
  message: string;
}

export interface ParseQuickQuoteResult {
  success: boolean;
  confidence: number;
  parsed: ParsedQuickQuoteData;
  missingFields: string[];
  warnings: QuickQuoteWarning[];
  rawInput: string;
  normalizedText: string;
}
