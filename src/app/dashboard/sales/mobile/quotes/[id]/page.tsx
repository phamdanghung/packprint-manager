import React from 'react';
import Link from 'next/link';
import { ChevronLeft, Copy, CheckCircle, ArrowRight, QrCode } from 'lucide-react';
import { getQuoteById } from '@/lib/quote-actions';
import { getCurrentUser } from '@/lib/auth';
import QuoteDetailMobileClient from './client';
import { db } from '@/lib/db';

export default async function SalesMobileQuoteDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const res = await getQuoteById(id);
  if (!res.success || !res.data) {
    return <div className="p-4">Không tìm thấy báo giá. Lỗi: {res.error || 'Unknown'}</div>;
  }

  const quote = res.data;

  // Has Order?
  const order = await db.order.findFirst({ where: { quoteId: quote.id } });

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/dashboard/sales/mobile/quotes" className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex-1">{quote.quoteNumber}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Customer info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase mb-2">Khách hàng</h2>
          <p className="font-bold text-slate-800">{quote.customer.name}</p>
          <p className="text-sm text-slate-600">{quote.customer.phone}</p>
        </div>

        {/* Status */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
          <span className="text-sm font-semibold text-slate-700">Trạng thái</span>
          {quote.status === 'DRAFT' && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold">NHÁP</span>}
          {quote.status === 'SENT' && <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-lg text-xs font-bold">ĐÃ GỬI</span>}
          {quote.status === 'ACCEPTED' && <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg text-xs font-bold">ĐÃ CHỐT</span>}
        </div>

        {/* Items */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <h2 className="text-xs font-bold text-slate-400 uppercase mb-3">Sản phẩm</h2>
          {quote.items.map((item: any) => (
            <div key={item.id} className="mb-4 last:mb-0 border-b last:border-0 pb-4 last:pb-0">
              <p className="font-semibold text-slate-800">{item.productName || 'Sản phẩm'}</p>
              <div className="flex justify-between text-sm text-slate-600 mt-1">
                <span>SL: {item.quantity?.toLocaleString() || '—'}</span>
                <span>Đơn giá: {item.unitPrice ? `${item.unitPrice.toLocaleString()}đ` : 'Đang tính'}</span>
              </div>
              <div className="flex justify-between text-sm font-bold text-slate-700 mt-2">
                <span>Thành tiền:</span>
                <span>{item.totalAmount ? `${item.totalAmount.toLocaleString()}đ` : '—'}</span>
              </div>
            </div>
          ))}
          <div className="border-t mt-2 pt-4 flex justify-between items-center">
            <span className="font-bold text-slate-700">TỔNG TIỀN</span>
            <span className="text-xl font-black text-teal-600">{quote.totalAmount?.toLocaleString()}đ</span>
          </div>
        </div>

        {/* Notes */}
        {quote.notes && (
          <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
             <h2 className="text-xs font-bold text-slate-400 uppercase mb-2">Ghi chú</h2>
             <p className="text-sm text-slate-700">{quote.notes}</p>
          </div>
        )}

        {/* CTA */}
        {order ? (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl text-center">
            <CheckCircle className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="text-emerald-800 font-bold mb-3">Đã chuyển thành Đơn hàng</p>
            <Link href={`/dashboard/sales/mobile/orders/${order.id}`} className="bg-emerald-600 text-white px-4 py-2 rounded-xl text-sm font-bold inline-flex items-center gap-2">
              Xem đơn hàng <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        ) : (
          <QuoteDetailMobileClient quote={quote} user={user} />
        )}
      </div>
    </div>
  );
}
