import React from 'react';
import Link from 'next/link';
import { db } from '@/lib/db';
import { getCustomerReactivationStatus } from '@/lib/crm/crm-config';
import { getCustomersWithCrmFilters } from '@/lib/crm-actions';
import { Users, PhoneCall, AlertTriangle, Calendar, Search } from 'lucide-react';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CrmDashboardPage() {
  const rawCustomers = await getCustomersWithCrmFilters({});
  
  if (!rawCustomers) {
    return <div className="p-4 text-red-600">Lỗi lấy dữ liệu</div>;
  }

  const customers = rawCustomers.map((c: any) => ({
    ...c,
    reactivation: getCustomerReactivationStatus(c)
  }));

  
  const reactivationCount = customers.filter((c: any) => c.reactivation.level !== 'NONE').length;
  
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  
  const allFollowUps = await db.customerFollowUp.findMany({
    where: { status: 'OPEN', dueAt: { lte: endOfToday } },
    include: { customer: { select: { id: true, name: true } } },
    orderBy: { dueAt: 'asc' }
  });
  
  const followUpsTodayFiltered = allFollowUps.filter((f: any) => customers.some((c: any) => c.id === f.customerId));
  const overdueFollowUps = followUpsTodayFiltered.length;

  const activeCustomers = customers.filter((c: any) => c.crmStatus === 'ACTIVE' || c.crmStatus === 'WON').length;
  const totalDebt = customers.reduce((acc: number, c: any) => acc + (c.debtBalance || 0), 0);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto pb-24 md:pb-6 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">CRM Dashboard</h1>
          <p className="text-slate-500 text-sm">Tổng quan hiệu quả chăm sóc khách hàng</p>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          <Link href="/dashboard/crm/reactivation" className="bg-rose-100 text-rose-700 hover:bg-rose-200 px-3 py-2 md:px-4 rounded-lg font-medium flex items-center transition-colors whitespace-nowrap">
            <AlertTriangle className="w-4 h-4 mr-1.5" />
            Khách cần chăm sóc ({reactivationCount})
          </Link>
          <Link href="/dashboard/customers" className="bg-indigo-600 text-white hover:bg-indigo-700 px-3 py-2 md:px-4 rounded-lg font-medium flex items-center transition-colors whitespace-nowrap">
            <Users className="w-4 h-4 mr-1.5" />
            Khách hàng
          </Link>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center text-slate-500 mb-1.5 md:mb-2">
            <Users className="w-4 h-4 md:w-5 md:h-5 mr-1.5 shrink-0" />
            <span className="font-medium text-xs md:text-base leading-tight">Tổng khách hàng</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-800">{customers.length}</div>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center text-amber-500 mb-1.5 md:mb-2">
            <PhoneCall className="w-4 h-4 md:w-5 md:h-5 mr-1.5 shrink-0" />
            <span className="font-medium text-xs md:text-base leading-tight">Cần liên hệ (Quá hạn)</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-800">{overdueFollowUps}</div>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center text-rose-500 mb-1.5 md:mb-2">
            <AlertTriangle className="w-4 h-4 md:w-5 md:h-5 mr-1.5 shrink-0" />
            <span className="font-medium text-xs md:text-base leading-tight">Lâu chưa mua</span>
          </div>
          <div className="text-xl md:text-2xl font-bold text-slate-800">{reactivationCount}</div>
        </div>
        <div className="bg-white p-3 md:p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col justify-center">
          <div className="flex items-center text-green-600 mb-1.5 md:mb-2">
            <svg className="w-4 h-4 md:w-5 md:h-5 mr-1.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span className="font-medium text-xs md:text-base leading-tight">Tổng công nợ</span>
          </div>
          <div className="text-[1.1rem] md:text-2xl font-bold text-slate-800 whitespace-nowrap">
            {totalDebt > 1000000 ? `${(totalDebt / 1000000).toLocaleString('vi-VN', { maximumFractionDigits: 1 })} tr đ` : `${totalDebt.toLocaleString('vi-VN')} đ`}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Khách cần chăm sóc lại */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center">
            <span className="flex items-center"><AlertTriangle className="w-4 h-4 mr-2 text-rose-500" /> Cần chăm sóc lại (Reactivation)</span>
            <Link href="/dashboard/crm/reactivation" className="text-sm text-indigo-600 font-normal hover:underline">Xem tất cả</Link>
          </div>
          <div className="divide-y divide-slate-100">
            {customers.filter((c: any) => c.reactivation.level !== 'NONE').slice(0, 5).map((c: any) => (
              <div key={c.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <Link href={`/dashboard/customers/${c.id}`} className="font-bold text-slate-800 hover:text-indigo-600">{c.name}</Link>
                  <div className="text-sm text-slate-500 mt-1 flex flex-wrap items-center gap-2">
                    <span>{c.phone}</span>
                    <span className="px-2 py-0.5 bg-rose-100 text-rose-700 rounded text-xs font-medium">{c.reactivation.label}</span>
                  </div>
                </div>
                <Link href={`/dashboard/customers/${c.id}?tab=timeline`} className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 whitespace-nowrap text-center">
                  Chi tiết
                </Link>
              </div>
            ))}
            {reactivationCount === 0 && (
              <div className="p-8 text-center text-slate-500">
                Không có khách hàng nào cần cảnh báo chăm sóc lại
              </div>
            )}
          </div>
        </div>

        {/* Lịch follow up */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-800 flex justify-between items-center">
            <span className="flex items-center"><Calendar className="w-4 h-4 mr-2 text-indigo-500" /> Lịch hẹn / Follow-ups hôm nay</span>
          </div>
          <div className="divide-y divide-slate-100">
            {followUpsTodayFiltered.slice(0, 5).map((f: any) => (
              <div key={f.id} className="p-4 flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <Link href={`/dashboard/customers/${f.customerId}`} className="font-bold text-slate-800 hover:text-indigo-600">{f.title}</Link>
                  <div className="text-sm text-slate-500 mt-1 flex items-center gap-2">
                    Khách: {f.customer.name}
                  </div>
                </div>
                <div className="text-sm text-slate-500 whitespace-nowrap">
                  {f.dueAt.toLocaleDateString('vi-VN')}
                </div>
              </div>
            ))}
            {followUpsTodayFiltered.length === 0 && (
              <div className="p-8 text-center text-slate-500">
                Không có lịch hẹn hôm nay
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
