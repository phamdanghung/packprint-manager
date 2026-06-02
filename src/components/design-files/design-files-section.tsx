'use client';

import React, { useState, useEffect } from 'react';
import { getDesignFilesByOrder, updateDesignFileStatus, markCustomerApproved, lockDesignFileForProduction, sendFileToProduction } from '@/lib/design-file-actions';
import UploadFileModal from './upload-file-modal';
import { formatDate } from '@/lib/utils';
import { FileDown, FileCheck, Lock, UploadCloud, CheckCircle, RefreshCw } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  RECEIVED: 'Đã nhận file',
  CHECKING: 'Đang kiểm tra',
  NEEDS_FIX: 'Cần chỉnh sửa',
  DESIGNING: 'Đang thiết kế',
  READY_FOR_CUSTOMER_APPROVAL: 'Chờ khách duyệt',
  CUSTOMER_APPROVED: 'Khách đã duyệt',
  CUSTOMER_REJECTED: 'Khách từ chối',
  LOCKED_FOR_PRODUCTION: 'Đã khóa',
  SENT_TO_PRODUCTION: 'Đã chuyển SX',
  CANCELLED: 'Đã hủy'
};

const PURPOSE_LABELS: Record<string, string> = {
  CUSTOMER_ORIGINAL: 'File khách gửi',
  DESIGN_WORKING: 'File đang thiết kế',
  CUSTOMER_PREVIEW: 'Bản gửi duyệt',
  PRINT_READY: 'Bản in cuối',
  OTHER: 'Khác'
};

const VALID_TRANSITIONS: Record<string, string[]> = {
  RECEIVED: ['CHECKING'],
  CHECKING: ['NEEDS_FIX', 'READY_FOR_CUSTOMER_APPROVAL'],
  NEEDS_FIX: ['DESIGNING'],
  DESIGNING: ['READY_FOR_CUSTOMER_APPROVAL'],
  READY_FOR_CUSTOMER_APPROVAL: ['CUSTOMER_APPROVED', 'CUSTOMER_REJECTED'],
  CUSTOMER_REJECTED: ['DESIGNING'],
  CUSTOMER_APPROVED: [],
  LOCKED_FOR_PRODUCTION: [],
  SENT_TO_PRODUCTION: [],
  CANCELLED: []
};

import FileHistoryLog from './file-history-log';
import { getDesigners, assignDesigner } from '@/lib/design-file-actions';

