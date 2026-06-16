export const dynamic = 'force-dynamic';
import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import { getProductionMaterialIssueStatus } from '@/lib/production-material-issue-actions';
import IssueMaterialsClient from './issue-materials-client';

export default async function ProductionIssueMaterialsPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || !['ADMIN', 'MANAGER', 'PRODUCTION'].includes(user.role)) return <Unauthorized />;

  const { id } = await params;
  const res = await getProductionMaterialIssueStatus(id);

  if (!res.success || !res.data) {
    return <div className="p-8 text-center text-red-600">{res.error || 'Lỗi khi tải dữ liệu lệnh sản xuất'}</div>;
  }

  return (
    <div className="space-y-6">
      <IssueMaterialsClient 
        productionJobId={id} 
        materialIssueStatus={res.data}
        currentUser={user}
      />
    </div>
  );
}
