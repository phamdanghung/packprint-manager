import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default async function DashboardLayout({ children }: DashboardLayoutProps) {
  // Lấy thông tin user hiện tại trên Server Side
  const user = await getCurrentUser();

  // Đảm bảo an toàn, nếu không có user thì chuyển hướng về login
  if (!user) {
    redirect('/login');
  }

  const headersList = await headers();
  const host = headersList.get('host') || '';

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      {/* Sidebar Navigation */}
      <Sidebar user={user} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Control Bar */}
        <Header user={user} isDemoMode={process.env.NODE_ENV === 'development' && (host.includes('localhost') || host.includes('127.0.0.1'))} />

        {/* Inner Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
