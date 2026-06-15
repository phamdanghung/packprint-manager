'use client';
// force recompile cache

import React, { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createInboundReceipt } from '@/lib/inventory-inbound-actions';
import { Save, X, Plus, Trash2, ArrowLeft } from 'lucide-react';
import { ItemFormModal } from '../../item-form-modal';
import Link from 'next/link';
import { validateGeneratedCode } from '@/lib/material-code-generator';

export default function InboundNewClient({ items }: { items: any[] }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [supplierName, setSupplierName] = useState('');
  const [documentNo, setDocumentNo] = useState('');
  const [receivedAt, setReceivedAt] = useState(new Date().toISOString().split('T')[0]);
  const [note, setNote] = useState('');

  const [receiptItems, setReceiptItems] = useState<any[]>([
    { inventoryItemId: '', quantityBase: '', unitCost: '', note: '' }
  ]);

  const [showItemModal, setShowItemModal] = useState(false);

  // Lọc chỉ lấy ACTIVE
  const activeItems = useMemo(() => items.filter(i => i.status === 'ACTIVE'), [items]);

  const handleAddItem = () => {
    setReceiptItems([...receiptItems, { inventoryItemId: '', quantityBase: '', unitCost: '', note: '' }]);
  };

  const handleRemoveItem = (index: number) => {
    if (receiptItems.length === 1) return;
    const newItems = [...receiptItems];
    newItems.splice(index, 1);
    setReceiptItems(newItems);
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...receiptItems];
    newItems[index][field] = value;
    setReceiptItems(newItems);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate empty lines
    const validItems = receiptItems.filter(i => i.inventoryItemId && Number(i.quantityBase) > 0);
    if (validItems.length === 0) {
      setError('Vui lòng nhập ít nhất 1 vật tư với số lượng > 0');
      return;
    }

    setLoading(true);
    try {
      const formattedItems = validItems.map(i => ({
        inventoryItemId: i.inventoryItemId,
        quantityBase: Number(i.quantityBase),
        unitCost: i.unitCost ? Number(i.unitCost) : undefined,
        note: i.note || undefined
      }));

      const res = await createInboundReceipt({
        supplierName: supplierName || undefined,
        documentNo: documentNo || undefined,
        receivedAt: new Date(receivedAt),
        note: note || undefined,
        items: formattedItems
      });

      if (res.success) {
        router.push(`/dashboard/inventory/inbound/${res.receipt.id}`);
      }
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleItemSaved = () => {
    setShowItemModal(false);
    // Reload trang để lấy danh sách item mới nhất, việc này có thể làm mất dữ liệu form nếu chưa lưu.
    // MVP: Khuyên dùng reload.
    if (window.confirm('Cần tải lại danh sách vật tư để chọn mã vừa tạo. Dữ liệu đang nhập có thể bị mất. Tải lại?')) {
      window.location.reload();
    }
  };

  const totalReceiptCost = receiptItems.reduce((sum, item) => {
    if (item.quantityBase && item.unitCost) {
      return sum + (Number(item.quantityBase) * Number(item.unitCost));
    }
    return sum;
  }, 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/inventory/inbound" className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Tạo Phiếu Nhập Kho</h1>
          <p className="text-sm text-slate-500">Nhập vật tư chuẩn theo mã vào kho</p>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 p-4 rounded-lg font-medium">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header Section */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Nhà cung cấp</label>
            <input type="text" value={supplierName} onChange={e => setSupplierName(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Nhập tên công ty/nhà cung cấp" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Số chứng từ / Hóa đơn</label>
            <input type="text" value={documentNo} onChange={e => setDocumentNo(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="VD: HD-12345" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ngày nhập *</label>
            <input type="date" value={receivedAt} onChange={e => setReceivedAt(e.target.value)} required className="w-full p-2.5 border rounded-lg text-sm" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú phiếu nhập</label>
            <input type="text" value={note} onChange={e => setNote(e.target.value)} className="w-full p-2.5 border rounded-lg text-sm" placeholder="Ghi chú chung..." />
          </div>
        </div>

        {/* Items Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
          <div className="p-4 border-b border-slate-200 bg-slate-50 flex justify-between items-center">
            <h3 className="font-bold text-slate-800">Danh sách vật tư nhập</h3>
            <button type="button" onClick={() => setShowItemModal(true)} className="flex items-center gap-1.5 text-sm font-medium text-indigo-600 bg-indigo-50 px-3 py-1.5 rounded-lg hover:bg-indigo-100">
              <Plus className="h-4 w-4" />
              Tạo Mã Vật Tư Nhanh
            </button>
          </div>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-100 text-slate-600 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold w-12">#</th>
                  <th className="px-4 py-3 font-semibold min-w-[300px]">Mã Vật Tư *</th>
                  <th className="px-4 py-3 font-semibold w-32">Khu kho</th>
                  <th className="px-4 py-3 font-semibold w-32">Số lượng *</th>
                  <th className="px-4 py-3 font-semibold w-40">Đơn giá (VNĐ)</th>
                  <th className="px-4 py-3 font-semibold w-40">Thành tiền</th>
                  <th className="px-4 py-3 font-semibold">Ghi chú</th>
                  <th className="px-4 py-3 w-12"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {receiptItems.map((item, index) => {
                  const selectedDbItem = activeItems.find(i => i.id === item.inventoryItemId);
                  const isStandard = selectedDbItem ? validateGeneratedCode(selectedDbItem.itemCode) : true;
                  const itemTotal = (Number(item.quantityBase) || 0) * (Number(item.unitCost) || 0);

                  return (
                    <tr key={index} className="hover:bg-slate-50">
                      <td className="px-4 py-3 font-medium text-slate-400">{index + 1}</td>
                      <td className="px-4 py-3">
                        <select 
                          required
                          value={item.inventoryItemId}
                          onChange={e => handleItemChange(index, 'inventoryItemId', e.target.value)}
                          className={`w-full p-2 border rounded-md text-sm ${!isStandard ? 'border-rose-300 bg-rose-50' : ''}`}
                        >
                          <option value="">-- Chọn vật tư --</option>
                          {activeItems.map(i => (
                            <option key={i.id} value={i.id}>
                              {i.itemCode} — {i.name} (Tồn: {i.currentStockBase})
                            </option>
                          ))}
                        </select>
                        {!isStandard && (
                          <div className="text-[10px] text-rose-600 font-medium mt-1">Mã chưa chuẩn. Cần chuẩn hóa trước khi nhập.</div>
                        )}
                        {selectedDbItem && !selectedDbItem.warehouseZoneId && (
                          <div className="text-[10px] text-amber-600 font-medium mt-1">Cảnh báo: Vật tư chưa có khu kho.</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-xs font-medium">
                        {selectedDbItem?.warehouseZone?.name || (selectedDbItem ? <span className="text-amber-600 bg-amber-50 px-1 py-0.5 rounded">Chưa có</span> : '-')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <input 
                            type="number" min="1" required
                            value={item.quantityBase}
                            onChange={e => handleItemChange(index, 'quantityBase', e.target.value)}
                            className="w-full p-2 border rounded-md text-sm" placeholder="VD: 100"
                          />
                          <span className="text-xs text-slate-500 font-semibold">{selectedDbItem?.stockBaseUnit || ''}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="number" min="0"
                          value={item.unitCost}
                          onChange={e => handleItemChange(index, 'unitCost', e.target.value)}
                          className="w-full p-2 border rounded-md text-sm" placeholder="Tùy chọn"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-700">
                        {itemTotal > 0 ? itemTotal.toLocaleString('vi-VN') : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <input 
                          type="text"
                          value={item.note}
                          onChange={e => handleItemChange(index, 'note', e.target.value)}
                          className="w-full p-2 border rounded-md text-sm" placeholder="Tùy chọn"
                        />
                      </td>
                      <td className="px-4 py-3 text-right">
                        {receiptItems.length > 1 && (
                          <button type="button" onClick={() => handleRemoveItem(index)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
          
          <div className="p-4 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
            <button type="button" onClick={handleAddItem} className="flex items-center gap-2 text-sm font-medium text-indigo-600 hover:text-indigo-800">
              <Plus className="h-4 w-4" /> Thêm dòng vật tư
            </button>
            <div className="text-right">
              <div className="text-sm text-slate-500 font-medium mb-1">Tổng cộng tiền hàng:</div>
              <div className="text-2xl font-bold text-indigo-700">{totalReceiptCost.toLocaleString('vi-VN')} đ</div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-slate-200">
          <Link href="/dashboard/inventory/inbound" className="px-6 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50 text-slate-700">
            Hủy bỏ
          </Link>
          <button type="submit" disabled={loading} className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium flex items-center gap-2">
            <Save className="h-4 w-4" />
            {loading ? 'Đang tạo phiếu...' : 'Hoàn tất phiếu nhập'}
          </button>
        </div>
      </form>

      {showItemModal && (
        <ItemFormModal 
          onClose={() => setShowItemModal(false)} 
          onSuccess={handleItemSaved} 
          userRole="ADMIN" 
          activeZones={[]} 
        />
      )}
    </div>
  );
}
