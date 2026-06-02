import React from 'react';
import { getCustomerDebts } from '@/lib/payment-actions';
import DebtListClient from '@/components/debts/debt-list-client';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function DebtsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  
  if (!user || !['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'].includes(user.role)) {
    return <div className="p-8 text-center text-red-500">Bạn không có quyền truy cập trang này.</div>;
  }

  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;
  
  const res = await getCustomerDebts({ q });
  const customers = res.success ? (res.data || []) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Quản lý Công nợ</h1>
        <p className="text-slate-500 mt-1">Theo dõi công nợ của tất cả khách hàng</p>
      </div>
      
      <DebtListClient initialCustomers={customers} currentUserRole={user.role} />
    </div>
  );
}
