import React from 'react';
import { getDeliveryJobById, getDeliveryUsers } from '@/lib/delivery-actions';
import DeliveryDetailClient from '@/components/delivery/delivery-detail-client';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

export default async function DeliveryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'DELIVERY', 'PRODUCTION'].includes(user.role)) {
    return <div className="p-8 text-center text-red-500">Bạn không có quyền truy cập trang này.</div>;
  }

  const [jobRes, usersRes] = await Promise.all([
    getDeliveryJobById(id),
    getDeliveryUsers()
  ]);

  if (!jobRes.success || !jobRes.data) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-slate-800">Không tìm thấy đơn giao hàng</h2>
        <Link href="/dashboard/delivery" className="text-teal-600 hover:underline mt-4 inline-block">Quay lại danh sách</Link>
      </div>
    );
  }

  const deliveryUsers = usersRes.success ? (usersRes.data || []) : [];

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <Link href="/dashboard/delivery" className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Quay lại danh sách
      </Link>
      
      <DeliveryDetailClient 
        job={jobRes.data} 
        deliveryUsers={deliveryUsers} 
        currentUserRole={user.role} 
        currentUserId={user.id} 
      />
    </div>
  );
}
