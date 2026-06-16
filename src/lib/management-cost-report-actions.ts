'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

export type ReportPeriodType = "WEEK" | "MONTH" | "QUARTER" | "YEAR" | "CUSTOM";

export type ManagementCostReportFilter = {
  periodType?: ReportPeriodType;
  fromDate?: string; // ISO date string
  toDate?: string;   // ISO date string
  customerId?: string;
  orderStatus?: string;
  productionJobStatus?: string;
};

export type ManagementCostReportRow = {
  orderId: string;
  orderCode: string;
  customerName: string | null;
  orderStatus: string;
  productionJobId: string | null;
  productionJobStatus: string | null;

  totalAmount: number;
  actualMaterialCost: number;
  actualAdditionalCost: number;
  actualProductionCost: number;
  grossProfit: number;
  grossMarginPercent: number;

  warnings: {
    lowMargin: boolean;
    highProductionCost: boolean;
    hasCancelledCostLines: boolean;
    missingCostData: boolean;
  };
};

export type ManagementCostReportResponse = {
  success: true;
  canViewCost: true;
  period: {
    periodType: ReportPeriodType;
    fromDate: string;
    toDate: string;
    label: string;
  };
  summary: {
    totalRevenue: number;
    totalActualMaterialCost: number;
    totalActualAdditionalCost: number;
    totalActualProductionCost: number;
    totalGrossProfit: number;
    grossMarginPercent: number;
    totalOrders: number;
    totalProductionJobs: number;
    lowMarginOrderCount: number;
    highProductionCostOrderCount: number;
    missingCostDataOrderCount: number;
    cancelledCostLineOrderCount: number;
  };
  rows: ManagementCostReportRow[];
};

export type ManagementCostReportForbiddenResponse = {
  success: false;
  error: 'PERMISSION_DENIED';
};

const LOW_MARGIN_PERCENT = 20;
const HIGH_PRODUCTION_COST_RATIO_PERCENT = 80;

function checkCostPermission(role: string): boolean {
  return ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(role);
}

function getPeriodDates(periodType: ReportPeriodType, customFrom?: string, customTo?: string) {
  const now = new Date();
  let fromDate = new Date();
  let toDate = new Date();
  let label = '';

  switch (periodType) {
    case 'WEEK': {
      // Monday to Sunday of current week
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // adjust when day is sunday
      fromDate = new Date(now.getFullYear(), now.getMonth(), diff);
      fromDate.setHours(0, 0, 0, 0);
      
      toDate = new Date(fromDate);
      toDate.setDate(fromDate.getDate() + 6);
      toDate.setHours(23, 59, 59, 999);
      label = 'Tuần này';
      break;
    }
    case 'MONTH': {
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate.setHours(0, 0, 0, 0);
      
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      toDate.setHours(23, 59, 59, 999);
      label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
      break;
    }
    case 'QUARTER': {
      const quarter = Math.floor(now.getMonth() / 3);
      fromDate = new Date(now.getFullYear(), quarter * 3, 1);
      fromDate.setHours(0, 0, 0, 0);
      
      toDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
      toDate.setHours(23, 59, 59, 999);
      label = `Quý ${quarter + 1}/${now.getFullYear()}`;
      break;
    }
    case 'YEAR': {
      fromDate = new Date(now.getFullYear(), 0, 1);
      fromDate.setHours(0, 0, 0, 0);
      
      toDate = new Date(now.getFullYear(), 11, 31);
      toDate.setHours(23, 59, 59, 999);
      label = `Năm ${now.getFullYear()}`;
      break;
    }
    case 'CUSTOM': {
      if (customFrom) {
        fromDate = new Date(customFrom);
        fromDate.setHours(0, 0, 0, 0);
      } else {
        fromDate = new Date(0); // far past
      }
      
      if (customTo) {
        toDate = new Date(customTo);
        toDate.setHours(23, 59, 59, 999);
      } else {
        toDate = new Date();
        toDate.setHours(23, 59, 59, 999);
      }
      label = 'Tùy chọn';
      break;
    }
    default: {
      // Fallback to MONTH
      fromDate = new Date(now.getFullYear(), now.getMonth(), 1);
      fromDate.setHours(0, 0, 0, 0);
      toDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      toDate.setHours(23, 59, 59, 999);
      label = `Tháng ${now.getMonth() + 1}/${now.getFullYear()}`;
      break;
    }
  }

  return { fromDate, toDate, label };
}

