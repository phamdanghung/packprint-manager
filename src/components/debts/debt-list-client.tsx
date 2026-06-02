'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, User, FileText, AlertTriangle } from 'lucide-react';
import { formatCurrencyVND } from '@/lib/utils';

export default function DebtListClient({ initialCustomers, currentUserRole }: { initialCustomers: any[], currentUserRole: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [search, setSearch] = useState(searchParams.get('q') || '');

  const totalDebt = initialCustomers.reduce((sum, c) => sum + c.debtBalance, 0);
  const totalOrdersInDebt = initialCustomers.reduce((sum, c) => sum + c.orders.length, 0);

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    router.push(`/dashboard/debts?${params.toString()}`);
  };

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center">
            <AlertTriangle className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Tổng công nợ</div>
            <div className="text-2xl font-bold text-rose-600">{formatCurrencyVND(totalDebt)}</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
            <User className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Số khách đang nợ</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{initialCustomers.length}</div>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center">
            <FileText className="h-6 w-6" />
          </div>
          <div>
            <div className="text-sm text-slate-500 font-medium">Số đơn chưa thanh toán</div>
            <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{totalOrdersInDebt}</div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm mã khách, tên, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilter()}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
            />
          </div>
          <button onClick={handleFilter} className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium">Lọc</button>
        </div>

        {initialCustomers.length === 0 ? (
          <div className="p-12 text-center text-slate-500">
            Không tìm thấy khách hàng nào đang có công nợ.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4">Mã KH</th>
                  <th className="px-6 py-4">Khách hàng</th>
                  <th className="px-6 py-4 text-right">Tổng nợ</th>
                  <th className="px-6 py-4 text-center">Số đơn nợ</th>
                  <th className="px-6 py-4">Sales phụ trách</th>
                  <th className="px-6 py-4 text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {initialCustomers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <td className="px-6 py-4 font-medium text-teal-600">{c.customerCode}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 dark:text-slate-100">{c.name}</div>
                      <div className="text-xs text-slate-500 mt-1">{c.phone}</div>
                    </td>
                    <td className="px-6 py-4 text-right min-w-[150px]">
                      <span className="font-bold text-rose-600 block">{formatCurrencyVND(c.debtBalance)}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="inline-flex items-center justify-center px-2.5 py-1 bg-amber-100 text-amber-800 rounded-full text-xs font-bold">
                        {c.orders.length}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-700 dark:text-slate-300">
                      {c.assignedSales?.name || '---'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <Link 
                        href={`/dashboard/customers/${c.id}?tab=debts`}
                        className="text-xs px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg font-medium"
                      >
                        Chi tiết
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
