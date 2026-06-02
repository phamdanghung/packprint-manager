'use client';

import React from 'react';
import { formatDate } from '@/lib/utils';
import { CheckCircle, Play, AlertTriangle, User, Info, FastForward, Flag } from 'lucide-react';

const ACTION_ICONS: Record<string, React.ReactNode> = {
  JOB_CREATED: <Flag className="w-4 h-4 text-blue-600" />,
  STATUS_CHANGED: <Info className="w-4 h-4 text-purple-600" />,
  STEP_STARTED: <Play className="w-4 h-4 text-blue-500" />,
  STEP_COMPLETED: <CheckCircle className="w-4 h-4 text-green-500" />,
  ISSUE_REPORTED: <AlertTriangle className="w-4 h-4 text-red-500" />,
  ASSIGNED: <User className="w-4 h-4 text-slate-500" />,
  NOTE_ADDED: <Info className="w-4 h-4 text-slate-500" />
};

export default function ProductionLogViewer({ logs }: { logs: any[] }) {
  if (!logs || logs.length === 0) {
    return <div className="text-sm text-slate-500 italic py-4">Chưa có lịch sử hoạt động</div>;
  }

  return (
    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
      {logs.map((log, idx) => (
        <div key={log.id} className="flex gap-3 relative">
          {idx !== logs.length - 1 && (
            <div className="absolute left-[11px] top-6 bottom-[-16px] w-0.5 bg-slate-200"></div>
          )}
          <div className="relative z-10 w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 mt-0.5">
            {ACTION_ICONS[log.actionType] || <Info className="w-3 h-3 text-slate-400" />}
          </div>
          <div className="flex-1 pb-4">
            <div className="flex justify-between items-start mb-1">
              <span className="font-medium text-sm text-slate-800">{log.actor?.name || 'Hệ thống'}</span>
              <span className="text-xs text-slate-500">{formatDate(log.createdAt)}</span>
            </div>
            
            <div className="text-sm text-slate-600">
              {log.actionType === 'STATUS_CHANGED' && (
                <span>Đã đổi trạng thái tổng: <b>{log.fromStatus}</b> &rarr; <b className="text-blue-600">{log.toStatus}</b></span>
              )}
              {log.actionType === 'STEP_STARTED' && (
                <span>{log.note || 'Bắt đầu một công đoạn'}</span>
              )}
              {log.actionType === 'STEP_COMPLETED' && (
                <span>
                  {log.note || 'Hoàn thành công đoạn'}
                  {log.toStatus === 'SKIPPED' && <span className="ml-2 text-slate-400 italic">(Bỏ qua)</span>}
                </span>
              )}
              {log.actionType === 'ISSUE_REPORTED' && (
                <span className="text-red-600">{log.note || 'Báo cáo lỗi'}</span>
              )}
              {log.actionType === 'JOB_CREATED' && (
                <span>Khởi tạo lệnh sản xuất</span>
              )}
              {['ASSIGNED', 'NOTE_ADDED'].includes(log.actionType) && (
                <span>{log.note}</span>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
