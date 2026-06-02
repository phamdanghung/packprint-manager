import React from 'react';
import { getProductionJobById } from '@/lib/production-actions';
import Unauthorized from '@/components/unauthorized';
import { getCurrentUser } from '@/lib/auth';
import ProductionJobDetailClient from '@/components/production/production-job-detail-client';

export default async function ProductionJobDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || ['ACCOUNTANT'].includes(user.role)) return <Unauthorized />;
  
  const { id } = await params;
  const res = await getProductionJobById(id);
  if (!res.success || !res.data) return <div className="p-8 text-center">{res.error || 'Không tìm thấy Lệnh sản xuất'}</div>;

  return (
    <div className="space-y-6">
      <ProductionJobDetailClient job={res.data} userRole={user.role} />
    </div>
  );
}
