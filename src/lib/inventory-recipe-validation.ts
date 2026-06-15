import { InventoryItem } from '@prisma/client';

export function extractMaterialInfo(name: string) {
  const dimMatch = name.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
  let widthCm = 0;
  let heightCm = 0;
  if (dimMatch) {
    widthCm = parseFloat(dimMatch[1]);
    heightCm = parseFloat(dimMatch[2]);
  }
  
  const nameWithoutDim = name.replace(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/, '');
  const gsmMatch = nameWithoutDim.match(/\b(\d{2,4})\b/);
  const gsm = gsmMatch ? parseInt(gsmMatch[1]) : null;

  const normalizedGrade = nameWithoutDim.replace(/\b\d{2,4}\b/g, '').replace(/khổ|giấy/gi, '').trim().toUpperCase();
  
  let familyKey = null;
  let familyName = null;
  
  if (normalizedGrade.includes('COUCHE') || normalizedGrade.includes('C150') || normalizedGrade.includes('C300') || name.toUpperCase().includes('COUCHE')) {
    familyKey = `COUCHE_${gsm || 'UNKNOWN'}`;
    familyName = `Couche ${gsm || ''}`.trim();
  } else if (normalizedGrade.includes('DECAL NHỰA SỮA') || normalizedGrade.includes('DECAL NHUA SUA')) {
    familyKey = 'DECAL_NHUA_SUA';
    familyName = 'Decal nhựa sữa';
  } else if (normalizedGrade.includes('DECAL NHỰA') || normalizedGrade.includes('DECAL NHUA')) {
    familyKey = 'DECAL_NHUA';
    familyName = 'Decal nhựa';
  } else if (normalizedGrade.includes('DECAL BỂ') || normalizedGrade.includes('DECAL BE')) {
    familyKey = 'DECAL_BE';
    familyName = 'Decal bể';
  } else if (normalizedGrade.includes('DECAL') && !normalizedGrade.includes('NHỰA')) {
    familyKey = 'DECAL_GIAY';
    familyName = 'Decal giấy';
  } else if (normalizedGrade.includes('KRAFT')) {
    familyKey = `KRAFT_${gsm || 'UNKNOWN'}`;
    familyName = `Kraft ${gsm || ''}`.trim();
  } else if (normalizedGrade.includes('DUPLEX')) {
    familyKey = `DUPLEX_${gsm || 'UNKNOWN'}`;
    familyName = `Duplex ${gsm || ''}`.trim();
  } else if (normalizedGrade.includes('IVORY')) {
    familyKey = `IVORY_${gsm || 'UNKNOWN'}`;
    familyName = `Ivory ${gsm || ''}`.trim();
  } else if (normalizedGrade.includes('BRISTOL')) {
    familyKey = `BRISTOL_${gsm || 'UNKNOWN'}`;
    familyName = `Bristol ${gsm || ''}`.trim();
  } else if (normalizedGrade.includes('FORD') || normalizedGrade.includes('FORT')) {
    familyKey = `FORD_${gsm || 'UNKNOWN'}`;
    familyName = `Ford ${gsm || ''}`.trim();
  }

  return { widthCm, heightCm, gsm, normalizedGrade, familyKey, familyName };
}

export function getMaterialFamilyKey(material: InventoryItem) {
  if (material.familyKey) return material.familyKey;
  
  // Fallback 1: Extract from name
  const info = extractMaterialInfo(material.name);
  if (info.familyKey) return info.familyKey;

  // Fallback 2: Category + Type + Gsm/Thickness
  const parts = [material.category];
  if (material.materialType) parts.push(material.materialType);
  if (material.gsm) parts.push(`GSM${material.gsm}`);
  if (material.thickness) parts.push(`THICK${material.thickness}`);
  
  if (parts.length > 1) { // At least category + something else
    return parts.join('_').toUpperCase();
  }
  
  return null;
}

export function isSameMaterialFamily(parent: InventoryItem, child: InventoryItem) {
  const parentFamily = getMaterialFamilyKey(parent);
  const childFamily = getMaterialFamilyKey(child);
  
  if (parentFamily && childFamily) {
    return parentFamily === childFamily;
  }
  
  // If we can't determine family for one or both, we should probably return false to be safe
  return false;
}

export function calculateMaxPieces(parent: InventoryItem, child: InventoryItem) {
  const pWidth = parent.sheetWidthCm || extractMaterialInfo(parent.name).widthCm;
  const pHeight = parent.sheetHeightCm || extractMaterialInfo(parent.name).heightCm;
  const cWidth = child.sheetWidthCm || extractMaterialInfo(child.name).widthCm;
  const cHeight = child.sheetHeightCm || extractMaterialInfo(child.name).heightCm;

  if (!pWidth || !pHeight || !cWidth || !cHeight) {
    return null; // Cannot calculate
  }

  const normalFit = Math.floor(pWidth / cWidth) * Math.floor(pHeight / cHeight);
  const rotatedFit = Math.floor(pWidth / cHeight) * Math.floor(pHeight / cWidth);
  return Math.max(normalFit, rotatedFit);
}

