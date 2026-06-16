'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, Calendar, Tag, AlertCircle, QrCode } from 'lucide-react';
import { formatDate } from '@/lib/utils';
import ProductionTimeline from './production-timeline';
import ProductionLogViewer from './production-log';
import ProductionAdditionalCost from './production-additional-cost';

const STATUS_BADGES: Record<string, string> = {
  READY_FOR_PRINT: 'bg-blue-100 text-blue-800',
  PRINTING: 'bg-indigo-100 text-indigo-800',
  LAMINATING: 'bg-purple-100 text-purple-800',
  DIE_CUTTING: 'bg-fuchsia-100 text-fuchsia-800',
  QC: 'bg-amber-100 text-amber-800',
  PACKING: 'bg-orange-100 text-orange-800',
  READY_FOR_DELIVERY: 'bg-emerald-100 text-emerald-800',
  ON_HOLD: 'bg-slate-200 text-slate-800',
  REWORK: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800'
};

const STATUS_LABELS: Record<string, string> = {
  READY_FOR_PRINT: 'Sẵn sàng in',
  PRINTING: 'Đang in',
  LAMINATING: 'Đang cán màng',
  DIE_CUTTING: 'Đang bế',
  QC: 'Kiểm tra chất lượng',
  PACKING: 'Đóng gói',
  READY_FOR_DELIVERY: 'Sẵn sàng giao',
  ON_HOLD: 'Tạm dừng',
  REWORK: 'Cần xử lý lại',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất'
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Thấp',
  NORMAL: 'Bình thường',
  HIGH: 'Cao',
  URGENT: 'Gấp'
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-slate-500',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600 font-bold',
  URGENT: 'text-red-600 font-bold animate-pulse'
};

import { QRCodeSVG } from 'qrcode.react';
import ConversionSuggester from '@/components/inventory/conversion-suggester';

