'use client';

import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, Save, Loader2 } from 'lucide-react';
import { getManagementCostDrilldown, updateManagementMarginReview } from '@/lib/management-cost-report-actions';

export default function ManagementCostDrilldownPanel({
  orderId,
  isOpen,
  onClose
}: {
  orderId: string | null;
  isOpen: boolean;
  onClose: () => void;
}) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const [error, setError] = useState('');
  
  const [flag, setFlag] = useState(false);
  const [note, setNote] = useState('');

  useEffect(() => {
    if (isOpen && orderId) {
      loadData(orderId);
    }
  }, [isOpen, orderId]);

  const loadData = async (id: string) => {
    setLoading(true);
    setError('');
    const res = await getManagementCostDrilldown(id);
    if (res.success) {
      setData(res.data);
      setFlag(res.data?.order?.managementMarginFlag || false);
      setNote(res.data?.order?.managementMarginNote || '');
    } else {
      setError(res.error || 'Failed to load details');
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!orderId) return;
    setSaving(true);
    const res = await updateManagementMarginReview(orderId, flag, note);
    if (res.success) {
      alert('Đã lưu thành công!');
      loadData(orderId);
    } else {
      alert(res.error || 'Lưu thất bại');
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <>
      <div className="fixed inset-0 bg-black/30 z-40" onClick={onClose} />
      <div className="fixed inset-y-0 right-0 w-full max-w-2xl bg-slate-50 shadow-2xl z-50 flex flex-col transform transition-transform duration-300">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-white">
          <h2 className="text-xl font-bold text-slate-800">
            Chi tiết Chi phí Đơn hàng
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 rounded-full text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-40">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
            </div>
          ) : error ? (
            <div className="text-red-500 bg-red-50 p-4 rounded-lg">{error}</div>
          ) : data ? (
            <div className="space-y-6">
              
              {/* KPIs */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium mb-1">Doanh thu</div>
                  <div className="text-lg font-bold text-slate-800">{data.revenue.toLocaleString()} đ</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium mb-1">Tổng chi phí</div>
                  <div className="text-lg font-bold text-red-600">{data.actualProductionCost.toLocaleString()} đ</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium mb-1">Lợi nhuận gộp</div>
                  <div className="text-lg font-bold text-emerald-600">{data.grossProfit.toLocaleString()} đ</div>
                </div>
                <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-sm">
                  <div className="text-xs text-slate-500 font-medium mb-1">Margin</div>
                  <div className={`text-lg font-bold ${data.grossMarginPercent < 20 ? 'text-orange-600' : 'text-blue-600'}`}>
                    {data.grossMarginPercent.toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Material Cost */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex justify-between">
                  <span>Vật tư đã xuất (COMPLETED)</span>
                  <span>{data.actualMaterialCost.toLocaleString()} đ</span>
                </div>
                <div className="p-4">
                  {!data.order.productionJob?.inventoryOutboundReceipts?.length ? (
                    <div className="text-sm text-slate-500 text-center py-2">Không có phiếu xuất kho hoàn thành nào.</div>
                  ) : (
                    <ul className="space-y-3">
                      {data.order.productionJob.inventoryOutboundReceipts.map((pxk: any) => (
                        <li key={pxk.id} className="border border-slate-100 rounded-lg p-3">
                          <div className="text-xs font-bold text-slate-600 mb-2">PXK: {pxk.receiptCode}</div>
                          <table className="w-full text-xs text-left">
                            <thead className="text-slate-400 border-b border-slate-100">
                              <tr>
                                <th className="pb-1">Vật tư</th>
                                <th className="pb-1 text-right">SL Base</th>
                                <th className="pb-1 text-right">Đơn giá</th>
                                <th className="pb-1 text-right">Thành tiền</th>
                              </tr>
                            </thead>
                            <tbody>
                              {pxk.items.map((item: any) => (
                                <tr key={item.id} className="border-b border-slate-50 last:border-0">
                                  <td className="py-1">{item.inventoryItem?.name} ({item.inventoryItem?.sku})</td>
                                  <td className="py-1 text-right">{item.quantityBase}</td>
                                  <td className="py-1 text-right">{item.unitCost?.toLocaleString()} đ</td>
                                  <td className="py-1 text-right font-medium">{item.totalCost?.toLocaleString()} đ</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>

              {/* Additional Cost */}
              <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 font-semibold text-slate-700 flex justify-between">
                  <span>Chi phí phát sinh (Gia công/Khác)</span>
                  <span>{data.actualAdditionalCost.toLocaleString()} đ</span>
                </div>
                <div className="p-4">
                  {!data.order.productionJob?.costLines?.length ? (
                    <div className="text-sm text-slate-500 text-center py-2">Không có chi phí phát sinh nào.</div>
                  ) : (
                    <table className="w-full text-sm text-left">
                      <thead className="text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="pb-2">Nội dung</th>
                          <th className="pb-2">Trạng thái</th>
                          <th className="pb-2 text-right">Thành tiền</th>
                        </tr>
                      </thead>
                      <tbody>
                        {data.order.productionJob.costLines.map((costLine: any) => (
                          <tr key={costLine.id} className={`border-b border-slate-100 last:border-0 ${costLine.status === 'CANCELLED' ? 'opacity-50 line-through' : ''}`}>
                            <td className="py-2">{costLine.description}</td>
                            <td className="py-2">
                              {costLine.status === 'CANCELLED' ? (
                                <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded">CANCELLED</span>
                              ) : (
                                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded">ACTIVE</span>
                              )}
                            </td>
                            <td className="py-2 text-right font-medium">{costLine.totalCost.toLocaleString()} đ</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>
              </div>

              {/* Management Decision Form */}
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-orange-800 mb-4 flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5" />
                  Đánh giá Quản trị (Margin Review)
                </h3>
                
                <div className="mb-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      className="w-5 h-5 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
                      checked={flag}
                      onChange={(e) => setFlag(e.target.checked)}
                    />
                    <span className="font-medium text-slate-700">Đánh dấu đơn hàng có vấn đề Margin cần theo dõi</span>
                  </label>
                </div>

                <div className="mb-4">
                  <label className="block text-sm font-medium text-slate-700 mb-1">Ghi chú phân tích nguyên nhân</label>
                  <textarea
                    className="w-full border border-slate-300 rounded-md p-3 text-sm outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    rows={4}
                    placeholder="Nhập ghi chú giải trình lý do margin thấp, hoặc ghi chú quản trị..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    maxLength={2000}
                  ></textarea>
                </div>

                <div className="flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    {data.order.managementMarginReviewedAt ? (
                      <>Cập nhật lần cuối: {new Date(data.order.managementMarginReviewedAt).toLocaleString('vi-VN')} bởi {data.order.managementMarginReviewedBy?.name || 'Ẩn danh'}</>
                    ) : (
                      <>Chưa có đánh giá</>
                    )}
                  </div>
                  <button 
                    onClick={handleSave}
                    disabled={saving}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium text-sm flex items-center gap-2 transition-colors disabled:opacity-50"
                  >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Lưu đánh giá
                  </button>
                </div>
              </div>

            </div>
          ) : null}
        </div>
      </div>
    </>
  );
}
