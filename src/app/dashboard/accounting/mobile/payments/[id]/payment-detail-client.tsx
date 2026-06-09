'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { confirmPaymentMobile, cancelPaymentMobile } from '@/lib/accounting-mobile-actions';

export default function PaymentDetailClient({ paymentId }: { paymentId: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');

  const handleConfirm = async () => {
    if (!confirm('Bạn xác nhận đã nhận đủ số tiền này?')) return;
    
    setLoading(true);
    setError(null);
    const result = await confirmPaymentMobile(paymentId);
    if (result.success) {
      alert('Đã xác nhận thanh toán thành công!');
      router.refresh();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      alert('Vui lòng nhập lý do từ chối');
      return;
    }
    
    setLoading(true);
    setError(null);
    const result = await cancelPaymentMobile(paymentId, cancelReason);
    if (result.success) {
      alert('Đã từ chối thanh toán!');
      setShowCancelModal(false);
      router.refresh();
    } else {
      setError(result.error);
    }
    setLoading(false);
  };

  return (
    <>
      <div className="fixed bottom-0 left-0 w-full bg-white border-t border-slate-200 p-4 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] z-30 pb-safe pb-8">
        {error && <div className="mb-3 text-red-600 text-sm font-medium text-center">{error}</div>}
        <div className="flex space-x-3">
          <button
            onClick={() => setShowCancelModal(true)}
            disabled={loading}
            className="flex-1 bg-red-50 text-red-600 font-bold py-3.5 rounded-xl border border-red-200 active:bg-red-100 disabled:opacity-50"
          >
            Từ chối
          </button>
          <button
            onClick={handleConfirm}
            disabled={loading}
            className="flex-[2] bg-indigo-600 text-white font-bold py-3.5 rounded-xl active:bg-indigo-700 shadow-sm disabled:opacity-50"
          >
            {loading ? 'Đang xử lý...' : 'Xác nhận Đã nhận tiền'}
          </button>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm p-6 shadow-xl animate-in fade-in zoom-in-95">
            <h3 className="text-lg font-bold text-slate-800 mb-2">Từ chối thanh toán</h3>
            <p className="text-sm text-slate-500 mb-4">Vui lòng cho biết lý do bạn từ chối khoản thanh toán này (bắt buộc).</p>
            
            <textarea
              className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none mb-4"
              rows={3}
              placeholder="Ví dụ: Chưa nhận được tiền, Sai số tiền..."
              value={cancelReason}
              onChange={e => setCancelReason(e.target.value)}
              disabled={loading}
            ></textarea>

            <div className="flex space-x-3">
              <button
                onClick={() => setShowCancelModal(false)}
                disabled={loading}
                className="flex-1 bg-slate-100 text-slate-700 font-bold py-3 rounded-xl"
              >
                Hủy bỏ
              </button>
              <button
                onClick={handleCancel}
                disabled={loading}
                className="flex-1 bg-red-600 text-white font-bold py-3 rounded-xl disabled:opacity-50"
              >
                {loading ? 'Đang lưu...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
