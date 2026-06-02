import React from 'react';
import { getPayments } from '@/lib/payment-actions';
import PaymentListClient from '@/components/payments/payment-list-client';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  
  if (!user || !['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'].includes(user.role)) {
    return <div className="p-8 text-center text-red-500">Bạn không có quyền truy cập trang này.</div>;
  }

  const q = typeof resolvedParams.q === 'string' ? resolvedParams.q : undefined;
  const status = typeof resolvedParams.status === 'string' ? resolvedParams.status : undefined;
  const method = typeof resolvedParams.method === 'string' ? resolvedParams.method : undefined;
  
  const res = await getPayments({ q, status, method });
  const payments = res.success ? (res.data || []) : [];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">Phiếu thu tiền</h1>
        <p className="text-slate-500 mt-1">Quản lý danh sách các khoản đã thu và chờ xác nhận</p>
      </div>
      
      <PaymentListClient initialPayments={payments} currentUserRole={user.role} />
    </div>
  );
}
