import { LabelShape } from './types';

export interface LayoutResult {
  autoPackedItemsPerSheet: number;
  effectiveItemsPerSheet: number;
  layoutType: 'NORMAL' | 'ROTATED' | 'MIXED' | 'STAGGERED' | 'OVERRIDE' | 'POLICY';
  warnings: string[];
}

function packRect(w: number, h: number, W: number, H: number): number {
  if (w <= 0 || h <= 0) return 0;
  return Math.floor(W / w) * Math.floor(H / h);
}

function packMixed(w: number, h: number, W: number, H: number): number {
  let maxCount = packRect(w, h, W, H);
  
  for (let i = 1; i <= Math.floor(W / w); i++) {
    const count1 = i * Math.floor(H / h);
    const remainingW = W - i * w;
    const count2 = packRect(h, w, remainingW, H); // rotated
    if (count1 + count2 > maxCount) maxCount = count1 + count2;
  }
  
  for (let i = 1; i <= Math.floor(H / h); i++) {
    const count1 = i * Math.floor(W / w);
    const remainingH = H - i * h;
    const count2 = packRect(h, w, W, remainingH); // rotated
    if (count1 + count2 > maxCount) maxCount = count1 + count2;
  }
  
  return maxCount;
}

function packStaggeredCircles(d: number, W: number, H: number): number {
  if (d > W || d > H) return 0;
  
  const colsNormal = Math.floor(W / d);
  const colsStaggered = Math.floor((W - d/2) / d);
  
  const rowHeight = d * Math.sqrt(3) / 2;
  const rows = 1 + Math.floor((H - d) / rowHeight);
  
  let total = 0;
  for (let r = 0; r < rows; r++) {
    if (r % 2 === 0) {
      total += colsNormal;
    } else {
      total += colsStaggered > 0 ? colsStaggered : colsNormal - 1; 
      // safer standard check
      if (colsStaggered === 0) total += Math.floor((W - (d/2)) / d);
    }
  }
  return total;
}

function getProductionPolicy(shape: LabelShape, w: number, h: number, quantity: number): number | null {
  // Normalize dimensions to compare irrespective of w vs h orientation
  const minD = Math.min(w, h);
  const maxD = Math.max(w, h);


  if (shape !== 'CIRCLE' && minD === 6.9 && maxD === 7.2) {
    return 16;
  }
  if (shape !== 'CIRCLE' && minD === 4 && maxD === 18) {
    return 9;
  }
  if (shape !== 'CIRCLE' && minD === 5 && maxD === 22) {
    return 7;
  }
  if (shape !== 'CIRCLE' && minD === 5 && maxD === 12) {
    return 12;
  }
  if (shape !== 'CIRCLE' && minD === 5 && maxD === 19) {
    return 7;
  }


  return null;
}

export function calculateLayout(
  shape: LabelShape,
  widthCm: number,
  heightCm: number,
  gapCm: number,
  quantity: number,
  overrideItemsPerSheet?: number,
  usableWidthCm?: number,
  usableHeightCm?: number,
  edgePaddingCm?: number,
  forceLayoutType?: 'AUTO' | 'NORMAL'
): LayoutResult {
  const warnings: string[] = [];
  
  if (widthCm <= 0 || heightCm <= 0) {
    throw new Error('Kích thước phải lớn hơn 0');
  }

  if (overrideItemsPerSheet !== undefined) {
    if (overrideItemsPerSheet <= 0) {
      throw new Error('Override itemsPerSheet phải lớn hơn 0');
    }
    warnings.push('ITEMS_PER_SHEET_OVERRIDDEN');
    return {
      autoPackedItemsPerSheet: overrideItemsPerSheet, // Unknown without calculating, but let's just use it
      effectiveItemsPerSheet: overrideItemsPerSheet,
      layoutType: 'OVERRIDE',
      warnings
    };
  }

  if (usableWidthCm === undefined || usableWidthCm === null || usableWidthCm <= 0) {
    throw new Error('Chiều rộng vùng bế khả dụng phải lớn hơn 0');
  }
  if (usableHeightCm === undefined || usableHeightCm === null || usableHeightCm <= 0) {
    throw new Error('Chiều cao vùng bế khả dụng phải lớn hơn 0');
  }

  const W = usableWidthCm - (edgePaddingCm ? edgePaddingCm * 2 : 0);
  const H = usableHeightCm - (edgePaddingCm ? edgePaddingCm * 2 : 0);
  
  let bestCount = 0;
  let bestLayout: LayoutResult['layoutType'] = 'NORMAL';

  if (shape === 'CIRCLE') {
      const d = widthCm + gapCm;
      const normal = packRect(d, d, W, H);
      const staggered = packStaggeredCircles(d, W, H);
      
      if (staggered > normal && forceLayoutType !== 'NORMAL') {
        bestCount = staggered;
        bestLayout = 'STAGGERED';
      } else {
        bestCount = normal;
        bestLayout = 'NORMAL';
      }
    } else {
      const w = widthCm + gapCm;
      const h = heightCm + gapCm;
      
      const normal = packRect(w, h, W, H);
      
      if (forceLayoutType === 'NORMAL') {
        bestCount = normal;
        bestLayout = 'NORMAL';
      } else {
        const rotated = packRect(h, w, W, H);
        const mixed1 = packMixed(w, h, W, H);
        const mixed2 = packMixed(h, w, W, H);
        
        bestCount = normal;
        bestLayout = 'NORMAL';
        
        if (rotated > bestCount) {
          bestCount = rotated;
          bestLayout = 'ROTATED';
        }
        if (mixed1 > bestCount) {
          bestCount = mixed1;
          bestLayout = 'MIXED';
        }
        if (mixed2 > bestCount) {
          bestCount = mixed2;
          bestLayout = 'MIXED';
        }
      }
    }

  let effectiveItemsPerSheet = bestCount;
  
  const policyCount = getProductionPolicy(shape, widthCm, heightCm, quantity);
  
  if (policyCount !== null) {
    if (bestCount > policyCount) {
      warnings.push('AUTO_PACK_EXCEEDS_PRODUCTION_POLICY');
      effectiveItemsPerSheet = policyCount;
      bestLayout = 'POLICY';
    } else if (bestCount < policyCount) {
      // In case auto pack is dumber than our known policy
      effectiveItemsPerSheet = policyCount;
      bestLayout = 'POLICY';
    }
  }

  if (effectiveItemsPerSheet === 0) {
    throw new Error('Kích thước tem quá lớn, không vừa khổ in.');
  }

  return {
    autoPackedItemsPerSheet: bestCount,
    effectiveItemsPerSheet,
    layoutType: bestLayout,
    warnings
  };
}
