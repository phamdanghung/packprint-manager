import React from 'react';
import Link from 'next/link';
import { PlusCircle, Search, FileText, ChevronRight } from 'lucide-react';
import { getQuotes } from '@/lib/quote-actions';
import { getCurrentUser } from '@/lib/auth';

export default async function SalesMobileQuotesPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const user = await getCurrentUser();
  if (!user) return null;

  const sp = await searchParams;
  const query = sp.q || '';
  
  // Fetch quotes
  const res = await getQuotes({ 
    search: query, 
    assignedSalesId: user.role === 'SALES' ? user.id : undefined 
  });
  const quotes = res.success ? (res.data as any[]) : [];

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-xl font-bold text-slate-800">Báo giá</h1>
          <Link href="/dashboard/sales/mobile/quotes/new" className="text-teal-600 bg-teal-50 p-2 rounded-full">
            <PlusCircle className="w-5 h-5" />
          </Link>
        </div>
        <form className="relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input 
            type="text" 
            name="q"
            defaultValue={query}
            placeholder="Tìm theo mã báo giá, tên khách..." 
            className="w-full bg-slate-100 border-none rounded-xl py-2 pl-9 pr-4 text-sm focus:ring-2 focus:ring-teal-500 outline-none"
          />
        </form>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 pb-24">
        {quotes.length === 0 ? (
          <div className="text-center p-8 text-slate-500 flex flex-col items-center">
            <FileText className="w-12 h-12 text-slate-300 mb-3" />
            <p className="mb-4 text-sm">Chưa có báo giá nào.</p>
            <Link href="/dashboard/sales/mobile/quotes/new" className="px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
              Tạo báo giá đầu tiên
            </Link>
          </div>
        ) : (
          quotes.map(q => (
            <Link href={`/dashboard/sales/mobile/quotes/${q.id}`} key={q.id} className="block bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h3 className="font-bold text-slate-800 text-base">{q.quoteNumber}</h3>
                  <p className="text-sm text-slate-600">{q.customer.name}</p>
                </div>
                {q.status === 'DRAFT' && <span className="bg-amber-100 text-amber-700 px-2 py-1 rounded-md text-[10px] font-bold">NHÁP</span>}
                {q.status === 'SENT' && <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-md text-[10px] font-bold">ĐÃ GỬI</span>}
                {q.status === 'ACCEPTED' && <span className="bg-emerald-100 text-emerald-700 px-2 py-1 rounded-md text-[10px] font-bold">ĐÃ CHỐT</span>}
              </div>
              
              <div className="flex justify-between items-end mt-3">
                <div>
                  <p className="text-[10px] text-slate-500">Tổng tiền</p>
                  <p className="font-bold text-teal-600 text-lg">{q.totalAmount.toLocaleString()}đ</p>
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
