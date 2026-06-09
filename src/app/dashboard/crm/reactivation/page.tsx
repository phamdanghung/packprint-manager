import React from 'react';
import Link from 'next/link';
import { getReactivationCustomers } from '@/lib/crm-actions';
import { Phone, Calendar, AlertTriangle } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function ReactivationListPage({ searchParams }: { searchParams: Promise<{ level?: string }> }) {
  const resolvedParams = await searchParams;
  const result = await getReactivationCustomers();
  
  if (!result.success) {
    if (result.error === 'Chưa đăng nhập') redirect('/login');
    return <div className="p-4 text-red-600">Lỗi: {result.error}</div>;
  }

  let customers = result.data || [];
  
  if (resolvedParams.level) {
    customers = customers.filter((c: any) => c.reactivation.level === resolvedParams.level);
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center">
            <AlertTriangle className="w-6 h-6 mr-2 text-rose-500" />
            Khách cần chăm sóc lại
          </h1>
          <p className="text-slate-500 text-sm">Danh sách khách hàng lâu chưa phát sinh đơn mới</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/crm/reactivation" className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${!resolvedParams.level ? 'bg-slate-800 text-white' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            Tất cả
          </Link>
          <Link href="/dashboard/crm/reactivation?level=NO_ORDER_30_DAYS" className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${resolvedParams.level === 'NO_ORDER_30_DAYS' ? 'bg-amber-100 text-amber-700 border-amber-200' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            30+ ngày
          </Link>
          <Link href="/dashboard/crm/reactivation?level=NO_ORDER_60_DAYS" className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${resolvedParams.level === 'NO_ORDER_60_DAYS' ? 'bg-orange-100 text-orange-700 border-orange-200' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            60+ ngày
          </Link>
          <Link href="/dashboard/crm/reactivation?level=NO_ORDER_90_DAYS" className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${resolvedParams.level === 'NO_ORDER_90_DAYS' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            90+ ngày
          </Link>
          <Link href="/dashboard/crm/reactivation?level=INACTIVE_CUSTOMER" className={`px-3 py-1.5 rounded-lg text-sm font-medium border ${resolvedParams.level === 'INACTIVE_CUSTOMER' ? 'bg-slate-200 text-slate-800 border-slate-300' : 'bg-white text-slate-700 hover:bg-slate-50'}`}>
            180+ ngày (Ngủ đông)
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {customers.map((c: any) => (
          <div key={c.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
            <div className="p-4 flex-1">
              <div className="flex justify-between items-start mb-2">
                <Link href={`/dashboard/customers/${c.id}`} className="font-bold text-lg text-indigo-600 hover:underline">
                  {c.name}
                </Link>
                <span className={`px-2 py-1 rounded text-xs font-bold ${
                  c.reactivation.severity === 'critical' ? 'bg-rose-100 text-rose-700' :
                  c.reactivation.severity === 'danger' ? 'bg-orange-100 text-orange-700' :
                  'bg-amber-100 text-amber-700'
                }`}>
                  {c.reactivation.label}
                </span>
              </div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">SĐT:</span>
                  <span className="font-medium text-slate-800">{c.phone}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Sales phụ trách:</span>
                  <span className="font-medium text-slate-800">{c.assignedSales?.name || 'Chưa phân công'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Lần đặt cuối:</span>
                  <span className="font-medium text-slate-800">{c.lastOrderAt ? new Date(c.lastOrderAt).toLocaleDateString('vi-VN') : 'N/A'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Doanh thu cũ:</span>
                  <span className="font-medium text-green-600">{c.totalRevenue?.toLocaleString('vi-VN')} đ</span>
                </div>
                {c.debtBalance > 0 && (
                  <div className="flex justify-between bg-rose-50 p-1.5 rounded text-rose-700">
                    <span>Công nợ:</span>
                    <span className="font-bold">{c.debtBalance.toLocaleString('vi-VN')} đ</span>
                  </div>
                )}
              </div>
            </div>
            <div className="bg-slate-50 p-3 border-t border-slate-100 grid grid-cols-2 gap-2">
              <a href={`tel:${c.phone}`} className="flex items-center justify-center py-2 bg-indigo-50 text-indigo-700 rounded-lg font-medium hover:bg-indigo-100 transition-colors text-sm">
                <Phone className="w-4 h-4 mr-1.5" /> Gọi điện
              </a>
              <Link href={`/dashboard/customers/${c.id}?tab=follow-ups`} className="flex items-center justify-center py-2 bg-white border border-slate-300 text-slate-700 rounded-lg font-medium hover:bg-slate-100 transition-colors text-sm">
                <Calendar className="w-4 h-4 mr-1.5" /> Hẹn lịch
              </Link>
            </div>
          </div>
        ))}
        {customers.length === 0 && (
          <div className="col-span-full py-12 text-center bg-white rounded-xl border border-slate-200 text-slate-500">
            Không tìm thấy khách hàng nào theo điều kiện lọc
          </div>
        )}
      </div>
    </div>
  );
}
