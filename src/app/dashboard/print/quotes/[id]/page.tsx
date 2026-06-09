import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintLayout from '@/components/print/PrintLayout';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';
import PaymentQrBlock from '@/components/print/PaymentQrBlock';
import { formatCurrencyVND, formatDateVN } from '@/lib/print-documents/helpers';
import { buildVietQrUrl, calculateQuotePayableAmount, getDefaultCompanyBankAccount } from '@/lib/payment-qr';
import { logPrintAction } from '@/lib/print-documents/audit';

export default async function QuotePrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  const quote = await db.quote.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      createdBy: true,
    }
  });

  if (!quote) notFound();

  // RBAC: SALES can only print their own quotes
  if (session.role === 'SALES' && quote.createdById !== session.id && quote.assignedSalesId !== session.id) {
    redirect('/dashboard/quotes');
  }

  // Calculate amount to pay
  const payableAmount = await calculateQuotePayableAmount(id);
  const bankAccount = await getDefaultCompanyBankAccount();

  let qrUrl = '';
  let transferContent = '';
  
  if (payableAmount > 0 && bankAccount) {
    transferContent = quote.quoteNumber;
    qrUrl = buildVietQrUrl(
      bankAccount.vietQrBankId || '970416', // Fallback to ACB if empty
      bankAccount.accountNumber,
      payableAmount,
      transferContent,
      bankAccount.accountHolder
    );
  }

  // Audit Log
  await logPrintAction('PRINT_QUOTE', 'Quote', quote.id, session.id, session.role);

  return (
    <PrintLayout>
      <PrintHeader title="Báo Giá" />
      
      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Kính gửi khách hàng:</h3>
          <p className="font-bold text-base text-teal-800 uppercase">{quote.customer.companyName || quote.customer.name}</p>
          {quote.customer.companyName && <p className="text-sm text-slate-700">Người liên hệ: {quote.customer.name}</p>}
          <p className="text-sm text-slate-700">SĐT: {quote.customer.phone}</p>
          <p className="text-sm text-slate-700">Email: {quote.customer.email || '—'}</p>
          <p className="text-sm text-slate-700">Địa chỉ: {quote.customer.address || '—'}</p>
        </div>
        <div className="w-1/2 pl-4 border-l border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Số báo giá:</td>
                <td className="py-1 font-bold text-slate-800">{quote.quoteNumber}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày báo giá:</td>
                <td className="py-1 font-bold text-slate-800">{formatDateVN(quote.createdAt)}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Sales phụ trách:</td>
                <td className="py-1 font-bold text-slate-800">{quote.createdBy?.name || '—'}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Hiệu lực:</td>
                <td className="py-1 font-bold text-slate-800">7 ngày</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-slate-100 border-y-2 border-slate-300">
            <th className="py-3 px-2 text-left font-bold text-slate-700 w-12">STT</th>
            <th className="py-3 px-2 text-left font-bold text-slate-700">Tên sản phẩm & Quy cách</th>
            <th className="py-3 px-2 text-right font-bold text-slate-700 w-24">Số lượng</th>
            <th className="py-3 px-2 text-right font-bold text-slate-700 w-32">Đơn giá</th>
            <th className="py-3 px-2 text-right font-bold text-slate-700 w-32">Thành tiền</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {quote.items.map((item, index) => {
            const unitPrice = item.quantity > 0 ? item.saleAmount / item.quantity : 0;
            return (
              <tr key={item.id} className="group">
                <td className="py-3 px-2 align-top text-slate-600">{index + 1}</td>
                <td className="py-3 px-2 align-top">
                  <p className="font-bold text-slate-800 mb-1">{item.name}</p>
                  <p className="text-xs text-slate-500 mb-1">
                    KT: {item.widthCm}x{item.heightCm}cm | Hình dáng: {item.labelShape}
                  </p>
                </td>
                <td className="py-3 px-2 align-top text-right font-semibold text-slate-700">{item.quantity.toLocaleString('vi-VN')}</td>
                <td className="py-3 px-2 align-top text-right font-semibold text-slate-700">{formatCurrencyVND(unitPrice)}</td>
                <td className="py-3 px-2 align-top text-right font-bold text-slate-800">{formatCurrencyVND(item.saleAmount)}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="border-t-2 border-slate-300">
            <td colSpan={4} className="py-3 px-2 text-right font-bold text-slate-700">Tổng cộng (chưa VAT):</td>
            <td className="py-3 px-2 text-right font-black text-slate-900">{formatCurrencyVND(quote.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="py-2 px-2 text-right font-bold text-slate-700">Thuế GTGT ({quote.vatRate}%):</td>
            <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrencyVND(quote.vatAmount)}</td>
          </tr>
          {quote.shippingFee > 0 && (
            <tr>
              <td colSpan={4} className="py-2 px-2 text-right font-bold text-slate-700">Phí vận chuyển:</td>
              <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrencyVND(quote.shippingFee)}</td>
            </tr>
          )}
          <tr className="bg-slate-50 border-y-2 border-slate-800">
            <td colSpan={4} className="py-4 px-2 text-right font-black text-slate-800 text-lg uppercase">Tổng thanh toán:</td>
            <td className="py-4 px-2 text-right font-black text-teal-700 text-xl">{formatCurrencyVND(quote.totalAmount)}</td>
          </tr>
        </tfoot>
      </table>

      {payableAmount > 0 ? (
        <div className="mb-8">
          {bankAccount ? (
            <PaymentQrBlock 
              qrUrl={qrUrl}
              amount={payableAmount}
              transferContent={transferContent}
              bankName={bankAccount.bankName}
              accountNumber={bankAccount.accountNumber}
              accountHolder={bankAccount.accountHolder}
            />
          ) : (
            <div className="bg-amber-50 text-amber-800 p-4 rounded border border-amber-200">
              Chưa cấu hình tài khoản nhận thanh toán.
            </div>
          )}
        </div>
      ) : (
        <div className="mb-8 text-center bg-emerald-50 text-emerald-700 p-4 rounded-xl border border-emerald-200 font-bold text-lg shadow-sm">
          ĐÃ THANH TOÁN ĐỦ
        </div>
      )}

      {/* Signature Row */}
      <div className="break-inside-avoid">
        <div className="mt-8 mb-4 text-right pr-8">
          <p className="text-sm text-slate-600 italic">
            TP.HCM, ngày {String(quote.createdAt.getDate()).padStart(2, '0')} tháng {String(quote.createdAt.getMonth() + 1).padStart(2, '0')} năm {quote.createdAt.getFullYear()}
          </p>
        </div>
        <div className="flex justify-between mb-24 px-8">
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-28">Khách hàng xác nhận</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-28">Đại diện kinh doanh</p>
            <p className="font-bold text-slate-800">{quote.createdBy?.name || '—'}</p>
          </div>
        </div>
      </div>

      <PrintFooter 
        customNotes={[
          'Báo giá có hiệu lực trong 7 ngày.',
          'Thời gian sản xuất được tính từ khi khách hàng duyệt file và hoàn tất thanh toán/cọc theo thỏa thuận.',
          'Quý khách vui lòng kiểm tra kỹ nội dung, quy cách, số lượng trước khi xác nhận sản xuất.',
          'Hàng in theo file khách hàng đã duyệt.'
        ]}
      />
    </PrintLayout>
  );
}
