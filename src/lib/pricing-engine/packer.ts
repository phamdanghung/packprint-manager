import { PackingInput, PackingItem, PackingOutput, LabelShape, LayoutType } from './types';
import { filterOrAdjustLayoutForCornerMarks } from './machine-safe-zone';

export function packGrid(
  W: number, H: number, 
  w: number, h: number, 
  g: number, 
  startX: number = 0, startY: number = 0, 
  isRotated: boolean = false
): PackingItem[] {
  const rects: PackingItem[] = [];
  const cols = Math.floor((W + g) / (w + g));
  const rows = Math.floor((H + g) / (h + g));
  
  if (cols <= 0 || rows <= 0) return rects;

  const gridW = cols * w + (cols - 1) * g;
  const gridH = rows * h + (rows - 1) * g;
  const offsetX = (W - gridW) / 2;
  const offsetY = (H - gridH) / 2;

  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: startX + offsetX + c * (w + g),
        y: startY + offsetY + r * (h + g),
        width: w,
        height: h,
        rotation: isRotated ? 90 : 0,
        shape: 'RECTANGLE'
      });
    }
  }
  return rects;
}

export function packHexagonal(W: number, H: number, D: number, g: number): PackingItem[] {
  const rects: PackingItem[] = [];
  const Sx = D + g;
  const Sy = Sx * (Math.sqrt(3) / 2);
  const colsOdd = Math.floor((W + g) / Sx);
  const colsEven = Math.floor((W + g - Sx / 2) / Sx);
  
  let rows = 0;
  if (H + g >= Sx) rows = Math.floor((H + g - Sx) / Sy) + 1;
  
  if (rows <= 0 || (colsOdd <= 0 && colsEven <= 0)) return rects;

  const gridH = (rows - 1) * Sy + D;
  const offsetY = (H - gridH) / 2;

  const oddWidth = colsOdd * Sx - g;
  const evenWidth = colsEven > 0 ? colsEven * Sx + (Sx / 2) - g : 0;
  const gridW = Math.max(oddWidth, evenWidth);
  const offsetX = (W - gridW) / 2;

  for (let r = 0; r < rows; r++) {
    const isEvenRow = (r % 2 !== 0);
    const cols = isEvenRow ? colsEven : colsOdd;
    const rowShiftX = isEvenRow ? (Sx / 2) : 0;
    
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: offsetX + rowShiftX + c * Sx,
        y: offsetY + r * Sy,
        width: D,
        height: D,
        rotation: 0,
        shape: 'CIRCLE'
      });
    }
  }
  return rects;
}

export function packLabels(input: PackingInput): PackingOutput {
  const cw = input.usableWidthCm;
  const ch = input.usableHeightCm;
  const g = input.gapCm;
  
  let bestLayout: PackingItem[] = [];
  let layoutTypeUsed: LayoutType = 'NORMAL';

  if (input.labelShape === 'CIRCLE' || input.labelShape === 'HEXAGON') {
    const D = input.diameterCm || Math.max(input.widthCm, input.heightCm);
    if (D > 0) {
      bestLayout = packHexagonal(cw, ch, D, g);
      bestLayout.forEach(item => item.shape = input.labelShape);
    }
  } else {
    // RECTANGLE / ROUNDED_RECTANGLE / CUSTOM
    const tw = input.widthCm;
    const th = input.heightCm;
    
    if (tw > 0 && th > 0) {
      const unrotLayout = packGrid(cw, ch, tw, th, g, 0, 0, false);
      bestLayout = unrotLayout;
      layoutTypeUsed = 'NORMAL';

      if (input.layoutType === 'ROTATED' || input.layoutType === 'MIXED') {
        const rotLayout = packGrid(cw, ch, th, tw, g, 0, 0, true);
        
        if (input.layoutType === 'ROTATED' || rotLayout.length > bestLayout.length) {
          bestLayout = rotLayout;
          layoutTypeUsed = 'ROTATED';
        }

        if (input.layoutType === 'MIXED') {
          // Tính Mixed
          const checkSplits = (w1: number, h1: number, w2: number, h2: number) => {
            const maxRowsUnrot = Math.floor((ch + g) / (h1 + g));
            for (let r = 1; r <= maxRowsUnrot; r++) {
              const topH = r * (h1 + g) - g;
              const topR = packGrid(cw, topH, w1, h1, g, 0, 0, false);
              const bStartY = topH + g;
              const bH = ch - bStartY;
              if (bH > 0) {
                const bR = packGrid(cw, bH, w2, h2, g, 0, bStartY, true);
                const candidate = [...topR, ...bR];
                if (candidate.length > bestLayout.length) { 
                  bestLayout = candidate; 
                  layoutTypeUsed = 'MIXED'; 
                }
              }
            }
            
            const maxRowsRot = Math.floor((ch + g) / (h2 + g));
            for (let r = 1; r <= maxRowsRot; r++) {
              const topH = r * (h2 + g) - g;
              const topR = packGrid(cw, topH, w2, h2, g, 0, 0, true);
              const bStartY = topH + g;
              const bH = ch - bStartY;
              if (bH > 0) {
                const bR = packGrid(cw, bH, w1, h1, g, 0, bStartY, false);
                const candidate = [...topR, ...bR];
                if (candidate.length > bestLayout.length) { 
                  bestLayout = candidate; 
                  layoutTypeUsed = 'MIXED'; 
                }
              }
            }
            
            const maxColsUnrot = Math.floor((cw + g) / (w1 + g));
            for (let c = 1; c <= maxColsUnrot; c++) {
              const leftW = c * (w1 + g) - g;
              const leftR = packGrid(leftW, ch, w1, h1, g, 0, 0, false);
              const rStartX = leftW + g;
              const rW = cw - rStartX;
              if (rW > 0) {
                const rR = packGrid(rW, ch, w2, h2, g, rStartX, 0, true);
                const candidate = [...leftR, ...rR];
                if (candidate.length > bestLayout.length) { 
                  bestLayout = candidate; 
                  layoutTypeUsed = 'MIXED'; 
                }
              }
            }
            
            const maxColsRot = Math.floor((cw + g) / (w2 + g));
            for (let c = 1; c <= maxColsRot; c++) {
              const leftW = c * (w2 + g) - g;
              const leftR = packGrid(leftW, ch, w2, h2, g, 0, 0, true);
              const rStartX = leftW + g;
              const rW = cw - rStartX;
              if (rW > 0) {
                const rR = packGrid(rW, ch, w1, h1, g, rStartX, 0, false);
                const candidate = [...leftR, ...rR];
                if (candidate.length > bestLayout.length) { 
                  bestLayout = candidate; 
                  layoutTypeUsed = 'MIXED'; 
                }
              }
            }
          };
          
          checkSplits(tw, th, th, tw);
        }
      }
      
      bestLayout.forEach(item => item.shape = input.labelShape);
    }
  }

  // Filter cho L-Marks (Machine Config)
  if (input.machineConfig && input.machineConfig.avoidCornerMarks) {
    const originalCount = bestLayout.length;
    bestLayout = filterOrAdjustLayoutForCornerMarks(bestLayout, cw, ch, input.machineConfig);
  }

  const warnings: string[] = [];
  if (bestLayout.length === 0) {
    warnings.push('Không thể xếp được tem nào trên khổ giấy này với kích thước đã cho.');
  }

  return {
    labelsPerSheet: bestLayout.length,
    layoutTypeUsed,
    items: bestLayout,
    warnings,
    notes: []
  };
}
