'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { cancelInboundReceipt } from '@/lib/inventory-inbound-actions';
import { ArrowLeft, Printer, Ban, ShieldAlert } from 'lucide-react';
import Link from 'next/link';

export default function InboundDetailClient({ receipt, userRole }: { receipt: any, userRole: string }) {
  const router = useRouter();
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const canCancel = ['ADMIN', 'MANAGER'].includes(userRole) && receipt.status === 'COMPLETED';

  const handleCancel = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await cancelInboundReceipt(receipt.id, cancelReason);
      setShowCancelModal(false);
      router.refresh();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const totalCost = receipt.items.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-start">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/inventory/inbound" className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{receipt.receiptCode}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                receipt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
              }`}>
                {receipt.status === 'COMPLETED' ? 'Hoàn tất' : 'Đã hủy'}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">Chi tiết phiếu nhập kho</p>
          </div>
        </div>
        <div className="flex gap-2">
          {canCancel && (
            <button 
              onClick={() => setShowCancelModal(true)}
              className="flex items-center gap-2 bg-white border border-rose-200 text-rose-600 hover:bg-rose-50 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Ban className="h-4 w-4" />
              Hủy Phiếu Nhập
            </button>
          )}
          <Link 
            href={`/dashboard/inventory/inbound/${receipt.id}/print`}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Printer className="h-4 w-4" />
            In Phiếu
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200 space-y-4">
          <h3 className="font-bold text-slate-800 border-b pb-2">Thông tin chung</h3>
          <div className="grid grid-cols-2 gap-y-4 text-sm">
            <div>
              <div className="text-slate-500 mb-1">Nhà cung cấp</div>
              <div className="font-medium text-slate-900">{receipt.supplierName || '-'}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Số chứng từ / Hóa đơn</div>
              <div className="font-medium text-slate-900">{receipt.documentNo || '-'}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Ngày nhập</div>
              <div className="font-medium text-slate-900">{new Date(receipt.receivedAt).toLocaleDateString('vi-VN')}</div>
            </div>
            <div>
              <div className="text-slate-500 mb-1">Ngày tạo phiếu</div>
              <div className="font-medium text-slate-900">{new Date(receipt.createdAt).toLocaleString('vi-VN')}</div>
            </div>
            <div className="col-span-2">
              <div className="text-slate-500 mb-1">Ghi chú</div>
              <div className="font-medium text-slate-900">{receipt.note || '-'}</div>
            </div>
          </div>
        </div>

        {receipt.status === 'CANCELLED' && (
          <div className="bg-rose-50 p-6 rounded-xl shadow-sm border border-rose-200 space-y-4">
            <h3 className="font-bold text-rose-800 border-b border-rose-200 pb-2 flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" /> Thông tin hủy phiếu
            </h3>
            <div className="grid grid-cols-1 gap-y-4 text-sm">
              <div>
                <div className="text-rose-600/80 mb-1">Thời gian hủy</div>
                <div className="font-medium text-rose-900">{new Date(receipt.cancelledAt).toLocaleString('vi-VN')}</div>
              </div>
              <div>
                <div className="text-rose-600/80 mb-1">Lý do hủy</div>
                <div className="font-medium text-rose-900">{receipt.cancelReason}</div>
              </div>
              <div className="mt-2 text-xs text-rose-600 italic">
                * Lưu ý: Average Cost của vật tư không được rollback khi hủy phiếu. Các lịch sử giao dịch kho (IMPORT) đã được tạo thêm giao dịch đối ứng (IMPORT_CANCELLED) để cân bằng tồn kho.
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 bg-slate-50">
          <h3 className="font-bold text-slate-800">Chi tiết vật tư nhập</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold w-12">#</th>
                <th className="px-4 py-3 font-semibold">Mã Vật Tư</th>
                <th className="px-4 py-3 font-semibold">Tên Vật Tư</th>
                <th className="px-4 py-3 font-semibold">Khu kho</th>
                <th className="px-4 py-3 font-semibold text-right">Tồn trước</th>
                <th className="px-4 py-3 font-semibold text-right">SL Nhập</th>
                <th className="px-4 py-3 font-semibold text-right">Tồn sau</th>
                <th className="px-4 py-3 font-semibold text-right">Đơn giá</th>
                <th className="px-4 py-3 font-semibold text-right">Thành tiền</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipt.items.map((item: any, index: number) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-400">{index + 1}</td>
                  <td className="px-4 py-3 font-medium text-indigo-600">{item.itemCode}</td>
                  <td className="px-4 py-3 text-slate-900">{item.itemName}</td>
                  <td className="px-4 py-3 text-slate-500 text-xs">
                    {item.warehouseZoneName || '-'}
                  </td>
                  <td className="px-4 py-3 text-right text-slate-500">
                    {item.stockBeforeBase} <span className="text-[10px]">{item.stockBaseUnit}</span>
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-emerald-600">
                    +{item.quantityBase} <span className="text-[10px]">{item.stockBaseUnit}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-700 font-medium">
                    {item.stockAfterBase} <span className="text-[10px]">{item.stockBaseUnit}</span>
                  </td>
                  <td className="px-4 py-3 text-right text-slate-600">
                    {item.unitCost ? item.unitCost.toLocaleString('vi-VN') : '-'}
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-slate-900">
                    {item.totalCost ? item.totalCost.toLocaleString('vi-VN') : '-'}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="bg-slate-50 border-t border-slate-200 font-bold text-slate-900">
              <tr>
                <td colSpan={8} className="px-4 py-4 text-right">Tổng cộng:</td>
                <td className="px-4 py-4 text-right text-lg text-indigo-700">
                  {totalCost.toLocaleString('vi-VN')} đ
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50">
              <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                <ShieldAlert className="h-5 w-5 text-rose-600" />
                Hủy Phiếu Nhập Kho
              </h3>
              <button onClick={() => setShowCancelModal(false)} className="text-slate-400 hover:text-slate-600">
                ✕
              </button>
            </div>
            
            <form onSubmit={handleCancel} className="p-6 space-y-4">
              {error && (
                <div className="bg-rose-50 border border-rose-200 text-rose-700 p-3 rounded-lg text-sm font-medium">
                  {error}
                </div>
              )}
              
              <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg text-sm space-y-2">
                <p><strong>Cảnh báo:</strong> Hành động này sẽ trừ lại số lượng vật tư đã nhập trong phiếu này khỏi tồn kho hiện tại.</p>
                <p>Hệ thống sẽ từ chối hủy nếu bất kỳ vật tư nào trong phiếu có tồn kho hiện tại nhỏ hơn số lượng đã nhập.</p>
              </div>

              <div>
                <label className="block text-sm font-bold text-slate-700 mb-2">Lý do hủy phiếu *</label>
                <textarea 
                  required
                  rows={3}
                  value={cancelReason}
                  onChange={e => setCancelReason(e.target.value)}
                  className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-rose-500"
                  placeholder="Nhập lý do hủy chi tiết..."
                />
              </div>

              <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={() => setShowCancelModal(false)} className="px-5 py-2.5 border rounded-lg text-sm font-medium hover:bg-slate-50">
                  Đóng
                </button>
                <button type="submit" disabled={loading} className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-sm font-medium">
                  {loading ? 'Đang xử lý...' : 'Xác nhận Hủy Phiếu'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
