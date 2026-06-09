import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import OrderCreateTabs from '@/components/orders/order-create-tabs';

export default async function NewOrderPage({ searchParams }: { searchParams: Promise<{ customerId?: string }> }) {
  const resolvedParams = await searchParams;
  const user = await getCurrentUser();
  if (!user || user.role === 'ACCOUNTANT' || user.role === 'DESIGNER' || user.role === 'PRODUCTION' || user.role === 'DELIVERY') {
    return <Unauthorized />;
  }

  const [customers, materials, machines, laminations] = await Promise.all([
    db.customer.findMany({ where: { status: 'ACTIVE' } }),
    db.material.findMany({ where: { status: 'ACTIVE' } }),
    db.machineConfig.findMany({ where: { status: 'ACTIVE' } }),
    db.laminationPrice.findMany({ where: { status: 'ACTIVE' } })
  ]);

  if (resolvedParams.customerId) {
    const exists = customers.some(c => c.id === resolvedParams.customerId);
    if (!exists) {
      return (
        <div className="p-6 max-w-lg mx-auto mt-10 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-center">
          <h2 className="text-xl font-bold mb-2">Không tìm thấy khách hàng</h2>
          <p>Không tìm thấy khách hàng để tạo đơn hàng, hoặc khách hàng đã bị vô hiệu hóa.</p>
        </div>
      );
    }
  }

  // Fetch approved quotes for the selected customer, or all approved quotes if no customer selected
  const quotesQuery = resolvedParams.customerId 
    ? { customerId: resolvedParams.customerId, status: { in: ['APPROVED', 'ACCEPTED'] } }
    : { status: { in: ['APPROVED', 'ACCEPTED'] } };

  const approvedQuotes = await db.quote.findMany({
    where: quotesQuery,
    include: {
      items: true
    },
    orderBy: { createdAt: 'desc' }
  });

  // Filter out quotes that already have an order
  const quotesWithOrders = await db.order.findMany({
    select: { quoteId: true },
    where: { quoteId: { not: null } }
  });
  const usedQuoteIds = new Set(quotesWithOrders.map(o => o.quoteId));
  const availableQuotes = approvedQuotes.filter(q => !usedQuoteIds.has(q.id));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-800 dark:text-white">Tạo Đơn Hàng Mới</h1>
        <p className="text-sm text-slate-500">Chuyển từ báo giá đã duyệt hoặc tạo trực tiếp từ CRM.</p>
      </div>

      <OrderCreateTabs 
        customers={customers} 
        materials={materials} 
        machines={machines} 
        laminations={laminations}
        availableQuotes={availableQuotes}
        initialData={{ customerId: resolvedParams.customerId }}
        userRole={user.role}
      />
    </div>
  );
}