export default function ProductionJobDetailClient({ job, userRole, fulfillmentDataMap = {}, materialIssueStatus, costingData }: { job: any, userRole: string, fulfillmentDataMap?: Record<string, any>, materialIssueStatus?: any, costingData?: any }) {
  const canUpdate = ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(userRole);
  const items = job.order?.items || [];
  
  // Calculate progress
  const totalSteps = job.steps.length;
  const doneSteps = job.steps.filter((s: any) => s.status === 'DONE' || s.status === 'SKIPPED').length;
  const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${job.qrToken}` : `/r/${job.qrToken}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/production" className="p-2 bg-white rounded-full shadow-sm hover:bg-slate-50 transition-colors">
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </Link>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Chi tiết Lệnh SX: {job.jobCode}</h1>
        </div>
        <div className="flex gap-2">
          <Link href={`/dashboard/print/production-jobs/${job.id}`} className="bg-slate-200 hover:bg-slate-300 text-slate-700 px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
            In Lệnh SX
          </Link>
          <Link href={`/dashboard/production/${job.id}/trace`} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg font-bold shadow-sm transition-colors text-sm">
            Xem Timeline Tổng (Trace)
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Header & Progress */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex flex-wrap justify-between items-start gap-4 mb-6">
              <div>
                <div className="text-sm text-slate-500 mb-1">Mã đơn hàng: <Link href={`/dashboard/orders/${job.orderId}`} className="text-blue-600 hover:underline">{job.order?.orderCode}</Link></div>
                <div className="text-lg font-bold">{job.order?.customer?.name}</div>
              </div>
              <div className="flex flex-wrap gap-4">
                {job.qrToken && (
                  <div className="text-right flex flex-col items-end gap-1.5 border-l border-slate-100 pl-4 ml-2">
                    <div className="text-xs text-slate-500 flex items-center gap-1"><QrCode className="w-3.5 h-3.5" /> Smart QR</div>
                    <div className="bg-white p-1 border border-slate-200 rounded-md shadow-sm print:shadow-none">
                      <QRCodeSVG value={qrUrl} size={72} level="M" />
                    </div>
                    <Link href={`/r/${job.qrToken}`} target="_blank" className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 hover:bg-indigo-100 transition-colors">
                      {job.qrToken.substring(0, 10)}...
                    </Link>
                  </div>
                )}
                <div className="text-right ml-2 border-l border-slate-100 pl-4">
                  <div className="text-xs text-slate-500 mb-1">Mức ưu tiên</div>
                  <div className={`text-sm ${PRIORITY_COLORS[job.priority]}`}>{PRIORITY_LABELS[job.priority] || job.priority}</div>
                </div>
                <div className="text-right ml-2 border-l border-slate-100 pl-4">
                  <div className="text-xs text-slate-500 mb-1">Trạng thái</div>
                  <div className={`px-3 py-1 rounded-full text-xs font-bold inline-block ${STATUS_BADGES[job.status] || 'bg-slate-100'}`}>
                    {STATUS_LABELS[job.status] || job.status}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className="flex justify-between text-sm mb-2">
                <span className="font-medium">Tiến độ sản xuất</span>
                <span className="font-bold">{percent}%</span>
              </div>
              <div className="w-full h-3 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden">
                <div className="h-full bg-blue-600 transition-all duration-500" style={{ width: `${percent}%` }}></div>
              </div>
              <div className="text-xs text-slate-500 mt-2">Hoàn thành {doneSteps} / {totalSteps} công đoạn</div>
            </div>
          </div>

          {/* Material Issue Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-lg font-bold flex items-center gap-2">
                Cấp vật tư sản xuất
              </h2>
              {materialIssueStatus && (
                <div className={`px-3 py-1 rounded-full text-xs font-bold ${
                  materialIssueStatus.status === 'FULLY_ISSUED' ? 'bg-green-100 text-green-800' :
                  materialIssueStatus.status === 'PARTIALLY_ISSUED' ? 'bg-blue-100 text-blue-800' :
                  materialIssueStatus.status === 'INSUFFICIENT' ? 'bg-red-100 text-red-800' :
                  'bg-slate-100 text-slate-800'
                }`}>
                  {materialIssueStatus.status === 'FULLY_ISSUED' ? 'Đã cấp đủ' :
                   materialIssueStatus.status === 'PARTIALLY_ISSUED' ? 'Cấp một phần' :
                   materialIssueStatus.status === 'INSUFFICIENT' ? 'Thiếu vật tư' : 'Chưa cấp'}
                </div>
              )}
            </div>

            {materialIssueStatus && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  <div>
                    <div className="text-slate-500">Tổng số dòng vật tư</div>
                    <div className="font-bold text-lg">{materialIssueStatus.totals?.requiredLines || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Đã cấp đủ</div>
                    <div className="font-bold text-lg text-green-600">{materialIssueStatus.totals?.fullyIssuedLines || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Dòng thiếu tồn kho</div>
                    <div className="font-bold text-lg text-red-600">{materialIssueStatus.totals?.shortageLines || 0}</div>
                  </div>
                  <div>
                    <div className="text-slate-500">Chi phí dự kiến</div>
                    <div className="font-bold text-lg text-indigo-600">{materialIssueStatus.totals?.estimatedIssueCost?.toLocaleString()} đ</div>
                  </div>
                </div>

                {materialIssueStatus.items && materialIssueStatus.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                          <th className="p-2">Mã VT</th>
                          <th className="p-2">Tên vật tư</th>
                          <th className="p-2 text-right">Cần cấp</th>
                          <th className="p-2 text-right">Đã cấp</th>
                          <th className="p-2 text-right">Còn cần</th>
                          <th className="p-2 text-right">Tồn hiện tại</th>
                          <th className="p-2 text-right">Thiếu</th>
                          <th className="p-2">Trạng thái</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {materialIssueStatus.items.map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-2 font-mono text-xs">{item.itemCode}</td>
                            <td className="p-2 font-medium">{item.itemName}</td>
                            <td className="p-2 text-right">{item.requiredQuantityBase} {item.stockBaseUnit}</td>
                            <td className="p-2 text-right text-blue-600 font-medium">{item.issuedQuantityBase}</td>
                            <td className="p-2 text-right font-medium">{item.remainingQuantityBase}</td>
                            <td className="p-2 text-right">{item.currentStockBase}</td>
                            <td className="p-2 text-right text-red-600 font-medium">{item.shortageQuantityBase > 0 ? item.shortageQuantityBase : '-'}</td>
                            <td className="p-2">
                              {item.remainingQuantityBase === 0 ? (
                                <span className="text-green-600 font-medium">Đủ</span>
                              ) : item.shortageQuantityBase > 0 ? (
                                <span className="text-red-600 font-medium">Thiếu</span>
                              ) : (
                                <span className="text-orange-500 font-medium">Chờ cấp</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center p-4 text-slate-500 italic">
                    Chưa xác định được định mức vật tư cho lệnh sản xuất này.
                  </div>
                )}

                <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-slate-100">
                  {materialIssueStatus.outboundReceipts && materialIssueStatus.outboundReceipts.length > 0 && (
                    <Link href={`/dashboard/inventory/outbound`} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-50 text-sm font-medium">
                      Xem phiếu xuất ({materialIssueStatus.outboundReceipts.length})
                    </Link>
                  )}
                  {canUpdate && materialIssueStatus.items && materialIssueStatus.items.length > 0 && materialIssueStatus.status !== 'FULLY_ISSUED' && (
                    <Link href={`/dashboard/production/${job.id}/issue-materials`} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shadow-sm text-sm font-medium">
                      Cấp vật tư
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Costing Section */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              Chi phí sản xuất
            </h2>
            {costingData ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm bg-slate-50 dark:bg-slate-900 p-4 rounded-lg">
                  {costingData.canViewCost ? (
                    <>
                      <div>
                        <div className="text-slate-500">Tổng chi phí sản xuất</div>
                        <div className="font-bold text-lg text-rose-600">{costingData.actualProductionCost?.toLocaleString() || 0} đ</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Chi phí vật tư</div>
                        <div className="font-bold text-lg text-indigo-600">{costingData.actualMaterialCost?.toLocaleString() || 0} đ</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Chi phí khác</div>
                        <div className="font-bold text-lg text-blue-600">{costingData.actualAdditionalCost?.toLocaleString() || 0} đ</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Số PXK đã cấp</div>
                        <div className="font-bold text-lg text-slate-700">{costingData.issueSummary?.completedOutboundReceipts || 0}</div>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <div className="text-slate-500">Số PXK đã cấp</div>
                        <div className="font-bold text-lg text-slate-700">{costingData.issueSummary?.completedOutboundReceipts || 0}</div>
                      </div>
                      <div>
                        <div className="text-slate-500">Số dòng VT đã cấp</div>
                        <div className="font-bold text-lg text-slate-700">{costingData.issueSummary?.issuedLines || 0}</div>
                      </div>
                      <div className="col-span-2">
                        <div className="text-slate-500">Trạng thái cấp vật tư</div>
                        <div className="font-bold text-lg text-slate-700">
                          {materialIssueStatus?.status === 'FULLY_ISSUED' ? 'Đã cấp đủ' :
                           materialIssueStatus?.status === 'PARTIALLY_ISSUED' ? 'Cấp một phần' :
                           materialIssueStatus?.status === 'INSUFFICIENT' ? 'Thiếu vật tư' : 'Chưa cấp'}
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {costingData.canViewCost && costingData.itemCosts?.length > 0 && (
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm text-left">
                      <thead className="bg-slate-100 dark:bg-slate-700/50">
                        <tr>
                          <th className="p-2">Mã VT</th>
                          <th className="p-2">Tên vật tư</th>
                          <th className="p-2 text-right">Số lượng đã xuất</th>
                          <th className="p-2">ĐVT</th>
                          <th className="p-2 text-right">Đơn giá vốn</th>
                          <th className="p-2 text-right">Thành tiền</th>
                          <th className="p-2">PXK</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
                        {costingData.materialCostLines?.map((item: any, i: number) => (
                          <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                            <td className="p-2 font-mono text-xs">{item.itemCode}</td>
                            <td className="p-2 font-medium">{item.itemName}</td>
                            <td className="p-2 text-right text-blue-600 font-medium">{item.issuedQuantityBase}</td>
                            <td className="p-2">{item.stockBaseUnit}</td>
                            <td className="p-2 text-right">{item.unitCost?.toLocaleString()} đ</td>
                            <td className="p-2 text-right font-bold text-rose-600">{item.totalCost?.toLocaleString()} đ</td>
                            <td className="p-2 text-xs font-mono text-slate-500">{item.receiptCode}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                
                {costingData.canViewCost && (
                  <ProductionAdditionalCost 
                    jobId={job.id} 
                    additionalCostLines={costingData.additionalCostLines || []} 
                    actualAdditionalCost={costingData.actualAdditionalCost || 0}
                    userRole={userRole}
                  />
                )}
                
                {costingData.warnings?.map((w: string, i: number) => (
                  <div key={i} className="flex gap-2 items-center text-amber-600 bg-amber-50 p-3 rounded-lg text-sm mt-4 border border-amber-100">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{w}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-4 text-slate-500 italic">
                Chưa có dữ liệu chi phí sản xuất.
              </div>
            )}
          </div>

          {/* Timeline / Kanban */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-lg font-bold mb-6 flex items-center gap-2">
              Quy trình & Các công đoạn
            </h2>
            <ProductionTimeline steps={job.steps} canUpdate={canUpdate} jobStatus={job.status} />
          </div>

        </div>

        <div className="space-y-6">
          {/* Product Info */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-md font-bold mb-4 border-b pb-2">Thông tin sản phẩm</h2>
            {items.map((item: any, idx: number) => (
              <div key={item.id} className={idx > 0 ? 'mt-4 pt-4 border-t' : ''}>
                <div className="font-bold text-blue-600 mb-2">{item.name}</div>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-slate-500">Kích thước:</div>
                  <div className="font-medium text-right">{item.widthCm} x {item.heightCm} cm</div>
                  
                  <div className="text-slate-500">Số lượng:</div>
                  <div className="font-medium text-right">{item.quantity.toLocaleString()}</div>
                  
                  <div className="text-slate-500">Số con/tờ:</div>
                  <div className="font-medium text-right">{item.labelsPerSheet}</div>
                  
                  <div className="text-slate-500">Bình bài:</div>
                  <div className="font-medium text-right">{item.printSheets} + {item.wasteSheets} bù hao = {item.totalSheets} tờ</div>
                </div>
                {fulfillmentDataMap[item.id] && (
                  <div className="mt-4 border-t pt-4">
                    <h3 className="font-bold text-slate-800 mb-2">Vật tư & Gợi ý cắt giấy</h3>
                    <ConversionSuggester productionJobId={job.id} fulfillmentData={fulfillmentDataMap[item.id]} />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Logistics Info */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-md font-bold mb-4 border-b pb-2">Thông tin phụ trách</h2>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <User className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Phụ trách SX:</span>
                <span className="font-medium ml-auto">{job.assignedTo?.name || <span className="italic text-slate-400">Chưa gán</span>}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Ngày bắt đầu:</span>
                <span className="font-medium ml-auto">{job.startedAt ? formatDate(job.startedAt) : '--'}</span>
              </div>
              <div className="flex items-center gap-3">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-slate-600">Hạn giao:</span>
                <span className="font-medium ml-auto text-red-600">{job.dueDate ? formatDate(job.dueDate) : '--'}</span>
              </div>
            </div>
          </div>

          {/* Logs */}
          <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
            <h2 className="text-md font-bold mb-4 border-b pb-2">Lịch sử sản xuất</h2>
            <ProductionLogViewer logs={job.logs} />
          </div>

        </div>
      </div>
    </div>
  );
}
