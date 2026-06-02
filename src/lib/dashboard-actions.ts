'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export interface DashboardFilter {
  timeRange?: 'today' | '7days' | 'thisMonth' | 'lastMonth';
}

export async function getDashboardData(filters: DashboardFilter = {}) {
  const user = await getCurrentUser();
  if (!user) throw new Error('Không có quyền truy cập');

  const { role, id: userId } = user;
  const timeRange = filters.timeRange || 'thisMonth';

  // Calculate Date Boundaries
  const now = new Date();
  let startDate = new Date();
  let endDate = new Date();

  switch (timeRange) {
    case 'today':
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case '7days':
      startDate.setDate(now.getDate() - 6); // Includes today
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);
      break;
    case 'thisMonth':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'lastMonth':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
  }

  const dateFilter = {
    gte: startDate,
    lte: endDate,
  };

  // Roles Definition
  const isManagement = ['ADMIN', 'MANAGER'].includes(role);
  const isSales = role === 'SALES';
  const isAccountant = role === 'ACCOUNTANT';
  const isProduction = role === 'PRODUCTION';
  const isDelivery = role === 'DELIVERY';
  const isDesigner = role === 'DESIGNER';

  const canViewFinancials = isManagement || isAccountant || isSales;
  const canViewProfit = isManagement;

  // Base Filters
  const salesFilter = isSales ? { assignedSalesId: userId } : {};

  // 1. FINANCIAL KPIs
  let finance = null;
  if (canViewFinancials) {
    // 1a. Revenue (Doanh thu)
    const revenueOrders = await db.order.aggregate({
      where: {
        createdAt: dateFilter,
        status: { not: 'CANCELLED' },
        ...salesFilter
      },
      _sum: {
        totalAmount: true,
        grossProfit: true
      }
    });

    // 1b. Collected (Đã thu)
    const collectedPayments = await db.payment.aggregate({
      where: {
        paidAt: dateFilter,
        paymentStatus: 'CONFIRMED',
        ...(isSales ? { customer: { assignedSalesId: userId } } : {})
      },
      _sum: {
        amount: true
      }
    });

    // 1c. Debt Snapshot (Công nợ hiện tại) - DO NOT apply timeRange
    const debtOrders = await db.order.aggregate({
      where: {
        status: { not: 'CANCELLED' },
        paymentStatus: { not: 'PAID' },
        ...salesFilter
      },
      _sum: {
        debtAmount: true
      }
    });

    finance = {
      revenue: revenueOrders._sum.totalAmount || 0,
      collected: collectedPayments._sum.amount || 0,
      debt: debtOrders._sum.debtAmount || 0,
      grossProfit: canViewProfit ? (revenueOrders._sum.grossProfit || 0) : null
    };
  }

  // Accountant specifics
  let accountantStats = null;
  if (isAccountant || isManagement) {
    const debtorsCount = await db.customer.count({ where: { debtBalance: { gt: 0 } } });
    const unpaidOrdersCount = await db.order.count({ where: { status: { not: 'CANCELLED' }, paymentStatus: { not: 'PAID' } } });
    const completedDebtOrdersCount = await db.order.count({ where: { status: 'COMPLETED', paymentStatus: { not: 'PAID' } } });
    accountantStats = {
      debtorsCount,
      unpaidOrdersCount,
      completedDebtOrdersCount
    };
  }

  // Sales specifics
  const recentQuotes = (isSales || isManagement) ? await db.quote.findMany({
    where: { ...salesFilter },
    include: { customer: { select: { name: true } } },
    orderBy: { createdAt: 'desc' },
    take: 5
  }) : [];

  // 2. PIPELINE (Đơn hàng)
  const pipelineGroups = (isManagement || isSales) ? await db.order.groupBy({
    by: ['status'],
    where: {
      ...salesFilter
    },
    _count: {
      id: true
    }
  }) : [];

  const pipeline = pipelineGroups.map(g => ({
    status: g.status,
    count: g._count.id
  }));

  // 3. DAILY OPERATIONS & ALERTS
  
  // Production
  const productionJobs = (isManagement || isProduction) ? await db.productionJob.findMany({
    where: {
      status: { in: ['READY_FOR_PRINT', 'PRINTING', 'LAMINATING', 'DIE_CUTTING', 'QC', 'PACKING', 'ON_HOLD', 'REWORK'] },
      order: { status: { not: 'CANCELLED' } }
    },
    include: {
      order: { select: { orderCode: true, customer: { select: { name: true } } } }
    },
    orderBy: [{ priority: 'asc' }, { dueDate: 'asc' }],
    take: 10
  }) : [];

  const productionAlerts = productionJobs.filter(j => 
    j.status === 'ON_HOLD' || j.status === 'REWORK' || (j.dueDate && new Date(j.dueDate) < new Date())
  ).length;

  const deliveryJobs = (isManagement || isDelivery) ? await db.order.findMany({
    where: {
      OR: [
        { status: 'READY_FOR_DELIVERY' },
        { deliveryStatus: { in: ['PENDING', 'DELIVERING', 'FAILED'] } },
        { deliveryJob: { status: { in: ['PENDING', 'READY', 'DELIVERING', 'FAILED'] } } }
      ],
      status: { not: 'CANCELLED' }
    },
    include: {
      customer: { select: { name: true } },
      deliveryJob: true
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  }) : [];

  const deliveryAlerts = deliveryJobs.filter(o => o.deliveryJob?.status === 'FAILED' || o.deliveryStatus === 'FAILED').length;

  // Design Files
  const designFiles = (isManagement || isDesigner || isSales) ? await db.designFile.findMany({
    where: {
      status: { in: ['PENDING', 'REJECTED', 'APPROVED'] },
      ...(isDesigner ? { assignedDesignerId: userId } : {}),
      ...(isSales ? { order: { assignedSalesId: userId } } : {})
    },
    include: {
      order: { select: { orderCode: true, customer: { select: { name: true } } } }
    },
    orderBy: { updatedAt: 'desc' },
    take: 10
  }) : [];

  // Debtors & Payments
  const topDebtors = (isManagement || isSales || isAccountant) ? await db.customer.findMany({
    where: {
      debtBalance: { gt: 0 },
      ...salesFilter
    },
    orderBy: { debtBalance: 'desc' },
    take: 5
  }) : [];

  const recentPayments = (isManagement || isSales || isAccountant) ? await db.payment.findMany({
    where: {
      ...(isSales ? { customer: { assignedSalesId: userId } } : {})
    },
    include: {
      customer: { select: { name: true } },
      receivedBy: { select: { name: true } }
    },
    orderBy: { createdAt: 'desc' },
    take: 10
  }) : [];

  const pendingPaymentsCount = (isManagement || isSales || isAccountant) ? await db.payment.count({
    where: {
      paymentStatus: 'PENDING',
      ...(isSales ? { customer: { assignedSalesId: userId } } : {})
    }
  }) : 0;

  // Chart Data: Dynamic based on timeRange
  let revenueChart: { date: string; amount: number }[] = [];
  if (isManagement || isSales) {
    const getLocalDateStr = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().split('T')[0];
    };

    const chartDays: string[] = [];
    const current = new Date(startDate);
    current.setHours(0, 0, 0, 0); // ensure start of day
    
    // Safety cap for while loop
    let daysCount = 0;
    while (current <= endDate && daysCount < 40) {
      chartDays.push(getLocalDateStr(current));
      current.setDate(current.getDate() + 1);
      daysCount++;
    }

    const revenueOrdersForChart = await db.order.findMany({
      where: {
        createdAt: dateFilter,
        status: { not: 'CANCELLED' },
        ...salesFilter
      },
      select: { createdAt: true, totalAmount: true }
    });

    revenueChart = chartDays.map(dateStr => {
      const dayTotal = revenueOrdersForChart
        .filter(o => getLocalDateStr(o.createdAt) === dateStr)
        .reduce((sum, o) => sum + o.totalAmount, 0);
      return { date: dateStr, amount: dayTotal };
    });
  }

  return {
    success: true,
    data: {
      role,
      finance,
      accountantStats,
      pipeline,
      revenueChart,
      lists: {
        productionJobs,
        deliveryJobs,
        designFiles,
        topDebtors,
        recentPayments,
        recentQuotes
      },
      alerts: {
        production: productionAlerts,
        delivery: deliveryAlerts,
        pendingPayments: pendingPaymentsCount
      }
    }
  };
}
