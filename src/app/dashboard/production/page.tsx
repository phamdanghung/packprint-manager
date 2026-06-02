import React from 'react';
import { getProductionJobs } from '@/lib/production-actions';
import Unauthorized from '@/components/unauthorized';
import { getCurrentUser } from '@/lib/auth';
import ProductionListClient from '@/components/production/production-list-client';

export default async function ProductionPage() {
  const user = await getCurrentUser();
  if (!user || ['ACCOUNTANT'].includes(user.role)) return <Unauthorized />;

  const res = await getProductionJobs();
  const jobs = (res.success && res.data) ? res.data : [];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý Tiến độ Sản xuất</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách các lệnh sản xuất hiện hành</p>
        </div>
      </div>

      <ProductionListClient jobs={jobs} userRole={user.role} />
    </div>
  );
}
