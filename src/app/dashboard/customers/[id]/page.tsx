import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Unauthorized from '@/components/unauthorized';
import CustomerDetailClient from './customer-detail-client';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CustomerDetailPage({ params }: PageProps) {
  const user = await getCurrentUser();
  if (!user) return null;

  // Lọc quyền xem: ADMIN, MANAGER, SALES, ACCOUNTANT được phép.
  const allowedRoles = ['ADMIN', 'MANAGER', 'SALES', 'ACCOUNTANT'];
  if (!allowedRoles.includes(user.role)) {
    return <Unauthorized />;
  }

  const { id } = await params;

  // Query dữ liệu khách hàng chi tiết cùng với Quotes, Orders, Payments, DesignFiles
  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      createdBy: {
        select: { name: true, role: true }
      },
      quotes: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          createdBy: { select: { name: true } }
        }
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        include: {
          items: true,
          payments: true,
          designFiles: true,
          productionSteps: true,
        }
      }
    }
  });

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] text-center font-sans">
        <h3 className="text-base font-bold text-slate-800 dark:text-white mb-1">Không tìm thấy khách hàng</h3>
        <p className="text-xs text-slate-500">Hồ sơ khách hàng này không tồn tại hoặc đã bị xóa khỏi hệ thống.</p>
      </div>
    );
  }

  return (
    <CustomerDetailClient 
      customer={customer} 
      userRole={user.role} 
    />
  );
}
