'use client';

import React from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { LogOut, User, Layers } from 'lucide-react';
import { UserSession, logout, switchRoleDemo } from '@/lib/auth';
import { getRoleName } from '@/lib/utils';
import Link from 'next/link';

interface HeaderProps {
  user: UserSession;
  /**
   * Giá trị này được tính toán phía Server (layout.tsx) bằng cách kiểm tra
   * process.env.NODE_ENV === 'development'. Server Component đảm bảo
   * giá trị này luôn là false trên Vercel production (NODE_ENV = production).
   * Client Component KHÔNG tự đọc process.env để tránh hydration issues.
   */
  isDemoMode: boolean;
}

export default function Header({ user, isDemoMode }: HeaderProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleLogout = async () => {
    await logout();
    router.push('/login');
    router.refresh();
  };

  const handleRoleChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
    // Guard: không cho phép gọi switchRoleDemo nếu prop isDemoMode = false
    if (!isDemoMode) return;
    const newRole = e.target.value as any;
    const success = await switchRoleDemo(newRole);
    if (success) {
      router.refresh();
      setTimeout(() => {
        window.location.reload();
      }, 100);
    }
  };

  // Xác định tên Module dựa trên đường dẫn
  const getPageTitle = () => {
    if (pathname === '/dashboard') return 'Dashboard Tổng quan';
    if (pathname.includes('/customers')) return 'Khách hàng';
    if (pathname.includes('/quotes')) return 'Báo giá';
    if (pathname.includes('/orders')) return 'Đơn hàng';
    if (pathname.includes('/design-approval')) return 'Duyệt file thiết kế';
    if (pathname.includes('/production')) return 'Tiến độ sản xuất';
    if (pathname.includes('/payments')) return 'Công nợ & Thu chi';
    if (pathname.includes('/pricing-config')) return 'Cấu hình bảng giá';
    if (pathname.includes('/settings')) return 'Cài đặt hệ thống';
    if (pathname.includes('/profile')) return 'Hồ sơ cá nhân';
    return 'Hệ thống Quản lý';
  };

  return (
    <header className="h-16 px-6 border-b border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 backdrop-blur-md sticky top-0 flex items-center justify-between z-30 font-sans">
      {/* Title */}
      <div className="flex items-center gap-3">
        <h2 className="text-base font-bold text-slate-800 dark:text-white tracking-wide">
          {getPageTitle()}
        </h2>
      </div>

      {/* Controls: Role Switcher (Dev only) & User Profile */}
      <div className="flex items-center gap-4">

        {/* DEMO ROLE SWITCHER — chỉ render khi isDemoMode=true (development server) */}
        {isDemoMode && (
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-3 py-1.5 rounded-xl">
            <Layers className="h-4 w-4 text-amber-500 flex-shrink-0" />
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase hidden sm:inline">
              Bộ chuyển vai DEMO:
            </span>
            <select
              value={user.role}
              onChange={handleRoleChange}
              className="bg-transparent border-none text-xs font-semibold text-amber-800 dark:text-amber-300 focus:outline-none cursor-pointer pr-1"
            >
              <option value="ADMIN" className="bg-slate-900 text-white font-semibold">ADMIN (Chủ doanh nghiệp)</option>
              <option value="MANAGER" className="bg-slate-900 text-white font-semibold">MANAGER (Quản lý)</option>
              <option value="SALES" className="bg-slate-900 text-white font-semibold">SALES (Sale / CSKH)</option>
              <option value="DESIGNER" className="bg-slate-900 text-white font-semibold">DESIGNER (Thiết kế)</option>
              <option value="PRODUCTION" className="bg-slate-900 text-white font-semibold">PRODUCTION (Sản xuất)</option>
              <option value="ACCOUNTANT" className="bg-slate-900 text-white font-semibold">ACCOUNTANT (Kế toán)</option>
              <option value="DELIVERY" className="bg-slate-900 text-white font-semibold">DELIVERY (Giao hàng)</option>
            </select>
          </div>
        )}

        {/* User Block */}
        <div className="flex items-center gap-3 pl-4 border-l border-slate-200 dark:border-slate-800">
          <div className="flex flex-col text-right hidden md:flex">
            <span className="text-xs font-bold text-slate-800 dark:text-white tracking-wide">{user.name}</span>
            <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{getRoleName(user.role)}</span>
          </div>

          <Link href="/dashboard/profile"
            className="h-9 w-9 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700/80 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
            title="Hồ sơ cá nhân"
          >
            <User className="h-4.5 w-4.5" />
          </Link>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            title="Đăng xuất khỏi hệ thống"
            className="h-9 w-9 rounded-xl border border-slate-200 dark:border-slate-800/80 hover:bg-rose-500/10 hover:text-rose-500 text-slate-500 dark:text-slate-400 dark:hover:text-rose-400 transition-all flex items-center justify-center cursor-pointer"
          >
            <LogOut className="h-4.5 w-4.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
