import React from 'react';
import Link from 'next/link';
import { getPendingPayments } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function CodPendingListPage() {
  const result = await getPendingPayments({ method: 'COD' });
  
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
        <h1 className="text-xl font-bold text-slate-800">COD chờ thu hộ</h1>
        <p className="text-sm text-slate-500">{payments.length} khoản COD cần kế toán nhận tiền</p>
      </div>

      {payments.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mt-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Không có khoản thu hộ COD nào đang chờ.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {payments.map(payment => (
            <Link key={payment.id} href={`/dashboard/accounting/mobile/payments/${payment.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-blue-700 text-lg">
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
                
                <div className="text-slate-500">Người nộp (Giao hàng):</div>
                <div className="font-medium text-slate-800 text-right">{payment.createdBy?.name || 'Không rõ'}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
