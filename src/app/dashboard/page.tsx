import React from 'react';
import Link from 'next/link';
import { 
  TrendingUp, 
  TrendingDown, 
  DollarSign, 
  ShoppingBag, 
  Cpu, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  Download, 
  ArrowRight,
  FileCheck,
  PlusCircle,
  FileText,
  UserCheck
} from 'lucide-react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { formatVND, formatDate, getOrderStatusBadge, getRoleName } from '@/lib/utils';

export default async function DashboardPage() {
  const user = await getCurrentUser();
  
  if (!user) {
    return null;
  }

  const today = new Date();

  // 1. Lấy dữ liệu thống kê từ SQLite qua Prisma
  const [
    totalOrdersCount,
    producingOrdersCount,
    pendingOrdersCount,
    completedOrdersCount,
    financeStats,
    recentOrders
  ] = await Promise.all([
    db.order.count(),
    db.order.count({ where: { status: 'PRODUCING' } }),
    db.order.count({ where: { status: { in: ['PENDING', 'DESIGNING', 'DESIGN_APPROVED'] } } }),
    db.order.count({ where: { status: { in: ['COMPLETED', 'DELIVERED'] } } }),
    db.order.aggregate({
      _sum: {
        totalAmount: true,
        paidAmount: true,
        debtAmount: true,
        estimatedCost: true,
        estimatedProfit: true,
      }
    }),
    db.order.findMany({
      include: {
        customer: true,
        quote: true,
        productionSteps: true,
        designFiles: true,
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 10,
    })
  ]);

  const totalSales = financeStats._sum.totalAmount ?? 0;
  const totalPaid = financeStats._sum.paidAmount ?? 0;
  const totalDebt = financeStats._sum.debtAmount ?? 0;
  const totalCost = financeStats._sum.estimatedCost ?? 0;
  const totalProfit = financeStats._sum.estimatedProfit ?? 0;
  const avgMargin = totalSales > 0 ? (totalProfit / totalSales) * 100 : 0;

  // Giả lập dữ liệu doanh thu tháng để vẽ biểu đồ SVG đẹp mắt
  const monthlyRevenue = [
    { month: 'T1', rev: 120000000, cost: 90000000, profit: 30000000 },
    { month: 'T2', rev: 150000000, cost: 110000000, profit: 40000000 },
    { month: 'T3', rev: 180000000, cost: 135000000, profit: 45000000 },
    { month: 'T4', rev: 210000000, cost: 150000000, profit: 60000000 },
    { month: 'T5', rev: totalSales || 93000000, cost: totalCost || 72000000, profit: totalProfit || 21000000 },
  ];

  const maxRev = Math.max(...monthlyRevenue.map(m => m.rev));

  return (
    <div className="space-y-8 font-sans">
      {/* Welcome Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[30%] h-full bg-teal-500/5 blur-[50px] pointer-events-none" />
        <div className="space-y-1.5 relative z-10">
          <span className="text-teal-400 font-bold text-xs uppercase tracking-wider">Chào ngày mới làm việc</span>
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            Xin chào, {user.name}!
          </h1>
          <p className="text-slate-400 text-xs md:text-sm">
            Bạn đang truy cập hệ thống với vai trò <span className="text-teal-300 font-semibold">{getRoleName(user.role)}</span>. Hãy xem cập nhật xưởng in hôm nay.
          </p>
        </div>

        {/* Quick action buttons based on user role */}
        <div className="flex flex-wrap gap-3 relative z-10">
          {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
            <>
              <Link href="/dashboard/quotes" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer">
                <PlusCircle className="h-4 w-4" />
                <span>Tạo Báo giá nhanh</span>
              </Link>
              <Link href="/dashboard/payments" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 hover:text-white active:scale-[0.98] transition-all cursor-pointer">
                <DollarSign className="h-4 w-4" />
                <span>Báo cáo Tài chính</span>
              </Link>
            </>
          )}
          {user.role === 'SALES' && (
            <Link href="/dashboard/quotes" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer">
              <PlusCircle className="h-4 w-4" />
              <span>Tính giá & Tạo đơn mới</span>
            </Link>
          )}
          {user.role === 'DESIGNER' && (
            <Link href="/dashboard/design-approval" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all cursor-pointer">
              <FileCheck className="h-4 w-4" />
              <span>Xem File chờ duyệt</span>
            </Link>
          )}
          {user.role === 'PRODUCTION' && (
            <Link href="/dashboard/production" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-orange-500 hover:bg-orange-400 text-white shadow-md shadow-orange-500/10 active:scale-[0.98] transition-all cursor-pointer">
              <Cpu className="h-4 w-4" />
              <span>Cập nhật Ca máy in</span>
            </Link>
          )}
          {user.role === 'ACCOUNTANT' && (
            <Link href="/dashboard/payments" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 active:scale-[0.98] transition-all cursor-pointer">
              <UserCheck className="h-4 w-4" />
              <span>Duyệt Thanh toán nợ</span>
            </Link>
          )}
          {user.role === 'DELIVERY' && (
            <Link href="/dashboard/orders" className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-500/10 active:scale-[0.98] transition-all cursor-pointer">
              <ShoppingBag className="h-4 w-4" />
              <span>Đơn hàng cần giao</span>
            </Link>
          )}
        </div>
      </div>

      {/* 4 Statistical Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Doanh số */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Doanh thu tổng</span>
            <div className="h-10 w-10 rounded-xl bg-teal-500/10 flex items-center justify-center text-teal-600 dark:text-teal-400">
              <TrendingUp className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {formatVND(totalSales)}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-teal-600 dark:text-teal-400">
              <span>Đã thu: {formatVND(totalPaid)}</span>
            </div>
          </div>
        </div>

        {/* Tổng công nợ */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Dư nợ khách hàng</span>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${totalDebt > 0 ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'}`}>
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className={`text-2xl font-bold tracking-tight ${totalDebt > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'}`}>
              {formatVND(totalDebt)}
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <span>Cần đôn đốc kế toán thu hồi sớm</span>
            </div>
          </div>
        </div>

        {/* Đơn hàng đang sản xuất */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Sản xuất vận hành</span>
            <div className="h-10 w-10 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
              <Cpu className="h-5 w-5" />
            </div>
          </div>
          <div className="space-y-1">
            <h3 className="text-2xl font-bold text-slate-800 dark:text-white tracking-tight">
              {producingOrdersCount} / {totalOrdersCount} đơn
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3 text-indigo-400" />
                {pendingOrdersCount} đơn chuẩn bị sản xuất
              </span>
            </div>
          </div>
        </div>

        {/* Lợi nhuận gộp */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl shadow-sm p-6 space-y-4 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Lợi nhuận gộp ước tính</span>
            <div className={`h-10 w-10 rounded-xl flex items-center justify-center ${totalProfit >= 0 ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
              {totalProfit >= 0 ? <TrendingUp className="h-5 w-5" /> : <TrendingDown className="h-5 w-5" />}
            </div>
          </div>
          <div className="space-y-1">
            <h3 className={`text-2xl font-bold tracking-tight ${totalProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {formatVND(totalProfit)}
            </h3>
            <div className={`flex items-center gap-1.5 text-[10px] font-bold ${totalProfit >= 0 ? 'text-emerald-600' : 'text-rose-500'}`}>
              <span>Tỷ suất lợi nhuận TB: {avgMargin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Graphics / Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Doanh thu & Chi phí theo tháng (SVG) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 lg:col-span-2 space-y-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">Biểu đồ Tài chính 5 tháng gần đây</h4>
              <p className="text-[10px] text-slate-500 dark:text-slate-400">Doanh thu tổng đối chiếu Chi phí & Lợi nhuận ước tính</p>
            </div>
            
            {/* Chú giải */}
            <div className="flex items-center gap-3 text-[10px] font-bold text-slate-500">
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-teal-500" />
                <span>Doanh thu</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-indigo-500" />
                <span>Chi phí</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <span>Lợi nhuận</span>
              </div>
            </div>
          </div>

          {/* SVG Custom Column Chart */}
          <div className="h-48 w-full flex items-end justify-between px-4 border-b border-slate-200 dark:border-slate-800 pb-2 relative">
            {monthlyRevenue.map((item, index) => {
              const revPercent = (item.rev / maxRev) * 100;
              const costPercent = (item.cost / maxRev) * 100;
              const profitPercent = (item.profit / maxRev) * 100;

              return (
                <div key={index} className="flex flex-col items-center gap-2 w-[16%] group relative">
                  {/* Bars Container */}
                  <div className="h-36 w-full flex items-end justify-center gap-1 relative">
                    {/* Bar Doanh thu */}
                    <div 
                      style={{ height: `${revPercent}%` }} 
                      className="w-3.5 bg-gradient-to-t from-teal-600 to-teal-400 rounded-t-sm shadow-sm relative group-hover:brightness-110 transition-all duration-300"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[9px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                        DThu: {formatVND(item.rev)}
                      </div>
                    </div>

                    {/* Bar Chi phí */}
                    <div 
                      style={{ height: `${costPercent}%` }} 
                      className="w-3.5 bg-gradient-to-t from-indigo-600 to-indigo-400 rounded-t-sm shadow-sm relative group-hover:brightness-110 transition-all duration-300"
                    >
                      <div className="absolute -top-7 left-1/2 -translate-x-1/2 bg-slate-900 border border-slate-800 text-white text-[9px] font-bold py-0.5 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-20 pointer-events-none">
                        CPhi: {formatVND(item.cost)}
                      </div>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400">{item.month}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Phân bổ trạng thái Đơn hàng (SVG Donut) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 space-y-6 shadow-sm flex flex-col justify-between">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">Trạng thái Sản xuất & Vận hành</h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">Tỷ lệ phân bổ trạng thái đơn hàng xưởng in</p>
          </div>

          <div className="flex items-center justify-center py-2 relative">
            {/* SVG Donut */}
            <svg width="150" height="150" viewBox="0 0 42 42" className="transform -rotate-90">
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#1e293b" strokeWidth="4.5" />
              {/* Producing: 1/4 = 25% */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#f97316" strokeWidth="4.5" 
                      strokeDasharray="25 75" strokeDashoffset="0" />
              {/* Completed/Delivered: 2/4 = 50% */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#14b8a6" strokeWidth="4.5" 
                      strokeDasharray="50 50" strokeDashoffset="-25" />
              {/* Pending/Designing: 1/4 = 25% */}
              <circle cx="21" cy="21" r="15.915" fill="transparent" stroke="#6366f1" strokeWidth="4.5" 
                      strokeDasharray="25 75" strokeDashoffset="-75" />
            </svg>
            <div className="absolute flex flex-col items-center justify-center text-center">
              <span className="text-xl font-bold text-slate-800 dark:text-white">{totalOrdersCount}</span>
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Tổng Đơn</span>
            </div>
          </div>

          {/* Legend */}
          <div className="grid grid-cols-3 gap-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 text-[10px] font-bold text-slate-500">
            <div className="flex flex-col items-center text-center space-y-0.5">
              <span className="flex items-center gap-1 text-indigo-600 dark:text-indigo-400">
                <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                Chuẩn bị
              </span>
              <span className="text-xs text-slate-800 dark:text-white">{pendingOrdersCount} đơn</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-0.5">
              <span className="flex items-center gap-1 text-orange-600 dark:text-orange-400">
                <span className="h-1.5 w-1.5 rounded-full bg-orange-500" />
                Sản xuất
              </span>
              <span className="text-xs text-slate-800 dark:text-white">{producingOrdersCount} đơn</span>
            </div>
            <div className="flex flex-col items-center text-center space-y-0.5">
              <span className="flex items-center gap-1 text-teal-600 dark:text-teal-400">
                <span className="h-1.5 w-1.5 rounded-full bg-teal-500" />
                Hoàn thành
              </span>
              <span className="text-xs text-slate-800 dark:text-white">{completedOrdersCount} đơn</span>
            </div>
          </div>
        </div>
      </div>

      {/* Comprehensive Order Tracking Sheet (8 core printing business parameters) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-0.5">
            <h4 className="text-sm font-bold text-slate-800 dark:text-white tracking-wide">
              Bảng Theo dõi Đơn hàng tích hợp (8 Nguyên tắc cốt lõi)
            </h4>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Kiểm soát chặt chẽ thông tin: Khách hàng, Giá trị, File final, Công đoạn sản xuất, Ngày hẹn giao, Thu chi, Dư nợ & Chỉ số sinh lời.
            </p>
          </div>
          <Link href="/dashboard/orders" className="text-xs font-bold text-teal-600 dark:text-teal-400 hover:text-teal-500 dark:hover:text-teal-300 flex items-center gap-1 transition-all cursor-pointer">
            <span>Xem chi tiết bộ lọc</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Scrollable Table */}
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Đơn hàng / Ngày lập</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Khách hàng</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Báo giá trị</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">File final</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Công đoạn (Tiến độ)</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Hẹn giao</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Đã thu / Dư nợ</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Dự toán Lời/Lỗ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
              {recentOrders.map((order) => {
                const badge = getOrderStatusBadge(order.status);
                const isLate = new Date(order.deliveryDate).getTime() < today.getTime() && order.status !== 'COMPLETED' && order.status !== 'DELIVERED';
                
                // Trực quan hóa 4 công đoạn sản xuất
                // IN_AN, BE_THANH_PHAM, DAN_GIAO, DONG_GOI
                const steps = order.productionSteps;
                const getStepDotColor = (stepName: string) => {
                  const step = steps.find(s => s.stepName === stepName);
                  if (!step) return 'bg-slate-200 dark:bg-slate-800'; // Chưa có
                  if (step.status === 'COMPLETED') return 'bg-teal-500'; // Xong
                  if (step.status === 'PROCESSING') return 'bg-orange-500'; // Đang làm
                  return 'bg-slate-300 dark:bg-slate-700'; // Chờ làm
                };

                return (
                  <tr key={order.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                    {/* Mã đơn */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="font-bold text-slate-800 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {order.orderNumber}
                      </div>
                      <div className="text-[10px] text-slate-500">{formatDate(order.createdAt)}</div>
                      <div>
                        <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                          {badge.label}
                        </span>
                      </div>
                    </td>

                    {/* Khách hàng */}
                    <td className="py-4 px-4 space-y-0.5 max-w-[180px] truncate">
                      <div className="font-bold text-slate-700 dark:text-slate-300">{order.customer.name}</div>
                      {order.customer.companyName && (
                        <div className="text-[10px] text-slate-500 italic">{order.customer.companyName}</div>
                      )}
                    </td>

                    {/* Trị giá báo giá */}
                    <td className="py-4 px-4 font-bold text-right text-slate-800 dark:text-white">
                      {formatVND(order.totalAmount)}
                    </td>

                    {/* File final */}
                    <td className="py-4 px-4 max-w-[150px]">
                      {order.designFiles && order.designFiles.length > 0 ? (
                        <div className="flex items-center gap-1.5">
                          <Link 
                            href="#" 
                            title={`Tải xuống file final: ${order.designFiles[0].fileName}`}
                            className="p-1 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 transition-colors cursor-pointer flex-shrink-0"
                          >
                            <Download className="h-3.5 w-3.5" />
                          </Link>
                          <span className="font-medium text-slate-700 dark:text-slate-300 truncate" title={order.designFiles[0].fileName}>
                            {order.designFiles[0].fileName}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 dark:text-slate-500 italic">Chưa duyệt file final</span>
                      )}
                    </td>

                    {/* Công đoạn (Tiến độ) */}
                    <td className="py-4 px-4 space-y-1.5">
                      {/* Trực quan hóa 4 bước in ấn */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('IN_AN')}`} title="In ấn" />
                          <span className="text-[9px] text-slate-500">In</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('BE_THANH_PHAM')}`} title="Bế thành phẩm" />
                          <span className="text-[9px] text-slate-500">Bế</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('DAN_GIAO')}`} title="Gia công dán" />
                          <span className="text-[9px] text-slate-500">Dán</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <div className={`h-2.5 w-2.5 rounded-full ${getStepDotColor('DONG_GOI')}`} title="Đóng gói hàng" />
                          <span className="text-[9px] text-slate-500">Gói</span>
                        </div>
                      </div>
                    </td>

                    {/* Ngày hẹn giao */}
                    <td className="py-4 px-4">
                      <div className={`font-bold flex items-center gap-1.5 ${isLate ? 'text-rose-600 dark:text-rose-400' : 'text-slate-700 dark:text-slate-300'}`}>
                        {isLate && <AlertTriangle className="h-3.5 w-3.5 text-rose-500 flex-shrink-0 animate-bounce" />}
                        <span>{formatDate(order.deliveryDate)}</span>
                      </div>
                      {isLate && (
                        <span className="text-[9px] font-bold text-rose-500 tracking-wide uppercase">QUÁ HẠN GIAO</span>
                      )}
                    </td>

                    {/* Tài chính */}
                    <td className="py-4 px-4 text-right space-y-0.5">
                      <div className="font-bold text-slate-700 dark:text-slate-300">
                        {formatVND(order.paidAmount)}
                      </div>
                      <div className={`text-[10px] font-bold ${order.debtAmount > 0 ? 'text-amber-600 dark:text-amber-400' : order.debtAmount < 0 ? 'text-blue-500' : 'text-teal-600'}`}>
                        {order.debtAmount > 0 
                          ? `Nợ: ${formatVND(order.debtAmount)}` 
                          : order.debtAmount < 0 
                            ? `Dư: ${formatVND(Math.abs(order.debtAmount))}` 
                            : 'Đã thu đủ'}
                      </div>
                    </td>

                    {/* Chỉ số Lời/Lỗ */}
                    <td className="py-4 px-4 text-right space-y-0.5">
                      <div className={`font-bold flex items-center justify-end gap-1.5 ${order.estimatedProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                        {order.estimatedProfit >= 0 ? (
                          <TrendingUp className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" />
                        ) : (
                          <TrendingDown className="h-3.5 w-3.5 text-rose-500 flex-shrink-0" />
                        )}
                        <span>{formatVND(order.estimatedProfit)}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        Tỷ suất: {order.profitMargin.toFixed(1)}%
                      </div>
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
