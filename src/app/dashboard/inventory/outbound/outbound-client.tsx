'use client';

import React, { useState } from 'react';
import Link from 'next/link';
// import { format } from 'date-fns';
import { getOutboundTypeLabel, getOutboundStatusLabel } from '@/lib/inventory-outbound-types';
import { formatCurrencyVND, formatDateTime } from '@/lib/utils';
import { Plus, Search, Eye, FileText } from 'lucide-react';

export default function OutboundClient({ initialData, userRole }: { initialData: any[], userRole: string }) {
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = initialData.filter(r => 
    r.receiptCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (r.receiverName && r.receiverName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.productionJobId && r.productionJobId.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (r.orderId && r.orderId.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const canCreate = ['ADMIN', 'MANAGER', 'PRODUCTION'].includes(userRole);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Phiếu Xuất Kho</h1>
          <p className="text-gray-500 mt-1">Quản lý lịch sử xuất kho vật tư</p>
        </div>
        {canCreate && (
          <Link
            href="/dashboard/inventory/outbound/new"
            className="inline-flex items-center justify-center rounded-md text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none ring-offset-background bg-blue-600 text-white hover:bg-blue-700 h-10 py-2 px-4"
          >
            <Plus className="w-4 h-4 mr-2" />
            Tạo phiếu xuất
          </Link>
        )}
      </div>

      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Tìm theo mã phiếu, người nhận..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50/50 border-b">
              <tr>
                <th className="px-6 py-4 font-medium">Mã phiếu</th>
                <th className="px-6 py-4 font-medium">Ngày xuất</th>
                <th className="px-6 py-4 font-medium">Loại xuất</th>
                <th className="px-6 py-4 font-medium">Người nhận</th>
                <th className="px-6 py-4 font-medium">Tổng vật tư</th>
                <th className="px-6 py-4 font-medium">Trạng thái</th>
                <th className="px-6 py-4 font-medium text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-gray-500">
                    Không tìm thấy phiếu xuất kho nào
                  </td>
                </tr>
              ) : (
                filtered.map((receipt) => {
                  const totalItems = receipt.items?.length || 0;
                  const totalQty = receipt.items?.reduce((sum: number, item: any) => sum + item.quantityBase, 0) || 0;
                  
                  return (
                    <tr key={receipt.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {receipt.receiptCode}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {formatDateTime(receipt.issuedAt)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                          {getOutboundTypeLabel(receipt.outboundType)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {receipt.receiverName || '-'}
                        {receipt.receiverDepartment && <span className="text-gray-400 text-xs block">{receipt.receiverDepartment}</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {totalItems} loại ({totalQty.toLocaleString()})
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          receipt.status === 'COMPLETED' ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'
                        }`}>
                          {getOutboundStatusLabel(receipt.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/dashboard/inventory/outbound/${receipt.id}`}
                            className="p-2 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </Link>
                          <Link
                            href={`/dashboard/inventory/outbound/${receipt.id}/print`}
                            target="_blank"
                            className="p-2 text-gray-400 hover:text-gray-900 rounded-lg hover:bg-gray-100 transition-colors"
                            title="In phiếu"
                          >
                            <FileText className="w-4 h-4" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
