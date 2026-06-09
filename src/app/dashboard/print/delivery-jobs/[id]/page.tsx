import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintLayout from '@/components/print/PrintLayout';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';
import { formatCurrencyVND, formatDateVN } from '@/lib/print-documents/helpers';
import { logPrintAction } from '@/lib/print-documents/audit';
import { getDeliveryCodAmount } from '@/lib/utils';

export default async function DeliveryPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  const job = await db.deliveryJob.findUnique({
    where: { id },
    include: {
      order: {
        include: {
          customer: true,
          items: true,
        }
      },
      assignedTo: true,
    }
  });

  if (!job) notFound();

  // Audit Log
  await logPrintAction('PRINT_DELIVERY_NOTE', 'DeliveryJob', job.id, session.id, session.role);

  const codAmount = getDeliveryCodAmount(job.order);

  return (
    <PrintLayout>
      <PrintHeader title="Phiếu Giao Hàng" />
      
      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Thông tin nhận hàng:</h3>
          <p className="font-bold text-base text-teal-800 uppercase break-words">{job.order.customer.companyName || job.order.customer.name}</p>
          <p className="text-sm text-slate-700 mt-1">Người nhận: <span className="font-semibold">{job.receiverName || job.order.customer.name}</span></p>
          <p className="text-sm text-slate-700">SĐT: <span className="font-semibold">{job.receiverPhone || job.order.customer.phone}</span></p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">Địa chỉ giao hàng:</p>
          {(() => {
            const addr = job.deliveryAddress || job.order.deliveryAddress || job.order.customer.address;
            if (addr) {
              return <p className="text-sm text-slate-800 font-medium break-words">{addr}</p>;
            }
            return <p className="text-sm text-rose-600 font-bold italic mt-1 bg-rose-50 px-2 py-1 rounded inline-block">Chưa cập nhật địa chỉ</p>;
          })()}
          {job.note && (
            <p className="text-sm text-slate-700 mt-3"><span className="font-semibold">Ghi chú giao:</span> {job.note}</p>
          )}
        </div>
        <div className="w-1/2 pl-4 border-l border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Mã phiếu giao:</td>
                <td className="py-1 font-bold text-slate-800 text-lg">{job.deliveryCode}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Mã đơn hàng:</td>
                <td className="py-1 font-bold text-slate-800">{job.order.orderCode}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày lập phiếu:</td>
                <td className="py-1 font-bold text-slate-800">{formatDateVN(job.createdAt)}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Nhân viên giao:</td>
                <td className="py-1 font-bold text-slate-800">{job.assignedTo?.name || 'Chưa phân công'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-slate-100 border-y-2 border-slate-300">
            <th className="py-2 px-2 text-left font-bold text-slate-700 w-12">STT</th>
            <th className="py-2 px-2 text-left font-bold text-slate-700">Tên hàng hóa & Quy cách</th>
            <th className="py-2 px-2 text-right font-bold text-slate-700 w-24">Số lượng</th>
            <th className="py-2 px-2 text-center font-bold text-slate-700 w-32">Số kiện/Thùng</th>
            <th className="py-2 px-2 text-left font-bold text-slate-700 w-32">Ghi chú</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200">
          {(() => {
            const itemsToRender = (job as any).items && (job as any).items.length > 0 ? (job as any).items : job.order.items;
            return itemsToRender.length > 0 ? (
              itemsToRender.map((item: any, index: number) => (
                <tr key={item.id} className="group">
                  <td className="py-3 px-2 align-top text-slate-600 font-medium">{index + 1}</td>
                  <td className="py-3 px-2 align-top">
                    <p className="font-bold text-slate-800 mb-1">{item.name || item.productName || 'Sản phẩm'}</p>
                    {(item.widthCm || item.labelShape) && (
                      <p className="text-xs text-slate-600 mb-1">KT: {item.widthCm}x{item.heightCm}cm | Hình dáng: {item.labelShape}</p>
                    )}
                    {item.productionNote && (
                      <p className="text-[11px] text-slate-500 italic mt-0.5">Yêu cầu: {item.productionNote}</p>
                    )}
                  </td>
                  <td className="py-3 px-2 align-top text-right font-bold text-slate-800 text-base">{item.quantity.toLocaleString('vi-VN')}</td>
                  <td className="py-3 px-2 align-top text-center text-slate-700 font-medium">
                    1 kiện
                  </td>
                  <td className="py-3 px-2 align-top text-slate-500 text-xs italic"></td>
                </tr>
              ))
            ) : (
               <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 italic">Không có chi tiết sản phẩm</td>
               </tr>
            );
          })()}
        </tbody>
        {job.order.items.length > 0 && (
          <tfoot>
            <tr className="border-t-2 border-slate-800 bg-slate-50">
              <td colSpan={2} className="py-3 px-2 text-right font-bold text-slate-700 uppercase">Tổng cộng số lượng:</td>
              <td className="py-3 px-2 text-right font-black text-slate-900 text-lg">
                {((job as any).items && (job as any).items.length > 0 ? (job as any).items : job.order.items).reduce((acc: number, item: any) => acc + item.quantity, 0).toLocaleString('vi-VN')}
              </td>
              <td colSpan={2}></td>
            </tr>
          </tfoot>
        )}
      </table>

      {/* COD or Payment info on Delivery Note if needed. Just a basic section. */}
      <div className="flex border-2 border-slate-300 rounded-lg p-4 mb-8 bg-slate-50">
        <div className="w-1/2">
          <p className="font-bold text-slate-800 mb-2">Tình trạng hàng hóa khi giao:</p>
          <div className="space-y-2 text-sm text-slate-700 font-medium">
            <p>▢ Đã nhận đủ số lượng</p>
            <p>▢ Hàng hóa nguyên vẹn, không hư hỏng</p>
            <p>▢ Yêu cầu kiểm đếm chi tiết</p>
          </div>
        </div>
        <div className="w-1/2 pl-4 border-l border-slate-300">
          <p className="font-bold text-slate-800 mb-2 text-lg">Thanh toán (COD):</p>
          <div className="text-sm mt-3">
            {codAmount > 0 ? (
              <>
                <p className="text-slate-700 font-semibold mb-1 text-base">Cần thu khách:</p>
                <p className="font-black text-rose-600 text-2xl tracking-tight">
                  {formatCurrencyVND(codAmount)}
                </p>
              </>
            ) : (
              <p className="font-bold text-slate-500 text-base mt-2 bg-slate-200 px-3 py-1.5 rounded-md inline-block">
                Đã thanh toán / Không thu hộ
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Signature Row */}
      <div className="break-inside-avoid">
        <div className="flex justify-between mt-12 mb-20 px-4">
          <div className="text-center w-1/3">
            <p className="font-bold text-slate-800 mb-20">Người lập phiếu</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center w-1/3">
            <p className="font-bold text-slate-800 mb-20">Nhân viên giao hàng</p>
            <p className="font-bold text-slate-800">{job.assignedTo?.name || 'Chưa phân công'}</p>
          </div>
          <div className="text-center w-1/3">
            <p className="font-bold text-slate-800 mb-20">Khách hàng nhận</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
        </div>
      </div>

      <PrintFooter 
        customNotes={[
          'Khách hàng vui lòng kiểm tra hàng hóa kỹ lưỡng trước khi ký nhận.',
          'Sau khi ký nhận, công ty chỉ giải quyết khiếu nại liên quan đến chất lượng in ấn, không giải quyết khiếu nại về số lượng và móp méo.'
        ]}
      />
    </PrintLayout>
  );
}
