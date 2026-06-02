import { getCurrentUser } from '@/lib/auth';
import { db } from '@/lib/db';
import { redirect } from 'next/navigation';
import MobileDetailClient from './mobile-detail-client';

export default async function MobilePostPrintDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  if (['SALES', 'DESIGNER', 'ACCOUNTANT', 'DELIVERY'].includes(user.role)) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
        Bạn không có quyền truy cập trang này.
      </div>
    );
  }

  const { id } = await params;

  const operation = await db.productionOperation.findUnique({
    where: { id },
    include: {
      productionJob: { select: { jobCode: true, order: { select: { orderCode: true, customer: { select: { name: true } } } } } },
      orderItem: { select: { name: true } },
      machine: { select: { machineName: true } },
      assignedTo: { select: { name: true } },
      printQueueItem: { select: { material: { select: { name: true } } } },
      logs: { 
         include: { actor: { select: { name: true } } },
         orderBy: { createdAt: 'desc' },
         take: 5
      }
    }
  });

  if (!operation) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-500 p-6 text-center">
        Không tìm thấy công đoạn
      </div>
    );
  }

  // Find next operation
  const nextOps = await db.productionOperation.findMany({
    where: { 
      printQueueItemId: operation.printQueueItemId,
      sequence: { gt: operation.sequence }
    },
    orderBy: { sequence: 'asc' },
    take: 1
  });
  const nextOpName = nextOps.length > 0 ? nextOps[0].operationName : 'Không có';

  return <MobileDetailClient operation={operation as any} nextOpName={nextOpName} currentUser={user} />;
}
