import React from 'react';
import { redirect } from 'next/navigation';
import { headers } from 'next/headers';
import { getCurrentUser } from '@/lib/auth';
import LayoutWrapper from '@/components/layout-wrapper';

export const dynamic = 'force-dynamic';

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

  const { getTaskCountsByRole } = await import('@/lib/task-actions');
  const pendingTaskCount = await getTaskCountsByRole();

  const isDemoMode = process.env.NODE_ENV !== 'production' && process.env.NEXT_PUBLIC_ENABLE_DEMO_SWITCHER === 'true';

  return (
    <LayoutWrapper user={user} pendingTaskCount={pendingTaskCount} isDemoMode={isDemoMode}>
      {children}
    </LayoutWrapper>
  );
}
