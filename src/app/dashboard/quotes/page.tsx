import React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, FileText } from 'lucide-react';
import { getQuotes } from '@/lib/quote-actions';
import { formatCurrencyVND, formatDate } from '@/lib/utils';
import Unauthorized from '@/components/unauthorized';
import { getCurrentUser } from '@/lib/auth';

export default async function QuotesPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
  if (!allowedRoles.includes(user.role)) return <Unauthorized />;

  const res = await getQuotes();
  const quotes = res.success ? res.data : [];

  const getQuoteStatus = (status: string) => {
    switch (status) {
      case 'DRAFT': return { label: 'Bản nháp', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800' };
      case 'SENT': return { label: 'Đã gửi khách', bg: 'bg-blue-50 text-blue-700' };
      case 'ACCEPTED': return { label: 'Đã duyệt', bg: 'bg-emerald-50 text-emerald-700' };
      case 'REJECTED': return { label: 'Từ chối', bg: 'bg-rose-50 text-rose-700' };
      default: return { label: status, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Danh sách Báo giá</h1>
        </div>
        {user.role !== 'ACCOUNTANT' && (
          <Link href="/dashboard/quotes/new" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md">
            <PlusCircle className="h-4 w-4" />
            <span>Tạo Báo giá mới</span>
          </Link>
        )}
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-xs" placeholder="Tìm kiếm báo giá..." />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm">
        <div className="overflow-x-auto rounded-2xl border custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 font-bold border-b">
                <th className="py-4 px-4 uppercase">Mã báo giá / Ngày</th>
                <th className="py-4 px-4 uppercase">Khách hàng</th>
                <th className="py-4 px-4 uppercase">Sản phẩm</th>
                <th className="py-4 px-4 uppercase text-right">Tổng tiền</th>
                <th className="py-4 px-4 uppercase">Trạng thái</th>
                <th className="py-4 px-4 uppercase">Người tạo</th>
                <th className="py-4 px-4 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {quotes?.map((q: any) => {
                const statusBadge = getQuoteStatus(q.status);
                const firstItem = q.items?.[0];
                return (
                  <tr key={q.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4">
                      <div className="font-bold flex items-center gap-1.5">
                        <FileText className="h-4 w-4" /> <span>{q.quoteNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDate(q.createdAt)}</div>
                    </td>
                    <td className="py-4 px-4 font-bold">{q.customer?.name}</td>
                    <td className="py-4 px-4 max-w-[200px]">
                      {firstItem && (
                        <div>
                          <div className="font-bold">{firstItem.name}</div>
                          <div className="text-[10px] text-slate-500">SL: {firstItem.quantity}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-blue-600">
                      {formatCurrencyVND(q.totalAmount)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">{q.createdBy?.name}</td>
                    <td className="py-4 px-4">
                      <div className="flex gap-2">
                        <Link href={`/dashboard/quotes/${q.id}`} className="text-blue-500 hover:underline">Xem</Link>
                        {q.status === 'DRAFT' && user.role !== 'ACCOUNTANT' && (
                          <Link href={`/dashboard/quotes/${q.id}/edit`} className="text-orange-500 hover:underline">Sửa</Link>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
