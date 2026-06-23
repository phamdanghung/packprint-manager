import { FullPricingResponse, SalesPricingResponse, Role, PricingResponse } from './types';
import { roundUnitPrice } from './money';

export function filterPricingResponseByRole(fullResponse: FullPricingResponse, role: Role, quantity: number): PricingResponse {
  if (role === 'ADMIN' || role === 'MANAGER' || role === 'ACCOUNTANT') {
    return fullResponse;
  }

  // SALES and others
  const salesResponse: SalesPricingResponse = {
    sellingPrice: fullResponse.sellingPrice,
    vatAmount: fullResponse.vatAmount,
    totalAmount: fullResponse.totalAmount,
    unitPrice: fullResponse.unitPrice,
    salesBreakdown: {
      itemsPerSheet: fullResponse.internalBreakdown?.itemsPerSheet,
      totalSheets: fullResponse.internalBreakdown?.totalSheets,
      totalPrintedItems: fullResponse.internalBreakdown?.totalPrintedItems,
      wasteItems: fullResponse.internalBreakdown?.wasteItems,
      sheetWidthCm: fullResponse.internalBreakdown?.sheetWidthCm,
      sheetHeightCm: fullResponse.internalBreakdown?.sheetHeightCm,
      usableWidthCm: fullResponse.internalBreakdown?.usableWidthCm,
      usableHeightCm: fullResponse.internalBreakdown?.usableHeightCm
    },
    safeWarnings: fullResponse.safeWarnings
  };

  return salesResponse;
}
