'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { claimProductionOperation } from '@/lib/post-print-actions';

export default function MobileListClient({ operations, currentUser }: any) {
  const [tab, setTab] = useState<'MY_TASKS' | 'READY_UNASSIGNED' | 'IN_PROGRESS' | 'ERROR_PAUSED' | 'COMPLETED'>('MY_TASKS');
  
  const handleClaim = async (opId: string) => {
    try {
      await claimProductionOperation(opId);
      alert('Nhận việc thành công!');
    } catch (e: any) {
      alert(e.message);
    }
  };

  let filtered = [];
  if (tab === 'MY_TASKS') {
    filtered = operations.filter((o: any) => o.assignedToId === currentUser.id && ['READY', 'IN_PROGRESS', 'PAUSED', 'ERROR'].includes(o.status));
  } else if (tab === 'READY_UNASSIGNED') {
    filtered = operations.filter((o: any) => o.status === 'READY' && o.assignedToId === null);
  } else if (tab === 'IN_PROGRESS') {
    filtered = operations.filter((o: any) => o.status === 'IN_PROGRESS' && o.assignedToId === currentUser.id);
  } else if (tab === 'ERROR_PAUSED') {
    filtered = operations.filter((o: any) => ['ERROR', 'PAUSED'].includes(o.status) && o.assignedToId === currentUser.id);
  } else if (tab === 'COMPLETED') {
    filtered = operations.filter((o: any) => ['COMPLETED', 'SKIPPED'].includes(o.status) && o.assignedToId === currentUser.id);
  } else if (tab === 'ALL' as any) {
    filtered = operations;
  }

  const renderCard = (op: any) => (
    <div key={op.id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex flex-col gap-2">
      <div className="flex justify-between items-start">
        <span className="text-[11px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-700 rounded">
          {op.operationName}
        </span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
          op.status === 'READY' ? 'bg-sky-100 text-sky-700' :
          op.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white animate-pulse' :
          op.status === 'ERROR' ? 'bg-rose-100 text-rose-700' :
          op.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
          'bg-slate-100 text-slate-700'
        }`}>
          {op.status === 'READY' ? 'Sẵn sàng' : op.status === 'IN_PROGRESS' ? 'Đang làm' : op.status === 'ERROR' ? 'Báo lỗi' : op.status === 'PAUSED' ? 'Tạm dừng' : 'Đã xong'}
        </span>
      </div>
      
      <div className="font-bold text-slate-800 text-sm mt-1">{op.productionJob.order.orderCode}</div>
      <div className="text-xs text-slate-500">LSX: {op.productionJob.jobCode}</div>
      <div className="text-xs font-medium text-slate-700">{op.orderItem.name}</div>
      
      <div className="grid grid-cols-2 gap-2 mt-2 bg-slate-50 p-2 rounded text-xs border border-slate-100">
        <div><span className="text-slate-500">Đầu vào:</span> <span className="font-semibold">{op.inputSheets}</span></div>
        <div><span className="text-slate-500">Hoàn thành:</span> <span className="font-semibold text-blue-600">{op.completedSheets}</span></div>
        <div><span className="text-slate-500">Đạt:</span> <span className="font-semibold text-emerald-600">{op.goodSheets}</span></div>
        <div><span className="text-slate-500">Hỏng:</span> <span className="font-semibold text-rose-600">{op.wasteSheets}</span></div>
      </div>
      
      {(op.errorReason || op.pauseReason) && (
        <div className="text-[11px] text-rose-600 bg-rose-50 p-2 rounded font-medium mt-1">
          {op.errorReason ? `Lỗi: ${op.errorReason}` : `Tạm dừng: ${op.pauseReason}`}
        </div>
      )}

      <div className="flex gap-2 mt-3">
        {op.status === 'READY' && op.assignedToId === null && (
          <button onClick={() => handleClaim(op.id)} className="flex-1 bg-indigo-600 text-white font-bold py-3 rounded-lg text-sm active:scale-95 transition-transform">
            Nhận việc
          </button>
        )}
        <Link href={`/dashboard/post-print/mobile/operation/${op.id}`} className="flex-1 bg-slate-100 text-slate-700 border border-slate-200 text-center font-bold py-3 rounded-lg text-sm active:scale-95 transition-transform">
          Xem chi tiết
        </Link>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-100 pb-20">
      <div className="bg-white px-4 py-3 sticky top-0 z-20 border-b border-slate-200 shadow-sm flex flex-col gap-3">
        <h1 className="font-bold text-lg text-slate-800">Quản lý Gia Công</h1>
        <div className="flex overflow-x-auto gap-2 pb-1 custom-scrollbar hide-scrollbar">
          {[
            { id: 'MY_TASKS', label: 'Việc của tôi' },
            { id: 'READY_UNASSIGNED', label: 'Việc sẵn sàng' },
            { id: 'IN_PROGRESS', label: 'Đang làm' },
            { id: 'ERROR_PAUSED', label: 'Lỗi/Tạm dừng' },
            { id: 'COMPLETED', label: 'Đã xong hôm nay' },
            { id: 'ALL', label: 'Tất cả' },
          ].map(t => (
             <button
               key={t.id}
               onClick={() => setTab(t.id as any)}
               className={`whitespace-nowrap px-4 py-2 rounded-full text-xs font-bold transition-colors ${tab === t.id ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-600 border border-slate-200'}`}
             >
               {t.label}
             </button>
          ))}
        </div>
      </div>
      
      <div className="p-4 space-y-4">
        {filtered.length === 0 ? (
          <div className="text-center text-slate-400 py-10 text-sm">Không có công đoạn nào</div>
        ) : (
          filtered.map(renderCard)
        )}
      </div>
    </div>
  );
}
