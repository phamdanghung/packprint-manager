import React from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, PlusCircle, Filter, Download } from 'lucide-react';
import { db } from '@/lib/db';
import { formatVND, formatDate, getOrderStatusBadge } from '@/lib/utils';

export default async function OrdersPage() {
  const orders = await db.order.findMany({
    include: {
      customer: true,
      quote: true,
      productionSteps: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  const today = new Date();

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Quản lý Đơn hàng</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Xem tiến độ sản xuất, trạng thái duyệt file thiết kế, thanh toán công nợ và chỉ số lời/lỗ chi tiết.</p>
        </div>
        <Link href="/dashboard/quotes" className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 transition-all cursor-pointer">
          <PlusCircle className="h-4 w-4" />
          <span>Tạo Đơn hàng từ Báo giá</span>
        </Link>
      </div>

      {/* Filter Options */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[240px] max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            placeholder="Tìm theo số đơn hàng, tên khách hàng..."
          />
        </div>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 text-slate-600 dark:text-slate-300 transition-all cursor-pointer">
            <Filter className="h-4 w-4 text-slate-400" />
            <span>Lọc trạng thái</span>
          </button>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Đơn hàng / Ngày lập</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Khách hàng</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Báo giá trị</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">File final thiết kế</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Công đoạn sản xuất</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Ngày hẹn giao</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Đã thanh toán / Công nợ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
              {orders.map((o) => {
                const badge = getOrderStatusBadge(o.status);
                const isLate = new Date(o.deliveryDate).getTime() < today.getTime() && o.status !== 'COMPLETED' && o.status !== 'DELIVERED';
                
                const getStepDotColor = (stepName: string) => {
                  const step = o.productionSteps.find(s => s.stepName === stepName);
                  if (!step) return 'bg-slate-200 dark:bg-slate-800';
                  if (step.status === 'COMPLETED') return 'bg-teal-500';
                  if (step.status === 'PROCESSING') return 'bg-orange-500';
                  return 'bg-slate-300 dark:bg-slate-700';
                };

                return (
                  <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                    <td className="py-4 px-4 space-y-1">
                      <div className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5 group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        <ShoppingBag className="h-4 w-4 text-slate-400" />
                        <span>{o.orderNumber}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDate(o.createdAt)}</div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-slate-700 dark:text-slate-300">{o.customer.name}</div>
                      {o.customer.companyName && (
                        <div className="text-[10px] text-slate-500 italic">{o.customer.companyName}</div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800 dark:text-white">
                      {formatVND(o.totalAmount)}
                    </td>
                    <td className="py-4 px-4 max-w-[150px]">
                      {o.finalFileName ? (
                        <div className="flex items-center gap-1.5">
                          <Link href="#" className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 transition-all cursor-pointer flex-shrink-0">
                            <Download className="h-3.5 w-3.5" />
                          </Link>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate" title={o.finalFileName}>
                            {o.finalFileName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Chưa có file duyệt</span>
                      )}
                    </td>
                    <td className="py-4 px-4 space-y-1">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('IN_AN')}`} />
                          <span className="text-[9px] text-slate-500">In</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('BE_THANH_PHAM')}`} />
                          <span className="text-[9px] text-slate-500">Bế</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('DAN_GIAO')}`} />
                          <span className="text-[9px] text-slate-500">Dán</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('DONG_GOI')}`} />
                          <span className="text-[9px] text-slate-500">Gói</span>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className={`font-bold ${isLate ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {formatDate(o.deliveryDate)}
                      </div>
                      {isLate && (
                        <span className="text-[9px] font-bold text-rose-500 uppercase">Trễ hạn</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right space-y-0.5">
                      <div className="font-bold text-slate-700 dark:text-slate-300">{formatVND(o.paidAmount)}</div>
                      <div className={`text-[10px] font-bold ${o.debtAmount > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-teal-600'}`}>
                        {o.debtAmount > 0 ? `Nợ: ${formatVND(o.debtAmount)}` : 'Thu đủ'}
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
