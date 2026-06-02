'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { reportProductionIssue } from '@/lib/production-actions';
import { X, Loader2 } from 'lucide-react';

const ISSUE_TYPES = [
  { value: 'FILE_ERROR', label: 'Lỗi file thiết kế' },
  { value: 'PRINT_ERROR', label: 'Lỗi in ấn (màu, lem...)' },
  { value: 'MATERIAL_ERROR', label: 'Lỗi vật tư (decal hỏng...)' },
  { value: 'MACHINE_ERROR', label: 'Lỗi máy móc' },
  { value: 'LAMINATION_ERROR', label: 'Lỗi cán màng' },
  { value: 'DIE_CUT_ERROR', label: 'Lỗi bế (lệch, đứt...)' },
  { value: 'COLOR_ERROR', label: 'Sai màu' },
  { value: 'QUANTITY_ERROR', label: 'Thiếu số lượng' },
  { value: 'OTHER', label: 'Khác' }
];

const SEVERITIES = [
  { value: 'LOW', label: 'Thấp (Vẫn tiếp tục được)' },
  { value: 'MEDIUM', label: 'Trung bình' },
  { value: 'HIGH', label: 'Cao (Cần làm lại)' },
  { value: 'CRITICAL', label: 'Nghiêm trọng (Dừng máy)' }
];

export default function ReportIssueModal({ stepId, onClose }: { stepId: string, onClose: () => void }) {
  const router = useRouter();
  const [issueType, setIssueType] = useState('OTHER');
  const [severity, setSeverity] = useState('MEDIUM');
  const [note, setNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!note.trim()) {
      setError('Vui lòng nhập ghi chú chi tiết lỗi');
      return;
    }
    
    setLoading(true);
    setError('');
    const res = await reportProductionIssue(stepId, issueType, severity, note);
    setLoading(false);
    
    if (res.success) {
      router.refresh();
      onClose();
    } else {
      setError(res.error || 'Có lỗi xảy ra');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b dark:border-slate-700">
          <h3 className="font-bold text-lg text-red-600">Báo cáo Lỗi Sản Xuất</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded-full transition-colors">
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">{error}</div>}
          
          <div>
            <label className="block text-sm font-medium mb-1">Loại lỗi</label>
            <select
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
              className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-900"
            >
              {ISSUE_TYPES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-1">Mức độ nghiêm trọng</label>
            <select
              value={severity}
              onChange={(e) => setSeverity(e.target.value)}
              className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-900"
            >
              {SEVERITIES.map(t => (
                <option key={t.value} value={t.value}>{t.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Chi tiết lỗi (Bắt buộc)</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="w-full border p-2 rounded-lg bg-slate-50 dark:bg-slate-900 min-h-[100px]"
              placeholder="Mô tả cụ thể tình trạng lỗi..."
              required
            ></textarea>
          </div>
          
          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              disabled={loading}
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center justify-center min-w-[100px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Báo cáo lỗi'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
