import React from 'react';
import Link from 'next/link';
import { getPaymentMobileDetail } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';
import PaymentDetailClient from './payment-detail-client';

export const dynamic = 'force-dynamic';

export default async function PaymentMobileDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const result = await getPaymentMobileDetail(resolvedParams.id);

  if (!result.success) {
    if (result.error === 'Chưa đăng nhập') redirect('/login');
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center w-full">
          <p className="font-bold mb-2">Lỗi truy cập</p>
          <p className="text-sm">{result.error}</p>
          <Link href="/dashboard/accounting/mobile/payments" className="mt-4 block text-indigo-600 font-medium">
            Quay lại danh sách
          </Link>
        </div>
      </div>
    );
  }

  const payment = result.data as any;

  return (
    <div className="pb-28"> {/* Add padding for fixed bottom bar */}
      {/* Top Navigation */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center shadow-sm">
        <Link href="/dashboard/accounting/mobile/payments" className="mr-3 text-slate-500 p-1">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </Link>
        <h1 className="text-lg font-bold text-slate-800 truncate flex-1">Chi tiết phiếu thu</h1>
        
        {/* Status Badge */}
        {payment.paymentStatus === 'PENDING' && <span className="bg-amber-100 text-amber-700 px-2.5 py-1 rounded-md text-xs font-bold">CHỜ DUYỆT</span>}
        {payment.paymentStatus === 'CONFIRMED' && <span className="bg-green-100 text-green-700 px-2.5 py-1 rounded-md text-xs font-bold">ĐÃ XÁC NHẬN</span>}
        {payment.paymentStatus === 'CANCELLED' && <span className="bg-red-100 text-red-700 px-2.5 py-1 rounded-md text-xs font-bold">ĐÃ HỦY</span>}
      </div>

      <div className="p-4 space-y-4">
        {/* Amount Card */}
        <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl p-5 text-white shadow-md relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-20">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <p className="text-indigo-100 font-medium mb-1">Số tiền thanh toán</p>
          <h2 className="text-3xl font-black">{payment.amount.toLocaleString('vi-VN')} đ</h2>
          <div className="mt-4 inline-block bg-white/20 px-3 py-1 rounded-full text-xs font-mono">
            {payment.paymentCode}
          </div>
        </div>

        {/* Info Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-700 flex items-center justify-between">
            <span>Thông tin chung</span>
            <span className="text-xs font-normal text-slate-500">
              {new Date(payment.createdAt).toLocaleString('vi-VN')}
            </span>
          </div>
          <div className="p-4 space-y-4">
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Khách hàng</p>
              <p className="font-bold text-slate-800">{payment.customer.name}</p>
              <p className="text-sm text-slate-600">{payment.customer.phone}</p>
            </div>
            
            <div className="h-px bg-slate-100"></div>
            
            <div>
              <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Mã đơn hàng</p>
              <Link href={`/dashboard/sales/mobile/orders/${payment.order.id}`} className="inline-block font-bold text-indigo-600 bg-indigo-50 px-2 py-1 rounded">
                {payment.order.orderCode}
              </Link>
            </div>

            <div className="h-px bg-slate-100"></div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Tổng đơn</p>
                <p className="font-bold text-slate-800">{payment.order.totalAmount.toLocaleString('vi-VN')} đ</p>
              </div>
              <div>
                <p className="text-xs text-slate-500 font-medium mb-1 uppercase tracking-wider">Còn nợ</p>
                <p className="font-bold text-rose-600">{payment.order.debtAmount.toLocaleString('vi-VN')} đ</p>
              </div>
            </div>
          </div>
        </div>

        {/* Payment Details Card */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="px-4 py-3 bg-slate-50 border-b border-slate-100 font-bold text-slate-700">
            Chi tiết giao dịch
          </div>
          <div className="p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Phương thức:</span>
              <span className="font-medium text-slate-800">
                {payment.paymentMethod === 'TRANSFER' ? 'Chuyển khoản' : payment.paymentMethod === 'CASH' ? 'Tiền mặt' : payment.paymentMethod}
              </span>
            </div>
            
            {payment.referenceCode && (
              <div className="flex justify-between">
                <span className="text-slate-500">Nội dung / Mã GD:</span>
                <span className="font-medium font-mono text-slate-800 text-right">{payment.referenceCode}</span>
              </div>
            )}
            
            <div className="flex justify-between">
              <span className="text-slate-500">Người tạo phiếu:</span>
              <span className="font-medium text-slate-800 text-right">{payment.createdBy?.name || 'Hệ thống'} ({payment.createdBy?.role})</span>
            </div>
            
            {payment.receivedBy && (
              <div className="flex justify-between">
                <span className="text-slate-500">Người xác nhận:</span>
                <span className="font-medium text-green-700 text-right">{payment.receivedBy.name}</span>
              </div>
            )}

            {payment.note && (
              <div className="pt-3 mt-3 border-t border-slate-100">
                <span className="block text-slate-500 mb-1">Ghi chú:</span>
                <span className="block p-3 bg-yellow-50 rounded-lg text-slate-700 whitespace-pre-wrap leading-relaxed">{payment.note}</span>
              </div>
            )}
          </div>
        </div>

        {/* Print Button if confirmed */}
        {payment.paymentStatus === 'CONFIRMED' && (
          <Link 
            href={`/dashboard/print/payments/${payment.id}`}
            className="flex items-center justify-center space-x-2 w-full bg-slate-800 text-white p-4 rounded-xl font-bold shadow-sm active:bg-slate-900"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
            </svg>
            <span>In Phiếu Thu</span>
          </Link>
        )}
      </div>

      {payment.paymentStatus === 'PENDING' && (
        <PaymentDetailClient paymentId={payment.id} />
      )}
    </div>
  );
}
