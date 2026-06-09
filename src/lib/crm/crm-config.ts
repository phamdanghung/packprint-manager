export const CRM_CONFIG = {
  reactivationEnabled: true,
  reactivationReminderDays1: 30, // Nhắc nhẹ
  reactivationReminderDays2: 60, // Cảnh báo cần chăm sóc
  reactivationReminderDays3: 90, // Nguy cơ mất khách
  reactivationInactiveDays: 180, // Khách ngủ đông
  reactivationSuppressAfterDismissDays: 14 // Không tạo lại task sau dismiss
};

export type ReactivationLevel = 
  | 'NONE'
  | 'NO_ORDER_30_DAYS'
  | 'NO_ORDER_60_DAYS'
  | 'NO_ORDER_90_DAYS'
  | 'INACTIVE_CUSTOMER';

export interface ReactivationStatus {
  level: ReactivationLevel;
  daysSinceLastOrder: number | null;
  label: string;
  severity: 'normal' | 'warning' | 'danger' | 'critical';
  shouldCreateTask: boolean;
  reason: string;
}

export function getCustomerReactivationStatus(customer: {
  lastOrderAt?: Date | null;
  lastContactAt?: Date | null;
  reactivationDismissedAt?: Date | null;
}): ReactivationStatus {
  if (!customer.lastOrderAt) {
    return {
      level: 'NONE',
      daysSinceLastOrder: null,
      label: 'Chưa từng mua hàng',
      severity: 'normal',
      shouldCreateTask: false,
      reason: 'Khách chưa có order nào'
    };
  }

  const now = new Date();
  const diffTime = Math.abs(now.getTime() - customer.lastOrderAt.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  // Check suppress period
  if (customer.reactivationDismissedAt) {
    const dismissDiffTime = Math.abs(now.getTime() - customer.reactivationDismissedAt.getTime());
    const dismissDiffDays = Math.ceil(dismissDiffTime / (1000 * 60 * 60 * 24));
    if (dismissDiffDays <= CRM_CONFIG.reactivationSuppressAfterDismissDays) {
      return {
        level: 'NONE',
        daysSinceLastOrder: diffDays,
        label: 'Đã tạm ẩn cảnh báo',
        severity: 'normal',
        shouldCreateTask: false,
        reason: 'Nằm trong thời gian suppress sau khi dismiss'
      };
    }
  }

  // Check if recently contacted
  let contactedRecently = false;
  if (customer.lastContactAt) {
    const contactDiffTime = Math.abs(now.getTime() - customer.lastContactAt.getTime());
    const contactDiffDays = Math.ceil(contactDiffTime / (1000 * 60 * 60 * 24));
    if (contactDiffDays <= 7) {
      contactedRecently = true;
    }
  }

  let level: ReactivationLevel = 'NONE';
  let label = '';
  let severity: 'normal' | 'warning' | 'danger' | 'critical' = 'normal';
  let shouldCreateTask = !contactedRecently; // If contacted recently, don't auto create a NEW task, just show status
  let reason = '';

  if (diffDays >= CRM_CONFIG.reactivationInactiveDays) {
    level = 'INACTIVE_CUSTOMER';
    label = 'Khách ngủ đông (180+ ngày)';
    severity = 'critical';
    reason = `Chưa đặt hàng ${diffDays} ngày (Ngủ đông)`;
  } else if (diffDays >= CRM_CONFIG.reactivationReminderDays3) {
    level = 'NO_ORDER_90_DAYS';
    label = 'Nguy cơ mất khách (90+ ngày)';
    severity = 'danger';
    reason = `Chưa đặt hàng ${diffDays} ngày (Nguy cơ cao)`;
  } else if (diffDays >= CRM_CONFIG.reactivationReminderDays2) {
    level = 'NO_ORDER_60_DAYS';
    label = 'Cần chăm sóc lại (60+ ngày)';
    severity = 'warning';
    reason = `Chưa đặt hàng ${diffDays} ngày (Cảnh báo)`;
  } else if (diffDays >= CRM_CONFIG.reactivationReminderDays1) {
    level = 'NO_ORDER_30_DAYS';
    label = 'Lâu chưa đặt lại (30+ ngày)';
    severity = 'warning';
    reason = `Chưa đặt hàng ${diffDays} ngày (Nhắc nhẹ)`;
  } else {
    return {
      level: 'NONE',
      daysSinceLastOrder: diffDays,
      label: 'Bình thường',
      severity: 'normal',
      shouldCreateTask: false,
      reason: 'Đã đặt hàng gần đây'
    };
  }

  return {
    level,
    daysSinceLastOrder: diffDays,
    label,
    severity,
    shouldCreateTask,
    reason
  };
}
