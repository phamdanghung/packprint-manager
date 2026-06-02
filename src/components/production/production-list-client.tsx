'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { formatDate } from '@/lib/utils';
import { Search } from 'lucide-react';

const STATUS_BADGES: Record<string, string> = {
  READY_FOR_PRINT: 'bg-blue-100 text-blue-800',
  PRINTING: 'bg-indigo-100 text-indigo-800',
  LAMINATING: 'bg-purple-100 text-purple-800',
  DIE_CUTTING: 'bg-fuchsia-100 text-fuchsia-800',
  QC: 'bg-amber-100 text-amber-800',
  PACKING: 'bg-orange-100 text-orange-800',
  READY_FOR_DELIVERY: 'bg-emerald-100 text-emerald-800',
  ON_HOLD: 'bg-slate-200 text-slate-800',
  REWORK: 'bg-rose-100 text-rose-800',
  CANCELLED: 'bg-red-100 text-red-800',
  COMPLETED: 'bg-green-100 text-green-800'
};

const STATUS_LABELS: Record<string, string> = {
  READY_FOR_PRINT: 'Sẵn sàng in',
  PRINTING: 'Đang in',
  LAMINATING: 'Đang cán màng',
  DIE_CUTTING: 'Đang bế',
  QC: 'Kiểm tra chất lượng',
  PACKING: 'Đóng gói',
  READY_FOR_DELIVERY: 'Sẵn sàng giao',
  ON_HOLD: 'Tạm dừng',
  REWORK: 'Cần xử lý lại',
  CANCELLED: 'Đã hủy',
  COMPLETED: 'Hoàn tất'
};

const PRIORITY_LABELS: Record<string, string> = {
  LOW: 'Thấp',
  NORMAL: 'Bình thường',
  HIGH: 'Cao',
  URGENT: 'Gấp'
};

const PRIORITY_COLORS: Record<string, string> = {
  LOW: 'text-slate-500',
  NORMAL: 'text-blue-600',
  HIGH: 'text-orange-600 font-bold',
  URGENT: 'text-red-600 font-bold animate-pulse'
};

export default function ProductionListClient({ jobs, userRole }: { jobs: any[], userRole: string }) {
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const filteredJobs = jobs.filter(job => {
    const term = searchTerm.toLowerCase();
    const matchSearch = 
      job.jobCode.toLowerCase().includes(term) ||
      job.order?.orderCode.toLowerCase().includes(term) ||
      job.order?.customer?.name.toLowerCase().includes(term);
    
    const matchStatus = statusFilter ? job.status === statusFilter : true;
    return matchSearch && matchStatus;
  });

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input 
            type="text"
            placeholder="Tìm theo Mã SX, Đơn hàng, Tên khách..."
            className="w-full pl-9 pr-4 py-2 border rounded-lg bg-slate-50 dark:bg-slate-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <select 
          className="border rounded-lg px-4 py-2 bg-slate-50 dark:bg-slate-900"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option value="">Tất cả trạng thái</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-100 dark:bg-slate-900">
            <tr>
              <th className="p-3 font-bold rounded-tl-lg">Mã SX / Mã ĐH</th>
              <th className="p-3 font-bold">Khách hàng</th>
              <th className="p-3 font-bold">Trạng thái</th>
              <th className="p-3 font-bold">Tiến độ</th>
              <th className="p-3 font-bold">Ưu tiên</th>
              <th className="p-3 font-bold">Hạn giao</th>
              <th className="p-3 font-bold rounded-tr-lg">Hành động</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {filteredJobs.map(job => {
              const totalSteps = job.steps.length;
              const doneSteps = job.steps.filter((s: any) => s.status === 'DONE' || s.status === 'SKIPPED').length;
              const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

              return (
                <tr key={job.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                  <td className="p-3">
                    <div className="font-bold text-blue-600">{job.jobCode}</div>
                    <div className="text-xs text-slate-500 mt-1">{job.order?.orderCode}</div>
                  </td>
                  <td className="p-3 font-medium text-slate-700 dark:text-slate-300">
                    {job.order?.customer?.name}
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${STATUS_BADGES[job.status] || 'bg-slate-100'}`}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-600" style={{ width: `${percent}%` }}></div>
                      </div>
                      <span className="text-xs font-bold">{percent}%</span>
                    </div>
                    <div className="text-xs text-slate-500 mt-1">{doneSteps}/{totalSteps} công đoạn</div>
                  </td>
                  <td className="p-3">
                    <span className={`text-xs ${PRIORITY_COLORS[job.priority]}`}>
                      {PRIORITY_LABELS[job.priority] || job.priority}
                    </span>
                  </td>
                  <td className="p-3 text-slate-600">
                    {job.dueDate ? formatDate(job.dueDate) : <span className="italic text-slate-400">Chưa xếp lịch</span>}
                  </td>
                  <td className="p-3">
                    <Link 
                      href={`/dashboard/production/${job.id}`}
                      className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded font-medium text-blue-600 transition-colors inline-block"
                    >
                      Chi tiết
                    </Link>
                  </td>
                </tr>
              )
            })}
            {filteredJobs.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-b-lg">
                  Không tìm thấy lệnh sản xuất nào phù hợp.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
