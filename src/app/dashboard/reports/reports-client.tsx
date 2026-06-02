'use client';

import React, { useState, useEffect } from 'react';
import { 
  BarChart, LineChart, FileSpreadsheet, Download, Calendar, Filter, Users, DollarSign, Wallet, Percent, 
  Package, LayoutDashboard
} from 'lucide-react';
import { 
  getReportOverview, getSalesReport, getDebtReport, getPaymentReport, 
  getProductionReport, getDeliveryReport, getQuoteReport 
} from '@/lib/report-actions';
import { formatCurrencyVND } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function ReportsClient({ currentUser, salesUsers }: { currentUser: any, salesUsers: any[] }) {
  // Filters
  const [timeRange, setTimeRange] = useState('thisMonth');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [salesId, setSalesId] = useState('ALL');
  
  // Data
  const [overview, setOverview] = useState<any>(null);
  const [salesData, setSalesData] = useState<any[]>([]);
  const [debtData, setDebtData] = useState<any[]>([]);
  const [paymentData, setPaymentData] = useState<any>(null);
  const [productionData, setProductionData] = useState<any>(null);
  const [deliveryData, setDeliveryData] = useState<any>(null);
  const [quoteData, setQuoteData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const role = currentUser.role;
  const isAdmin = ['ADMIN', 'MANAGER'].includes(role);
  
  // Tab control
  const availableTabs = [];
  if (isAdmin) {
    availableTabs.push('OVERVIEW', 'SALES', 'DEBT', 'PAYMENT', 'PRODUCTION', 'DELIVERY', 'QUOTE');
  } else if (role === 'SALES') {
    availableTabs.push('SALES', 'DEBT', 'QUOTE');
  } else if (role === 'ACCOUNTANT') {
    availableTabs.push('PAYMENT', 'DEBT');
  } else if (role === 'PRODUCTION') {
    availableTabs.push('PRODUCTION');
  } else if (role === 'DELIVERY') {
    availableTabs.push('DELIVERY');
  }
  
  const [activeTab, setActiveTab] = useState(availableTabs[0] || '');

  const fetchReport = async () => {
    setLoading(true);
    const filters = { timeRange, fromDate, toDate, salesId };
    
    try {
      if (activeTab === 'OVERVIEW' && isAdmin) {
        const res = await getReportOverview(filters);
        if (res.success && res.data) setOverview(res.data);
      } else if (activeTab === 'SALES' && ['ADMIN', 'MANAGER', 'SALES'].includes(role)) {
        const res = await getSalesReport(filters);
        if (res.success && res.data) setSalesData(res.data);
      } else if (activeTab === 'DEBT' && ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'].includes(role)) {
        const res = await getDebtReport(filters);
        if (res.success && res.data) setDebtData(res.data);
      } else if (activeTab === 'PAYMENT' && ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'].includes(role)) {
        const res = await getPaymentReport(filters);
        if (res.success && res.data) setPaymentData(res.data);
      } else if (activeTab === 'PRODUCTION' && ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(role)) {
        const res = await getProductionReport(filters);
        if (res.success && res.data) setProductionData(res.data);
      } else if (activeTab === 'DELIVERY' && ['ADMIN', 'MANAGER', 'DELIVERY'].includes(role)) {
        const res = await getDeliveryReport(filters);
        if (res.success && res.data) setDeliveryData(res.data);
      } else if (activeTab === 'QUOTE' && ['ADMIN', 'MANAGER', 'SALES'].includes(role)) {
        const res = await getQuoteReport(filters);
        if (res.success && res.data) setQuoteData(res.data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReport();
  }, [activeTab, timeRange, salesId]); // fromDate and toDate should trigger via a explicit button if custom

  const handleApplyFilter = () => {
    fetchReport();
  };

  const formatCsvDate = (date: any) => {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const sanitizeExportValue = (val: any): string | number => {
    if (val === null || val === undefined) return '';
    if (typeof val === 'number') return Math.round(val);
    if (val instanceof Date) return formatCsvDate(val);
    if (typeof val === 'object') return ''; // block objects/arrays
    
    const str = String(val);
    if (str.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
      return formatCsvDate(str);
    }
    
    return str;
  };

  const exportXLSX = (data: any[], filename: string) => {
    if (!data || !data.length) {
      alert('Không có dữ liệu để xuất');
      return;
    }
    
    // Map with sanitized values
    const sanitizedData = data.map(row => {
      const newRow: any = {};
      Object.keys(row).forEach(key => {
        newRow[key] = sanitizeExportValue(row[key]);
      });
      return newRow;
    });

    const ws = XLSX.utils.json_to_sheet(sanitizedData);
    
    const colWidths = Object.keys(sanitizedData[0]).map(key => {
      const k = key.toLowerCase();
      if (k.includes('ngày') || k.includes('hạn') || k.includes('thời gian')) return { wch: 18 };
      if (k.includes('khách') || k.includes('tên') || k.includes('người') || k.includes('địa chỉ') || k.includes('ghi chú')) return { wch: 28 };
      if (k.includes('tiền') || k.includes('doanh thu') || k.includes('nợ') || k.includes('mã')) return { wch: 18 };
      return { wch: 15 };
    });
    ws['!cols'] = colWidths;

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Report");
    
    XLSX.writeFile(wb, `${filename}-${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleExport = () => {
    switch (activeTab) {
      case 'SALES':
        const salesMapped = salesData.map(r => ({
          'Mã Sales': r.salesId,
          'Tên Sales': r.salesName,
          'Số khách phụ trách': r.customerCount,
          'Số báo giá': r.quoteCount,
          'Số báo giá chốt': r.convertedQuotes,
          'Số đơn hàng': r.orderCount,
          'Doanh thu': r.revenue,
          'Đã thu': r.collected,
          'Công nợ': r.debt
        }));
        exportXLSX(salesMapped, 'report-sales');
        break;
      case 'DEBT':
        const debtMapped = debtData.map(r => ({
          'Mã khách hàng': r.customerCode,
          'Tên khách hàng': r.customerName,
          'Sales phụ trách': r.salesName,
          'Tổng đơn': r.totalOrders,
          'Tổng phải thu': r.totalAmount,
          'Đã thu': r.paidAmount,
          'Còn nợ': r.debtAmount,
          'Ngày nợ lâu nhất': r.oldestDebt ? formatCsvDate(r.oldestDebt) : ''
        }));
        exportXLSX(debtMapped, 'report-debts');
        break;
      case 'PAYMENT':
        if (paymentData?.list) {
          const paymentMapped = paymentData.list.map((r: any) => ({
            'Mã phiếu thu': r.paymentCode,
            'Mã đơn hàng': r.order?.orderCode || '',
            'Khách hàng': r.customer?.name || '',
            'Phương thức': r.paymentMethod,
            'Trạng thái': r.paymentStatus,
            'Số tiền': r.amount,
            'Ngày tạo': formatCsvDate(r.createdAt),
            'Ngày xác nhận': formatCsvDate(r.updatedAt),
            'Người tạo': r.createdBy?.name || '',
            'Người xác nhận': r.receivedBy?.name || '',
            'Ghi chú': r.notes || ''
          }));
          exportXLSX(paymentMapped, 'report-payments');
        }
        break;
      case 'PRODUCTION':
        if (productionData?.list) {
          const prodMapped = productionData.list.map((r: any) => ({
            'Mã lệnh sản xuất': r.id.split('-')[0],
            'Mã đơn hàng': r.order?.orderCode || '',
            'Khách hàng': r.order?.customer?.name || '',
            'Trạng thái': r.status,
            'Tiến độ': r.progressPercent + '%',
            'Ngày tạo': formatCsvDate(r.createdAt),
            'Hạn xử lý': formatCsvDate(r.dueDate)
          }));
          exportXLSX(prodMapped, 'report-production');
        }
        break;
      case 'DELIVERY':
        if (deliveryData?.list) {
          const deliveryMapped = deliveryData.list.map((r: any) => ({
            'Mã giao hàng': r.id.split('-')[0],
            'Mã đơn hàng': r.order?.orderCode || '',
            'Trạng thái': r.status,
            'Phương thức giao': r.deliveryMethod,
            'Địa chỉ': r.deliveryAddress || '',
            'Người nhận': r.receiverName || '',
            'SĐT': r.receiverPhone || '',
            'COD cần thu': r.deliveryMethod === 'COD' ? (r.order?.debtAmount || 0) : 0,
            'Ngày tạo': formatCsvDate(r.createdAt),
            'Ngày cập nhật': formatCsvDate(r.updatedAt)
          }));
          exportXLSX(deliveryMapped, 'report-delivery');
        }
        break;
      case 'QUOTE':
        if (quoteData?.list) {
          const quoteMapped = quoteData.list.map((r: any) => ({
            'Mã báo giá': r.quoteNumber,
            'Khách hàng': r.customer?.name || '',
            'Sales phụ trách': r.assignedSales?.name || '',
            'Trạng thái': r.status,
            'Tổng tiền': r.totalAmount,
            'Ngày tạo': formatCsvDate(r.createdAt),
            'Đã chuyển đơn': r.status === 'CONVERTED' ? 'Có' : 'Không'
          }));
          exportXLSX(quoteMapped, 'report-quotes');
        }
        break;
      default:
        alert('Vui lòng chọn tab chi tiết để xuất dữ liệu');
    }
  };

  const tabLabels: Record<string, string> = {
    OVERVIEW: 'Tổng quan',
    SALES: 'Doanh số Sales',
    DEBT: 'Công nợ',
    PAYMENT: 'Phiếu thu',
    PRODUCTION: 'Sản xuất',
    DELIVERY: 'Giao hàng',
    QUOTE: 'Báo giá'
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-20">
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart className="h-6 w-6 text-indigo-500" />
            Trung tâm Báo cáo
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Tổng hợp dữ liệu vận hành và tài chính.
          </p>
        </div>
        <button 
          onClick={handleExport}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold rounded-xl transition-colors shadow-sm"
        >
          <FileSpreadsheet className="h-4 w-4" /> Xuất Excel
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap gap-3 items-end">
        <div>
          <label className="block text-xs font-semibold text-slate-500 mb-1">Thời gian</label>
          <select 
            value={timeRange} 
            onChange={e => setTimeRange(e.target.value)}
            className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="today">Hôm nay</option>
            <option value="thisWeek">Tuần này</option>
            <option value="thisMonth">Tháng này</option>
            <option value="lastMonth">Tháng trước</option>
            <option value="custom">Tùy chỉnh</option>
          </select>
        </div>

        {timeRange === 'custom' && (
          <>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Từ ngày</label>
              <input 
                type="date" 
                value={fromDate} 
                onChange={e => setFromDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-500 mb-1">Đến ngày</label>
              <input 
                type="date" 
                value={toDate} 
                onChange={e => setToDate(e.target.value)}
                className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </>
        )}

        {isAdmin && (
          <div>
            <label className="block text-xs font-semibold text-slate-500 mb-1">Sale phụ trách</label>
            <select 
              value={salesId} 
              onChange={e => setSalesId(e.target.value)}
              className="bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả Sales</option>
              {salesUsers.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>
        )}

        {timeRange === 'custom' && (
          <button 
            onClick={handleApplyFilter}
            className="px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-sm font-semibold rounded-xl transition-colors"
          >
            Lọc
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-slate-200 dark:border-slate-800">
        {availableTabs.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${
              activeTab === tab 
                ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' 
                : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            {tabLabels[tab]}
          </button>
        ))}
      </div>

      {/* Main Content Area */}
      {loading ? (
        <div className="p-12 text-center text-slate-500">Đang tải báo cáo...</div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-sm overflow-x-auto">
          
          {/* OVERVIEW */}
          {activeTab === 'OVERVIEW' && overview && isAdmin && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Doanh thu</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{formatCurrencyVND(overview.totalRevenue)}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Đã thu (Confirmed)</p>
                <p className="text-xl font-bold text-emerald-600 mt-1">{formatCurrencyVND(overview.totalCollected)}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Tổng Công nợ tồn</p>
                <p className="text-xl font-bold text-rose-600 mt-1">{formatCurrencyVND(overview.totalDebt)}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Lợi nhuận gộp</p>
                <p className="text-xl font-bold text-indigo-600 mt-1">{formatCurrencyVND(overview.grossProfit)}</p>
                <p className="text-xs text-slate-400 mt-1">Biên lợi nhuận: {overview.profitMargin.toFixed(1)}%</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Đơn hàng</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{overview.orderCount} (Hoàn thành: {overview.completedOrders})</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Đơn còn nợ</p>
                <p className="text-xl font-bold text-amber-600 mt-1">{overview.unpaidOrders}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Báo giá</p>
                <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{overview.totalQuotes}</p>
              </div>
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-700">
                <p className="text-sm font-medium text-slate-500">Tỷ lệ chốt deal</p>
                <p className="text-xl font-bold text-teal-600 mt-1">{overview.conversionRate.toFixed(1)}%</p>
              </div>
            </div>
          )}

          {/* SALES */}
          {activeTab === 'SALES' && (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">Nhân viên Sales</th>
                  <th className="px-4 py-3 font-semibold">Khách phụ trách</th>
                  <th className="px-4 py-3 font-semibold">Tổng báo giá</th>
                  <th className="px-4 py-3 font-semibold">Tỷ lệ chốt</th>
                  <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                  <th className="px-4 py-3 font-semibold">Doanh thu</th>
                  <th className="px-4 py-3 font-semibold">Đã thu</th>
                  <th className="px-4 py-3 font-semibold rounded-tr-lg">Công nợ tồn</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {salesData.length === 0 && <tr><td colSpan={8} className="p-4 text-center text-slate-500">Không có dữ liệu</td></tr>}
                {salesData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-bold">{row.salesName}</td>
                    <td className="px-4 py-3">{row.customerCount}</td>
                    <td className="px-4 py-3">{row.quoteCount}</td>
                    <td className="px-4 py-3 text-teal-600">{row.quoteCount > 0 ? ((row.convertedQuotes/row.quoteCount)*100).toFixed(1) : 0}%</td>
                    <td className="px-4 py-3">{row.orderCount}</td>
                    <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatCurrencyVND(row.revenue)}</td>
                    <td className="px-4 py-3 text-emerald-600">{formatCurrencyVND(row.collected)}</td>
                    <td className="px-4 py-3 text-rose-600 font-semibold">{formatCurrencyVND(row.debt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* DEBT */}
          {activeTab === 'DEBT' && (
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-semibold rounded-tl-lg">Khách hàng</th>
                  <th className="px-4 py-3 font-semibold">Mã KH</th>
                  <th className="px-4 py-3 font-semibold">Sales phụ trách</th>
                  <th className="px-4 py-3 font-semibold">Đơn đang nợ</th>
                  <th className="px-4 py-3 font-semibold">Tổng doanh số</th>
                  <th className="px-4 py-3 font-semibold">Đã thanh toán</th>
                  <th className="px-4 py-3 font-semibold text-rose-600 rounded-tr-lg">Còn nợ (Debt)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {debtData.length === 0 && <tr><td colSpan={7} className="p-4 text-center text-slate-500">Tuyệt vời! Không có công nợ</td></tr>}
                {debtData.map((row, i) => (
                  <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                    <td className="px-4 py-3 font-bold">{row.customerName}</td>
                    <td className="px-4 py-3 text-slate-500">{row.customerCode}</td>
                    <td className="px-4 py-3">{row.salesName}</td>
                    <td className="px-4 py-3">{row.totalOrders} đơn</td>
                    <td className="px-4 py-3">{formatCurrencyVND(row.totalAmount)}</td>
                    <td className="px-4 py-3 text-emerald-600">{formatCurrencyVND(row.paidAmount)}</td>
                    <td className="px-4 py-3 text-rose-600 font-bold">{formatCurrencyVND(row.debtAmount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {/* PAYMENT */}
          {activeTab === 'PAYMENT' && paymentData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500">Đã xác nhận</p>
                  <p className="font-bold text-emerald-600">{formatCurrencyVND(paymentData.kpi.confirmedAmount)}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500">Chờ xác nhận</p>
                  <p className="font-bold text-amber-600">{formatCurrencyVND(paymentData.kpi.pendingAmount)}</p>
                </div>
                <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700">
                  <p className="text-xs text-slate-500">COD chờ thu</p>
                  <p className="font-bold text-indigo-600">{formatCurrencyVND(paymentData.kpi.codPendingAmount)}</p>
                </div>
              </div>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Ngày tạo</th>
                    <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                    <th className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Phương thức</th>
                    <th className="px-4 py-3 font-semibold">Số tiền</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {paymentData.list.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Không có dữ liệu</td></tr>}
                  {paymentData.list.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-4 py-3 text-indigo-600 font-medium">{row.order?.orderCode}</td>
                      <td className="px-4 py-3">{row.customer.name}</td>
                      <td className="px-4 py-3">{row.paymentMethod}</td>
                      <td className="px-4 py-3 font-bold">{formatCurrencyVND(row.amount)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-md ${
                          row.paymentStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                          row.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-slate-100'
                        }`}>{row.paymentStatus}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* PRODUCTION */}
          {activeTab === 'PRODUCTION' && productionData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Tổng lệnh</p>
                  <p className="font-bold">{productionData.kpi.total}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Hoàn thành</p>
                  <p className="font-bold text-emerald-600">{productionData.kpi.completed}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Đang xử lý</p>
                  <p className="font-bold text-blue-600">{productionData.kpi.inProgress}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Rework / Trễ</p>
                  <p className="font-bold text-rose-600">{productionData.kpi.rework} / {productionData.kpi.overdue}</p>
                </div>
              </div>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Lệnh SX</th>
                    <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                    <th className="px-4 py-3 font-semibold">Người xử lý</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg">Tiến độ</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {productionData.list.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Không có dữ liệu</td></tr>}
                  {productionData.list.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-bold">{row.id.split('-')[0]}</td>
                      <td className="px-4 py-3 text-indigo-600 font-medium">{row.order?.orderCode}</td>
                      <td className="px-4 py-3">{row.assignedTo?.name || '---'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-md bg-slate-100">{row.status}</span>
                      </td>
                      <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-4 py-3 text-blue-600 font-medium">{row.progressPercent}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* DELIVERY */}
          {activeTab === 'DELIVERY' && deliveryData && (
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Đã giao</p>
                  <p className="font-bold text-emerald-600">{deliveryData.kpi.completed}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Đang giao</p>
                  <p className="font-bold text-blue-600">{deliveryData.kpi.inTransit}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">Thất bại</p>
                  <p className="font-bold text-rose-600">{deliveryData.kpi.failed}</p>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <p className="text-xs text-slate-500">COD Cần thu chờ giao</p>
                  <p className="font-bold text-indigo-600">{formatCurrencyVND(deliveryData.kpi.codPending)}</p>
                </div>
              </div>
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Lệnh Giao</th>
                    <th className="px-4 py-3 font-semibold">Đơn hàng</th>
                    <th className="px-4 py-3 font-semibold">Shipper</th>
                    <th className="px-4 py-3 font-semibold">Trạng thái</th>
                    <th className="px-4 py-3 font-semibold">COD cần thu</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg">Phương thức</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {deliveryData.list.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Không có dữ liệu</td></tr>}
                  {deliveryData.list.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-bold">{row.id.split('-')[0]}</td>
                      <td className="px-4 py-3 text-indigo-600 font-medium">{row.order?.orderCode}</td>
                      <td className="px-4 py-3">{row.assignedTo?.name || '---'}</td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-1 text-xs rounded-md bg-slate-100">{row.status}</span>
                      </td>
                      <td className="px-4 py-3 text-rose-600 font-bold">{row.deliveryMethod === 'COD' ? formatCurrencyVND(row.order?.debtAmount) : 0}</td>
                      <td className="px-4 py-3">{row.deliveryMethod}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* QUOTE */}
          {activeTab === 'QUOTE' && quoteData && (
             <div className="space-y-6">
             <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <p className="text-xs text-slate-500">Tổng báo giá</p>
                 <p className="font-bold">{quoteData.kpi.total}</p>
               </div>
               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <p className="text-xs text-slate-500">Chuyển thành đơn</p>
                 <p className="font-bold text-emerald-600">{quoteData.kpi.converted}</p>
               </div>
               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <p className="text-xs text-slate-500">Bị từ chối</p>
                 <p className="font-bold text-rose-600">{quoteData.kpi.rejected}</p>
               </div>
               <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                 <p className="text-xs text-slate-500">Tỷ lệ chuyển đổi</p>
                 <p className="font-bold text-indigo-600">{quoteData.kpi.conversionRate.toFixed(1)}%</p>
               </div>
             </div>
             <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold rounded-tl-lg">Mã Báo Giá</th>
                    <th className="px-4 py-3 font-semibold">Khách hàng</th>
                    <th className="px-4 py-3 font-semibold">Sales</th>
                    <th className="px-4 py-3 font-semibold">Tổng tiền</th>
                    <th className="px-4 py-3 font-semibold">Ngày tạo</th>
                    <th className="px-4 py-3 font-semibold rounded-tr-lg">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {quoteData.list.length === 0 && <tr><td colSpan={6} className="p-4 text-center text-slate-500">Không có dữ liệu</td></tr>}
                  {quoteData.list.map((row: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                      <td className="px-4 py-3 font-bold">{row.quoteNumber}</td>
                      <td className="px-4 py-3">{row.customer?.name}</td>
                      <td className="px-4 py-3">{row.assignedSales?.name}</td>
                      <td className="px-4 py-3 font-semibold text-slate-700 dark:text-slate-200">{formatCurrencyVND(row.totalAmount)}</td>
                      <td className="px-4 py-3">{new Date(row.createdAt).toLocaleDateString('vi-VN')}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-1 text-xs rounded-md ${row.status === 'CONVERTED' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'}`}>{row.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
           </div>
          )}
          
        </div>
      )}
    </div>
  );
}
