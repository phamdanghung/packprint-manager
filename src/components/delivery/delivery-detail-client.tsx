'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { updateDeliveryStatus, markDelivered, markDeliveryFailed, assignDeliveryUser, scheduleDelivery, updateDeliveryInfo } from '@/lib/delivery-actions';
import { createPayment } from '@/lib/payment-actions';
import DeliveryLogViewer from './delivery-log';
import { formatDate, formatCurrencyVND } from '@/lib/utils';
import { Truck, MapPin, User, Phone, CheckCircle, XCircle, Clock, AlertTriangle, Package, Calendar, Camera, DollarSign } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  READY_FOR_DELIVERY: 'Sẵn sàng giao',
  SCHEDULED: 'Đã hẹn giao',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  FAILED: 'Giao thất bại',
  RETURNED: 'Khách trả hàng',
  CANCELLED: 'Đã hủy giao'
};

const METHOD_LABELS: Record<string, string> = {
  COMPANY_SHIPPER: 'Nhân viên công ty',
  GRAB: 'Grab',
  AHAMOVE: 'Ahamove',
  GHTK: 'Giao Hàng Tiết Kiệm',
  GHN: 'Giao Hàng Nhanh',
  VIETTEL_POST: 'Viettel Post',
  CUSTOMER_PICKUP: 'Khách tự lấy',
  OTHER: 'Khác'
};

