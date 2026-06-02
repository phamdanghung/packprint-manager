import React from 'react';
import QuoteForm from '@/components/quotes/quote-form';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';

export default async function NewQuotePage() {
  const user = await getCurrentUser();
  if (!user || user.role === 'ACCOUNTANT') return <Unauthorized />;

  const [customers, materials, machines, laminations] = await Promise.all([
    db.customer.findMany({ where: { status: 'ACTIVE' } }),
    db.material.findMany({ where: { status: 'ACTIVE' } }),
    db.machineConfig.findMany({ where: { status: 'ACTIVE' } }),
    db.laminationPrice.findMany({ where: { status: 'ACTIVE' } })
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Tạo Báo Giá Mới</h1>
        <p className="text-sm text-slate-500">Thiết lập thông số kỹ thuật để tự động tính giá.</p>
      </div>

      <QuoteForm 
        customers={customers} 
        materials={materials} 
        machines={machines} 
        laminations={laminations} 
      />
    </div>
  );
}
