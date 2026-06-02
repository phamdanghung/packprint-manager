import React from 'react';
import { getQuoteById } from '@/lib/quote-actions';
import { formatCurrencyVND, formatDate } from '@/lib/utils';
import Link from 'next/link';
import ConvertQuoteButton from '@/components/quotes/convert-quote-button';
import UpdateQuoteStatus from '@/components/quotes/update-quote-status';

export default async function QuoteDetailPage({ params }: { params: { id: string } }) {
  const { id } = await params;
  const res = await getQuoteById(id);
  if (!res.success || !res.data) return <div>{res.error || 'Không tìm thấy báo giá'}</div>;
  
  const quote = res.data;
  const customer = quote.customer;
  const items = quote.items;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Báo Giá: {quote.quoteNumber}</h1>
          <p className="text-sm text-slate-500 mt-1 flex items-center gap-2">
            Trạng thái: <UpdateQuoteStatus quoteId={quote.id} initialStatus={quote.status} /> 
            | Ngày tạo: {formatDate(quote.createdAt)}
          </p>
        </div>
        <div className="flex gap-2">
          {quote.status === 'DRAFT' && (
            <Link href={`/dashboard/quotes/${quote.id}/edit`} className="bg-orange-500 hover:bg-orange-600 text-white font-bold py-2 px-4 rounded-lg">
              Sửa Báo Giá
            </Link>
          )}
          <ConvertQuoteButton quoteId={quote.id} status={quote.status} />
          <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg">Xuất PDF</button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">Thông tin khách hàng</h2>
          <div className="space-y-2 text-sm">
            <p><strong>Khách hàng:</strong> {customer.name}</p>
            <p><strong>Điện thoại:</strong> {customer.phone}</p>
            <p><strong>Email:</strong> {customer.email || 'N/A'}</p>
            <p><strong>Công nợ:</strong> <span className="text-red-500 font-bold">{formatCurrencyVND(customer.debtBalance)}</span></p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">Tổng quan Báo giá</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span>Tổng vốn:</span> <strong>{formatCurrencyVND(quote.totalCost)}</strong></div>
            <div className="flex justify-between"><span>Giá bán trước VAT:</span> <strong>{formatCurrencyVND(quote.subtotal)}</strong></div>
            <div className="flex justify-between"><span>VAT ({quote.vatRate}%):</span> <strong>{formatCurrencyVND(quote.vatAmount)}</strong></div>
            <div className="flex justify-between"><span>Phí giao hàng:</span> <strong>{formatCurrencyVND(quote.shippingFee)}</strong></div>
            <hr className="my-2" />
            <div className="flex justify-between text-lg text-blue-600 font-black">
              <span>TỔNG TIỀN:</span> <span>{formatCurrencyVND(quote.totalAmount)}</span>
            </div>
            <div className="flex justify-between text-green-600">
              <span>Lợi nhuận dự kiến:</span> <span>{formatCurrencyVND(quote.grossProfit)} ({quote.grossProfitRate.toFixed(2)}%)</span>
            </div>
          </div>
        </div>
      </div>

      {items.map((item: any, idx: number) => {
        const layoutDetails = item.layoutDetails ? JSON.parse(item.layoutDetails) : null;
        return (
          <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-xl font-bold mb-4">Sản phẩm #{idx + 1}: {item.name}</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 text-sm">
                <p><strong>Loại sản phẩm:</strong> {item.productType}</p>
                <p><strong>Hình dạng:</strong> {item.labelShape}</p>
                <p><strong>Kích thước:</strong> {item.labelShape === 'CIRCLE' ? `Đường kính ${item.diameterCm}cm` : `${item.widthCm}x${item.heightCm}cm`}</p>
                <p><strong>Số lượng:</strong> {item.quantity}</p>
                <p><strong>Loại bế:</strong> {item.dieCutType}</p>
                <hr className="my-2" />
                <p><strong>Số con / tờ in:</strong> {item.labelsPerSheet}</p>
                <p><strong>Tổng tờ in (cả bù hao):</strong> {item.totalSheets}</p>
              </div>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>Chi phí vật tư:</span> <span>{formatCurrencyVND(item.materialCost)}</span></div>
                <div className="flex justify-between"><span>Chi phí cán màng:</span> <span>{formatCurrencyVND(item.laminationCost)}</span></div>
                <div className="flex justify-between"><span>Chi phí bế:</span> <span>{formatCurrencyVND(item.dieCutCost)}</span></div>
                <div className="flex justify-between"><span>Chi phí in:</span> <span>{formatCurrencyVND(item.printingCost)}</span></div>
                <div className="flex justify-between"><span>Phí xử lý file:</span> <span>{formatCurrencyVND(item.fileHandlingFee)}</span></div>
                <div className="flex justify-between"><span>Phí khác:</span> <span>{formatCurrencyVND(item.otherFee)}</span></div>
                <hr className="my-2" />
                <div className="flex justify-between font-bold"><span>Tổng vốn SP:</span> <span>{formatCurrencyVND(item.costAmount)}</span></div>
                <div className="flex justify-between font-bold text-blue-600"><span>Giá bán SP:</span> <span>{formatCurrencyVND(item.saleAmount)}</span></div>
              </div>
            </div>

            {layoutDetails && (
              <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700">
                <h3 className="font-bold mb-2">Thông tin bình bài (Layout Packing)</h3>
                <p className="text-sm"><strong>Kiểu bình:</strong> {layoutDetails.layoutTypeUsed}</p>
                <p className="text-sm"><strong>Số con bình được:</strong> {layoutDetails.labelsPerSheet}</p>
                {layoutDetails.warnings?.length > 0 && (
                  <p className="text-sm text-yellow-600 mt-2"><strong>Cảnh báo bình bài:</strong> {layoutDetails.warnings.join(' | ')}</p>
                )}
              </div>
            )}
            
            {item.warningNote && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                <strong>Ghi chú & Cảnh báo:</strong> {item.warningNote}
              </div>
            )}
          </div>
        )
      })}
    </div>
  );
}
