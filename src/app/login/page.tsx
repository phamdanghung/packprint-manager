'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Printer, ShieldAlert, CheckCircle2, User, Key, ArrowRight } from 'lucide-react';
import { login } from '@/lib/auth';

const DEMO_ACCOUNTS = [
  { role: 'ADMIN', name: 'Chủ doanh nghiệp', email: 'admin@packprint.vn', pass: '123456', color: 'border-indigo-200 hover:border-indigo-400 bg-indigo-50/50 text-indigo-700 dark:bg-indigo-950/10 dark:text-indigo-400 dark:border-indigo-900/30' },
  { role: 'MANAGER', name: 'Quản lý', email: 'manager@packprint.vn', pass: '123456', color: 'border-blue-200 hover:border-blue-400 bg-blue-50/50 text-blue-700 dark:bg-blue-950/10 dark:text-blue-400 dark:border-blue-900/30' },
  { role: 'SALES', name: 'Sale / CSKH', email: 'sale@packprint.vn', pass: '123456', color: 'border-teal-200 hover:border-teal-400 bg-teal-50/50 text-teal-700 dark:bg-teal-950/10 dark:text-teal-400 dark:border-teal-900/30' },
  { role: 'DESIGNER', name: 'Thiết kế', email: 'design@packprint.vn', pass: '123456', color: 'border-purple-200 hover:border-purple-400 bg-purple-50/50 text-purple-700 dark:bg-purple-950/10 dark:text-purple-400 dark:border-purple-900/30' },
  { role: 'PRODUCTION', name: 'Sản xuất', email: 'production@packprint.vn', pass: '123456', color: 'border-orange-200 hover:border-orange-400 bg-orange-50/50 text-orange-700 dark:bg-orange-950/10 dark:text-orange-400 dark:border-orange-900/30' },
  { role: 'ACCOUNTANT', name: 'Kế toán', email: 'accountant@packprint.vn', pass: '123456', color: 'border-pink-200 hover:border-pink-400 bg-pink-50/50 text-pink-700 dark:bg-pink-950/10 dark:text-pink-400 dark:border-pink-900/30' },
  { role: 'DELIVERY', name: 'Giao hàng', email: 'delivery@packprint.vn', pass: '123456', color: 'border-emerald-200 hover:border-emerald-400 bg-emerald-50/50 text-emerald-700 dark:bg-emerald-950/10 dark:text-emerald-400 dark:border-emerald-900/30' },
];

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get('callbackUrl');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError('Vui lòng điền đầy đủ email và mật khẩu.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await login(email, password);
      if (res.success) {
        setSuccess(true);
        // hard refresh
        if (callbackUrl && callbackUrl.startsWith('/')) {
          window.location.href = callbackUrl;
        } else if (res.role === 'PRODUCTION') {
          window.location.href = '/dashboard/post-print/mobile';
        } else if (res.role === 'DELIVERY') {
          window.location.href = '/dashboard/delivery/mobile';
        } else {
          window.location.href = '/dashboard';
        }
      } else {
        setError(res.error || 'Đăng nhập không thành công.');
        setLoading(false);
      }
    } catch (err) {
      setError('Đã xảy ra lỗi kết nối hệ thống.');
      setLoading(false);
    }
  };

  const handleSelectDemo = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail);
    setPassword(demoPass);
    setError(null);
  };

  return (
    <main className="relative min-h-screen w-full flex items-center justify-center overflow-hidden bg-slate-900 text-slate-100 font-sans">
      {/* Background gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-teal-500/10 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[120px] pointer-events-none" />

      <div className="w-full max-w-5xl px-4 py-8 relative z-10 flex flex-col md:flex-row items-center gap-12">
        {/* Left column: Brand/Promo Info */}
        <div className="w-full md:w-1/2 flex flex-col items-center md:items-start text-center md:text-left space-y-6">
          <div className="flex items-center gap-3 bg-gradient-to-r from-teal-500/20 to-indigo-500/20 px-4 py-2 rounded-full border border-teal-500/20 backdrop-blur-sm self-center md:self-start">
            <Printer className="h-5 w-5 text-teal-400 animate-pulse" />
            <span className="text-sm font-semibold tracking-wide text-teal-300">PackPrint Manager v1.0</span>
          </div>
          
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-teal-300 via-indigo-300 to-teal-300 bg-clip-text text-transparent">
            Số hóa vận hành<br />
            Xưởng in bao bì
          </h1>
          
          <p className="text-slate-400 max-w-md leading-relaxed text-sm md:text-base">
            Giải pháp ERP tinh gọn, chuyên sâu cho ngành in ấn và sản xuất bao bì giấy, thùng carton. Theo dõi trọn vẹn từ Báo giá, File thiết kế, Công đoạn sản xuất đến Công nợ & Lời/Lỗ chi tiết.
          </p>

          <div className="hidden md:flex flex-col gap-4 text-xs text-slate-400 border-t border-slate-800 pt-6 w-full max-w-sm">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-teal-400" />
              <span>Theo dõi 8 chỉ số cốt lõi trên một màn hình duy nhất.</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-1.5 rounded-full bg-indigo-400" />
              <span>Phân quyền rõ ràng cho Sale, Thiết kế, Kế toán, Sản xuất.</span>
            </div>
          </div>
        </div>

        {/* Right column: Glassmorphic Login Form */}
        <div className="w-full md:w-1/2 max-w-md">
          <div className="backdrop-blur-xl bg-slate-950/60 border border-slate-800/80 rounded-3xl shadow-2xl p-6 md:p-8 space-y-6">
            <div className="space-y-1">
              <h2 className="text-2xl font-bold tracking-tight text-white">Đăng nhập hệ thống</h2>
              <p className="text-sm text-slate-400">Nhập tài khoản của bạn để bắt đầu làm việc</p>
            </div>

            {error && (
              <div className="flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 p-4 rounded-xl text-xs backdrop-blur-sm animate-shake">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-400 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center gap-3 bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 p-4 rounded-xl text-xs backdrop-blur-sm">
                <CheckCircle2 className="h-4.5 w-4.5 text-emerald-400 flex-shrink-0" />
                <span>Đăng nhập thành công! Đang chuyển hướng...</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="email">
                  Email nhân viên
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    className="w-full rounded-xl bg-slate-900/80 border border-slate-800 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/80 transition-all"
                    id="email"
                    placeholder="name@packprint.vn"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={loading || success}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold uppercase tracking-wider text-slate-400" htmlFor="password">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Key className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-500" />
                  <input
                    className="w-full rounded-xl bg-slate-900/80 border border-slate-800 py-3 pl-11 pr-4 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 focus:border-teal-500/80 transition-all"
                    id="password"
                    placeholder="••••••••"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading || success}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || success}
                className="w-full rounded-xl bg-gradient-to-r from-teal-500 to-indigo-500 hover:from-teal-400 hover:to-indigo-400 text-white font-semibold py-3 px-4 text-sm shadow-lg hover:shadow-teal-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:pointer-events-none mt-2"
              >
                {loading ? (
                  <div className="h-5 w-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Vào hệ thống</span>
                    <ArrowRight className="h-4.5 w-4.5" />
                  </>
                )}
              </button>
            </form>

            {/* Quick Demo Login Section */}
            <div className="border-t border-slate-800/80 pt-5 space-y-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-400 block text-center">
                👉 Trải nghiệm nhanh các vai trò (Click để chọn)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-left">
                {DEMO_ACCOUNTS.map((demo) => (
                  <button
                    key={demo.role}
                    type="button"
                    onClick={() => handleSelectDemo(demo.email, demo.pass)}
                    className={`flex flex-col p-2.5 rounded-xl border text-xs font-medium cursor-pointer transition-all ${demo.color}`}
                  >
                    <span className="font-bold flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-current" />
                      {demo.role}
                    </span>
                    <span className="opacity-95 mt-0.5">{demo.name}</span>
                    <span className="text-[10px] opacity-70 mt-0.5">{demo.email}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

import { Suspense } from 'react';
export default function LoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">Đang tải...</div>}>
      <LoginForm />
    </Suspense>
  );
}
