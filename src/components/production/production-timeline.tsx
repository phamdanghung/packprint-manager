'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { startProductionStep, completeProductionStep, skipProductionStep } from '@/lib/production-actions';
import { Check, Play, FastForward, AlertTriangle, Loader2 } from 'lucide-react';
import ReportIssueModal from './report-issue-modal';

const STEP_STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-slate-100 text-slate-500 border-slate-200',
  IN_PROGRESS: 'bg-blue-50 text-blue-700 border-blue-300',
  DONE: 'bg-green-50 text-green-700 border-green-300',
  SKIPPED: 'bg-slate-50 text-slate-400 border-slate-200 border-dashed',
  REWORK: 'bg-red-50 text-red-700 border-red-300'
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Chờ xử lý',
  IN_PROGRESS: 'Đang làm',
  DONE: 'Hoàn thành',
  SKIPPED: 'Bỏ qua',
  REWORK: 'Cần làm lại'
};

export default function ProductionTimeline({ steps, canUpdate, jobStatus }: { steps: any[], canUpdate: boolean, jobStatus: string }) {
  const router = useRouter();
  const [loadingStep, setLoadingStep] = useState<string | null>(null);
  const [reportIssueStepId, setReportIssueStepId] = useState<string | null>(null);

  const handleStart = async (stepId: string) => {
    if (!confirm('Xác nhận bắt đầu công đoạn này?')) return;
    setLoadingStep(stepId);
    const res = await startProductionStep(stepId);
    setLoadingStep(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleComplete = async (stepId: string) => {
    if (!confirm('Xác nhận hoàn thành công đoạn này?')) return;
    setLoadingStep(stepId);
    const res = await completeProductionStep(stepId);
    setLoadingStep(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const handleSkip = async (stepId: string) => {
    if (!confirm('Bạn có chắc muốn BỎ QUA công đoạn này?')) return;
    setLoadingStep(stepId);
    const res = await skipProductionStep(stepId);
    setLoadingStep(null);
    if (res.success) {
      router.refresh();
    } else {
      alert(res.error);
    }
  };

  const isJobActive = !['CANCELLED', 'COMPLETED'].includes(jobStatus);

  return (
    <div className="space-y-4">
      {steps.map((step, idx) => {
        const isFirst = idx === 0;
        const prevStep = isFirst ? null : steps[idx - 1];
        const canStart = canUpdate && isJobActive && step.status === 'PENDING' && (!prevStep || prevStep.status === 'DONE' || prevStep.status === 'SKIPPED');
        const canComplete = canUpdate && isJobActive && (step.status === 'IN_PROGRESS' || step.status === 'REWORK');
        
        return (
          <div key={step.id} className={`p-4 border rounded-lg flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between ${STEP_STATUS_COLORS[step.status]}`}>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{step.stepName}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full bg-white/60 border`}>
                  {STATUS_LABELS[step.status]}
                </span>
              </div>
              <div className="text-xs opacity-80 flex flex-wrap gap-x-4 gap-y-1">
                {step.assignedTo && <span>Phụ trách: {step.assignedTo.name}</span>}
                {step.issueNote && <span className="text-red-600 font-medium">Lỗi: {step.issueNote}</span>}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {loadingStep === step.id && <Loader2 className="w-5 h-5 animate-spin" />}
              
              {canStart && (
                <>
                  <button onClick={() => handleStart(step.id)} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors shadow-sm">
                    <Play className="w-3 h-3" /> Bắt đầu
                  </button>
                  <button onClick={() => handleSkip(step.id)} className="flex items-center gap-1 px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs rounded transition-colors">
                    <FastForward className="w-3 h-3" /> Bỏ qua
                  </button>
                </>
              )}

              {canComplete && (
                <>
                  <button onClick={() => handleComplete(step.id)} className="flex items-center gap-1 px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors shadow-sm">
                    <Check className="w-4 h-4" /> Hoàn thành
                  </button>
                  <button onClick={() => setReportIssueStepId(step.id)} className="flex items-center gap-1 px-3 py-1.5 bg-red-100 hover:bg-red-200 text-red-700 text-xs rounded transition-colors">
                    <AlertTriangle className="w-3 h-3" /> Báo lỗi
                  </button>
                </>
              )}
            </div>
          </div>
        );
      })}

      {reportIssueStepId && (
        <ReportIssueModal stepId={reportIssueStepId} onClose={() => setReportIssueStepId(null)} />
      )}
    </div>
  );
}
