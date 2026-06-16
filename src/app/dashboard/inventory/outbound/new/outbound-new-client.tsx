'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createOutboundReceipt } from '@/lib/inventory-outbound-actions';
import { OUTBOUND_TYPES } from '@/lib/inventory-outbound-types';
import { validateGeneratedCode } from '@/lib/material-code-generator';
import toast from 'react-hot-toast';
import { formatCurrencyVND } from '@/lib/utils';
import { ArrowLeft, Save, Trash2, Plus } from 'lucide-react';

const STRICT_STANDARD_CODE_ON_OUTBOUND = true;

type LineItem = {
  inventoryItemId: string;
  quantityBase: number | '';
  note: string;
};

export default function OutboundNewClient({ items }: { items: any[] }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [header, setHeader] = useState({
    outboundType: 'PRODUCTION_ISSUE',
    receiverName: '',
    receiverDepartment: '',
    productionJobId: '',
    orderId: '',
    note: ''
  });

  const [lines, setLines] = useState<LineItem[]>([]);

  // Filter items: only ACTIVE
  const activeItems = items.filter(i => i.status === 'ACTIVE');

  const handleAddLine = () => {
    setLines([...lines, { inventoryItemId: '', quantityBase: '', note: '' }]);
  };

  const handleRemoveLine = (index: number) => {
    setLines(lines.filter((_, i) => i !== index));
  };

  const updateLine = (index: number, field: keyof LineItem, value: any) => {
    const newLines = [...lines];
    newLines[index] = { ...newLines[index], [field]: value };
    setLines(newLines);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (lines.length === 0) {
      toast.error('Phiếu xuất kho phải có ít nhất 1 vật tư');
      return;
    }

    // Client-side validation
    const itemIds = new Set();
    for (const line of lines) {
      if (!line.inventoryItemId) {
        toast.error('Vui lòng chọn vật tư cho tất cả các dòng');
        return;
      }
      if (itemIds.has(line.inventoryItemId)) {
        toast.error('Vật tư bị trùng trong phiếu xuất. Vui lòng gộp số lượng vào một dòng.');
        return;
      }
      itemIds.add(line.inventoryItemId);

      const qty = Number(line.quantityBase);
      if (isNaN(qty) || !Number.isInteger(qty) || qty <= 0) {
        toast.error('Số lượng xuất phải là số nguyên > 0');
        return;
      }

      const selectedItem = activeItems.find(i => i.id === line.inventoryItemId);
      if (!selectedItem) continue;

      if (STRICT_STANDARD_CODE_ON_OUTBOUND) {
        const isValid = validateGeneratedCode(selectedItem.itemCode);
        if (!isValid) {
          toast.error(`Vật tư [${selectedItem.itemCode}] chưa có mã chuẩn. Vui lòng chuẩn hóa mã trước khi xuất kho.`);
          return;
        }
      }

      const availableStock = selectedItem.currentStockBase - selectedItem.reservedStockBase;
      if (availableStock < qty) {
        toast.error(`Không đủ tồn kho để xuất vật tư [${selectedItem.itemCode}]. Có thể xuất tối đa: ${availableStock}.`);
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const payload = {
        outboundType: header.outboundType,
        receiverName: header.receiverName || undefined,
        receiverDepartment: header.receiverDepartment || undefined,
        productionJobId: header.productionJobId || undefined,
        orderId: header.orderId || undefined,
        note: header.note || undefined,
        items: lines.map(l => ({
          inventoryItemId: l.inventoryItemId,
          quantityBase: Number(l.quantityBase),
          note: l.note || undefined
        }))
      };

      const res = await createOutboundReceipt(payload);
      if (res.success) {
        toast.success('Tạo phiếu xuất kho thành công');
        router.push(`/dashboard/inventory/outbound/${res.data.id}`);
      } else {
        toast.error((res as any).error || 'Lỗi khi tạo phiếu xuất');
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi hệ thống');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => router.back()}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Tạo Phiếu Xuất Kho</h1>
            <p className="text-gray-500 mt-1">Xuất kho vật tư cho sản xuất, điều chỉnh...</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => router.back()}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Save className="w-4 h-4 mr-2" />
            {isSubmitting ? 'Đang lưu...' : 'Hoàn tất phiếu xuất'}
          </button>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-6">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Thông tin chung</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại xuất kho *</label>
              <select
                value={header.outboundType}
                onChange={e => setHeader({ ...header, outboundType: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                required
              >
                {OUTBOUND_TYPES.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            
            {header.outboundType === 'PRODUCTION_ISSUE' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mã Lệnh Sản Xuất</label>
                <input
                  type="text"
                  value={header.productionJobId}
                  onChange={e => setHeader({ ...header, productionJobId: e.target.value })}
                  className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Nhập ID lệnh sản xuất nếu có"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Người nhận</label>
              <input
                type="text"
                value={header.receiverName}
                onChange={e => setHeader({ ...header, receiverName: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Tên người nhận"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bộ phận nhận</label>
              <input
                type="text"
                value={header.receiverDepartment}
                onChange={e => setHeader({ ...header, receiverDepartment: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="VD: Xưởng in, Kho thành phẩm..."
              />
            </div>
            
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú phiếu xuất</label>
              <textarea
                value={header.note}
                onChange={e => setHeader({ ...header, note: e.target.value })}
                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                rows={2}
                placeholder="Lý do xuất, ghi chú thêm..."
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between border-b pb-2">
            <h2 className="text-base font-semibold text-gray-900">Danh sách vật tư xuất</h2>
            <button
              type="button"
              onClick={handleAddLine}
              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <Plus className="w-4 h-4 mr-1" />
              Thêm dòng vật tư
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
                <tr>
                  <th className="px-4 py-3 font-medium min-w-[250px]">Vật tư *</th>
                  <th className="px-4 py-3 font-medium w-24">Tồn khả dụng</th>
                  <th className="px-4 py-3 font-medium w-32">ĐVT</th>
                  <th className="px-4 py-3 font-medium w-32">Số lượng xuất *</th>
                  <th className="px-4 py-3 font-medium min-w-[150px]">Ghi chú</th>
                  <th className="px-4 py-3 font-medium w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {lines.map((line, index) => {
                  const selectedItem = activeItems.find(i => i.id === line.inventoryItemId);
                  const availableStock = selectedItem ? selectedItem.currentStockBase - selectedItem.reservedStockBase : 0;
                  const zone = selectedItem?.warehouseZone;
                  
                  return (
                    <tr key={index} className="hover:bg-gray-50/30">
                      <td className="px-4 py-2">
                        <select
                          value={line.inventoryItemId}
                          onChange={(e) => updateLine(index, 'inventoryItemId', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
                          required
                        >
                          <option value="">-- Chọn vật tư --</option>
                          {activeItems.map(item => (
                            <option key={item.id} value={item.id}>
                              [{item.itemCode}] {item.name}
                            </option>
                          ))}
                        </select>
                        {zone && <span className="text-xs text-gray-500 mt-1 block">Khu: {zone.name || zone.code}</span>}
                        {!zone && selectedItem && <span className="text-xs text-amber-600 mt-1 block">Chưa phân khu kho</span>}
                      </td>
                      <td className="px-4 py-2">
                        {selectedItem ? availableStock.toLocaleString() : '-'}
                      </td>
                      <td className="px-4 py-2 text-gray-600">
                        {selectedItem?.stockBaseUnit || '-'}
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="number"
                          value={line.quantityBase}
                          onChange={(e) => updateLine(index, 'quantityBase', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
                          min="1"
                          max={availableStock || undefined}
                          required
                          placeholder="SL"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={line.note}
                          onChange={(e) => updateLine(index, 'note', e.target.value)}
                          className="w-full px-2 py-1.5 border rounded focus:ring-1 focus:ring-blue-500 text-sm"
                          placeholder="Ghi chú thêm..."
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(index)}
                          className="p-1.5 text-gray-400 hover:text-red-600 rounded hover:bg-red-50"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {lines.length === 0 && (
            <div className="text-center py-8 text-gray-500 border-2 border-dashed rounded-lg">
              Chưa có vật tư nào. Nhấn "Thêm dòng vật tư" để bắt đầu.
            </div>
          )}
        </div>
      </div>
    </form>
  );
}
