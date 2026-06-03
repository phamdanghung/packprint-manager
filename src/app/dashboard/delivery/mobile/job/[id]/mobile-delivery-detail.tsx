'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, MapPin, Phone, Clock, FileText, CheckCircle2, XCircle, User, Box, Play, AlertCircle, Loader2, DollarSign, Package } from 'lucide-react';
import Link from 'next/link';
import { getDeliveryCodAmount } from '@/lib/utils';
import {
  claimDeliveryJob,
  startDeliveryJob,
  markDeliveryJobDelivered,
  markDeliveryFailed,
  rescheduleDeliveryJob
} from '@/lib/delivery-mobile-actions';

interface MobileDeliveryDetailProps {
  job: any;
  currentUser: any;
}

export default function MobileDeliveryDetail({ job, currentUser }: MobileDeliveryDetailProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // Modals state
  const [showDeliveredForm, setShowDeliveredForm] = useState(false);
  const [showFailedForm, setShowFailedForm] = useState(false);
  const [showRescheduleForm, setShowRescheduleForm] = useState(false);

  // Form states
  const [collectedAmount, setCollectedAmount] = useState<number | ''>('');
  const [receiverName, setReceiverName] = useState(job.receiverName || job.order.customer.name);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [note, setNote] = useState('');
  const [failedReason, setFailedReason] = useState('');
  const [rescheduleAt, setRescheduleAt] = useState('');

  const codAmount = getDeliveryCodAmount(job.order);
  const address = job.deliveryAddress || job.order.deliveryAddress || '';
  const phone = job.receiverPhone || job.order.customer.phone || '';

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_DELIVERY': return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-xs font-bold">Chờ giao</span>;
      case 'SCHEDULED': return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-xs font-bold">Đã lên lịch</span>;
      case 'DELIVERING': return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-xs font-bold">Đang giao</span>;
      case 'DELIVERED': return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-bold">Đã giao</span>;
      case 'FAILED': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">Giao thất bại</span>;
      case 'RETURNED': return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-xs font-bold">Hoàn hàng</span>;
      default: return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs font-bold">{status}</span>;
    }
  };

  const handleClaim = async () => {
    if (loading) return;
    setLoading(true);
    const res = await claimDeliveryJob(job.id);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
    setLoading(false);
  };

  const handleStart = async () => {
    if (loading) return;
    if (confirm('Xác nhận bắt đầu đi giao đơn hàng này?')) {
      setLoading(true);
      const res = await startDeliveryJob(job.id);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error);
      }
      setLoading(false);
    }
  };

  const submitDelivered = async () => {
    if (loading) return;
    setError('');
    
    if (codAmount > 0 && (collectedAmount === '' || collectedAmount === undefined)) {
      setError('Vui lòng nhập số tiền đã thu (COD)');
      return;
    }

    setLoading(true);
    const res = await markDeliveryJobDelivered(job.id, {
      receiverName,
      collectedAmount: collectedAmount === '' ? 0 : Number(collectedAmount),
      paymentMethod,
      note
    });

    if (res.success) {
      setShowDeliveredForm(false);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi không xác định');
    }
    setLoading(false);
  };

  const submitFailed = async () => {
    if (loading) return;
    setError('');
    
    if (!failedReason) {
      setError('Vui lòng chọn lý do thất bại');
      return;
    }

    setLoading(true);
    const res = await markDeliveryFailed(job.id, failedReason, undefined, note);

    if (res.success) {
      setShowFailedForm(false);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi không xác định');
    }
    setLoading(false);
  };

  const submitReschedule = async () => {
    if (loading) return;
    setError('');
    
    if (!rescheduleAt) {
      setError('Vui lòng chọn thời gian hẹn lại');
      return;
    }

    setLoading(true);
    const res = await rescheduleDeliveryJob(job.id, new Date(rescheduleAt), note || failedReason);

    if (res.success) {
      setShowRescheduleForm(false);
      router.refresh();
    } else {
      setError(res.error || 'Lỗi không xác định');
    }
    setLoading(false);
  };

  const quickReasons = [
    'Khách hẹn lại',
    'Không liên hệ được',
    'Sai địa chỉ',
    'Khách từ chối nhận',
    'Hàng lỗi / thiếu hàng',
    'Không kịp giao',
    'Khác'
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-24">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20 flex items-center px-4 py-3">
        <Link href="/dashboard/delivery/mobile" className="h-10 w-10 -ml-2 flex items-center justify-center rounded-full text-slate-500 active:bg-slate-100">
          <ChevronLeft className="h-6 w-6" />
        </Link>
        <div className="flex-1 ml-1">
          <h1 className="text-lg font-bold text-slate-800 line-clamp-1">{job.deliveryCode}</h1>
          <p className="text-xs text-slate-500 font-medium">Đơn {job.order.orderCode}</p>
        </div>
        {getStatusBadge(job.status)}
      </div>

      <div className="p-3 space-y-3">
        {/* Block 1: Order Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <User className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Thông tin đơn hàng</h2>
          </div>
          <div className="space-y-3">
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Khách hàng</p>
              <p className="text-sm font-bold text-slate-800">{job.order.customer.name}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Số điện thoại</p>
              <p className="text-sm font-bold text-indigo-600">{phone || 'Không có'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Địa chỉ giao</p>
              <p className="text-sm font-medium text-slate-700 leading-relaxed">{address || 'Không có'}</p>
            </div>
            {job.note && (
              <div className="bg-amber-50 p-2.5 rounded-lg border border-amber-100">
                <p className="text-[10px] text-amber-700 font-bold uppercase mb-0.5 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> Ghi chú giao hàng
                </p>
                <p className="text-sm font-medium text-amber-900">{job.note}</p>
              </div>
            )}
          </div>
        </div>

        {/* Block 2: Delivery Info */}
        <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
            <Package className="h-4 w-4 text-slate-400" />
            <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Thông tin giao</h2>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Người giao</p>
              <p className="text-sm font-bold text-slate-800">{job.assignedTo?.name || 'Chưa gán'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Hẹn giao</p>
              <p className="text-sm font-medium text-slate-700">{job.scheduledAt ? new Date(job.scheduledAt).toLocaleString('vi-VN') : 'Không hẹn giờ'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Bắt đầu đi</p>
              <p className="text-sm font-medium text-slate-700">{job.startedAt ? new Date(job.startedAt).toLocaleString('vi-VN') : '--'}</p>
            </div>
            <div>
              <p className="text-[10px] text-slate-500 font-medium uppercase mb-0.5">Hoàn thành lúc</p>
              <p className="text-sm font-medium text-slate-700">{job.deliveredAt ? new Date(job.deliveredAt).toLocaleString('vi-VN') : '--'}</p>
            </div>
          </div>
        </div>

        {/* Block 3: Payment/COD */}
        <div className="bg-rose-50 rounded-xl border border-rose-100 p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-3 border-b border-rose-200/50 pb-2">
            <DollarSign className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-bold text-rose-800 uppercase tracking-wide">Thu tiền (COD)</h2>
          </div>
          <div className="space-y-3">
            <div className="flex justify-between items-center bg-white p-3 rounded-lg border border-rose-100">
              <span className="text-sm font-bold text-slate-700">Cần thu (COD):</span>
              <span className="text-lg font-bold text-rose-600">{codAmount > 0 ? codAmount.toLocaleString() + 'đ' : '0đ'}</span>
            </div>
            {job.status === 'DELIVERED' && (
              <p className="text-xs font-medium text-emerald-600 text-center">Đã xác nhận thanh toán/thu hộ</p>
            )}
          </div>
        </div>

        {/* Block 4: Logs */}
        {job.logs && job.logs.length > 0 && (
          <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm mb-4">
            <div className="flex items-center gap-2 mb-3 border-b border-slate-100 pb-2">
              <Clock className="h-4 w-4 text-slate-400" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-wide">Lịch sử giao (5)</h2>
            </div>
            <div className="space-y-3">
              {job.logs.map((log: any) => (
                <div key={log.id} className="relative pl-3 border-l-2 border-indigo-200">
                  <div className="absolute -left-[5px] top-1.5 h-2 w-2 rounded-full bg-indigo-500"></div>
                  <div className="flex justify-between items-start mb-0.5">
                    <span className="text-xs font-bold text-slate-700">{log.actionType}</span>
                    <span className="text-[10px] text-slate-400">{new Date(log.createdAt).toLocaleString('vi-VN', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit' })}</span>
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">Bởi {log.actor?.name}</p>
                  {log.note && <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-1.5 rounded">{log.note}</p>}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Sticky Action Bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 p-3 flex gap-2 z-30 shadow-[0_-4px_10px_rgba(0,0,0,0.05)]">
        {/* Buttons for actions */}
        {job.status === 'READY_FOR_DELIVERY' && !job.assignedDeliveryId && (
          <button
            onClick={handleClaim}
            disabled={loading}
            className="flex-1 h-12 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all disabled:opacity-50"
          >
            {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Nhận giao đơn này'}
          </button>
        )}

        {['READY_FOR_DELIVERY', 'SCHEDULED'].includes(job.status) && job.assignedDeliveryId === currentUser.id && (
          <>
            <button
              onClick={handleStart}
              disabled={loading}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all disabled:opacity-50 gap-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <><Play className="h-4 w-4" fill="currentColor" /> Bắt đầu đi</>}
            </button>
          </>
        )}

        {job.status === 'DELIVERING' && job.assignedDeliveryId === currentUser.id && (
          <>
            <button
              onClick={() => setShowDeliveredForm(true)}
              className="flex-1 h-12 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all gap-1.5"
            >
              <CheckCircle2 className="h-5 w-5" /> Đã giao
            </button>
            <button
              onClick={() => setShowFailedForm(true)}
              className="flex-1 h-12 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all gap-1.5"
            >
              <XCircle className="h-5 w-5" /> Giao lỗi
            </button>
          </>
        )}

        {['FAILED', 'RETURNED'].includes(job.status) && job.assignedDeliveryId === currentUser.id && (
          <button
            onClick={() => setShowRescheduleForm(true)}
            className="flex-1 h-12 bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all"
          >
            Hẹn giao lại
          </button>
        )}

        {/* Global Utilities in Action Bar */}
        <a 
          href={phone ? `tel:${phone}` : '#'}
          className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl font-bold shadow-sm border ${phone ? 'bg-white border-slate-200 text-indigo-600 active:bg-slate-50' : 'bg-slate-100 border-transparent text-slate-300'}`}
          onClick={(e) => { if (!phone) { e.preventDefault(); alert('Khách hàng chưa có số điện thoại'); } }}
        >
          <Phone className="h-5 w-5" />
        </a>
        <a 
          href={address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : '#'}
          target="_blank"
          className={`h-12 w-12 flex-shrink-0 flex items-center justify-center rounded-xl font-bold shadow-sm border ${address ? 'bg-white border-slate-200 text-amber-600 active:bg-slate-50' : 'bg-slate-100 border-transparent text-slate-300'}`}
          onClick={(e) => { if (!address) { e.preventDefault(); alert('Không có địa chỉ để mở bản đồ'); } }}
        >
          <MapPin className="h-5 w-5" />
        </a>
      </div>

      {/* Forms (Modals) */}
      
      {/* 1. Delivered Form */}
      {showDeliveredForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-slate-800">Xác nhận Đã giao</h3>
              <button onClick={() => setShowDeliveredForm(false)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><XCircle className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-lg border border-rose-100">{error}</div>}

            <div className="space-y-4">
              {codAmount > 0 && (
                <div className="bg-rose-50 p-3 rounded-xl border border-rose-200">
                  <p className="text-xs font-bold text-rose-800 uppercase mb-1">Cần thu (COD)</p>
                  <p className="text-xl font-bold text-rose-600 mb-3">{codAmount.toLocaleString()}đ</p>
                  
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">Số tiền đã thu thực tế *</label>
                  <input 
                    type="number" 
                    className="w-full h-12 bg-white border border-rose-200 rounded-xl px-4 font-bold text-rose-600 focus:outline-none focus:ring-2 focus:ring-rose-500" 
                    placeholder="Nhập số tiền..."
                    value={collectedAmount}
                    onChange={(e) => setCollectedAmount(e.target.value ? Number(e.target.value) : '')}
                  />

                  <label className="block text-xs font-bold text-slate-700 mb-1.5 mt-3">Phương thức thanh toán</label>
                  <select 
                    className="w-full h-12 bg-white border border-rose-200 rounded-xl px-4 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                  >
                    <option value="CASH">Tiền mặt</option>
                    <option value="BANK_TRANSFER">Chuyển khoản</option>
                  </select>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Tên người nhận (nếu khác)</label>
                <input 
                  type="text" 
                  className="w-full h-12 bg-slate-50 border border-slate-200 rounded-xl px-4 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" 
                  placeholder="Nhập tên người nhận hàng..."
                  value={receiverName}
                  onChange={(e) => setReceiverName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú (Bắt buộc nếu thu thiếu)</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 min-h-[80px]" 
                  placeholder="Ghi chú giao hàng..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button 
                onClick={submitDelivered}
                disabled={loading}
                className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Hoàn thành giao hàng'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. Failed Form */}
      {showFailedForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-rose-600">Báo lỗi giao hàng</h3>
              <button onClick={() => setShowFailedForm(false)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><XCircle className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-lg border border-rose-100">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-2">Chọn nhanh lý do *</label>
                <div className="flex flex-wrap gap-2">
                  {quickReasons.map(reason => (
                    <button 
                      key={reason}
                      onClick={() => setFailedReason(reason)}
                      className={`px-3 py-2 text-xs font-bold rounded-lg border transition-all ${
                        failedReason === reason 
                          ? 'bg-rose-100 border-rose-300 text-rose-700' 
                          : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {reason}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Chi tiết thêm (nếu cần)</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-rose-500 focus:ring-1 focus:ring-rose-500 min-h-[80px]" 
                  placeholder="Khách đi vắng, bảo vệ không cho vào..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button 
                onClick={submitFailed}
                disabled={loading}
                className="w-full h-12 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Xác nhận Báo lỗi'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. Reschedule Form */}
      {showRescheduleForm && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/40 backdrop-blur-sm sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-3xl sm:rounded-2xl p-5 animate-in slide-in-from-bottom shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-amber-600">Hẹn giao lại</h3>
              <button onClick={() => setShowRescheduleForm(false)} className="h-8 w-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><XCircle className="h-5 w-5" /></button>
            </div>

            {error && <div className="mb-4 p-3 bg-rose-50 text-rose-600 text-xs font-medium rounded-lg border border-rose-100">{error}</div>}

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Thời gian hẹn lại *</label>
                <input 
                  type="datetime-local" 
                  className="w-full h-12 bg-white border border-slate-200 rounded-xl px-4 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500" 
                  value={rescheduleAt}
                  onChange={(e) => setRescheduleAt(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Ghi chú hẹn lại *</label>
                <textarea 
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-medium focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 min-h-[80px]" 
                  placeholder="Khách hẹn 3h chiều mang qua..."
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <button 
                onClick={submitReschedule}
                disabled={loading}
                className="w-full h-12 bg-amber-500 hover:bg-amber-600 text-white rounded-xl font-bold text-sm shadow-md flex items-center justify-center transition-all disabled:opacity-50 mt-4"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : 'Lưu lịch hẹn'}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
