'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  TrendingUp, TrendingDown, DollarSign, CreditCard, Wallet, 
  Briefcase, Truck, FileText, AlertTriangle, Clock, ArrowRight,
  Package, Printer, CheckCircle
} from 'lucide-react';
import { formatCurrencyVND, formatDate, getOrderStatusBadge, getProductionStatusBadge, getPaymentStatusBadge } from '@/lib/utils';

export default function DashboardClient({ initialData, currentTimeRange }: any) {
  const router = useRouter();
  const [timeRange, setTimeRange] = useState(currentTimeRange);

  const handleTimeRangeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setTimeRange(val);
    router.push(`/dashboard?timeRange=${val}`);
  };

  const { role, finance, pipeline, revenueChart, lists, alerts } = initialData;

  const isManagement = ['ADMIN', 'MANAGER'].includes(role);
  const isSales = role === 'SALES';
  const isAccountant = role === 'ACCOUNTANT';
  const isProduction = role === 'PRODUCTION';
  const isDelivery = role === 'DELIVERY';
  const isDesigner = role === 'DESIGNER';
  
  const canViewFinancials = isManagement || isAccountant || isSales;

  return (
    <div className="space-y-6">
      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard Tổng quan</h1>
          <p className="text-slate-500 text-sm mt-1">
            {isManagement ? 'Tình hình vận hành & tài chính toàn công ty' : 
             isSales ? 'Tổng quan doanh số cá nhân' : 
             isAccountant ? 'Tổng quan công nợ & dòng tiền' : 
             isProduction ? 'Theo dõi tiến độ sản xuất' : 
             isDelivery ? 'Theo dõi giao hàng' : 'File thiết kế chờ xử lý'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={timeRange} 
            onChange={handleTimeRangeChange}
            className="px-4 py-2 bg-slate-50 border border-slate-200 dark:bg-slate-800 dark:border-slate-700 rounded-lg text-sm font-medium focus:ring-2 focus:ring-teal-500"
          >
            <option value="today">Hôm nay</option>
            <option value="7days">7 ngày qua</option>
            <option value="thisMonth">Tháng này</option>
            <option value="lastMonth">Tháng trước</option>
          </select>
        </div>
      </div>

      {/* FINANCE KPIs */}
      {finance && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {(isManagement || isSales) && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign className="w-5 h-5" /></div>
                <span className="text-sm font-medium text-slate-500">Doanh thu</span>
              </div>
              <div className="text-2xl font-bold text-slate-800 dark:text-white">{formatCurrencyVND(finance.revenue)}</div>
            </div>
          )}
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-emerald-50 text-emerald-600 rounded-lg"><Wallet className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-slate-500">Đã thu (Confirmed)</span>
            </div>
            <div className="text-2xl font-bold text-emerald-600">{formatCurrencyVND(finance.collected)}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 bg-rose-50 text-rose-600 rounded-lg"><CreditCard className="w-5 h-5" /></div>
              <span className="text-sm font-medium text-slate-500">Tổng công nợ</span>
            </div>
            <div className="text-2xl font-bold text-rose-600">{formatCurrencyVND(finance.debt)}</div>
          </div>
          {finance.grossProfit !== null && (
            <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2 bg-teal-50 text-teal-600 rounded-lg"><TrendingUp className="w-5 h-5" /></div>
                <span className="text-sm font-medium text-slate-500">Lợi nhuận gộp</span>
              </div>
              <div className="text-2xl font-bold text-teal-600">{formatCurrencyVND(finance.grossProfit)}</div>
            </div>
          )}
        </div>
      )}

      {/* ACCOUNTANT STATS */}
      {initialData.accountantStats && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-slate-500 font-medium">Khách đang nợ</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{initialData.accountantStats.debtorsCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-slate-500 font-medium">Đơn chưa thanh toán</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{initialData.accountantStats.unpaidOrdersCount}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 p-4 rounded-xl shadow-sm border border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <div className="text-slate-500 font-medium">Đơn xong còn nợ</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white">{initialData.accountantStats.completedDebtOrdersCount}</div>
          </div>
        </div>
      )}

      {/* CHARTS */}
      {(isManagement || isSales) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Chart */}
          {revenueChart && (
            <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col w-full overflow-hidden">
              <h3 className="font-bold text-slate-800 dark:text-white mb-6 shrink-0">Biểu đồ doanh thu</h3>
              {revenueChart.every((d: any) => d.amount === 0) ? (
                <div className="h-64 flex items-center justify-center text-slate-400 italic">Chưa có dữ liệu phát sinh</div>
              ) : (
                <div className="w-full overflow-x-auto custom-scrollbar pb-2">
                  <div className="h-64 flex items-end gap-1 sm:gap-2 min-w-[500px] px-1">
                    {revenueChart.map((d: any, i: number) => {
                      const max = Math.max(...revenueChart.map((r: any) => r.amount)) || 1;
                      const height = `${(d.amount / max) * 100}%`;
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-1 sm:gap-2 group relative h-full justify-end">
                          <div className="absolute -top-8 opacity-0 group-hover:opacity-100 bg-slate-800 text-white text-[10px] py-1 px-2 rounded pointer-events-none transition-opacity whitespace-nowrap z-10 hidden sm:block">
                            {formatCurrencyVND(d.amount)}
                          </div>
                          <div className="w-full bg-blue-100 dark:bg-blue-900/30 rounded-t-sm flex items-end relative overflow-hidden" style={{ height: 'calc(100% - 20px)' }}>
                            <div 
                              className="w-full bg-blue-500 dark:bg-blue-500/80 rounded-t-sm transition-all duration-500" 
                              style={{ height: d.amount === 0 ? '2px' : height }}
                            />
                          </div>
                          <div className="text-[8px] sm:text-[10px] text-slate-500 truncate w-full text-center">
                            {d.date.split('-')[2]}/{d.date.split('-')[1]}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Pipeline */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-800">
            <h3 className="font-bold text-slate-800 dark:text-white mb-6">Pipeline đơn hàng</h3>
            {pipeline.length === 0 ? (
              <div className="flex items-center justify-center h-48 text-slate-400 italic">Chưa có dữ liệu</div>
            ) : (
              <div className="space-y-4">
                {pipeline.map((p: any, i: number) => {
                  const total = pipeline.reduce((sum: number, item: any) => sum + item.count, 0);
                  const width = `${(p.count / total) * 100}%`;
                  const badge = getOrderStatusBadge(p.status);
                  return (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{badge.label}</span>
                        <span className="font-bold text-slate-800 dark:text-white">{p.count} đơn</span>
                      </div>
                      <div className="h-2 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-teal-500 rounded-full" style={{ width }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WARNING ALERTS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {(isManagement || isAccountant || isSales) && alerts.pendingPayments > 0 && (
          <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-8 h-8 text-amber-500" />
              <div>
                <div className="text-amber-800 dark:text-amber-300 font-bold">Phiếu thu chờ xác nhận</div>
                <div className="text-sm text-amber-600 dark:text-amber-400">Cần kế toán duyệt</div>
              </div>
            </div>
            <div className="text-2xl font-black text-amber-600">{alerts.pendingPayments}</div>
          </div>
        )}
        {(isManagement || isProduction) && alerts.production > 0 && (
          <div className="bg-rose-50 dark:bg-rose-900/20 border border-rose-200 dark:border-rose-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Printer className="w-8 h-8 text-rose-500" />
              <div>
                <div className="text-rose-800 dark:text-rose-300 font-bold">Sản xuất lỗi / Trễ hạn</div>
                <div className="text-sm text-rose-600 dark:text-rose-400">Cần xử lý ngay</div>
              </div>
            </div>
            <div className="text-2xl font-black text-rose-600">{alerts.production}</div>
          </div>
        )}
        {(isManagement || isDelivery) && alerts.delivery > 0 && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Truck className="w-8 h-8 text-red-500" />
              <div>
                <div className="text-red-800 dark:text-red-300 font-bold">Giao hàng thất bại</div>
                <div className="text-sm text-red-600 dark:text-red-400">Cần liên hệ lại khách</div>
              </div>
            </div>
            <div className="text-2xl font-black text-red-600">{alerts.delivery}</div>
          </div>
        )}
      </div>

      {/* TABLES */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Debtors */}
        {(!isProduction && !isDelivery && !isDesigner) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" />
                Top khách nợ cao
              </h3>
              <Link href="/dashboard/debts" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              {lists.topDebtors.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">Không có khách nợ.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3 text-right">Tổng nợ</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {lists.topDebtors.map((c: any) => (
                      <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/customers/${c.id}`} className="font-medium text-slate-800 dark:text-slate-200 hover:text-teal-600">
                            {c.name}
                          </Link>
                          <div className="text-[10px] text-slate-500">{c.phone}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-rose-600">
                          {formatCurrencyVND(c.debtBalance)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Recent Payments */}
        {(!isProduction && !isDelivery && !isDesigner) && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-emerald-500" />
                Phiếu thu gần đây
              </h3>
              <Link href="/dashboard/payments" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              {lists.recentPayments.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">Chưa có phiếu thu nào.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã PT / Khách</th>
                      <th className="px-4 py-3 text-right">Số tiền</th>
                      <th className="px-4 py-3 text-center">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {lists.recentPayments.map((p: any) => {
                      const badge = getPaymentStatusBadge(p.paymentStatus);
                      return (
                      <tr key={p.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/orders/${p.orderId}`} className="font-bold text-teal-600 hover:underline">
                            {p.paymentCode}
                          </Link>
                          <div className="text-[10px] text-slate-500 truncate max-w-[120px]">{p.customer.name}</div>
                        </td>
                        <td className="px-4 py-3 text-right font-bold text-emerald-600 whitespace-nowrap">
                          {formatCurrencyVND(p.amount)}
                        </td>
                        <td className="px-4 py-3 text-center whitespace-nowrap">
                          <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Production Jobs */}
        {(isManagement || isProduction) && lists.productionJobs && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Printer className="w-4 h-4 text-blue-500" />
                Sản xuất cần chú ý
              </h3>
              <Link href="/dashboard/production" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Đến xưởng <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              {lists.productionJobs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">Không có lệnh sản xuất.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã Lệnh</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      <th className="px-4 py-3">Hạn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {lists.productionJobs.map((j: any) => {
                      const badge = getProductionStatusBadge(j.status);
                      return (
                      <tr key={j.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/production/${j.id}`} className="font-bold text-teal-600 hover:underline">
                            {j.jobCode}
                          </Link>
                          <div className="text-[10px] text-slate-500">{j.order.customer.name}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                           <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${badge.bg} ${badge.text}`}>
                            {badge.label}
                          </span>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          {j.dueDate ? formatDate(j.dueDate) : '-'}
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Delivery Jobs */}
        {(isManagement || isDelivery) && lists.deliveryJobs && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <Truck className="w-4 h-4 text-purple-500" />
                Giao hàng / Chờ giao
              </h3>
              <Link href="/dashboard/delivery" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Phòng giao nhận <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              {lists.deliveryJobs.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">Không có đơn giao.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã Giao</th>
                      <th className="px-4 py-3">Trạng thái</th>
                      {canViewFinancials && <th className="px-4 py-3 text-right">Cần thu (COD)</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {lists.deliveryJobs.map((o: any) => {
                      const displayStatus = o.deliveryJob?.status || o.deliveryStatus || o.status;
                      const displayCode = o.deliveryJob?.deliveryCode || o.orderCode;
                      return (
                        <tr key={o.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-3">
                            <Link href={`/dashboard/delivery/${o.deliveryJob ? o.deliveryJob.id : o.id}`} className="font-bold text-teal-600 hover:underline">
                              {displayCode}
                            </Link>
                            <div className="text-[10px] text-slate-500">{o.customer.name}</div>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              displayStatus === 'FAILED' ? 'bg-rose-100 text-rose-700' :
                              displayStatus === 'DELIVERING' ? 'bg-sky-100 text-sky-700' : 'bg-slate-100 text-slate-700'
                            }`}>
                              {displayStatus === 'READY_FOR_DELIVERY' ? 'Chờ giao' : displayStatus === 'FAILED' ? 'Thất bại' : displayStatus === 'DELIVERING' ? 'Đang giao' : displayStatus}
                            </span>
                          </td>
                          {canViewFinancials && (
                            <td className="px-4 py-3 text-right font-bold text-rose-600 whitespace-nowrap">
                              {o.debtAmount > 0 ? formatCurrencyVND(o.debtAmount) : '-'}
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Design Files */}
        {(isManagement || isDesigner || isSales) && lists.designFiles && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                File thiết kế
              </h3>
              <Link href="/dashboard/design-files" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Phòng thiết kế <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              {lists.designFiles?.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">Không có file cần xử lý.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">File / Khách hàng</th>
                      <th className="px-4 py-3">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {lists.designFiles?.map((f: any) => {
                      const displayStatus = f.status === 'REJECTED' ? 'Từ chối' : f.status === 'PENDING' ? 'Chờ xử lý' : f.status === 'APPROVED' ? 'Đã duyệt' : f.status;
                      return (
                      <tr key={f.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/design-files`} className="font-bold text-teal-600 hover:underline">
                            {f.fileCode}
                          </Link>
                          <div className="text-[10px] text-slate-500 truncate max-w-[150px]">{f.fileName}</div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap">
                           <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                            f.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                            f.status === 'PENDING' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {displayStatus}
                          </span>
                        </td>
                      </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* Quotes */}
        {(isSales || isManagement) && lists.recentQuotes && (
          <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50 dark:bg-slate-800/50">
              <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <FileText className="w-4 h-4 text-sky-500" />
                Báo giá gần đây
              </h3>
              <Link href="/dashboard/quotes" className="text-xs font-medium text-teal-600 hover:text-teal-700 flex items-center gap-1">
                Xem tất cả <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 overflow-auto">
              {lists.recentQuotes.length === 0 ? (
                <div className="p-6 text-center text-slate-400 text-sm italic">Không có báo giá.</div>
              ) : (
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-50/50 dark:bg-slate-800/30 text-xs text-slate-500">
                    <tr>
                      <th className="px-4 py-3">Mã BQ</th>
                      <th className="px-4 py-3">Khách hàng</th>
                      <th className="px-4 py-3 text-right">Tổng tiền</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {lists.recentQuotes.map((q: any) => (
                      <tr key={q.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-3">
                          <Link href={`/dashboard/quotes/${q.id}`} className="font-bold text-teal-600 hover:underline">
                            {q.quoteNumber}
                          </Link>
                        </td>
                        <td className="px-4 py-3 text-sm">{q.customer.name}</td>
                        <td className="px-4 py-3 text-right font-bold text-slate-700">
                          {formatCurrencyVND(q.totalAmount)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
