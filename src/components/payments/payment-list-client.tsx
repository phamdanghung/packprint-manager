'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Clock, CheckCircle, XCircle } from 'lucide-react';
import { formatCurrencyVND, formatDate } from '@/lib/utils';
import { confirmPayment, cancelPayment } from '@/lib/payment-actions';

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xác nhận',
  CONFIRMED: 'Đã xác nhận',
  CANCELLED: 'Đã hủy'
};

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
  CONFIRMED: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
  CANCELLED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200'
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

export default function PaymentListClient({ initialPayments, currentUserRole }: { initialPayments: any[], currentUserRole: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [loading, setLoading] = useState(false);

  const canConfirm = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(currentUserRole);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    router.push(`/dashboard/payments?${params.toString()}`);
  };

  const handleConfirm = async (id: string) => {
    if (!confirm('Xác nhận đã nhận đủ số tiền này và cập nhật công nợ?')) return;
    setLoading(true);
    const res = await confirmPayment(id);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleCancel = async (id: string) => {
    const reason = prompt('Nhập lý do hủy phiếu thu này:');
    if (!reason) return;
    setLoading(true);
    const res = await cancelPayment(id, reason);
    setLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm mã phiếu, khách hàng, mã đơn..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilter()}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
          <select 
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button onClick={handleFilter} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">Lọc</button>
        </div>
      </div>

      {initialPayments.length === 0 ? (
        <div className="p-12 text-center text-slate-500">
          Không tìm thấy phiếu thu nào.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Mã PT / Đơn hàng</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Phương thức</th>
                <th className="px-6 py-4 text-right">Số tiền</th>
                <th className="px-6 py-4">Nhân viên</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {initialPayments.map((p) => (
                <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="px-6 py-4">
                    <div className="font-bold text-teal-600 mb-1">{p.paymentCode}</div>
                    <a href={`/dashboard/orders/${p.orderId}`} className="text-xs text-slate-500 hover:underline">
                      {p.order.orderCode}
                    </a>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{p.customer.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{p.customer.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[p.paymentStatus]}`}>
                      {STATUS_LABELS[p.paymentStatus]}
                    </span>
                    {p.paidAt && (
                      <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> {formatDate(p.paidAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <span className="font-bold text-slate-900 dark:text-slate-100">
                      {formatCurrencyVND(p.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-xs text-slate-500">
                      Tạo: <span className="font-medium text-slate-700 dark:text-slate-300">{p.createdBy?.name}</span>
                    </div>
                    {p.receivedBy && (
                      <div className="text-xs text-slate-500 mt-1">
                        Thu: <span className="font-medium text-slate-700 dark:text-slate-300">{p.receivedBy.name}</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <div className="flex justify-center gap-2">
                      {p.paymentStatus === 'PENDING' && canConfirm && (
                        <button 
                          onClick={() => handleConfirm(p.id)}
                          disabled={loading}
                          title="Xác nhận đã thu tiền"
                          className="p-1.5 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-md"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                      )}
                      {p.paymentStatus !== 'CANCELLED' && canConfirm && (
                        <button 
                          onClick={() => handleCancel(p.id)}
                          disabled={loading}
                          title="Hủy phiếu thu"
                          className="p-1.5 bg-red-100 text-red-600 hover:bg-red-200 rounded-md"
                        >
                          <XCircle className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
