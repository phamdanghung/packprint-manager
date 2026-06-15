'use client';

import React, { useState, useMemo } from 'react';
import { Scissors } from 'lucide-react';
import { convertMaterial } from '@/lib/inventory-actions';
import { createRecipe } from '@/app/dashboard/inventory/materials/[id]/actions';
import { useRouter } from 'next/navigation';
import { filterValidChildMaterials, filterValidParentMaterials, calculateMaxPieces, extractMaterialInfo } from '@/lib/inventory-recipe-validation';

// Lấy tên dòng vật tư: ưu tiên DB field, fallback extract từ name, không trả 'Không rõ'
function getEffectiveFamilyName(item: any): string | null {
  if (item.familyName) return item.familyName;
  const info = extractMaterialInfo(item.name);
  return info.familyName || null;
}

// Bỏ qua các vật tư test để tránh lặp rác UI
function isTestData(item: any): boolean {
  if (!item.itemCode) return false;
  const c = item.itemCode.toUpperCase();
  return c.startsWith('MAT-PARENT') || c.startsWith('MAT-CHILD') || c.startsWith('INVCORE_') || c.startsWith('TEST_');
}

export default function ConversionClient({ initialItems, initialConversions, userRole, recipes }: any) {
  const [conversions, setConversions] = useState(initialConversions);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const canModify = ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(userRole);
  const canUseManual = ['ADMIN', 'MANAGER'].includes(userRole);

  const [mode, setMode] = useState<'RECIPE' | 'MANUAL'>('RECIPE');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [fromId, setFromId] = useState('');
  const [toId, setToId] = useState('');
  const [parentSearch, setParentSearch] = useState('');
  const [childSearch, setChildSearch] = useState('');
  const [fromQty, setFromQty] = useState('');
  const [piecesInput, setPiecesInput] = useState('');
  const [note, setNote] = useState('');
  const [manualToQty, setManualToQty] = useState('');

  const selectedParent = useMemo(() => initialItems.find((i: any) => i.id === fromId), [fromId, initialItems]);
  const selectedChild = useMemo(() => initialItems.find((i: any) => i.id === toId), [toId, initialItems]);

  const validChildItems = useMemo(() => {
    if (!selectedParent) return initialItems.filter((i: any) => i.status === 'ACTIVE');
    return filterValidChildMaterials(selectedParent, initialItems.filter((i: any) => i.status === 'ACTIVE'));
  }, [selectedParent, initialItems]);

  const existingRecipe = useMemo(() => {
    if (!fromId || !toId) return null;
    return recipes.find((r: any) => r.fromMaterialId === fromId && r.toMaterialId === toId);
  }, [fromId, toId, recipes]);

  const maxPieces = useMemo(() => {
    if (!selectedParent || !selectedChild) return null;
    return calculateMaxPieces(selectedParent, selectedChild);
  }, [selectedParent, selectedChild]);

  const currentPieces = existingRecipe ? existingRecipe.piecesPerParentSheet : (Number(piecesInput) || 0);
  const calculatedChildQty = (Number(fromQty) || 0) * currentPieces;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (mode === 'RECIPE') {
        let finalRecipeId = existingRecipe?.id;

        if (!existingRecipe) {
          if (!piecesInput || Number(piecesInput) <= 0) {
            throw new Error('Vui lòng nhập định mức cắt hợp lệ');
          }
          const res = await createRecipe({
            fromMaterialId: fromId,
            toMaterialId: toId,
            piecesPerParentSheet: Number(piecesInput)
          });
          finalRecipeId = res.id;
        }

        await convertMaterial({
          fromMaterialId: fromId,
          toMaterialId: toId,
          fromQuantityBase: Number(fromQty),
          toQuantityBase: calculatedChildQty,
          wasteQuantityBase: 0,
          note: note,
          isManualMode: false,
          recipeId: finalRecipeId
        });
      } else {
        await convertMaterial({
          fromMaterialId: fromId,
          toMaterialId: toId,
          fromQuantityBase: Number(fromQty),
          toQuantityBase: Number(manualToQty),
          wasteQuantityBase: 0,
          note: note,
          isManualMode: true,
        });
      }

      router.refresh();
      setShowCreateModal(false);
      resetForm();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFromId('');
    setToId('');
    setFromQty('');
    setPiecesInput('');
    setNote('');
    setManualToQty('');
    setMode('RECIPE');
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Chuyển đổi / Cắt giấy</h1>
          <p className="text-sm text-slate-500">Ghi nhận thao tác cắt giấy từ khổ lớn sang khổ nhỏ</p>
        </div>
        {canModify && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Scissors className="h-4 w-4" />
            Tạo Chuyển Đổi Mới
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã GD</th>
                <th className="px-4 py-3 font-semibold">Vật tư gốc</th>
                <th className="px-4 py-3 font-semibold">Slg gốc</th>
                <th className="px-4 py-3 font-semibold">Kết quả cắt</th>
                <th className="px-4 py-3 font-semibold">Ghi chú</th>
                <th className="px-4 py-3 font-semibold">Người tạo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversions.map((conv: any) => (
                <tr key={conv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{conv.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-rose-600 font-medium">{conv.fromMaterial?.name}</td>
                  <td className="px-4 py-3 text-rose-600">-{conv.fromQuantityBase}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">
                    {conv.outputLines.map((o: any) => `+${o.toQuantityBase} ${o.toMaterial?.name}`).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-slate-700">{conv.note}</td>
                  <td className="px-4 py-3 text-slate-500">{conv.createdBy?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl p-6 space-y-6">
            <div className="flex justify-between items-center border-b pb-4">
              <h3 className="font-bold text-xl flex items-center gap-2"><Scissors className="h-6 w-6 text-indigo-600"/> Tạo Phiếu Cắt Giấy</h3>
              <button onClick={() => { setShowCreateModal(false); resetForm(); }} className="text-slate-400 hover:text-slate-600">✕</button>
            </div>

            {canUseManual && (
              <div className="flex gap-4 border-b pb-2">
                <button 
                  onClick={() => setMode('RECIPE')} 
                  className={`pb-2 font-semibold ${mode === 'RECIPE' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                >
                  Cắt giấy theo định mức (Khuyên dùng)
                </button>
                <button 
                  onClick={() => setMode('MANUAL')} 
                  className={`pb-2 font-semibold ${mode === 'MANUAL' ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-slate-500'}`}
                >
                  Chuyển đổi thủ công (Admin)
                </button>
              </div>
            )}

            {error && <div className="p-3 bg-rose-50 border border-rose-200 text-rose-600 text-sm rounded-lg">{error}</div>}

            <form onSubmit={handleSubmit} className="space-y-6">
              
              {/* STEP 1: CHỌN MẸ */}
              <div className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <label className="block text-sm font-bold mb-2 text-slate-700">1. Chọn giấy mẹ (Bị trừ đi) *</label>
                <input 
                  type="text" 
                  placeholder="🔍 Tìm nhanh giấy mẹ..." 
                  value={parentSearch} 
                  onChange={e => setParentSearch(e.target.value)}
                  className="w-full p-2 border rounded-lg text-sm bg-white mb-2"
                />
                <select value={fromId} onChange={e => { setFromId(e.target.value); setToId(''); setChildSearch(''); }} required className="w-full p-2.5 border rounded-lg text-sm bg-white mb-2">
                  <option value="">- Chọn giấy mẹ -</option>
                  {initialItems.filter((i: any) => i.status === 'ACTIVE' && !isTestData(i) && (!parentSearch || (i.name + i.itemCode).toLowerCase().includes(parentSearch.toLowerCase()))).map((i: any) => (
                    <option key={i.id} value={i.id}>{i.name} — {i.itemCode} — Tồn: {i.currentStockBase} {i.stockBaseUnit}</option>
                  ))}
                </select>
                {selectedParent && (
                  <div className="text-xs text-slate-500 flex gap-4 mt-2">
                    {(() => { const fn = getEffectiveFamilyName(selectedParent); return fn ? <span>Dòng vật tư: <span className="font-semibold text-slate-700">{fn}</span></span> : null; })()}
                    <span>Khổ: <span className="font-semibold text-slate-700">{selectedParent.sheetWidthCm}x{selectedParent.sheetHeightCm}</span></span>
                    <span>Tồn: <span className="font-semibold text-slate-700">{selectedParent.currentStockBase} {selectedParent.stockBaseUnit}</span></span>
                  </div>
                )}
              </div>

              {/* STEP 2: CHỌN CON */}
              <div className="bg-indigo-50 p-4 rounded-lg border border-indigo-100">
                <label className="block text-sm font-bold mb-2 text-indigo-900">2. Chọn giấy con (Được cộng vào) *</label>
                <input 
                  type="text" 
                  placeholder="🔍 Tìm nhanh giấy con..." 
                  value={childSearch} 
                  onChange={e => setChildSearch(e.target.value)}
                  disabled={!fromId}
                  className="w-full p-2 border rounded-lg text-sm bg-white mb-2 disabled:bg-slate-100 disabled:text-slate-400"
                />
                <select value={toId} onChange={e => setToId(e.target.value)} required disabled={!fromId} className="w-full p-2.5 border rounded-lg text-sm bg-white mb-2 disabled:bg-slate-100">
                  <option value="">- Chọn giấy con -</option>
                  {validChildItems.filter((i: any) => !isTestData(i) && (!childSearch || (i.name + i.itemCode).toLowerCase().includes(childSearch.toLowerCase()))).map((i: any) => (
                    <option key={i.id} value={i.id}>{i.name} — {i.itemCode} — Tồn: {i.currentStockBase} {i.stockBaseUnit}</option>
                  ))}
                </select>
                {fromId && validChildItems.length === 0 && (
                  <p className="text-xs text-rose-500 mt-1">Chưa có vật tư cùng dòng (family) phù hợp để cắt từ khổ này.</p>
                )}
                {selectedChild && (
                  <div className="text-xs text-indigo-600 flex gap-4 mt-2">
                    {(() => { const fn = getEffectiveFamilyName(selectedChild); return fn ? <span>Dòng vật tư: <span className="font-semibold text-indigo-800">{fn}</span></span> : null; })()}
                    <span>Khổ: <span className="font-semibold text-indigo-800">{selectedChild.sheetWidthCm}x{selectedChild.sheetHeightCm}</span></span>
                    <span>Tồn: <span className="font-semibold text-indigo-800">{selectedChild.currentStockBase} {selectedChild.stockBaseUnit}</span></span>
                  </div>
                )}
              </div>

              {/* STEP 3 & 4 */}
              {fromId && toId && (
                <div className="grid grid-cols-2 gap-4">
                  {mode === 'RECIPE' ? (
                    <>
                      <div className="p-4 rounded-lg border border-emerald-200 bg-emerald-50">
                        <label className="block text-sm font-bold mb-2 text-emerald-900">Định mức cắt *</label>
                        {existingRecipe ? (
                          <div className="p-2.5 bg-white rounded border border-emerald-100 text-sm text-emerald-800 font-medium text-center">
                            Đã có định mức: 1 tờ mẹ → <span className="text-lg font-bold">{existingRecipe.piecesPerParentSheet}</span> tờ con
                          </div>
                        ) : (
                          <div>
                            <input type="number" min="1" value={piecesInput} onChange={e => setPiecesInput(e.target.value)} placeholder="Nhập số tờ con..." required className="w-full p-2.5 border rounded-lg text-sm bg-white mb-1" />
                            <p className="text-xs text-emerald-700">Tối đa lý thuyết: {maxPieces ?? '?'} tờ. Lưu định mức này cho lần sau.</p>
                          </div>
                        )}
                      </div>
                      
                      <div className="space-y-4">
                        <div>
                          <label className="block text-sm font-bold mb-1">Số lượng tờ mẹ xuất cắt *</label>
                          <input type="number" min="1" value={fromQty} onChange={e => setFromQty(e.target.value)} placeholder="VD: 100" required className="w-full p-2.5 border rounded-lg text-sm bg-white" />
                        </div>
                        <div>
                          <label className="block text-sm font-bold mb-1">Số lượng tờ con nhập kho</label>
                          <input type="number" value={calculatedChildQty} readOnly className="w-full p-2.5 border rounded-lg text-sm bg-slate-100 font-semibold text-emerald-700" />
                          <p className="text-xs text-slate-500 mt-1">Hệ thống tự tính = Số tờ mẹ x Định mức</p>
                        </div>
                      </div>
                    </>
                  ) : (
                    // MANUAL MODE
                    <>
                      <div>
                        <label className="block text-sm font-bold mb-1">Số lượng xuất (Trừ đi) *</label>
                        <input type="number" min="1" value={fromQty} onChange={e => setFromQty(e.target.value)} required className="w-full p-2.5 border rounded-lg text-sm" />
                      </div>
                      <div>
                        <label className="block text-sm font-bold mb-1">Số lượng nhập (Cộng vào) *</label>
                        <input type="number" min="1" value={manualToQty} onChange={e => setManualToQty(e.target.value)} required className="w-full p-2.5 border rounded-lg text-sm" />
                      </div>
                    </>
                  )}
                </div>
              )}

              <div>
                <label className="block text-sm font-bold mb-1">Ghi chú {mode === 'MANUAL' && <span className="text-rose-500">(Bắt buộc nhập lý do) *</span>}</label>
                <input value={note} onChange={e => setNote(e.target.value)} placeholder="VD: Cắt cho lệnh sx mã #123" required={mode === 'MANUAL'} className="w-full p-2.5 border rounded-lg text-sm" />
              </div>

              {/* PREVIEW */}
              {fromId && toId && fromQty && mode === 'RECIPE' && (
                <div className="p-3 bg-slate-800 text-slate-200 rounded-lg text-sm grid grid-cols-2 gap-2">
                  <div>Tồn {selectedParent?.name} sau cắt: <span className="text-rose-400 font-bold">{selectedParent?.currentStockBase - Number(fromQty)}</span></div>
                  <div>Tồn {selectedChild?.name} sau cắt: <span className="text-emerald-400 font-bold">{selectedChild?.currentStockBase + calculatedChildQty}</span></div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => { setShowCreateModal(false); resetForm(); }} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium">
                  {loading ? 'Đang xử lý...' : (mode === 'RECIPE' && !existingRecipe ? 'Lưu định mức & Xác nhận' : 'Xác nhận tạo phiếu')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
