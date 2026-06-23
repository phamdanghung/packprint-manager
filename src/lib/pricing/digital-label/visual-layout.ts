import { LabelShape } from './types';

export interface VisualItem {
  x: number;
  y: number;
  w: number;
  h: number;
  isRotated: boolean;
  type: 'rect' | 'circle';
}

function packGridCoords(W: number, H: number, w: number, h: number, g: number, startX = 0, startY = 0, isRotated = false): VisualItem[] {
  const rects: VisualItem[] = [];
  const cols = Math.floor(W / (w + g));
  const rows = Math.floor(H / (h + g));
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: startX + c * (w + g),
        y: startY + r * (h + g),
        w: w,
        h: h,
        isRotated,
        type: 'rect'
      });
    }
  }
  return rects;
}

function packHexagonalCoords(W: number, H: number, d: number, g: number): VisualItem[] {
  const rects: VisualItem[] = [];
  const D = d + g; // Outer dimension including gap
  if (D > W || D > H) return [];

  const colsNormal = Math.floor(W / D);
  const colsStaggered = Math.floor((W - D / 2) / D);

  const rowHeight = D * Math.sqrt(3) / 2;
  const rows = 1 + Math.floor((H - D) / rowHeight);

  for (let r = 0; r < rows; r++) {
    const isEvenRow = (r % 2 !== 0);
    const cols = isEvenRow ? (colsStaggered > 0 ? colsStaggered : colsNormal - 1) : colsNormal;
    const finalCols = (isEvenRow && colsStaggered === 0) ? Math.floor((W - (D / 2)) / D) : cols;
    const offsetX = isEvenRow ? (D / 2) : 0;
    
    for (let c = 0; c < finalCols; c++) {
      rects.push({
        x: offsetX + c * D,
        y: r * rowHeight,
        w: d,
        h: d,
        isRotated: false,
        type: 'circle'
      });
    }
  }
  return rects;
}

function getBlockDimensions(items: VisualItem[]) {
  if (items.length === 0) return { w: 0, h: 0 };
  let minX = Infinity, minY = Infinity;
  let maxX = -Infinity, maxY = -Infinity;
  for (const item of items) {
    if (item.x < minX) minX = item.x;
    if (item.y < minY) minY = item.y;
    if (item.x + item.w > maxX) maxX = item.x + item.w;
    if (item.y + item.h > maxY) maxY = item.y + item.h;
  }
  return { w: maxX - minX, h: maxY - minY };
}

function packMixedCoords(W: number, H: number, w: number, h: number, g: number, initialRotated = false): VisualItem[] {
  const itemW = w + g;
  const itemH = h + g;

  let bestCount = Math.floor(W / itemW) * Math.floor(H / itemH);
  let bestLayout: VisualItem[] = packGridCoords(W + g, H + g, w, h, g, 0, 0, initialRotated);

  for (let i = 1; i <= Math.floor(W / itemW); i++) {
    const leftW = i * itemW;
    const rightW = W - leftW;
    const count1 = i * Math.floor(H / itemH);
    const count2 = Math.floor(rightW / itemH) * Math.floor(H / itemW);
    
    if (count1 + count2 > bestCount) {
      bestCount = count1 + count2;
      const leftLayout = packGridCoords(leftW + g, H + g, w, h, g, 0, 0, initialRotated);
      const rightLayout = packGridCoords(rightW + g, H + g, h, w, g, leftW, 0, !initialRotated);
      
      const leftDims = getBlockDimensions(leftLayout);
      const rightDims = getBlockDimensions(rightLayout);
      const maxH = Math.max(leftDims.h, rightDims.h);
      
      if (leftDims.h < maxH) {
        const dy = (maxH - leftDims.h) / 2;
        leftLayout.forEach(item => item.y += dy);
      }
      if (rightDims.h < maxH) {
        const dy = (maxH - rightDims.h) / 2;
        rightLayout.forEach(item => item.y += dy);
      }
      
      bestLayout = [...leftLayout, ...rightLayout];
    }
  }

  for (let i = 1; i <= Math.floor(H / itemH); i++) {
    const topH = i * itemH;
    const bottomH = H - topH;
    const count1 = i * Math.floor(W / itemW);
    const count2 = Math.floor(W / itemH) * Math.floor(bottomH / itemW);
    
    if (count1 + count2 > bestCount) {
      bestCount = count1 + count2;
      const topLayout = packGridCoords(W + g, topH + g, w, h, g, 0, 0, initialRotated);
      const bottomLayout = packGridCoords(W + g, bottomH + g, h, w, g, 0, topH, !initialRotated);
      
      const topDims = getBlockDimensions(topLayout);
      const bottomDims = getBlockDimensions(bottomLayout);
      const maxW = Math.max(topDims.w, bottomDims.w);
      
      if (topDims.w < maxW) {
        const dx = (maxW - topDims.w) / 2;
        topLayout.forEach(item => item.x += dx);
      }
      if (bottomDims.w < maxW) {
        const dx = (maxW - bottomDims.w) / 2;
        bottomLayout.forEach(item => item.x += dx);
      }
      
      bestLayout = [...topLayout, ...bottomLayout];
    }
  }

  return bestLayout;
}

