'use client';

import React from 'react';
import Link from 'next/link';
import { 
  ArrowLeft, FileText, PenTool, Printer, Scissors, 
  Truck, CreditCard, CheckCircle, Package, User, Calendar, ScanBarcode, AlertCircle, ClipboardList, Search
} from 'lucide-react';
import { formatDate, formatCurrencyVND } from '@/lib/utils';
import { QRCodeSVG } from 'qrcode.react';

// Helpers cho Stepper
const STEPS = [
  { id: 'ORDER', label: 'Tạo đơn', icon: FileText },
  { id: 'DESIGN', label: 'Thiết kế', icon: PenTool },
  { id: 'PRINT', label: 'In ấn', icon: Printer },
  { id: 'POST_PRINT', label: 'Gia công', icon: Scissors },
  { id: 'QC', label: 'QC & Đóng gói', icon: Package },
  { id: 'DELIVERY', label: 'Giao hàng', icon: Truck },
  { id: 'PAYMENT', label: 'Thanh toán', icon: CreditCard }
];

export default function ProductionTraceClient({ traceData, events, currentUser }: { traceData: any, events: any[], currentUser: any }) {
  const order = traceData.order;
  const customer = order?.customer;
  const showFinancials = !['PRODUCTION', 'DELIVERY'].includes(currentUser.role);
  
  // Xác định current step
  let currentStepIdx = 0;
  if (order.status !== 'PENDING') currentStepIdx = 1; // Passed Order
  if (order.designFiles?.some((f: any) => f.status === 'APPROVED' || f.status === 'LOCKED_FOR_PRODUCTION')) currentStepIdx = 2; // Passed Design
  if (traceData.printQueueItems?.some((p: any) => p.status === 'COMPLETED')) currentStepIdx = 3; // Passed Print
  if (traceData.operations?.some((o: any) => o.status === 'COMPLETED')) currentStepIdx = 4; // Passed Post-print
  if (traceData.status === 'READY_FOR_DELIVERY' || traceData.status === 'COMPLETED') currentStepIdx = 5; // Passed QC
  if (traceData.deliveryJob && ['DELIVERED', 'RETURNED'].includes(traceData.deliveryJob.status)) currentStepIdx = 6; // Passed Delivery
  if (order.paymentStatus === 'PAID') currentStepIdx = 7; // Passed Payment

  const qrUrl = typeof window !== 'undefined' ? `${window.location.origin}/r/${traceData.qrToken}` : `/r/${traceData.qrToken}`;

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12 px-3 sm:px-6 lg:px-8 w-full overflow-x-hidden">
      {/* 1. Header tổng quan */}
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 bg-white dark:bg-slate-800 p-4 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full">
        <div className="flex items-start md:items-center gap-3 w-full md:w-auto">
          <Link href={`/dashboard/production/${traceData.id}`} className="p-2 bg-slate-100 rounded-full hover:bg-slate-200 transition-colors shrink-0">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl sm:text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2 truncate">
              <Search className="w-5 h-5 sm:w-6 sm:h-6 text-indigo-600 shrink-0" /> 
              <span className="truncate">Truy vết Đơn: {order?.orderCode}</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-500 truncate">Mã LSX: {traceData.jobCode} • KH: {customer?.name}</p>
          </div>
        </div>
        
        <div className="w-full md:w-auto md:ml-auto flex items-center justify-between md:justify-end gap-4 border-t border-slate-100 md:border-t-0 pt-3 md:pt-0">
          <div className="text-left md:text-right min-w-0">
            <div className="text-[10px] sm:text-xs text-slate-500">Smart QR</div>
            <Link href={`/r/${traceData.qrToken}`} target="_blank" className="font-mono text-[10px] sm:text-xs text-indigo-600 hover:underline block truncate max-w-[150px]">
              {traceData.qrToken?.substring(0, 15)}...
            </Link>
          </div>
          <div className="bg-white p-1 border border-slate-200 rounded shadow-sm shrink-0">
            <QRCodeSVG value={qrUrl} size={42} level="L" />
          </div>
        </div>
      </div>

      {/* 2. Stepper */}
      <div className="bg-white dark:bg-slate-800 p-4 sm:p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 w-full overflow-x-auto custom-scrollbar">
        <h2 className="text-lg font-bold mb-4 sm:mb-6 flex items-center gap-2"><CheckCircle className="w-5 h-5 text-emerald-500" /> Tiến độ tổng thể</h2>
        <div className="flex items-center min-w-[700px] px-2 pb-4">
          {STEPS.map((step, idx) => {
            const isCompleted = idx < currentStepIdx;
            const isCurrent = idx === currentStepIdx;
            const Icon = step.icon;
            
            return (
              <React.Fragment key={step.id}>
                <div className="flex flex-col items-center relative z-10 w-24">
                  <div className={`w-12 h-12 rounded-full flex items-center justify-center border-4 transition-all duration-300 ${
                    isCompleted ? 'bg-emerald-500 border-emerald-100 text-white' : 
                    isCurrent ? 'bg-indigo-600 border-indigo-100 text-white shadow-lg scale-110' : 
                    'bg-slate-100 border-white text-slate-400 dark:bg-slate-700 dark:border-slate-800'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className={`mt-3 text-xs font-bold text-center ${
                    isCompleted ? 'text-emerald-600' : isCurrent ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </div>
                </div>
                {idx < STEPS.length - 1 && (
                  <div className="flex-1 h-1.5 mx-2 rounded-full bg-slate-100 dark:bg-slate-700 relative overflow-hidden">
                    <div className={`absolute top-0 left-0 h-full transition-all duration-500 ${isCompleted ? 'bg-emerald-500 w-full' : 'bg-transparent w-0'}`}></div>
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cột trái: Các thông tin chi tiết */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* 3. Thông tin đơn hàng */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-500" /> Thông tin Đơn hàng</h2>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><span className="text-slate-500">Khách hàng:</span> <span className="font-medium">{customer?.name} ({customer?.phone})</span></div>
              <div><span className="text-slate-500">Người tạo đơn:</span> <span className="font-medium">{order?.createdBy?.name || 'N/A'}</span></div>
              <div><span className="text-slate-500">Ngày tạo:</span> <span className="font-medium">{formatDate(order?.createdAt)}</span></div>
              <div><span className="text-slate-500">Hạn giao:</span> <span className="font-medium text-red-600">{order?.dueDate ? formatDate(order?.dueDate) : 'N/A'}</span></div>
            </div>
            
            <div className="mt-4 pt-4 border-t">
              <h3 className="font-bold mb-2">Sản phẩm ({order?.items?.length || 0})</h3>
              <div className="space-y-2">
                {order?.items?.map((item: any, i: number) => (
                  <div key={i} className="flex justify-between items-center bg-slate-50 p-2 rounded">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-slate-500">{item.quantity} cái • {item.printSheets} tờ in</div>
                    </div>
                    {showFinancials && (
                      <div className="text-right">
                        <div className="font-bold text-blue-600">{formatCurrencyVND(item.saleAmount)}</div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 4. Thiết kế */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><PenTool className="w-5 h-5 text-purple-500" /> Hồ sơ Thiết kế</h2>
            {order?.designFiles?.length > 0 ? (
              <div className="space-y-3">
                {order.designFiles.map((file: any) => (
                  <div key={file.id} className="flex justify-between items-center border border-slate-100 p-3 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-purple-50 rounded text-purple-600"><FileText className="w-4 h-4" /></div>
                      <div>
                        <div className="font-medium text-sm">{file.fileName}</div>
                        <div className="text-xs text-slate-500" suppressHydrationWarning>Upload: {formatDate(file.createdAt)}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-full">{file.status}</div>
                      {file.approvedAt && <div className="text-xs text-emerald-600 mt-1" suppressHydrationWarning>Duyệt: {new Date(file.approvedAt).toLocaleDateString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Chưa có file thiết kế.</p>}
          </section>

          {/* 5. In ấn */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Printer className="w-5 h-5 text-cyan-500" /> Quá trình In ấn</h2>
            {traceData.printQueueItems?.length > 0 ? (
              <div className="space-y-3">
                {traceData.printQueueItems.map((item: any) => (
                  <div key={item.id} className="border border-slate-100 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="font-medium text-sm">{item.itemName}</div>
                      <div className="text-xs font-bold px-2 py-1 bg-slate-100 rounded-full">{item.status}</div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
                      <div>Máy in: {item.machineCode}</div>
                      <div>SL yêu cầu: {item.estimatedSheets}</div>
                      <div>Bắt đầu: {item.startedAt ? formatDate(item.startedAt) : '--'}</div>
                      <div>Hoàn tất: {item.completedAt ? formatDate(item.completedAt) : '--'}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Chưa có dữ liệu in.</p>}
          </section>

          {/* 6. Gia công sau in */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Scissors className="w-5 h-5 text-fuchsia-500" /> Gia công Sau in</h2>
            {traceData.operations?.length > 0 ? (
              <div className="space-y-3">
                {traceData.operations.map((op: any) => (
                  <div key={op.id} className="border border-slate-100 p-3 rounded-lg flex justify-between items-center">
                    <div>
                      <div className="font-medium text-sm">{op.operationName}</div>
                      <div className="text-xs text-slate-500">NV: {op.assignedTo?.name || 'Chưa gán'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold mb-1">{op.status}</div>
                      {op.completedAt && <div className="text-xs text-emerald-600" suppressHydrationWarning>Xong: {new Date(op.completedAt).toLocaleString()}</div>}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-slate-500">Không có dữ liệu gia công.</p>}
          </section>

        </div>

        {/* Cột phải: Delivery, Payment, Event Log, Task */}
        <div className="space-y-6">
          
          {/* 7. Giao hàng */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Truck className="w-5 h-5 text-amber-500" /> Giao hàng</h2>
            {traceData.deliveryJob ? (
              <div className="space-y-3 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Mã giao:</span> 
                  <span className="font-medium">{traceData.deliveryJob.deliveryCode}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Trạng thái:</span> 
                  <span className="font-bold">{traceData.deliveryJob.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Nhân viên:</span> 
                  <span className="font-medium">{traceData.deliveryJob.assignedTo?.name || 'N/A'}</span>
                </div>
                {traceData.deliveryJob.deliveredAt && (
                  <div className="flex justify-between text-emerald-600 font-bold">
                    <span>Đã giao:</span> 
                    <span>{formatDate(traceData.deliveryJob.deliveredAt)}</span>
                  </div>
                )}
              </div>
            ) : <p className="text-sm text-slate-500">Chưa tạo lệnh giao hàng.</p>}
          </section>

          {/* 8. Thanh toán/COD */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><CreditCard className="w-5 h-5 text-emerald-500" /> Thanh toán & Thu hộ (COD)</h2>
            {showFinancials ? (
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Tổng tiền:</span> 
                  <span className="font-bold">{formatCurrencyVND(order?.totalAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Đã thu:</span> 
                  <span className="font-bold text-emerald-600">{formatCurrencyVND(order?.paidAmount || 0)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-500">Còn nợ:</span> 
                  <span className="font-bold text-red-600">{formatCurrencyVND(order?.debtAmount || 0)}</span>
                </div>
                <hr className="my-2" />
                {order?.payments?.map((p: any) => (
                  <div key={p.id} className="text-xs flex justify-between bg-slate-50 p-2 rounded border">
                    <div>
                      <div className="font-bold">{p.paymentCode}</div>
                      <div className="text-slate-500">{formatDate(p.createdAt)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-600">+{formatCurrencyVND(p.amount)}</div>
                      <div>{p.paymentMethod} • {p.paymentStatus}</div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-500 italic">Dữ liệu tài chính bị ẩn với Role của bạn.</p>
            )}
          </section>

          {/* 9. Tasks */}
          {order?.tasks?.length > 0 && (
            <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ClipboardList className="w-5 h-5 text-indigo-500" /> Task liên quan</h2>
              <div className="space-y-2">
                {order.tasks.map((t: any) => (
                  <div key={t.id} className="text-sm border border-slate-100 p-2 rounded">
                    <div className="font-medium">{t.title}</div>
                    <div className="flex justify-between text-xs text-slate-500 mt-1">
                      <span>{t.type}</span>
                      <span className={`font-bold ${t.status === 'RESOLVED' ? 'text-emerald-500' : 'text-red-500'}`}>{t.status}</span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* 10. QR Scan Logs */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><ScanBarcode className="w-5 h-5 text-slate-600" /> QR Scan Logs</h2>
            {traceData.qrScanLogs?.length > 0 ? (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-2 custom-scrollbar">
                {traceData.qrScanLogs.map((log: any) => {
                  let roleLabel = (log.userRole || 'UNKNOWN').toUpperCase();
                  if (roleLabel === 'PRODUTTON') roleLabel = 'PRODUCTION';
                  return (
                  <div key={log.id} className="text-xs bg-slate-50 p-2 rounded border">
                    <div className="flex justify-between font-bold mb-1">
                      <span>{roleLabel}</span>
                      <span suppressHydrationWarning>{new Date(log.createdAt).toLocaleTimeString()} {new Date(log.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="text-slate-600 mb-1 break-words">{log.reason}</div>
                    <div className="flex justify-between items-center gap-2">
                      <span className={`px-1.5 py-0.5 rounded shrink-0 ${log.result === 'REDIRECT' ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-800'}`}>
                        {log.result}
                      </span>
                      <span className="text-slate-400 truncate min-w-0">{log.resolvedTarget || 'No Target'}</span>
                    </div>
                  </div>
                  );
                })}
              </div>
            ) : <p className="text-sm text-slate-500">Chưa có lượt quét QR nào.</p>}
          </section>

          {/* 11. Unified Event Timeline */}
          <section className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200">
            <h2 className="text-lg font-bold mb-4 flex items-center gap-2"><Calendar className="w-5 h-5 text-blue-600" /> Unified Timeline</h2>
            <div className="relative border-l-2 border-slate-200 ml-3 space-y-4 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
              {events.map((evt, idx) => {
                const isDone = evt.status === 'DONE';
                return (
                  <div key={idx} className="relative pl-6">
                    <div className={`absolute -left-2 top-1 w-4 h-4 rounded-full border-2 border-white ${isDone ? 'bg-emerald-500' : 'bg-blue-500'}`}></div>
                    <div className="text-xs text-slate-500" suppressHydrationWarning>{new Date(evt.timestamp).toLocaleString()}</div>
                    <div className="font-bold text-sm text-slate-800 dark:text-white mt-0.5">{evt.title}</div>
                    {evt.description && <div className="text-xs text-slate-600 mt-1">{evt.description}</div>}
                  </div>
                );
              })}
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
