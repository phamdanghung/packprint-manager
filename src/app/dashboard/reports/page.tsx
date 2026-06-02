import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import ReportsClient from './reports-client';
import { db } from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function ReportsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/login');

  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT', 'PRODUCTION', 'DELIVERY'];
  if (!allowedRoles.includes(user.role)) {
    return (
      <div className="p-6">
        <div className="bg-rose-50 text-rose-600 p-4 rounded-xl">
          Bạn không có quyền xem báo cáo.
        </div>
      </div>
    );
  }

  // Pre-fetch Sales users for dropdown if ADMIN/MANAGER
  let salesUsers: any[] = [];
  if (['ADMIN', 'MANAGER'].includes(user.role)) {
    salesUsers = await db.user.findMany({
      where: { role: 'SALES', status: 'ACTIVE' },
      select: { id: true, name: true }
    });
  }

  return <ReportsClient currentUser={user} salesUsers={salesUsers} />;
}