export default function DesignFilesSection({ orderId, currentUserRole }: { orderId: string, currentUserRole: string }) {
  const [files, setFiles] = useState<any[]>([]);
  const [designers, setDesigners] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUploadModal, setShowUploadModal] = useState(false);

  const fetchFiles = async () => {
    setLoading(true);
    const res = await getDesignFilesByOrder(orderId);
    if (res.success) {
      setFiles(res.data || []);
    }
    
    if (['ADMIN', 'MANAGER', 'SALES'].includes(currentUserRole)) {
      const dRes = await getDesigners();
      if (dRes.success) setDesigners(dRes.data || []);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchFiles();
  }, [orderId]);

  const handleStatusChange = async (fileId: string, newStatus: string) => {
    if (!newStatus) return;
    if (newStatus === 'CUSTOMER_APPROVED') {
      const res = await markCustomerApproved(fileId);
      if (res.success) fetchFiles();
      else alert(res.error);
      return;
    }
    const res = await updateDesignFileStatus(fileId, newStatus);
    if (res.success) fetchFiles();
    else alert(res.error);
  };

  const handleAssignDesigner = async (fileId: string, designerId: string) => {
    if (!designerId) return;
    const res = await assignDesigner(fileId, designerId);
    if (res.success) fetchFiles();
    else alert(res.error);
  };

  const handleLock = async (fileId: string) => {
    if (!confirm('Khóa file này sẽ đánh dấu nó là bản Final và chốt không cho sửa đổi. Bạn chắc chắn chứ?')) return;
    const res = await lockDesignFileForProduction(fileId);
    if (res.success) fetchFiles();
    else alert(res.error);
  };

  const handleSendToProduction = async (fileId: string) => {
    const res = await sendFileToProduction(fileId);
    if (res.success) {
      alert('Đã chuyển sản xuất thành công!');
      fetchFiles();
    } else alert(res.error);
  };

  return (
    <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mt-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-xl font-bold">File Thiết Kế & In Ấn</h2>
          <p className="text-sm text-slate-500">Quản lý các phiên bản file, duyệt file và chốt file sản xuất</p>
        </div>
        <div className="flex gap-3">
          <button onClick={fetchFiles} className="p-2 border rounded hover:bg-slate-50 dark:hover:bg-slate-700">
            <RefreshCw className="h-5 w-5 text-slate-500" />
          </button>
          {['ADMIN', 'MANAGER', 'SALES', 'DESIGNER'].includes(currentUserRole) && (
            <button 
              onClick={() => setShowUploadModal(true)}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded-lg"
            >
              <UploadCloud className="h-5 w-5" />
              Upload File
            </button>
          )}
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8 text-slate-500">Đang tải danh sách file...</div>
      ) : files.length === 0 ? (
        <div className="text-center py-8 text-slate-500 bg-slate-50 dark:bg-slate-900 rounded-lg">Chưa có file nào được upload</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900">
              <tr>
                <th className="p-3 font-bold rounded-tl-lg">File</th>
                <th className="p-3 font-bold">Mục đích</th>
                <th className="p-3 font-bold">Trạng thái</th>
                <th className="p-3 font-bold">Cập nhật lúc</th>
                <th className="p-3 font-bold rounded-tr-lg">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {files.map(file => (
                <tr key={file.id} className={file.isFinal ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}>
                  <td className="p-3">
                    <div className="font-bold text-blue-600 dark:text-blue-400 flex items-center gap-2">
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="hover:underline flex items-center gap-1">
                        <FileDown className="h-4 w-4" />
                        {file.fileName}
                      </a>
                      {file.isLocked && <Lock className="h-3.5 w-3.5 text-slate-400" />}
                    </div>
                    <div className="text-xs text-slate-500 mt-1">Mã: {file.fileCode} | Up bởi: {file.uploadedBy.name}</div>
                  </td>
                  <td className="p-3">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium">
                      {PURPOSE_LABELS[file.filePurpose] || file.filePurpose}
                    </span>
                    <div className="mt-2 text-xs">
                      {file.assignedDesigner ? (
                        <span className="text-slate-600">Phụ trách: <strong>{file.assignedDesigner.name}</strong></span>
                      ) : (
                        ['ADMIN', 'MANAGER', 'SALES'].includes(currentUserRole) && (
                          <select 
                            className="border rounded p-1 text-xs"
                            onChange={e => handleAssignDesigner(file.id, e.target.value)}
                            defaultValue=""
                          >
                            <option value="" disabled>Gán designer</option>
                            {designers.map(d => (
                              <option key={d.id} value={d.id}>{d.name}</option>
                            ))}
                          </select>
                        )
                      )}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      file.status === 'LOCKED_FOR_PRODUCTION' || file.status === 'SENT_TO_PRODUCTION' ? 'bg-emerald-100 text-emerald-700' :
                      file.status === 'CUSTOMER_APPROVED' ? 'bg-blue-100 text-blue-700' :
                      file.status === 'CUSTOMER_REJECTED' ? 'bg-rose-100 text-rose-700' :
                      'bg-orange-100 text-orange-700'
                    }`}>
                      {STATUS_LABELS[file.status] || file.status}
                    </span>
                    {file.isFinal && <span className="ml-2 bg-purple-100 text-purple-700 px-2 py-1 rounded text-xs font-bold uppercase">Bản Final</span>}
                  </td>
                  <td className="p-3">
                    <div className="text-xs">{formatDate(file.updatedAt)}</div>
                  </td>
                  <td className="p-3">
                    <div className="flex gap-2 items-center flex-wrap">
                      {!file.isLocked && ['ADMIN', 'MANAGER', 'SALES', 'DESIGNER'].includes(currentUserRole) && VALID_TRANSITIONS[file.status]?.length > 0 && (
                        <select 
                          className="text-xs border rounded p-1 bg-white dark:bg-slate-900"
                          value={file.status}
                          onChange={e => handleStatusChange(file.id, e.target.value)}
                        >
                          <option value={file.status}>{STATUS_LABELS[file.status]}</option>
                          {VALID_TRANSITIONS[file.status].map((k) => (
                            <option key={k} value={k}>{STATUS_LABELS[k]}</option>
                          ))}
                        </select>
                      )}
                      
                      {!file.isLocked && file.status === 'CUSTOMER_APPROVED' && ['ADMIN', 'MANAGER', 'SALES'].includes(currentUserRole) && (
                        <button onClick={() => handleLock(file.id)} className="text-xs flex items-center gap-1 bg-amber-100 hover:bg-amber-200 text-amber-800 px-2 py-1 rounded font-bold">
                          <Lock className="h-3 w-3" /> Khóa Final
                        </button>
                      )}

                      {file.status === 'LOCKED_FOR_PRODUCTION' && ['ADMIN', 'MANAGER', 'SALES'].includes(currentUserRole) && (
                        <button onClick={() => handleSendToProduction(file.id)} className="text-xs flex items-center gap-1 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 px-2 py-1 rounded font-bold">
                          <CheckCircle className="h-3 w-3" /> Gửi Sản Xuất
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showUploadModal && (
        <UploadFileModal 
          orderId={orderId} 
          onClose={() => {
            setShowUploadModal(false);
            fetchFiles();
          }} 
        />
      )}

      {/* Lịch sử xử lý file */}
      <FileHistoryLog files={files} />
    </div>
  );
}
