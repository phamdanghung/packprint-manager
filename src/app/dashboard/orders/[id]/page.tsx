import React from 'react';
import { getOrderById } from '@/lib/order-actions';
import { formatCurrencyVND, formatDate } from '@/lib/utils';
import { findParentMaterialFulfillment } from '@/lib/inventory-fulfillment';
import ConversionSuggester from '@/components/inventory/conversion-suggester';
import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import UpdateStatus from '@/components/orders/update-status';
import PaymentSection from '@/components/orders/payment-section';
import Unauthorized from '@/components/unauthorized';
import DesignFilesSection from '@/components/design-files/design-files-section';
import ProductionProgressSection from '@/components/orders/production-progress-section';
import DeliveryProgressSection from '@/components/orders/delivery-progress-section';

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return <Unauthorized />;
  
  const { id } = await params;
  const res = await getOrderById(id);
  if (!res.success || !res.data) return <div>{res.error || 'Không tìm thấy đơn hàng'}</div>;
  
  const order = res.data as any;
  const customer = order.customer;
  const items = order.items;
  const payments = order.payments || [];

  const showFinancials = !['DESIGNER', 'PRODUCTION', 'DELIVERY'].includes(user.role);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Đơn Hàng: {order.orderCode}</h1>
          <p className="text-sm text-slate-500 mt-1">
            Ngày tạo: {formatDate(order.createdAt)} 
            {order.quote?.quoteNumber && <span> | Từ báo giá: <Link href={`/dashboard/quotes/${order.quoteId}`} className="text-blue-500">{order.quote.quoteNumber}</Link></span>}
          </p>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/print/orders/${order.id}`} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">
            In Đơn Hàng
          </Link>
          {order.productionJob && (
            <Link href={`/dashboard/print/production-jobs/${order.productionJob.id}`} className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold py-2 px-4 rounded-lg">
              In Lệnh SX
            </Link>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4 border-b pb-2">Thông tin khách hàng & Giao hàng</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="mb-1"><strong>Khách hàng:</strong> {customer.name}</p>
                <p className="mb-1"><strong>Điện thoại:</strong> {customer.phone}</p>
                <p className="mb-1"><strong>Mã KH:</strong> {customer.customerCode}</p>
              </div>
              <div>
                <p className="mb-1"><strong>Hạn giao:</strong> {order.dueDate ? formatDate(order.dueDate) : 'Chưa cập nhật'}</p>
                <p className="mb-1"><strong>Ghi chú đơn:</strong> {order.note || 'Không có'}</p>
                <p className="mb-1"><strong>Ghi chú nội bộ:</strong> {order.internalNote || 'Không có'}</p>
              </div>
            </div>
          </div>

          {await Promise.all(items.map(async (item: any, idx: number) => {
            const layoutDetails = item.layoutDetails ? JSON.parse(item.layoutDetails) : null;
            let fulfillmentData = null;
            if (['MANAGER', 'ADMIN'].includes(user.role)) {
              try {
                fulfillmentData = await findParentMaterialFulfillment({
                  childMaterialId: item.materialId,
                  requiredChildQtyBase: item.totalSheets,
                  orderId: order.id
                });
              } catch (e) {
                console.error(e);
              }
            }
            return (

              <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
                <h2 className="text-xl font-bold mb-4 border-b pb-2">Sản phẩm #{idx + 1}: {item.name}</h2>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p><strong>Hình dạng:</strong> {item.labelShape} {item.labelShape === 'CIRCLE' ? `(ĐK ${item.diameterCm}cm)` : `(${item.widthCm}x${item.heightCm}cm)`}</p>
                    <p><strong>Số lượng:</strong> {item.quantity}</p>
                    <p><strong>Loại bế:</strong> {item.dieCutType}</p>
                    <hr className="my-2" />
                    <p><strong>Số con / tờ:</strong> {item.labelsPerSheet}</p>
                    <p><strong>Tổng tờ in (gồm bù hao):</strong> {item.totalSheets}</p>
                    {fulfillmentData && (
                      <div className="mt-4 border-t pt-4">
                        <h3 className="font-bold text-slate-800 mb-2">Vật tư & Gợi ý cắt giấy</h3>
                        <ConversionSuggester orderId={order.id} fulfillmentData={fulfillmentData} />
                      </div>
                    )}
                  </div>
                  {showFinancials && (
                    <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded border">
                      <p className="font-bold mb-2">Thông tin tài chính SP (Ẩn với SX/TK)</p>
                      <div className="flex justify-between"><span>Vật tư:</span> <span>{formatCurrencyVND(item.materialCost)}</span></div>
                      <div className="flex justify-between"><span>Gia công:</span> <span>{formatCurrencyVND(item.laminationCost + item.dieCutCost)}</span></div>
                      <div className="flex justify-between"><span>In ấn:</span> <span>{formatCurrencyVND(item.printingCost)}</span></div>
                      <hr className="my-1" />
                      <div className="flex justify-between font-bold"><span>Giá vốn:</span> <span>{formatCurrencyVND(item.costAmount)}</span></div>
                      <div className="flex justify-between font-bold text-blue-600"><span>Giá bán:</span> <span>{formatCurrencyVND(item.saleAmount)}</span></div>
                    </div>
                  )}
                </div>
                {layoutDetails && (
                  <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-800 dark:text-blue-300 rounded border border-blue-200 text-sm">
                    <strong>Thông tin bình bài:</strong> Kiểu {layoutDetails.layoutTypeUsed} | Số con {layoutDetails.labelsPerSheet}
                  </div>
                )}
              </div>
            )
          }))}
          
          <DesignFilesSection orderId={order.id} currentUserRole={user.role} />
        </div>

        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4">Cập nhật Trạng thái</h2>
            <UpdateStatus orderId={order.id} initialStatus={order.status} userRole={user.role} />
          </div>

          <ProductionProgressSection job={order.productionJob} />
          
          <DeliveryProgressSection job={order.deliveryJob} orderStatus={order.status} />

          <PaymentSection order={order} payments={payments} currentUserRole={user.role} />

          {showFinancials && (
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-xl font-bold mb-4">Lợi nhuận Đơn hàng</h2>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Tổng doanh thu (chưa VAT):</span> <span>{formatCurrencyVND(order.subtotal)}</span></div>
                <div className="flex justify-between"><span>Tổng chi phí vốn:</span> <span>{formatCurrencyVND(order.totalCost)}</span></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold text-green-600">
                  <span>Lợi nhuận Gộp:</span> <span>{formatCurrencyVND(order.grossProfit)}</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Tỷ suất Lợi nhuận:</span> <span>{order.grossProfitRate.toFixed(2)}%</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
