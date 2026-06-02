import { MachineConfig, PackingItem } from './types';

export function getUsableArea(machineConfig: MachineConfig) {
  // Trả về vùng in hiệu dụng dựa trên sheet - margins
  const usableW = machineConfig.sheetWidthCm - (machineConfig.marginLeftCm + machineConfig.marginRightCm);
  const usableH = machineConfig.sheetHeightCm - (machineConfig.marginTopCm + machineConfig.marginBottomCm);
  return {
    usableWidthCm: Math.max(0, usableW),
    usableHeightCm: Math.max(0, usableH),
  };
}

export function isInsideCornerMark(
  item: PackingItem,
  usableWidthCm: number,
  usableHeightCm: number,
  machineConfig: MachineConfig
): boolean {
  if (!machineConfig.avoidCornerMarks) return false;
  if (machineConfig.cornerMarkWidthCm <= 0 || machineConfig.cornerMarkHeightCm <= 0) return false;

  const lLen = machineConfig.cornerMarkWidthCm; // Chiều dài mỗi cạnh của góc L
  const margin = 0.15; // Clearance distance 1.5mm

  // Góc L nằm ở 4 góc của vùng usable.
  // Xác định 4 mốc (trên-trái, trên-phải, dưới-trái, dưới-phải).
  // Hệ tọa độ: x, y tính từ 0 đến usableWidthCm, usableHeightCm.

  // Mốc 1: Top-Left (hướng xuống và phải) -> dx=1, dy=1
  // Mốc 2: Top-Right (hướng xuống và trái) -> dx=-1, dy=1
  // Mốc 3: Bottom-Left (hướng lên và phải) -> dx=1, dy=-1
  // Mốc 4: Bottom-Right (hướng lên và trái) -> dx=-1, dy=-1

  const marks = [
    { xv: 0, yv: 0, dx: 1, dy: 1 },
    { xv: usableWidthCm, yv: 0, dx: -1, dy: 1 },
    { xv: 0, yv: usableHeightCm, dx: 1, dy: -1 },
    { xv: usableWidthCm, yv: usableHeightCm, dx: -1, dy: -1 }
  ];

  for (const m of marks) {
    // 1. Cạnh ngang của L-mark
    const hMinX = Math.min(m.xv, m.xv + m.dx * lLen);
    const hMaxX = Math.max(m.xv, m.xv + m.dx * lLen);
    const hY = m.yv;

    // Kiểm tra overlap theo Y (bao gồm an toàn margin)
    if (item.y - margin <= hY && hY <= item.y + item.height + margin) {
      // Kiểm tra overlap theo X
      if (Math.max(item.x - margin, hMinX) <= Math.min(item.x + item.width + margin, hMaxX)) {
        return true;
      }
    }

    // 2. Cạnh dọc của L-mark
    const vMinY = Math.min(m.yv, m.yv + m.dy * lLen);
    const vMaxY = Math.max(m.yv, m.yv + m.dy * lLen);
    const vX = m.xv;

    // Kiểm tra overlap theo X (bao gồm an toàn margin)
    if (item.x - margin <= vX && vX <= item.x + item.width + margin) {
      // Kiểm tra overlap theo Y
      if (Math.max(item.y - margin, vMinY) <= Math.min(item.y + item.height + margin, vMaxY)) {
        return true;
      }
    }
  }

  return false;
}

export function filterOrAdjustLayoutForCornerMarks(
  items: PackingItem[],
  usableWidthCm: number,
  usableHeightCm: number,
  machineConfig?: MachineConfig
): PackingItem[] {
  if (!machineConfig || !machineConfig.avoidCornerMarks) return items;

  return items.filter(item => !isInsideCornerMark(item, usableWidthCm, usableHeightCm, machineConfig));
}
