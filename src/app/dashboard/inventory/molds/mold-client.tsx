'use client';

import React, { useState } from 'react';
import { Package, Plus, Search, RefreshCw, LogOut, LogIn, AlertCircle } from 'lucide-react';
import { createMold, reserveMold, checkoutMold, returnMold } from '@/lib/mold-actions';
import { useRouter } from 'next/navigation';

export default function MoldClient({ initialMolds, userRole }: any) {
  const [molds, setMolds] = useState(initialMolds);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [activeMold, setActiveMold] = useState<any>(null);
  const [modalType, setModalType] = useState('');
  const router = useRouter();

  const canModify = ['ADMIN', 'MANAGER'].includes(userRole);
  const canViewCost = ['ADMIN', 'ACCOUNTANT', 'MANAGER'].includes(userRole);

  const handleAction = (mold: any, type: string) => {
    setActiveMold(mold);
    setModalType(type);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Quản lý Khuôn Bế</h1>
          <p className="text-sm text-slate-500">Theo dõi trạng thái, mượn trả và chi phí khuôn</p>
        </div>
        {canModify && (
          <button 
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            <Plus className="h-4 w-4" />
            Thêm Khuôn
          </button>
        )}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã Khuôn</th>
                <th className="px-4 py-3 font-semibold">Tên Khuôn</th>
                <th className="px-4 py-3 font-semibold">Hình Dáng / Kích Thước</th>
                <th className="px-4 py-3 font-semibold">Khách Hàng / Sở Hữu</th>
                <th className="px-4 py-3 font-semibold text-center">Lượt dùng</th>
                {canViewCost && <th className="px-4 py-3 font-semibold text-right">Chi phí</th>}
                <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                <th className="px-4 py-3 font-semibold text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {molds.map((mold: any) => (
                <tr key={mold.id} className="hover:bg-slate-50">
                  <td className="px-4 py-3 font-medium text-slate-900">{mold.code}</td>
                  <td className="px-4 py-3 font-medium text-slate-900">{mold.name}</td>
                  <td className="px-4 py-3 text-slate-600">
                    {mold.shape} ({mold.widthCm}x{mold.heightCm}cm)
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {mold.ownerType === 'COMPANY' ? 'Công ty' : (mold.customer?.name || 'Khách')}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-slate-700">{mold.usageCount}</td>
                  {canViewCost && (
                    <td className="px-4 py-3 text-right text-slate-600">
                      {mold.createdCost?.toLocaleString('vi-VN')} đ
                    </td>
                  )}
                  <td className="px-4 py-3 text-center">
                    <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${
                      mold.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-700' :
                      mold.status === 'IN_USE' ? 'bg-indigo-100 text-indigo-700' :
                      mold.status === 'RESERVED' ? 'bg-amber-100 text-amber-700' :
                      'bg-rose-100 text-rose-700'
                    }`}>
                      {mold.status}
                    </span>
                    {mold.status === 'IN_USE' && mold.usages?.[0] && (
                      <div className="text-[10px] text-slate-500 mt-1">Đang mượn bởi: {mold.usages[0].checkedOutBy?.name}</div>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    {mold.status === 'AVAILABLE' && (
                      <button onClick={() => handleAction(mold, 'RESERVE')} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Reserve">
                        <AlertCircle className="h-4 w-4" />
                      </button>
                    )}
                    {(mold.status === 'AVAILABLE' || mold.status === 'RESERVED') && (
                      <button onClick={() => handleAction(mold, 'CHECKOUT')} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Checkout (Mượn)">
                        <LogOut className="h-4 w-4" />
                      </button>
                    )}
                    {mold.status === 'IN_USE' && (
                      <button onClick={() => handleAction(mold, 'RETURN')} className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded" title="Return (Trả)">
                        <LogIn className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showCreateModal && <CreateMoldModal onClose={() => setShowCreateModal(false)} />}
      {modalType && activeMold && (
        <ActionModal 
          type={modalType} 
          mold={activeMold} 
          onClose={() => { setModalType(''); setActiveMold(null); }} 
        />
      )}
    </div>
  );
}

function CreateMoldModal({ onClose }: any) {
  const router = useRouter();
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    await createMold({
      code: formData.get('code'),
      name: formData.get('name'),
      shape: formData.get('shape'),
      widthCm: Number(formData.get('widthCm')),
      heightCm: Number(formData.get('heightCm')),
      ownerType: formData.get('ownerType'),
      createdCost: Number(formData.get('createdCost')) || undefined,
    });
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-4 space-y-4">
        <h3 className="font-bold text-lg border-b pb-2">Thêm Khuôn Bế</h3>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input name="code" placeholder="Mã khuôn (VD: KB001)" required className="w-full p-2 border rounded text-sm" />
          <input name="name" placeholder="Tên khuôn" required className="w-full p-2 border rounded text-sm" />
          <select name="shape" required className="w-full p-2 border rounded text-sm">
            <option value="RECTANGLE">Chữ nhật</option>
            <option value="ROUND">Tròn</option>
            <option value="CUSTOM">Khác</option>
          </select>
          <div className="flex gap-2">
            <input name="widthCm" type="number" placeholder="Rộng (cm)" required className="w-1/2 p-2 border rounded text-sm" />
            <input name="heightCm" type="number" placeholder="Dài (cm)" required className="w-1/2 p-2 border rounded text-sm" />
          </div>
          <select name="ownerType" required className="w-full p-2 border rounded text-sm">
            <option value="COMPANY">Của công ty</option>
            <option value="CUSTOMER">Của khách</option>
          </select>
          <input name="createdCost" type="number" placeholder="Chi phí tạo (VNĐ)" className="w-full p-2 border rounded text-sm" />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Lưu</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ActionModal({ type, mold, onClose }: any) {
  const router = useRouter();
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (type === 'RESERVE') await reserveMold(mold.id);
    if (type === 'CHECKOUT') await checkoutMold(mold.id);
    if (type === 'RETURN') {
      const formData = new FormData(e.target);
      await returnMold(mold.id, formData.get('statusAfterReturn') as string, formData.get('note') as string);
    }
    router.refresh();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-4 space-y-4">
        <h3 className="font-bold text-lg border-b pb-2">
          {type === 'RESERVE' ? 'Giữ Khuôn' : type === 'CHECKOUT' ? 'Mượn Khuôn' : 'Trả Khuôn'}
        </h3>
        <div className="text-sm">Khuôn: {mold.name} ({mold.code})</div>
        <form onSubmit={handleSubmit} className="space-y-3">
          {type === 'RETURN' && (
            <>
              <select name="statusAfterReturn" className="w-full p-2 border rounded text-sm">
                <option value="AVAILABLE">Tốt (Sẵn sàng)</option>
                <option value="DAMAGED">Hư hỏng</option>
                <option value="LOST">Mất</option>
              </select>
              <input name="note" placeholder="Ghi chú thêm" className="w-full p-2 border rounded text-sm" />
            </>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded text-sm">Hủy</button>
            <button type="submit" className="px-4 py-2 bg-indigo-600 text-white rounded text-sm">Xác nhận</button>
          </div>
        </form>
      </div>
    </div>
  );
}
