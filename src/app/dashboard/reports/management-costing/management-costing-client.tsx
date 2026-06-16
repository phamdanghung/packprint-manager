'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ManagementCostReportResponse, ReportPeriodType } from '@/lib/management-cost-report-actions';
import { AlertCircle, Calendar, DollarSign, TrendingDown, Info, AlertTriangle } from 'lucide-react';

export default function ManagementCostingClient({ 
  data, 
  initialPeriodType,
  initialFromDate,
  initialToDate
}: { 
  data: ManagementCostReportResponse;
  initialPeriodType: string;
  initialFromDate?: string;
  initialToDate?: string;
}) {
  const router = useRouter();
  
  const [period, setPeriod] = useState(initialPeriodType);
  const [fromDate, setFromDate] = useState(initialFromDate || '');
  const [toDate, setToDate] = useState(initialToDate || '');

  const applyFilters = () => {
    const params = new URLSearchParams();
    params.set('periodType', period);
    if (period === 'CUSTOM') {
      if (fromDate) params.set('fromDate', fromDate);
      if (toDate) params.set('toDate', toDate);
    }
    router.push(`/dashboard/reports/management-costing?${params.toString()}`);
  };

  const { summary, rows, period: periodData } = data;

  return (
    <div>
      {/* Filters */}
      <div className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 mb-6 flex flex-wrap gap-4 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Kỳ báo cáo</label>
          <select 
            value={period} 
            onChange={(e) => setPeriod(e.target.value)}
            className="border border-slate-300 rounded-md p-2 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
          >
            <option value="WEEK">Tuần này</option>
            <option value="MONTH">Tháng này</option>
            <option value="QUARTER">Quý này</option>
            <option value="YEAR">Năm nay</option>
            <option value="CUSTOM">Tùy chọn ngày</option>
          </select>
        </div>

        {period === 'CUSTOM' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Từ ngày</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className="border border-slate-300 rounded-md p-2 text-sm outline-none" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Đến ngày</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className="border border-slate-300 rounded-md p-2 text-sm outline-none" />
            </div>
          </>
        )}

        <button 
          onClick={applyFilters}
          className="bg-indigo-600 text-white px-4 py-2 rounded-md font-medium text-sm hover:bg-indigo-700 transition-colors"
        >
          Lọc dữ liệu
        </button>
      </div>

      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-bold text-slate-700">Dữ liệu: {periodData.label}</h2>
        <span className="text-sm text-slate-500 bg-slate-100 px-3 py-1 rounded-full">{summary.totalOrders} đơn hàng</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-semibold mb-1">Tổng doanh thu</div>
          <div className="text-2xl font-bold text-slate-800">{summary.totalRevenue.toLocaleString()} đ</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-semibold mb-1">Tổng CP sản xuất</div>
          <div className="text-2xl font-bold text-red-600">{summary.totalActualProductionCost.toLocaleString()} đ</div>
          <div className="text-xs text-slate-500 mt-1">
            Vật tư: {summary.totalActualMaterialCost.toLocaleString()} / Khác: {summary.totalActualAdditionalCost.toLocaleString()}
          </div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-semibold mb-1">Lợi nhuận gộp (Tạm tính)</div>
          <div className="text-2xl font-bold text-emerald-600">{summary.totalGrossProfit.toLocaleString()} đ</div>
        </div>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-slate-500 text-sm font-semibold mb-1">Tỷ suất lợi nhuận (Margin)</div>
          <div className="text-2xl font-bold text-blue-600">{summary.grossMarginPercent.toFixed(2)}%</div>
        </div>
      </div>

      {/* AlertTriangles */}
      {(summary.lowMarginOrderCount > 0 || summary.highProductionCostOrderCount > 0 || summary.missingCostDataOrderCount > 0 || summary.cancelledCostLineOrderCount > 0) && (
        <div className="mb-8 p-4 bg-orange-50 border border-orange-200 rounded-xl">
          <h3 className="font-bold text-orange-800 flex items-center gap-2 mb-3">
            <AlertCircle className="w-5 h-5" />
            Cảnh báo quản trị
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
            {summary.lowMarginOrderCount > 0 && (
              <div className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                <span className="text-orange-700">Margin thấp (&lt;20%)</span>
                <span className="font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">{summary.lowMarginOrderCount}</span>
              </div>
            )}
            {summary.highProductionCostOrderCount > 0 && (
              <div className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                <span className="text-orange-700">CP cao (&gt;80% DT)</span>
                <span className="font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">{summary.highProductionCostOrderCount}</span>
              </div>
            )}
            {summary.missingCostDataOrderCount > 0 && (
              <div className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                <span className="text-orange-700">Thiếu data chi phí</span>
                <span className="font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">{summary.missingCostDataOrderCount}</span>
              </div>
            )}
            {summary.cancelledCostLineOrderCount > 0 && (
              <div className="bg-white p-3 rounded-lg border border-orange-100 flex items-center justify-between">
                <span className="text-orange-700">Có CP đã hủy</span>
                <span className="font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded">{summary.cancelledCostLineOrderCount}</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
              <tr>
                <th className="p-4">Mã ĐH</th>
                <th className="p-4">Khách hàng</th>
                <th className="p-4 text-right">Doanh thu</th>
                <th className="p-4 text-right">Tổng CP SX</th>
                <th className="p-4 text-right">LN Gộp</th>
                <th className="p-4 text-right">Margin</th>
                <th className="p-4 text-center">Cảnh báo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8 text-center text-slate-500">
                    Không có dữ liệu trong khoảng thời gian này.
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.orderId} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-medium text-slate-800">
                    <a href={`/dashboard/orders/${r.orderId}`} className="text-indigo-600 hover:underline">{r.orderCode}</a>
                  </td>
                  <td className="p-4 text-slate-600">{r.customerName}</td>
                  <td className="p-4 text-right font-medium">{r.totalAmount.toLocaleString()} đ</td>
                  <td className="p-4 text-right text-red-600 font-medium">{r.actualProductionCost.toLocaleString()} đ</td>
                  <td className="p-4 text-right text-emerald-600 font-bold">{r.grossProfit.toLocaleString()} đ</td>
                  <td className="p-4 text-right">
                    <span className={`px-2 py-1 rounded-md text-xs font-bold ${r.grossMarginPercent < 20 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-700'}`}>
                      {r.grossMarginPercent.toFixed(1)}%
                    </span>
                  </td>
                  <td className="p-4 text-center">
                    <div className="flex justify-center gap-1">
                      {r.warnings.lowMargin && <span className="w-2 h-2 rounded-full bg-orange-500" title="Margin thấp"></span>}
                      {r.warnings.highProductionCost && <span className="w-2 h-2 rounded-full bg-red-500" title="Chi phí sx cao"></span>}
                      {r.warnings.missingCostData && <span className="w-2 h-2 rounded-full bg-yellow-400" title="Thiếu data CP"></span>}
                      {r.warnings.hasCancelledCostLines && <span className="w-2 h-2 rounded-full bg-slate-400" title="Có CP hủy"></span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
