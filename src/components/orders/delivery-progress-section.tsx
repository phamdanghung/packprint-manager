import React from 'react';
import Link from 'next/link';
import { Truck, MapPin, Calendar, User, ArrowRight, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { formatDate } from '@/lib/utils';

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

export default function DeliveryProgressSection({ job, orderStatus }: { job: any, orderStatus: string }) {
  if (!job) {
    if (orderStatus === 'READY_FOR_DELIVERY' || orderStatus === 'DELIVERING' || orderStatus === 'COMPLETED') {
      return (
        <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mt-6">
          <div className="flex items-center gap-2 mb-2">
            <Truck className="h-5 w-5 text-teal-600" />
            <h2 className="text-xl font-bold">Giao hàng</h2>
          </div>
          <p className="text-sm text-slate-500">Đơn hàng chưa có lệnh giao hàng.</p>
        </div>
      );
    }
    return null; // Không hiển thị nếu chưa đến bước giao hàng
  }

  return (
    <div className="bg-white dark:bg-slate-900 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 mt-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Truck className="h-6 w-6 text-teal-600 dark:text-teal-400" />
          <h2 className="text-xl font-bold">Tiến độ Giao hàng</h2>
        </div>
        <Link 
          href={`/dashboard/delivery/${job.id}`}
          className="text-sm font-semibold text-teal-600 hover:text-teal-700 dark:text-teal-400 flex items-center gap-1"
        >
          Chi tiết <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Status */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" /> Trạng thái
          </div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{STATUS_LABELS[job.status] || job.status}</div>
          <div className="text-xs text-slate-500 mt-1">Mã: {job.deliveryCode}</div>
        </div>

        {/* Method */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <Truck className="h-3.5 w-3.5" /> Phương thức
          </div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{METHOD_LABELS[job.deliveryMethod] || job.deliveryMethod}</div>
          {job.assignedTo && <div className="text-xs text-slate-500 mt-1 text-teal-600 font-medium">Shipper: {job.assignedTo.name}</div>}
        </div>

        {/* Address */}
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800 md:col-span-2">
          <div className="text-xs text-slate-500 mb-1 flex items-center gap-1">
            <MapPin className="h-3.5 w-3.5" /> Giao đến
          </div>
          <div className="font-bold text-slate-900 dark:text-slate-100">{job.receiverName} - {job.receiverPhone}</div>
          <div className="text-xs text-slate-500 mt-1 truncate">{job.deliveryAddress || 'Chưa cập nhật địa chỉ'}</div>
        </div>
      </div>

      {job.status === 'DELIVERED' && (
        <div className="mt-4 p-4 bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-xl flex items-center gap-3">
          <CheckCircle className="h-6 w-6 text-emerald-600" />
          <div>
            <div className="font-bold text-emerald-800 dark:text-emerald-400">Đã giao hàng thành công lúc {formatDate(job.deliveredAt)}</div>
            {job.proofNote && <div className="text-sm text-emerald-700 dark:text-emerald-500 mt-0.5">{job.proofNote}</div>}
          </div>
        </div>
      )}

      {job.status === 'FAILED' && (
        <div className="mt-4 p-4 bg-red-50 dark:bg-red-900/10 border border-red-100 dark:border-red-900/30 rounded-xl flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-red-600" />
          <div>
            <div className="font-bold text-red-800 dark:text-red-400">Giao hàng thất bại</div>
            <div className="text-sm text-red-700 dark:text-red-500 mt-0.5">{job.failedReason}</div>
          </div>
        </div>
      )}
    </div>
  );
}
