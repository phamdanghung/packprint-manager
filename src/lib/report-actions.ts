'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

// Helper to check role
async function checkReportAuth(allowedRoles: string[]) {
  const user = await getCurrentUser();
  if (!user) return { ok: false, error: 'Chưa đăng nhập' };
  
  if (!allowedRoles.includes('ALL') && !allowedRoles.includes(user.role)) {
    return { ok: false, error: 'Không có quyền truy cập báo cáo này' };
  }
  return { ok: true, user };
}

// Helper to build date filter
function buildDateFilter(filters: any, fieldName: string = 'createdAt') {
  const { timeRange, fromDate, toDate } = filters;
  const now = new Date();
  let start: Date | null = null;
  let end: Date | null = null;

  if (timeRange === 'today') {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
  } else if (timeRange === 'thisWeek') {
    const firstDay = now.getDate() - now.getDay() + (now.getDay() === 0 ? -6 : 1); // Monday
    start = new Date(now.getFullYear(), now.getMonth(), firstDay);
    end = new Date(now.getFullYear(), now.getMonth(), firstDay + 6, 23, 59, 59, 999);
  } else if (timeRange === 'thisMonth') {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
    end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  } else if (timeRange === 'lastMonth') {
    start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
  } else if (timeRange === 'custom' && fromDate && toDate) {
    start = new Date(fromDate);
    start.setHours(0, 0, 0, 0);
    end = new Date(toDate);
    end.setHours(23, 59, 59, 999);
  }

  if (start && end) {
    return { [fieldName]: { gte: start, lte: end } };
  }
  return {};
}

