import React from 'react';
import Link from 'next/link';
import { Search, FileText, Package } from 'lucide-react';
import { getOrders } from '@/lib/order-actions';
import { formatCurrencyVND, formatDate } from '@/lib/utils';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';

export default async function OrdersPage() {
  const user = await getCurrentUser();
  if (!user) return null;
  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'PRODUCTION', 'DELIVERY', 'DESIGNER'];
  if (!allowedRoles.includes(user.role)) return <Unauthorized />;

  const res = await getOrders();
  const orders = res.success ? res.data : [];

  const getOrderStatus = (status: string) => {
    switch (status) {
      case 'NEW': return { label: 'Mới tạo', bg: 'bg-blue-100 text-blue-800' };
      case 'WAITING_DESIGN': return { label: 'Chờ thiết kế', bg: 'bg-purple-100 text-purple-800' };
      case 'WAITING_APPROVAL': return { label: 'Chờ duyệt file', bg: 'bg-yellow-100 text-yellow-800' };
      case 'READY_FOR_PRINT': return { label: 'Sẵn sàng in', bg: 'bg-indigo-100 text-indigo-800' };
      case 'PRINTING': return { label: 'Đang in', bg: 'bg-orange-100 text-orange-800' };
      case 'FINISHING': return { label: 'Đang gia công', bg: 'bg-pink-100 text-pink-800' };
      case 'QC': return { label: 'Kiểm hàng (QC)', bg: 'bg-teal-100 text-teal-800' };
      case 'READY_FOR_DELIVERY': return { label: 'Chờ giao hàng', bg: 'bg-cyan-100 text-cyan-800' };
      case 'DELIVERING': return { label: 'Đang giao', bg: 'bg-lime-100 text-lime-800' };
      case 'COMPLETED': return { label: 'Hoàn thành', bg: 'bg-green-100 text-green-800' };
      case 'CANCELLED': return { label: 'Đã huỷ', bg: 'bg-red-100 text-red-800' };
      default: return { label: status, bg: 'bg-slate-100 text-slate-800' };
    }
  };

  const getPaymentStatus = (status: string) => {
    switch (status) {
      case 'UNPAID': return { label: 'Chưa thanh toán', bg: 'bg-red-50 text-red-600 border border-red-200' };
      case 'PARTIAL': return { label: 'Thanh toán 1 phần', bg: 'bg-yellow-50 text-yellow-700 border border-yellow-200' };
      case 'PAID': return { label: 'Đã thanh toán đủ', bg: 'bg-green-50 text-green-700 border border-green-200' };
      default: return { label: status, bg: 'bg-slate-100 text-slate-600' };
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-white">Danh sách Đơn hàng</h1>
        </div>
        <button disabled className="bg-slate-300 text-slate-500 font-bold py-2 px-4 rounded-lg cursor-not-allowed opacity-60">
          + Tạo đơn hàng thủ công (MVP: Qua báo giá)
        </button>
      </div>

      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-xs" placeholder="Tìm kiếm đơn hàng..." />
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border rounded-3xl p-6 shadow-sm overflow-hidden">
        <div className="overflow-x-auto rounded-2xl border custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 font-bold border-b">
                <th className="py-4 px-4 uppercase">Mã đơn / Ngày tạo</th>
                <th className="py-4 px-4 uppercase">Khách hàng</th>
                <th className="py-4 px-4 uppercase">Sản phẩm</th>
                <th className="py-4 px-4 uppercase text-right">Tổng tiền</th>
                <th className="py-4 px-4 uppercase">Trạng thái</th>
                <th className="py-4 px-4 uppercase">Thanh toán</th>
                <th className="py-4 px-4 uppercase">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {orders?.map((o: any) => {
                const statusBadge = getOrderStatus(o.status);
                const paymentBadge = getPaymentStatus(o.paymentStatus);
                const firstItem = o.items?.[0];
                return (
                  <tr key={o.id} className="hover:bg-slate-50/50">
                    <td className="py-4 px-4">
                      <div className="font-bold flex items-center gap-1.5 text-blue-700">
                        <Package className="h-4 w-4" /> <span>{o.orderCode}</span>
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDate(o.createdAt)}</div>
                    </td>
                    <td className="py-4 px-4 font-bold">{o.customer?.name}</td>
                    <td className="py-4 px-4 max-w-[200px]">
                      {firstItem && (
                        <div>
                          <div className="font-bold">{firstItem.name}</div>
                          <div className="text-[10px] text-slate-500">SL: {firstItem.quantity}</div>
                        </div>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right font-bold text-slate-800">
                      {['DESIGNER', 'PRODUCTION', 'DELIVERY'].includes(user.role) 
                        ? '***' 
                        : formatCurrencyVND(o.totalAmount)}
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${paymentBadge.bg}`}>
                        {paymentBadge.label}
                      </span>
                    </td>
                    <td className="py-4 px-4">
                      <Link href={`/dashboard/orders/${o.id}`} className="text-blue-600 hover:underline font-bold">
                        Xem chi tiết
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
