'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { formatCurrencyVND } from '@/lib/utils';
import { updateMarginReview } from '@/lib/margin-alert-actions';

const ALERT_LABELS: Record<string, string> = {
  LOW_MARGIN: 'Biên lợi nhuận thấp',
  HIGH_PRODUCTION_COST: 'Chi phí sản xuất cao',
  MISSING_REVENUE_OR_DATA_ISSUE: 'Thiếu doanh thu / lỗi dữ liệu',
  MISSING_COST_DATA: 'Thiếu dữ liệu chi phí',
  CANCELLED_COST_LINE_AUDIT: 'Có chi phí đã hủy',
  IN_PROGRESS_PXK_INFO: 'Có PXK đang xử lý',
};

const ALERT_TOOLTIPS: Record<string, string> = {
  LOW_MARGIN: 'Biên lợi nhuận gộp tạm tính thấp hơn ngưỡng quản trị.',
  HIGH_PRODUCTION_COST: 'Chi phí sản xuất chiếm tỷ lệ cao so với doanh thu.',
  MISSING_REVENUE_OR_DATA_ISSUE: 'Đơn có chi phí nhưng doanh thu bằng 0, cần kiểm tra dữ liệu.',
  MISSING_COST_DATA: 'Đơn có doanh thu nhưng chưa ghi nhận chi phí sản xuất.',
  CANCELLED_COST_LINE_AUDIT: 'Có dòng chi phí đã hủy. Dòng này không tính vào cost nhưng được cảnh báo để audit.',
  IN_PROGRESS_PXK_INFO: 'Có phiếu xuất kho đang xử lý. Phiếu này không tính vào cost/profit hiện tại.',
};

