import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import CustomersClient from './customers-client';

export default async function CustomersPage() {
  const user = await getCurrentUser();
  if (!user) return null;

  // Lọc quyền xem: Chỉ ADMIN, MANAGER, SALES, ACCOUNTANT được xem.
  // DESIGNER, PRODUCTION, DELIVERY không được xem.
  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
  if (!allowedRoles.includes(user.role)) {
    return <Unauthorized />;
  }

  // Lấy danh sách khách hàng ban đầu từ SQLite qua Prisma
  const customers = await db.customer.findMany({
    orderBy: {
      customerCode: 'desc',
    },
    include: {
      createdBy: {
        select: {
          name: true,
          role: true,
        }
      }
    }
  });

  return (
    <CustomersClient 
      initialCustomers={customers} 
      userRole={user.role} 
    />
  );
}
