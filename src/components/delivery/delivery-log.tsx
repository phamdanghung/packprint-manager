'use client';

import React from 'react';
import { formatDate } from '@/lib/utils';
import { Truck, CheckCircle, Clock, AlertTriangle, Play, RefreshCcw, FileText, Info } from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  DELIVERY_CREATED: <Truck className="h-4 w-4 text-emerald-500" />,
  STATUS_CHANGED: <RefreshCcw className="h-4 w-4 text-blue-500" />,
  ASSIGNED: <Info className="h-4 w-4 text-slate-500" />,
  SCHEDULED: <Clock className="h-4 w-4 text-amber-500" />,
  DELIVERED: <CheckCircle className="h-4 w-4 text-emerald-500" />,
  FAILED: <AlertTriangle className="h-4 w-4 text-red-500" />,
  RETURNED: <RefreshCcw className="h-4 w-4 text-purple-500" />,
  NOTE_ADDED: <FileText className="h-4 w-4 text-slate-500" />,
  INFO_UPDATED: <Info className="h-4 w-4 text-blue-500" />
};

export default function DeliveryLogViewer({ logs }: { logs: any[] }) {
  if (!logs || logs.length === 0) return null;

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl shadow-sm border border-slate-200 dark:border-slate-800 p-6 mt-6">
      <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 mb-4 flex items-center gap-2">
        <Clock className="h-5 w-5 text-slate-400" />
        Lịch sử giao hàng
      </h3>
      
      <div className="space-y-4">
        {logs.map((log, index) => (
          <div key={log.id} className="relative pl-6 pb-4">
            {/* Timeline line */}
            {index < logs.length - 1 && (
              <div className="absolute left-[11px] top-6 bottom-0 w-px bg-slate-200 dark:bg-slate-700" />
            )}
            
            {/* Timeline dot/icon */}
            <div className="absolute left-0 top-1.5 h-6 w-6 rounded-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center z-10">
              {ACTION_ICONS[log.actionType] || <Info className="h-3 w-3 text-slate-400" />}
            </div>
            
            <div className="ml-4 flex flex-col">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-semibold text-sm text-slate-800 dark:text-slate-200">
                  {log.actor?.name || 'Hệ thống'}
                </span>
                <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
              </div>
              <div className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                {log.actionType === 'STATUS_CHANGED' && (
                  <span>Đã chuyển trạng thái từ <strong className="text-slate-800 dark:text-slate-200">{log.fromStatus}</strong> sang <strong className="text-slate-800 dark:text-slate-200">{log.toStatus}</strong></span>
                )}
                {log.actionType === 'DELIVERY_CREATED' && <span>Đã tạo lệnh giao hàng tự động từ Lệnh SX</span>}
                {log.actionType === 'ASSIGNED' && <span>Đã phân công người giao hàng</span>}
                {log.actionType === 'SCHEDULED' && <span>Đã hẹn lịch giao hàng</span>}
                {log.actionType === 'DELIVERED' && <span className="text-emerald-600 font-medium">Đã giao hàng thành công</span>}
                {log.actionType === 'FAILED' && <span className="text-red-600 font-medium">Giao hàng thất bại</span>}
                
                {log.note && <div className="mt-2 text-sm bg-slate-50 dark:bg-slate-800/50 p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 italic">{log.note}</div>}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