export default function DeliveryDetailClient({ job, deliveryUsers, currentUserRole, currentUserId }: { job: any, deliveryUsers: any[], currentUserRole: string, currentUserId: string }) {
  const router = useRouter();
  
  // State for forms
  const [isScheduling, setIsScheduling] = useState(false);
  const [scheduleDate, setScheduleDate] = useState(job.scheduledAt ? new Date(job.scheduledAt).toISOString().slice(0, 16) : '');
  const [scheduleMethod, setScheduleMethod] = useState(job.deliveryMethod);

  const [isDelivering, setIsDelivering] = useState(false);
  const [receiverName, setReceiverName] = useState(job.receiverName || '');
  const [proofNote, setProofNote] = useState(job.proofNote || '');
  const [proofImageUrl, setProofImageUrl] = useState(job.proofImageUrl || '');

  const [isFailing, setIsFailing] = useState(false);
  const [failedReason, setFailedReason] = useState(job.failedReason || '');
  
  const [isRecordingCOD, setIsRecordingCOD] = useState(false);
  const [codAmount, setCodAmount] = useState(job.order.debtAmount > 0 ? job.order.debtAmount : 0);
  const [codNote, setCodNote] = useState('Nhân viên giao hàng thu COD');

  const [loading, setLoading] = useState(false);

  const canEdit = ['ADMIN', 'MANAGER', 'DELIVERY'].includes(currentUserRole);

  const isDelivered = job.status === 'DELIVERED';
  const canEditInfo = isDelivered ? ['ADMIN', 'MANAGER'].includes(currentUserRole) : canEdit;

  const handleAssign = async (userId: string) => {
    if (!userId) return;
    setLoading(true);
    const res = await assignDeliveryUser(job.id, userId);
    setLoading(false);
    if (res.success) router.refresh();
    else alert(res.error);
  };

  const handleSchedule = async () => {
    if (!scheduleDate) return alert('Vui lòng chọn ngày giờ hẹn');
    setLoading(true);
    const res = await scheduleDelivery(job.id, new Date(scheduleDate), scheduleMethod);
    setLoading(false);
    if (res.success) {
      setIsScheduling(false);
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleStartDelivery = async () => {
    if (!confirm('Bắt đầu giao đơn hàng này?')) return;
    setLoading(true);
    const res = await updateDeliveryStatus(job.id, 'DELIVERING');
    setLoading(false);
    if (res.success) router.refresh();
    else alert(res.error);
  };

  const handleMarkDelivered = async () => {
    if (!receiverName) return alert('Bắt buộc nhập Tên người nhận');
    if (!proofNote && !proofImageUrl) return alert('Bắt buộc nhập Ghi chú hoặc Hình ảnh bằng chứng giao hàng');
    
    if (!confirm('Xác nhận ĐÃ GIAO THÀNH CÔNG?')) return;
    setLoading(true);
    const res = await markDelivered(job.id, {
      receiverName,
      deliveredAt: new Date(),
      proofNote,
      proofImageUrl
    });
    setLoading(false);
    if (res.success) {
      setIsDelivering(false);
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleMarkFailed = async () => {
    if (!failedReason) return alert('Bắt buộc nhập lý do giao thất bại');
    if (!confirm('Xác nhận GIAO THẤT BẠI?')) return;
    setLoading(true);
    const res = await markDeliveryFailed(job.id, failedReason);
    setLoading(false);
    if (res.success) {
      setIsFailing(false);
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleUpdateInfo = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      receiverName: formData.get('receiverName') as string,
      receiverPhone: formData.get('receiverPhone') as string,
      deliveryAddress: formData.get('deliveryAddress') as string,
    };
    setLoading(true);
    const res = await updateDeliveryInfo(job.id, updates);
    setLoading(false);
    if (res.success) {
      alert('Đã cập nhật thông tin');
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleRecordCOD = async () => {
    if (codAmount <= 0) return alert('Số tiền phải lớn hơn 0');
    if (codAmount > job.order.debtAmount) return alert('Số tiền không được lớn hơn dư nợ');
    setLoading(true);
    const res = await createPayment(job.orderId, codAmount, 'COD', 'PENDING', codNote);
    setLoading(false);
    if (res.success) {
      alert('Đã ghi nhận thu COD thành công. Phiếu thu đang chờ Kế toán xác nhận.');
      setIsRecordingCOD(false);
      router.refresh();
    } else {
      alert((res as any).error);
    }
  };

  const isFinanceVisible = currentUserRole !== 'DELIVERY';

  return (
    <div className="space-y-6">
      {/* Header Info */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 flex flex-wrap gap-6 items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-slate-100">{job.deliveryCode}</h1>
            <span className={`px-3 py-1 rounded-full text-xs font-bold ${
              job.status === 'DELIVERED' ? 'bg-emerald-100 text-emerald-800' :
              job.status === 'DELIVERING' ? 'bg-amber-100 text-amber-800' :
              job.status === 'FAILED' ? 'bg-red-100 text-red-800' :
              'bg-blue-100 text-blue-800'
            }`}>
              {STATUS_LABELS[job.status] || job.status}
            </span>
          </div>
          <p className="text-slate-500 flex items-center gap-2">
            <Package className="h-4 w-4" /> Đơn hàng: 
            <a href={`/dashboard/orders/${job.orderId}`} className="font-semibold text-teal-600 hover:underline">{job.order.orderCode}</a>
            <span className="mx-2 text-slate-300">|</span>
            <User className="h-4 w-4" /> {job.order.customer.name}
          </p>
        </div>
        
        {/* Actions Container */}
        <div className="flex flex-wrap gap-2">
          {canEdit && (job.status === 'READY_FOR_DELIVERY' || job.status === 'FAILED') && (
            <button 
              onClick={() => setIsScheduling(!isScheduling)} 
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium"
              disabled={loading}
            >
              Hẹn lịch giao
            </button>
          )}
          
          {canEdit && job.status === 'SCHEDULED' && (
            <button 
              onClick={handleStartDelivery} 
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium flex items-center gap-2"
              disabled={loading}
            >
              <Truck className="h-4 w-4" /> Bắt đầu giao
            </button>
          )}

          {canEdit && job.status === 'DELIVERING' && (
            <>
              <button 
                onClick={() => { setIsFailing(false); setIsDelivering(!isDelivering); }} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                disabled={loading}
              >
                <CheckCircle className="h-4 w-4" /> Đã giao xong
              </button>
              <button 
                onClick={() => { setIsDelivering(false); setIsFailing(!isFailing); }} 
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2"
                disabled={loading}
              >
                <XCircle className="h-4 w-4" /> Báo lỗi
              </button>
            </>
          )}
        </div>
      </div>

      {/* Dynamic Action Forms */}
      {isScheduling && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
            <Calendar className="h-5 w-5" /> Hẹn lịch giao hàng
          </h3>
          <div className="flex flex-wrap gap-4 items-end">
            <div>
              <label className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Ngày giờ giao</label>
              <input 
                type="datetime-local" 
                value={scheduleDate} 
                onChange={e => setScheduleDate(e.target.value)}
                className="border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-600 dark:text-blue-400 mb-1">Phương thức</label>
              <select 
                value={scheduleMethod} 
                onChange={e => setScheduleMethod(e.target.value)}
                className="border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              >
                {Object.entries(METHOD_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
            <div className="flex gap-2">
              <button onClick={handleSchedule} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700">Lưu lịch hẹn</button>
              <button onClick={() => setIsScheduling(false)} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {isDelivering && (
        <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-5">
          <h3 className="font-bold text-emerald-800 dark:text-emerald-300 mb-4 flex items-center gap-2">
            <CheckCircle className="h-5 w-5" /> Đánh dấu Đã giao thành công
          </h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-bold">Tên người nhận (Bắt buộc)</label>
              <input 
                type="text" 
                value={receiverName} 
                onChange={e => setReceiverName(e.target.value)}
                placeholder="Nguyễn Văn A..."
                className="w-full border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-bold">Ghi chú giao hàng (Bắt buộc nếu không có ảnh)</label>
              <textarea 
                value={proofNote} 
                onChange={e => setProofNote(e.target.value)}
                placeholder="Giao tại quầy lễ tân / Khách đã kiểm hàng..."
                rows={2}
                className="w-full border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-emerald-700 dark:text-emerald-400 mb-1 font-bold">Link Ảnh Bằng chứng (Tuỳ chọn)</label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Camera className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input 
                    type="text" 
                    value={proofImageUrl} 
                    onChange={e => setProofImageUrl(e.target.value)}
                    placeholder="https://..."
                    className="w-full pl-9 pr-3 py-2 border border-emerald-200 dark:border-emerald-700 bg-white dark:bg-slate-800 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleMarkDelivered} disabled={loading} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">Xác nhận Hoàn tất</button>
              <button onClick={() => setIsDelivering(false)} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {isFailing && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl p-5">
          <h3 className="font-bold text-red-800 dark:text-red-300 mb-4 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5" /> Báo cáo Giao hàng thất bại
          </h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs text-red-700 dark:text-red-400 mb-1 font-bold">Lý do thất bại (Bắt buộc)</label>
              <textarea 
                value={failedReason} 
                onChange={e => setFailedReason(e.target.value)}
                placeholder="Khách không nghe máy / Sai địa chỉ..."
                rows={3}
                className="w-full border border-red-200 dark:border-red-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleMarkFailed} disabled={loading} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-bold hover:bg-red-700">Ghi nhận Thất bại</button>
              <button onClick={() => setIsFailing(false)} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {isRecordingCOD && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-5">
          <h3 className="font-bold text-blue-800 dark:text-blue-300 mb-4 flex items-center gap-2">
            <DollarSign className="h-5 w-5" /> Ghi nhận Thu hộ COD
          </h3>
          <div className="space-y-4 max-w-lg">
            <div>
              <label className="block text-xs text-blue-700 dark:text-blue-400 mb-1 font-bold">Số tiền thu (VNĐ)</label>
              <input 
                type="number" 
                value={codAmount} 
                onChange={e => setCodAmount(Number(e.target.value))}
                max={job.order.debtAmount}
                className="w-full border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs text-blue-700 dark:text-blue-400 mb-1 font-bold">Ghi chú</label>
              <textarea 
                value={codNote} 
                onChange={e => setCodNote(e.target.value)}
                rows={2}
                className="w-full border border-blue-200 dark:border-blue-700 bg-white dark:bg-slate-800 rounded-lg px-3 py-2 text-sm"
              />
            </div>
            <div className="flex gap-2 pt-2">
              <button onClick={handleRecordCOD} disabled={loading} className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-bold hover:bg-blue-700">Tạo Phiếu Thu (Chờ Duyệt)</button>
              <button onClick={() => setIsRecordingCOD(false)} className="px-4 py-2 bg-white text-slate-600 border border-slate-300 rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Left Col: Info */}
        <div className="space-y-6">
          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2 dark:border-slate-800">Thông tin giao hàng</h3>
            <form onSubmit={handleUpdateInfo} className="space-y-4">
              <div>
                <label className="block text-xs text-slate-500 mb-1">Người nhận</label>
                <input 
                  type="text" 
                  name="receiverName" 
                  defaultValue={job.receiverName} 
                  disabled={!canEditInfo}
                  className="w-full border-b border-slate-200 dark:border-slate-700 bg-transparent px-0 py-1 text-sm font-medium focus:ring-0 focus:border-teal-500 disabled:border-transparent disabled:text-slate-600" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Số điện thoại</label>
                <input 
                  type="text" 
                  name="receiverPhone" 
                  defaultValue={job.receiverPhone} 
                  disabled={!canEditInfo}
                  className="w-full border-b border-slate-200 dark:border-slate-700 bg-transparent px-0 py-1 text-sm font-medium focus:ring-0 focus:border-teal-500 disabled:border-transparent disabled:text-slate-600" 
                />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Địa chỉ giao</label>
                <textarea 
                  name="deliveryAddress" 
                  defaultValue={job.deliveryAddress} 
                  disabled={!canEditInfo}
                  rows={2}
                  className="w-full border-b border-slate-200 dark:border-slate-700 bg-transparent px-0 py-1 text-sm font-medium focus:ring-0 focus:border-teal-500 disabled:border-transparent disabled:text-slate-600" 
                />
              </div>
              <div className="pt-2 flex justify-between items-center">
                <div className="text-sm">
                  <span className="text-slate-500 mr-2">Phương thức:</span> 
                  <span className="font-semibold">{METHOD_LABELS[job.deliveryMethod] || job.deliveryMethod}</span>
                </div>
                {canEditInfo && <button type="submit" disabled={loading} className="text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 px-3 py-1.5 rounded-lg font-medium">Cập nhật</button>}
              </div>
            </form>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2 dark:border-slate-800">Phân công & Lịch trình</h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs text-slate-500 mb-1">Người phụ trách giao</div>
                  {job.assignedTo ? (
                    <div className="font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                      <User className="h-4 w-4 text-slate-400" /> {job.assignedTo.name}
                    </div>
                  ) : (
                    <div className="italic text-slate-400 text-sm">Chưa phân công</div>
                  )}
                </div>
                {['ADMIN', 'MANAGER'].includes(currentUserRole) && (
                  <select 
                    className="text-xs border rounded p-1.5 bg-white dark:bg-slate-800"
                    onChange={e => handleAssign(e.target.value)}
                    value={job.assignedDeliveryId || ''}
                    disabled={loading}
                  >
                    <option value="" disabled>Đổi người giao</option>
                    {deliveryUsers.map(u => (
                      <option key={u.id} value={u.id}>{u.name}</option>
                    ))}
                  </select>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><Clock className="h-3 w-3" /> Hẹn giao</div>
                  <div className="font-medium text-sm">{job.scheduledAt ? formatDate(job.scheduledAt) : '---'}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-500 mb-1 flex items-center gap-1"><CheckCircle className="h-3 w-3" /> Thực tế giao</div>
                  <div className="font-medium text-sm text-emerald-600">{job.deliveredAt ? formatDate(job.deliveredAt) : '---'}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Col: Evidence & Order Items */}
        <div className="space-y-6">
          
          {(job.status === 'DELIVERED' || job.status === 'FAILED' || job.status === 'RETURNED') && (
            <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
              <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2 dark:border-slate-800">Kết quả & Bằng chứng</h3>
              {job.status === 'FAILED' ? (
                <div className="p-4 bg-red-50 dark:bg-red-900/10 rounded-lg border border-red-100 dark:border-red-900/30 text-red-800 dark:text-red-400">
                  <div className="font-bold mb-1 flex items-center gap-1"><AlertTriangle className="h-4 w-4" /> Lý do thất bại</div>
                  <div className="text-sm">{job.failedReason}</div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <div className="text-xs text-slate-500 mb-1">Ghi chú bằng chứng</div>
                    <div className="text-sm p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-100 dark:border-slate-800">
                      {job.proofNote || <span className="text-slate-400 italic">Không có ghi chú</span>}
                    </div>
                  </div>
                  {job.proofImageUrl && (
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Hình ảnh</div>
                      <a href={job.proofImageUrl} target="_blank" rel="noopener noreferrer" className="block max-w-xs rounded-lg overflow-hidden border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={job.proofImageUrl} alt="Proof" className="w-full h-auto object-cover" />
                      </a>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6">
            <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 border-b pb-2 dark:border-slate-800">Sản phẩm cần giao</h3>
            <div className="space-y-3 mb-6">
              {job.order.items.map((item: any) => (
                <div key={item.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-800/50 rounded-lg">
                  <div>
                    <div className="font-semibold text-sm text-slate-800 dark:text-slate-200">{item.name}</div>
                    <div className="text-xs text-slate-500 mt-0.5">{item.productType} | {item.quantity} cái</div>
                  </div>
                </div>
              ))}
            </div>

            {isFinanceVisible ? (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Giá trị đơn hàng:</span>
                  <span className="font-bold">{formatCurrencyVND(job.order.totalAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Phí giao hàng:</span>
                  <span>{formatCurrencyVND(job.shippingFee)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Đã thanh toán:</span>
                  <span className="text-emerald-600 font-bold">{formatCurrencyVND(job.order.paidAmount)}</span>
                </div>
                <div className="flex justify-between items-center text-sm pt-2 border-t border-slate-100 dark:border-slate-800">
                  <span className="text-slate-900 font-bold">Còn nợ (Cần thu hộ):</span>
                  <span className="text-red-600 font-bold text-lg">{formatCurrencyVND(job.order.debtAmount)}</span>
                </div>
                {job.order.debtAmount > 0 && job.status === 'DELIVERED' && (
                  <button 
                    onClick={() => setIsRecordingCOD(true)}
                    className="w-full mt-2 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 transition"
                  >
                    Ghi nhận khách đã thanh toán COD
                  </button>
                )}
              </div>
            ) : (
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 space-y-2">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Tổng tiền cần thu hộ (COD):</span>
                  <span className="text-red-600 font-bold text-lg">{formatCurrencyVND(job.order.debtAmount)}</span>
                </div>
                <div className="text-xs text-slate-400 italic">Trạng thái thanh toán: {job.order.paymentStatus}</div>
                {job.order.debtAmount > 0 && job.status === 'DELIVERED' && (
                  <button 
                    onClick={() => setIsRecordingCOD(true)}
                    className="w-full mt-2 py-2 bg-blue-50 text-blue-600 border border-blue-200 rounded-lg text-sm font-bold hover:bg-blue-100 transition"
                  >
                    Ghi nhận khách đã thanh toán COD
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
      
      {/* Logs */}
      <DeliveryLogViewer logs={job.logs} />
    </div>
  );
}