export async function getManagementCostReport(
  filters: ManagementCostReportFilter
): Promise<ManagementCostReportResponse | ManagementCostReportForbiddenResponse> {
  const user = await getCurrentUser();
  if (!user || !checkCostPermission(user.role)) {
    return { success: false, error: 'PERMISSION_DENIED' };
  }

  const periodType = filters.periodType || 'MONTH';
  const { fromDate, toDate, label } = getPeriodDates(periodType, filters.fromDate, filters.toDate);

  // 1. Fetch Orders within date range
  const orderWhere: any = {
    createdAt: {
      gte: fromDate,
      lte: toDate
    }
  };

  if (filters.customerId) orderWhere.customerId = filters.customerId;
  if (filters.orderStatus) orderWhere.status = filters.orderStatus;
  
  const orders = await db.order.findMany({
    where: orderWhere,
    include: {
      customer: true,
      productionJob: {
        include: {
          costLines: true, // fetch all to separate active/cancelled
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });

  // Extract all job IDs to fetch PXKs
  const allJobIds = orders.filter(o => o.productionJob).map(o => o.productionJob!.id);
  
  const pxks = await db.inventoryOutboundReceipt.findMany({
    where: {
      productionJobId: { in: allJobIds },
      outboundType: 'PRODUCTION_ISSUE',
      status: 'COMPLETED'
    },
    include: {
      items: true
    }
  });

  const pxksByJobId: Record<string, typeof pxks> = {};
  for (const pxk of pxks) {
    if (pxk.productionJobId) {
      if (!pxksByJobId[pxk.productionJobId]) pxksByJobId[pxk.productionJobId] = [];
      pxksByJobId[pxk.productionJobId].push(pxk);
    }
  }

  const rows: ManagementCostReportRow[] = [];
  const summary = {
    totalRevenue: 0,
    totalActualMaterialCost: 0,
    totalActualAdditionalCost: 0,
    totalActualProductionCost: 0,
    totalGrossProfit: 0,
    grossMarginPercent: 0,
    totalOrders: 0,
    totalProductionJobs: 0,
    lowMarginOrderCount: 0,
    highProductionCostOrderCount: 0,
    missingCostDataOrderCount: 0,
    cancelledCostLineOrderCount: 0
  };

  for (const order of orders) {
    const revenue = order.totalAmount || 0;
    
    // Filter productionJobStatus if requested
    let jobToProcess = order.productionJob;
    if (filters.productionJobStatus && jobToProcess) {
      if (jobToProcess.status !== filters.productionJobStatus) {
        // Skip this order if it has a job but doesn't match the filter
        continue;
      }
    }

    summary.totalOrders++;

    let orderActualMaterialCost = 0;
    let orderActualAdditionalCost = 0;
    let hasCancelledCostLines = false;
    let hasCompletedPxk = false;
    let hasActiveCostLines = false;

    if (jobToProcess) {
      summary.totalProductionJobs++;

      // Material cost from COMPLETED PXK
      const jobPxks = pxksByJobId[jobToProcess.id] || [];
      for (const pxk of jobPxks) {
        hasCompletedPxk = true;
        for (const item of pxk.items) {
          orderActualMaterialCost += (item.totalCost || 0);
        }
      }

      // Additional cost from ACTIVE CostLines
      for (const costLine of jobToProcess.costLines) {
        if (costLine.status === 'ACTIVE') {
          hasActiveCostLines = true;
          orderActualAdditionalCost += costLine.totalCost;
        } else if (costLine.status === 'CANCELLED') {
          hasCancelledCostLines = true;
        }
      }
    }

    const actualProductionCost = orderActualMaterialCost + orderActualAdditionalCost;
    const grossProfit = revenue - actualProductionCost;
    const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;

    // Warnings
    const lowMargin = grossMarginPercent < LOW_MARGIN_PERCENT;
    const highProductionCost = revenue > 0 && (actualProductionCost / revenue) * 100 > HIGH_PRODUCTION_COST_RATIO_PERCENT;
    const missingCostData = !!jobToProcess && !hasCompletedPxk && !hasActiveCostLines;

    if (lowMargin) summary.lowMarginOrderCount++;
    if (highProductionCost) summary.highProductionCostOrderCount++;
    if (hasCancelledCostLines) summary.cancelledCostLineOrderCount++;
    if (missingCostData) summary.missingCostDataOrderCount++;

    summary.totalRevenue += revenue;
    summary.totalActualMaterialCost += orderActualMaterialCost;
    summary.totalActualAdditionalCost += orderActualAdditionalCost;
    summary.totalActualProductionCost += actualProductionCost;

    rows.push({
      orderId: order.id,
      orderCode: order.orderCode,
      customerName: order.customer?.name || null,
      orderStatus: order.status,
      productionJobId: jobToProcess ? jobToProcess.id : null,
      productionJobStatus: jobToProcess ? jobToProcess.status : null,
      totalAmount: revenue,
      actualMaterialCost: orderActualMaterialCost,
      actualAdditionalCost: orderActualAdditionalCost,
      actualProductionCost: actualProductionCost,
      grossProfit: grossProfit,
      grossMarginPercent: grossMarginPercent,
      warnings: {
        lowMargin,
        highProductionCost,
        hasCancelledCostLines,
        missingCostData
      }
    });
  }

  summary.totalGrossProfit = summary.totalRevenue - summary.totalActualProductionCost;
  summary.grossMarginPercent = summary.totalRevenue > 0 ? (summary.totalGrossProfit / summary.totalRevenue) * 100 : 0;

  return {
    success: true,
    canViewCost: true,
    period: {
      periodType,
      fromDate: fromDate.toISOString(),
      toDate: toDate.toISOString(),
      label
    },
    summary,
    rows
  };
}
