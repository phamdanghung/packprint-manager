'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, List, Clock, Plus, Search, Filter,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw, X
} from 'lucide-react';
import { 
  createInventoryItem, createInboundTransaction, createOutboundTransaction,
  createAdjustmentTransaction, getInventoryTransactions, getInventoryItems
} from '@/lib/inventory-actions';
import { 
  INVENTORY_CATEGORIES, INVENTORY_MATERIAL_TYPES, INVENTORY_UNITS,
  INVENTORY_TRANSACTION_TYPES
} from '@/lib/inventory-constants';

function formatIntegerBaseQuantity(num: number | string | undefined | null) {
  if (num === null || num === undefined) return '0';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '0';
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function InventoryClient({ initialData, initialItems, userRole }: any) {
  const [activeTab, setActiveTab] = useState('inventory');
  const [items, setItems] = useState(initialItems);
  const [kpis, setKpis] = useState(initialData.kpis);
  const [transactions, setTransactions] = useState<any[]>([]);
  
  // Modals
  const [showItemModal, setShowItemModal] = useState(false);
  const [showInboundModal, setShowInboundModal] = useState<any>(null);
  const [showOutboundModal, setShowOutboundModal] = useState<any>(null);
  const [showAdjModal, setShowAdjModal] = useState<any>(null);

  const canViewCost = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);
  const canModifyItem = ['ADMIN', 'MANAGER'].includes(userRole);

  const refreshItems = async () => {
    const updated = await getInventoryItems();
    setItems(updated);
  };

  const loadTransactions = async () => {
    const txs = await getInventoryTransactions();
    setTransactions(txs);
  };

  useEffect(() => {
    if (activeTab === 'transactions') {
      loadTransactions();
    }
  }, [activeTab]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kho vật tư</h1>
          <p className="text-sm text-slate-500">Quản lý tồn kho, nhập xuất vật tư và cảnh báo thiếu hàng</p>
        </div>
        {canModifyItem && (
          <button 
            onClick={() => setShowItemModal(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Thêm vật tư</span>
          </button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg"><Package className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tổng vật tư</p>
            <p className="text-2xl font-bold text-slate-900">{kpis.totalItems}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg"><AlertTriangle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Tồn kho thấp</p>
            <p className="text-2xl font-bold text-slate-900">{kpis.lowStockCount}</p>
          </div>
        </div>
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-lg"><AlertTriangle className="h-6 w-6" /></div>
          <div>
            <p className="text-sm font-medium text-slate-500">Hết hàng</p>
            <p className="text-2xl font-bold text-slate-900">{kpis.outOfStockCount}</p>
          </div>
        </div>
        {canViewCost && (
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-lg"><Package className="h-6 w-6" /></div>
            <div>
              <p className="text-sm font-medium text-slate-500">Giá trị tồn kho</p>
              <p className="text-2xl font-bold text-slate-900">{(kpis.totalValue || 0).toLocaleString('vi-VN')} đ</p>
            </div>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 overflow-x-auto">
        <button
          onClick={() => setActiveTab('inventory')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <List className="h-4 w-4" />
          Tồn kho (Vật tư)
        </button>
        <a
          href="/dashboard/inventory/conversions"
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap transition-colors"
        >
          <Package className="h-4 w-4" />
          Chuyển đổi (Cắt giấy)
        </a>
        <a
          href="/dashboard/inventory/molds"
          className="flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300 whitespace-nowrap transition-colors"
        >
          <Package className="h-4 w-4" />
          Khuôn Bế (Tooling)
        </a>
        <button
          onClick={() => setActiveTab('alerts')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'alerts' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <AlertTriangle className="h-4 w-4" />
          Cảnh báo tồn thấp {kpis.lowStockCount + kpis.outOfStockCount > 0 && `(${kpis.lowStockCount + kpis.outOfStockCount})`}
        </button>
        <button
          onClick={() => setActiveTab('transactions')}
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
        >
          <Clock className="h-4 w-4" />
          Lịch sử giao dịch
        </button>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {activeTab === 'inventory' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã VT</th>
                  <th className="px-4 py-3 font-semibold">Tên vật tư</th>
                  <th className="px-4 py-3 font-semibold">Nhóm</th>
                  <th className="px-4 py-3 font-semibold text-right">Có thể dùng (Base)</th>
                  <th className="px-4 py-3 font-semibold text-right">Thực tế / Đã giữ (Base)</th>
                  <th className="px-4 py-3 font-semibold text-center">Hiển thị</th>
                  {canViewCost && <th className="px-4 py-3 font-semibold text-right">Giá chuẩn</th>}
                  <th className="px-4 py-3 font-semibold text-center">Trạng thái</th>
                  <th className="px-4 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={canViewCost ? 9 : 8} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu</td>
                  </tr>
                ) : items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.itemCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{item.name}</div>
                      {item.materialType && <div className="text-xs text-slate-500">{INVENTORY_MATERIAL_TYPES[item.materialType as keyof typeof INVENTORY_MATERIAL_TYPES] || item.materialType}</div>}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                        {INVENTORY_CATEGORIES[item.category as keyof typeof INVENTORY_CATEGORIES] || item.category}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${item.availableStockBase <= 0 ? 'text-rose-600' : (item.availableStockBase <= item.minStockBase ? 'text-amber-600' : 'text-emerald-600')}`}>
                        {formatIntegerBaseQuantity(item.availableStockBase)} {item.stockBaseUnit}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-500">
                      {formatIntegerBaseQuantity(item.currentStockBase)} / <span className="text-amber-600">{formatIntegerBaseQuantity(item.reservedStockBase)}</span>
                    </td>
                    <td className="px-4 py-3 text-center text-slate-600">
                      {item.displayUnit ? `${formatIntegerBaseQuantity(item.availableStockBase / item.unitScale)} ${item.displayUnit}` : '-'}
                    </td>
                    {canViewCost && (
                      <td className="px-4 py-3 text-right text-slate-600">
                        {item.standardCost ? `${item.standardCost.toLocaleString('vi-VN')} đ` : '-'}
                      </td>
                    )}
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2 py-1 rounded text-[10px] font-bold ${item.status === 'ACTIVE' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'}`}>
                        {item.status === 'ACTIVE' ? 'Đang dùng' : 'Ngừng dùng'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      {userRole !== 'PRODUCTION' && (
                        <button onClick={() => setShowInboundModal(item)} className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded" title="Nhập kho">
                          <ArrowDownToLine className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => setShowOutboundModal(item)} className="p-1.5 text-rose-600 hover:bg-rose-50 rounded" title="Xuất kho">
                        <ArrowUpFromLine className="h-4 w-4" />
                      </button>
                      {canModifyItem && (
                        <button onClick={() => setShowAdjModal(item)} className="p-1.5 text-amber-600 hover:bg-amber-50 rounded" title="Điều chỉnh">
                          <RefreshCw className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'alerts' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Mã VT</th>
                  <th className="px-4 py-3 font-semibold">Tên vật tư</th>
                  <th className="px-4 py-3 font-semibold text-right">Có thể dùng</th>
                  <th className="px-4 py-3 font-semibold text-right">Tồn tối thiểu</th>
                  <th className="px-4 py-3 font-semibold text-center">Mức cảnh báo</th>
                  <th className="px-4 py-3 font-semibold text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.filter((i:any) => i.availableStockBase <= i.minStockBase).map((item: any) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 font-medium text-slate-900">{item.itemCode}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                    <td className="px-4 py-3 text-right font-bold text-rose-600">{formatIntegerBaseQuantity(item.availableStockBase)} {item.stockBaseUnit}</td>
                    <td className="px-4 py-3 text-right text-slate-500">{formatIntegerBaseQuantity(item.minStockBase)} {item.stockBaseUnit}</td>
                    <td className="px-4 py-3 text-center">
                      {item.availableStockBase <= 0 ? (
                        <span className="inline-block px-2 py-1 bg-rose-100 text-rose-700 rounded text-[10px] font-bold">HẾT HÀNG</span>
                      ) : (
                        <span className="inline-block px-2 py-1 bg-amber-100 text-amber-700 rounded text-[10px] font-bold">TỒN THẤP</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {userRole !== 'PRODUCTION' && (
                        <button onClick={() => setShowInboundModal(item)} className="text-xs bg-indigo-50 text-indigo-600 hover:bg-indigo-100 px-3 py-1.5 rounded font-medium">
                          Nhập kho ngay
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'transactions' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600">
                <tr>
                  <th className="px-4 py-3 font-semibold">Thời gian</th>
                  <th className="px-4 py-3 font-semibold">Mã GD</th>
                  <th className="px-4 py-3 font-semibold">Vật tư</th>
                  <th className="px-4 py-3 font-semibold">Loại</th>
                  <th className="px-4 py-3 font-semibold text-right">Số lượng</th>
                  <th className="px-4 py-3 font-semibold text-right">Tồn sau</th>
                  <th className="px-4 py-3 font-semibold">Tham chiếu</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Không có giao dịch</td>
                  </tr>
                ) : transactions.map((tx: any) => (
                  <tr key={tx.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                      {new Date(tx.createdAt).toLocaleString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{tx.transactionCode}</td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-slate-900">{tx.item?.name}</div>
                      <div className="text-xs text-slate-500">{tx.item?.itemCode}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="inline-block px-2 py-1 bg-slate-100 text-slate-700 rounded text-[10px] font-medium">
                        {INVENTORY_TRANSACTION_TYPES[tx.type as keyof typeof INVENTORY_TRANSACTION_TYPES] || tx.type}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className={`font-bold ${['INBOUND', 'ADJUSTMENT_INCREASE'].includes(tx.type) ? 'text-emerald-600' : 'text-rose-600'}`}>
                        {['INBOUND', 'ADJUSTMENT_INCREASE'].includes(tx.type) ? '+' : '-'}{formatIntegerBaseQuantity(tx.quantity)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right text-slate-600">
                      {formatIntegerBaseQuantity(tx.stockAfter)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-slate-600">{tx.reason || tx.note || '-'}</div>
                      {tx.productionJob && <div className="text-xs text-indigo-600">{tx.productionJob.jobCode}</div>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODALS */}
      {showItemModal && (
        <ItemModal 
          onClose={() => setShowItemModal(false)} 
          onSuccess={() => { setShowItemModal(false); refreshItems(); }} 
        />
      )}
      {showInboundModal && (
        <InboundModal 
          item={showInboundModal} 
          onClose={() => setShowInboundModal(null)} 
          onSuccess={() => { setShowInboundModal(null); refreshItems(); }} 
        />
      )}
      {showOutboundModal && (
        <OutboundModal 
          item={showOutboundModal} 
          onClose={() => setShowOutboundModal(null)} 
          onSuccess={() => { setShowOutboundModal(null); refreshItems(); }} 
        />
      )}
      {showAdjModal && (
        <AdjModal 
          item={showAdjModal} 
          onClose={() => setShowAdjModal(null)} 
          onSuccess={() => { setShowAdjModal(null); refreshItems(); }} 
        />
      )}
    </div>
  );
}

function ItemModal({ onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    try {
      await createInventoryItem({
        itemCode: formData.get('itemCode'),
        name: formData.get('name'),
        category: formData.get('category'),
        materialType: formData.get('materialType') || null,
        unit: formData.get('unit'),
        stockBaseUnit: formData.get('stockBaseUnit'),
        displayUnit: formData.get('displayUnit'),
        unitScale: Number(formData.get('unitScale')) || 1,
        minStockBase: Number(formData.get('minStockBase')),
        standardCost: Number(formData.get('standardCost')) || null,
        initialStockBase: Number(formData.get('initialStockBase')) || 0,
        location: formData.get('location') as string || null,
        supplierName: formData.get('supplierName') as string || null,
        status: 'ACTIVE'
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100">
          <h3 className="font-bold text-lg">Thêm vật tư mới</h3>
          <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded text-slate-500"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Mã vật tư *</label>
              <input name="itemCode" required className="w-full p-2 border rounded-lg text-sm" placeholder="VD: DC-001" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Tên vật tư *</label>
              <input name="name" required className="w-full p-2 border rounded-lg text-sm" placeholder="VD: Decal giấy 32x35" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Nhóm *</label>
              <select name="category" required className="w-full p-2 border rounded-lg text-sm">
                {Object.entries(INVENTORY_CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Loại vật liệu</label>
              <select name="materialType" className="w-full p-2 border rounded-lg text-sm">
                <option value="">- Chọn -</option>
                {Object.entries(INVENTORY_MATERIAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Đơn vị lưu trữ (Base) *</label>
              <select name="stockBaseUnit" required className="w-full p-2 border rounded-lg text-sm">
                <option value="SHEET">Tờ (Sheet)</option>
                <option value="MILLIMETER">Milimét (mm)</option>
                <option value="SQUARE_METER">Mét vuông (m²)</option>
                <option value="GRAM">Gram (g)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Đơn vị hiển thị (Display)</label>
              <select name="displayUnit" required className="w-full p-2 border rounded-lg text-sm">
                <option value="SHEET">Tờ (Sheet)</option>
                <option value="METER">Mét (m)</option>
                <option value="KG">Kilogram (kg)</option>
                <option value="ROLL">Cuộn (Roll)</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Tỷ lệ quy đổi (Scale) *</label>
              <input name="unitScale" type="number" defaultValue="1" min="1" required className="w-full p-2 border rounded-lg text-sm" placeholder="Ví dụ: 1000 nếu Base=mm, Display=m" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Tồn tối thiểu (Base Unit)</label>
              <input name="minStockBase" type="number" defaultValue="0" min="0" required className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Tồn đầu kỳ (Base Unit)</label>
              <input name="initialStockBase" type="number" defaultValue="0" min="0" className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Giá vốn chuẩn (VNĐ)</label>
              <input name="standardCost" type="number" min="0" step="1" className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Vị trí lưu kho</label>
              <input name="location" className="w-full p-2 border rounded-lg text-sm" placeholder="VD: Kệ A1, Tầng 2" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Tên Nhà cung cấp</label>
              <input name="supplierName" className="w-full p-2 border rounded-lg text-sm" placeholder="VD: Công ty TNHH Bao Bì A" />
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Lưu vật tư'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InboundModal({ item, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [purchaseQuantity, setPurchaseQuantity] = useState<number | ''>('');
  const [rollLengthM, setRollLengthM] = useState<number>(item.rollLengthM || 500);

  const isRoll = item.purchaseUnit === 'ROLL' || item.displayUnit === 'ROLL' || item.stockBaseUnit === 'MILLIMETER';
  const displayUnitName = item.purchaseUnit || item.displayUnit || item.unit;
  
  let calculatedBaseQty = 0;
  let previewText = '';
  
  if (purchaseQuantity !== '') {
    if (isRoll) {
      calculatedBaseQty = Math.round(Number(purchaseQuantity) * rollLengthM * 1000);
      previewText = `${purchaseQuantity} cuộn × ${formatIntegerBaseQuantity(rollLengthM)}m = ${formatIntegerBaseQuantity(Number(purchaseQuantity) * rollLengthM)}m = ${formatIntegerBaseQuantity(calculatedBaseQty)} MILLIMETER`;
    } else {
      calculatedBaseQty = Math.round(Number(purchaseQuantity) * (item.unitScale || 1));
      const displayLabel = displayUnitName === 'SHEET' ? 'tờ' : displayUnitName;
      previewText = `${purchaseQuantity} ${displayLabel} = ${formatIntegerBaseQuantity(calculatedBaseQty)} ${item.stockBaseUnit}`;
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    try {
      await createInboundTransaction({
        itemId: item.id,
        purchaseQuantity: Number(formData.get('purchaseQuantity')),
        rollLengthM: isRoll ? Number(formData.get('rollLengthM')) : undefined,
        unitCost: Number(formData.get('unitCost')) || undefined,
        referenceCode: formData.get('referenceCode') as string || undefined,
        note: formData.get('note') as string || undefined,
        createdAt: formData.get('createdAt') as string || undefined,
        supplierName: formData.get('supplierName') as string || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-indigo-50">
          <h3 className="font-bold text-lg text-indigo-900">Nhập kho: {item.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded text-indigo-500"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Số lượng nhập *</label>
              <input 
                name="purchaseQuantity" 
                type="number" 
                min="0.01" 
                step="0.01" 
                required 
                value={purchaseQuantity}
                onChange={(e) => setPurchaseQuantity(e.target.value === '' ? '' : Number(e.target.value))}
                className="w-full p-2 border rounded-lg text-sm" 
                placeholder="Ví dụ: 3"
              />
              <div className="text-xs text-slate-500 mt-1">Đơn vị nhập: {displayUnitName === 'ROLL' ? 'Cuộn' : displayUnitName}</div>
            </div>

            {isRoll && (
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Chiều dài mỗi cuộn (Mét) *</label>
                <input 
                  name="rollLengthM" 
                  type="number" 
                  min="1" 
                  required 
                  value={rollLengthM}
                  onChange={(e) => setRollLengthM(Number(e.target.value))}
                  className="w-full p-2 border rounded-lg text-sm" 
                />
              </div>
            )}

            {purchaseQuantity !== '' && (
              <div className="p-2 bg-indigo-50 border border-indigo-100 text-indigo-700 text-sm rounded-lg">
                <span className="font-semibold">Quy đổi tồn kho:</span> {previewText}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Đơn giá nhập (VNĐ / {displayUnitName === 'ROLL' ? 'cuộn' : displayUnitName})</label>
              <input name="unitCost" type="number" min="0" step="1" className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Ngày nhập</label>
              <input name="createdAt" type="datetime-local" className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Nhà cung cấp</label>
              <input name="supplierName" defaultValue={item.supplierName || ''} className="w-full p-2 border rounded-lg text-sm" placeholder="Nhập tên nhà cung cấp" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Mã chứng từ / Hóa đơn</label>
              <input name="referenceCode" className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Ghi chú</label>
              <textarea name="note" className="w-full p-2 border rounded-lg text-sm" rows={2}></textarea>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={loading || purchaseQuantity === ''} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Xác nhận nhập'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OutboundModal({ item, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    try {
      await createOutboundTransaction({
        itemId: item.id,
        quantityBase: Number(formData.get('quantityBase')),
        productionJobId: formData.get('productionJobId') as string || undefined,
        reason: formData.get('reason') as string || undefined,
        note: formData.get('note') as string || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-rose-50">
          <h3 className="font-bold text-lg text-rose-900">Xuất kho: {item.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-rose-100 rounded text-rose-500"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}
          <div className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-200">
            Có thể dùng (Base): <span className="font-bold text-emerald-600">{formatIntegerBaseQuantity(item.availableStockBase)} {item.stockBaseUnit}</span>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Số lượng xuất (Base Unit) *</label>
              <input name="quantityBase" type="number" min="1" required className="w-full p-2 border rounded-lg text-sm" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Lý do xuất *</label>
              <input name="reason" required className="w-full p-2 border rounded-lg text-sm" placeholder="VD: Xuất cho sản xuất" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Mã lệnh sản xuất (nếu có)</label>
              <input name="productionJobId" className="w-full p-2 border rounded-lg text-sm" placeholder="Mã ID lệnh sản xuất" />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Ghi chú</label>
              <textarea name="note" className="w-full p-2 border rounded-lg text-sm" rows={2}></textarea>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-rose-600 text-white rounded-lg text-sm font-medium hover:bg-rose-700 disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Xác nhận xuất'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AdjModal({ item, onClose, onSuccess }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    try {
      await createAdjustmentTransaction({
        itemId: item.id,
        type: formData.get('type') as 'ADJUSTMENT_INCREASE' | 'ADJUSTMENT_DECREASE',
        quantityBase: Number(formData.get('quantityBase')),
        reason: formData.get('reason') as string,
        note: formData.get('note') as string || undefined,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-amber-50">
          <h3 className="font-bold text-lg text-amber-900">Điều chỉnh: {item.name}</h3>
          <button onClick={onClose} className="p-1 hover:bg-amber-100 rounded text-amber-500"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}
          <div className="bg-slate-50 p-3 rounded-lg text-sm border border-slate-200">
            Tồn thực tế (Base): <span className="font-bold text-slate-700">{formatIntegerBaseQuantity(item.currentStockBase)} {item.stockBaseUnit}</span>
          </div>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Loại điều chỉnh *</label>
                <select name="type" required className="w-full p-2 border rounded-lg text-sm">
                  <option value="ADJUSTMENT_INCREASE">Tăng (+)</option>
                  <option value="ADJUSTMENT_DECREASE">Giảm (-)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold mb-1 text-slate-700">Số lượng chênh lệch (Base Unit) *</label>
                <input name="quantityBase" type="number" min="1" required className="w-full p-2 border rounded-lg text-sm" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Lý do điều chỉnh *</label>
              <input name="reason" required className="w-full p-2 border rounded-lg text-sm" placeholder="VD: Hư hỏng, kiểm kê lệch..." />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1 text-slate-700">Ghi chú thêm</label>
              <textarea name="note" className="w-full p-2 border rounded-lg text-sm" rows={2}></textarea>
            </div>
          </div>
          <div className="pt-4 flex justify-end gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
            <button type="submit" disabled={loading} className="px-4 py-2 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-50">
              {loading ? 'Đang lưu...' : 'Xác nhận điều chỉnh'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
