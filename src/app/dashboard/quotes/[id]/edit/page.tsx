import React from 'react';
import QuoteForm from '@/components/quotes/quote-form';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';

export default async function EditQuotePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user || user.role === 'ACCOUNTANT') return <Unauthorized />;

  const { id } = await params; // In Next.js 15, params is often a Promise

  const quote = await db.quote.findUnique({
    where: { id },
    include: { items: true }
  });

  if (!quote) return <div>Không tìm thấy báo giá</div>;
  if (quote.status !== 'DRAFT') return <div>Chỉ báo giá nháp mới được chỉnh sửa.</div>;

  const [customers, materials, machines, laminations] = await Promise.all([
    db.customer.findMany({ where: { status: 'ACTIVE' } }),
    db.material.findMany({ where: { status: 'ACTIVE' } }),
    db.machineConfig.findMany({ where: { status: 'ACTIVE' } }),
    db.laminationPrice.findMany({ where: { status: 'ACTIVE' } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Sửa Báo Giá: {quote.quoteNumber}</h1>
      </div>

      <QuoteForm 
        customers={customers} 
        materials={materials} 
        machines={machines} 
        laminations={laminations}
        initialData={quote}
      />
    </div>
  );
}
