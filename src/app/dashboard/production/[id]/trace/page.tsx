import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import { getProductionTrace, buildUnifiedProductionEvents } from '@/lib/production-trace';
import ProductionTraceClient from '@/components/production/trace/production-trace-client';

export default async function ProductionTracePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return <Unauthorized />;
  
  const { id } = await params;
  const res = await getProductionTrace(id, user);
  
  if (!res.success || !res.data) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg m-4">{res.error || 'Không tìm thấy dữ liệu Truy vết'}</div>;
  }

  const events = buildUnifiedProductionEvents(res.data);

  return (
    <div className="space-y-6">
      <ProductionTraceClient 
        traceData={res.data} 
        events={events} 
        currentUser={user} 
      />
    </div>
  );
}
