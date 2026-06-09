import React from 'react';
import Link from 'next/link';
import { getAccountingMobileDashboard } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function AccountingMobileDashboard() {
  const result = await getAccountingMobileDashboard();
  
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

  const {
    pendingPayments,
    pendingPaymentTotal,
    pendingCodPayments,
    reportedPaymentRequests,
    debtCustomers,
    confirmedToday
  } = result.data as any;

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center space-x-2 mb-2">
        <h1 className="text-xl font-bold text-slate-800">Tổng quan hôm nay</h1>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {/* KPI 1 */}
        <Link href="/dashboard/accounting/mobile/payments" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800">{pendingPayments}</span>
          <span className="text-[11px] text-slate-500 font-medium uppercase mt-1">Chờ xác nhận</span>
        </Link>

        {/* KPI 2 */}
        <Link href="/dashboard/accounting/mobile/payments" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mb-2">
            <span className="font-bold text-lg">₫</span>
          </div>
          <span className="text-lg font-black text-slate-800 truncate w-full">
            {(pendingPaymentTotal / 1000000).toFixed(1)}<span className="text-sm">M</span>
          </span>
          <span className="text-[11px] text-slate-500 font-medium uppercase mt-1">Tiền chờ duyệt</span>
        </Link>

        {/* KPI 3 */}
        <Link href="/dashboard/accounting/mobile/cod" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M8 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0zM15 16.5a1.5 1.5 0 11-3 0 1.5 1.5 0 013 0z" />
              <path d="M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM14 7a1 1 0 00-1 1v6.05A2.5 2.5 0 0115.95 16H17a1 1 0 001-1v-5a1 1 0 00-.293-.707l-2-2A1 1 0 0015 7h-1z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800">{pendingCodPayments}</span>
          <span className="text-[11px] text-slate-500 font-medium uppercase mt-1">COD chờ thu</span>
        </Link>

        {/* KPI 4 */}
        <Link href="/dashboard/accounting/mobile/payment-requests" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M3 4a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm2 2V5h1v1H5zM3 13a1 1 0 011-1h3a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3zm2 2v-1h1v1H5zM13 3a1 1 0 00-1 1v3a1 1 0 001 1h3a1 1 0 001-1V4a1 1 0 00-1-1h-3zm1 2v1h1V5h-1z" clipRule="evenodd" />
              <path d="M11 4a1 1 0 10-2 0v1a1 1 0 002 0V4zM10 7a1 1 0 011 1v1h2a1 1 0 110 2h-3a1 1 0 01-1-1V8a1 1 0 011-1zM16 9a1 1 0 100 2 1 1 0 000-2zM9 13a1 1 0 011-1h1a1 1 0 110 2v2a1 1 0 11-2 0v-3zM7 11a1 1 0 100-2H4a1 1 0 100 2h3zM17 13a1 1 0 01-1 1h-2a1 1 0 110-2h2a1 1 0 011 1zM16 17a1 1 0 100-2h-3a1 1 0 100 2h3z" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800">{reportedPaymentRequests}</span>
          <span className="text-[11px] text-slate-500 font-medium uppercase mt-1">QR Đã Chuyển</span>
        </Link>
        
        {/* KPI 5 */}
        <Link href="/dashboard/accounting/mobile/debts" className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center active:scale-95 transition-transform">
          <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800">{debtCustomers}</span>
          <span className="text-[11px] text-slate-500 font-medium uppercase mt-1">Khách Đang Nợ</span>
        </Link>

        {/* KPI 6 */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="w-10 h-10 rounded-full bg-teal-100 text-teal-600 flex items-center justify-center mb-2">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-2xl font-black text-slate-800">{confirmedToday}</span>
          <span className="text-[11px] text-slate-500 font-medium uppercase mt-1">Đã duyệt / ngày</span>
        </div>
      </div>
      
      <div className="mt-6 pt-4 border-t border-slate-200">
        <h2 className="text-lg font-bold text-slate-800 mb-3">Tác vụ nhanh</h2>
        <div className="space-y-2">
          <Link href="/dashboard/accounting/mobile/payments" className="block w-full bg-indigo-600 text-white text-center py-3.5 rounded-xl font-bold shadow-sm active:bg-indigo-700">
            Duyệt thanh toán PENDING
          </Link>
          <Link href="/dashboard/accounting/mobile/payment-requests" className="block w-full bg-white border border-slate-300 text-slate-700 text-center py-3.5 rounded-xl font-bold shadow-sm active:bg-slate-50">
            Duyệt QR Khách báo chuyển
          </Link>
        </div>
      </div>
    </div>
  );
}
