import React from 'react';
import QuoteForm from '@/components/quotes/quote-form';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';

import { getActiveDieCutMachineOptionsForQuote } from '@/lib/diecut-machine-actions';

export default async function NewQuotePage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  if (!user || user.role === 'ACCOUNTANT' || user.role === 'DESIGNER' || user.role === 'PRODUCTION' || user.role === 'DELIVERY') {
    return <Unauthorized />;
  }

  const [customers, materials, machines, laminations] = await Promise.all([
    db.customer.findMany({ where: { status: 'ACTIVE' } }),
    db.material.findMany({ where: { status: 'ACTIVE' } }),
    getActiveDieCutMachineOptionsForQuote(),
    db.laminationPrice.findMany({ where: { status: 'ACTIVE' } })
  ]);

  if (resolvedParams.customerId) {
    const exists = customers.some(c => c.id === resolvedParams.customerId);
    if (!exists) {
      return (
        <div className="p-6 max-w-lg mx-auto mt-10 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-center">
          <h2 className="text-xl font-bold mb-2">Không tìm thấy khách hàng</h2>
          <p>Không tìm thấy khách hàng để tạo báo giá, hoặc khách hàng đã bị vô hiệu hóa.</p>
        </div>
      );
    }
  }

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
        initialData={{ customerId: resolvedParams.customerId }}
        userRole={user.role}
      />
    </div>
  );
}
