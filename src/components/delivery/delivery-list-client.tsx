'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Search, Filter, Truck, Package, Clock, CheckCircle, XCircle, AlertCircle, ArrowLeft } from 'lucide-react';
import { formatDate, formatCurrencyVND } from '@/lib/utils';
import { assignDeliveryUser } from '@/lib/delivery-actions';

const STATUS_LABELS: Record<string, string> = {
  READY_FOR_DELIVERY: 'Sẵn sàng giao',
  SCHEDULED: 'Đã hẹn giao',
  DELIVERING: 'Đang giao',
  DELIVERED: 'Đã giao',
  FAILED: 'Giao thất bại',
  RETURNED: 'Khách trả hàng',
  CANCELLED: 'Đã hủy giao'
};

const STATUS_COLORS: Record<string, string> = {
  READY_FOR_DELIVERY: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400 border-emerald-200',
  SCHEDULED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400 border-blue-200',
  DELIVERING: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 border-amber-200',
  DELIVERED: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400 border-teal-200',
  FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400 border-red-200',
  RETURNED: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400 border-purple-200',
  CANCELLED: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-400 border-slate-200'
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

export default function DeliveryListClient({ initialJobs, deliveryUsers, currentUserRole, currentUserId }: { initialJobs: any[], deliveryUsers: any[], currentUserRole: string, currentUserId: string }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [search, setSearch] = useState(searchParams.get('q') || '');
  const [status, setStatus] = useState(searchParams.get('status') || '');
  const [method, setMethod] = useState(searchParams.get('method') || '');

  const handleFilter = () => {
    const params = new URLSearchParams();
    if (search) params.set('q', search);
    if (status) params.set('status', status);
    if (method) params.set('method', method);
    router.push(`/dashboard/delivery?${params.toString()}`);
  };

  const handleAssign = async (jobId: string, userId: string) => {
    if (!userId) return;
    const res = await assignDeliveryUser(jobId, userId);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800 overflow-hidden">
      {/* Filters */}
      <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex gap-2 flex-1 min-w-[300px]">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm mã đơn, tên khách, SĐT..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleFilter()}
              className="w-full pl-9 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select 
            value={status}
            onChange={e => setStatus(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <select 
            value={method}
            onChange={e => setMethod(e.target.value)}
            className="px-3 py-2 bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-lg text-sm"
          >
            <option value="">Tất cả phương thức</option>
            {Object.entries(METHOD_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          <button 
            onClick={handleFilter}
            className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            Lọc
          </button>
        </div>
      </div>

      {/* List */}
      {initialJobs.length === 0 ? (
        <div className="p-12 text-center">
          <Truck className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-700 dark:text-slate-300 mb-1">Không tìm thấy đơn giao hàng</h3>
          <p className="text-slate-500 text-sm">Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm</p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 font-medium border-b border-slate-200 dark:border-slate-700">
              <tr>
                <th className="px-6 py-4">Mã GH / Đơn hàng</th>
                <th className="px-6 py-4">Khách hàng</th>
                <th className="px-6 py-4">Trạng thái</th>
                <th className="px-6 py-4">Phương thức</th>
                <th className="px-6 py-4">Người giao</th>
                <th className="px-6 py-4 text-right">Cần thu / Phí ship</th>
                <th className="px-6 py-4 text-center">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {initialJobs.map(job => (
                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <td className="px-6 py-4">
                    <Link href={`/dashboard/delivery/${job.id}`} className="font-bold text-teal-600 hover:text-teal-700 dark:text-teal-400 block mb-1">
                      {job.deliveryCode}
                    </Link>
                    <Link href={`/dashboard/orders/${job.orderId}`} className="text-xs text-slate-500 hover:underline flex items-center gap-1">
                      <Package className="h-3 w-3" /> {job.order.orderCode}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-slate-900 dark:text-slate-100">{job.receiverName || job.order.customer.name}</div>
                    <div className="text-xs text-slate-500 mt-1">{job.receiverPhone || job.order.customer.phone}</div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_COLORS[job.status] || STATUS_COLORS.CANCELLED}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                    {job.scheduledAt && (
                      <div className="text-[10px] text-slate-500 mt-2 flex items-center gap-1">
                        <Clock className="h-3 w-3" /> Hẹn: {formatDate(job.scheduledAt)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-slate-700 dark:text-slate-300 font-medium">
                      {METHOD_LABELS[job.deliveryMethod] || job.deliveryMethod}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {job.assignedTo ? (
                      <span className="font-medium text-slate-700 dark:text-slate-300">{job.assignedTo.name}</span>
                    ) : (
                      ['ADMIN', 'MANAGER'].includes(currentUserRole) ? (
                        <select 
                          className="text-xs border rounded p-1.5 bg-white dark:bg-slate-800"
                          onChange={e => handleAssign(job.id, e.target.value)}
                          defaultValue=""
                        >
                          <option value="" disabled>Chưa gán</option>
                          {deliveryUsers.map(u => (
                            <option key={u.id} value={u.id}>{u.name}</option>
                          ))}
                        </select>
                      ) : (
                        <span className="text-xs text-slate-400 italic">Chưa phân công</span>
                      )
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {currentUserRole !== 'DELIVERY' && (
                      <div className="text-xs text-slate-500 mb-1">
                        Tổng: {formatCurrencyVND(job.order.totalAmount)}
                      </div>
                    )}
                    {job.order.debtAmount > 0 ? (
                      <div className="font-bold text-rose-600 dark:text-rose-400">
                        Cần thu: {formatCurrencyVND(job.order.debtAmount)}
                      </div>
                    ) : (
                      <div className="text-xs text-slate-500 font-medium">Không thu hộ</div>
                    )}
                    {job.shippingFee > 0 && (
                      <div className="text-[10px] text-slate-500 mt-1">
                        Phí ship: {formatCurrencyVND(job.shippingFee)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-center">
                    <Link 
                      href={`/dashboard/delivery/${job.id}`}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 rounded-lg text-xs font-medium transition-colors"
                    >
                      Chi tiết <ArrowLeft className="h-3 w-3 rotate-180" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
