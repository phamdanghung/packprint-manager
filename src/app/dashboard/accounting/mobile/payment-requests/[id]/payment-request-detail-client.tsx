'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPaymentRequestMobile } from '@/lib/accounting-mobile-actions';

export default function PaymentRequestDetailClient({ prId, status }: { prId: string, status: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleConfirm = async () => {
    let input: any = {};
    if (status === 'PENDING') {
      const reason = prompt('Khách chưa báo đã chuyển. Vui lòng nhập lý do xác nhận thủ công khoản tiền này:');
      if (!reason) return;
      input = { forceManualConfirm: true, manualConfirmReason: reason };
    } else {
      if (!confirm('Bạn xác nhận đã nhận được khoản tiền này?')) return;
    }
    
    setLoading(true);
    setError(null);
    const result = await confirmPaymentRequestMobile(prId, input);
    if (result.success) {
      alert('Đã xác nhận thanh toán thành công!');
      router.refresh();
      // Chuyển hướng sang trang chi tiết Payment (hoặc in) có thể làm sau, tạm thời refresh
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  if (status === 'CONFIRMED' || status === 'CANCELLED' || status === 'EXPIRED') {
    return null; // Không hiển thị nút nếu đã xử lý
  }

  return (
    <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-30 pb-safe pb-8">
      {error && <div className="mb-3 text-red-600 text-sm font-medium text-center">{error}</div>}
      <button
        onClick={handleConfirm}
        disabled={loading}
        className="w-full bg-indigo-600 text-white font-bold py-3.5 rounded-xl active:bg-indigo-700 shadow-sm disabled:opacity-50"
      >
        {loading ? 'Đang xử lý...' : 'Xác nhận Đã nhận tiền'}
      </button>
    </div>
  );
}
