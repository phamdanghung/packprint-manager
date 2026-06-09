import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintLayout from '@/components/print/PrintLayout';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';
import { formatCurrencyVND, formatDateVN, numberToVietnameseWords } from '@/lib/print-documents/helpers';
import { logPrintAction } from '@/lib/print-documents/audit';

export default async function PaymentPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  const payment = await db.paymentRequest.findUnique({
    where: { id },
    include: {
      customer: true,
      createdBy: true,
      quote: true,
      order: true,
    }
  });

  if (!payment) notFound();

  // Print Logic: Only allow if CONFIRMED. If PENDING, only ADMIN/MANAGER/ACCOUNTANT can print.
  const isAuthorizedRole = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(session.role);
  
  if (payment.status !== 'CONFIRMED' && !isAuthorizedRole) {
    // SALES cannot print unconfirmed receipts
    redirect('/dashboard/sales/mobile'); // Or redirect to an error page
  }

  const isPending = payment.status !== 'CONFIRMED';

  // Audit Log
  await logPrintAction('PRINT_PAYMENT_RECEIPT', 'PaymentRequest', payment.id, session.id, session.role);

  return (
    <PrintLayout>
      {isPending && (
        <div className="absolute inset-0 z-0 flex items-center justify-center opacity-10 scale-75 pointer-events-none select-none overflow-hidden">
          <div className="text-[110px] font-black text-rose-500 -rotate-45 uppercase whitespace-nowrap">
            CHƯA XÁC NHẬN
          </div>
        </div>
      )}

      <div className="relative z-10">
        <PrintHeader title="Phiếu Thu" />
        
        <div className="mb-8 pl-4 border-l border-slate-200">
          <table className="w-[300px] text-sm ml-auto mr-0">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Số phiếu:</td>
                <td className="py-1 font-bold text-slate-800">PT-{payment.id.substring(0, 8).toUpperCase()}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày lập phiếu:</td>
                <td className="py-1 font-bold text-slate-800">{formatDateVN(payment.createdAt)}</td>
              </tr>
              {payment.reportedPaidAt && (
                <tr>
                  <td className="py-1 text-slate-500 font-medium">Ngày nộp tiền:</td>
                  <td className="py-1 font-bold text-slate-800">{formatDateVN(payment.reportedPaidAt)}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="mb-8 text-base">
          <div className="grid grid-cols-[200px_1fr] gap-y-4 mb-4">
            <div className="font-semibold text-slate-700">Họ tên người nộp tiền:</div>
            <div className="font-bold text-slate-900 uppercase">{payment.customer.name}</div>
            
            <div className="font-semibold text-slate-700">Đơn vị (Công ty):</div>
            <div className="font-bold text-slate-900">{payment.customer.companyName || 'Cá nhân'}</div>
            
            <div className="font-semibold text-slate-700">Lý do nộp:</div>
            <div className="font-bold text-slate-900">
              {payment.transferContent || payment.note || 
                (payment.orderId ? `Thanh toán Đơn Hàng ${payment.order?.orderCode}` : 
                 payment.quoteId ? `Thanh toán Báo Giá ${payment.quote?.quoteNumber}` : 'Thanh toán công nợ')}
            </div>
            
            <div className="font-semibold text-slate-700">Số tiền:</div>
            <div className="font-black text-teal-800 text-2xl tracking-tight">{formatCurrencyVND(payment.amount)}</div>
            
            <div className="font-semibold text-slate-700">Viết bằng chữ:</div>
            <div className="font-bold text-slate-800 italic">{numberToVietnameseWords(payment.amount)}</div>
            
            <div className="font-semibold text-slate-700">Phương thức TT:</div>
            <div className="font-bold text-slate-900">
              {payment.paymentMethod || 'Chuyển khoản / Tiền mặt'}
            </div>

            <div className="font-semibold text-slate-700">Chứng từ gốc kèm theo:</div>
            <div className="font-medium text-slate-800">
              {payment.order?.orderCode ? `ĐH: ${payment.order.orderCode}` : ''}
              {payment.quote?.quoteNumber ? `BG: ${payment.quote.quoteNumber}` : ''}
              {!payment.orderId && !payment.quoteId ? '—' : ''}
            </div>
          </div>
        </div>

        {/* Signature Row */}
        <div className="flex justify-between mt-16 mb-24 px-4">
          <div className="text-center w-1/4">
            <p className="font-bold text-slate-800 mb-16">Người nộp tiền</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center w-1/4">
            <p className="font-bold text-slate-800 mb-16">Người lập phiếu</p>
            <p className="font-bold text-slate-800">
              {payment.createdBy?.name?.includes('Test') ? 'Chưa xác định' : (payment.createdBy?.name || 'Chưa xác định')}
            </p>
          </div>
          <div className="text-center w-1/4">
            <p className="font-bold text-slate-800 mb-16">Kế toán</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center w-1/4">
            <p className="font-bold text-slate-800 mb-16">Thủ quỹ</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>

        <PrintFooter />
      </div>
    </PrintLayout>
  );
}
