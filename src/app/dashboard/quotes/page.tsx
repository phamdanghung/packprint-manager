import React from 'react';
import { PlusCircle, Search, FileText, CheckCircle2, AlertCircle, Clock, ShoppingBag } from 'lucide-react';
import { db } from '@/lib/db';
import { formatVND, formatDate } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';

export default async function QuotesPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
  if (!allowedRoles.includes(user.role)) {
    return <Unauthorized />;
  }

  const quotes = await db.quote.findMany({
    include: {
      customer: true,
      createdBy: true,
      items: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const getQuoteStatus = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return { label: 'Bản nháp', bg: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700/50' };
      case 'SENT':
        return { label: 'Đã gửi khách', bg: 'bg-blue-50 text-blue-700 dark:bg-blue-950/20 dark:text-blue-400 border border-blue-200 dark:border-blue-900/30' };
      case 'APPROVED':
        return { label: 'Đã duyệt (Lên đơn)', bg: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/30' };
      case 'REJECTED':
        return { label: 'Từ chối', bg: 'bg-rose-50 text-rose-700 dark:bg-rose-950/20 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30' };
      default:
        return { label: status, bg: 'bg-slate-100 text-slate-700' };
    }
  };

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Báo giá & Dự toán Chi phí</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Quản lý báo giá in ấn bao bì, chi phí nguyên vật liệu, ca máy in và gia công thành phẩm.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 transition-all cursor-pointer">
          <PlusCircle className="h-4 w-4" />
          <span>Tạo Báo giá mới</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            placeholder="Tìm kiếm báo giá theo mã, khách hàng..."
          />
        </div>
      </div>

      {/* Quotes List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Mã báo giá / Ngày tạo</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Khách hàng</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Quy cách & Sản phẩm in</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Tổng trị giá</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Nhân viên Sale</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
              {quotes.map((q) => {
                const statusBadge = getQuoteStatus(q.status);
                const items = q.items;

                return (
                  <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                    {/* Mã */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="font-bold text-slate-850 dark:text-white flex items-center gap-1.5 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        <FileText className="h-4 w-4 text-slate-400" />
                        <span>{q.quoteNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-450 dark:text-slate-500">
                        {formatDate(q.createdAt)}
                      </div>
                    </td>

                    {/* Khách hàng */}
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-700 dark:text-slate-350">{q.customer.name}</div>
                      {q.customer.companyName && (
                        <div className="text-[10px] text-slate-450 dark:text-slate-500 italic">{q.customer.companyName}</div>
                      )}
                    </td>

                    {/* Chi tiết sản phẩm in */}
                    <td className="py-4 px-4 max-w-[300px]">
                      {items.map((item, i) => (
                        <div key={i} className="space-y-0.5">
                          <div className="font-bold text-slate-700 dark:text-slate-350">
                            {item.name}
                          </div>
                          <div className="text-[10px] text-slate-500 flex flex-wrap gap-x-2">
                            <span>SL: <strong>{item.qty.toLocaleString()}</strong></span>
                            <span>| Kích thước: <strong>{item.size}</strong></span>
                            <span>| Chất liệu: <strong>{item.paper}</strong></span>
                          </div>
                        </div>
                      ))}
                    </td>

                    {/* Trị giá */}
                    <td className="py-4 px-4 text-right font-bold text-slate-800 dark:text-white">
                      {formatVND(q.totalAmount)}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </td>

                    {/* Sale */}
                    <td className="py-4 px-4 text-slate-600 dark:text-slate-400 font-medium">
                      {q.createdBy.name}
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
