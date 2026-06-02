'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderStatus } from '@/lib/order-actions';

const STATUSES = [
  { value: 'NEW', label: 'Mới tạo' },
  { value: 'WAITING_DESIGN', label: 'Chờ thiết kế' },
  { value: 'WAITING_APPROVAL', label: 'Chờ duyệt file' },
  { value: 'READY_FOR_PRINT', label: 'Sẵn sàng in' },
  { value: 'PRINTING', label: 'Đang in' },
  { value: 'FINISHING', label: 'Đang gia công' },
  { value: 'QC', label: 'Kiểm hàng (QC)' },
  { value: 'READY_FOR_DELIVERY', label: 'Chờ giao hàng' },
  { value: 'DELIVERING', label: 'Đang giao' },
  { value: 'COMPLETED', label: 'Hoàn thành' },
  { value: 'CANCELLED', label: 'Đã huỷ' },
];

export default function UpdateStatus({ orderId, initialStatus, userRole }: { orderId: string, initialStatus: string, userRole: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const isAllowed = (target: string) => {
    if (['ADMIN', 'MANAGER'].includes(userRole)) return true;
    if (userRole === 'SALES' && ['NEW', 'WAITING_DESIGN', 'WAITING_APPROVAL'].includes(target)) return true;
    if (userRole === 'DESIGNER' && ['WAITING_DESIGN', 'WAITING_APPROVAL'].includes(target)) return true;
    if (userRole === 'PRODUCTION' && ['READY_FOR_PRINT', 'PRINTING', 'FINISHING', 'QC'].includes(target)) return true;
    if (userRole === 'DELIVERY' && ['READY_FOR_DELIVERY', 'DELIVERING', 'COMPLETED'].includes(target)) return true;
    return false;
  };

  const handleUpdate = async () => {
    if (!confirm('Xác nhận đổi trạng thái đơn hàng?')) return;
    setLoading(true);
    const res = await updateOrderStatus(orderId, status);
    if (res.success) {
      alert('Cập nhật thành công!');
      router.refresh();
    } else {
      alert(res.error || 'Cập nhật thất bại');
    }
    setLoading(false);
  };

  return (
    <div className="flex gap-2">
      <select 
        value={status} 
        onChange={e => setStatus(e.target.value)}
        className="p-2 border rounded-lg dark:bg-slate-900"
      >
        {STATUSES.map(s => (
          <option key={s.value} value={s.value} disabled={!isAllowed(s.value)}>
            {s.label} {!isAllowed(s.value) && '(Không có quyền)'}
          </option>
        ))}
      </select>
      <button 
        onClick={handleUpdate} 
        disabled={loading || status === initialStatus}
        className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
      >
        Lưu
      </button>
    </div>
  );
}
