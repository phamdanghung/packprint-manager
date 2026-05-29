'use server';

import { db } from './db';
import { getCurrentUser } from './auth';

const ALLOWED_ROLES = ['ADMIN', 'MANAGER'];

async function checkAuth() {
  const user = await getCurrentUser();
  if (!user || !ALLOWED_ROLES.includes(user.role)) {
    return { ok: false, error: 'Bạn không có quyền thực hiện thao tác này.' } as const;
  }
  return { ok: true, user } as const;
}

// ─── MATERIAL ──────────────────────────────────────────────────────────────

export async function getMaterials() {
  const auth = await checkAuth();
  if (!auth.ok) throw new Error(auth.error);
  return db.material.findMany({ orderBy: { materialCode: 'asc' } });
}

export async function createMaterial(data: {
  materialCode: string; name: string; materialType: string;
  sheetWidthCm: number; sheetHeightCm: number; basePrice: number;
  unit?: string; note?: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.materialCode?.trim()) return { success: false, error: 'Mã vật tư là bắt buộc.' };
  if (!data.name?.trim()) return { success: false, error: 'Tên vật tư là bắt buộc.' };
  if (data.basePrice < 0) return { success: false, error: 'Đơn giá phải >= 0.' };
  if (data.sheetWidthCm <= 0 || data.sheetHeightCm <= 0) return { success: false, error: 'Kích thước tờ phải > 0.' };

  try {
    const exists = await db.material.findUnique({ where: { materialCode: data.materialCode.trim() } });
    if (exists) return { success: false, error: `Mã vật tư "${data.materialCode}" đã tồn tại.` };

    const material = await db.material.create({
      data: {
        materialCode: data.materialCode.trim(),
        name: data.name.trim(),
        materialType: data.materialType,
        sheetWidthCm: data.sheetWidthCm,
        sheetHeightCm: data.sheetHeightCm,
        basePrice: data.basePrice,
        unit: data.unit || 'SHEET',
        note: data.note?.trim() || null,
        status: 'ACTIVE',
      }
    });
    return { success: true, data: material };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cơ sở dữ liệu.' };
  }
}

