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
  // Cắt phần thập phân nếu có trước khi định dạng
  let cleaned = rawStr;
  if (rawStr.includes('.')) {
    cleaned = sanitizeIntegerInput(rawStr);
  }
  
  const numStr = cleaned.replace(/\D/g, '');
  if (!numStr) return '';
  const stripped = numStr.replace(/^0+/, '');
  if (!stripped && numStr.length > 0) return '0';
  return stripped.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}
