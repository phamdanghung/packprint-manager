import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import MobileListClient from './mobile-list-client';

export default async function MobilePostPrintPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (['SALES', 'DESIGNER', 'ACCOUNTANT', 'DELIVERY'].includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const operations = await db.productionOperation.findMany({
    where: {
      OR: [
        { status: { notIn: ['COMPLETED', 'SKIPPED'] } },
        { status: { in: ['COMPLETED', 'SKIPPED'] }, completedAt: { gte: today } }
      ]
    },
    include: {
      productionJob: { select: { jobCode: true, order: { select: { orderCode: true, customer: { select: { name: true } }, dueDate: true } } } },
      orderItem: { select: { name: true } },
      machine: { select: { machineName: true } }
    },
    orderBy: [
      { status: 'asc' },
      { sequence: 'asc' }
    ]
  });

  return <MobileListClient operations={operations} currentUser={user} />;
}