// 1. Overview
export async function getReportOverview(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER']);
    if (!auth.ok) return { success: false, error: auth.error };

    const dateFilter = buildDateFilter(filters, 'createdAt');
    const paymentDateFilter = buildDateFilter(filters, 'updatedAt'); // For confirmed payments

    // Revenue & Profit from Orders
    const orders = await db.order.findMany({
      where: { ...dateFilter, status: { not: 'CANCELLED' } },
      select: { totalAmount: true, grossProfit: true, debtAmount: true, paidAmount: true, status: true }
    });

    let totalRevenue = 0;
    let totalProfit = 0;
    let totalDebt = 0; // Total Debt from all active orders regardless of date? The prompt says "Tổng công nợ còn lại". We should probably just sum debtAmount of ALL orders, but date filter usually applies to when order was created. Let's stick to dateFilter for KPI if it's "doanh thu", but for "công nợ còn lại" maybe it's better to show current debt? Prompt: "Tổng công nợ = SUM order.debtAmount của các order chưa PAID/CANCELLED."
    let completedOrders = 0;
    let unpaidOrders = 0;

    orders.forEach(o => {
      totalRevenue += o.totalAmount;
      totalProfit += o.grossProfit;
      if (o.status === 'COMPLETED') completedOrders++;
    });

    // Debt is usually global or within the period. Let's do within the period for now to match the date filter, or maybe global. The prompt says "Khớp SUM Order.debtAmount của order chưa PAID/CANCELLED".
    const allDebts = await db.order.aggregate({
      where: { paymentStatus: { notIn: ['PAID', 'CANCELLED'] }, status: { not: 'CANCELLED' } },
      _sum: { debtAmount: true }
    });
    totalDebt = allDebts._sum.debtAmount || 0;
    
    unpaidOrders = await db.order.count({
      where: { paymentStatus: { notIn: ['PAID', 'CANCELLED'] }, status: { not: 'CANCELLED' } }
    });

    // Collected amount
    const payments = await db.payment.aggregate({
      where: { paymentStatus: 'CONFIRMED', ...paymentDateFilter },
      _sum: { amount: true }
    });
    const totalCollected = payments._sum.amount || 0;

    // Quotes
    const quotes = await db.quote.findMany({
      where: { ...dateFilter },
      select: { status: true }
    });
    const totalQuotes = quotes.length;
    const convertedQuotes = quotes.filter(q => q.status === 'CONVERTED').length;
    const conversionRate = totalQuotes > 0 ? (convertedQuotes / totalQuotes) * 100 : 0;

    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

    return {
      success: true,
      data: {
        totalRevenue,
        totalCollected,
        totalDebt,
        orderCount: orders.length,
        completedOrders,
        unpaidOrders,
        totalQuotes,
        conversionRate,
        grossProfit: totalProfit,
        profitMargin
      }
    };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 2. Sales Report
export async function getSalesReport(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const { role, id } = auth.user!;
    let targetSalesId = filters.salesId;
    
    // Scoping
    if (role === 'SALES') {
      targetSalesId = id;
    } else if (targetSalesId === 'ALL' || !targetSalesId) {
      targetSalesId = undefined; // All sales
    }

    const dateFilter = buildDateFilter(filters, 'createdAt');

    // Get Sales Users for grouping if Admin/Manager
    let salesUsers = [];
    if (targetSalesId) {
      salesUsers = await db.user.findMany({ where: { id: targetSalesId, role: 'SALES' }, select: { id: true, name: true } });
    } else {
      salesUsers = await db.user.findMany({ where: { role: 'SALES' }, select: { id: true, name: true } });
    }

    const reportData = [];

    for (const sales of salesUsers) {
      const customers = await db.customer.count({
        where: { assignedSalesId: sales.id, ...dateFilter }
      });

      const quotes = await db.quote.findMany({
        where: { assignedSalesId: sales.id, ...dateFilter }
      });
      const quoteCount = quotes.length;
      const convertedQuotes = quotes.filter(q => q.status === 'CONVERTED').length;

      const orders = await db.order.findMany({
        where: { assignedSalesId: sales.id, ...dateFilter, status: { not: 'CANCELLED' } },
        select: { totalAmount: true, paidAmount: true, debtAmount: true, paymentStatus: true }
      });
      const orderCount = orders.length;
      const revenue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
      const collected = orders.reduce((sum, o) => sum + o.paidAmount, 0);
      
      const allDebts = await db.order.aggregate({
        where: { assignedSalesId: sales.id, paymentStatus: { notIn: ['PAID', 'CANCELLED'] }, status: { not: 'CANCELLED' } },
        _sum: { debtAmount: true }
      });
      const debt = allDebts._sum.debtAmount || 0;

      reportData.push({
        salesId: sales.id,
        salesName: sales.name,
        customerCount: customers,
        quoteCount,
        convertedQuotes,
        orderCount,
        revenue,
        collected,
        debt
      });
    }

    return { success: true, data: reportData };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 3. Debt Report
export async function getDebtReport(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const { role, id } = auth.user!;
    
    let whereClause: any = {
      paymentStatus: { notIn: ['PAID', 'CANCELLED'] },
      status: { not: 'CANCELLED' },
      debtAmount: { gt: 0 }
    };

    if (role === 'SALES') {
      whereClause.assignedSalesId = id;
    } else if (filters.salesId && filters.salesId !== 'ALL') {
      whereClause.assignedSalesId = filters.salesId;
    }

    // Usually debt report is grouped by customer
    const ordersWithDebt = await db.order.findMany({
      where: whereClause,
      include: {
        customer: { select: { id: true, name: true, customerCode: true } },
        assignedSales: { select: { name: true } }
      }
    });

    const customerMap = new Map();
    for (const order of ordersWithDebt) {
      const cid = order.customer.id;
      if (!customerMap.has(cid)) {
        customerMap.set(cid, {
          customerId: cid,
          customerCode: order.customer.customerCode,
          customerName: order.customer.name,
          salesName: order.assignedSales?.name || 'N/A',
          totalOrders: 0,
          totalAmount: 0,
          paidAmount: 0,
          debtAmount: 0,
          oldestDebtDate: order.createdAt
        });
      }
      
      const c = customerMap.get(cid);
      c.totalOrders++;
      c.totalAmount += order.totalAmount;
      c.paidAmount += order.paidAmount;
      c.debtAmount += order.debtAmount;
      if (new Date(order.createdAt) < new Date(c.oldestDebtDate)) {
        c.oldestDebtDate = order.createdAt;
      }
    }

    const data = Array.from(customerMap.values()).sort((a, b) => b.debtAmount - a.debtAmount);

    return { success: true, data };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 4. Payment Report
export async function getPaymentReport(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const { role, id } = auth.user!;
    let whereClause: any = buildDateFilter(filters, 'createdAt');

    if (role === 'SALES') {
      whereClause.order = { assignedSalesId: id };
    }

    const payments = await db.payment.findMany({
      where: whereClause,
      include: {
        customer: { select: { name: true, customerCode: true } },
        order: { select: { orderCode: true } },
        createdBy: { select: { name: true } },
        receivedBy: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100 // MVP limit
    });

    const kpi = {
      totalCount: payments.length,
      confirmedAmount: payments.filter(p => p.paymentStatus === 'CONFIRMED').reduce((s, p) => s + p.amount, 0),
      pendingAmount: payments.filter(p => p.paymentStatus === 'PENDING').reduce((s, p) => s + p.amount, 0),
      cancelledAmount: payments.filter(p => p.paymentStatus === 'CANCELLED').reduce((s, p) => s + p.amount, 0),
      codPendingAmount: payments.filter(p => p.paymentStatus === 'PENDING' && p.paymentMethod === 'COD').reduce((s, p) => s + p.amount, 0),
    };

    return { success: true, data: { list: payments, kpi } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 5. Production Report
export async function getProductionReport(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER', 'PRODUCTION']);
    if (!auth.ok) return { success: false, error: auth.error };

    const dateFilter = buildDateFilter(filters, 'createdAt');

    const jobs = await db.productionJob.findMany({
      where: dateFilter,
      include: {
        order: { select: { orderCode: true, customer: { select: { name: true } } } },
        assignedTo: { select: { name: true } },
        steps: true
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const kpi = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'PENDING').length,
      inProgress: jobs.filter(j => j.status === 'IN_PROGRESS').length,
      completed: jobs.filter(j => j.status === 'COMPLETED').length,
      rework: jobs.filter(j => j.status === 'REWORK').length,
      onHold: jobs.filter(j => j.status === 'ON_HOLD').length,
      overdue: jobs.filter(j => j.dueDate && new Date(j.dueDate) < new Date() && j.status !== 'COMPLETED').length
    };

    return { success: true, data: { list: jobs, kpi } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 6. Delivery Report
export async function getDeliveryReport(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER', 'DELIVERY']);
    if (!auth.ok) return { success: false, error: auth.error };

    const dateFilter = buildDateFilter(filters, 'createdAt');

    const jobs = await db.deliveryJob.findMany({
      where: dateFilter,
      include: {
        order: { select: { orderCode: true, debtAmount: true, customer: { select: { name: true } } } },
        assignedTo: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    let codPending = 0;
    jobs.forEach(j => {
      if (j.status !== 'COMPLETED' && j.status !== 'CANCELLED' && j.order?.debtAmount > 0 && j.deliveryMethod === 'COD') {
        codPending += j.order.debtAmount;
      }
    });

    const kpi = {
      total: jobs.length,
      pending: jobs.filter(j => j.status === 'PENDING').length,
      inTransit: jobs.filter(j => j.status === 'IN_TRANSIT').length,
      completed: jobs.filter(j => j.status === 'COMPLETED').length,
      failed: jobs.filter(j => j.status === 'FAILED').length,
      codPending
    };

    return { success: true, data: { list: jobs, kpi } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// 7. Quote Report
export async function getQuoteReport(filters: any) {
  try {
    const auth = await checkReportAuth(['ADMIN', 'MANAGER', 'SALES']);
    if (!auth.ok) return { success: false, error: auth.error };

    const { role, id } = auth.user!;
    let whereClause: any = buildDateFilter(filters, 'createdAt');

    if (role === 'SALES') {
      whereClause.assignedSalesId = id;
    } else if (filters.salesId && filters.salesId !== 'ALL') {
      whereClause.assignedSalesId = filters.salesId;
    }

    const quotes = await db.quote.findMany({
      where: whereClause,
      include: {
        customer: { select: { name: true } },
        assignedSales: { select: { name: true } }
      },
      orderBy: { createdAt: 'desc' },
      take: 100
    });

    const kpi = {
      total: quotes.length,
      draft: quotes.filter(q => q.status === 'DRAFT').length,
      sent: quotes.filter(q => q.status === 'SENT').length,
      converted: quotes.filter(q => q.status === 'CONVERTED').length,
      rejected: quotes.filter(q => q.status === 'REJECTED').length,
      conversionRate: quotes.length > 0 ? (quotes.filter(q => q.status === 'CONVERTED').length / quotes.length) * 100 : 0
    };

    return { success: true, data: { list: quotes, kpi } };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}
