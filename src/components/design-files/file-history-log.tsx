import React from 'react';
import { formatDate } from '@/lib/utils';

export default function FileHistoryLog({ files }: { files: any[] }) {
  // Gộp tất cả logs của các files, sort theo thời gian mới nhất
  const allLogs = files.flatMap(f => 
    (f.logs || []).map((log: any) => ({
      ...log,
      fileCode: f.fileCode,
      fileName: f.fileName
    }))
  ).sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  if (allLogs.length === 0) return null;

  return (
    <div className="mt-8">
      <h3 className="font-bold text-lg mb-4">Lịch sử xử lý file</h3>
      <div className="bg-slate-50 dark:bg-slate-900 rounded-lg p-4 border border-slate-200 dark:border-slate-700 h-64 overflow-y-auto">
        <ul className="space-y-4">
          {allLogs.map((log: any) => (
            <li key={log.id} className="flex gap-4 text-sm">
              <div className="text-slate-500 whitespace-nowrap min-w-32">{formatDate(log.createdAt)}</div>
              <div>
                <span className="font-bold">{log.actor?.name || 'Hệ thống'}</span>
                <span className="mx-2 text-slate-500">đã</span>
                <span className="font-medium text-blue-600">{log.actionType}</span>
                <span className="mx-2 text-slate-500">trên file</span>
                <span className="font-bold">{log.fileCode}</span>
                {(log.fromStatus || log.toStatus) && (
                  <span className="ml-2 bg-slate-200 dark:bg-slate-700 px-2 py-0.5 rounded text-xs">
                    {log.fromStatus} &rarr; {log.toStatus}
                  </span>
                )}
                {log.note && (
                  <div className="text-slate-600 dark:text-slate-400 mt-1 italic">
                    Ghi chú: {log.note}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
