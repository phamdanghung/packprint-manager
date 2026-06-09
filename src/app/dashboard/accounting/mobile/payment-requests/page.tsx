import React from 'react';
import Link from 'next/link';
import { getPaymentRequestsMobile } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function PaymentRequestsMobileListPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const resolvedParams = await searchParams;
  const result = await getPaymentRequestsMobile({ status: resolvedParams.status });
  
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

  const prs = result.data as any[];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">Giao dịch QR Khách hàng</h1>
        <p className="text-sm text-slate-500">{prs.length} yêu cầu thanh toán</p>
      </div>

      <div className="flex space-x-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <Link href="/dashboard/accounting/mobile/payment-requests" className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${!resolvedParams.status ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Tất cả</Link>
        <Link href="/dashboard/accounting/mobile/payment-requests?status=PAID_REPORTED" className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${resolvedParams.status === 'PAID_REPORTED' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Khách báo đã chuyển</Link>
        <Link href="/dashboard/accounting/mobile/payment-requests?status=PENDING" className={`px-4 py-1.5 rounded-full text-sm whitespace-nowrap font-medium ${resolvedParams.status === 'PENDING' ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-700'}`}>Chờ KH quét</Link>
      </div>

      {prs.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mt-8">
          <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Không có yêu cầu thanh toán nào.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {prs.map(pr => (
            <Link key={pr.id} href={`/dashboard/accounting/mobile/payment-requests/${pr.id}`} className="block bg-white border border-slate-200 rounded-xl p-4 shadow-sm active:bg-slate-50 transition-colors">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <div className="font-bold text-slate-800 text-lg">
                    {pr.amount.toLocaleString('vi-VN')} đ
                  </div>
                  <div className="text-xs text-slate-500 font-mono mt-0.5 truncate max-w-[200px]">Nội dung: {pr.transferContent}</div>
                </div>
                {pr.status === 'PAID_REPORTED' && <div className="bg-amber-100 text-amber-700 px-2 py-1 rounded text-[10px] font-bold text-center">BÁO ĐÃ CHUYỂN</div>}
                {pr.status === 'PENDING' && <div className="bg-slate-100 text-slate-600 px-2 py-1 rounded text-[10px] font-bold text-center">CHỜ KH QUÉT</div>}
                {pr.status === 'CONFIRMED' && <div className="bg-green-100 text-green-700 px-2 py-1 rounded text-[10px] font-bold text-center">HOÀN TẤT</div>}
              </div>
              
              <div className="grid grid-cols-2 gap-y-2 text-sm mt-3 border-t border-slate-100 pt-3">
                <div className="text-slate-500">Khách hàng:</div>
                <div className="font-medium text-slate-800 text-right truncate">{pr.customer.name}</div>
                
                <div className="text-slate-500">Chứng từ:</div>
                <div className="font-medium text-indigo-600 text-right">
                  {pr.order ? pr.order.orderCode : pr.quote ? pr.quote.quoteNumber : 'Khác'}
                </div>
                
                <div className="text-slate-500">Người gửi link QR:</div>
                <div className="font-medium text-slate-800 text-right">{pr.createdBy?.name}</div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
