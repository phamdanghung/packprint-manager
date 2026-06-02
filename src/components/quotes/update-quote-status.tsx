'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateQuoteStatus } from '@/lib/quote-actions';

const STATUSES = [
  { value: 'DRAFT', label: 'Nháp' },
  { value: 'SENT', label: 'Đã gửi khách' },
  { value: 'ACCEPTED', label: 'Khách đồng ý' },
  { value: 'REJECTED', label: 'Từ chối' },
  { value: 'EXPIRED', label: 'Hết hạn' },
  { value: 'CONVERTED', label: 'Đã chuyển đơn hàng' }
];

export default function UpdateQuoteStatus({ quoteId, initialStatus }: { quoteId: string, initialStatus: string }) {
  const router = useRouter();
  const [status, setStatus] = useState(initialStatus);
  const [loading, setLoading] = useState(false);

  const handleUpdate = async (newStatus: string) => {
    setStatus(newStatus);
    setLoading(true);
    const res = await updateQuoteStatus(quoteId, newStatus);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error || 'Lỗi cập nhật trạng thái');
      setStatus(initialStatus);
    }
    setLoading(false);
  };

  if (initialStatus === 'CONVERTED') {
    return <span className="font-bold text-emerald-600 border border-emerald-600 bg-emerald-50 px-2 py-1 rounded">ĐÃ CHUYỂN ĐƠN HÀNG</span>;
  }

  return (
    <select 
      value={status} 
      onChange={e => handleUpdate(e.target.value)}
      disabled={loading}
      className="font-bold bg-slate-100 border border-slate-300 text-slate-700 rounded px-2 py-1 outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
    >
      {STATUSES.map(s => (
        <option key={s.value} value={s.value} disabled={s.value === 'CONVERTED'}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
