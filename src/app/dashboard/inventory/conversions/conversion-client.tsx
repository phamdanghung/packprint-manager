'use client';

import React, { useState } from 'react';
import { Package, Plus, Search, Scissors } from 'lucide-react';
import { convertMaterial } from '@/lib/inventory-actions';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function ConversionClient({ initialItems, initialConversions, userRole }: any) {
  const [conversions, setConversions] = useState(initialConversions);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const router = useRouter();

  const canModify = ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(userRole);

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
                <th className="px-4 py-3 font-semibold">Slg gốc (Base)</th>
                <th className="px-4 py-3 font-semibold">Kết quả cắt</th>
                <th className="px-4 py-3 font-semibold">Slg kết quả (Base)</th>
                                <th className="px-4 py-3 font-semibold">Tham chiếu</th>
                <th className="px-4 py-3 font-semibold">Người tạo</th>
                <th className="px-4 py-3 font-semibold">Thời gian</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {conversions.map((conv: any) => (
                <tr key={conv.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{conv.id.slice(-6).toUpperCase()}</td>
                  <td className="px-4 py-3 text-rose-600 font-medium">{conv.fromMaterial?.name}</td>
                  <td className="px-4 py-3 text-rose-600">-{conv.fromQuantityBase}</td>
                  <td className="px-4 py-3 text-emerald-600 font-medium">
                    {conv.outputLines.map((o: any) => o.toMaterial?.name).join(', ')}
                  </td>
                  <td className="px-4 py-3 text-emerald-600">
                    +{conv.outputLines.map((o: any) => o.toQuantityBase).join(', ')}
                  </td>
                                    <td className="px-4 py-3 text-sm">
                    {conv.orderId && <div>ĐH: <Link href={`/dashboard/orders/${conv.orderId}`} className="text-blue-500 hover:underline">{conv.order?.orderCode}</Link></div>}
                    {conv.productionJobId && <div>LSX: <Link href={`/dashboard/production/${conv.productionJobId}`} className="text-blue-500 hover:underline">{conv.productionJob?.jobCode}</Link></div>}
                  </td>
                  <td className="px-4 py-3 text-slate-600">{conv.createdBy?.name}</td>
                  <td className="px-4 py-3 text-slate-500">{new Date(conv.createdAt).toLocaleString('vi-VN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && <CreateConversionModal items={initialItems} onClose={() => setShowCreateModal(false)} />}
    </div>
  );
}

function CreateConversionModal({ items, onClose }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    try {
      await convertMaterial({
        fromMaterialId: formData.get('fromMaterialId') as string,
        fromQuantityBase: Number(formData.get('fromQuantityBase')),
        toMaterialId: formData.get('toMaterialId') as string,
        toQuantityBase: Number(formData.get('toQuantityBase')),
        wasteQuantityBase: Number(formData.get('wasteQuantityBase')) || 0,
        note: formData.get('note') as string,
      });
      router.refresh();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg p-4 space-y-4">
        <h3 className="font-bold text-lg border-b pb-2 flex items-center gap-2"><Scissors className="h-5 w-5"/> Cắt giấy (Chuyển đổi)</h3>
        {error && <div className="p-2 bg-rose-50 text-rose-600 text-sm rounded">{error}</div>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="bg-slate-50 p-3 rounded border">
            <label className="block text-xs font-bold mb-1">Vật tư gốc (Bị trừ đi) *</label>
            <select name="fromMaterialId" required className="w-full p-2 border rounded text-sm mb-2">
              <option value="">- Chọn giấy mẹ -</option>
              {items.map((i: any) => <option key={i.id} value={i.id}>{i.name} ({i.currentStockBase} {i.stockBaseUnit})</option>)}
            </select>
            <input name="fromQuantityBase" type="number" min="1" placeholder="Số lượng trừ (VD: 100 tờ lớn)" required className="w-full p-2 border rounded text-sm" />
          </div>

          <div className="bg-indigo-50 p-3 rounded border border-indigo-100">
            <label className="block text-xs font-bold mb-1 text-indigo-900">Vật tư đích (Được cộng vào) *</label>
            <select name="toMaterialId" required className="w-full p-2 border rounded text-sm mb-2">
              <option value="">- Chọn giấy con -</option>
              {items.map((i: any) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <input name="toQuantityBase" type="number" min="1" placeholder="Số lượng cộng (VD: 900 tờ nhỏ)" required className="w-full p-2 border rounded text-sm" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1">Hao hụt / Phế phẩm (Base) nếu có</label>
            <input name="wasteQuantityBase" type="number" defaultValue="0" min="0" className="w-full p-2 border rounded text-sm" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1">Ghi chú</label>
            <input name="note" placeholder="VD: Cắt cho lệnh sx mã #123" className="w-full p-2 border rounded text-sm" />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">{loading ? 'Đang xử lý...' : 'Xác nhận'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
