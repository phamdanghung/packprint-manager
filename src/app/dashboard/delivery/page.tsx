import React from 'react';
import DeliveryListClient from '@/components/delivery/delivery-list-client';
import { getDeliveryJobs, getDeliveryUsers } from '@/lib/delivery-actions';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DeliveryPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'DELIVERY', 'PRODUCTION'].includes(user.role)) {
    return <div className="p-8 text-center text-red-500">Bạn không có quyền truy cập trang này.</div>;
  }

  // Parse filters
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined;
  const method = typeof resolvedParams.method === 'string' ? resolvedParams.method : undefined;
  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;

  const filters: any = {};
  if (status) filters.status = status;
  if (method) filters.deliveryMethod = method;
  
  if (q) {
    filters.OR = [
      { deliveryCode: { contains: q } },
      { order: { orderCode: { contains: q } } },
      { order: { customer: { name: { contains: q } } } },
      { receiverPhone: { contains: q } },
      { receiverName: { contains: q } }
    ];
  }

  const [jobsRes, usersRes] = await Promise.all([
    getDeliveryJobs(filters),
    getDeliveryUsers()
  ]);

  const initialJobs = jobsRes.success ? (jobsRes.data || []) : [];
  const deliveryUsers = usersRes.success ? (usersRes.data || []) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Quản lý Giao hàng</h1>
        <p className="text-slate-500 mt-2">Theo dõi và cập nhật tiến độ vận chuyển</p>
      </div>
      
      <DeliveryListClient 
        initialJobs={initialJobs} 
        deliveryUsers={deliveryUsers} 
        currentUserRole={user.role} 
        currentUserId={user.id} 
      />
    </div>
  );
}
