'use server';

import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { safeRevalidatePath } from '@/lib/safe-revalidate';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER', 'ACCOUNTANT'];

/**
 * Returns margin alerts dynamically calculated based on existing orders.
 */
export async function getManagementMarginAlerts(options?: {
  periodType?: 'MONTH' | 'QUARTER' | 'YEAR' | 'ALL';
  statusFilter?: 'ALL' | 'UNREVIEWED' | 'NEEDS_ACTION' | 'REVIEWED';
}) {
  try {
    const user = await getCurrentUser();
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: 'PERMISSION_DENIED' };
    }

    const { periodType = 'MONTH', statusFilter = 'ALL' } = options || {};

    // 1. Determine Date Range for periodType if not ALL
    const now = new Date();
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (periodType === 'MONTH') {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (periodType === 'QUARTER') {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), currentQuarter * 3, 1);
      endDate = new Date(now.getFullYear(), currentQuarter * 3 + 3, 0, 23, 59, 59, 999);
    } else if (periodType === 'YEAR') {
      startDate = new Date(now.getFullYear(), 0, 1);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
    }

    // 2. Fetch completed orders in date range with relevant relations
    const orders = await db.order.findMany({
      where: {
        status: 'COMPLETED',
        ...(startDate && endDate ? { createdAt: { gte: startDate, lte: endDate } } : {})
      },
      include: {
        customer: true,
        productionJob: {
          include: {
            costLines: true
          }
        },
        managementMarginReviewedBy: true
      },
      orderBy: { createdAt: 'desc' }
    });

    const allJobIds = orders.filter(o => o.productionJob).map(o => o.productionJob!.id);
    const pxks = await db.inventoryOutboundReceipt.findMany({
      where: {
        productionJobId: { in: allJobIds },
        outboundType: 'PRODUCTION_ISSUE'
      },
      include: { items: true }
    });

    const pxksByJobId: Record<string, typeof pxks> = {};
    for (const pxk of pxks) {
      if (pxk.productionJobId) {
        if (!pxksByJobId[pxk.productionJobId]) pxksByJobId[pxk.productionJobId] = [];
        pxksByJobId[pxk.productionJobId].push(pxk);
      }
    }

    const results: any[] = [];

    for (const order of orders) {
      const revenue = order.totalAmount || 0;
      let actualMaterialCost = 0;
      let actualAdditionalCost = 0;
      let hasCancelledCostLine = false;
      let hasInProgressPxk = false;

      // Calculate material cost
      if (order.productionJob) {
        const jobPxks = pxksByJobId[order.productionJob.id] || [];

        for (const r of jobPxks) {
          if (r.status === 'COMPLETED') {
            for (const item of r.items) {
              actualMaterialCost += (item.totalCost || 0);
            }
          } else if (r.status === 'IN_PROGRESS') {
            hasInProgressPxk = true;
          }
        }

        // Calculate additional cost
        for (const line of order.productionJob.costLines) {
          if (line.status === 'ACTIVE') {
            actualAdditionalCost += (line.totalCost || 0);
          } else if (line.status === 'CANCELLED') {
            hasCancelledCostLine = true;
          }
        }
      }

      const totalActualProductionCost = actualMaterialCost + actualAdditionalCost;
      const grossProfit = revenue - totalActualProductionCost;
      const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : undefined;

      // 3. Evaluate Alerts
      const alerts: string[] = [];

      // Alert Priority: LOW_MARGIN wins over HIGH_PRODUCTION_COST to avoid duplicate noise
      const isLowMargin = grossMarginPercent !== undefined && grossMarginPercent < 20;
      const isHighCost = revenue > 0 && totalActualProductionCost > (0.8 * revenue);
      
      if (isLowMargin) {
        alerts.push('LOW_MARGIN');
      } else if (isHighCost) {
        alerts.push('HIGH_PRODUCTION_COST');
      }

      if (revenue === 0 && totalActualProductionCost > 0) {
        alerts.push('MISSING_REVENUE_OR_DATA_ISSUE');
      } else if (revenue > 0 && totalActualProductionCost === 0) {
        alerts.push('MISSING_COST_DATA');
      }

      if (hasCancelledCostLine) {
        alerts.push('CANCELLED_COST_LINE_AUDIT');
      }

      if (hasInProgressPxk) {
        alerts.push('IN_PROGRESS_PXK_INFO');
      }

      // If no alerts, we don't return this order for the review screen
      if (alerts.length === 0) continue;

      // 4. Determine Inferred Status
      const reviewedAt = order.managementMarginReviewedAt;
      const isFlagged = order.managementMarginFlag;
      let inferredStatus = 'UNREVIEWED';

      if (isFlagged) {
        inferredStatus = 'NEEDS_ACTION';
      } else if (reviewedAt) {
        inferredStatus = 'REVIEWED';
      } else {
        inferredStatus = 'UNREVIEWED';
      }

      // 5. Filter by statusFilter
      if (statusFilter !== 'ALL' && inferredStatus !== statusFilter) {
        continue;
      }

      results.push({
        orderId: order.id,
        orderCode: order.orderCode,
        customerName: order.customer.name,
        revenue,
        actualMaterialCost,
        actualAdditionalCost,
        totalActualProductionCost,
        grossProfit,
        grossMarginPercent,
        alerts,
        managementMarginFlag: order.managementMarginFlag,
        managementMarginNote: order.managementMarginNote,
        managementMarginReviewedAt: order.managementMarginReviewedAt,
        managementMarginReviewedById: order.managementMarginReviewedById,
        reviewer: order.managementMarginReviewedBy?.name || null,
        inferredStatus,
        createdAt: order.createdAt
      });
    }

    return { success: true, data: results };

  } catch (error: any) {
    console.error('Error fetching margin alerts:', error);
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}

/**
 * Updates the review status/note of an order's margin alerts.
 */
export async function updateMarginReview(
  orderId: string,
  payload: {
    note?: string;
    actionType: 'MARK_REVIEWED' | 'REQUEST_ACTION';
  }
) {
  try {
    const user = await getCurrentUser();
    if (!user || !ALLOWED_ROLES.includes(user.role)) {
      return { success: false, error: 'PERMISSION_DENIED' };
    }

    const { note, actionType } = payload;

    if (actionType === 'REQUEST_ACTION' && (!note || note.trim() === '')) {
      return { success: false, error: 'NOTE_REQUIRED_FOR_REQUEST_ACTION' };
    }

    const isFlagged = actionType === 'REQUEST_ACTION' ? true : false;

    const updated = await db.order.update({
      where: { id: orderId },
      data: {
        managementMarginFlag: isFlagged,
        managementMarginNote: note?.trim() || null,
        managementMarginReviewedAt: new Date(),
        managementMarginReviewedById: user.id
      }
    });

    safeRevalidatePath('/dashboard/reports/margin-review');
    safeRevalidatePath(`/dashboard/reports/management-costing`);
    
    return { success: true, data: { orderId: updated.id } };

  } catch (error: any) {
    console.error('Error updating margin review:', error);
    return { success: false, error: 'INTERNAL_ERROR' };
  }
}
