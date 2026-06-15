'use client';

import React, { useState, useEffect } from 'react';
import { 
  Package, AlertTriangle, List, Clock, Plus, Search, Filter,
  ArrowDownToLine, ArrowUpFromLine, RefreshCw, X, Settings, ChevronDown, Trash, Lock, Unlock
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { 
  createInventoryItem, createInboundTransaction, createOutboundTransaction,
  createAdjustmentTransaction, getInventoryTransactions, getInventoryItems,
  deleteOrDeactivateInventoryItem, reactivateInventoryItem
} from '@/lib/inventory-actions';
import { 
  INVENTORY_CATEGORIES, INVENTORY_MATERIAL_TYPES, INVENTORY_UNITS,
  INVENTORY_TRANSACTION_TYPES
} from '@/lib/inventory-constants';
import { ItemFormModal } from './item-form-modal';
import { batchCreateStandardMaterials } from '@/lib/inventory-batch-actions';

function formatIntegerBaseQuantity(num: number | string | undefined | null) {
  if (num === null || num === undefined) return '0';
  const val = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(val)) return '0';
  return Math.round(val).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export default function InventoryClient({ initialData, initialItems, userRole, activeZones = [] }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'inventory');
  const [statusFilter, setStatusFilter] = useState('ACTIVE');
  const [items, setItems] = useState(initialItems);
  const [kpis, setKpis] = useState(initialData.kpis);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [isZoneDropdownOpen, setIsZoneDropdownOpen] = useState(false);
  
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

  const handleDeleteOrDeactivate = async (item: any) => {
    if (item.currentStockBase > 0) {
      alert('Vật tư vẫn còn tồn kho. Vui lòng xuất/điều chỉnh về 0 trước khi ngưng sử dụng.');
      return;
    }
    if (!window.confirm(`Bạn có chắc chắn muốn xóa/ngưng sử dụng vật tư ${item.itemCode}?`)) return;
    
    try {
      const res = await deleteOrDeactivateInventoryItem(item.id);
      alert(res.message);
      refreshItems();
    } catch (e: any) {
      alert(e.message);
    }
  };

  const handleReactivate = async (item: any) => {
    if (!window.confirm(`Kích hoạt lại vật tư ${item.itemCode}?`)) return;
    try {
      await reactivateInventoryItem(item.id);
      refreshItems();
    } catch (e: any) {
      alert(e.message);
    }
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

  const zonesToRender = activeZones?.length > 0 ? activeZones : [{ id: 'fallback-other', name: 'Khác' }];

  let displayedItems = items;
  if (activeTab.startsWith('zone-')) {
    const zoneId = activeTab.replace('zone-', '');
    displayedItems = displayedItems.filter((i: any) => i.warehouseZoneId === zoneId || (zoneId === 'fallback-other' && !i.warehouseZoneId));
  }

  if (statusFilter !== 'ALL') {
    displayedItems = displayedItems.filter((i: any) => i.status === statusFilter);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Kho vật tư</h1>
          <p className="text-sm text-slate-500">Quản lý tồn kho, nhập xuất vật tư và cảnh báo thiếu hàng</p>
        </div>
        {canModifyItem && (
          <div className="flex gap-2">
            <button 
              onClick={() => {
                // Batch create preset modal could go here, for now just a demo action
                const preset = window.prompt("Nhập preset Batch Create (ví dụ: COUCHE_300, KRAFT_150, MANG_BONG_NHIET):", "COUCHE_300");
                if (preset) {
                  batchCreateStandardMaterials(preset).then(res => {
                    alert('Batch Create hoàn tất:\n' + JSON.stringify(res, null, 2));
                    refreshItems();
                  });
                }
              }}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <RefreshCw className="h-4 w-4" />
              <span>Tạo Batch Bộ Mã Chuẩn</span>
            </button>
            <button 
              onClick={() => router.push('/dashboard/inventory/warehouse-zones')}
              className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Settings className="h-4 w-4" />
              <span>Cấu hình Khu Kho</span>
            </button>
            <Link href="/dashboard/inventory/inbound" className="flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-100 transition-colors">
              <ArrowDownToLine className="h-4 w-4" />
              Phiếu Nhập Kho
            </Link>
            <Link href="/dashboard/inventory/outbound" className="flex items-center gap-2 bg-rose-50 text-rose-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-rose-100 transition-colors">
              <ArrowUpFromLine className="h-4 w-4" />
              Phiếu Xuất Kho
            </Link>
            <button 
              onClick={() => setShowInboundModal(true)}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <ArrowDownToLine className="h-4 w-4" />
              <span>Nhập Kho</span>
            </button>
            <button 
              onClick={() => setShowItemModal(true)}
              className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Tạo Vật Tư Chuẩn</span>
            </button>
          </div>
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

      {/* Tabs & Filters */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200">
        <div className="flex flex-wrap">
        <a
          href="/dashboard/inventory"
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'inventory' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
          onClick={(e) => { e.preventDefault(); setActiveTab('inventory'); router.replace('/dashboard/inventory'); }}
        >
          <List className="h-4 w-4" />
          Tất cả
        </a>
        <div className="relative">
          <button
            onClick={() => setIsZoneDropdownOpen(!isZoneDropdownOpen)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
              activeTab.startsWith('zone-') ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            <Package className="h-4 w-4" />
            {activeTab.startsWith('zone-') ? (zonesToRender.find((z:any) => `zone-${z.id}` === activeTab)?.name || 'Khu kho') : 'Khu kho'}
            <ChevronDown className={`h-4 w-4 transition-transform ${isZoneDropdownOpen ? 'rotate-180' : ''}`} />
          </button>
          
          {isZoneDropdownOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setIsZoneDropdownOpen(false)}></div>
              <div className="absolute left-0 top-full mt-1 w-48 bg-white border border-slate-200 shadow-lg rounded-lg z-50 py-1 overflow-hidden animate-in fade-in slide-in-from-top-2">
                {zonesToRender.map((zone: any) => (
                  <a
                    key={zone.id}
                    href={`/dashboard/inventory?tab=zone-${zone.id}`}
                    className={`block px-4 py-2 text-sm hover:bg-slate-50 ${activeTab === `zone-${zone.id}` ? 'text-indigo-600 font-bold bg-indigo-50' : 'text-slate-700'}`}
                    onClick={(e) => { 
                      e.preventDefault(); 
                      setActiveTab(`zone-${zone.id}`); 
                      router.replace(`/dashboard/inventory?tab=zone-${zone.id}`);
                      setIsZoneDropdownOpen(false);
                    }}
                  >
                    {zone.name}
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
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
        <a
          href="/dashboard/inventory?tab=alerts"
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'alerts' ? 'border-rose-600 text-rose-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
          onClick={(e) => { e.preventDefault(); setActiveTab('alerts'); router.replace('/dashboard/inventory?tab=alerts'); }}
        >
          <AlertTriangle className="h-4 w-4" />
          Cảnh báo tồn thấp {kpis.lowStockCount + kpis.outOfStockCount > 0 && `(${kpis.lowStockCount + kpis.outOfStockCount})`}
        </a>
        <a
          href="/dashboard/inventory?tab=transactions"
          className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === 'transactions' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
          }`}
          onClick={(e) => { e.preventDefault(); setActiveTab('transactions'); router.replace('/dashboard/inventory?tab=transactions'); }}
        >
          <Clock className="h-4 w-4" />
          Lịch sử giao dịch
        </a>
        </div>
        
        <div className="pr-4 py-2 flex items-center gap-2">
          <span className="text-sm font-medium text-slate-500">Trạng thái:</span>
          <select 
            value={statusFilter} 
            onChange={(e) => setStatusFilter(e.target.value)}
            className="border border-slate-200 rounded-lg px-3 py-1.5 text-sm font-medium focus:ring-2 focus:ring-indigo-500"
          >
            <option value="ACTIVE">Đang dùng</option>
            <option value="INACTIVE">Ngưng sử dụng</option>
            <option value="ALL">Tất cả</option>
          </select>
        </div>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        {(activeTab === 'inventory' || activeTab.startsWith('zone-')) && (
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
                {displayedItems.length === 0 ? (
                  <tr>
                    <td colSpan={canViewCost ? 9 : 8} className="px-4 py-8 text-center text-slate-500">Không có dữ liệu</td>
                  </tr>
                ) : displayedItems.map((item: any) => (
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
                      {canModifyItem && item.status === 'ACTIVE' && item.currentStockBase === 0 && (
                        <button onClick={() => handleDeleteOrDeactivate(item)} className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded" title="Xóa (nếu chưa có GD)">
                          <Trash className="h-4 w-4" />
                        </button>
                      )}
                      {canModifyItem && item.status === 'ACTIVE' && item.currentStockBase > 0 && (
                        <button onClick={() => handleDeleteOrDeactivate(item)} className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded" title="Ngưng sử dụng">
                          <Lock className="h-4 w-4" />
                        </button>
                      )}
                      {canModifyItem && item.status === 'INACTIVE' && (
                        <button onClick={() => handleReactivate(item)} className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded" title="Kích hoạt lại">
                          <Unlock className="h-4 w-4" />
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
        <ItemFormModal 
          onClose={() => setShowItemModal(false)} 
          onSuccess={() => { setShowItemModal(false); refreshItems(); }} 
          userRole={userRole}
          activeZones={activeZones}
        />
      )}
      {showInboundModal && (
        <InboundModal 
          item={showInboundModal === true ? null : showInboundModal} 
          items={items}
          activeZones={activeZones}
          onClose={() => setShowInboundModal(null)} 
          onSuccess={() => { setShowInboundModal(null); refreshItems(); }} 
          onQuickCreate={() => setShowItemModal(true)}
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

// The old ItemModal has been replaced by ItemFormModal

function InboundModal({ item, items, activeZones, onClose, onSuccess, onQuickCreate }: any) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [filterZoneId, setFilterZoneId] = useState('');
  const filteredItems = filterZoneId ? items.filter((i: any) => i.warehouseZoneId === filterZoneId) : items;

  const [selectedItemId, setSelectedItemId] = useState(item?.id || '');
  const selectedItem = item || items.find((i: any) => i.id === selectedItemId);

  const [purchaseQuantity, setPurchaseQuantity] = useState<number | ''>('');
  const [rollLengthM, setRollLengthM] = useState<number>(selectedItem?.rollLengthM || 500);

  // Update rollLengthM when selectedItem changes
  useEffect(() => {
    if (selectedItem?.rollLengthM) setRollLengthM(selectedItem.rollLengthM);
  }, [selectedItem]);

  const isRoll = selectedItem && (selectedItem.purchaseUnit === 'ROLL' || selectedItem.displayUnit === 'ROLL' || selectedItem.stockBaseUnit === 'MILLIMETER');
  const displayUnitName = selectedItem ? (selectedItem.purchaseUnit || selectedItem.displayUnit || selectedItem.unit) : '';
  
  let calculatedBaseQty = 0;
  let previewText = '';
  
  if (purchaseQuantity !== '' && selectedItem) {
    if (isRoll) {
      calculatedBaseQty = Math.round(Number(purchaseQuantity) * rollLengthM * 1000);
      previewText = `${purchaseQuantity} cuộn × ${formatIntegerBaseQuantity(rollLengthM)}m = ${formatIntegerBaseQuantity(Number(purchaseQuantity) * rollLengthM)}m = ${formatIntegerBaseQuantity(calculatedBaseQty)} MILLIMETER`;
    } else {
      calculatedBaseQty = Math.round(Number(purchaseQuantity) * (selectedItem.unitScale || 1));
      const displayLabel = displayUnitName === 'SHEET' ? 'tờ' : displayUnitName;
      previewText = `${purchaseQuantity} ${displayLabel} = ${formatIntegerBaseQuantity(calculatedBaseQty)} ${selectedItem.stockBaseUnit}`;
    }
  }

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (!selectedItem) {
      setError('Vui lòng chọn vật tư');
      return;
    }
    setLoading(true);
    setError('');
    const formData = new FormData(e.target);
    try {
      await createInboundTransaction({
        itemId: selectedItem.id,
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
    <div className="fixed inset-0 z-[50] flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="flex justify-between items-center p-4 border-b border-slate-100 bg-indigo-50 flex-shrink-0">
          <h3 className="font-bold text-lg text-indigo-900">Phiếu nhập kho</h3>
          <button onClick={onClose} className="p-1 hover:bg-indigo-100 rounded text-indigo-500"><X className="h-5 w-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto flex-1">
          <form id="inboundForm" onSubmit={handleSubmit} className="space-y-4">
            {error && <div className="p-3 bg-rose-50 text-rose-600 text-sm rounded-lg">{error}</div>}
            
            {!item && (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Lọc theo khu kho</label>
                  <select
                    value={filterZoneId}
                    onChange={e => setFilterZoneId(e.target.value)}
                    className="w-full p-2 border rounded-lg text-sm bg-slate-50"
                  >
                    <option value="">-- Tất cả khu kho --</option>
                    {activeZones.map((z: any) => <option key={z.id} value={z.id}>{z.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1 text-slate-700">Chọn vật tư *</label>
                  <div className="flex gap-2">
                    <select 
                      value={selectedItemId} 
                      onChange={e => setSelectedItemId(e.target.value)} 
                      className="flex-1 min-w-0 w-full p-2 border rounded-lg text-sm truncate"
                      required
                    >
                      <option value="">-- Chọn vật tư --</option>
                      {filteredItems.map((i: any) => <option key={i.id} value={i.id}>[{i.itemCode}] {i.name}</option>)}
                    </select>
                    <button type="button" onClick={onQuickCreate} className="px-3 py-2 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-sm font-medium whitespace-nowrap">
                      + Tạo chuẩn
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {selectedItem && (
              <div className="space-y-4">
                {item && (
                   <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-sm font-bold text-slate-800">
                     Vật tư: {selectedItem.name} ({selectedItem.itemCode})
                   </div>
                )}
                
                {selectedItem && !selectedItem.warehouseZoneId && (
                  <div className="p-2 bg-amber-50 text-amber-700 text-sm rounded-lg flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" /> Vật tư chưa được phân vào khu kho nào.
                  </div>
                )}
                {selectedItem && selectedItem.warehouseZoneId && (
                  <div className="text-xs font-medium text-slate-600 bg-slate-100 p-2 rounded flex items-center gap-2">
                    <Package className="h-4 w-4" /> Khu kho: {activeZones.find((z:any) => z.id === selectedItem.warehouseZoneId)?.name || 'Không xác định'}
                  </div>
                )}
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
                  <input name="supplierName" defaultValue={selectedItem.supplierName || ''} className="w-full p-2 border rounded-lg text-sm" placeholder="Nhập tên nhà cung cấp" />
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
            )}
          </form>
        </div>
        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 flex-shrink-0">
          <button type="button" onClick={onClose} className="px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-50">Hủy</button>
          <button form="inboundForm" type="submit" disabled={loading || purchaseQuantity === '' || !selectedItem} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50">
            {loading ? 'Đang lưu...' : 'Xác nhận nhập'}
          </button>
        </div>
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
