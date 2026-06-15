'use server';

import { checkInventoryAccess, createInventoryItem } from './inventory-actions';
import { MaterialGroup, PaperType, SheetSize, SheetRole, DecalType, LaminateType, LaminateMethod } from './material-code-generator';

const BATCH_PRESETS: Record<string, any[]> = {
  'COUCHE_150': [
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 150, sheetSize: '79X109', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 150, sheetSize: '65X86', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 150, sheetSize: '32X43', sheetRole: SheetRole.CHILD },
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 150, sheetSize: '32X35', sheetRole: SheetRole.CHILD },
  ],
  'COUCHE_300': [
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 300, sheetSize: '79X109', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 300, sheetSize: '65X86', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 300, sheetSize: '32X43', sheetRole: SheetRole.CHILD },
    { category: MaterialGroup.GIAY, materialType: PaperType.COUCHE, gsm: 300, sheetSize: '32X35', sheetRole: SheetRole.CHILD },
  ],
  'KRAFT_150': [
    { category: MaterialGroup.GIAY, materialType: PaperType.KRAFT, gsm: 150, sheetSize: '79X109', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.KRAFT, gsm: 150, sheetSize: '65X86', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.KRAFT, gsm: 150, sheetSize: '32X43', sheetRole: SheetRole.CHILD },
    { category: MaterialGroup.GIAY, materialType: PaperType.KRAFT, gsm: 150, sheetSize: '32X35', sheetRole: SheetRole.CHILD },
  ],
  'IVORY_300': [
    { category: MaterialGroup.GIAY, materialType: PaperType.IVORY, gsm: 300, sheetSize: '79X109', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.IVORY, gsm: 300, sheetSize: '65X86', sheetRole: SheetRole.PARENT },
    { category: MaterialGroup.GIAY, materialType: PaperType.IVORY, gsm: 300, sheetSize: '32X43', sheetRole: SheetRole.CHILD },
    { category: MaterialGroup.GIAY, materialType: PaperType.IVORY, gsm: 300, sheetSize: '32X35', sheetRole: SheetRole.CHILD },
  ],
  'DECAL_GIAY': [
    { category: MaterialGroup.DECAL, materialType: DecalType.GIAY, sheetSize: '32X43', sheetRole: SheetRole.BOTH, isRoll: false },
  ],
  'DECAL_NHUA_SUA': [
    { category: MaterialGroup.DECAL, materialType: DecalType['NHUA-SUA'], sheetSize: '32X43', sheetRole: SheetRole.BOTH, isRoll: false },
    { category: MaterialGroup.DECAL, materialType: DecalType['NHUA-SUA'], isRoll: true, rollWidthMm: 330, rollLengthM: 50 },
  ],
  'MANG_BONG_NHIET': [
    { category: MaterialGroup.MANG, laminateType: LaminateType.BONG, laminateMethod: LaminateMethod.NHIET, rollWidthMm: 330, rollLengthM: 200 },
  ],
  'MANG_MO_NHIET': [
    { category: MaterialGroup.MANG, laminateType: LaminateType.MO, laminateMethod: LaminateMethod.NHIET, rollWidthMm: 330, rollLengthM: 200 },
  ]
};

export async function batchCreateStandardMaterials(preset: string) {
  const user = await checkInventoryAccess();
  if (!['ADMIN', 'MANAGER'].includes(user.role)) {
    throw new Error('Chỉ Admin/Manager mới được batch create');
  }

  const inputs = BATCH_PRESETS[preset];
  if (!inputs) throw new Error('Preset không tồn tại');

  const results = [];
  for (const codeGenInput of inputs) {
    try {
      const res = await createInventoryItem({
        codeGenInput,
        unit: 'N/A', // Will be overridden inside derived logic, or derived provides stockBaseUnit
        displayUnit: codeGenInput.category === MaterialGroup.MANG || codeGenInput.isRoll ? 'METERS' : 'SHEET',
        initialStockBase: 0,
        minStockBase: 0,
        status: 'ACTIVE'
      });
      results.push(res);
    } catch (e: any) {
      results.push({ status: 'ERROR', error: e.message });
    }
  }

  return results;
}
