'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
// import { format } from 'date-fns';
import { getOutboundTypeLabel, getOutboundStatusLabel } from '@/lib/inventory-outbound-types';
import { cancelOutboundReceipt } from '@/lib/inventory-outbound-actions';
import { formatCurrencyVND, formatDateTime } from '@/lib/utils';
import toast from 'react-hot-toast';
import { ArrowLeft, Ban, FileText, CheckCircle2, XCircle } from 'lucide-react';

export default function OutboundDetailClient({ receipt, userRole }: { receipt: any, userRole: string }) {
  const router = useRouter();
  const [isCancelling, setIsCancelling] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelModal, setShowCancelModal] = useState(false);

  const canCancel = (userRole === 'ADMIN' || userRole === 'MANAGER') && receipt.status === 'COMPLETED';
  const showCosts = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);

  const handleCancel = async () => {
    if (!cancelReason.trim()) {
      toast.error('Vui lòng nhập lý do hủy phiếu');
      return;
    }

    try {
      setIsCancelling(true);
      const res = await cancelOutboundReceipt(receipt.id, cancelReason);
      if (res.success) {
        toast.success('Hủy phiếu xuất kho thành công');
        setShowCancelModal(false);
        router.refresh();
      } else {
        toast.error(res.error || 'Lỗi khi hủy phiếu xuất');
      }
    } catch (error: any) {
      toast.error(error.message || 'Lỗi hệ thống');
    } finally {
      setIsCancelling(false);
    }
  };

  const totalCost = receipt.items.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard/inventory/outbound"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">{receipt.receiptCode}</h1>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                receipt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
              }`}>
                {receipt.status === 'COMPLETED' ? <CheckCircle2 className="w-3 h-3 mr-1" /> : <XCircle className="w-3 h-3 mr-1" />}
                {getOutboundStatusLabel(receipt.status)}
              </span>
            </div>
            <p className="text-gray-500 mt-1">Chi tiết phiếu xuất kho</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {canCancel && (
            <button
              onClick={() => setShowCancelModal(true)}
              className="inline-flex items-center px-4 py-2 text-sm font-medium text-red-700 bg-red-50 border border-transparent rounded-lg hover:bg-red-100"
            >
              <Ban className="w-4 h-4 mr-2" />
              Hủy phiếu xuất
            </button>
          )}
          <Link
            href={`/dashboard/inventory/outbound/${receipt.id}/print`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            <FileText className="w-4 h-4 mr-2" />
            In phiếu xuất
          </Link>
        </div>
      </div>

      {receipt.status === 'CANCELLED' && (
        <div className="bg-red-50 border border-red-100 rounded-xl p-4 flex gap-3 text-red-800">
          <Ban className="w-5 h-5 shrink-0" />
          <div>
            <p className="font-medium">Phiếu xuất này đã bị hủy</p>
            <p className="text-sm mt-1">Lý do: {receipt.cancelReason}</p>
            <p className="text-sm mt-1 text-red-600/80">Lúc: {formatDateTime(receipt.cancelledAt)}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Thông tin xuất kho</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Loại xuất kho</p>
              <p className="font-medium text-gray-900 mt-1">{getOutboundTypeLabel(receipt.outboundType)}</p>
            </div>
            <div>
              <p className="text-gray-500">Ngày xuất</p>
              <p className="font-medium text-gray-900 mt-1">{formatDateTime(receipt.issuedAt)}</p>
            </div>
            {receipt.productionJobId && (
              <div>
                <p className="text-gray-500">Lệnh sản xuất</p>
                <p className="font-medium text-blue-600 mt-1">{receipt.productionJobId}</p>
              </div>
            )}
            {receipt.orderId && (
              <div>
                <p className="text-gray-500">Đơn hàng</p>
                <p className="font-medium text-blue-600 mt-1">{receipt.orderId}</p>
              </div>
            )}
            <div className="col-span-2">
              <p className="text-gray-500">Ghi chú</p>
              <p className="font-medium text-gray-900 mt-1 whitespace-pre-wrap">{receipt.note || '-'}</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900 border-b pb-2">Thông tin người nhận</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-gray-500">Tên người nhận</p>
              <p className="font-medium text-gray-900 mt-1">{receipt.receiverName || '-'}</p>
            </div>
            <div>
              <p className="text-gray-500">Bộ phận nhận</p>
              <p className="font-medium text-gray-900 mt-1">{receipt.receiverDepartment || '-'}</p>
            </div>
            {showCosts && (
              <div className="col-span-2 mt-2 p-3 bg-gray-50 rounded-lg">
                <p className="text-gray-500 mb-1">Tổng giá vốn xuất</p>
                <p className="text-lg font-bold text-gray-900">{formatCurrencyVND(totalCost)}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-6 border-b">
          <h2 className="text-base font-semibold text-gray-900">Chi tiết vật tư</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50">
              <tr>
                <th className="px-6 py-4 font-medium">Mã VT</th>
                <th className="px-6 py-4 font-medium">Tên vật tư</th>
                <th className="px-6 py-4 font-medium">Khu kho</th>
                <th className="px-6 py-4 font-medium">ĐVT</th>
                <th className="px-6 py-4 font-medium text-right">SL xuất</th>
                <th className="px-6 py-4 font-medium text-right text-gray-400">Tồn trước</th>
                <th className="px-6 py-4 font-medium text-right text-gray-400">Tồn sau</th>
                {showCosts && <th className="px-6 py-4 font-medium text-right">Giá vốn</th>}
                {showCosts && <th className="px-6 py-4 font-medium text-right">Thành tiền vốn</th>}
                <th className="px-6 py-4 font-medium">Ghi chú</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {receipt.items.map((item: any) => (
                <tr key={item.id} className="hover:bg-gray-50/30">
                  <td className="px-6 py-4 font-medium text-gray-900">{item.itemCode}</td>
                  <td className="px-6 py-4 text-gray-600">{item.itemName}</td>
                  <td className="px-6 py-4 text-gray-600">
                    {item.warehouseZoneName || <span className="text-gray-400 italic">Trống</span>}
                  </td>
                  <td className="px-6 py-4 text-gray-600">{item.stockBaseUnit}</td>
                  <td className="px-6 py-4 text-right font-medium text-gray-900">
                    {item.quantityBase.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {item.stockBeforeBase.toLocaleString()}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {item.stockAfterBase.toLocaleString()}
                  </td>
                  {showCosts && (
                    <td className="px-6 py-4 text-right text-gray-600">
                      {formatCurrencyVND(item.unitCost || 0)}
                    </td>
                  )}
                  {showCosts && (
                    <td className="px-6 py-4 text-right font-medium text-gray-900">
                      {formatCurrencyVND(item.totalCost || 0)}
                    </td>
                  )}
                  <td className="px-6 py-4 text-gray-500">{item.note || '-'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCancelModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-xl shadow-xl max-w-md w-full overflow-hidden">
            <div className="p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-2">Xác nhận hủy phiếu xuất</h3>
              <p className="text-sm text-gray-500 mb-4">
                Bạn có chắc chắn muốn hủy phiếu <strong>{receipt.receiptCode}</strong> không? 
                Hành động này sẽ cộng lại tồn kho của các vật tư trong phiếu.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lý do hủy (bắt buộc)
                  </label>
                  <textarea
                    value={cancelReason}
                    onChange={e => setCancelReason(e.target.value)}
                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    rows={3}
                    placeholder="Nhập lý do hủy phiếu..."
                    required
                  />
                </div>
              </div>
            </div>
            <div className="px-6 py-4 bg-gray-50 flex justify-end gap-3 border-t">
              <button
                type="button"
                onClick={() => {
                  setShowCancelModal(false);
                  setCancelReason('');
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Đóng
              </button>
              <button
                type="button"
                onClick={handleCancel}
                disabled={isCancelling || !cancelReason.trim()}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 disabled:opacity-50"
              >
                {isCancelling ? 'Đang xử lý...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
