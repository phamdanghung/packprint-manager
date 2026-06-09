import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash } from 'lucide-react';
import RecipeManagementClient from './recipe-client';

export default async function MaterialDetailPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return <div>Không có quyền truy cập</div>;

  const { id } = await params;
  const item = await db.inventoryItem.findUnique({
    where: { id },
    include: {
      recipesAsFrom: {
        include: { toMaterial: true }
      },
      recipesAsTo: {
        include: { fromMaterial: true }
      }
    }
  });

  if (!item) return <div className="p-8">Không tìm thấy vật tư</div>;

  const allItems = await db.inventoryItem.findMany({
    where: { category: 'PAPER', status: 'ACTIVE', id: { not: item.id } },
    select: { id: true, name: true, stockBaseUnit: true }
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-800">Chi tiết vật tư: {item.name}</h1>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div>
            <p className="text-xs text-slate-500">Mã vật tư</p>
            <p className="font-medium">{item.itemCode}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Loại</p>
            <p className="font-medium">{item.category}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Tồn kho (Base)</p>
            <p className="font-medium">{item.currentStockBase} {item.stockBaseUnit}</p>
          </div>
          <div>
            <p className="text-xs text-slate-500">Đơn vị chuẩn</p>
            <p className="font-medium">{item.unit}</p>
          </div>
        </div>
      </div>

      <RecipeManagementClient material={item} allItems={allItems} userRole={user.role} />
    </div>
  );
}
