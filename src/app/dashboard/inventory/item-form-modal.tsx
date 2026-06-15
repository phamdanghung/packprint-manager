'use client';

import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';
import { createInventoryItem } from '@/lib/inventory-actions';
import { 
  MaterialGroup, PaperType, PaperGsm, SheetSize, SheetRole, 
  DecalType, LaminateType, LaminateMethod, generateMaterialCode, generateMaterialName, validateGeneratedCode
} from '@/lib/material-code-generator';

export function ItemFormModal({ onClose, onSuccess, userRole, activeZones = [] }: { onClose: () => void, onSuccess: () => void, userRole: string, activeZones?: any[] }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  
  // Wizard state
  const [category, setCategory] = useState<string>('');
  const [materialType, setMaterialType] = useState<string>('');
  const [gsm, setGsm] = useState<string>('');
  const [sheetSize, setSheetSize] = useState<string>('');
  const [sheetRole, setSheetRole] = useState<string>('');
  const [isRoll, setIsRoll] = useState<boolean>(false);
  const [rollWidthMm, setRollWidthMm] = useState<string>('');
  const [rollLengthM, setRollLengthM] = useState<string>('');
  const [laminateType, setLaminateType] = useState<string>('');
  const [laminateMethod, setLaminateMethod] = useState<string>('');
  const [warehouseZoneId, setWarehouseZoneId] = useState<string>('');

  // Manual override
  const [isManualOverride, setIsManualOverride] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [manualName, setManualName] = useState('');
  const [overrideReason, setOverrideReason] = useState('');

  // Computed
  const [computedCode, setComputedCode] = useState('');
  const [computedName, setComputedName] = useState('');

  useEffect(() => {
    if (isManualOverride) return;

    if (!category) {
      setComputedCode(''); setComputedName(''); return;
    }

    try {
      const input = {
        category, materialType, gsm: gsm ? Number(gsm) : undefined, 
        sheetSize, sheetRole, isRoll, 
        rollWidthMm: rollWidthMm ? Number(rollWidthMm) : undefined,
        rollLengthM: rollLengthM ? Number(rollLengthM) : undefined,
        laminateType, laminateMethod
      };
      
      const code = generateMaterialCode(input);
      const name = generateMaterialName(input);
      setComputedCode(code);
      setComputedName(name);
    } catch (e) {
      setComputedCode('');
      setComputedName('');
    }
  }, [category, materialType, gsm, sheetSize, sheetRole, isRoll, rollWidthMm, rollLengthM, laminateType, laminateMethod, isManualOverride]);

  // Auto-suggest warehouse zone
  useEffect(() => {
    const code = isManualOverride ? manualCode : computedCode;
    if (!code) return;
    
    let typeCode = 'OTHER';
    if (code.startsWith('GIAY-')) typeCode = 'PAPER';
    else if (code.startsWith('DECAL-')) typeCode = 'DECAL';
    else if (code.startsWith('MANG-')) typeCode = 'LAMINATION';
    else if (code.startsWith('MUC-')) typeCode = 'INK';
    else if (code.startsWith('KEO-')) typeCode = 'SUPPLY';

    const defaultZone = activeZones.find(z => z.type === typeCode);
    if (defaultZone) {
      setWarehouseZoneId(defaultZone.id);
    } else {
      const otherZone = activeZones.find(z => z.type === 'OTHER');
      if (otherZone) setWarehouseZoneId(otherZone.id);
    }
  }, [computedCode, manualCode, isManualOverride, activeZones]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      let payload: any = {
        category,
        minStockBase: 0,
        initialStockBase: 0,
        status: 'ACTIVE',
        warehouseZoneId: warehouseZoneId || undefined
      };

      if (isManualOverride) {
        if (!manualCode || !manualName || !overrideReason) {
          throw new Error('Vui lòng nhập đủ mã, tên và lý do sửa thủ công');
        }
        payload.isManualOverride = true;
        payload.overrideReason = overrideReason;
        payload.itemCode = manualCode;
        payload.name = manualName;
        // Also add unit/stockBaseUnit
        payload.stockBaseUnit = 'SHEET';
        payload.displayUnit = 'SHEET';
        payload.unitScale = 1;
      } else {
        if (!computedCode || !validateGeneratedCode(computedCode)) {
          throw new Error('Mã tự sinh không hợp lệ hoặc thiếu thông tin');
        }
        payload.codeGenInput = {
          category, materialType, gsm: gsm ? Number(gsm) : undefined, 
          sheetSize, sheetRole, isRoll, 
          rollWidthMm: rollWidthMm ? Number(rollWidthMm) : undefined,
          rollLengthM: rollLengthM ? Number(rollLengthM) : undefined,
          laminateType, laminateMethod
        };
        // The server will derive the rest
      }

      const res = await createInventoryItem(payload);
      if (res.status === 'EXISTING_FOUND') {
        setError(res.message || 'Vật tư đã tồn tại');
        // We could also call onSuccess() here if we want to just close, but better to show the message
      } else {
        setSuccessMsg('Tạo vật tư thành công');
        setTimeout(() => onSuccess(), 1000);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const isAdmin = ['ADMIN', 'MANAGER'].includes(userRole);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 flex-shrink-0">
          <h3 className="font-bold text-lg">Tạo Vật Tư Chuẩn</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg mb-4">{error}</div>}
          {successMsg && <div className="p-3 bg-emerald-50 text-emerald-600 text-sm rounded-lg mb-4 flex items-center gap-2"><Check className="h-4 w-4"/> {successMsg}</div>}
          
          <form id="itemForm" onSubmit={handleSubmit} className="space-y-4">
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Nhóm Vật Tư *</label>
                <select value={category} onChange={(e) => { setCategory(e.target.value); setMaterialType(''); }} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                  <option value="">-- Chọn Nhóm --</option>
                  {Object.entries(MaterialGroup).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>

              {category === MaterialGroup.GIAY && (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Loại Giấy *</label>
                    <select value={materialType} onChange={e => setMaterialType(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn Loại --</option>
                      {Object.entries(PaperType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Định lượng (GSM) *</label>
                    <select value={gsm} onChange={e => setGsm(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn GSM --</option>
                      {PaperGsm.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Khổ Giấy *</label>
                    <select value={sheetSize} onChange={e => {
                      setSheetSize(e.target.value);
                      if (e.target.value) setSheetRole(SheetSize[e.target.value as keyof typeof SheetSize].defaultRole);
                    }} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn Khổ --</option>
                      {Object.keys(SheetSize).map(k => <option key={k} value={k}>{k}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Vai trò *</label>
                    <select value={sheetRole} onChange={e => setSheetRole(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn --</option>
                      <option value="PARENT">Mẹ</option>
                      <option value="CHILD">Con</option>
                      <option value="BOTH">Chung</option>
                    </select>
                  </div>
                </>
              )}

              {category === MaterialGroup.DECAL && (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Loại Decal *</label>
                    <select value={materialType} onChange={e => setMaterialType(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn Loại --</option>
                      {Object.entries(DecalType).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Đóng gói *</label>
                    <select value={isRoll ? 'true' : 'false'} onChange={e => setIsRoll(e.target.value === 'true')} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="false">Tờ</option>
                      <option value="true">Cuộn</option>
                    </select>
                  </div>
                  {!isRoll ? (
                    <>
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700">Khổ Decal *</label>
                        <select value={sheetSize} onChange={e => {
                          setSheetSize(e.target.value);
                          if (e.target.value) setSheetRole(SheetSize[e.target.value as keyof typeof SheetSize].defaultRole);
                        }} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                          <option value="">-- Chọn Khổ --</option>
                          {Object.keys(SheetSize).map(k => <option key={k} value={k}>{k}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700">Vai trò *</label>
                        <select value={sheetRole} onChange={e => setSheetRole(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                          <option value="">-- Chọn --</option>
                          <option value="PARENT">Mẹ</option>
                          <option value="CHILD">Con</option>
                          <option value="BOTH">Chung</option>
                        </select>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700">Khổ Rộng (mm) *</label>
                        <input type="number" value={rollWidthMm} onChange={e => setRollWidthMm(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1 text-slate-700">Chiều Dài (m) *</label>
                        <input type="number" value={rollLengthM} onChange={e => setRollLengthM(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride} />
                      </div>
                    </>
                  )}
                </>
              )}

              {category === MaterialGroup.MANG && (
                <>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Bề mặt *</label>
                    <select value={laminateType} onChange={e => setLaminateType(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn --</option>
                      {Object.entries(LaminateType).map(([k, v]) => <option key={k} value={k}>{v === 'BONG' ? 'Bóng' : 'Mờ'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Loại Màng *</label>
                    <select value={laminateMethod} onChange={e => setLaminateMethod(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride}>
                      <option value="">-- Chọn --</option>
                      {Object.entries(LaminateMethod).map(([k, v]) => <option key={k} value={k}>{v === 'NHIET' ? 'Nhiệt' : 'Keo'}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Khổ Rộng (mm) *</label>
                    <input type="number" value={rollWidthMm} onChange={e => setRollWidthMm(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride} />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1 text-slate-700">Chiều Dài (m) *</label>
                    <input type="number" value={rollLengthM} onChange={e => setRollLengthM(e.target.value)} className="w-full p-2 border rounded-lg text-sm" disabled={isManualOverride} />
                  </div>
                </>
              )}
            </div>

            {!isManualOverride && (category === MaterialGroup.GIAY || category === MaterialGroup.DECAL || category === MaterialGroup.MANG) && (
              <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
                <p className="text-sm font-bold text-slate-700 mb-2">Preview Mã Tự Sinh</p>
                {computedCode ? (
                  <>
                    <div className="font-mono text-lg font-bold text-indigo-700">{computedCode}</div>
                    <div className="text-sm text-slate-600 mt-1">{computedName}</div>
                  </>
                ) : (
                  <div className="text-sm text-slate-500 italic">Vui lòng chọn đủ thông tin để sinh mã...</div>
                )}
              </div>
            )}
            
            <div className="mt-4 p-4 bg-slate-50 border border-slate-200 rounded-lg">
              <label className="block text-sm font-bold mb-1 text-slate-700">Khu kho lưu trữ (Gợi ý tự động) *</label>
              <select 
                value={warehouseZoneId} 
                onChange={e => setWarehouseZoneId(e.target.value)} 
                className="w-full p-2 border rounded-lg text-sm"
                disabled={!isAdmin}
                required
              >
                <option value="">-- Chọn khu kho --</option>
                {activeZones.map(z => (
                  <option key={z.id} value={z.id}>{z.name}</option>
                ))}
              </select>
              {!isAdmin && <p className="text-xs text-slate-500 mt-1">Chỉ Admin/Manager mới được phép đổi khu kho mặc định.</p>}
            </div>

            {isManualOverride && (
              <div className="mt-4 p-4 bg-rose-50 border border-rose-200 rounded-lg space-y-3">
                <p className="text-sm font-bold text-rose-700">Sửa Mã Thủ Công (Dành cho Admin/Manager)</p>
                <div>
                  <label className="block text-xs font-bold mb-1 text-rose-700">Mã vật tư *</label>
                  <input value={manualCode} onChange={e => setManualCode(e.target.value.toUpperCase())} className="w-full p-2 border border-rose-200 rounded-lg text-sm" placeholder="VD: MANG-MO-DAC-BIET" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-rose-700">Tên vật tư *</label>
                  <input value={manualName} onChange={e => setManualName(e.target.value)} className="w-full p-2 border border-rose-200 rounded-lg text-sm" placeholder="Tên vật tư..." />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-rose-700">Lý do *</label>
                  <input value={overrideReason} onChange={e => setOverrideReason(e.target.value)} className="w-full p-2 border border-rose-200 rounded-lg text-sm" placeholder="Ghi chú vì sao không dùng mã chuẩn..." />
                </div>
              </div>
            )}

            {isAdmin && !isManualOverride && (
              <div className="flex justify-end mt-2">
                <button type="button" onClick={() => setIsManualOverride(true)} className="text-xs text-rose-600 hover:underline">Sửa mã thủ công</button>
              </div>
            )}
            {isManualOverride && (
               <div className="flex justify-end mt-2">
                <button type="button" onClick={() => setIsManualOverride(false)} className="text-xs text-indigo-600 hover:underline">Quay lại dùng mã tự sinh</button>
              </div>
            )}
          </form>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-100">Hủy</button>
          <button form="itemForm" type="submit" disabled={loading || (!isManualOverride && !computedCode)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Đang tạo...' : 'Tạo vật tư'}
          </button>
        </div>
      </div>
    </div>
  );
}
