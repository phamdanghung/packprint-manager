import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export async function getCompanyProfile() {
  const profile = await db.companyProfile.findFirst();
  return profile; // could be null, UI should handle fallback
}

export function formatCurrencyVND(amount: number): string {
  // 4.634.000đ
  return Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".") + 'đ';
}

export function formatDateVN(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTimeVN(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = new Date(date);
  if (isNaN(d.getTime())) return '—';
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${hours}:${minutes} ${day}/${month}/${year}`;
}

export function numberToVietnameseWords(amount: number): string {
  if (amount === 0) return 'Không đồng';
  if (amount < 0) return 'Âm ' + numberToVietnameseWords(Math.abs(amount));

  const words = ["không", "một", "hai", "ba", "bốn", "năm", "sáu", "bảy", "tám", "chín"];
  const units = ["", "nghìn", "triệu", "tỷ", "nghìn tỷ", "triệu tỷ"];

  function readBlock(n: number, full: boolean): string {
    let result = "";
    const tram = Math.floor(n / 100);
    const chuc = Math.floor((n % 100) / 10);
    const donVi = n % 10;

    if (full || tram > 0) {
      result += words[tram] + " trăm ";
    }
    
    if (chuc === 0 && donVi > 0) {
      if (full || tram > 0) result += "lẻ ";
    } else if (chuc === 1) {
      result += "mười ";
    } else if (chuc > 1) {
      result += words[chuc] + " mươi ";
    }

    if (donVi === 1 && chuc > 1) {
      result += "mốt ";
    } else if (donVi === 5 && chuc > 0) {
      result += "lăm ";
    } else if (donVi > 0) {
      result += words[donVi] + " ";
    }

    return result.trim();
  }

  let result = "";
  let unitIndex = 0;
  let remaining = Math.round(amount);

  while (remaining > 0) {
    const block = remaining % 1000;
    remaining = Math.floor(remaining / 1000);
    
    if (block > 0) {
      const blockStr = readBlock(block, remaining > 0);
      result = blockStr + " " + units[unitIndex] + " " + result;
    }
    unitIndex++;
  }

  result = result.trim().replace(/\s+/g, ' ');
  return result.charAt(0).toUpperCase() + result.slice(1) + " đồng";
}
