import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintLayout from '@/components/print/PrintLayout';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';
import PaymentQrBlock from '@/components/print/PaymentQrBlock';
import { formatCurrencyVND, formatDateVN } from '@/lib/print-documents/helpers';
import { buildVietQrUrl, calculateOrderPayableAmount, getDefaultCompanyBankAccount } from '@/lib/payment-qr';
import { logPrintAction } from '@/lib/print-documents/audit';

export default async function OrderPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: true,
      createdBy: true,
      deliveryJob: true
    }
  });

  if (!order) notFound();

  // RBAC: SALES can only print their own orders
  if (session.role === 'SALES' && order.createdById !== session.id && order.assignedSalesId !== session.id) {
    redirect('/dashboard/orders');
  }

  // Calculate amount to pay
  const payableAmount = await calculateOrderPayableAmount(id);
  const bankAccount = await getDefaultCompanyBankAccount();

  let qrUrl = '';
  let transferContent = '';
  
  if (payableAmount > 0 && bankAccount) {
    transferContent = order.orderCode;
    qrUrl = buildVietQrUrl(
      bankAccount.vietQrBankId || '970416', // Fallback to ACB if empty
      bankAccount.accountNumber,
      payableAmount,
      transferContent,
      bankAccount.accountHolder
    );
  }

  // Delivery details
  const latestDelivery = order.deliveryJob; // Assuming it's the main delivery

  // Audit Log
  await logPrintAction('PRINT_ORDER', 'Order', order.id, session.id, session.role);

  return (
    <PrintLayout>
      <PrintHeader title="Đơn Đặt Hàng" />
      
      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Kính gửi khách hàng:</h3>
          <p className="font-bold text-base text-teal-800 uppercase">{order.customer.companyName || order.customer.name}</p>
          {order.customer.companyName && <p className="text-sm text-slate-700">Người liên hệ: {order.customer.name}</p>}
          <p className="text-sm text-slate-700">SĐT: {order.customer.phone}</p>
          <p className="text-sm text-slate-700">Email: {order.customer.email || '—'}</p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">Địa chỉ giao hàng:</p>
          <p className="text-sm text-slate-700">{order.deliveryAddress || order.customer.address || '—'}</p>
        </div>
        <div className="w-1/2 pl-4 border-l border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Số đơn hàng:</td>
                <td className="py-1 font-bold text-slate-800">{order.orderCode}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày đặt hàng:</td>
                <td className="py-1 font-bold text-slate-800">{formatDateVN(order.createdAt)}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Sales phụ trách:</td>
                <td className="py-1 font-bold text-slate-800">{order.createdBy?.name || '—'}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày hẹn giao:</td>
                <td className="py-1 font-bold text-slate-800">{order.dueDate ? formatDateVN(order.dueDate) : 'Chưa xác định'}</td>
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
          {order.items.map((item, index) => {
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
            <td className="py-3 px-2 text-right font-black text-slate-900">{formatCurrencyVND(order.subtotal)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="py-2 px-2 text-right font-bold text-slate-700">Thuế GTGT ({order.vatRate}%):</td>
            <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrencyVND(order.vatAmount)}</td>
          </tr>
          {order.shippingFee > 0 && (
            <tr>
              <td colSpan={4} className="py-2 px-2 text-right font-bold text-slate-700">Phí vận chuyển:</td>
              <td className="py-2 px-2 text-right font-black text-slate-900">{formatCurrencyVND(order.shippingFee)}</td>
            </tr>
          )}
          <tr className="bg-slate-50 border-y-2 border-slate-800">
            <td colSpan={4} className="py-4 px-2 text-right font-black text-slate-800 text-lg uppercase">Tổng đơn hàng:</td>
            <td className="py-4 px-2 text-right font-black text-slate-800 text-xl">{formatCurrencyVND(order.totalAmount)}</td>
          </tr>
          <tr>
            <td colSpan={4} className="py-2 px-2 text-right font-bold text-slate-700">Đã thanh toán/Cọc:</td>
            <td className="py-2 px-2 text-right font-black text-teal-700">{formatCurrencyVND(order.paidAmount || 0)}</td>
          </tr>
          <tr className="bg-slate-50 border-b-2 border-slate-800">
            <td colSpan={4} className="py-4 px-2 text-right font-black text-slate-800 text-lg uppercase">Còn lại:</td>
            <td className={`py-4 px-2 text-right font-black text-xl ${payableAmount > 0 ? 'text-rose-600' : 'text-slate-800'}`}>{formatCurrencyVND(payableAmount)}</td>
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
            TP.HCM, ngày {String(order.createdAt.getDate()).padStart(2, '0')} tháng {String(order.createdAt.getMonth() + 1).padStart(2, '0')} năm {order.createdAt.getFullYear()}
          </p>
        </div>
        <div className="flex justify-between mb-24 px-8">
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-28">Khách hàng nhận hàng</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-28">Đại diện công ty</p>
            <p className="font-bold text-slate-800">{order.createdBy?.name || '—'}</p>
          </div>
        </div>
      </div>

      <PrintFooter 
        customNotes={[
          'Quý khách vui lòng kiểm tra kỹ thông tin đơn hàng, quy cách, số lượng và nội dung thanh toán trước khi xác nhận.',
          'Quý khách vui lòng kiểm tra kỹ số lượng, chất lượng hàng hóa khi nhận.',
          'Hàng hóa được đổi trả trong vòng 3 ngày nếu có lỗi từ nhà sản xuất.',
          'Mọi thắc mắc xin vui lòng liên hệ trực tiếp với nhân viên Sales phụ trách.'
        ]}
      />
    </PrintLayout>
  );
}
