export type Role = 'ADMIN' | 'MANAGER' | 'ACCOUNTANT' | 'SALES' | 'PRODUCTION' | 'DESIGNER' | 'DELIVERY';

export interface BasePricingInput {
  role: Role;
  // ... other shared inputs if needed later
}

// Full Response (ADMIN/MANAGER/ACCOUNTANT)
export interface FullPricingResponse {
  sellingPrice: number;
  vatAmount: number;
  totalAmount: number;
  unitPrice: number;
  
  internalMaterialCost: number;
  internalPrintCost: number;
  internalFinishingCost: number;
  internalDieCutCost: number;
  internalCuttingCost: number;
  internalTotalCost: number;
  
  markupAmount: number;
  grossProfit: number;
  grossMarginPercent: number;
  
  internalBreakdown: Record<string, any>;
  safeWarnings: string[];
  notes?: string[];
  shippingFee?: number;
}

// Sales Response (Omit internal costs)
export interface SalesPricingResponse {
  sellingPrice: number;
  vatAmount: number;
  totalAmount: number;
  unitPrice: number;
  
  salesBreakdown: Record<string, any>;
  safeWarnings: string[];
  notes?: string[];
  shippingFee?: number;
}

export type PricingResponse = FullPricingResponse | SalesPricingResponse;
