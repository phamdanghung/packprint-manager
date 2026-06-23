export function roundMoneyVnd(amount: number): number {
  return Math.round(amount);
}

export function ceilMoneyVnd(amount: number): number {
  return Math.ceil(amount);
}

export function floorMoneyVnd(amount: number): number {
  return Math.floor(amount);
}

export function roundUnitPrice(amount: number): number {
  // Đôi khi đơn giá có thể lẻ, nhưng theo chuẩn này thì ta vẫn trả về Int
  return Math.round(amount);
}

export function applyBasisPoints(amount: number, basisPoints: number): number {
  // basisPoints = 800 => 8%
  return Math.round((amount * basisPoints) / 10000);
}

export function applyPermille(amount: number, permille: number): number {
  // permille = 1300 => 1.3
  return Math.round((amount * permille) / 1000);
}
