import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import CustomersClient from './customers-client';
import { getCustomersWithCrmFilters } from '@/lib/crm-actions';

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: any;
}) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Lọc quyền xem: Chỉ ADMIN, MANAGER, SALES, ACCOUNTANT được xem.
  // DESIGNER, PRODUCTION, DELIVERY không được xem.
  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
  if (!allowedRoles.includes(user.role)) {
    return <Unauthorized />;
  }

  // Get initial data using CRM filters (empty filters initially)
  const customers = await getCustomersWithCrmFilters({});

  const salesUsers = await db.user.findMany({
    where: { role: 'SALES', status: 'ACTIVE' },
    select: { id: true, name: true }
  });

  return (
    <CustomersClient 
      initialCustomers={customers} 
      userRole={user.role} 
      currentUserId={user.id}
      salesUsers={salesUsers}
    />
  );
}
