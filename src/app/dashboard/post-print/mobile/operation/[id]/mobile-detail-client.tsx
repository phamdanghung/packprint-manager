'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { updateOperationStatus, updateOperationQuantity, resolveProductionOperationError } from '@/lib/post-print-actions';

export default function MobileDetailClient({ operation: op, nextOpName, currentUser }: any) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showCompleteForm, setShowCompleteForm] = useState(false);
  const [showErrorForm, setShowErrorForm] = useState(false);
  const [showPauseForm, setShowPauseForm] = useState(false);
  
  const [goodSheets, setGoodSheets] = useState(op.inputSheets.toString());
  const [wasteSheets, setWasteSheets] = useState('0');
  
  const [reason, setReason] = useState('');

  const handleError = (e: any) => {
    alert(e.message || 'Có lỗi xảy ra');
  };

  const handleStart = async () => {
    try {
      setLoading(true);
      await updateOperationStatus(op.id, 'IN_PROGRESS');
    } catch (e) { handleError(e); } finally { setLoading(false); }
  };

  const handlePauseSubmit = async () => {
    if (!reason) return alert('Vui lòng chọn hoặc nhập lý do tạm dừng');
    try {
      setLoading(true);
      await updateOperationStatus(op.id, 'PAUSED', { pauseReason: reason });
      setShowPauseForm(false);
      setReason('');
    } catch (e) { handleError(e); } finally { setLoading(false); }
  };

  const handleErrorSubmit = async () => {
    if (!reason) return alert('Vui lòng chọn hoặc nhập lý do lỗi');
    try {
      setLoading(true);
      await updateOperationStatus(op.id, 'ERROR', { errorReason: reason });
      setShowErrorForm(false);
      setReason('');
    } catch (e) { handleError(e); } finally { setLoading(false); }
  };

  const handleCompleteSubmit = async () => {
    try {
      setLoading(true);
      await updateOperationStatus(op.id, 'COMPLETED', {
        goodSheets,
        wasteSheets
      });
      setShowCompleteForm(false);
    } catch (e) { handleError(e); } finally { setLoading(false); }
  };
  
  const handleCompletePerfect = async () => {
    try {
      setLoading(true);
      await updateOperationStatus(op.id, 'COMPLETED', {
        goodSheets: op.inputSheets,
        wasteSheets: 0
      });
    } catch (e) { handleError(e); } finally { setLoading(false); }
  };

  const handleResolveError = async () => {
    try {
      setLoading(true);
      await resolveProductionOperationError(op.id, 'Đã xử lý lỗi (Mobile)');
    } catch (e) { handleError(e); } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-slate-50 pb-32">
      {/* Header */}
      <div className="bg-white px-4 py-3 sticky top-0 z-20 border-b border-slate-200 shadow-sm flex items-center gap-3">
        <Link href="/dashboard/post-print/mobile" className="w-8 h-8 flex items-center justify-center bg-slate-100 rounded-full active:scale-95 text-xl font-bold">
          ‹
        </Link>
        <h1 className="font-bold text-lg text-slate-800">Chi tiết công đoạn</h1>
      </div>

      <div className="p-4 space-y-4">
        {/* Info Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <div className="flex justify-between items-start mb-2">
            <span className="text-sm font-bold bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
              {op.operationName}
            </span>
            <span className={`text-xs font-bold px-2 py-1 rounded ${
              op.status === 'READY' ? 'bg-sky-100 text-sky-700' :
              op.status === 'IN_PROGRESS' ? 'bg-blue-600 text-white animate-pulse' :
              op.status === 'ERROR' ? 'bg-rose-100 text-rose-700' :
              op.status === 'PAUSED' ? 'bg-amber-100 text-amber-700' :
              'bg-slate-100 text-slate-700'
            }`}>
              {op.status === 'READY' ? 'Sẵn sàng' : op.status === 'IN_PROGRESS' ? 'Đang làm' : op.status === 'ERROR' ? 'Báo lỗi' : op.status === 'PAUSED' ? 'Tạm dừng' : 'Đã xong'}
            </span>
          </div>
          
          <div className="space-y-2 mt-4 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Khách hàng</span>
              <span className="font-semibold text-right">{op.productionJob.order.customer?.name || 'Khách lẻ'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Mã Đơn</span>
              <span className="font-semibold">{op.productionJob.order.orderCode}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Mã LSX</span>
              <span className="font-semibold">{op.productionJob.jobCode}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Sản phẩm</span>
              <span className="font-semibold text-right">{op.orderItem.name}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Vật tư in</span>
              <span className="font-medium text-right text-xs max-w-[200px] truncate">{op.printQueueItem?.material?.name || 'Không có'}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Công đoạn tiếp</span>
              <span className="font-semibold text-right text-indigo-600">{nextOpName}</span>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <span className="text-slate-500">Phụ trách</span>
              <span className="font-semibold">{op.assignedTo?.name || 'Chưa gán'}</span>
            </div>
            <div className="flex justify-between pb-1">
              <span className="text-slate-500">Máy / Khu vực</span>
              <span className="font-semibold">{op.machine?.machineName || 'Chưa chọn'}</span>
            </div>
          </div>
        </div>

        {/* Quantity Card */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">Sản lượng</h3>
          <div className="grid grid-cols-2 gap-4">
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
               <span className="text-xs text-slate-500 mb-1">Đầu vào</span>
               <span className="text-xl font-bold text-slate-800">{op.inputSheets}</span>
             </div>
             <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 flex flex-col items-center">
               <span className="text-xs text-slate-500 mb-1">Hoàn thành</span>
               <span className="text-xl font-bold text-blue-600">{op.completedSheets}</span>
             </div>
             <div className="bg-emerald-50 p-3 rounded-lg border border-emerald-100 flex flex-col items-center">
               <span className="text-xs text-emerald-600 mb-1">Đạt</span>
               <span className="text-xl font-bold text-emerald-700">{op.goodSheets}</span>
             </div>
             <div className="bg-rose-50 p-3 rounded-lg border border-rose-100 flex flex-col items-center">
               <span className="text-xs text-rose-600 mb-1">Hỏng</span>
               <span className="text-xl font-bold text-rose-700">{op.wasteSheets}</span>
             </div>
          </div>
        </div>

        {/* Reasons */}
        {(op.errorReason || op.pauseReason) && (
          <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
             {op.errorReason && (
               <div className="mb-2">
                 <h3 className="font-bold text-rose-700 text-sm mb-1">Lý do báo lỗi</h3>
                 <p className="text-sm text-slate-700 bg-rose-50 p-2 rounded">{op.errorReason}</p>
               </div>
             )}
             {op.pauseReason && (
               <div>
                 <h3 className="font-bold text-amber-700 text-sm mb-1">Lý do tạm dừng</h3>
                 <p className="text-sm text-slate-700 bg-amber-50 p-2 rounded">{op.pauseReason}</p>
               </div>
             )}
          </div>
        )}
        
        {/* Logs */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-200">
          <h3 className="font-bold text-slate-800 mb-3 text-sm">Lịch sử (5 mới nhất)</h3>
          <div className="space-y-3">
             {op.logs.length === 0 ? <p className="text-xs text-slate-500">Chưa có lịch sử</p> : op.logs.map((l: any) => (
                <div key={l.id} className="text-xs flex gap-3 border-b border-slate-50 pb-2 last:border-0">
                  <div className="text-slate-400 w-12 shrink-0">
                    {new Date(l.createdAt).toLocaleTimeString('vi-VN', {hour: '2-digit', minute:'2-digit'})}
                  </div>
                  <div>
                    <span className="font-semibold text-slate-700">{l.actor?.name || 'Hệ thống'}</span>
                    <span className="text-slate-500 ml-1 block">{l.action} {l.note && `- ${l.note}`}</span>
                  </div>
                </div>
             ))}
          </div>
        </div>
      </div>

      {/* Sticky Action Bar */}
      {op.assignedToId === currentUser.id && (
        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-4 pb-6 flex gap-3 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-30">
          {op.status === 'READY' && (
            <>
              <button disabled={loading} onClick={() => setShowErrorForm(true)} className="flex-1 bg-rose-50 text-rose-600 font-bold py-3.5 rounded-xl text-sm">Báo lỗi</button>
              <button disabled={loading} onClick={handleStart} className="flex-[2] bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm">Bắt đầu</button>
            </>
          )}
          {op.status === 'PAUSED' && (
            <>
              <button disabled={loading} onClick={() => setShowErrorForm(true)} className="flex-1 bg-rose-50 text-rose-600 font-bold py-3.5 rounded-xl text-sm">Báo lỗi</button>
              <button disabled={loading} onClick={handleStart} className="flex-[2] bg-blue-600 text-white font-bold py-3.5 rounded-xl text-sm">Tiếp tục</button>
            </>
          )}
          {op.status === 'IN_PROGRESS' && (
            <>
              <div className="flex-1 flex flex-col gap-2">
                <button disabled={loading} onClick={() => setShowPauseForm(true)} className="w-full bg-amber-50 text-amber-600 font-bold py-2 rounded-lg text-xs">Tạm dừng</button>
                <button disabled={loading} onClick={() => setShowErrorForm(true)} className="w-full bg-rose-50 text-rose-600 font-bold py-2 rounded-lg text-xs">Báo lỗi</button>
              </div>
              <button disabled={loading} onClick={() => setShowCompleteForm(true)} className="flex-[1.5] bg-emerald-600 text-white font-bold py-3.5 rounded-xl text-sm">Hoàn thành</button>
            </>
          )}
          {op.status === 'ERROR' && (
            <button disabled={loading} onClick={handleResolveError} className="w-full bg-amber-500 text-white font-bold py-3.5 rounded-xl text-sm">
              Đã xử lý lỗi (Chuyển Tạm dừng)
            </button>
          )}
        </div>
      )}

      {/* Forms Overlay */}
      {(showCompleteForm || showErrorForm || showPauseForm) && (
        <div className="fixed inset-0 bg-slate-900/50 z-40 flex items-end justify-center sm:items-center">
           <div className="bg-white w-full sm:w-[400px] rounded-t-2xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom-10">
              
              {showCompleteForm && (
                 <>
                   <h2 className="font-bold text-lg mb-4">Hoàn thành công đoạn</h2>
                   <button onClick={handleCompletePerfect} className="w-full mb-4 bg-emerald-100 text-emerald-800 font-bold py-3 rounded-lg border border-emerald-200">
                     ✓ Đạt đủ / Không hư ({op.inputSheets})
                   </button>
                   <div className="text-center text-xs text-slate-400 mb-4">- HOẶC NHẬP TAY -</div>
                   <div className="flex gap-4 mb-4">
                     <div className="flex-1">
                       <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng Đạt</label>
                       <input type="number" min="0" value={goodSheets} onChange={e=>setGoodSheets(e.target.value)} className="w-full border border-slate-300 p-3 rounded-lg text-lg text-center" />
                     </div>
                     <div className="flex-1">
                       <label className="block text-xs font-bold text-slate-700 mb-1">Số lượng Hỏng</label>
                       <input type="number" min="0" value={wasteSheets} onChange={e=>setWasteSheets(e.target.value)} className="w-full border border-slate-300 p-3 rounded-lg text-lg text-center text-rose-600" />
                     </div>
                   </div>
                   <div className="flex gap-3 mt-6">
                     <button onClick={() => setShowCompleteForm(false)} className="flex-1 bg-slate-100 font-bold py-3 rounded-lg">Hủy</button>
                     <button onClick={handleCompleteSubmit} className="flex-1 bg-emerald-600 text-white font-bold py-3 rounded-lg">Lưu</button>
                   </div>
                 </>
              )}

              {showPauseForm && (
                 <>
                   <h2 className="font-bold text-lg mb-4 text-amber-700">Tạm dừng</h2>
                   <div className="flex flex-wrap gap-2 mb-4">
                     {['Chờ vật tư', 'Chờ quản lý kiểm tra', 'Máy đang bận', 'Máy lỗi nhẹ', 'Nghỉ ca', 'Khác'].map(r => (
                       <button key={r} onClick={()=>setReason(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${reason === r ? 'bg-amber-100 border-amber-300 text-amber-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{r}</button>
                     ))}
                   </div>
                   <textarea placeholder="Lý do chi tiết..." value={reason} onChange={e=>setReason(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 mb-4"></textarea>
                   <div className="flex gap-3">
                     <button onClick={() => {setShowPauseForm(false); setReason('');}} className="flex-1 bg-slate-100 font-bold py-3 rounded-lg">Hủy</button>
                     <button onClick={handlePauseSubmit} className="flex-1 bg-amber-500 text-white font-bold py-3 rounded-lg">Tạm dừng</button>
                   </div>
                 </>
              )}

              {showErrorForm && (
                 <>
                   <h2 className="font-bold text-lg mb-4 text-rose-700">Báo lỗi</h2>
                   <div className="flex flex-wrap gap-2 mb-4">
                     {['Máy hỏng', 'Nguyên liệu lỗi', 'Lệch bế', 'Sai màu', 'Thiếu số lượng', 'Khác'].map(r => (
                       <button key={r} onClick={()=>setReason(r)} className={`px-3 py-1.5 rounded-full text-xs font-bold border ${reason === r ? 'bg-rose-100 border-rose-300 text-rose-800' : 'bg-slate-50 border-slate-200 text-slate-600'}`}>{r}</button>
                     ))}
                   </div>
                   <textarea placeholder="Mô tả lỗi chi tiết..." value={reason} onChange={e=>setReason(e.target.value)} className="w-full border border-slate-300 rounded-lg p-3 text-sm h-24 mb-4"></textarea>
                   <div className="flex gap-3">
                     <button onClick={() => {setShowErrorForm(false); setReason('');}} className="flex-1 bg-slate-100 font-bold py-3 rounded-lg">Hủy</button>
                     <button onClick={handleErrorSubmit} className="flex-1 bg-rose-600 text-white font-bold py-3 rounded-lg">Báo lỗi</button>
                   </div>
                 </>
              )}

           </div>
        </div>
      )}
    </div>
  );
}
