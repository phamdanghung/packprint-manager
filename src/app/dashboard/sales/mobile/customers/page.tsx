import React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, Phone, MoreVertical } from 'lucide-react';
import { getCustomers } from '@/lib/customer-actions';
import { getCurrentUser } from '@/lib/auth';

export default async function SalesMobileCustomersPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const query = sp.q || '';
  
  // Fetch customers
  const res = await getCustomers({ search: query, assignedSalesId: user.role === 'SALES' ? user.id : undefined });
  const customers = res.success ? (res.data as any[]) : [];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-800">Khách hàng</h1>
          <Link href="/dashboard/sales/mobile/customers/new" className="text-teal-600 bg-teal-50 p-2 rounded-full">
            <PlusCircle className="w-5 h-5" />
          </Link>
        </div>
        <form className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Tìm tên, SĐT, Email..." 
            className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </form>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {customers.length === 0 ? (
          <div className="text-center p-8 text-slate-500 flex flex-col items-center">
            <p className="mb-4 text-sm">Chưa có khách hàng nào.</p>
            <Link href="/dashboard/sales/mobile/customers/new" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
              Tạo khách hàng mới
            </Link>
          </div>
        ) : (
          customers.map(c => (
            <div key={c.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <Link href={`/dashboard/sales/mobile/customers/${c.id}`} className="font-bold text-slate-800 text-base flex-1">
                  {c.name}
                </Link>
                <div className="flex gap-2 ml-2">
                  <a href={`tel:${c.phone}`} className="p-2 bg-slate-100 rounded-full text-slate-600">
                    <Phone className="w-4 h-4" />
                  </a>
                  <Link href={`/dashboard/sales/mobile/customers/${c.id}`} className="p-2 bg-slate-100 rounded-full text-slate-600">
                    <MoreVertical className="w-4 h-4" />
                  </Link>
                </div>
              </div>
              <div className="text-sm text-slate-500 space-y-1">
                <p>SĐT: {c.phone}</p>
                {c.email && <p>Email: {c.email}</p>}
                {c.companyName && <p>Công ty: {c.companyName}</p>}
              </div>
              <div className="mt-3 pt-3 border-t border-slate-100 flex gap-2">
                <Link 
                  href={`/dashboard/sales/mobile/quotes/new?customerId=${c.id}`}
                  className="flex-1 bg-teal-50 text-teal-700 text-center py-2 rounded-xl text-xs font-semibold"
                >
                  Báo giá nhanh
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
