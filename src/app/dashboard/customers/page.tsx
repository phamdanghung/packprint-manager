import React from 'react';
import { PlusCircle, Search, Mail, Phone, MapPin, Building, DollarSign } from 'lucide-react';
import { db } from '@/lib/db';
import { formatVND, formatDate } from '@/lib/utils';

export default async function CustomersPage() {
  const customers = await db.customer.findMany({
    orderBy: {
      createdAt: 'desc',
    },
  });

  return (
    <div className="space-y-6 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Quản lý Khách hàng</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Danh sách các đối tác, khách hàng doanh nghiệp và cá nhân đặt in bao bì.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 transition-all cursor-pointer">
          <PlusCircle className="h-4 w-4" />
          <span>Thêm Khách hàng mới</span>
        </button>
      </div>

      {/* Filter and Search */}
      <div className="flex items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <input
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
            placeholder="Tìm kiếm khách hàng theo tên, số điện thoại, công ty..."
          />
        </div>
      </div>

      {/* Customer List */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
        <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Tên khách hàng / Ngày tạo</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Doanh nghiệp (Công ty)</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Thông tin liên lạc</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Địa chỉ giao nhận</th>
                <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Tổng Dư nợ hiện tại</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                  <td className="py-4 px-4 space-y-1">
                    <div className="font-bold text-slate-850 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {c.name}
                    </div>
                    <div className="text-[10px] text-slate-450 dark:text-slate-500">
                      Ngày tạo: {formatDate(c.createdAt)}
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    {c.companyName ? (
                      <div className="flex items-center gap-1.5 font-semibold text-slate-700 dark:text-slate-350">
                        <Building className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.companyName}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Khách cá nhân</span>
                    )}
                  </td>
                  <td className="py-4 px-4 space-y-1">
                    {c.phone && (
                      <div className="flex items-center gap-1.5 text-slate-650 dark:text-slate-400">
                        <Phone className="h-3.5 w-3.5 text-slate-400" />
                        <span>{c.phone}</span>
                      </div>
                    )}
                    {c.email && (
                      <div className="flex items-center gap-1.5 text-slate-500">
                        <Mail className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate max-w-[150px]">{c.email}</span>
                      </div>
                    )}
                  </td>
                  <td className="py-4 px-4 max-w-[200px] text-slate-600 dark:text-slate-400 truncate" title={c.address || ''}>
                    {c.address ? (
                      <div className="flex items-center gap-1.5">
                        <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                        <span className="truncate">{c.address}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic">Chưa cập nhật địa chỉ</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <span className={`font-bold inline-block px-3 py-1 rounded-xl ${
                      c.debtBalance > 0 
                        ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20' 
                        : c.debtBalance < 0 
                          ? 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20' 
                          : 'bg-teal-500/10 text-teal-600 dark:text-teal-400 border border-teal-500/20'
                    }`}>
                      {c.debtBalance > 0 
                        ? formatVND(c.debtBalance) 
                        : c.debtBalance < 0 
                          ? `Ứng: ${formatVND(Math.abs(c.debtBalance))}` 
                          : 'Hết nợ'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
