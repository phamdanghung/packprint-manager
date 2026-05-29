import React from 'react';
import { DollarSign, Search, Calendar, User, ArrowDownRight, CreditCard } from 'lucide-react';
import { db } from '@/lib/db';
import { formatVND, formatDate } from '@/lib/utils';

export default async function DebtPage() {
  const payments = await db.payment.findMany({
    include: {
      order: {
        include: {
          customer: true
        }
      }
    },
    orderBy: {
      paymentDate: 'desc'
    }
  });

  const totalCollected = payments.reduce((acc, curr) => acc + curr.amount, 0);

  return (
    <div className="space-y-6 font-sans">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Thu chi & Công nợ</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Theo dõi doanh thu, lịch sử thanh toán từ khách hàng và quản lý dư nợ phải thu hồi.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left column: History of payments */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Lịch sử thu tiền công nợ gần đây</h3>
            
            <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                    <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Ngày thanh toán</th>
                    <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Đơn hàng / Khách hàng</th>
                    <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Phương thức</th>
                    <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Số tiền thu</th>
                    <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Ghi chú</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                  {payments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                      <td className="py-4 px-4 text-slate-500 font-medium">
                        {formatDate(p.paymentDate)}
                      </td>
                      <td className="py-4 px-4 space-y-0.5">
                        <div className="font-bold text-slate-850 dark:text-white">{p.order.orderNumber}</div>
                        <div className="text-[10px] text-slate-500 font-medium">{p.order.customer.name}</div>
                      </td>
                      <td className="py-4 px-4">
                        <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                          p.paymentMethod === 'TRANSFER' 
                            ? 'bg-blue-500/10 text-blue-600 dark:text-blue-450 border border-blue-500/20' 
                            : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-450 border border-emerald-500/20'
                        }`}>
                          {p.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : 'Tiền mặt'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400">
                        {formatVND(p.amount)}
                      </td>
                      <td className="py-4 px-4 text-slate-500 italic max-w-[150px] truncate" title={p.notes || ''}>
                        {p.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Right column: Stat card */}
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-slate-900 via-emerald-955 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-4 shadow-xl relative overflow-hidden">
            <div className="absolute top-0 right-0 w-[50%] h-full bg-teal-500/10 blur-[40px] pointer-events-none" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-teal-300 uppercase tracking-wider">Tổng quỹ thực thu</span>
              <DollarSign className="h-5 w-5 text-teal-400" />
            </div>
            <div className="space-y-1">
              <h2 className="text-3xl font-extrabold tracking-tight text-white">{formatVND(totalCollected)}</h2>
              <p className="text-[10px] text-slate-400">Tổng ngân quỹ tích lũy từ các khoản thanh toán thực tế của khách hàng.</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
            <h4 className="text-xs font-bold text-slate-850 dark:text-white uppercase tracking-wider">Kênh thanh toán</h4>
            <div className="space-y-3 text-xs">
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/30">
                <span className="font-semibold text-slate-700 dark:text-slate-350">Chuyển khoản Ngân hàng</span>
                <span className="font-bold text-slate-800 dark:text-white">90%</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-slate-100 dark:border-slate-900/30">
                <span className="font-semibold text-slate-700 dark:text-slate-350">Tiền mặt tại văn phòng</span>
                <span className="font-bold text-slate-800 dark:text-white">10%</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
