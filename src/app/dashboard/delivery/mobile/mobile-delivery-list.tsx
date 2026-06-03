'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Package, MapPin, Phone, User, Clock, CheckCircle2, XCircle, FileText, AlertCircle } from 'lucide-react';
import { getDeliveryCodAmount } from '@/lib/utils';

interface MobileDeliveryListProps {
  jobs: any[];
  currentUser: any;
}

type TabType = 'my_jobs' | 'unassigned' | 'delivering' | 'failed' | 'delivered_today';

export default function MobileDeliveryList({ jobs, currentUser }: MobileDeliveryListProps) {
  const [activeTab, setActiveTab] = useState<TabType>('my_jobs');

  // Filter jobs based on active tab
  const filteredJobs = jobs.filter(job => {
    switch (activeTab) {
      case 'my_jobs':
        return job.assignedDeliveryId === currentUser.id && ['READY_FOR_DELIVERY', 'SCHEDULED', 'DELIVERING', 'FAILED', 'RETURNED'].includes(job.status);
      case 'unassigned':
        return ['READY_FOR_DELIVERY', 'SCHEDULED'].includes(job.status) && !job.assignedDeliveryId;
      case 'delivering':
        return job.assignedDeliveryId === currentUser.id && job.status === 'DELIVERING';
      case 'failed':
        return job.assignedDeliveryId === currentUser.id && ['FAILED', 'RETURNED'].includes(job.status);
      case 'delivered_today':
        if (job.assignedDeliveryId !== currentUser.id || job.status !== 'DELIVERED' || !job.deliveredAt) return false;
        const today = new Date();
        const deliveredDate = new Date(job.deliveredAt);
        return deliveredDate.getDate() === today.getDate() &&
               deliveredDate.getMonth() === today.getMonth() &&
               deliveredDate.getFullYear() === today.getFullYear();
      default:
        return false;
    }
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'READY_FOR_DELIVERY':
        return <span className="bg-amber-100 text-amber-700 px-2 py-0.5 rounded text-[10px] font-bold">Chờ giao</span>;
      case 'SCHEDULED':
        return <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã lên lịch</span>;
      case 'DELIVERING':
        return <span className="bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded text-[10px] font-bold">Đang giao</span>;
      case 'DELIVERED':
        return <span className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-[10px] font-bold">Đã giao</span>;
      case 'FAILED':
      case 'RETURNED':
        return <span className="bg-rose-100 text-rose-700 px-2 py-0.5 rounded text-[10px] font-bold">Thất bại</span>;
      default:
        return <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[10px] font-bold">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans pb-6">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-20">
        <div className="px-4 py-3 flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-slate-800">Giao hàng</h1>
            <p className="text-xs text-slate-500 font-medium">Xin chào, {currentUser.name}</p>
          </div>
          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600">
            <Package className="h-4.5 w-4.5" />
          </div>
        </div>

        {/* Tabs Scrollable */}
        <div className="flex overflow-x-auto hide-scrollbar border-t border-slate-100 bg-slate-50/50 scroll-smooth">
          {[
            { id: 'my_jobs', label: 'Việc của tôi' },
            { id: 'unassigned', label: 'Chờ giao (Chưa gán)' },
            { id: 'delivering', label: 'Đang giao' },
            { id: 'failed', label: 'Giao lỗi' },
            { id: 'delivered_today', label: 'Xong hôm nay' },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as TabType)}
              className={`whitespace-nowrap px-4 py-3 text-xs font-bold border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-500 text-indigo-700 bg-indigo-50/30'
                  : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-100'
              }`}
            >
              {tab.label}
              {tab.id === 'unassigned' && jobs.filter(j => ['READY_FOR_DELIVERY', 'SCHEDULED'].includes(j.status) && !j.assignedDeliveryId).length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center bg-rose-500 text-white text-[9px] rounded-full h-4 w-4">
                  {jobs.filter(j => ['READY_FOR_DELIVERY', 'SCHEDULED'].includes(j.status) && !j.assignedDeliveryId).length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      <div className="p-3 space-y-3">
        {filteredJobs.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
            <Package className="h-8 w-8 text-slate-300 mx-auto mb-2" />
            <p className="text-sm font-medium text-slate-500">Không có đơn hàng nào</p>
          </div>
        ) : (
          filteredJobs.map(job => {
            const codAmount = getDeliveryCodAmount(job.order);
            const address = job.deliveryAddress || job.order.deliveryAddress || 'Chưa có địa chỉ';
            const phone = job.receiverPhone || job.order.customer.phone;

            return (
              <Link 
                href={`/dashboard/delivery/mobile/job/${job.id}`} 
                key={job.id}
                className="block bg-white border border-slate-200 rounded-xl p-3 shadow-sm active:scale-[0.98] transition-transform"
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-bold text-slate-800">{job.deliveryCode}</span>
                    <span className="text-slate-300">•</span>
                    <span className="text-xs font-medium text-slate-500 truncate max-w-[120px]">{job.order.orderCode}</span>
                  </div>
                  {getStatusBadge(job.status)}
                </div>

                <div className="mb-2">
                  <h3 className="text-sm font-bold text-slate-800 line-clamp-1">{job.receiverName || job.order.customer.name}</h3>
                </div>

                <div className="space-y-1.5 mb-3">
                  <div className="flex items-start gap-2 text-xs text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-2 leading-relaxed">{address}</span>
                  </div>
                  <div className="flex items-center gap-2 text-xs text-slate-600">
                    <Phone className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                    <span>{phone || 'Chưa có SĐT'}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                  <div className="flex items-center gap-1.5">
                    {codAmount > 0 ? (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 bg-rose-50 px-1.5 py-0.5 rounded">
                        COD: {codAmount.toLocaleString()}đ
                      </span>
                    ) : (
                      <span className="text-[10px] font-medium text-slate-500">
                        Không thu COD
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] font-medium text-indigo-600 flex items-center gap-1">
                    Xem chi tiết <CheckCircle2 className="h-3 w-3" />
                  </div>
                </div>
              </Link>
            );
          })
        )}
      </div>
    </div>
  );
}
