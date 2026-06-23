export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatCurrencyVND(amount: number): string {
  if (!amount) return '0 đ';
  return new Intl.NumberFormat('vi-VN').format(Math.round(amount)) + ' đ';
}

export function formatVND(value: number): string {
  return formatCurrencyVND(value);
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return 'Chưa xác định';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Sai định dạng';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  return `${day}/${month}/${year}`;
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return 'Chưa xác định';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return 'Sai định dạng';
  
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

export function getRoleName(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Chủ doanh nghiệp';
    case 'MANAGER':
      return 'Quản lý';
    case 'SALES':
      return 'Sale / CSKH';
    case 'DESIGNER':
      return 'Thiết kế';
    case 'PRODUCTION':
      return 'Sản xuất';
    case 'ACCOUNTANT':
      return 'Kế toán';
    case 'DELIVERY':
      return 'Giao hàng';
    default:
      return role;
  }
}

export function getOrderStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'WAITING_APPROVAL':
      return { label: 'Chờ duyệt', bg: 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-400' };
    case 'WAITING_DESIGN':
      return { label: 'Chờ thiết kế', bg: 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30', text: 'text-blue-700 dark:text-blue-400' };
    case 'READY_FOR_PRINT':
      return { label: 'Sẵn sàng in', bg: 'bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' };
    case 'PRINTING':
      return { label: 'Đang in', bg: 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30', text: 'text-orange-700 dark:text-orange-400' };
    case 'FINISHING':
      return { label: 'Hoàn thiện', bg: 'bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30', text: 'text-sky-700 dark:text-sky-400' };
    case 'QC':
      return { label: 'Kiểm tra chất lượng', bg: 'bg-fuchsia-50 dark:bg-fuchsia-950/20 border border-fuchsia-200 dark:border-fuchsia-900/30', text: 'text-fuchsia-700 dark:text-fuchsia-400' };
    case 'READY_FOR_DELIVERY':
      return { label: 'Chờ giao hàng', bg: 'bg-purple-50 dark:bg-purple-950/20 border border-purple-200 dark:border-purple-900/30', text: 'text-purple-700 dark:text-purple-400' };
    case 'DELIVERING':
      return { label: 'Đang giao', bg: 'bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-900/30', text: 'text-sky-700 dark:text-sky-400' };
    case 'COMPLETED':
      return { label: 'Hoàn thành', bg: 'bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30', text: 'text-teal-700 dark:text-teal-400' };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30', text: 'text-rose-700 dark:text-rose-400' };
    // Fallbacks for older statuses
    case 'PENDING':
      return { label: 'Chờ xử lý', bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
    case 'DESIGNING':
      return { label: 'Đang thiết kế', bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
    case 'DESIGN_APPROVED':
      return { label: 'Đã duyệt file', bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
    case 'PRODUCING':
      return { label: 'Đang sản xuất', bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
    case 'DELIVERED':
      return { label: 'Đã giao hàng', bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
    default:
      return { label: status, bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
  }
}

export function getProductionStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'READY_FOR_PRINT':
      return { label: 'Sẵn sàng in', bg: 'bg-indigo-50 border border-indigo-200', text: 'text-indigo-700' };
    case 'PRINTING':
      return { label: 'Đang in', bg: 'bg-blue-50 border border-blue-200', text: 'text-blue-700' };
    case 'LAMINATING':
      return { label: 'Cán màng', bg: 'bg-sky-50 border border-sky-200', text: 'text-sky-700' };
    case 'DIE_CUTTING':
      return { label: 'Bế', bg: 'bg-cyan-50 border border-cyan-200', text: 'text-cyan-700' };
    case 'QC':
      return { label: 'QC', bg: 'bg-teal-50 border border-teal-200', text: 'text-teal-700' };
    case 'PACKING':
      return { label: 'Đóng gói', bg: 'bg-orange-50 border border-orange-200', text: 'text-orange-700' };
    case 'READY_FOR_DELIVERY':
      return { label: 'Chờ giao hàng', bg: 'bg-purple-50 border border-purple-200', text: 'text-purple-700' };
    case 'ON_HOLD':
      return { label: 'Tạm dừng', bg: 'bg-amber-50 border border-amber-200', text: 'text-amber-700' };
    case 'REWORK':
      return { label: 'Cần xử lý lại', bg: 'bg-rose-50 border border-rose-200', text: 'text-rose-700' };
    default:
      return { label: status, bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
  }
}

export function getPaymentStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Chờ xác nhận', bg: 'bg-amber-100', text: 'text-amber-700' };
    case 'CONFIRMED':
      return { label: 'Đã xác nhận', bg: 'bg-emerald-100', text: 'text-emerald-700' };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: 'bg-slate-200', text: 'text-slate-700' };
    default:
      return { label: status, bg: 'bg-slate-100', text: 'text-slate-700' };
  }
}

export function getDeliveryCodAmount(order: any) {
  return Math.max(0, order?.debtAmount || 0);
}

export function stripLeadingZeros(value: string): string {
  if (!value) return '';
  if (value.includes('.')) {
    const parts = value.split('.');
    let integerPart = parts[0].replace(/^0+/, '');
    if (integerPart === '') integerPart = '0';
    const decimals = parts.slice(1).join('.');
    return integerPart + '.' + decimals;
  }
  const stripped = value.replace(/^0+/, '');
  if (stripped === '' && value.length > 0) return '0';
  return stripped;
}

export function sanitizeIntegerInput(value: string): string {
  if (!value) return '';
  
  // Chỉ giữ lại chữ số và dấu chấm
  let cleaned = value.replace(/[^0-9.]/g, '');
  
  const dotCount = (cleaned.match(/\./g) || []).length;
  if (dotCount > 1) {
    // Nhiều hơn 1 dấu chấm => phân cách hàng nghìn => loại bỏ
    cleaned = cleaned.replace(/\./g, '');
  } else if (dotCount === 1) {
    const parts = cleaned.split('.');
    const decimalPart = parts[1];
    if (decimalPart.length === 3) {
      // Đúng 3 chữ số ở phần thập phân => phân cách hàng nghìn => loại bỏ
      cleaned = cleaned.replace(/\./g, '');
    } else {
      // Các trường hợp khác => dấu thập phân => cắt bỏ phần thập phân
      cleaned = parts[0];
    }
  }

  const onlyDigits = cleaned.replace(/\D/g, '');
  if (!onlyDigits) return '';
  const stripped = onlyDigits.replace(/^0+/, '');
  if (!stripped && onlyDigits.length > 0) return '0';
  return stripped;
}

export function formatVietnameseInteger(value: string | number): string {
  const rawStr = typeof value === 'number' ? String(value) : value.toString();
  const integerPart = rawStr.split('.')[0];
  const numStr = integerPart.replace(/\D/g, '');
  if (!numStr) return '';
  const stripped = numStr.replace(/^0+/, '');
  if (!stripped && numStr.length > 0) return '0';
  return stripped.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function parseVietnameseInteger(value: string): number {
  const raw = value.replace(/\D/g, '');
  const num = parseInt(raw, 10);
  return isNaN(num) ? 0 : num;
}

export function sanitizePercentInput(value: string): string {
  return sanitizeIntegerInput(value);
}

export function sanitizeMoneyInput(value: string): string {
  return sanitizeIntegerInput(value);
}

export function sanitizeDecimalTechnicalInput(value: string): string {
  let sanitized = value.replace(/[^0-9.]/g, '');
  const parts = sanitized.split('.');
  if (parts.length > 2) {
    sanitized = parts[0] + '.' + parts.slice(1).join('');
  }
  if (sanitized.includes('.')) {
    const dotIndex = sanitized.indexOf('.');
    let integerPart = sanitized.slice(0, dotIndex).replace(/^0+/, '');
    if (integerPart === '') integerPart = '0';
    const decimalPart = sanitized.slice(dotIndex + 1);
    return integerPart + '.' + decimalPart;
  } else {
    const stripped = sanitized.replace(/^0+/, '');
    if (stripped === '' && sanitized.length > 0) return '0';
    return stripped;
  }
}

