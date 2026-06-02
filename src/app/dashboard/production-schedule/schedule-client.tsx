'use client';

import React, { useState } from 'react';
import { changePrintStatus, assignMachine, reorderPrintQueue, updatePrintProgress, reserveMaterialForPrintJob } from '@/lib/production-schedule-actions';

function Badge({ children, type }: { children: React.ReactNode, type: string }) {
  const colors: Record<string, string> = {
    WAITING_ASSIGNMENT: 'bg-gray-100 text-gray-800',
    WAITING_FILE: 'bg-red-100 text-red-800',
    WAITING_MATERIAL: 'bg-orange-100 text-orange-800',
    READY_TO_PRINT: 'bg-green-100 text-green-800',
    PRINTING: 'bg-blue-100 text-blue-800',
    PAUSED: 'bg-yellow-100 text-yellow-800',
    PRINT_ERROR: 'bg-red-200 text-red-900',
    PRINTED: 'bg-emerald-100 text-emerald-800',
    NOT_CHECKED: 'bg-gray-100 text-gray-800',
    MISSING: 'bg-red-100 text-red-800',
    NOT_READY: 'bg-orange-100 text-orange-800',
    READY: 'bg-green-100 text-green-800',
    RESERVED: 'bg-purple-100 text-purple-800',
  };
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${colors[type] || 'bg-gray-100 text-gray-800'}`}>{children}</span>;
}

export default function ScheduleClient({ machines, queueItems, currentUser }: any) {
  const [activeTab, setActiveTab] = useState('PRINTERS'); // PRINTERS or ALL
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Modals
  const [reasonModal, setReasonModal] = useState<{ id: string, type: 'PAUSED' | 'PRINT_ERROR', reason: string } | null>(null);
  const [progressModal, setProgressModal] = useState<{ id: string, current: number, total: number, printed: number } | null>(null);
  const [logsModal, setLogsModal] = useState<any | null>(null);

  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(currentUser.role);

  const printers = machines.filter((m: any) => m.machineType === 'PRINTER');
  const others = machines.filter((m: any) => m.machineType !== 'PRINTER');
  
  const displayMachines = activeTab === 'PRINTERS' ? printers : [...printers, ...others];

  const handleStatusChange = async (id: string, newStatus: string, reason?: string, skipConfirm = false) => {
    // Confirm if starting without reserve
    if (newStatus === 'PRINTING' && !skipConfirm) {
      const job = queueItems.find((q: any) => q.id === id);
      if (job && job.materialStatus === 'READY' && !job.isMaterialReserved) {
        if (!confirm('Vật tư chưa được giữ kho (Reserve). Bạn có chắc muốn bắt đầu in?')) {
          return;
        }
      }
    }

    try {
      setLoading(true);
      setErrorMsg('');
      await changePrintStatus(id, newStatus, reason);
      setReasonModal(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProgress = async () => {
    if (!progressModal) return;
    try {
      setLoading(true);
      setErrorMsg('');
      await updatePrintProgress(progressModal.id, progressModal.printed);
      setProgressModal(null);
    } catch (e: any) {
      setErrorMsg(e.message || 'Lỗi cập nhật tiến độ');
    } finally {
      setLoading(false);
    }
  };

  const handleReorder = async (machineId: string, itemId: string, direction: 'UP' | 'DOWN') => {
    if (!isAdminOrManager) return;
    const items = queueItems.filter((q: any) => q.machineId === machineId).sort((a: any, b: any) => a.queuePosition - b.queuePosition);
    const index = items.findIndex((q: any) => q.id === itemId);
    if (index === -1) return;
    if (direction === 'UP' && index > 0) {
      // Swap with previous
      const temp = items[index - 1];
      items[index - 1] = items[index];
      items[index] = temp;
    } else if (direction === 'DOWN' && index < items.length - 1) {
      // Swap with next
      const temp = items[index + 1];
      items[index + 1] = items[index];
      items[index] = temp;
    } else {
      return;
    }
    
    try {
      setLoading(true);
      await reorderPrintQueue(machineId, items.map((i: any) => i.id));
    } catch(e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleAssignMachine = async (itemId: string, machineId: string) => {
    try {
      setLoading(true);
      await assignMachine(itemId, machineId);
    } catch(e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReserve = async (itemId: string) => {
    try {
      setLoading(true);
      await reserveMaterialForPrintJob(itemId);
    } catch(e: any) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const unassigned = queueItems.filter((q: any) => !q.machineId);

  return (
    <div>
      {errorMsg && <div className="bg-red-100 text-red-800 p-3 mb-4 rounded-lg">{errorMsg}</div>}

      <div className="flex gap-4 mb-6">
        <button 
          onClick={() => setActiveTab('PRINTERS')} 
          className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'PRINTERS' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border'}`}
        >
          Hàng chờ Máy in
        </button>
        <button 
          onClick={() => setActiveTab('ALL')} 
          className={`px-4 py-2 rounded-lg font-semibold ${activeTab === 'ALL' ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 border'}`}
        >
          Tất cả máy (Theo máy)
        </button>
      </div>

      <div className="flex gap-6 overflow-x-auto pb-6">
        {/* Unassigned Lane */}
        {isAdminOrManager && (
          <div className="min-w-[300px] w-[300px] bg-gray-50 rounded-xl p-4 border border-dashed border-gray-300">
            <h3 className="font-bold text-slate-800 mb-2">Chưa gán máy ({unassigned.length})</h3>
            <div className="flex flex-col gap-3">
              {unassigned.map((job: any) => (
                <div key={job.id} className="bg-white p-3 rounded-lg shadow-sm border border-gray-200">
                <div className="flex justify-between items-start mb-1">
                  <div className="font-bold text-sm mb-1">{job.productionJob?.jobCode}</div>
                  <button onClick={() => setLogsModal(job)} className="text-[10px] text-blue-600 underline">Lịch sử</button>
                </div>
                  <div className="text-xs text-slate-600 mb-2">{job.order?.customer?.name}</div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    <Badge type={job.status}>{job.status}</Badge>
                  </div>
                  <select 
                    className="w-full text-xs p-1 border rounded"
                    onChange={(e) => {
                      if (e.target.value) handleAssignMachine(job.id, e.target.value);
                      e.target.value = "";
                    }}
                    defaultValue=""
                  >
                    <option value="" disabled>Gán máy...</option>
                    {printers.map((m: any) => <option key={m.id} value={m.id}>{m.machineCode}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Machine Lanes */}
        {displayMachines.map((machine: any) => {
          const mItems = queueItems.filter((q: any) => q.machineId === machine.id).sort((a: any, b: any) => a.queuePosition - b.queuePosition);
          
          return (
            <div key={machine.id} className="min-w-[350px] w-[350px] bg-slate-100 rounded-xl p-4 flex flex-col h-full border border-slate-200">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-bold text-slate-800 text-lg">{machine.machineName}</h3>
                  <div className="text-xs text-slate-500">{machine.machineCode} • Tốc độ: {machine.defaultSpeedSheetsPerHour} tờ/h</div>
                </div>
                {machine.status === 'MAINTENANCE' && <span className="bg-red-100 text-red-800 text-xs px-2 py-1 rounded font-bold">BẢO TRÌ</span>}
              </div>

              {mItems.length === 0 ? (
                <div className="text-sm text-slate-500 italic text-center py-8 bg-white/50 rounded-lg">Đang trống</div>
              ) : (
                <div className="flex flex-col gap-3">
                  {mItems.map((job: any, idx: number) => {
                    const isMine = job.assignedToId === currentUser.id;
                    const canEdit = isAdminOrManager || isMine;
                    const progressPct = job.totalSheets ? Math.min(100, Math.round((job.printedSheets / job.totalSheets) * 100)) : 0;

                    return (
                      <div key={job.id} className="bg-white p-3 rounded-lg shadow border border-gray-200 hover:border-blue-300 transition-colors">
                        <div className="flex justify-between items-start mb-1">
                          <span className="font-bold text-sm text-blue-700">{job.productionJob?.jobCode}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-blue-600 underline cursor-pointer" onClick={() => setLogsModal(job)}>Lịch sử</span>
                            <span className="text-xs font-bold text-gray-500">#{job.queuePosition}</span>
                          </div>
                        </div>
                        <div className="text-xs text-slate-800 font-semibold mb-1 truncate">{job.order?.customer?.name}</div>
                        <div className="text-xs text-slate-600 mb-2 truncate">Vật tư: {job.material?.name || 'Không xác định'}</div>
                        
                        <div className="flex flex-wrap gap-1 mb-2">
                          <Badge type={job.status}>{job.status}</Badge>
                          <Badge type={job.fileStatus}>File: {job.fileStatus}</Badge>
                          <Badge type={job.materialStatus}>VT: {job.materialStatus}</Badge>
                        </div>

                        {(job.waitingReason || job.errorReason || job.pauseReason) && (
                          <div className="bg-red-50 text-red-800 text-[11px] p-2 rounded mb-2 font-medium">
                            {job.waitingReason || job.errorReason || job.pauseReason}
                          </div>
                        )}

                        <div className="mb-3">
                          <div className="flex justify-between text-[11px] text-slate-500 mb-1">
                            <span>Tiến độ: {job.printedSheets} / {job.totalSheets} tờ</span>
                            <span>{progressPct}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-1.5">
                            <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${progressPct}%` }}></div>
                          </div>
                        </div>

                        {canEdit && (
                          <div className="flex flex-wrap gap-1 mt-3 pt-3 border-t">
                            {['READY_TO_PRINT', 'PAUSED'].includes(job.status) && (
                              <button onClick={() => handleStatusChange(job.id, 'PRINTING')} className="text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50" disabled={loading}>
                                Bắt đầu in
                              </button>
                            )}
                            {job.status === 'PRINTING' && (
                              <>
                                <button onClick={() => setReasonModal({ id: job.id, type: 'PAUSED', reason: '' })} className="text-xs px-2 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600" disabled={loading}>Tạm dừng</button>
                                <button onClick={() => setProgressModal({ id: job.id, current: job.printedSheets, total: job.totalSheets, printed: job.printedSheets })} className="text-xs px-2 py-1 bg-slate-200 text-slate-800 rounded hover:bg-slate-300" disabled={loading}>Cập nhật số tờ</button>
                                <button onClick={() => setReasonModal({ id: job.id, type: 'PRINT_ERROR', reason: '' })} className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700" disabled={loading}>Báo lỗi</button>
                                <button onClick={() => handleStatusChange(job.id, 'PRINTED')} className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700" disabled={loading}>Hoàn tất</button>
                              </>
                            )}
                            {job.status === 'PRINT_ERROR' && (
                              <button onClick={() => handleStatusChange(job.id, 'READY_TO_PRINT')} className="text-xs px-2 py-1 bg-slate-600 text-white rounded hover:bg-slate-700" disabled={loading}>Đã fix lỗi</button>
                            )}
                            {job.materialStatus === 'READY' && !job.isMaterialReserved && (
                              <button onClick={() => handleReserve(job.id)} className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700" disabled={loading}>Giữ vật tư</button>
                            )}
                            
                            {isAdminOrManager && (
                              <div className="w-full flex justify-end gap-1 mt-1">
                                <button onClick={() => handleReorder(machine.id, job.id, 'UP')} disabled={idx === 0 || loading} className="text-[10px] px-1 py-0.5 bg-gray-200 rounded disabled:opacity-30">▲ Lên</button>
                                <button onClick={() => handleReorder(machine.id, job.id, 'DOWN')} disabled={idx === mItems.length - 1 || loading} className="text-[10px] px-1 py-0.5 bg-gray-200 rounded disabled:opacity-30">▼ Xuống</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Reason Modal */}
      {reasonModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96">
            <h3 className="font-bold text-lg mb-4">{reasonModal.type === 'PAUSED' ? 'Lý do Tạm dừng' : 'Báo lỗi in ấn'}</h3>
            <textarea 
              className="w-full border rounded p-2 text-sm mb-4" 
              rows={3} 
              placeholder="Nhập lý do bắt buộc..."
              value={reasonModal.reason}
              onChange={(e) => setReasonModal({ ...reasonModal, reason: e.target.value })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setReasonModal(null)} className="px-4 py-2 bg-gray-200 rounded text-sm font-semibold">Hủy</button>
              <button 
                onClick={() => handleStatusChange(reasonModal.id, reasonModal.type, reasonModal.reason)} 
                disabled={!reasonModal.reason || loading}
                className={`px-4 py-2 rounded text-sm font-semibold text-white ${reasonModal.type === 'PAUSED' ? 'bg-yellow-500' : 'bg-red-600'}`}
              >
                Xác nhận
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Progress Modal */}
      {progressModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-96">
            <h3 className="font-bold text-lg mb-4">Cập nhật số tờ đã in</h3>
            <div className="text-sm text-slate-600 mb-4">Tổng tờ: {progressModal.total}</div>
            <input 
              type="number"
              min="0"
              max={progressModal.total}
              className="w-full border rounded p-2 mb-4"
              value={progressModal.printed}
              onChange={(e) => setProgressModal({ ...progressModal, printed: parseInt(e.target.value) || 0 })}
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setProgressModal(null)} className="px-4 py-2 bg-gray-200 rounded text-sm font-semibold">Hủy</button>
              <button 
                onClick={handleUpdateProgress} 
                disabled={loading || progressModal.printed < 0 || progressModal.printed > progressModal.total}
                className="px-4 py-2 bg-blue-600 rounded text-sm font-semibold text-white"
              >
                Cập nhật
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Logs Modal */}
      {logsModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-xl w-[600px] max-h-[80vh] flex flex-col">
            <h3 className="font-bold text-lg mb-4">Lịch sử thao tác: {logsModal.productionJob?.jobCode}</h3>
            
            <div className="flex-1 overflow-y-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 text-slate-700 sticky top-0">
                  <tr>
                    <th className="p-2">Thời gian</th>
                    <th className="p-2">Người thao tác</th>
                    <th className="p-2">Hành động</th>
                    <th className="p-2">Trạng thái</th>
                    <th className="p-2">Số tờ</th>
                    <th className="p-2">Ghi chú</th>
                  </tr>
                </thead>
                <tbody>
                  {logsModal.logs?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="text-center p-4 text-slate-500 italic">Chưa có lịch sử hoạt động</td>
                    </tr>
                  ) : (
                    logsModal.logs?.map((log: any) => (
                      <tr key={log.id} className="border-b">
                        <td className="p-2 whitespace-nowrap">{new Date(log.createdAt).toLocaleString('vi-VN')}</td>
                        <td className="p-2">{log.actor?.name}</td>
                        <td className="p-2 font-bold">{log.action}</td>
                        <td className="p-2">
                          {log.fromStatus && log.toStatus ? (
                            <span>{log.fromStatus} &rarr; {log.toStatus}</span>
                          ) : (
                            log.toStatus || '-'
                          )}
                        </td>
                        <td className="p-2 text-center">
                          {log.printedSheetsAfter !== null ? log.printedSheetsAfter : '-'}
                        </td>
                        <td className="p-2">{log.note || '-'}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end gap-2 mt-4 pt-4 border-t">
              <button onClick={() => setLogsModal(null)} className="px-4 py-2 bg-gray-200 rounded text-sm font-semibold">Đóng</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
