import { Metadata } from 'next';
import { getDashboardData } from '@/lib/dashboard-actions';
import DashboardClient from './dashboard-client';

export const metadata: Metadata = {
  title: 'Dashboard Tổng quan | PackPrint Manager',
  description: 'Trang quản trị tổng quan hệ thống',
};

export const dynamic = 'force-dynamic';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ timeRange?: string }>;
}) {
  const resolvedParams = await searchParams;
  const timeRange = (resolvedParams.timeRange as 'today' | '7days' | 'thisMonth' | 'lastMonth') || 'thisMonth';
  
  const result = await getDashboardData({ timeRange });
  
  if (!result.success || !result.data) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-slate-800">Lỗi tải dữ liệu</h2>
          <p className="text-slate-500 mt-2">Không thể tải dữ liệu dashboard. Vui lòng thử lại sau.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <DashboardClient initialData={result.data} currentTimeRange={timeRange} />
    </div>
  );
}
