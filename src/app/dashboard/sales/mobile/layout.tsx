import React from 'react';
import Link from 'next/link';
import { Home, Users, FileText, ShoppingBag, CheckSquare } from 'lucide-react';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';

export default async function SalesMobileLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'SALES') {
    redirect('/dashboard');
  }

  return (
    <div className="flex flex-col h-screen bg-slate-50 relative pb-16 overflow-hidden">
      {/* Mobile Top Header (Optional) - Tùy chỉnh theo trang bên trong hoặc để khung chung */}
      
      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto custom-scrollbar">
        {children}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 w-full bg-white border-t border-slate-200 flex justify-around items-center p-2 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        <Link href="/dashboard/sales/mobile" className="flex flex-col items-center p-2 text-slate-500 hover:text-teal-600 focus:text-teal-600 transition-colors">
          <Home className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Trang chủ</span>
        </Link>
        <Link href="/dashboard/sales/mobile/customers" className="flex flex-col items-center p-2 text-slate-500 hover:text-teal-600 focus:text-teal-600 transition-colors">
          <Users className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Khách hàng</span>
        </Link>
        <Link href="/dashboard/sales/mobile/quotes" className="flex flex-col items-center p-2 text-slate-500 hover:text-teal-600 focus:text-teal-600 transition-colors">
          <FileText className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Báo giá</span>
        </Link>
        <Link href="/dashboard/sales/mobile/orders" className="flex flex-col items-center p-2 text-slate-500 hover:text-teal-600 focus:text-teal-600 transition-colors">
          <ShoppingBag className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Đơn hàng</span>
        </Link>
        <Link href="/dashboard/tasks" className="flex flex-col items-center p-2 text-slate-500 hover:text-teal-600 focus:text-teal-600 transition-colors">
          <CheckSquare className="w-5 h-5 mb-1" />
          <span className="text-[10px] font-medium">Việc cần làm</span>
        </Link>
      </nav>
    </div>
  );
}
