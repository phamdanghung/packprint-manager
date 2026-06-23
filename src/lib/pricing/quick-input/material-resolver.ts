import { MaterialIntent, PrintSizeIntent } from './types';

export function resolveMaterialFromParsedIntent(
  materialIntent: MaterialIntent | null,
  availableMaterials: any[],
  currentPrintSizeStr: string | null
): {
  materialId: string | null;
  warningCode?: string;
  warningMessage?: string;
} {
  if (!materialIntent) {
    return { materialId: null };
  }

  // 1. Filter active materials only
  const activeMaterials = availableMaterials.filter(m => m.status === 'ACTIVE');
  
  if (activeMaterials.length === 0) {
    return { materialId: null, warningCode: 'MISSING_OR_UNKNOWN_MATERIAL', warningMessage: 'Không có chất liệu nào đang hoạt động.' };
  }

  // 2. Identify target width and height if intent provided or from context
  let targetW = 0;
  let targetH = 0;
  
  if (currentPrintSizeStr) {
    const parts = currentPrintSizeStr.split('x');
    if (parts.length === 2) {
      targetW = parseFloat(parts[0].trim());
      targetH = parseFloat(parts[1].trim());
    }
  }

  // 3. Find candidates by Material Intent (e.g., DECAL_PAPER matches materialCode containing 'DECAL_PAPER' or specific string)
  let candidates = activeMaterials.filter(m => {
    // Exact or partial match on materialCode
    if (m.materialCode && m.materialCode.toUpperCase().includes(materialIntent)) {
      return true;
    }
    
    // Normalize name matching
    const name = m.name.toLowerCase();
    switch (materialIntent) {
      case 'DECAL_PAPER':
        return name.includes('decal giấy') || name.includes('giấy decal');
      case 'DECAL_MILKY':
        return name.includes('nhựa sữa') || name.includes('decal sữa');
      case 'DECAL_CLEAR':
        return name.includes('nhựa trong') || name.includes('decal trong');
      case 'SILVER':
        return name.includes('xi bạc');
      case 'KRAFT':
        return name.includes('kraft');
      default:
        return false;
    }
  });

  if (candidates.length === 0) {
    return { materialId: null, warningCode: 'MISSING_OR_UNKNOWN_MATERIAL', warningMessage: 'Không tìm thấy chất liệu phù hợp trong danh sách.' };
  }

  // 4. If exactly one candidate, return it
  if (candidates.length === 1) {
    return { materialId: candidates[0].id };
  }

  // 5. If multiple candidates, try to match print size
  if (targetW > 0 && targetH > 0) {
    const sizeMatch = candidates.filter(m => 
      (m.sheetWidthCm === targetW && m.sheetHeightCm === targetH) ||
      (m.sheetWidthCm === targetH && m.sheetHeightCm === targetW)
    );
    
    if (sizeMatch.length === 1) {
      return { materialId: sizeMatch[0].id };
    } else if (sizeMatch.length > 1) {
      // Still ambiguous even with size match
      return { materialId: null, warningCode: 'NEEDS_MATERIAL_CONFIRMATION', warningMessage: 'Có nhiều chất liệu trùng khớp, vui lòng chọn lại thủ công.' };
    }
  }

  // 6. If multiple candidates and no size match/disambiguation possible
  return { materialId: null, warningCode: 'NEEDS_MATERIAL_CONFIRMATION', warningMessage: 'Có nhiều chất liệu trùng khớp, vui lòng chọn lại thủ công.' };
}
