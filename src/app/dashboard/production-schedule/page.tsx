import { getProductionMachines, getPrintQueue } from '@/lib/production-schedule-actions';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ScheduleClient from './schedule-client';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Lịch Sản Xuất | PackPrint Manager',
};

export default async function ProductionSchedulePage() {
  const user = await getCurrentUser();
  if (!user || ['SALES', 'DESIGNER', 'DELIVERY', 'ACCOUNTANT'].includes(user.role)) {
    redirect('/dashboard');
  }

  const machines = await getProductionMachines();
  const queueItems = await getPrintQueue(); // Loads all active print jobs

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6 text-slate-800">Lịch Sản Xuất & Hàng Chờ</h1>
      <ScheduleClient 
        machines={machines} 
        queueItems={queueItems} 
        currentUser={user} 
      />
    </div>
  );
}
