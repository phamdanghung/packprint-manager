'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrderPayment } from '@/lib/order-actions';

export default function UpdatePayment({ orderId, initialPaid, totalAmount, userRole }: { orderId: string, initialPaid: number, totalAmount: number, userRole: string }) {
  const router = useRouter();
  const [paid, setPaid] = useState(initialPaid);
  const [loading, setLoading] = useState(false);

  const canEdit = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);

  if (!canEdit) return <div className="text-slate-500 italic">Chỉ kế toán/Admin có quyền cập nhật.</div>;

  const handleUpdate = async () => {
    if (!confirm('Xác nhận cập nhật thanh toán?')) return;
    setLoading(true);
    const res = await updateOrderPayment(orderId, paid);
    if (res.success) {
      alert('Cập nhật thanh toán thành công!');
      router.refresh();
    } else {
      alert(res.error || 'Cập nhật thất bại');
    }
    setLoading(false);
  };

  return (
    <div className="flex gap-2 items-center">
      <input 
        type="number" 
        value={paid} 
        onChange={e => setPaid(Number(e.target.value))}
        className="p-2 border rounded-lg dark:bg-slate-900 w-40"
      />
      <span>/ {totalAmount.toLocaleString()} VNĐ</span>
      <button 
        onClick={handleUpdate} 
        disabled={loading || paid === initialPaid}
        className="bg-green-600 hover:bg-green-700 text-white font-bold py-2 px-4 rounded-lg disabled:opacity-50"
      >
        Lưu thanh toán
      </button>
    </div>
  );
}
