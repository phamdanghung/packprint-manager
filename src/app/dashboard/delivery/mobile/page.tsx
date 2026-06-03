import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import MobileDeliveryList from './mobile-delivery-list';

export default async function MobileDeliveryPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (['DESIGNER', 'ACCOUNTANT', 'PRODUCTION'].includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const jobs = await db.deliveryJob.findMany({
    where: {
      OR: [
        { status: { notIn: ['DELIVERED', 'CANCELLED'] } },
        { status: { in: ['DELIVERED'] }, deliveredAt: { gte: today } }
      ]
    },
    include: {
      order: { select: { orderCode: true, customer: { select: { name: true, phone: true } }, deliveryAddress: true, debtAmount: true, totalAmount: true, paidAmount: true } },
      assignedTo: { select: { name: true } }
    },
    orderBy: [
      { status: 'asc' },
      { createdAt: 'desc' }
    ]
  });

  return <MobileDeliveryList jobs={jobs} currentUser={user} />;
}