export function generateVisualLayout(
  shape: LabelShape,
  widthCm: number,
  heightCm: number,
  gapCm: number,
  usableWidthCm: number,
  usableHeightCm: number,
  layoutType: 'NORMAL' | 'ROTATED' | 'MIXED' | 'STAGGERED' | 'OVERRIDE' | 'POLICY',
  effectiveLimit: number,
  edgePaddingCm: number = 0
): VisualItem[] {
  let items: VisualItem[] = [];
  const containerW = usableWidthCm;
  const containerH = usableHeightCm;
  const W = usableWidthCm - (edgePaddingCm ? edgePaddingCm * 2 : 0);
  const H = usableHeightCm - (edgePaddingCm ? edgePaddingCm * 2 : 0);

  if (shape === 'CIRCLE') {
    if (layoutType === 'STAGGERED' || layoutType === 'POLICY' || layoutType === 'OVERRIDE') {
      items = packHexagonalCoords(W, H, widthCm, gapCm);
      if (layoutType !== 'STAGGERED') {
          // If it's policy, we should generate staggered anyway as it looks best
      }
    } else {
      items = packGridCoords(W + gapCm, H + gapCm, widthCm, widthCm, gapCm, 0, 0, false);
      items.forEach(i => i.type = 'circle');
    }
  } else {
    if (layoutType === 'ROTATED') {
      items = packGridCoords(W + gapCm, H + gapCm, heightCm, widthCm, gapCm, 0, 0, true);
    } else if (layoutType === 'MIXED') {
      items = packMixedCoords(W, H, widthCm, heightCm, gapCm, false);
      const mixed2 = packMixedCoords(W, H, heightCm, widthCm, gapCm, true);
      if (mixed2.length > items.length) {
        items = mixed2;
      }
    } else {
      items = packGridCoords(W + gapCm, H + gapCm, widthCm, heightCm, gapCm, 0, 0, false);
    }
  }

  if (items.length > effectiveLimit && effectiveLimit > 0) {
    items = items.slice(0, effectiveLimit);
  } else if (items.length < effectiveLimit && (layoutType === 'POLICY' || layoutType === 'OVERRIDE')) {
    // Math logic gave fewer items than policy allows (perhaps policy is magic)
    // We just display what we can mathematically.
  }

  // Căn giữa toàn bộ lưới tem vào chính giữa vùng bế (Safe Zone)
  if (items.length > 0) {
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;
    
    for (const item of items) {
      if (item.x < minX) minX = item.x;
      if (item.y < minY) minY = item.y;
      if (item.x + item.w > maxX) maxX = item.x + item.w;
      if (item.y + item.h > maxY) maxY = item.y + item.h;
    }
    
    const blockWidth = maxX - minX;
    const blockHeight = maxY - minY;
    
    // Chỉ dịch chuyển nếu block nhỏ hơn hoặc bằng vùng bế
    if (blockWidth <= containerW && blockHeight <= containerH) {
      const offsetX = (containerW - blockWidth) / 2 - minX;
      const offsetY = (containerH - blockHeight) / 2 - minY;
      
      for (const item of items) {
        item.x += offsetX;
        item.y += offsetY;
      }
    }
  }

  return items;
}
