'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  ShoppingBag, 
  FileCheck, 
  Cpu, 
  DollarSign, 
  Sliders, 
  Printer,
  Truck,
  ChevronRight,
  Bell,
  BarChart,
  Settings,
  Package
} from 'lucide-react';
import { UserSession } from '@/lib/auth';

interface SidebarProps {
  user: UserSession;
  pendingTaskCount?: number;
}

interface MenuItem {
  name: string;
  href: string;
  icon: React.ComponentType<any>;
  roles: string[]; // Các role được phép thấy menu này
}

const MENU_ITEMS: MenuItem[] = [
  { name: 'Dashboard Tổng quan', href: '/dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'ACCOUNTANT', 'DELIVERY'] },
  { name: 'Báo cáo', href: '/dashboard/reports', icon: BarChart, roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'PRODUCTION', 'DELIVERY'] },
  { name: 'Việc cần xử lý', href: '/dashboard/tasks', icon: Bell, roles: ['ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'ACCOUNTANT', 'DELIVERY'] },
  { name: 'Khách hàng', href: '/dashboard/customers', icon: Users, roles: ['ADMIN', 'MANAGER', 'SALES'] },
  { name: 'Báo giá', href: '/dashboard/quotes', icon: FileText, roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'] },
  { name: 'Đơn hàng', href: '/dashboard/orders', icon: ShoppingBag, roles: ['ADMIN', 'MANAGER', 'SALES', 'DESIGNER', 'PRODUCTION', 'ACCOUNTANT', 'DELIVERY'] },
  { name: 'Duyệt file thiết kế', href: '/dashboard/design-approval', icon: FileCheck, roles: ['ADMIN', 'MANAGER', 'DESIGNER', 'SALES'] },
  { name: 'Kho vật tư', href: '/dashboard/inventory', icon: Package, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'ACCOUNTANT'] },
  { name: 'Lịch Sản Xuất (Máy in)', href: '/dashboard/production-schedule', icon: Cpu, roles: ['ADMIN', 'MANAGER', 'PRODUCTION'] },
  { name: 'Gia Công Sau In', href: '/dashboard/post-print', icon: Package, roles: ['ADMIN', 'MANAGER', 'PRODUCTION'] },
  { name: 'Quản lý Công đoạn', href: '/dashboard/production', icon: Cpu, roles: ['ADMIN', 'MANAGER', 'PRODUCTION', 'DELIVERY'] },
  { name: 'Quản lý giao hàng', href: '/dashboard/delivery', icon: Truck, roles: ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'DELIVERY'] },
  { name: 'Phiếu thu tiền', href: '/dashboard/payments', icon: DollarSign, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'] },
  { name: 'Công nợ khách hàng', href: '/dashboard/debts', icon: Users, roles: ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES'] },
  { name: 'Cấu hình bảng giá', href: '/dashboard/pricing-config', icon: Sliders, roles: ['ADMIN', 'MANAGER'] },
  { name: 'Cài đặt hệ thống', href: '/dashboard/settings', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
];

export default function Sidebar({ user, pendingTaskCount = 0 }: SidebarProps) {
  const pathname = usePathname();

  // Lọc menu theo vai trò người dùng
  const filteredMenu = MENU_ITEMS.filter(item => item.roles.includes(user.role));

  return (
    <aside className="w-68 bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col h-screen sticky top-0 shrink-0">
      {/* Brand Header */}
      <div className="h-16 px-6 border-b border-slate-800 flex items-center gap-3">
        <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-teal-500 to-indigo-600 flex items-center justify-center text-white font-bold shadow-md shadow-teal-500/10">
          <Printer className="h-5 w-5" />
        </div>
        <div className="flex flex-col">
          <span className="font-bold text-white tracking-wide text-sm">PackPrint Manager</span>
          <span className="text-[10px] text-teal-400 font-semibold tracking-wider uppercase">Hệ thống quản lý in ấn bao bì</span>
        </div>
      </div>

      {/* Nav Menu */}
      <nav className="flex-1 px-4 py-6 space-y-1.5 overflow-y-auto custom-scrollbar">
        <span className="px-3 text-[10px] font-bold tracking-wider uppercase text-slate-500 block mb-2">
          Hệ thống Quản lý
        </span>
        
        {filteredMenu.map((item) => {
          const isActive = pathname === item.href;
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 group ${
                isActive
                  ? 'bg-gradient-to-r from-teal-500/10 to-indigo-500/10 border border-teal-500/20 text-teal-400 shadow-sm shadow-teal-500/5'
                  : 'hover:bg-slate-800/50 hover:text-white border border-transparent'
              }`}
            >
              <div className="flex items-center gap-3">
                <Icon className={`h-4.5 w-4.5 transition-transform duration-200 group-hover:scale-110 ${
                  isActive ? 'text-teal-400' : 'text-slate-400 group-hover:text-slate-200'
                }`} />
                <span>{item.name}</span>
              </div>
              <div className="flex items-center gap-2">
                {item.href === '/dashboard/tasks' && pendingTaskCount > 0 && (
                  <span className="bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full min-w-[20px] text-center">
                    {pendingTaskCount > 99 ? '99+' : pendingTaskCount}
                  </span>
                )}
                <ChevronRight className={`h-3.5 w-3.5 transition-transform duration-200 opacity-0 group-hover:opacity-100 ${
                  isActive ? 'text-teal-400 opacity-50' : 'text-slate-500'
                }`} />
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Quick Business Rules Notice */}
      <div className="p-4 border-t border-slate-800/80 bg-slate-950/40 m-4 rounded-2xl">
        <div className="flex items-center gap-2 mb-1.5">
          <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
          <span className="text-[10px] font-bold text-slate-400 uppercase">Quy tắc in ấn</span>
        </div>
        <p className="text-[10px] leading-relaxed text-slate-500">
          Mỗi đơn hàng luôn bám sát 8 thông số: Khách hàng, Báo giá, File final, Công đoạn sản xuất, Ngày hẹn giao, Đã thanh toán, Dư nợ & Chỉ số Lời/Lỗ.
        </p>
      </div>
    </aside>
  );
}
