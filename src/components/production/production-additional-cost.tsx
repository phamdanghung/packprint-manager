'use client';

import React, { useState } from 'react';
import { Plus, X, Trash2, Edit2, AlertCircle } from 'lucide-react';
import { createProductionCostLine, updateProductionCostLine, cancelProductionCostLine } from '@/lib/production-costing-actions';
import { useRouter } from 'next/navigation';

const CATEGORIES = [
  { value: 'LABOR', label: 'Nhân công' },
  { value: 'OUTSOURCING', label: 'Gia công ngoài' },
  { value: 'MACHINE_SERVICE', label: 'Dịch vụ máy móc' },
  { value: 'PACKAGING', label: 'Đóng gói' },
  { value: 'OTHER', label: 'Khác' }
];

export default function ProductionAdditionalCost({ jobId, additionalCostLines, actualAdditionalCost, userRole }: { jobId: string, additionalCostLines: any[], actualAdditionalCost: number, userRole: string }) {
  const router = useRouter();
  const canEdit = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);
  
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  
  const [category, setCategory] = useState('LABOR');
  const [description, setDescription] = useState('');
  const [quantity, setQuantity] = useState(1);
  const [unitCost, setUnitCost] = useState(0);
  const [vendorName, setVendorName] = useState('');
  const [note, setNote] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const resetForm = () => {
    setCategory('LABOR');
    setDescription('');
    setQuantity(1);
    setUnitCost(0);
    setVendorName('');
    setNote('');
    setEditingId(null);
    setIsFormOpen(false);
    setError('');
  };

  const handleEdit = (line: any) => {
    setCategory(line.category);
    setDescription(line.description);
    setQuantity(line.quantity);
    setUnitCost(line.unitCost);
    setVendorName(line.vendorName || '');
    setNote(line.note || '');
    setEditingId(line.id);
    setIsFormOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const data = {
        productionJobId: jobId,
        category,
        description,
        quantity,
        unitCost,
        vendorName,
        note
      };

      let res;
      if (editingId) {
        res = await updateProductionCostLine(editingId, data);
      } else {
        res = await createProductionCostLine(data);
      }

      if (!res.success) {
        setError(res.error || 'Có lỗi xảy ra');
      } else {
        resetForm();
        router.refresh();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn hủy dòng chi phí này? (Sẽ không tính vào giá vốn nữa)')) return;
    
    setLoading(true);
    try {
      const reason = prompt('Lý do hủy (bắt buộc):');
      if (!reason || reason.trim() === '') {
        setLoading(false);
        return;
      }
      const res = await cancelProductionCostLine(id, reason);
      if (!res.success) {
        alert(res.error || 'Có lỗi xảy ra');
      } else {
        router.refresh();
      }
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!canEdit && additionalCostLines.length === 0) {
    return null;
  }

  return (
    <div className="mt-8 border-t border-slate-200 dark:border-slate-700 pt-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-md font-bold text-slate-800 dark:text-white flex items-center gap-2">
          Chi phí sản xuất khác (Nhân công, Gia công, ...)
        </h3>
        {canEdit && !isFormOpen && (
          <button 
            onClick={() => setIsFormOpen(true)}
            className="flex items-center gap-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm chi phí
          </button>
        )}
      </div>

      {isFormOpen && (
        <form onSubmit={handleSubmit} className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg mb-6 border border-slate-200 dark:border-slate-700">
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-bold text-slate-700">{editingId ? 'Cập nhật chi phí' : 'Thêm chi phí mới'}</h4>
            <button type="button" onClick={resetForm} className="p-1 hover:bg-slate-200 rounded-full text-slate-500">
              <X className="w-4 h-4" />
            </button>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-md text-sm flex items-center gap-2">
              <AlertCircle className="w-4 h-4" />
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Loại chi phí *</label>
              <select 
                value={category} 
                onChange={(e) => setCategory(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              >
                {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Mô tả / Nội dung *</label>
              <input 
                type="text" 
                value={description} 
                onChange={(e) => setDescription(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="VD: Gia công cán màng, Nhân công tăng ca..."
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Số lượng *</label>
              <input 
                type="number" 
                min="1"
                value={quantity} 
                onChange={(e) => setQuantity(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Đơn giá *</label>
              <input 
                type="number" 
                min="0"
                value={unitCost} 
                onChange={(e) => setUnitCost(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Nhà cung cấp (Gia công ngoài)</label>
              <input 
                type="text" 
                value={vendorName} 
                onChange={(e) => setVendorName(e.target.value)}
                className="w-full border border-slate-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="Tên đối tác gia công..."
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-500 mb-1">Tổng cộng (Tự tính)</label>
              <div className="w-full border border-slate-200 bg-slate-100 rounded-md p-2 text-sm font-bold text-slate-600">
                {(quantity * unitCost).toLocaleString()} đ
              </div>
            </div>
          </div>
          
          <div className="flex justify-end gap-2 mt-4">
            <button 
              type="button" 
              onClick={resetForm}
              className="px-4 py-2 border border-slate-300 rounded-md text-sm font-medium hover:bg-slate-100 transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            <button 
              type="submit" 
              className="px-4 py-2 bg-indigo-600 text-white rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
              disabled={loading}
            >
              {loading ? 'Đang xử lý...' : (editingId ? 'Cập nhật' : 'Thêm chi phí')}
            </button>
          </div>
        </form>
      )}

      {additionalCostLines.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-slate-100 dark:bg-slate-700/50 text-slate-600">
              <tr>
                <th className="p-3">Loại</th>
                <th className="p-3">Nội dung</th>
                <th className="p-3 text-right">SL</th>
                <th className="p-3 text-right">Đơn giá</th>
                <th className="p-3 text-right">Thành tiền</th>
                <th className="p-3">NCC / Ghi chú</th>
                <th className="p-3 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {additionalCostLines.map((line) => {
                const isCancelled = line.status === 'CANCELLED';
                return (
                  <tr key={line.id} className={`hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors ${isCancelled ? 'opacity-50' : ''}`}>
                    <td className="p-3 font-medium">
                      {CATEGORIES.find(c => c.value === line.category)?.label || line.category}
                      {isCancelled && <span className="ml-2 text-xs bg-red-100 text-red-600 px-1.5 py-0.5 rounded">Đã hủy</span>}
                    </td>
                    <td className="p-3">{line.description}</td>
                    <td className="p-3 text-right">{line.quantity.toLocaleString()}</td>
                    <td className="p-3 text-right">{line.unitCost.toLocaleString()} đ</td>
                    <td className={`p-3 text-right font-bold ${isCancelled ? 'line-through text-slate-400' : 'text-indigo-600'}`}>
                      {line.totalCost.toLocaleString()} đ
                    </td>
                    <td className="p-3 text-xs text-slate-500">
                      {line.vendorName && <div className="font-semibold">{line.vendorName}</div>}
                      {line.note && <div>{line.note}</div>}
                    </td>
                    <td className="p-3 text-center">
                      {!isCancelled && canEdit && (
                        <div className="flex items-center justify-center gap-2">
                          <button onClick={() => handleEdit(line)} className="text-blue-500 hover:text-blue-700" title="Sửa">
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleCancel(line.id)} className="text-red-500 hover:text-red-700" title="Hủy bỏ">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-slate-50 dark:bg-slate-800 font-bold border-t-2 border-slate-200">
              <tr>
                <td colSpan={4} className="p-3 text-right">Tổng chi phí khác (thực tế):</td>
                <td className="p-3 text-right text-lg text-indigo-700">{actualAdditionalCost.toLocaleString()} đ</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      ) : (
        <div className="text-center p-4 border border-dashed border-slate-300 rounded-lg text-slate-500 italic">
          Chưa có chi phí khác.
        </div>
      )}
    </div>
  );
}
