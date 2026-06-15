'use client';

import React, { useState, useEffect } from 'react';
import { createWarehouseZone, updateWarehouseZone, deleteWarehouseZone, seedDefaultWarehouseZones, backfillInventoryWarehouseZones } from '@/lib/warehouse-zone-actions';
import { Plus, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';

export default function WarehouseZoneClient({ initialZones, isAdminOrManager }: { initialZones: any[], isAdminOrManager: boolean }) {
  const [zones, setZones] = useState(initialZones);
  const [showModal, setShowModal] = useState(false);
  const [editingZone, setEditingZone] = useState<any>(null);
  const [isManualCode, setIsManualCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const getDefaultSortOrder = (type: string) => {
    switch (type) {
      case 'PAPER': return 10;
      case 'DECAL': return 20;
      case 'LAMINATION': return 30;
      case 'INK': return 40;
      case 'SUPPLY': return 50;
      default: return 90;
    }
  };

  const generateZoneCode = (type: string, name: string) => {
    let slug = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
    slug = slug.replace(/[^A-Z0-9-]/g, ' ').trim().replace(/\s+/g, '-').replace(/-+/g, '-');
    
    let prefix = 'KHO-';
    if (type === 'PAPER') prefix = 'KHO-GIAY';
    else if (type === 'DECAL') prefix = 'KHO-DECAL';
    else if (type === 'LAMINATION') prefix = 'KHO-MANG';
    else if (type === 'INK') prefix = 'KHO-MUC';
    else if (type === 'FINISHED_GOODS') prefix = 'KHO-THANH-PHAM';

    if (!slug) return prefix;
    if (slug.startsWith(prefix)) return slug;
    
    if (slug.startsWith('KHO-')) {
      slug = slug.substring(4);
      if (slug.startsWith('-')) slug = slug.substring(1);
    }

    const prefixNoKho = prefix.replace('KHO-', '');
    if (slug.startsWith(prefixNoKho)) {
      slug = slug.substring(prefixNoKho.length);
      if (slug.startsWith('-')) slug = slug.substring(1);
    }

    return slug ? `${prefix}-${slug}` : prefix;
  };

  const handleOpenModal = (zone: any = null) => {
    setEditingZone(zone || {
      code: '', name: '', type: 'PAPER', description: '', isActive: true, sortOrder: 10
    });
    setIsManualCode(false);
    setShowModal(true);
  };

  useEffect(() => {
    if (editingZone && !editingZone.id && !isManualCode) {
      setEditingZone((prev: any) => ({
        ...prev,
        code: generateZoneCode(prev.type, prev.name)
      }));
    }
  }, [editingZone?.name, editingZone?.type, isManualCode]);

  const handleSave = async () => {
    if (!editingZone.code || !editingZone.name || !editingZone.type) {
      toast.error('Vui lòng nhập đủ các trường bắt buộc (Mã, Tên, Loại)');
      return;
    }
    setIsLoading(true);
    try {
      if (editingZone.id) {
        // Edit
        const res = await updateWarehouseZone(editingZone.id, editingZone);
        if (res.success) {
          toast.success('Cập nhật khu kho thành công');
          setZones(zones.map(z => z.id === editingZone.id ? { ...z, ...editingZone } : z));
          setShowModal(false);
        } else {
          toast.error(res.error || 'Lỗi cập nhật');
        }
      } else {
        // Create
        const res = await createWarehouseZone(editingZone);
        if (res.success) {
          toast.success('Tạo khu kho thành công');
          setZones([...zones, res.data].sort((a: any, b: any) => a.sortOrder - b.sortOrder));
          setShowModal(false);
        } else {
          toast.error(res.error || 'Lỗi tạo mới');
        }
      }
    } finally {
      setIsLoading(false);
      router.refresh();
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Bạn có chắc chắn muốn xóa/ngưng sử dụng khu kho này?')) return;
    try {
      const res = await deleteWarehouseZone(id);
      if (res.success) {
        if (res.status === 'DEACTIVATED_INSTEAD') {
          toast.success(res.message);
          setZones(zones.map(z => z.id === id ? { ...z, isActive: false } : z));
        } else {
          toast.success('Xóa thành công');
          setZones(zones.filter(z => z.id !== id));
        }
        router.refresh();
      } else {
        toast.error(res.error || 'Lỗi khi xóa');
      }
    } catch (e) {
      toast.error('Lỗi hệ thống');
    }
  };

  const handleSeedDefault = async () => {
    setIsLoading(true);
    try {
      const res = await seedDefaultWarehouseZones();
      if (res.success) {
        if (res.data?.createdCount && res.data.createdCount > 0) {
          toast.success(`Đã khởi tạo bổ sung ${res.data.createdCount} khu kho mặc định.`);
          router.refresh(); // Will refresh and load the new ones from page.tsx
        } else {
          toast.success('Các khu kho mặc định đã tồn tại đầy đủ.');
        }
      } else {
        toast.error(res.error || 'Lỗi khởi tạo');
      }
    } catch (e) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBackfill = async () => {
    setIsLoading(true);
    try {
      const res = await backfillInventoryWarehouseZones();
      if (res.success) {
        toast.success(
          `Đã phân khu: ${res.data?.assignedCount ?? 0} vật tư. ` +
          `Bỏ qua: ${res.data?.skippedCount ?? 0}. ` +
          `Vào Khác: ${res.data?.unknownCount ?? 0}.`
        );
      } else {
        toast.error(res.error || 'Lỗi phân bổ');
      }
    } catch (e) {
      toast.error('Lỗi hệ thống');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Cấu hình Khu Kho (Warehouse Zones)</h1>
        {isAdminOrManager && (
          <div className="flex space-x-2">
            <button
              onClick={handleBackfill}
              disabled={isLoading}
              className="flex items-center gap-2 bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50"
            >
              Phân khu vật tư chưa có kho
            </button>
            <button
              onClick={handleSeedDefault}
              disabled={isLoading}
              className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              Khởi tạo khu kho mặc định
            </button>
            <button
              onClick={() => handleOpenModal()}
              disabled={isLoading}
              className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 disabled:opacity-50"
            >
              <Plus className="w-4 h-4" /> Thêm Khu Kho
            </button>
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 font-semibold text-gray-600">Thứ tự</th>
              <th className="p-4 font-semibold text-gray-600">Mã kho</th>
              <th className="p-4 font-semibold text-gray-600">Tên kho</th>
              <th className="p-4 font-semibold text-gray-600">Loại</th>
              <th className="p-4 font-semibold text-gray-600">Trạng thái</th>
              <th className="p-4 font-semibold text-gray-600">Mô tả</th>
              {isAdminOrManager && <th className="p-4 font-semibold text-gray-600 text-right">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {zones.map((zone, idx) => (
              <tr key={zone.id || idx} className="border-b hover:bg-gray-50">
                <td className="p-4">{zone.sortOrder}</td>
                <td className="p-4 font-mono text-sm">{zone.code}</td>
                <td className="p-4 font-medium">{zone.name} {zone.isDefault && <span className="text-xs bg-gray-200 px-2 py-0.5 rounded text-gray-600 ml-2">Default</span>}</td>
                <td className="p-4">{zone.type}</td>
                <td className="p-4">
                  <span className={`px-2 py-1 text-xs rounded-full ${zone.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {zone.isActive ? 'Đang dùng' : 'Ngưng SD'}
                  </span>
                </td>
                <td className="p-4 text-gray-600 text-sm">{zone.description || '-'}</td>
                {isAdminOrManager && (
                  <td className="p-4 text-right">
                    <button onClick={() => handleOpenModal(zone)} className="text-blue-600 hover:text-blue-800 p-1 mx-1">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    {!zone.isDefault && (
                      <button onClick={() => handleDelete(zone.id)} className="text-red-600 hover:text-red-800 p-1 mx-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                )}
              </tr>
            ))}
            {zones.length === 0 && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-gray-500">
                  <p className="mb-4">Chưa có khu kho nào. Vui lòng bấm Khởi tạo khu kho mặc định để bắt đầu.</p>
                  {isAdminOrManager && (
                    <button
                      onClick={handleSeedDefault}
                      disabled={isLoading}
                      className="inline-flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      Khởi tạo khu kho mặc định
                    </button>
                  )}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg w-full max-w-lg p-6 shadow-xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold">{editingZone.id ? 'Sửa Khu Kho' : 'Tạo Khu Kho Mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-500 hover:text-gray-800"><X className="w-5 h-5"/></button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Loại *</label>
                <select 
                  value={editingZone.type}
                  onChange={e => {
                    const newType = e.target.value;
                    setEditingZone({
                      ...editingZone, 
                      type: newType,
                      sortOrder: !editingZone.id ? getDefaultSortOrder(newType) : editingZone.sortOrder
                    });
                  }}
                  disabled={!!editingZone.id && editingZone.isDefault}
                  className="w-full p-2 border rounded disabled:bg-gray-100"
                >
                  <option value="PAPER">Giấy (PAPER)</option>
                  <option value="DECAL">Decal (DECAL)</option>
                  <option value="LAMINATION">Màng (LAMINATION)</option>
                  <option value="INK">Mực (INK)</option>
                  <option value="SUPPLY">Phụ liệu (SUPPLY)</option>
                  <option value="FINISHED_GOODS">Thành phẩm (FINISHED_GOODS)</option>
                  <option value="CUSTOMER_GOODS">Khách gửi (CUSTOMER_GOODS)</option>
                  <option value="WASTE">Phế liệu (WASTE)</option>
                  <option value="OTHER">Khác (OTHER)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tên khu kho *</label>
                <input 
                  type="text" 
                  value={editingZone.name} 
                  onChange={e => setEditingZone({...editingZone, name: e.target.value})}
                  className="w-full p-2 border rounded"
                  placeholder="VD: Kho giấy 79x109"
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="block text-sm font-medium">Mã khu kho {editingZone.id ? '*' : 'tự sinh *'}</label>
                  {!editingZone.id && isAdminOrManager && !isManualCode && (
                    <button type="button" onClick={() => setIsManualCode(true)} className="text-xs text-blue-600 hover:underline">
                      Sửa mã thủ công
                    </button>
                  )}
                </div>
                <input 
                  type="text" 
                  value={editingZone.code} 
                  onChange={e => setEditingZone({...editingZone, code: e.target.value.toUpperCase()})}
                  disabled={!!editingZone.id || !isManualCode} 
                  className="w-full p-2 border rounded uppercase disabled:bg-gray-100 disabled:text-gray-500"
                  placeholder="VD: KHO-GIAY-79X109"
                />
                {editingZone.id && <p className="text-xs text-gray-500 mt-1">Không thể sửa mã khu kho đã tạo.</p>}
              </div>

              <div className="flex space-x-4">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">Thứ tự hiển thị (Sort Order)</label>
                  <input 
                    type="number" 
                    value={editingZone.sortOrder} 
                    onChange={e => setEditingZone({...editingZone, sortOrder: parseInt(e.target.value) || 0})}
                    className="w-full p-2 border rounded"
                  />
                </div>
                <div className="flex-1 flex items-center pt-6">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input 
                      type="checkbox" 
                      checked={editingZone.isActive} 
                      onChange={e => setEditingZone({...editingZone, isActive: e.target.checked})}
                      className="w-4 h-4 text-indigo-600 rounded"
                    />
                    <span className="text-sm font-medium">Đang hoạt động (Active)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Mô tả</label>
                <textarea 
                  value={editingZone.description || ''} 
                  onChange={e => setEditingZone({...editingZone, description: e.target.value})}
                  className="w-full p-2 border rounded"
                  rows={2}
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button onClick={() => setShowModal(false)} className="px-4 py-2 border rounded hover:bg-gray-50">Hủy</button>
              <button 
                onClick={handleSave} 
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" /> <span>{isLoading ? 'Đang lưu...' : 'Lưu Khu Kho'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
