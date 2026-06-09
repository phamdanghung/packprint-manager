'use server';

import { db } from '@/lib/db';
import { checkInventoryAccess } from '@/lib/inventory-actions';
import { revalidatePath } from 'next/cache';

export async function createRecipe(data: { fromMaterialId: string, toMaterialId: string, piecesPerParentSheet: number }) {
  const user = await checkInventoryAccess();
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) throw new Error('Không có quyền tạo định mức');
  
  await db.materialConversionRecipe.create({
    data: {
      fromMaterialId: data.fromMaterialId,
      toMaterialId: data.toMaterialId,
      piecesPerParentSheet: data.piecesPerParentSheet,
    }
  });
  revalidatePath('/dashboard/inventory/materials');
  return { success: true };
}

export async function deleteRecipe(id: string) {
  const user = await checkInventoryAccess();
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) throw new Error('Không có quyền xóa định mức');

  await db.materialConversionRecipe.delete({ where: { id } });
  revalidatePath('/dashboard/inventory/materials');
  return { success: true };
}

export async function toggleRecipe(id: string, isActive: boolean) {
  const user = await checkInventoryAccess();
  if (['SALES', 'DESIGNER', 'DELIVERY'].includes(user.role)) throw new Error('Không có quyền sửa định mức');

  await db.materialConversionRecipe.update({ where: { id }, data: { isActive } });
  revalidatePath('/dashboard/inventory/materials');
  return { success: true };
}
