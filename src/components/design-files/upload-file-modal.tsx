'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createDesignFile } from '@/lib/design-file-actions';

export default function UploadFileModal({ orderId, onClose }: { orderId: string, onClose: () => void }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    fileName: '',
    fileUrl: '',
    fileType: 'PDF',
    filePurpose: 'CUSTOMER_ORIGINAL',
    note: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const res = await createDesignFile({
      orderId,
      ...formData
    });

    if (res.success) {
      alert('Tạo thông tin file thành công!');
      router.refresh();
      onClose();
    } else {
      alert(res.error || 'Có lỗi xảy ra');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-slate-800 rounded-xl shadow-xl max-w-md w-full p-6">
        <h2 className="text-xl font-bold mb-4">Upload File Thiết Kế</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          
          <div>
            <label className="block text-sm font-medium mb-1">Tên file</label>
            <input 
              required
              type="text" 
              className="w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900" 
              value={formData.fileName}
              onChange={e => setFormData({...formData, fileName: e.target.value})}
              placeholder="VD: Logo-Final.pdf"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Link file (URL)</label>
            <input 
              required
              type="text" 
              className="w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900" 
              value={formData.fileUrl}
              onChange={e => setFormData({...formData, fileUrl: e.target.value})}
              placeholder="https://drive.google.com/..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1">Loại file</label>
              <select 
                className="w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900"
                value={formData.fileType}
                onChange={e => setFormData({...formData, fileType: e.target.value})}
              >
                <option value="PDF">PDF</option>
                <option value="AI">Illustrator (AI)</option>
                <option value="PSD">Photoshop (PSD)</option>
                <option value="CDR">CorelDraw (CDR)</option>
                <option value="PNG">PNG</option>
                <option value="JPG">JPG</option>
                <option value="ZIP">File Nén (ZIP/RAR)</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Mục đích</label>
              <select 
                className="w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900"
                value={formData.filePurpose}
                onChange={e => setFormData({...formData, filePurpose: e.target.value})}
              >
                <option value="CUSTOMER_ORIGINAL">File khách gửi gốc</option>
                <option value="DESIGN_WORKING">File đang thiết kế</option>
                <option value="CUSTOMER_PREVIEW">File duyệt mẫu</option>
                <option value="PRINT_READY">File in cuối cùng</option>
                <option value="OTHER">Khác</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Ghi chú (Tùy chọn)</label>
            <textarea 
              className="w-full border rounded px-3 py-2 bg-slate-50 dark:bg-slate-900" 
              rows={2}
              value={formData.note}
              onChange={e => setFormData({...formData, note: e.target.value})}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              onClick={onClose}
              className="px-4 py-2 border rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              Hủy
            </button>
            <button 
              type="submit" 
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50"
            >
              {loading ? 'Đang xử lý...' : 'Upload File'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
