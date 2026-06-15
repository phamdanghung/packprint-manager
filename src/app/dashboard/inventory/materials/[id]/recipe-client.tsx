'use client';

import React, { useState } from 'react';
import { Plus, Trash, Power, PowerOff } from 'lucide-react';
import { createRecipe, deleteRecipe, toggleRecipe } from './actions';
import { useRouter } from 'next/navigation';

export default function RecipeManagementClient({ material, allItems, userRole }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const canEdit = ['ADMIN', 'MANAGER'].includes(userRole);

  // Hàm hỗ trợ lọc material
  const isDecal = (name: string) => name.toLowerCase().includes('decal');
  const getGsm = (name: string) => {
    const match = name.match(/\d{3}/);
    return match ? parseInt(match[0]) : null;
  };
  const getDims = (name: string) => {
    const dimMatch = name.match(/(\d+(?:\.\d+)?)\s*[xX]\s*(\d+(?:\.\d+)?)/);
    if (!dimMatch) return null;
    const w = parseFloat(dimMatch[1]);
    const h = parseFloat(dimMatch[2]);
    return { w: Math.min(w, h), h: Math.max(w, h) };
  };

  const matIsDecal = isDecal(material.name);
  const matGsm = getGsm(material.name);
  const matDims = getDims(material.name);

  const validItemsAsParent = allItems.filter((i: any) => {
    if (i.id === material.id || i.stockBaseUnit !== 'SHEET' || i.category !== material.category || i.materialType !== material.materialType) return false;
    if (isDecal(i.name) !== matIsDecal) return false;
    if (getGsm(i.name) !== matGsm) return false;
    const iDims = getDims(i.name);
    // Parent (material) must be larger than Child (i)
    if (matDims && iDims) {
      if (matDims.w < iDims.w || matDims.h < iDims.h) return false;
    }
    return true;
  });

  const validItemsAsChild = allItems.filter((i: any) => {
    if (i.id === material.id || i.stockBaseUnit !== 'SHEET' || i.category !== material.category || i.materialType !== material.materialType) return false;
    if (isDecal(i.name) !== matIsDecal) return false;
    if (getGsm(i.name) !== matGsm) return false;
    const iDims = getDims(i.name);
    // Parent (i) must be larger than Child (material)
    if (matDims && iDims) {
      if (iDims.w < matDims.w || iDims.h < matDims.h) return false;
    }
    return true;
  });

  const handleCreateAsParent = async (e: any) => {
    e.preventDefault();
    if (!confirm('Tạo định mức mới?')) return;
    setLoading(true);
    const fd = new FormData(e.target);
    try {
      await createRecipe({
        fromMaterialId: material.id,
        toMaterialId: fd.get('toMaterialId') as string,
        piecesPerParentSheet: Number(fd.get('pieces')),
      });
      e.target.reset();
      router.refresh();
    } catch(err: any) { alert(err.message); }
    setLoading(false);
  };

  const handleCreateAsChild = async (e: any) => {
    e.preventDefault();
    if (!confirm('Tạo định mức mới?')) return;
    setLoading(true);
    const fd = new FormData(e.target);
    try {
      await createRecipe({
        fromMaterialId: fd.get('fromMaterialId') as string,
        toMaterialId: material.id,
        piecesPerParentSheet: Number(fd.get('pieces')),
      });
      e.target.reset();
      router.refresh();
    } catch(err: any) { alert(err.message); }
    setLoading(false);
  };

  const handleDelete = async (id: string) => {
    if(!confirm('Xóa định mức này?')) return;
    setLoading(true);
    await deleteRecipe(id);
    router.refresh();
    setLoading(false);
  };

  const handleToggle = async (id: string, active: boolean) => {
    setLoading(true);
    await toggleRecipe(id, active);
    router.refresh();
    setLoading(false);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* As Parent */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4 text-indigo-700">Định mức cắt TỪ giấy này (Giấy mẹ)</h2>
        <p className="text-sm text-slate-500 mb-4">Các loại giấy con có thể cắt được từ {material.name}</p>
        
        {canEdit && (
          <form onSubmit={handleCreateAsParent} className="mb-4 flex gap-2 items-center bg-indigo-50 p-3 rounded">
            <span className="text-sm font-medium">Cắt ra:</span>
            {validItemsAsParent.length > 0 ? (
              <>
                <select name="toMaterialId" required className="flex-1 text-sm p-2 border rounded">
                  <option value="">- Chọn giấy con -</option>
                  {validItemsAsParent.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <input name="pieces" type="number" min="1" required placeholder="Số tờ" className="w-20 text-sm p-2 border rounded" />
                <button disabled={loading} className="p-2 bg-indigo-600 text-white rounded"><Plus className="w-4 h-4" /></button>
              </>
            ) : (
              <span className="text-sm text-slate-500 italic flex-1">Chưa có vật tư cùng loại phù hợp để tạo định mức.</span>
            )}
          </form>
        )}

        <div className="space-y-2">
          {material.recipesAsFrom.length === 0 ? <p className="text-sm text-slate-400">Chưa có định mức nào</p> : null}
          {material.recipesAsFrom.map((r: any) => (
            <div key={r.id} className={`flex items-center justify-between p-3 border rounded text-sm ${!r.isActive ? 'bg-slate-50 opacity-60' : ''}`}>
              <div>
                <span className="font-medium">1</span> {material.stockBaseUnit} 
                <span className="mx-2 text-slate-400">→</span> 
                <span className="font-bold text-indigo-600">{r.piecesPerParentSheet}</span> {r.toMaterial?.stockBaseUnit} 
                <span className="ml-2 font-medium">{r.toMaterial?.name}</span>
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(r.id, !r.isActive)} className="text-slate-500 hover:text-indigo-600">
                    {r.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4 text-red-500" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-600"><Trash className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* As Child */}
      <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
        <h2 className="text-lg font-bold mb-4 text-emerald-700">Định mức TẠO RA giấy này (Giấy con)</h2>
        <p className="text-sm text-slate-500 mb-4">Các loại giấy mẹ có thể cắt ra {material.name}</p>
        
        {canEdit && (
          <form onSubmit={handleCreateAsChild} className="mb-4 flex gap-2 items-center bg-emerald-50 p-3 rounded">
            <span className="text-sm font-medium">Cắt từ:</span>
            {validItemsAsChild.length > 0 ? (
              <>
                <select name="fromMaterialId" required className="flex-1 text-sm p-2 border rounded">
                  <option value="">- Chọn giấy mẹ -</option>
                  {validItemsAsChild.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <span className="text-sm font-medium">ra</span>
                <input name="pieces" type="number" min="1" required placeholder="Số tờ" className="w-20 text-sm p-2 border rounded" />
                <button disabled={loading} className="p-2 bg-emerald-600 text-white rounded"><Plus className="w-4 h-4" /></button>
              </>
            ) : (
              <span className="text-sm text-slate-500 italic flex-1">Chưa có vật tư cùng loại phù hợp để tạo định mức.</span>
            )}
          </form>
        )}

        <div className="space-y-2">
          {material.recipesAsTo.length === 0 ? <p className="text-sm text-slate-400">Chưa có định mức nào</p> : null}
          {material.recipesAsTo.map((r: any) => (
            <div key={r.id} className={`flex items-center justify-between p-3 border rounded text-sm ${!r.isActive ? 'bg-slate-50 opacity-60' : ''}`}>
              <div>
                <span className="font-medium">1</span> {r.fromMaterial?.stockBaseUnit} 
                <span className="ml-2 font-medium">{r.fromMaterial?.name}</span>
                <span className="mx-2 text-slate-400">→</span> 
                <span className="font-bold text-emerald-600">{r.piecesPerParentSheet}</span> {material.stockBaseUnit}
              </div>
              {canEdit && (
                <div className="flex gap-2">
                  <button onClick={() => handleToggle(r.id, !r.isActive)} className="text-slate-500 hover:text-emerald-600">
                    {r.isActive ? <Power className="w-4 h-4" /> : <PowerOff className="w-4 h-4 text-red-500" />}
                  </button>
                  <button onClick={() => handleDelete(r.id)} className="text-slate-400 hover:text-red-600"><Trash className="w-4 h-4" /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
