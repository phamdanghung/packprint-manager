'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import QuoteForm from '@/components/quotes/quote-form';
import { convertQuoteToOrder } from '@/lib/order-actions';
import { formatCurrencyVND } from '@/lib/utils';
import { LucideFileText, LucidePlusCircle, LucideArrowRight, LucideCheckCircle2, LucideAlertCircle } from 'lucide-react';

export default function OrderCreateTabs({ customers, materials, machines, laminations, availableQuotes, initialData, userRole }: any) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'FROM_QUOTE' | 'DIRECT'>('FROM_QUOTE');
  
  // Tab 1 State
  const [selectedCustomerId, setSelectedCustomerId] = useState(initialData?.customerId || '');
  const [isConverting, setIsConverting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const filteredQuotes = availableQuotes.filter((q: any) => {
    if (selectedCustomerId) return q.customerId === selectedCustomerId;
    return true;
  });

  const handleConvert = async (quoteId: string) => {
    if (isConverting) return;
    setIsConverting(true);
    setErrorMsg('');

    const res = await convertQuoteToOrder(quoteId);
    if (res.success && res.data?.id) {
      router.push(`/dashboard/orders/${res.data.id}`);
    } else {
      setErrorMsg(res.error || 'Lỗi chuyển đổi báo giá thành đơn hàng');
      setIsConverting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {errorMsg && (
        <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
          <LucideAlertCircle className="w-5 h-5 shrink-0" />
          {errorMsg}
        </div>
      )}

      {/* Tabs Header */}
      <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('FROM_QUOTE')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
            activeTab === 'FROM_QUOTE' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <LucideFileText className="w-4 h-4" /> Từ Báo Giá (APPROVED)
        </button>
        <button
          onClick={() => setActiveTab('DIRECT')}
          className={`px-4 py-2 rounded-lg font-medium text-sm flex items-center gap-2 transition-colors ${
            activeTab === 'DIRECT' ? 'bg-white dark:bg-slate-700 shadow text-blue-600 dark:text-blue-400' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
          }`}
        >
          <LucidePlusCircle className="w-4 h-4" /> Tạo Trực Tiếp (Bỏ qua Báo giá)
        </button>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'FROM_QUOTE' ? (
          <div className="space-y-4">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
              <h2 className="font-bold mb-4">Lọc báo giá theo khách hàng</h2>
              {!!initialData?.customerId && userRole === 'SALES' ? (
                <div className="bg-slate-50 dark:bg-slate-900/50 rounded-lg p-3 border border-slate-200 dark:border-slate-700 w-full max-w-md">
                  <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 dark:bg-blue-900/30 p-2 rounded-md font-medium mb-2">
                    <LucideAlertCircle className="w-4 h-4" /> Khách hàng được khóa do tạo từ CRM.
                  </div>
                  <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 px-2">
                    {customers.find((c: any) => c.id === selectedCustomerId)?.name || 'Đang tải thông tin...'}
                  </p>
                </div>
              ) : (
                <select 
                  value={selectedCustomerId} 
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full max-w-md p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700"
                >
                  <option value="">-- Tất cả khách hàng --</option>
                  {customers.map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
                  ))}
                </select>
              )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {filteredQuotes.length === 0 ? (
                <div className="col-span-full p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-dashed border-slate-300 dark:border-slate-700">
                  Không tìm thấy Báo giá nào ở trạng thái APPROVED hoặc ACCEPTED chưa được chuyển thành đơn.
                </div>
              ) : (
                filteredQuotes.map((q: any) => (
                  <div key={q.id} className="bg-white dark:bg-slate-800 rounded-xl shadow p-5 border border-slate-200 dark:border-slate-700 flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-2">
                        <span className="font-bold text-blue-600 dark:text-blue-400">{q.quoteNumber}</span>
                        <span className="px-2 py-1 text-xs font-semibold bg-green-100 text-green-700 rounded-full flex items-center gap-1">
                          <LucideCheckCircle2 className="w-3 h-3" /> {q.status}
                        </span>
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-1">
                        <strong>Khách:</strong> {q.customer?.name}
                      </div>
                      <div className="text-sm text-slate-600 dark:text-slate-400 mb-4">
                        <strong>Sản phẩm:</strong> {q.items?.[0]?.name} (SL: {q.items?.[0]?.quantity})
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                      <div className="font-bold text-lg text-rose-600">{formatCurrencyVND(q.totalAmount)}</div>
                      <button
                        onClick={() => handleConvert(q.id)}
                        disabled={isConverting}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
                      >
                        {isConverting ? 'Đang xử lý...' : 'Chuyển thành Đơn'} <LucideArrowRight className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        ) : (
          <QuoteForm 
            customers={customers} 
            materials={materials} 
            machines={machines} 
            laminations={laminations}
            initialData={initialData}
            userRole={userRole}
            isDirectOrder={true}
          />
        )}
      </div>
    </div>
  );
}
