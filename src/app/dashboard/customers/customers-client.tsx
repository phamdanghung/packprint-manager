'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  Search, Plus, User as UserIcon, Phone, FileText, BadgePercent, ChevronRight,
  ShieldAlert, ShieldCheck, MapPin, Tag, Edit, Trash2, Mail, Factory, Loader2,
  Filter, Calendar
} from 'lucide-react';
import { createCustomer, toggleCustomerStatus } from '@/lib/customer-actions';
import { getCustomersWithCrmFilters } from '@/lib/crm-actions';

const CUSTOMER_TYPES: Record<string, string> = {
  RETAIL: 'Khách lẻ',
  WHOLESALE: 'Khách sỉ',
  AGENCY: 'Đại lý',
  CORPORATE: 'Doanh nghiệp',
};

const CRM_STATUSES: Record<string, string> = {
  LEAD: 'Lead',
  PROSPECT: 'Tiềm năng',
  CUSTOMER: 'Khách hàng',
  LOST: 'Đã mất',
  BLACKLISTED: 'Danh sách đen'
};

const SEGMENTS: Record<string, string> = {
  NEW: 'Khách mới',
  ACTIVE: 'Đang mua',
  VIP: 'VIP',
  WHOLESALE: 'Sỉ/Đại lý',
  ONE_TIME: 'Mua một lần',
  AT_RISK: 'Có nguy cơ rời bỏ',
  BAD_DEBT: 'Nợ xấu',
  INACTIVE: 'Không hoạt động'
};

const CUSTOMER_SOURCES: Record<string, string> = {
  FACEBOOK: 'Facebook',
  ZALO: 'Zalo',
  WEBSITE: 'Website',
  SHOPEE: 'Shopee',
  REFERRAL: 'Giới thiệu',
  WALK_IN: 'Khách đến trực tiếp',
  RETURNING: 'Khách cũ',
  OTHER: 'Khác',
};

