export const OUTBOUND_TYPES = [
  { value: 'PRODUCTION_ISSUE', label: 'Xuất cho sản xuất' },
  { value: 'ADJUSTMENT', label: 'Xuất điều chỉnh' },
  { value: 'RETURN_SUPPLIER', label: 'Xuất trả nhà cung cấp' },
  { value: 'DAMAGED', label: 'Xuất hủy / vật tư lỗi' },
  { value: 'INTERNAL_USE', label: 'Xuất nội bộ' },
  { value: 'OTHER', label: 'Khác' }
];

export const OUTBOUND_STATUS = [
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' }
];

export function getOutboundTypeLabel(value: string): string {
  return OUTBOUND_TYPES.find(t => t.value === value)?.label || value;
}

export function getOutboundStatusLabel(value: string): string {
  return OUTBOUND_STATUS.find(s => s.value === value)?.label || value;
}
