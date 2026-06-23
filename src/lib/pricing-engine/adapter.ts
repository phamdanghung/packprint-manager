import { db } from '@/lib/db';
import { CalculatorInput, EngineConfig, CalculatorOutput } from './types';
import { calculatePricing } from './calculator';

export interface DecalQuoteRequest {
  quantity: number;
  labelShape: 'RECTANGLE' | 'CIRCLE' | 'ROUNDED_RECTANGLE' | 'HEXAGON' | 'CUSTOM';
  widthCm: number;
  heightCm: number;
  diameterCm?: number;
  gapCm: number;
  layoutType: 'NORMAL' | 'ROTATED' | 'MIXED';
  wasteSheets: number;
  dieCutType: 'STRAIGHT' | 'SHAPE';
  printingPricePerSheet: number;
  otherFee: number;
  profitRate: number;
  vatRate: number;
  shippingFee: number;
  labelsPerSheet?: number;
  fileHandlingFee?: number;
  
  // Relations to DB
  materialId: string;
  laminationId?: string;
  machineCode?: string; // Optional, can use default
}

export async function calculateDecalQuoteFromDb(input: DecalQuoteRequest): Promise<CalculatorOutput> {
  // 1. Lấy dữ liệu Material
  const material = await db.material.findUnique({
    where: { id: input.materialId }
  });
  if (!material) {
    throw new Error(`Material with ID ${input.materialId} not found`);
  }

  // 2. Lấy dữ liệu Lamination
  const lamination = await db.laminationPrice.findUnique({
    where: { id: input.laminationId }
  });
  if (!lamination) {
    throw new Error(`Lamination with ID ${input.laminationId} not found`);
  }

  // 3. Lấy dữ liệu MachineConfig (nếu có truyền lên, không thì lấy mặc định)
  let machineConfig = undefined;
  const mcModel = (db as any).machineConfig;
  if (mcModel) {
    if (input.machineCode) {
      const mc = await mcModel.findUnique({
        where: { machineCode: input.machineCode }
      });
      if (mc) machineConfig = mc;
    }
    if (!machineConfig) {
      const defaultMc = await mcModel.findFirst({
        where: { status: 'ACTIVE' }
      });
      if (defaultMc) machineConfig = defaultMc;
    }
  }

  // 4. Lấy DieCutPrices
  const dieCutPrices = await db.dieCutPrice.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { minSheets: 'asc' }
  });

  // 5. Lấy FileHandlingFees
  const fileHandlingFees = await db.fileHandlingFee.findMany({
    where: { status: 'ACTIVE' },
    orderBy: { minQuantity: 'asc' }
  });

  // 6. Lấy PricingRules
  const pricingRules = await db.pricingRule.findMany({
    where: { status: 'ACTIVE' }
  });

  // 7. Tạo config cho Engine
  const config: EngineConfig = {
    materialName: material.name,
    materialPricePerSheet: material.basePrice,
    laminationName: lamination.name,
    laminationPricePerSheet: lamination.pricePerSheet,
    machineConfig: machineConfig ? {
      machineCode: machineConfig.machineCode,
      machineName: machineConfig.machineName,
      sheetWidthCm: machineConfig.sheetWidthCm,
      sheetHeightCm: machineConfig.sheetHeightCm,
      usableWidthCm: machineConfig.usableWidthCm,
      usableHeightCm: machineConfig.usableHeightCm,
      marginTopCm: machineConfig.marginTopCm,
      marginBottomCm: machineConfig.marginBottomCm,
      marginLeftCm: machineConfig.marginLeftCm,
      marginRightCm: machineConfig.marginRightCm,
      cornerMarkWidthCm: machineConfig.cornerMarkWidthCm,
      cornerMarkHeightCm: machineConfig.cornerMarkHeightCm,
      avoidCornerMarks: machineConfig.avoidCornerMarks,
    } : undefined,
    dieCutPrices,
    fileHandlingFees,
    pricingRules
  };

  // 8. Gọi Engine Calculator
  const calcInput: CalculatorInput = {
    quantity: input.quantity,
    labelShape: input.labelShape,
    widthCm: input.widthCm,
    heightCm: input.heightCm,
    diameterCm: input.diameterCm,
    gapCm: input.gapCm,
    layoutType: input.layoutType,
    wasteSheets: input.wasteSheets,
    dieCutType: input.dieCutType,
    printingPricePerSheet: input.printingPricePerSheet,
    otherFee: input.otherFee,
    profitRate: input.profitRate,
    vatRate: input.vatRate,
    shippingFee: input.shippingFee,
    labelsPerSheet: input.labelsPerSheet,
    fileHandlingFee: input.fileHandlingFee
  };

  const result = calculatePricing(calcInput, config);
  return result;
}