export function validateRecipeInput(parentMaterial: InventoryItem, childMaterial: InventoryItem, piecesInput: number): { valid: boolean; reason?: string; maxPieces?: number } {
  if (parentMaterial.id === childMaterial.id) {
    return { valid: false, reason: 'Vật tư mẹ và con không được giống nhau.' };
  }
  
  if (parentMaterial.category !== 'PAPER' && parentMaterial.category !== 'DECAL') {
    return { valid: false, reason: 'Chỉ hỗ trợ cắt giấy hoặc decal.' };
  }
  if (parentMaterial.stockBaseUnit !== 'SHEET' || childMaterial.stockBaseUnit !== 'SHEET') {
    return { valid: false, reason: 'Chỉ hỗ trợ cắt giấy cho vật tư dạng Tờ (SHEET).' };
  }
  
  if (!isSameMaterialFamily(parentMaterial, childMaterial)) {
    return { valid: false, reason: 'Vật tư mẹ và con không cùng loại (Family/Grade).' };
  }
  
  if (!Number.isInteger(piecesInput) || piecesInput <= 0) {
    return { valid: false, reason: 'Định mức cắt (số tờ con) phải là số nguyên dương lớn hơn 0.' };
  }
  
  const maxPieces = calculateMaxPieces(parentMaterial, childMaterial);
  if (maxPieces === null) {
    return { valid: false, reason: 'Không thể tính toán do thiếu thông tin kích thước của vật tư mẹ hoặc con.' };
  }
  
  if (maxPieces === 0) {
    return { valid: false, reason: 'Kích thước vật tư con lớn hơn vật tư mẹ.' };
  }
  
  if (piecesInput > maxPieces) {
    return { valid: false, reason: `Số lượng tờ con (${piecesInput}) vượt quá tối đa lý thuyết (${maxPieces} tờ) theo kích thước khổ.`, maxPieces };
  }
  
  return { valid: true };
}
export function filterValidChildMaterials(parentMaterial: InventoryItem, allMaterials: InventoryItem[]): InventoryItem[] {
  if (parentMaterial.category !== 'PAPER' && parentMaterial.category !== 'DECAL') {
    return [];
  }

  const pWidth = parentMaterial.sheetWidthCm || extractMaterialInfo(parentMaterial.name).widthCm;
  const pHeight = parentMaterial.sheetHeightCm || extractMaterialInfo(parentMaterial.name).heightCm;

  return allMaterials.filter(child => {
    if (child.id === parentMaterial.id) return false;
    if (child.category !== parentMaterial.category) return false;
    if (child.status !== 'ACTIVE') return false;
    if (child.stockBaseUnit !== 'SHEET') return false;
    if (!isSameMaterialFamily(parentMaterial, child)) return false;

    const maxPieces = calculateMaxPieces(parentMaterial, child);
    if (maxPieces === null || maxPieces <= 0) return false;

    const cWidth = child.sheetWidthCm || extractMaterialInfo(child.name).widthCm;
    const cHeight = child.sheetHeightCm || extractMaterialInfo(child.name).heightCm;

    const isSameDimensions = 
      (pWidth === cWidth && pHeight === cHeight) || 
      (pWidth === cHeight && pHeight === cWidth);
      
    if (isSameDimensions) return false;

    return true;
  });
}

export function filterValidParentMaterials(child: InventoryItem, allMaterials: InventoryItem[]) {
  const childFamily = getMaterialFamilyKey(child);
  if (!childFamily) return [];
  
  const cWidth = child.sheetWidthCm || extractMaterialInfo(child.name).widthCm;
  const cHeight = child.sheetHeightCm || extractMaterialInfo(child.name).heightCm;

  return allMaterials.filter(parent => {
    if (parent.id === child.id) return false;
    if (parent.stockBaseUnit !== 'SHEET') return false;
    if (parent.status !== 'ACTIVE') return false;
    if (parent.category !== child.category) return false;
    
    // Must be same family
    const parentFamily = getMaterialFamilyKey(parent);
    if (parentFamily !== childFamily) return false;
    
    // Child must fit inside parent
    const maxPieces = calculateMaxPieces(parent, child);
    if (maxPieces === null || maxPieces <= 0) return false;
    
    const pWidth = parent.sheetWidthCm || extractMaterialInfo(parent.name).widthCm;
    const pHeight = parent.sheetHeightCm || extractMaterialInfo(parent.name).heightCm;

    const isSameDimensions = 
      (pWidth === cWidth && pHeight === cHeight) || 
      (pWidth === cHeight && pHeight === cWidth);
      
    if (isSameDimensions) return false;

    return true;
  });
}
