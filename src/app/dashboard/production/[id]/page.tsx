import React from 'react';
import { getProductionJobById } from '@/lib/production-actions';
import Unauthorized from '@/components/unauthorized';
import { getCurrentUser } from '@/lib/auth';
import ProductionJobDetailClient from '@/components/production/production-job-detail-client';

import { findParentMaterialFulfillment } from '@/lib/inventory-fulfillment';

export default async function ProductionJobDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || ['ACCOUNTANT'].includes(user.role)) return <Unauthorized />;
  
  const { id } = await params;
  const res = await getProductionJobById(id);
  if (!res.success || !res.data) return <div className="p-8 text-center">{res.error || 'Không tìm thấy Lệnh sản xuất'}</div>;

  const job = res.data;
  const items = job.order?.items || [];
  
  let fulfillmentDataMap: Record<string, any> = {};
  if (['MANAGER', 'ADMIN'].includes(user.role)) {
    await Promise.all(items.map(async (item: any) => {
      try {
        const fData = await findParentMaterialFulfillment({
          childMaterialId: item.materialId,
          requiredChildQtyBase: item.totalSheets,
          productionJobId: job.id
        });
        fulfillmentDataMap[item.id] = fData;
      } catch (e) {
        console.error(e);
      }
    }));
  }

  return (
    <div className="space-y-6">
      <ProductionJobDetailClient job={job} userRole={user.role} fulfillmentDataMap={fulfillmentDataMap} />
    </div>
  );
}
