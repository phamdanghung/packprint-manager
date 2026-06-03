'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import Sidebar from '@/components/sidebar';
import Header from '@/components/header';
import { UserSession } from '@/lib/auth';

interface LayoutWrapperProps {
  children: React.ReactNode;
  user: UserSession;
  pendingTaskCount: number;
  isDemoMode: boolean;
}

export default function LayoutWrapper({ children, user, pendingTaskCount, isDemoMode }: LayoutWrapperProps) {
  const pathname = usePathname();
  const isMobileAppRoute = pathname?.includes('/mobile');

  if (isMobileAppRoute) {
    return (
      <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
        {children}
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 font-sans text-slate-800 dark:text-slate-200">
      {/* Sidebar Navigation */}
      <Sidebar user={user} pendingTaskCount={pendingTaskCount} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Header Control Bar */}
        <Header user={user} isDemoMode={isDemoMode} />

        {/* Inner Scrollable Workspace */}
        <main className="flex-1 overflow-y-auto p-6 md:p-8 custom-scrollbar">
          {children}
        </main>
      </div>
    </div>
  );
}
