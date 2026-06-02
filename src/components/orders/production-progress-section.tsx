import React from 'react';
import Link from 'next/link';

export default function ProductionProgressSection({ job }: { job: any }) {
  if (!job) return null;

  const totalSteps = job.steps?.length || 0;
  const doneSteps = job.steps?.filter((s: any) => s.status === 'DONE' || s.status === 'SKIPPED').length || 0;
  const percent = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h2 className="text-xl font-bold">Tiến độ sản xuất</h2>
        <Link href={`/dashboard/production/${job.id}`} className="text-sm font-bold text-blue-600 hover:underline">
          Chi tiết Lệnh SX &rarr;
        </Link>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between text-sm mb-1">
          <span className="font-bold text-slate-700">Mã lệnh: {job.jobCode}</span>
          <span className="font-bold text-blue-600">{percent}%</span>
        </div>
        <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-blue-600" style={{ width: `${percent}%` }}></div>
        </div>
        <div className="text-xs text-slate-500 mt-1">Hoàn thành {doneSteps} / {totalSteps} công đoạn</div>
      </div>

      <div className="space-y-2">
        {job.steps?.map((step: any) => (
          <div key={step.id} className="flex justify-between text-sm items-center py-1 border-b border-dashed last:border-0">
            <span className="font-medium">{step.stepName}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full border ${step.status === 'DONE' ? 'bg-green-50 text-green-700' : step.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700' : step.status === 'SKIPPED' ? 'bg-slate-50 text-slate-500 border-dashed' : step.status === 'REWORK' ? 'bg-red-50 text-red-700' : 'bg-slate-50 text-slate-500'}`}>
              {step.status === 'DONE' ? 'Hoàn thành' : step.status === 'IN_PROGRESS' ? 'Đang làm' : step.status === 'SKIPPED' ? 'Bỏ qua' : step.status === 'REWORK' ? 'Lỗi' : 'Chờ'}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
