import { getInboundReceipts } from '@/lib/inventory-inbound-actions';
import { Package, Search, Plus, Filter, Eye, Printer, XCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Phiếu Nhập Kho | Quản lý Kho',
};

export default async function InboundReceiptsPage() {
  const receipts = await getInboundReceipts();

  return (
    <div className="p-6 space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Phiếu Nhập Kho</h1>
          <p className="text-sm text-slate-500">Quản lý và tra cứu các đợt nhập hàng</p>
        </div>
        <div className="flex gap-2">
          <Link 
            href="/dashboard/inventory/inbound/new"
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <Plus className="h-4 w-4" />
            Tạo Phiếu Nhập
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-200 flex gap-4 bg-slate-50">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input 
              type="text" 
              placeholder="Tìm kiếm theo mã phiếu, NCC, chứng từ..." 
              className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium hover:bg-slate-100 text-slate-700">
            <Filter className="h-4 w-4" /> Lọc
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-white border-b border-slate-200 text-slate-600">
              <tr>
                <th className="px-4 py-3 font-semibold">Mã Phiếu</th>
                <th className="px-4 py-3 font-semibold">Ngày Nhập</th>
                <th className="px-4 py-3 font-semibold">Nhà Cung Cấp</th>
                <th className="px-4 py-3 font-semibold">Chứng Từ</th>
                <th className="px-4 py-3 font-semibold text-right">Tổng Tiền</th>
                <th className="px-4 py-3 font-semibold text-center">Trạng Thái</th>
                <th className="px-4 py-3 font-semibold text-right">Hành Động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {receipts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-500">Chưa có phiếu nhập kho nào</td>
                </tr>
              ) : receipts.map((receipt: any) => {
                const totalCost = receipt.items.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);
                
                return (
                  <tr key={receipt.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-indigo-600">
                      <Link href={`/dashboard/inventory/inbound/${receipt.id}`}>{receipt.receiptCode}</Link>
                    </td>
                    <td className="px-4 py-3 text-slate-700">
                      {new Date(receipt.receivedAt).toLocaleDateString('vi-VN')}
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">
                      {receipt.supplierName || '-'}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {receipt.documentNo || '-'}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-900">
                      {totalCost > 0 ? `${totalCost.toLocaleString('vi-VN')} đ` : '-'}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-semibold ${
                        receipt.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                      }`}>
                        {receipt.status === 'COMPLETED' ? 'Hoàn tất' : 'Đã hủy'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Link href={`/dashboard/inventory/inbound/${receipt.id}`} className="inline-block p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded" title="Xem chi tiết">
                        <Eye className="h-4 w-4" />
                      </Link>
                      <Link href={`/dashboard/inventory/inbound/${receipt.id}/print`} className="inline-block p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded" title="In phiếu">
                        <Printer className="h-4 w-4" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
