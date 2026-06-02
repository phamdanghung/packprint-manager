'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createPayment } from '@/lib/payment-actions';
import { formatCurrencyVND, formatDate } from '@/lib/utils';
import { Plus, CheckCircle, Clock } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy'
};

const METHOD_LABELS: Record<string, string> = {
  CASH: 'Tiền mặt',
  BANK_TRANSFER: 'Chuyển khoản',
  MOMO: 'Ví Momo',
  ZALOPAY: 'ZaloPay',
  CARD: 'Quẹt thẻ',
  COD: 'Thu hộ (COD)',
  OFFSET: 'Cấn trừ công nợ',
  OTHER: 'Khác'
};

export default function PaymentSection({ order, payments, currentUserRole }: { order: any, payments: any[], currentUserRole: string }) {
  const router = useRouter();
  const [showForm, setShowForm] = useState(false);
  
  const [amount, setAmount] = useState(order.debtAmount > 0 ? order.debtAmount : 0);
  const [method, setMethod] = useState('BANK_TRANSFER');
  const [note, setNote] = useState('');
  const [referenceCode, setReferenceCode] = useState('');
  const [proofImageUrl, setProofImageUrl] = useState('');
  const [loading, setLoading] = useState(false);

  const canCreate = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'].includes(currentUserRole);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return alert('Số tiền phải lớn hơn 0');
    if (amount > order.debtAmount) return alert('Số tiền không được lớn hơn nợ còn lại');
    
    // SALES chỉ được tạo PENDING, các role khác tự CONFIRMED (trong form này mặc định confirm nếu có quyền)
    const status = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(currentUserRole) ? 'CONFIRMED' : 'PENDING';
    
    setLoading(true);
    const res = await createPayment(order.id, amount, method, status, note, referenceCode, proofImageUrl);
    setLoading(false);
    
    if (res.success) {
      alert(`Đã tạo phiếu thu thành công (Trạng thái: ${STATUS_LABELS[status]})`);
      setShowForm(false);
      router.refresh();
    } else {
      alert((res as any).error || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Thanh toán & Công nợ</h2>
        {canCreate && order.debtAmount > 0 && !showForm && (
          <button 
            onClick={() => setShowForm(true)}
            className="flex items-center gap-1 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" /> Ghi nhận Thu tiền
          </button>
        )}
      </div>

      <div className="space-y-2 mb-6 text-sm">
        <div className="flex justify-between font-bold">
          <span>Tổng phải thu:</span> <span className="text-blue-600">{formatCurrencyVND(order.totalAmount)}</span>
        </div>
        <div className="flex justify-between text-emerald-600">
          <span>Đã thu:</span> <span>{formatCurrencyVND(order.paidAmount)}</span>
        </div>
        <div className="flex justify-between text-rose-600 font-bold">
          <span>Còn nợ:</span> <span>{formatCurrencyVND(order.debtAmount)}</span>
        </div>
        <div className="mt-2 text-xs font-bold uppercase p-1 inline-block border rounded bg-slate-100 dark:bg-slate-700">
          Tình trạng: {order.paymentStatus}
        </div>
      </div>

      {showForm && (
        <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6">
          <h3 className="font-bold mb-4">Tạo Phiếu thu mới</h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Số tiền (VNĐ)</label>
                <input 
                  type="number" 
                  value={amount}
                  onChange={e => setAmount(Number(e.target.value))}
                  max={order.debtAmount}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Phương thức</label>
                <select 
                  value={method}
                  onChange={e => setMethod(e.target.value)}
                  className="w-full p-2 border rounded-lg dark:bg-slate-800"
                >
                  {Object.entries(METHOD_LABELS).map(([k, v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Mã tham chiếu/Mã GD</label>
                <input 
                  type="text" 
                  value={referenceCode}
                  onChange={e => setReferenceCode(e.target.value)}
                  placeholder="Ví dụ: FT2309..."
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-500 mb-1">Link ảnh chứng từ (nếu có)</label>
                <input 
                  type="text" 
                  value={proofImageUrl}
                  onChange={e => setProofImageUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full p-2 border rounded-lg dark:bg-slate-800 text-sm"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Ghi chú</label>
              <textarea 
                value={note}
                onChange={e => setNote(e.target.value)}
                className="w-full p-2 border rounded-lg dark:bg-slate-800 text-sm"
                rows={2}
                placeholder="Nội dung/mã GD..."
              />
            </div>
            <div className="flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 border rounded-lg text-sm"
              >
                Hủy
              </button>
              <button 
                type="submit" 
                disabled={loading}
                className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium"
              >
                Xác nhận
              </button>
            </div>
          </form>
        </div>
      )}

      <div>
        <h3 className="font-bold mb-3 text-sm text-slate-600 dark:text-slate-400 border-b pb-2">Lịch sử phiếu thu</h3>
        {payments.length === 0 ? (
          <div className="text-center text-sm text-slate-500 py-4">Chưa có phiếu thu nào.</div>
        ) : (
          <div className="space-y-3">
            {payments.map((p) => (
              <div key={p.id} className="flex justify-between items-center p-3 border rounded-lg bg-slate-50 dark:bg-slate-900/50">
                <div>
                  <div className="font-bold text-teal-600">{formatCurrencyVND(p.amount)}</div>
                  <div className="text-xs text-slate-500 mt-1 flex gap-2">
                    <span>{METHOD_LABELS[p.paymentMethod] || p.paymentMethod}</span>
                    <span>•</span>
                    <span>{formatDate(p.createdAt)}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-xs font-bold px-2 py-1 rounded-full inline-block ${
                    p.paymentStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                    p.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                    'bg-slate-200 text-slate-700'
                  }`}>
                    {STATUS_LABELS[p.paymentStatus]}
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">{p.paymentCode}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