export default function MarginReviewClient({
  initialData,
  currentUserId
}: {
  initialData: any[];
  currentUserId: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const periodType = searchParams.get('periodType') || 'MONTH';
  const statusFilter = searchParams.get('statusFilter') || 'ALL';

  const [selectedOrder, setSelectedOrder] = useState<any>(null);
  const [note, setNote] = useState('');
  const [updateError, setUpdateError] = useState('');

  const handleFilterChange = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set(key, value);
    startTransition(() => {
      router.push(`?${params.toString()}`);
    });
  };

  const handleAction = async (actionType: 'MARK_REVIEWED' | 'REQUEST_ACTION') => {
    setUpdateError('');
    if (actionType === 'REQUEST_ACTION' && !note.trim()) {
      setUpdateError('Vui lòng nhập ghi chú khi yêu cầu xử lý.');
      return;
    }
    const res = await updateMarginReview(selectedOrder.orderId, { note, actionType });
    if (!res.success) {
      setUpdateError(res.error || 'Có lỗi xảy ra');
      return;
    }
    setSelectedOrder(null);
    setNote('');
    startTransition(() => {
      router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4">
        <h1 className="text-2xl font-bold text-slate-800">Cảnh báo biên lợi nhuận</h1>
        <div className="flex flex-wrap gap-4">
          <select
            value={periodType}
            onChange={(e) => handleFilterChange('periodType', e.target.value)}
            className="border border-slate-300 p-2.5 rounded-lg bg-white shadow-sm text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="MONTH">Tháng hiện tại</option>
            <option value="QUARTER">Quý hiện tại</option>
            <option value="YEAR">Năm hiện tại</option>
            <option value="ALL">Tất cả</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => handleFilterChange('statusFilter', e.target.value)}
            className="border border-slate-300 p-2.5 rounded-lg bg-white shadow-sm text-sm font-medium focus:ring-2 focus:ring-indigo-500 outline-none"
          >
            <option value="ALL">Tất cả</option>
            <option value="UNREVIEWED">Chưa review</option>
            <option value="NEEDS_ACTION">Cần xử lý</option>
            <option value="REVIEWED">Đã review</option>
          </select>
        </div>
      </div>

      <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200 overflow-x-auto">
        {isPending && <div className="text-sm text-indigo-600 mb-2 px-2 pt-2 font-medium animate-pulse flex items-center gap-2">
          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
          Đang cập nhật dữ liệu...
        </div>}
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200 bg-slate-50 text-left text-slate-600">
              <th className="p-4 font-semibold whitespace-nowrap rounded-tl-lg">Mã đơn</th>
              <th className="p-4 font-semibold min-w-[150px]">Khách hàng</th>
              <th className="p-4 font-semibold whitespace-nowrap">Doanh thu</th>
              <th className="p-4 font-semibold min-w-[200px]">Lợi nhuận gộp tạm tính</th>
              <th className="p-4 font-semibold min-w-[250px]">Cảnh báo</th>
              <th className="p-4 font-semibold min-w-[150px]">Trạng thái</th>
              <th className="p-4 font-semibold text-right whitespace-nowrap rounded-tr-lg">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {initialData.map((row, idx) => {
              const isMissingCost = row.alerts.includes('MISSING_COST_DATA');
              
              return (
              <tr key={idx} className="border-b border-slate-100 hover:bg-slate-50/80 transition-colors">
                <td className="p-4 font-semibold">
                  <a href={`/dashboard/reports/management-costing?orderId=${row.orderId}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 hover:underline">
                    {row.orderCode}
                  </a>
                </td>
                <td className="p-4 text-slate-700">{row.customerName}</td>
                <td className="p-4 font-medium text-slate-800">{formatCurrencyVND(row.revenue)}</td>
                <td className="p-4">
                  <div className={row.grossMarginPercent < 20 || isMissingCost ? 'text-orange-600 font-bold' : 'text-slate-800 font-semibold'}>
                    {formatCurrencyVND(row.grossProfit)}
                    <br />
                    <span className={`text-xs ${isMissingCost ? 'text-orange-500 font-medium' : 'text-slate-500 font-normal'} mt-0.5 inline-block`}>
                      Biên lợi nhuận: {row.grossMarginPercent !== undefined ? row.grossMarginPercent.toFixed(1) + '%' : 'N/A'}
                      {isMissingCost && ' — Chưa đủ dữ liệu chi phí'}
                    </span>
                  </div>
                </td>
                <td className="p-4">
                  <div className="flex flex-wrap gap-1.5">
                    {row.alerts.map((a: string) => (
                      <span 
                        key={a} 
                        title={ALERT_TOOLTIPS[a] || a}
                        className={`px-2 py-1 rounded-md text-[11px] font-semibold text-white shadow-sm cursor-help ${a === 'LOW_MARGIN' || a === 'MISSING_COST_DATA' ? 'bg-rose-500' : a.includes('MISSING') ? 'bg-orange-500' : 'bg-amber-500'}`}
                      >
                        {ALERT_LABELS[a] || a}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4">
                  {row.inferredStatus === 'UNREVIEWED' && <span className="inline-block px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 font-semibold text-xs border border-slate-200">Chưa review</span>}
                  {row.inferredStatus === 'NEEDS_ACTION' && <span className="inline-block px-2.5 py-1 rounded-md bg-orange-100 text-orange-700 font-bold text-xs border border-orange-200">Cần xử lý</span>}
                  {row.inferredStatus === 'REVIEWED' && (
                    <div className="inline-flex flex-col">
                      <span className="px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-700 font-bold text-xs inline-block w-max border border-emerald-200">Đã review</span>
                      <span className="text-[10px] text-slate-500 mt-1.5 font-medium">bởi {row.reviewer}</span>
                    </div>
                  )}
                  {row.managementMarginNote && (
                    <div className="text-[11px] text-slate-600 mt-2.5 bg-white p-2 rounded-md border border-slate-200 shadow-sm" title={row.managementMarginNote}>
                      <span className="font-semibold text-slate-700">Ghi chú:</span> {row.managementMarginNote.length > 50 ? row.managementMarginNote.substring(0, 50) + '...' : row.managementMarginNote}
                    </div>
                  )}
                </td>
                <td className="p-4 text-right">
                  <button
                    onClick={() => {
                      setSelectedOrder(row);
                      setNote(row.managementMarginNote || '');
                    }}
                    className="bg-indigo-600 text-white px-3.5 py-1.5 rounded-lg text-sm font-semibold hover:bg-indigo-700 shadow-sm transition-all hover:shadow hover:-translate-y-0.5"
                  >
                    Xem xét
                  </button>
                </td>
              </tr>
            )})}
            {initialData.length === 0 && !isPending && (
              <tr>
                <td colSpan={7} className="p-12 text-center text-slate-500 bg-slate-50/50">
                  <div className="flex flex-col items-center justify-center max-w-sm mx-auto">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center mb-4">
                      <svg className="w-8 h-8 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    </div>
                    <span className="text-base font-medium text-slate-600">Không có đơn hàng cần review trong kỳ này.</span>
                    <span className="text-sm text-slate-400 mt-1">Mọi thứ đều đang hoạt động tốt.</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white p-7 rounded-2xl w-full max-w-xl shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-2xl font-bold text-slate-800">Xem xét đơn hàng</h2>
                <p className="text-indigo-600 font-semibold mt-1">{selectedOrder.orderCode}</p>
              </div>
              <button onClick={() => setSelectedOrder(null)} className="text-slate-400 hover:text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-full p-1.5 transition-colors">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="mb-6 grid grid-cols-2 gap-y-5 gap-x-4 text-sm bg-slate-50/80 p-5 rounded-xl border border-slate-200 shadow-inner">
              <div>
                <p className="text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wider">Doanh thu</p>
                <p className="font-bold text-slate-800 text-lg">{formatCurrencyVND(selectedOrder.revenue)}</p>
              </div>
              <div>
                <p className="text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wider">Lợi nhuận gộp tạm tính</p>
                <p className={`font-bold text-lg ${selectedOrder.alerts.includes('MISSING_COST_DATA') || selectedOrder.grossMarginPercent < 20 ? 'text-orange-600' : 'text-slate-800'}`}>
                  {formatCurrencyVND(selectedOrder.grossProfit)}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wider">Biên lợi nhuận gộp</p>
                <p className={`font-bold text-base ${selectedOrder.grossMarginPercent < 20 ? 'text-orange-600' : 'text-slate-800'}`}>
                  {selectedOrder.grossMarginPercent?.toFixed(1)}%
                  {selectedOrder.alerts.includes('MISSING_COST_DATA') && <span className="text-xs text-orange-500 ml-1.5 font-semibold block mt-0.5">Chưa đủ dữ liệu chi phí</span>}
                </p>
              </div>
              <div>
                <p className="text-slate-500 font-medium mb-1.5 text-xs uppercase tracking-wider">Trạng thái</p>
                <p className="font-semibold text-base">
                  {selectedOrder.inferredStatus === 'UNREVIEWED' && <span className="text-slate-600">Chưa review</span>}
                  {selectedOrder.inferredStatus === 'NEEDS_ACTION' && <span className="text-orange-600">Cần xử lý</span>}
                  {selectedOrder.inferredStatus === 'REVIEWED' && <span className="text-emerald-600">Đã review</span>}
                </p>
              </div>
              <div className="col-span-2 mt-1 pt-4 border-t border-slate-200 border-dashed">
                <p className="text-slate-500 font-medium mb-2.5 text-xs uppercase tracking-wider">Cảnh báo</p>
                <div className="flex flex-wrap gap-2">
                  {selectedOrder.alerts.map((a: string) => (
                    <span 
                      key={a} 
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold text-white shadow-sm ${a === 'LOW_MARGIN' || a === 'MISSING_COST_DATA' ? 'bg-rose-500' : a.includes('MISSING') ? 'bg-orange-500' : 'bg-amber-500'}`}
                    >
                      {ALERT_LABELS[a] || a}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="block text-sm font-bold text-slate-700 mb-2">Ghi chú nội bộ</label>
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all resize-none shadow-sm"
                rows={3}
                placeholder="Nhập ghi chú nội bộ cho lần review này..."
              />
            </div>

            {updateError && (
              <div className="mb-5 text-rose-600 text-sm font-medium bg-rose-50 p-3.5 rounded-xl border border-rose-100 flex items-center gap-2.5">
                <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                {updateError}
              </div>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedOrder(null)}
                className="px-5 py-2.5 border-2 border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all"
                disabled={isPending}
              >
                Hủy
              </button>
              <button
                onClick={() => handleAction('REQUEST_ACTION')}
                className="px-5 py-2.5 bg-orange-500 text-white font-bold rounded-xl hover:bg-orange-600 shadow-sm shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0"
                disabled={isPending || !note.trim()}
                title={!note.trim() ? "Vui lòng nhập ghi chú khi yêu cầu xử lý." : ""}
              >
                Yêu cầu xử lý
              </button>
              <button
                onClick={() => handleAction('MARK_REVIEWED')}
                className="px-5 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 transition-all hover:-translate-y-0.5 active:translate-y-0"
                disabled={isPending}
              >
                Đánh dấu đã review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
