import React from 'react';
import ManagementCostingClient from './management-costing-client';
import { getManagementCostReport } from '@/lib/management-cost-report-actions';

export default async function ManagementCostingPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const periodType = (searchParams.periodType as any) || 'MONTH';
  const fromDate = searchParams.fromDate as string | undefined;
  const toDate = searchParams.toDate as string | undefined;

  const res = await getManagementCostReport({ periodType, fromDate, toDate });

  if (!res.success) {
    if (res.error === 'PERMISSION_DENIED') {
      return (
        <div className="p-8 max-w-4xl mx-auto text-center mt-20">
          <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100">
            <h2 className="text-xl font-bold mb-2">Quyền truy cập bị từ chối</h2>
            <p>Bạn không có quyền xem báo cáo tài chính quản trị này.</p>
          </div>
        </div>
      );
    }
    return <div className="p-8 text-red-500">Lỗi tải dữ liệu</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-slate-800 dark:text-white">
          Báo cáo chi phí & Lợi nhuận sản xuất
        </h1>
        <a 
          href="/dashboard/reports/margin-review"
          className="px-4 py-2 bg-orange-500 text-white font-semibold rounded-lg shadow-sm hover:bg-orange-600 transition-colors flex items-center gap-2"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          Duyệt Alert Lợi nhuận
        </a>
      </div>
      <ManagementCostingClient data={res} initialPeriodType={periodType} initialFromDate={fromDate} initialToDate={toDate} />
    </div>
  );
}
