'use client';

import React, { useState } from 'react';
import { updateOperationStatus, assignOperationUserOrMachine } from '@/lib/post-print-actions';

export default function PostPrintClient({ operations, opDefs, machines, currentUser, workers }: any) {
  const [viewType, setViewType] = useState<'THEO_CONG_DOAN' | 'THEO_NHAN_SU'>('THEO_CONG_DOAN');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [quickFilter, setQuickFilter] = useState<string>('NONE');

  const isAdmin = ['ADMIN', 'MANAGER'].includes(currentUser.role);

  const handleStatusChange = async (opId: string, newStatus: string, payload: any = {}) => {
    try {
      if (['PAUSED', 'ERROR', 'SKIPPED'].includes(newStatus)) {
        const reason = prompt('Nhập lý do:');
        if (!reason) return;
        payload.reason = reason;
      }
      if (newStatus === 'COMPLETED') {
        const good = prompt('Số lượng đạt:', payload.inputSheets);
        if (good === null) return;
        const waste = prompt('Số lượng hỏng:', '0');
        if (waste === null) return;
        payload.goodSheets = parseInt(good);
        payload.wasteSheets = parseInt(waste);
      }
      await updateOperationStatus(opId, newStatus, payload);
      alert('Cập nhật trạng thái thành công');
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleAssign = async (opId: string, type: 'user'|'machine', value: string) => {
    try {
       await assignOperationUserOrMachine(opId, { [type + 'Id']: value });
       alert('Giao việc thành công');
    } catch(e: any) {
       alert(e.message);
    }
  };

  const opLanes = ['LAMINATION', 'DIE_CUTTING', 'CUTTING', 'OUTSOURCE', 'QC', 'PACKING', 'OTHER'];
  const laneNameMapping: Record<string, string> = {
    'LAMINATION': 'LAMINATION / Cán màng',
    'DIE_CUTTING': 'DIE_CUTTING / Bế demi',
    'CUTTING': 'CUTTING / Cắt/xén',
    'OUTSOURCE': 'OUTSOURCE / Gia công ngoài',
    'QC': 'QC / Kiểm hàng',
    'PACKING': 'PACKING / Đóng gói',
    'OTHER': 'OTHER / Khác'
  };

  const filteredOps = operations.filter((op: any) => statusFilter === 'ALL' || op.status === statusFilter);

  let finalOps = filteredOps;
  if (quickFilter === 'ONLY_READY_UNASSIGNED') {
    finalOps = finalOps.filter((op: any) => op.status === 'READY' && !op.assignedToId && !op.machineId);
  } else if (quickFilter === 'ONLY_ERROR') {
    finalOps = finalOps.filter((op: any) => op.status === 'ERROR');
  } else if (quickFilter === 'ONLY_OVERDUE') {
    finalOps = finalOps.filter((op: any) => op.productionJob.order?.dueDate && new Date(op.productionJob.order.dueDate) < new Date());
  } else if (quickFilter === 'ONLY_ASSIGNED_TO') {
    finalOps = finalOps.filter((op: any) => !!op.assignedToId);
  } else if (quickFilter === 'ONLY_NO_MACHINE') {
    finalOps = finalOps.filter((op: any) => !op.machineId);
  }

  // Nhóm theo view
  let groupedOps: Record<string, any[]> = {};
  
  if (viewType === 'THEO_CONG_DOAN') {
     opLanes.forEach(l => groupedOps[laneNameMapping[l]] = []);
     finalOps.forEach((op: any) => {
        const laneName = laneNameMapping[op.operationCode] || op.operationCode;
        if (!groupedOps[laneName]) {
           groupedOps[laneName] = [];
        }
        groupedOps[laneName].push(op);
     });
     // Hide OTHER if empty
     if (groupedOps[laneNameMapping['OTHER']] && groupedOps[laneNameMapping['OTHER']].length === 0) {
        delete groupedOps[laneNameMapping['OTHER']];
     }
  } else {
     groupedOps['Chưa gán'] = [];
     workers.forEach((w: any) => groupedOps[w.name] = []);
     machines.forEach((m: any) => groupedOps[m.machineName] = []);
     finalOps.forEach((op: any) => {
        let placed = false;
        if (op.assignedTo) {
           if (!groupedOps[op.assignedTo.name]) groupedOps[op.assignedTo.name] = [];
           groupedOps[op.assignedTo.name].push(op);
           placed = true;
        }
        if (op.machine) {
           if (!groupedOps[op.machine.machineName]) groupedOps[op.machine.machineName] = [];
           if (!placed) {
              groupedOps[op.machine.machineName].push(op);
              placed = true; 
           } else {
              groupedOps[op.machine.machineName].push(op);
           }
        }
        if (!placed) {
           groupedOps['Chưa gán'].push(op);
        }
     });
     // remove empty lanes for machines/workers
     Object.keys(groupedOps).forEach(k => {
        if (k !== 'Chưa gán' && groupedOps[k].length === 0) delete groupedOps[k];
     });
  }

  const renderCard = (op: any, index: number) => {
    // Tìm next operation
    const nextOps = operations.filter((o: any) => o.printQueueItemId === op.printQueueItemId && o.sequence > op.sequence);
    nextOps.sort((a: any, b: any) => a.sequence - b.sequence);
    const nextOpName = nextOps.length > 0 ? nextOps[0].operationName : 'Không có';

    return (
      <div key={`${op.id}-${index}`} className="bg-white border border-slate-200 rounded-lg shadow-sm p-3 space-y-3 shrink-0 flex flex-col">
        <div className="flex justify-between items-start">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-700 rounded-md">
                {op.operationName}
              </span>
              <a href={`/dashboard/post-print/mobile/operation/${op.id}`} target="_blank" rel="noreferrer" title="Mở Mobile / QR" className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-1.5 py-0.5 rounded hover:bg-slate-200">
                🔗 QR
              </a>
            </div>
            <div className="text-sm font-bold mt-1 text-slate-800">{op.productionJob.order.orderCode}</div>
            <div className="text-[10px] text-slate-500 font-medium">LSX: {op.productionJob.jobCode}</div>
            <div className="text-xs text-slate-600 font-medium mt-1">{op.productionJob.order.customer.name}</div>
          </div>
          <StatusBadge status={op.status} />
        </div>

        <div className="text-[11px] space-y-1 bg-slate-50 p-2 rounded-md">
          <div className="flex justify-between">
            <span className="text-slate-500">Sản phẩm:</span>
            <span className="font-semibold text-right max-w-[120px] truncate" title={op.orderItem?.name}>{op.orderItem?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Vật tư:</span>
            <span className="font-semibold text-right max-w-[120px] truncate">{op.printQueueItem?.material?.name || 'N/A'}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">CĐ tiếp theo:</span>
            <span className="font-semibold text-right">{nextOpName}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-slate-500">Deadline:</span>
            <span className="font-semibold text-right text-rose-600">
              {op.productionJob.order?.dueDate ? new Date(op.productionJob.order.dueDate).toLocaleDateString('vi-VN') : 'Không có'}
            </span>
          </div>
          
          <div className="grid grid-cols-2 gap-2 border-t border-slate-200 mt-2 pt-2">
            <div>
              <span className="text-slate-500 block">Đầu vào</span>
              <span className="font-bold text-slate-800">{op.inputSheets}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Hoàn thành</span>
              <span className="font-bold text-blue-600">{op.completedSheets}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Đạt</span>
              <span className="font-bold text-green-600">{op.goodSheets}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Hỏng</span>
              <span className="font-bold text-rose-600">{op.wasteSheets}</span>
            </div>
          </div>
        </div>

        {op.errorReason && (
          <div className="text-[11px] bg-rose-50 text-rose-600 p-2 rounded-md border border-rose-200">
            <strong>Lỗi:</strong> {op.errorReason}
          </div>
        )}

        {isAdmin ? (
          <div className="space-y-1.5 mt-auto">
            <select 
              className="w-full text-xs border border-slate-300 rounded p-1 bg-white"
              value={op.assignedToId || ''}
              onChange={(e) => handleAssign(op.id, 'user', e.target.value)}
            >
              <option value="">-- Chưa giao thợ --</option>
              {workers.map((w: any) => <option key={w.id} value={w.id}>{w.name}</option>)}
            </select>
            <select 
              className="w-full text-xs border border-slate-300 rounded p-1 bg-white"
              value={op.machineId || ''}
              onChange={(e) => handleAssign(op.id, 'machine', e.target.value)}
            >
              <option value="">-- Chưa chọn máy --</option>
              {machines.map((m: any) => <option key={m.id} value={m.id}>{m.machineName}</option>)}
            </select>
          </div>
        ) : (
          <div className="text-[11px] text-slate-600 bg-slate-100 p-2 rounded mt-auto flex flex-col gap-1">
            <span><strong>Thợ:</strong> {op.assignedTo?.name || 'Chưa giao'}</span>
            <span><strong>Máy:</strong> {op.machine?.machineName || 'Chưa chọn'}</span>
          </div>
        )}

        <div className="flex flex-wrap gap-1.5 pt-2 border-t border-slate-100 mt-2">
          {op.status === 'READY' && (
            <button onClick={() => handleStatusChange(op.id, 'IN_PROGRESS')} className="px-2 py-1 bg-blue-600 text-white text-[11px] font-medium rounded hover:bg-blue-700 flex-1">
              Bắt đầu
            </button>
          )}
          {op.status === 'PAUSED' && (
            <button onClick={() => handleStatusChange(op.id, 'IN_PROGRESS')} className="px-2 py-1 bg-blue-600 text-white text-[11px] font-medium rounded hover:bg-blue-700 flex-1">
              Tiếp tục
            </button>
          )}
          {op.status === 'IN_PROGRESS' && (
            <>
              <button onClick={() => handleStatusChange(op.id, 'PAUSED')} className="px-2 py-1 bg-yellow-500 text-white text-[11px] font-medium rounded hover:bg-yellow-600 flex-1">
                Tạm dừng
              </button>
              <button onClick={() => handleStatusChange(op.id, 'ERROR')} className="px-2 py-1 bg-rose-600 text-white text-[11px] font-medium rounded hover:bg-rose-700 flex-1">
                Báo lỗi
              </button>
              <button onClick={() => handleStatusChange(op.id, 'COMPLETED', { inputSheets: op.inputSheets })} className="px-2 py-1 bg-emerald-600 text-white text-[11px] font-medium rounded hover:bg-emerald-700 w-full mt-1">
                Hoàn thành
              </button>
            </>
          )}
          {isAdmin && op.status !== 'IN_PROGRESS' && (
             <button onClick={() => handleStatusChange(op.id, 'SKIPPED')} className="px-2 py-1 bg-slate-500 text-white text-[11px] font-medium rounded hover:bg-slate-600 flex-1">
               Bỏ qua
             </button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex flex-col space-y-3 border-b border-slate-200 pb-3 shrink-0">
        <div className="flex flex-col sm:flex-row space-y-2 sm:space-y-0 sm:space-x-4 items-start sm:items-center justify-between">
          <div className="flex space-x-2">
            <button
              onClick={() => setViewType('THEO_CONG_DOAN')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewType === 'THEO_CONG_DOAN' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Theo Công Đoạn
            </button>
            <button
              onClick={() => setViewType('THEO_NHAN_SU')}
              className={`px-4 py-2 text-sm font-semibold rounded-lg transition-colors ${viewType === 'THEO_NHAN_SU' ? 'bg-indigo-50 text-indigo-700 shadow-sm border border-indigo-100' : 'text-slate-600 hover:bg-slate-100'}`}
            >
              Theo Máy / Người Phụ Trách
            </button>
          </div>

          <div className="flex items-center space-x-2 pl-0 sm:pl-4 sm:border-l border-slate-200">
            <label className="text-sm text-slate-500 font-medium">Trạng thái:</label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-sm border border-slate-300 rounded-md py-1.5 px-3 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">Tất cả</option>
              <option value="WAITING_PREVIOUS">Chờ CĐ trước</option>
              <option value="READY">Sẵn sàng</option>
              <option value="IN_PROGRESS">Đang làm</option>
              <option value="PAUSED">Tạm dừng</option>
              <option value="ERROR">Báo lỗi</option>
              <option value="COMPLETED">Đã xong</option>
              <option value="SKIPPED">Đã bỏ qua</option>
            </select>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-xs text-slate-500 font-medium">Lọc nhanh:</span>
          {[
            { id: 'NONE', label: 'Tất cả' },
            { id: 'ONLY_READY_UNASSIGNED', label: 'Chỉ READY chưa gán' },
            { id: 'ONLY_ERROR', label: 'Chỉ ERROR' },
            { id: 'ONLY_OVERDUE', label: 'Chỉ trễ hạn' },
            { id: 'ONLY_ASSIGNED_TO', label: 'Đã giao thợ' },
            { id: 'ONLY_NO_MACHINE', label: 'Chưa chọn máy' }
          ].map(qf => (
            <button
              key={qf.id}
              onClick={() => setQuickFilter(qf.id)}
              className={`px-3 py-1 text-[11px] font-semibold rounded-full border transition-colors ${quickFilter === qf.id ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-50'}`}
            >
              {qf.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2 custom-scrollbar">
        <div className="flex gap-4 h-full items-start">
          {Object.entries(groupedOps).map(([laneName, ops]) => (
             <div key={laneName} className="w-[300px] shrink-0 flex flex-col bg-slate-100/50 rounded-xl border border-slate-200 h-full overflow-y-auto custom-scrollbar">
                <div className="p-3 border-b border-slate-200 bg-white sticky top-0 z-10 flex justify-between items-center shrink-0 shadow-sm">
                   <h3 className="font-bold text-sm text-slate-800">{laneName}</h3>
                   <span className="bg-slate-200 text-slate-600 text-xs font-bold px-2 py-0.5 rounded-full">{ops.length}</span>
                </div>
                <div className="p-3 flex-1 space-y-3">
                   {ops.length === 0 ? (
                      <div className="text-center text-xs text-slate-400 py-6">Không có thẻ nào</div>
                   ) : (
                      ops.map((op, i) => renderCard(op, i))
                   )}
                </div>
             </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    WAITING_PREVIOUS: 'bg-slate-100 text-slate-600 border-slate-200',
    READY: 'bg-sky-100 text-sky-700 border-sky-200',
    IN_PROGRESS: 'bg-indigo-100 text-indigo-700 border-indigo-200 animate-pulse',
    PAUSED: 'bg-amber-100 text-amber-800 border-amber-200',
    ERROR: 'bg-rose-100 text-rose-700 border-rose-200',
  };
  const labels: Record<string, string> = {
    WAITING_PREVIOUS: 'Chờ CĐ trước',
    READY: 'Sẵn sàng',
    IN_PROGRESS: 'Đang làm',
    PAUSED: 'Tạm dừng',
    ERROR: 'Báo lỗi'
  };
  return (
    <span className={`text-[10px] font-bold px-2 py-1 rounded-md border ${colors[status] || 'bg-slate-100 text-slate-800'}`}>
      {labels[status] || status}
    </span>
  );
}
