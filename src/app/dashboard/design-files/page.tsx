import React from 'react';
import { getDesignFiles, getDesigners } from '@/lib/design-file-actions';
import AssignDesignerDropdown from '@/components/design-files/assign-designer-dropdown';
import { formatDate } from '@/lib/utils';
import Link from 'next/link';
import { FileDown, Lock, CheckCircle } from 'lucide-react';
import Unauthorized from '@/components/unauthorized';
import { getCurrentUser } from '@/lib/auth';

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

export default async function DesignFilesPage() {
  const user = await getCurrentUser();
  if (!user || ['ACCOUNTANT', 'DELIVERY'].includes(user.role)) return <Unauthorized />;

  const res = await getDesignFiles();
  const files = (res.success && res.data) ? res.data : [];
  
  let designers: any[] = [];
  if (['ADMIN', 'MANAGER', 'SALES'].includes(user.role)) {
    const dRes = await getDesigners();
    if (dRes.success && dRes.data) designers = dRes.data;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white">Quản lý File Thiết Kế</h1>
          <p className="text-sm text-slate-500 mt-1">Danh sách toàn bộ các file thiết kế trong hệ thống</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-100 dark:bg-slate-900">
              <tr>
                <th className="p-3 font-bold rounded-tl-lg">Mã file</th>
                <th className="p-3 font-bold">Mã Đơn hàng</th>
                <th className="p-3 font-bold">Khách hàng</th>
                <th className="p-3 font-bold">Mục đích</th>
                <th className="p-3 font-bold">Trạng thái</th>
                <th className="p-3 font-bold">Designer phụ trách</th>
                <th className="p-3 font-bold">Ngày cập nhật</th>
                <th className="p-3 font-bold rounded-tr-lg">Link</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {files.map((file: any) => (
                <tr key={file.id} className={file.isFinal ? 'bg-blue-50/50 dark:bg-blue-900/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}>
                  <td className="p-3 font-bold text-slate-700 dark:text-slate-300">
                    {file.fileCode}
                  </td>
                  <td className="p-3">
                    <Link href={`/dashboard/orders/${file.orderId}`} className="text-blue-600 hover:underline font-bold">
                      {file.order?.orderCode}
                    </Link>
                  </td>
                  <td className="p-3 text-slate-600 dark:text-slate-400">
                    {file.order?.customer?.name}
                  </td>
                  <td className="p-3">
                    <span className="bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded text-xs font-medium border">
                      {PURPOSE_LABELS[file.filePurpose] || file.filePurpose}
                    </span>
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
                    {file.isFinal && <span className="ml-2 text-xs font-bold text-purple-600 uppercase">Final</span>}
                  </td>
                  <td className="p-3 text-slate-600">
                    {file.assignedDesigner ? (
                      file.assignedDesigner.name
                    ) : (
                      ['ADMIN', 'MANAGER', 'SALES'].includes(user.role) ? (
                        <AssignDesignerDropdown fileId={file.id} designers={designers} />
                      ) : (
                        <span className="text-slate-400 italic">Chưa gán</span>
                      )
                    )}
                  </td>
                  <td className="p-3 text-slate-500">
                    {formatDate(file.updatedAt)}
                  </td>
                  <td className="p-3">
                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-800 flex items-center gap-1">
                      <FileDown className="h-4 w-4" /> Tải về
                    </a>
                  </td>
                </tr>
              ))}
              {files.length === 0 && (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-slate-500">Không có file nào.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