export async function updateMaterial(id: string, data: {
  name: string; materialType: string; sheetWidthCm: number;
  sheetHeightCm: number; basePrice: number; unit?: string; note?: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };

  if (!data.name?.trim()) return { success: false, error: 'Tên vật tư là bắt buộc.' };
  if (data.basePrice < 0) return { success: false, error: 'Đơn giá phải >= 0.' };
  if (data.sheetWidthCm <= 0 || data.sheetHeightCm <= 0) return { success: false, error: 'Kích thước tờ phải > 0.' };

  try {
    const updated = await db.material.update({
      where: { id },
      data: {
        name: data.name.trim(),
        materialType: data.materialType,
        sheetWidthCm: data.sheetWidthCm,
        sheetHeightCm: data.sheetHeightCm,
        basePrice: data.basePrice,
        unit: data.unit || 'SHEET',
        note: data.note?.trim() || null,
      }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cập nhật.' };
  }
}

export async function toggleMaterialStatus(id: string) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  const m = await db.material.findUnique({ where: { id } });
  if (!m) return { success: false, error: 'Không tìm thấy vật tư.' };
  const updated = await db.material.update({ where: { id }, data: { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  return { success: true, data: updated };
}

// ─── LAMINATION PRICE ──────────────────────────────────────────────────────

export async function getLaminationPrices() {
  const auth = await checkAuth();
  if (!auth.ok) throw new Error(auth.error);
  return db.laminationPrice.findMany({ orderBy: { laminationType: 'asc' } });
}

export async function createLaminationPrice(data: {
  name: string; laminationType: string; pricePerSheet: number; note?: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!data.name?.trim()) return { success: false, error: 'Tên cán màng là bắt buộc.' };
  if (!data.laminationType) return { success: false, error: 'Loại cán màng là bắt buộc.' };
  if (data.pricePerSheet < 0) return { success: false, error: 'Đơn giá phải >= 0.' };
  try {
    const created = await db.laminationPrice.create({
      data: { name: data.name.trim(), laminationType: data.laminationType, pricePerSheet: data.pricePerSheet, note: data.note?.trim() || null, status: 'ACTIVE' }
    });
    return { success: true, data: created };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi tạo mới.' };
  }
}

export async function updateLaminationPrice(id: string, data: {
  name: string; laminationType: string; pricePerSheet: number; note?: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!data.name?.trim()) return { success: false, error: 'Tên cán màng là bắt buộc.' };
  if (data.pricePerSheet < 0) return { success: false, error: 'Đơn giá phải >= 0.' };
  try {
    const updated = await db.laminationPrice.update({
      where: { id },
      data: { name: data.name.trim(), laminationType: data.laminationType, pricePerSheet: data.pricePerSheet, note: data.note?.trim() || null }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cập nhật.' };
  }
}

export async function toggleLaminationStatus(id: string) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  const m = await db.laminationPrice.findUnique({ where: { id } });
  if (!m) return { success: false, error: 'Không tìm thấy.' };
  const updated = await db.laminationPrice.update({ where: { id }, data: { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  return { success: true, data: updated };
}

// ─── DIE CUT PRICE ─────────────────────────────────────────────────────────

export async function getDieCutPrices() {
  const auth = await checkAuth();
  if (!auth.ok) throw new Error(auth.error);
  return db.dieCutPrice.findMany({ orderBy: { minSheets: 'asc' } });
}

export async function createDieCutPrice(data: {
  minSheets: number; maxSheets?: number | null; shapeCutPrice: number; straightCutPrice: number;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (data.minSheets < 1) return { success: false, error: 'Số tờ từ phải >= 1.' };
  if (data.maxSheets != null && data.maxSheets < data.minSheets) return { success: false, error: 'Số tờ đến phải >= số tờ từ.' };
  if (data.shapeCutPrice < 0 || data.straightCutPrice < 0) return { success: false, error: 'Giá bế phải >= 0.' };
  try {
    const created = await db.dieCutPrice.create({
      data: { minSheets: data.minSheets, maxSheets: data.maxSheets ?? null, shapeCutPrice: data.shapeCutPrice, straightCutPrice: data.straightCutPrice, status: 'ACTIVE' }
    });
    return { success: true, data: created };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi tạo mới.' };
  }
}

export async function updateDieCutPrice(id: string, data: {
  minSheets: number; maxSheets?: number | null; shapeCutPrice: number; straightCutPrice: number;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (data.minSheets < 1) return { success: false, error: 'Số tờ từ phải >= 1.' };
  if (data.maxSheets != null && data.maxSheets < data.minSheets) return { success: false, error: 'Số tờ đến phải >= số tờ từ.' };
  if (data.shapeCutPrice < 0 || data.straightCutPrice < 0) return { success: false, error: 'Giá bế phải >= 0.' };
  try {
    const updated = await db.dieCutPrice.update({
      where: { id },
      data: { minSheets: data.minSheets, maxSheets: data.maxSheets ?? null, shapeCutPrice: data.shapeCutPrice, straightCutPrice: data.straightCutPrice }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cập nhật.' };
  }
}

export async function toggleDieCutStatus(id: string) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  const m = await db.dieCutPrice.findUnique({ where: { id } });
  if (!m) return { success: false, error: 'Không tìm thấy.' };
  const updated = await db.dieCutPrice.update({ where: { id }, data: { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  return { success: true, data: updated };
}

// ─── PRICING RULE ──────────────────────────────────────────────────────────

export async function getPricingRules() {
  const auth = await checkAuth();
  if (!auth.ok) throw new Error(auth.error);
  return db.pricingRule.findMany({ orderBy: { ruleCode: 'asc' } });
}

export async function updatePricingRule(id: string, data: {
  ruleName: string; description?: string; configJson: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (!data.ruleName?.trim()) return { success: false, error: 'Tên quy tắc là bắt buộc.' };
  try {
    JSON.parse(data.configJson); // validate JSON
  } catch {
    return { success: false, error: 'Cấu hình JSON không hợp lệ.' };
  }
  try {
    const updated = await db.pricingRule.update({
      where: { id },
      data: { ruleName: data.ruleName.trim(), description: data.description?.trim() || null, configJson: data.configJson }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cập nhật.' };
  }
}

export async function togglePricingRuleStatus(id: string) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  const m = await db.pricingRule.findUnique({ where: { id } });
  if (!m) return { success: false, error: 'Không tìm thấy quy tắc.' };
  const updated = await db.pricingRule.update({ where: { id }, data: { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  return { success: true, data: updated };
}

// ─── FILE HANDLING FEE ─────────────────────────────────────────────────────

export async function getFileHandlingFees() {
  const auth = await checkAuth();
  if (!auth.ok) throw new Error(auth.error);
  return db.fileHandlingFee.findMany({ orderBy: { minQuantity: 'asc' } });
}

export async function createFileHandlingFee(data: {
  minQuantity: number; maxQuantity?: number | null; feeAmount: number; note?: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (data.minQuantity < 1) return { success: false, error: 'Số lượng từ phải >= 1.' };
  if (data.maxQuantity != null && data.maxQuantity < data.minQuantity) return { success: false, error: 'Số lượng đến phải >= số lượng từ.' };
  if (data.feeAmount < 0) return { success: false, error: 'Phí phải >= 0.' };
  try {
    const created = await db.fileHandlingFee.create({
      data: { minQuantity: data.minQuantity, maxQuantity: data.maxQuantity ?? null, feeAmount: data.feeAmount, note: data.note?.trim() || null, status: 'ACTIVE' }
    });
    return { success: true, data: created };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi tạo mới.' };
  }
}

export async function updateFileHandlingFee(id: string, data: {
  minQuantity: number; maxQuantity?: number | null; feeAmount: number; note?: string;
}) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  if (data.minQuantity < 1) return { success: false, error: 'Số lượng từ phải >= 1.' };
  if (data.maxQuantity != null && data.maxQuantity < data.minQuantity) return { success: false, error: 'Số lượng đến phải >= số lượng từ.' };
  if (data.feeAmount < 0) return { success: false, error: 'Phí phải >= 0.' };
  try {
    const updated = await db.fileHandlingFee.update({
      where: { id },
      data: { minQuantity: data.minQuantity, maxQuantity: data.maxQuantity ?? null, feeAmount: data.feeAmount, note: data.note?.trim() || null }
    });
    return { success: true, data: updated };
  } catch (e: any) {
    return { success: false, error: e.message || 'Lỗi cập nhật.' };
  }
}

export async function toggleFileHandlingFeeStatus(id: string) {
  const auth = await checkAuth();
  if (!auth.ok) return { success: false, error: auth.error };
  const m = await db.fileHandlingFee.findUnique({ where: { id } });
  if (!m) return { success: false, error: 'Không tìm thấy.' };
  const updated = await db.fileHandlingFee.update({ where: { id }, data: { status: m.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE' } });
  return { success: true, data: updated };
}
