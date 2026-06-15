'use server';

import { db } from '@/lib/db';
import { checkInventoryAccess } from '@/lib/inventory-actions';
import { revalidatePath } from 'next/cache';

import { validateRecipeInput, extractMaterialInfo } from '@/lib/inventory-recipe-validation';


export async function createRecipe(data: { fromMaterialId: string, toMaterialId: string, piecesPerParentSheet: number }) {
  const user = await checkInventoryAccess();
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) throw new Error('Không có quyền tạo định mức');
  
  if (data.fromMaterialId === data.toMaterialId) throw new Error('Vật tư mẹ và vật tư con không được trùng nhau');
  if (!Number.isInteger(data.piecesPerParentSheet) || data.piecesPerParentSheet <= 0) throw new Error('Số tờ cắt ra phải là số nguyên dương lớn hơn 0');

  const fromMaterial = await db.inventoryItem.findUnique({ where: { id: data.fromMaterialId } });
  const toMaterial = await db.inventoryItem.findUnique({ where: { id: data.toMaterialId } });

  if (!fromMaterial || !toMaterial) throw new Error('Không tìm thấy vật tư');
  if (fromMaterial.id === toMaterial.id) throw new Error('Vật tư mẹ và con không được giống nhau');
  if (fromMaterial.stockBaseUnit !== 'SHEET' || toMaterial.stockBaseUnit !== 'SHEET') throw new Error('Chỉ hỗ trợ tạo định mức cho vật tư tính bằng tờ (SHEET)');
  const validation = validateRecipeInput(fromMaterial, toMaterial, data.piecesPerParentSheet);
  if (!validation.valid) {
    throw new Error(validation.reason);
  }

  const fromInfo = extractMaterialInfo(fromMaterial.name);
  const toInfo = extractMaterialInfo(toMaterial.name);

  const existing = await db.materialConversionRecipe.findFirst({
    where: {
      fromMaterialId: data.fromMaterialId,
      toMaterialId: data.toMaterialId,
      isActive: true
    }
  });
  if (existing) throw new Error('Đã tồn tại định mức đang hoạt động cho cặp vật tư này');

  const newRecipe = await db.materialConversionRecipe.create({
    data: {
      fromMaterialId: data.fromMaterialId,
      toMaterialId: data.toMaterialId,
      piecesPerParentSheet: data.piecesPerParentSheet,
      fromWidthCm: fromInfo.widthCm || null,
      fromHeightCm: fromInfo.heightCm || null,
      toWidthCm: toInfo.widthCm || null,
      toHeightCm: toInfo.heightCm || null,
    }
  });
  revalidatePath('/dashboard/inventory/materials');
  return { success: true, id: newRecipe.id };
}

export async function deleteRecipe(id: string) {
  const user = await checkInventoryAccess();
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) throw new Error('Không có quyền sửa định mức');

  await db.materialConversionRecipe.update({ where: { id }, data: { isActive: false } });
  revalidatePath('/dashboard/inventory/materials');
  return { success: true };
}

export async function toggleRecipe(id: string, isActive: boolean) {
  const user = await checkInventoryAccess();
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) throw new Error('Không có quyền sửa định mức');

  if (isActive) {
    const recipe = await db.materialConversionRecipe.findUnique({ where: { id } });
    if (recipe) {
      const existing = await db.materialConversionRecipe.findFirst({
        where: {
          fromMaterialId: recipe.fromMaterialId,
          toMaterialId: recipe.toMaterialId,
          isActive: true,
          id: { not: id }
        }
      });
      if (existing) throw new Error('Đã tồn tại định mức đang hoạt động cho cặp vật tư này');
    }
  }

  await db.materialConversionRecipe.update({ where: { id }, data: { isActive } });
  revalidatePath('/dashboard/inventory/materials');
  return { success: true };
}
