import React from 'react';
import Link from 'next/link';
import { Users, FileText, ShoppingBag, QrCode, ArrowRight, Activity, PlusCircle, AlertCircle } from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export default async function SalesMobileDashboard() {
  const user = await getCurrentUser();
  if (!user) return null;

  // KPIs
  const customersCount = await db.customer.count({ where: { assignedSalesId: user.id } });
  
  const pendingQuotesCount = await db.quote.count({ 
    where: { assignedSalesId: user.id, status: 'DRAFT' } 
  });
  
  const pendingOrdersCount = await db.order.count({
    where: { assignedSalesId: user.id, status: { in: ['NEW', 'WAITING_DESIGN', 'READY_FOR_PRINT', 'PRINTING', 'FINISHING', 'QC'] } }
  });

  const pendingQRsCount = await db.paymentRequest.count({
    where: { createdById: user.id, status: 'PENDING' }
  });

  // Dang dở (In progress things)
  const recentDraftQuote = await db.quote.findFirst({
    where: { assignedSalesId: user.id, status: 'DRAFT' },
    orderBy: { updatedAt: 'desc' },
    include: { customer: true }
  });

  const newCustomersNoQuote = await db.customer.findMany({
    where: { assignedSalesId: user.id, quotes: { none: {} } },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  const convertedOrdersNotSent = await db.order.findMany({
    where: { assignedSalesId: user.id, productionStatus: null, status: 'NEW' },
    orderBy: { createdAt: 'desc' },
    take: 1
  });

  return (
    <div className="p-4 space-y-6 pb-24">
      {/* Header */}
      <div className="flex justify-between items-center bg-teal-600 -m-4 p-4 pb-10 text-white rounded-b-3xl shadow-md">
        <div>
          <h1 className="text-xl font-bold">Chào {user.name.split(' ').pop()}! 👋</h1>
          <p className="text-teal-100 text-sm">Doanh số hôm nay đang chờ bạn bứt phá.</p>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-3 -mt-6">
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-blue-100 p-2 rounded-full mb-2"><Users className="w-5 h-5 text-blue-600" /></div>
          <span className="text-xl font-bold text-slate-800">{customersCount}</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase">Khách hàng</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-amber-100 p-2 rounded-full mb-2"><FileText className="w-5 h-5 text-amber-600" /></div>
          <span className="text-xl font-bold text-slate-800">{pendingQuotesCount}</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase">Báo giá chờ</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-emerald-100 p-2 rounded-full mb-2"><ShoppingBag className="w-5 h-5 text-emerald-600" /></div>
          <span className="text-xl font-bold text-slate-800">{pendingOrdersCount}</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase">Đơn đang XL</span>
        </div>
        <div className="bg-white p-3 rounded-2xl shadow-sm border border-slate-100 flex flex-col items-center text-center">
          <div className="bg-purple-100 p-2 rounded-full mb-2"><QrCode className="w-5 h-5 text-purple-600" /></div>
          <span className="text-xl font-bold text-slate-800">{pendingQRsCount}</span>
          <span className="text-[10px] font-medium text-slate-500 uppercase">QR đang đợi</span>
        </div>
      </div>

      {/* Quick Actions */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-teal-500" /> Thao tác nhanh
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Link href="/dashboard/sales/mobile/customers/new" className="bg-slate-900 text-white p-3 rounded-xl flex items-center gap-2 shadow-md">
            <PlusCircle className="w-4 h-4 text-teal-400" />
            <span className="text-xs font-semibold">Tạo KH mới</span>
          </Link>
          <Link href="/dashboard/sales/mobile/quotes/new" className="bg-white border border-slate-200 text-slate-800 p-3 rounded-xl flex items-center gap-2 shadow-sm">
            <PlusCircle className="w-4 h-4 text-teal-600" />
            <span className="text-xs font-semibold">Báo giá nhanh</span>
          </Link>
        </div>
      </section>

      {/* Tiếp tục việc dang dở */}
      <section>
        <h2 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-amber-500" /> Việc đang dở
        </h2>
        <div className="space-y-3">
          {recentDraftQuote && (
            <Link href={`/dashboard/sales/mobile/quotes/${recentDraftQuote.id}`} className="block bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Báo giá chưa chốt: {recentDraftQuote.quoteNumber}</p>
                <p className="text-[10px] text-slate-500">{recentDraftQuote.customer.name}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          )}

          {newCustomersNoQuote.map(c => (
            <Link key={c.id} href={`/dashboard/sales/mobile/quotes/new?customerId=${c.id}`} className="block bg-white p-3 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-slate-800">Khách mới chưa báo giá</p>
                <p className="text-[10px] text-slate-500">{c.name} - {c.phone}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-400" />
            </Link>
          ))}

          {convertedOrdersNotSent.map(o => (
            <Link key={o.id} href={`/dashboard/sales/mobile/orders/${o.id}`} className="block bg-red-50 p-3 rounded-xl border border-red-100 shadow-sm flex items-center justify-between">
              <div>
                <p className="text-xs font-bold text-red-700">Đơn chưa gửi sản xuất</p>
                <p className="text-[10px] text-red-600">{o.orderCode}</p>
              </div>
              <ArrowRight className="w-4 h-4 text-red-400" />
            </Link>
          ))}

          {(!recentDraftQuote && newCustomersNoQuote.length === 0 && convertedOrdersNotSent.length === 0) && (
            <div className="text-center p-4 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-500">
              Bạn không có việc nào đang dở dang! 🎉
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
