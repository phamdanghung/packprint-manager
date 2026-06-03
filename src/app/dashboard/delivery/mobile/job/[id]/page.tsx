import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import MobileDeliveryDetail from './mobile-delivery-detail';

export default async function MobileDeliveryDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (['DESIGNER', 'ACCOUNTANT', 'PRODUCTION'].includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const { id } = await params;

  const job = await db.deliveryJob.findUnique({
    where: { id },
    include: {
      order: { 
        select: { 
          orderCode: true, 
          customer: { select: { name: true, phone: true } }, 
          deliveryAddress: true,
          debtAmount: true,
          totalAmount: true,
          paidAmount: true,
          status: true
        } 
      },
      assignedTo: { select: { name: true, phone: true } },
      logs: {
        include: { actor: { select: { name: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5
      }
    }
  });

  if (!job) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
        Không tìm thấy đơn giao hàng.
      </div>
    );
  }

  return <MobileDeliveryDetail job={job as any} currentUser={user} />;
}
