import React from 'react';
import Link from 'next/link';
import { ChevronLeft, QrCode, Factory, CheckCircle2 } from 'lucide-react';
import { getOrderById } from '@/lib/order-actions';
import { getCurrentUser } from '@/lib/auth';
import OrderDetailMobileClient from './client';

export default async function SalesMobileOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const user = await getCurrentUser();
  if (!user) return null;

  const res = await getOrderById(id);
  if (!res.success || !res.data) {
    return <div className="p-4">Không tìm thấy đơn hàng</div>;
  }

  const order = res.data;

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3">
        <Link href="/dashboard/sales/mobile/orders" className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </Link>
        <h1 className="text-xl font-bold text-slate-800 flex-1">{order.orderCode}</h1>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24 space-y-4">
        {/* Customer & Info */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Khách hàng</h2>
            <p className="font-bold text-slate-800">{order.customer.name}</p>
          </div>
          <div className="text-right">
            <h2 className="text-xs font-bold text-slate-400 uppercase mb-1">Cần giao</h2>
            <p className="font-bold text-slate-800">{order.dueDate ? new Date(order.dueDate).toLocaleDateString('vi-VN') : 'Chưa hẹn'}</p>
          </div>
        </div>

        {/* Financial */}
        <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100 space-y-3">
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-500">Tổng tiền</span>
            <span className="font-bold text-slate-700">{order.totalAmount.toLocaleString()}đ</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm font-semibold text-slate-500">Đã thanh toán</span>
            <span className="font-bold text-emerald-600">{order.paidAmount.toLocaleString()}đ</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-slate-100">
            <span className="text-sm font-bold text-slate-700">Còn nợ</span>
            <span className="font-bold text-red-500 text-lg">{order.debtAmount.toLocaleString()}đ</span>
          </div>
        </div>

        <OrderDetailMobileClient order={order} user={user} />
      </div>
    </div>
  );
}
