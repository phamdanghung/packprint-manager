import React from 'react';
import Link from 'next/link';
import { getPaymentRequestMobileDetail } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';
import PaymentRequestDetailClient from './payment-request-detail-client';

export const dynamic = 'force-dynamic';

export default async function PaymentRequestMobileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const result = await getPaymentRequestMobileDetail(resolvedParams.id);

  if (!result.success) {
    if (result.error === 'Chưa đăng nhập') redirect('/login');
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center w-full">
          <p className="font-bold mb-2">Lỗi truy cập</p>
          <p className="text-sm">{result.error}</p>
          <Link href="/dashboard/accounting/mobile/payment-requests" className="mt-4 block text-indigo-600 font-medium">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const pr = result.data as any;

  return (
    <div className="pb-28"> {/* Add padding for fixed bottom bar */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center shadow-sm">
        <Link href="/dashboard/accounting/mobile/payment-requests" className="mr-3 text-slate-500 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-800 truncate flex-1">Chi tiết Mã QR</h1>
        
        {pr.status === 'PENDING' && <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md text-xs font-bold">CHỜ QUÉT</span>}
        {pr.status === 'PAID_REPORTED' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold">BÁO ĐÃ CHUYỂN</span>}
        {pr.status === 'CONFIRMED' && <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold">ĐÃ XÁC NHẬN</span>}
        {pr.status === 'CANCELLED' && <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-xs font-bold">ĐÃ HỦY</span>}
      </div>

      <div className="p-4 space-y-4">
        {/* Amount Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <p className="text-indigo-100 font-medium mb-1">Số tiền yêu cầu</p>
          <h2 className="text-3xl font-black">{pr.amount.toLocaleString('vi-VN')} đ</h2>
          <div className="mt-4 bg-white/20 px-3 py-2 rounded-lg text-sm font-mono break-all font-medium">
            Nội dung: {pr.transferContent}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center justify-between">
            <span>Thông tin giao dịch</span>
            <span className="text-xs font-normal text-slate-500">
              {new Date(pr.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Khách hàng</p>
              <p className="font-bold text-slate-800">{pr.customer.name}</p>
              <p className="text-sm text-slate-600">{pr.customer.phone}</p>
            </div>
            
            <div className="h-px bg-slate-100"></div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Mã chứng từ</p>
                <div className="font-bold text-indigo-600">
                  {pr.order ? pr.order.orderCode : pr.quote ? pr.quote.quoteNumber : 'Không rõ'}
                </div>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Tổng đơn</p>
                <p className="font-bold text-slate-800">
                  {pr.order ? pr.order.totalAmount.toLocaleString('vi-VN') : pr.quote ? pr.quote.totalAmount.toLocaleString('vi-VN') : 0} đ
                </p>
              </div>
            </div>

            {pr.order && (
              <>
                <div className="h-px bg-slate-100"></div>
                <div>
                  <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Còn nợ đơn hàng</p>
                  <p className="font-bold text-rose-600">{pr.order.debtAmount.toLocaleString('vi-VN')} đ</p>
                </div>
              </>
            )}

            <div className="h-px bg-slate-100"></div>
            
            <div className="flex justify-between text-sm">
              <span className="text-slate-500">Người tạo link QR:</span>
              <span className="font-medium text-slate-800 text-right">{pr.createdBy?.name}</span>
            </div>

            {pr.status === 'PAID_REPORTED' && pr.reportedPaidAt && (
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Báo đã chuyển lúc:</span>
                <span className="font-medium text-amber-600 text-right">{new Date(pr.reportedPaidAt).toLocaleString('vi-VN')}</span>
              </div>
            )}
            
            {pr.note && (
              <div className="pt-3 mt-3 border-t border-slate-100 text-sm">
                <span className="block text-slate-500 mb-1">Ghi chú từ Sales:</span>
                <span className="block p-3 bg-yellow-50 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed">{pr.note}</span>
              </div>
            )}
            {pr.cancelReason && (
              <div className="pt-3 mt-3 border-t border-slate-100 text-sm">
                <span className="block text-red-500 mb-1 font-bold">Lý do từ chối:</span>
                <span className="block p-3 bg-red-50 rounded-lg text-red-700 whitespace-pre-wrap leading-relaxed">{pr.cancelReason}</span>
              </div>
            )}
          </div>
        </div>

        {pr.qrUrl && (
          <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden text-center p-4">
            <p className="text-sm text-slate-500 font-medium mb-2">QR Gốc đã cung cấp cho khách</p>
            {/* Using img for direct external url */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={pr.qrUrl} alt="QR" className="max-w-[200px] mx-auto opacity-50 grayscale hover:grayscale-0 hover:opacity-100 transition-all cursor-pointer rounded-lg border border-slate-200" />
          </div>
        )}
      </div>

      <PaymentRequestDetailClient prId={pr.id} status={pr.status} />
    </div>
  );
}
