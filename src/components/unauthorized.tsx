import React from 'react';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function Unauthorized() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] px-6 text-center">
      {/* Background Glow Effect */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[350px] h-[350px] bg-red-500/5 blur-[80px] rounded-full pointer-events-none" />

      {/* Decorative Icon */}
      <div className="relative mb-6">
        <div className="absolute inset-0 bg-red-500/10 blur-xl rounded-full scale-150 animate-pulse" />
        <div className="relative h-20 w-20 rounded-2xl bg-gradient-to-br from-red-500/20 to-orange-500/20 border border-red-500/30 flex items-center justify-center text-red-500 shadow-lg shadow-red-500/5">
          <ShieldAlert className="h-10 w-10 animate-bounce" />
        </div>
      </div>

      {/* Heading & Text */}
      <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white sm:text-3xl mb-3">
        Không có quyền truy cập!
      </h1>
      <p className="max-w-md text-sm text-slate-500 dark:text-slate-400 leading-relaxed mb-8">
        Vai trò hiện tại của tài khoản của bạn không được cấp phép để xem hoặc thao tác trên khu vực dữ liệu này. Vui lòng liên hệ với Quản trị viên nếu đây là một sự nhầm lẫn.
      </p>

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-sm active:scale-[0.98] transition-all cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Quay lại Dashboard</span>
        </Link>
      </div>
    </div>
  );
}
