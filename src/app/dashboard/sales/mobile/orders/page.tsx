import React from 'react';
import Link from 'next/link';
import { Search, ShoppingBag, ChevronRight, Activity } from 'lucide-react';
import { getOrders } from '@/lib/order-actions';
import { getCurrentUser } from '@/lib/auth';

export default async function SalesMobileOrdersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const query = sp.q || '';
  
  // Fetch orders
  const res = await getOrders({ 
    search: query, 
    assignedSalesId: user.role === 'SALES' ? user.id : undefined 
  });
  const orders = res.success ? (res.data as any[]) : [];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-800">Đơn hàng</h1>
        </div>
        <form className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Tìm theo mã đơn, khách hàng..." 
            className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </form>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {orders.length === 0 ? (
          <div className="text-center p-8 text-slate-500 flex flex-col items-center">
            <ShoppingBag className="w-12 h-12 text-slate-300 mb-3" />
            <p className="mb-4 text-sm">Chưa có đơn hàng nào.</p>
            <Link href="/dashboard/sales/mobile/quotes" className="px-4 py-2 bg-slate-100 text-teal-700 rounded-lg text-sm font-medium hover:bg-slate-200">
              Chốt báo giá để tạo đơn hàng
            </Link>
          </div>
        ) : (
          orders.map(o => (
            <Link href={`/dashboard/sales/mobile/orders/${o.id}`} key={o.id} className="block bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{o.orderCode}</h3>
                  <p className="text-sm text-slate-600 truncate max-w-[200px]">{o.customer.name}</p>
                </div>
                {o.status === 'NEW' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold">ĐƠN MỚI</span>}
                {o.productionStatus && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold flex items-center gap-1"><Activity className="w-3 h-3"/> SX</span>}
              </div>
              
              <div className="flex justify-between items-end mt-3 border-t pt-2">
                <div>
                  <p className="text-[10px] text-slate-500">Còn nợ: <span className="font-bold text-red-500">{o.debtAmount.toLocaleString()}đ</span></p>
                  <p className="font-bold text-teal-600 text-base mt-1">{o.totalAmount.toLocaleString()}đ</p>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-400" />
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}
