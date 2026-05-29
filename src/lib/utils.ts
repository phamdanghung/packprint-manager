export function cn(...classes: (string | undefined | null | boolean)[]) {
  return classes.filter(Boolean).join(' ');
}

export function formatVND(value: number): string {
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(value);
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

export function getRoleName(role: string): string {
  switch (role) {
    case 'ADMIN':
      return 'Chủ doanh nghiệp / Admin';
    case 'SALE':
      return 'Nhân viên Sale';
    case 'DESIGNER':
      return 'Nhân viên Thiết kế';
    case 'PRODUCTION':
      return 'Bộ phận Sản xuất';
    case 'ACCOUNTANT':
      return 'Kế toán tài chính';
    default:
      return role;
  }
}

export function getOrderStatusBadge(status: string): { label: string; bg: string; text: string } {
  switch (status) {
    case 'PENDING':
      return { label: 'Chờ xử lý', bg: 'bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30', text: 'text-amber-700 dark:text-amber-400' };
    case 'DESIGNING':
      return { label: 'Đang thiết kế', bg: 'bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/30', text: 'text-blue-700 dark:text-blue-400' };
    case 'DESIGN_APPROVED':
      return { label: 'Đã duyệt file', bg: 'bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-200 dark:border-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-400' };
    case 'PRODUCING':
      return { label: 'Đang sản xuất', bg: 'bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900/30', text: 'text-orange-700 dark:text-orange-400' };
    case 'COMPLETED':
      return { label: 'Hoàn thành', bg: 'bg-teal-50 dark:bg-teal-950/20 border border-teal-200 dark:border-teal-900/30', text: 'text-teal-700 dark:text-teal-400' };
    case 'DELIVERED':
      return { label: 'Đã giao hàng', bg: 'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400' };
    case 'CANCELLED':
      return { label: 'Đã hủy', bg: 'bg-rose-50 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/30', text: 'text-rose-700 dark:text-rose-400' };
    default:
      return { label: status, bg: 'bg-slate-100 border border-slate-200', text: 'text-slate-700' };
  }
}