export default function CustomersClient({ 
  initialCustomers, 
  userRole, 
  currentUserId,
  salesUsers 
}: { 
  initialCustomers: any[]; 
  userRole: string; 
  currentUserId: string;
  salesUsers: any[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // States cho danh sách & bộ lọc
  const [customers, setCustomers] = useState(initialCustomers);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCrmStatus, setFilterCrmStatus] = useState('');
  const [filterSegment, setFilterSegment] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterSales, setFilterSales] = useState('');
  const [filterOverdue, setFilterOverdue] = useState(false);
  const [sortBy, setSortBy] = useState('createdAt');

  // Load lại danh sách khi filter
  const handleApplyFilters = () => {
    startTransition(async () => {
      const filters = {
        search: searchTerm,
        crmStatus: filterCrmStatus,
        segment: filterSegment,
        source: filterSource,
        assignedSalesId: filterSales,
        overdueFollowUp: filterOverdue,
        sortBy
      };
      const result = await getCustomersWithCrmFilters(filters);
      setCustomers(result);
    });
  };

  // States cho Form Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [zalo, setZalo] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [customerType, setCustomerType] = useState('RETAIL');
  const [source, setSource] = useState('OTHER');
  const [taxCode, setTaxCode] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [note, setNote] = useState('');
  const [tags, setTags] = useState('');
  const [assignedSalesId, setAssignedSalesId] = useState('');

  const openModal = () => {
    setName('');
    setPhone('');
    setZalo('');
    setEmail('');
    setAddress('');
    setCustomerType('RETAIL');
    setSource('OTHER');
    setTaxCode('');
    setCompanyName('');
    setNote('');
    setTags('');
    setAssignedSalesId(userRole === 'SALES' ? currentUserId : '');
    setIsModalOpen(true);
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone) {
      alert('Vui lòng nhập Tên và Số điện thoại!');
      return;
    }

    startTransition(async () => {
      const res = await createCustomer({
        name, phone, zalo, email, address, customerType, source, taxCode, companyName, note, tags, assignedSalesId
      });

      if (!res.success) {
        alert(res.error);
        return;
      }
      
      alert('Đã tạo khách hàng thành công!');
      setIsModalOpen(false);
      handleApplyFilters();
    });
  };

  return (
    <div className="flex flex-col h-full space-y-6 max-w-7xl mx-auto">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
            <UserIcon className="h-6 w-6 text-teal-500" />
            CRM Khách Hàng
          </h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Quản lý thông tin, phân loại khách hàng và theo dõi lịch sử chăm sóc.
          </p>
        </div>

        {['ADMIN', 'MANAGER', 'SALES'].includes(userRole) && (
          <button
            onClick={openModal}
            className="flex items-center gap-2 bg-teal-500 hover:bg-teal-400 text-white px-4 py-2.5 rounded-xl text-sm font-bold shadow-md shadow-teal-500/20 transition-all active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Thêm khách hàng
          </button>
        )}
      </div>

      {/* Filter Area */}
      <div className="bg-white dark:bg-slate-900 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/60 flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Tìm kiếm</label>
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tên, SĐT, Mã..."
              className="w-full pl-9 pr-4 py-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Trạng thái CRM</label>
          <select value={filterCrmStatus} onChange={e => setFilterCrmStatus(e.target.value)} className="w-full p-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <option value="">Tất cả</option>
            {Object.entries(CRM_STATUSES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Phân khúc</label>
          <select value={filterSegment} onChange={e => setFilterSegment(e.target.value)} className="w-full p-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <option value="">Tất cả</option>
            {Object.entries(SEGMENTS).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        <div className="w-36">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Nguồn khách</label>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="w-full p-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <option value="">Tất cả</option>
            {Object.entries(CUSTOMER_SOURCES).map(([k,v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>

        {userRole !== 'SALES' && (
          <div className="w-40">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sales Phụ Trách</label>
            <select value={filterSales} onChange={e => setFilterSales(e.target.value)} className="w-full p-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
              <option value="">Tất cả Sales</option>
              {salesUsers.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
            </select>
          </div>
        )}

        <div className="w-36">
          <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Sắp xếp</label>
          <select value={sortBy} onChange={e => setSortBy(e.target.value)} className="w-full p-2 rounded-xl text-sm border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800">
            <option value="createdAt">Mới nhất</option>
            <option value="debtBalance">Công nợ cao nhất</option>
            <option value="nextFollowUp">Follow-up gần nhất</option>
            <option value="lastContact">Chưa liên hệ lâu nhất</option>
          </select>
        </div>

        <label className="flex items-center gap-2 h-10 px-3 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer">
          <input type="checkbox" checked={filterOverdue} onChange={e => setFilterOverdue(e.target.checked)} />
          <span className="text-sm font-semibold text-rose-500">Quá hạn chăm sóc</span>
        </label>

        <button onClick={handleApplyFilters} disabled={isPending} className="bg-slate-800 text-white px-4 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
          {isPending ? <Loader2 className="w-4 h-4 animate-spin"/> : <Filter className="w-4 h-4" />} Lọc
        </button>
      </div>

      {/* Data Table */}
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-800/60 overflow-hidden flex-1 flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400">
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Mã & Tên khách</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Thông tin liên hệ</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">Phân loại & Sales</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider">CRM & Chăm sóc</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-right">Công nợ</th>
                <th className="py-3 px-4 text-xs font-bold uppercase tracking-wider text-center hidden lg:table-cell">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {customers.map((c) => (
                <tr key={c.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer flex flex-col md:table-row border-b md:border-b-0 border-slate-200" onClick={() => router.push(`/dashboard/customers/${c.id}`)}>
                  <td className="py-3 px-4 flex justify-between items-center md:table-cell">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-800 dark:text-white text-sm group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                        {c.name}
                      </span>
                      <span className="text-xs text-slate-500 font-mono mt-0.5">{c.customerCode}</span>
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-col gap-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                        <Phone className="h-3 w-3" />
                        <span className="font-medium">{c.phone}</span>
                      </div>
                      {c.email && (
                        <div className="flex items-center gap-1.5 text-slate-500">
                          <Mail className="h-3 w-3" />
                          <span>{c.email}</span>
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-col items-start gap-1">
                      <span className="inline-flex px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-bold text-slate-600 dark:text-slate-300">
                        {CUSTOMER_TYPES[c.customerType] || c.customerType}
                      </span>
                      {c.assignedSales && (
                        <div className="flex items-center gap-1 text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                          <UserIcon className="h-3 w-3" />
                          {c.assignedSales.name}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 hidden md:table-cell">
                    <div className="flex flex-col gap-1">
                      <span className={`inline-flex w-fit px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        c.crmStatus === 'CUSTOMER' ? 'bg-emerald-100 text-emerald-700' :
                        c.crmStatus === 'PROSPECT' ? 'bg-blue-100 text-blue-700' :
                        'bg-slate-100 text-slate-700'
                      }`}>
                        {CRM_STATUSES[c.crmStatus] || c.crmStatus}
                      </span>
                      {c.nextFollowUpAt ? (
                        <span className={`text-[10px] font-semibold flex items-center gap-1 mt-1 ${
                          new Date(c.nextFollowUpAt) < new Date() ? 'text-rose-500 bg-rose-50 px-2 py-0.5 rounded' : 'text-amber-600 bg-amber-50 px-2 py-0.5 rounded'
                        }`}>
                          Hẹn: {new Date(c.nextFollowUpAt).toLocaleDateString('vi-VN')} {new Date(c.nextFollowUpAt) < new Date() ? '(Quá hạn)' : ''}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 mt-1 italic">Chưa có lịch hẹn</span>
                      )}
                      
                      {c.lastContactAt ? (
                        <span className="text-[10px] text-slate-500 mt-0.5">
                          Liên hệ cuối: {new Date(c.lastContactAt).toLocaleDateString('vi-VN')}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 mt-0.5 italic">Chưa liên hệ</span>
                      )}
                    </div>
                  </td>
                  <td className="py-3 px-4 flex justify-between items-center md:table-cell text-right">
                    <span className="md:hidden text-xs text-slate-500">Công nợ:</span>
                    <span className={`font-bold ${c.debtBalance > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400'}`}>
                      {c.debtBalance > 0 ? c.debtBalance.toLocaleString('vi-VN') + ' đ' : '0 đ'}
                    </span>
                  </td>
                  {/* Cột thao tác Desktop */}
                  <td className="py-3 px-4 text-center hidden lg:table-cell" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-center gap-1.5">
                      <Link href={`/dashboard/quotes/new?customerId=${c.id}`} className="p-1.5 bg-slate-100 hover:bg-blue-100 text-blue-600 rounded-lg tooltip-wrapper" title="Tạo Báo giá">
                        <FileText className="w-4 h-4" />
                      </Link>
                      <Link href={`/dashboard/orders/new?customerId=${c.id}`} className="p-1.5 bg-slate-100 hover:bg-indigo-100 text-indigo-600 rounded-lg tooltip-wrapper" title="Tạo Đơn hàng">
                        <Tag className="w-4 h-4" />
                      </Link>
                      <Link href={`/dashboard/customers/${c.id}?tab=follow-ups`} className="p-1.5 bg-slate-100 hover:bg-amber-100 text-amber-600 rounded-lg tooltip-wrapper" title="Tạo Lịch hẹn">
                        <Calendar className="w-4 h-4" />
                      </Link>
                      <a href={c.phone ? `tel:${c.phone}` : '#'} className={`p-1.5 rounded-lg tooltip-wrapper ${c.phone ? 'bg-slate-100 hover:bg-green-100 text-green-600' : 'bg-slate-50 text-slate-300 pointer-events-none'}`} title={c.phone ? 'Gọi điện' : 'Chưa có SĐT'}>
                        <Phone className="w-4 h-4" />
                      </a>
                    </div>
                  </td>
                  {/* Nút hành động Mobile */}
                  <td className="py-3 px-4 block md:hidden border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center gap-2">
                      <Link href={`/dashboard/quotes/new?customerId=${c.id}`} className="flex-1 py-2 bg-blue-50 text-blue-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                        <FileText className="w-3 h-3" /> Báo giá
                      </Link>
                      <Link href={`/dashboard/orders/new?customerId=${c.id}`} className="flex-1 py-2 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-bold flex items-center justify-center gap-1">
                        <Tag className="w-3 h-3" /> Đơn hàng
                      </Link>
                      <a href={c.phone ? `tel:${c.phone}` : '#'} className={`flex-1 py-2 rounded-lg text-xs font-bold flex items-center justify-center gap-1 ${c.phone ? 'bg-green-50 text-green-600' : 'bg-slate-50 text-slate-400 pointer-events-none'}`}>
                        <Phone className="w-3 h-3" /> Gọi
                      </a>
                    </div>
                  </td>
                </tr>
              ))}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500 text-sm">
                    Không tìm thấy khách hàng nào khớp với bộ lọc.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Tạo khách hàng nhanh */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white dark:bg-slate-900 rounded-2xl w-full max-w-lg shadow-xl border border-slate-200 dark:border-slate-800 my-8">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between sticky top-0 bg-white dark:bg-slate-900 rounded-t-2xl z-10">
              <h3 className="text-lg font-bold text-slate-800 dark:text-white flex items-center gap-2">
                <UserIcon className="h-5 w-5 text-teal-500" />
                Thêm Khách hàng mới
              </h3>
            </div>

            {/* Modal Body */}
            <form onSubmit={handleCreateCustomer} className="p-6 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2 space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Tên khách hàng *</label>
                  <input required value={name} onChange={e => setName(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" placeholder="Nhập tên KH hoặc Công ty..." />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Số điện thoại *</label>
                  <input required value={phone} onChange={e => setPhone(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" placeholder="0987654321" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-600 uppercase">Zalo</label>
                  <input value={zalo} onChange={e => setZalo(e.target.value)} className="w-full p-2.5 rounded-xl border border-slate-200 text-sm" placeholder="SĐT Zalo..." />
                </div>
              </div>
              
              <div className="flex justify-end gap-3 pt-4 border-t">
                <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border rounded-xl text-sm font-bold">Hủy</button>
                <button type="submit" disabled={isPending} className="px-4 py-2 bg-teal-500 text-white rounded-xl text-sm font-bold flex items-center gap-2">
                  {isPending && <Loader2 className="w-4 h-4 animate-spin"/>} Lưu khách hàng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
