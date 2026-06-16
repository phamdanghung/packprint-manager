'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, AlertCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { createProductionMaterialIssueReceipt } from '@/lib/production-material-issue-actions';

export default function IssueMaterialsClient({ productionJobId, materialIssueStatus, currentUser }: { productionJobId: string, materialIssueStatus: any, currentUser: any }) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [receiverName, setReceiverName] = useState(currentUser.name || '');
  const [receiverDepartment, setReceiverDepartment] = useState('Phân xưởng sản xuất');
  const [note, setNote] = useState(`Cấp vật tư cho lệnh sản xuất ${materialIssueStatus.productionJob.jobCode}`);

  // Initialize issue quantities with remaining quantities
  const [issueQuantities, setIssueQuantities] = useState<Record<string, number>>(() => {
    const initial: Record<string, number> = {};
    materialIssueStatus.items.forEach((item: any) => {
      // Only set initial if there is remaining quantity and sufficient stock
      // Wait, we should allow them to edit even if insufficient stock (so they see the error when they type), but cap at available stock?
      // Default to what's available up to remaining.
      const qtyToIssue = Math.min(item.remainingQuantityBase, item.currentStockBase);
      initial[item.inventoryItemId] = Math.max(0, qtyToIssue);
    });
    return initial;
  });

  const [notes, setNotes] = useState<Record<string, string>>({});

  const handleQuantityChange = (itemId: string, value: string, maxRemaining: number, maxStock: number) => {
    let numValue = parseInt(value, 10);
    if (isNaN(numValue) || numValue < 0) numValue = 0;
    
    // Warn but allow input, we'll validate on submit or cap it here.
    // For better UX, let's cap it at the max allowed (min of remaining and stock)
    const maxAllowed = Math.min(maxRemaining, maxStock);
    if (numValue > maxAllowed) numValue = maxAllowed;

    setIssueQuantities(prev => ({ ...prev, [itemId]: numValue }));
  };

  const handleNoteChange = (itemId: string, value: string) => {
    setNotes(prev => ({ ...prev, [itemId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const itemsToIssue = materialIssueStatus.items
      .filter((item: any) => issueQuantities[item.inventoryItemId] > 0)
      .map((item: any) => ({
        inventoryItemId: item.inventoryItemId,
        quantityBase: issueQuantities[item.inventoryItemId],
        note: notes[item.inventoryItemId] || ''
      }));

    if (itemsToIssue.length === 0) {
      toast.error('Vui lòng chọn ít nhất 1 vật tư để cấp');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await createProductionMaterialIssueReceipt({
        productionJobId,
        receiverName,
        receiverDepartment,
        note,
        items: itemsToIssue
      });

      if (!res.success) {
        toast.error((res as any).error || 'Lỗi khi tạo phiếu xuất');
        setIsSubmitting(false);
        return;
      }

      toast.success('Tạo phiếu xuất kho thành công');
      router.push(`/dashboard/inventory/outbound/${(res as any).data?.id}`);
    } catch (error: any) {
      toast.error(error.message || 'Lỗi hệ thống');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href={`/dashboard/production/${productionJobId}`} className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
          <ArrowLeft className="w-5 h-5 text-slate-600" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Cấp vật tư sản xuất</h1>
          <p className="text-sm text-slate-500">Lệnh SX: {materialIssueStatus.productionJob.jobCode} - {materialIssueStatus.productionJob.customerName}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
              <h2 className="text-lg font-bold mb-4">Danh sách vật tư</h2>
              
              <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                  <thead className="bg-slate-100 dark:bg-slate-700/50">
                    <tr>
                      <th className="p-2">Vật tư</th>
                      <th className="p-2 text-right">Tồn kho</th>
                      <th className="p-2 text-right">Cần cấp</th>
                      <th className="p-2 text-right">Số lượng xuất</th>
                      <th className="p-2">Ghi chú</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                    {materialIssueStatus.items.map((item: any) => {
                      const remaining = item.remainingQuantityBase;
                      const stock = item.currentStockBase;
                      const maxAllowed = Math.min(remaining, stock);
                      const isShortage = remaining > stock;
                      const isDone = remaining === 0;

                      if (isDone) return null;

                      return (
                        <tr key={item.inventoryItemId} className={isShortage ? 'bg-red-50/50' : ''}>
                          <td className="p-2">
                            <div className="font-mono text-xs text-slate-500">{item.itemCode}</div>
                            <div className="font-medium">{item.itemName}</div>
                            <div className="text-xs text-slate-500">{item.warehouseZoneName}</div>
                            {isShortage && (
                              <div className="text-xs text-red-600 font-medium flex items-center gap-1 mt-1">
                                <AlertCircle className="w-3 h-3" /> Thiếu {item.shortageQuantityBase}
                              </div>
                            )}
                          </td>
                          <td className="p-2 text-right">
                            <div className={`font-medium ${stock === 0 ? 'text-red-600' : ''}`}>{stock}</div>
                            <div className="text-xs text-slate-500">{item.stockBaseUnit}</div>
                          </td>
                          <td className="p-2 text-right">
                            <div className="font-bold text-blue-600">{remaining}</div>
                            <div className="text-xs text-slate-500">{item.stockBaseUnit}</div>
                          </td>
                          <td className="p-2 w-32">
                            <input
                              type="number"
                              min="0"
                              max={maxAllowed}
                              value={issueQuantities[item.inventoryItemId] || 0}
                              onChange={(e) => handleQuantityChange(item.inventoryItemId, e.target.value, remaining, stock)}
                              className="w-full text-right p-1.5 border rounded-md"
                              disabled={maxAllowed === 0 || isSubmitting}
                            />
                          </td>
                          <td className="p-2">
                            <input
                              type="text"
                              placeholder="Ghi chú..."
                              value={notes[item.inventoryItemId] || ''}
                              onChange={(e) => handleNoteChange(item.inventoryItemId, e.target.value)}
                              className="w-full p-1.5 border rounded-md text-xs"
                              disabled={isSubmitting}
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 space-y-4">
              <h2 className="text-lg font-bold">Thông tin chung</h2>
              
              <div>
                <label className="block text-sm font-medium mb-1">Người nhận</label>
                <input
                  type="text"
                  required
                  value={receiverName}
                  onChange={e => setReceiverName(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Bộ phận / Phòng ban</label>
                <input
                  type="text"
                  value={receiverDepartment}
                  onChange={e => setReceiverDepartment(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  disabled={isSubmitting}
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Ghi chú phiếu xuất</label>
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value)}
                  className="w-full p-2 border rounded-lg"
                  rows={3}
                  disabled={isSubmitting}
                />
              </div>

              <div className="pt-4 border-t border-slate-100">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2.5 rounded-lg font-bold shadow hover:bg-blue-700 disabled:opacity-50"
                >
                  <Save className="w-5 h-5" />
                  {isSubmitting ? 'Đang xử lý...' : 'Tạo phiếu xuất kho'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
