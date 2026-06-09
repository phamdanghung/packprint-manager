import React from 'react';
import Link from 'next/link';
import { getPendingPayments } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PaymentPendingListPage({ searchParams }: { searchParams: Promise<{ method?: string }> }) {
  const resolvedParams = await searchParams;
  const result = await getPendingPayments({ method: resolvedParams.method });
  
  if (!result.success) {
    if (result.error === 'Chưa đăng nhập') redirect('/login');
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
          <p className="font-bold mb-2">Lỗi truy cập</p>
          <p className="text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const payments = result.data as any[];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">Thanh toán chờ duyệt</h1>
        <p className="text-sm text-slate-500">{payments.length} phiếu thu cần xử lý</p>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <Link href="/dashboard/accounting/mobile/payments" className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${!resolvedParams.method ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Tất cả</Link>
        <Link href="/dashboard/accounting/mobile/payments?method=TRANSFER" className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${resolvedParams.method === 'TRANSFER' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Chuyển khoản</Link>
        <Link href="/dashboard/accounting/mobile/payments?method=CASH" className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${resolvedParams.method === 'CASH' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Tiền mặt</Link>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mt-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Không có khoản thanh toán nào đang chờ xác nhận.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(payment => (
            <Link key={payment.id} href={`/dashboard/accounting/mobile/payments/${payment.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-slate-800 text-lg">
                    {payment.amount.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5">{payment.paymentCode}</div>
                </div>
                <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-xs font-bold whitespace-nowrap">
                  CHỜ DUYỆT
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 border-t border-slate-100 pt-3">
                <div className="text-slate-500">Khách hàng:</div>
                <div className="font-medium text-slate-800 text-right truncate">{payment.customer.name}</div>
                
                <div className="text-slate-500">Đơn hàng:</div>
                <div className="font-medium text-indigo-600 text-right">{payment.order.orderCode}</div>
                
                <div className="text-slate-500">Phương thức:</div>
                <div className="font-medium text-slate-800 text-right">
                  {payment.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : payment.paymentMethod === 'CASH' ? 'Tiền mặt' : payment.paymentMethod}
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
