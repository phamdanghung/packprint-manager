import React from 'react';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import CustomerCrmTabs from '@/components/customers/crm-tabs';
import { getCustomerCrmData, getCustomerTimeline, getCustomerNotes, getCustomerInteractions, getCustomerFollowUps } from '@/lib/crm-actions';
import { db } from '@/lib/db';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
  if (!allowedRoles.includes(user.role)) {
    return <Unauthorized />;
  }

  const { id } = await params;

  try {
    const crmData = await getCustomerCrmData(id);
    const timeline = await getCustomerTimeline(id);
    const notes = await getCustomerNotes(id);
    const interactions = await getCustomerInteractions(id);
    const followUps = await getCustomerFollowUps(id);

    // Get quotes, orders and payments to show in detail tabs
    const quotes = await db.quote.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } });
    const orders = await db.order.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } });
    const payments = await db.payment.findMany({ where: { customerId: id }, orderBy: { createdAt: 'desc' } });

    const salesUsers = await db.user.findMany({
      where: { role: 'SALES', status: 'ACTIVE' },
      select: { id: true, name: true }
    });

    return (
      <CustomerCrmTabs 
        crmData={crmData}
        timeline={timeline}
        notes={notes}
        interactions={interactions}
        followUps={followUps}
        quotes={quotes}
        orders={orders}
        payments={payments}
        userRole={user.role}
        currentUserId={user.id}
        salesUsers={salesUsers}
      />
    );
  } catch (error: any) {
    if (error.message.includes('quyền') || error.message.includes('Unauthorized')) {
      return <Unauthorized />;
    }
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center font-sans">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Không tìm thấy khách hàng</h3>
        <p className="text-xs text-slate-500">Hồ sơ khách hàng này không tồn tại hoặc bạn không có quyền xem.</p>
      </div>
    );
  }
}
