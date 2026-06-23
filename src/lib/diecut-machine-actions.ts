'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

async function checkAuth(roles: string[] = ALLOWED_ROLES) {
  const user = await getCurrentUser();
  if (!user) {
    return { ok: false, error: 'Chưa đăng nhập.' } as const;
  }
  if (!roles.includes(user.role)) {
    return { ok: false, error: 'Bạn không có quyền thực hiện thao tác này.' } as const;
  }
  return { ok: true, user } as const;
}

// A. Management Actions
export async function getDieCutMachineConfigs() {
  const auth = await checkAuth(['ADMIN', 'MANAGER', 'ACCOUNTANT']);
  if (!auth.ok) throw new Error(auth.error);
  return db.dieCutMachineConfig.findMany({ orderBy: { machineCode: 'asc' } });
}

export async function createDieCutMachineConfig(data: {
  machineCode: string;
  machineName: string;
  sheetSizeCode: string;
  sheetLabel: string;
  sheetWidthCm: number;
  sheetHeightCm: number;
  usableWidthCm: number;
  usableHeightCm: number;
  note?: string;
}) {
  const auth = await checkAuth(['ADMIN', 'MANAGER']);
  if (!auth.ok) return { success: false, error: auth.error };

  // 1. Normalize
  const normalizedCode = data.machineCode.trim().toUpperCase();
  const normalizedSize = data.sheetSizeCode.toLowerCase().replace(/\s+/g, '').replace(/cm$/g, '');

  if (!normalizedCode) return { success: false, error: 'Mã máy bế là bắt buộc.' };
  if (!data.machineName.trim()) return { success: false, error: 'Tên máy bế là bắt buộc.' };
  if (!normalizedSize) return { success: false, error: 'Khổ in là bắt buộc.' };
  if (!data.sheetLabel.trim()) return { success: false, error: 'Nhãn khổ in là bắt buộc.' };

  // 2. Validate Sizing Constraints
  if (data.sheetWidthCm <= 0 || data.sheetHeightCm <= 0) {
    return { success: false, error: 'Kích thước khổ in phải lớn hơn 0.' };
  }
  if (data.usableWidthCm <= 0 || data.usableHeightCm <= 0) {
    return { success: false, error: 'Kích thước vùng bế khả dụng phải lớn hơn 0.' };
  }
  if (data.usableWidthCm > data.sheetWidthCm) {
    return { success: false, error: 'Chiều rộng vùng bế khả dụng không được lớn hơn chiều rộng khổ in.' };
  }
  if (data.usableHeightCm > data.sheetHeightCm) {
    return { success: false, error: 'Chiều cao vùng bế khả dụng không được lớn hơn chiều cao khổ in.' };
  }

  try {
    // 3. Unique Constraint Policy (Check both active and inactive)
    const exists = await db.dieCutMachineConfig.findFirst({
      where: {
        machineCode: normalizedCode,
        sheetSizeCode: normalizedSize,
      }
    });
    if (exists) {
      return { success: false, error: `Cấu hình cho máy "${normalizedCode}" và khổ "${normalizedSize}" đã tồn tại.` };
    }

    const config = await db.dieCutMachineConfig.create({
      data: {
        machineCode: normalizedCode,
        machineName: data.machineName.trim(),
        sheetSizeCode: normalizedSize,
        sheetLabel: data.sheetLabel.trim(),
        sheetWidthCm: data.sheetWidthCm,
        sheetHeightCm: data.sheetHeightCm,
        usableWidthCm: data.usableWidthCm,
        usableHeightCm: data.usableHeightCm,
        isActive: true,
        note: data.note?.trim() || null,
      }
    });
    return { success: true, data: config };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cơ sở dữ liệu.' };
  }
}

export async function updateDieCutMachineConfig(id: string, data: {
  machineName: string;
  sheetLabel: string;
  sheetWidthCm: number;
  sheetHeightCm: number;
  usableWidthCm: number;
  usableHeightCm: number;
  note?: string;
  machineCode?: string;
  sheetSizeCode?: string;
}) {
  const auth = await checkAuth(['ADMIN', 'MANAGER']);
  if (!auth.ok) return { success: false, error: auth.error };

  // Sizing checks
  if (data.sheetWidthCm <= 0 || data.sheetHeightCm <= 0) {
    return { success: false, error: 'Kích thước khổ in phải lớn hơn 0.' };
  }
  if (data.usableWidthCm <= 0 || data.usableHeightCm <= 0) {
    return { success: false, error: 'Kích thước vùng bế khả dụng phải lớn hơn 0.' };
  }
  if (data.usableWidthCm > data.sheetWidthCm) {
    return { success: false, error: 'Chiều rộng vùng bế khả dụng không được lớn hơn chiều rộng khổ in.' };
  }
  if (data.usableHeightCm > data.sheetHeightCm) {
    return { success: false, error: 'Chiều cao vùng bế khả dụng không được lớn hơn chiều cao khổ in.' };
  }

  // Fetch current config
  const current = await db.dieCutMachineConfig.findUnique({ where: { id } });
  if (!current) return { success: false, error: 'Không tìm thấy cấu hình.' };

  const normalizedCode = data.machineCode ? data.machineCode.trim().toUpperCase() : current.machineCode;
  const normalizedSize = data.sheetSizeCode ? data.sheetSizeCode.toLowerCase().replace(/\s+/g, '').replace(/cm$/g, '') : current.sheetSizeCode;

  try {
    // Unique check excluding current id
    const exists = await db.dieCutMachineConfig.findFirst({
      where: {
        machineCode: normalizedCode,
        sheetSizeCode: normalizedSize,
        id: { not: id }
      }
    });
    if (exists) {
      return { success: false, error: `Cấu hình cho máy "${normalizedCode}" và khổ "${normalizedSize}" đã tồn tại ở bản ghi khác.` };
    }

    const updated = await db.dieCutMachineConfig.update({
      where: { id },
      data: {
        machineCode: normalizedCode,
        machineName: data.machineName.trim(),
        sheetSizeCode: normalizedSize,
        sheetLabel: data.sheetLabel.trim(),
        sheetWidthCm: data.sheetWidthCm,
        sheetHeightCm: data.sheetHeightCm,
        usableWidthCm: data.usableWidthCm,
        usableHeightCm: data.usableHeightCm,
        note: data.note?.trim() || null,
      }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cập nhật.' };
  }
}

export async function toggleDieCutMachineConfigStatus(id: string) {
  const auth = await checkAuth(['ADMIN', 'MANAGER']);
  if (!auth.ok) return { success: false, error: auth.error };

  const current = await db.dieCutMachineConfig.findUnique({ where: { id } });
  if (!current) return { success: false, error: 'Không tìm thấy cấu hình.' };

  try {
    const updated = await db.dieCutMachineConfig.update({
      where: { id },
      data: { isActive: !current.isActive }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi thay đổi trạng thái.' };
  }
}

// B. Quote-safe Read Action
export async function getActiveDieCutMachineOptionsForQuote() {
  const user = await getCurrentUser();
  if (!user) {
    throw new Error('Chưa đăng nhập.');
  }

  const configs = await db.dieCutMachineConfig.findMany({
    where: { isActive: true },
    select: {
      machineCode: true,
      machineName: true,
      sheetSizeCode: true,
      sheetLabel: true,
      sheetWidthCm: true,
      sheetHeightCm: true,
      usableWidthCm: true,
      usableHeightCm: true,
    },
    orderBy: [
      { sheetSizeCode: 'asc' },
      { machineCode: 'asc' }
    ]
  });

  return configs;
}
