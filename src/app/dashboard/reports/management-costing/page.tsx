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
      <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-6">
        Báo cáo chi phí & Lợi nhuận sản xuất
      </h1>
      <ManagementCostingClient data={res} initialPeriodType={periodType} initialFromDate={fromDate} initialToDate={toDate} />
    </div>
  );
}
