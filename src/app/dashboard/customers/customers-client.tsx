'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { 
  PlusCircle, 
  Search, 
  Mail, 
  Phone, 
  MapPin, 
  Building, 
  User, 
  Lock, 
  Unlock, 
  Edit3, 
  Eye, 
  Tag, 
  MessageSquare,
  FileText,
  X,
  Loader2,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';
import { formatVND, formatDate } from '@/lib/utils';
import { getCustomers, createCustomer, updateCustomer, toggleCustomerStatus } from '@/lib/customer-actions';

interface CustomersClientProps {
  initialCustomers: any[];
  userRole: string;
}

// Map các kiểu loại khách hàng
const CUSTOMER_TYPES: Record<string, string> = {
  RETAIL: 'Khách lẻ',
  COMPANY: 'Công ty',
  AGENCY: 'Đại lý',
  FNB: 'F&B',
  COSMETIC: 'Mỹ phẩm',
  PHARMA: 'Dược phẩm',
  OTHER: 'Khác'
};

const CUSTOMER_TYPE_COLORS: Record<string, string> = {
  RETAIL: 'bg-slate-500/10 text-slate-700 dark:text-slate-400 border-slate-500/20',
  COMPANY: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border-indigo-500/20',
  AGENCY: 'bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-500/20',
  FNB: 'bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-500/20',
  COSMETIC: 'bg-pink-500/10 text-pink-700 dark:text-pink-400 border-pink-500/20',
  PHARMA: 'bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-500/20',
  OTHER: 'bg-slate-500/10 text-slate-700 border-slate-500/20'
};

// Map nguồn khách hàng
const CUSTOMER_SOURCES: Record<string, string> = {
  FACEBOOK: 'Facebook',
  ZALO: 'Zalo',
  TIKTOK: 'TikTok',
  GOOGLE: 'Google',
  REFERRAL: 'Giới thiệu',
  WALK_IN: 'Khách trực tiếp',
  OTHER: 'Khác'
};

export default function CustomersClient({ initialCustomers, userRole }: CustomersClientProps) {
  const [customers, setCustomers] = useState(initialCustomers);
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState('ALL');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  
  // State cho Modal Form (Thêm/Sửa)
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<any | null>(null);
  
  // Form state
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
  
  // States cho validation, loading và alert
  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  // Trigger Server-side search & filtering when any filter state changes
  React.useEffect(() => {
    startTransition(async () => {
      const res = await getCustomers({
        search: search.trim() || undefined,
        customerType: typeFilter === 'ALL' ? undefined : typeFilter,
        source: sourceFilter === 'ALL' ? undefined : sourceFilter,
        status: statusFilter === 'ALL' ? undefined : statusFilter,
      });
      if (res.success && res.data) {
        setCustomers(res.data);
      }
    });
  }, [search, typeFilter, sourceFilter, statusFilter]);

  // Quyền thao tác
  const canMutate = ['ADMIN', 'MANAGER', 'SALES'].includes(userRole);
  const canChangeStatus = ['ADMIN', 'MANAGER'].includes(userRole);

  // Hiển thị Toast thông báo tự ẩn
  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Mở modal thêm mới
  const handleOpenCreateModal = () => {
    if (!canMutate) return;
    setEditingCustomer(null);
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
    setFormError(null);
    setIsModalOpen(true);
  };

  // Mở modal chỉnh sửa
  const handleOpenEditModal = (c: any) => {
    if (!canMutate) return;
    setEditingCustomer(c);
    setName(c.name || '');
    setPhone(c.phone || '');
    setZalo(c.zalo || '');
    setEmail(c.email || '');
    setAddress(c.address || '');
    setCustomerType(c.customerType || 'RETAIL');
    setSource(c.source || 'OTHER');
    setTaxCode(c.taxCode || '');
    setCompanyName(c.companyName || '');
    setNote(c.note || '');
    setTags(c.tags || '');
    setFormError(null);
    setIsModalOpen(true);
  };

  // Submit Form (Thêm/Sửa)
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation cơ bản
    if (!name.trim()) {
      setFormError('Tên khách hàng là bắt buộc.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Số điện thoại là bắt buộc.');
      return;
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setFormError('Địa chỉ Email không đúng định dạng.');
      return;
    }

    const payload = {
      name,
      phone,
      zalo: zalo.trim() || undefined,
      email: email.trim() || undefined,
      address: address.trim() || undefined,
      customerType,
      source,
      taxCode: taxCode.trim() || undefined,
      companyName: companyName.trim() || undefined,
      note: note.trim() || undefined,
      tags: tags.trim() || undefined,
    };

    startTransition(async () => {
      let res;
      if (editingCustomer) {
        // Cập nhật khách cũ
        res = await updateCustomer(editingCustomer.id, payload);
      } else {
        // Tạo khách mới
        res = await createCustomer(payload);
      }

      if (res.success && res.data) {
        showToast('success', editingCustomer 
          ? `Đã cập nhật hồ sơ khách hàng ${res.data.customerCode} thành công.` 
          : `Đã tạo khách hàng mới ${res.data.customerCode} thành công.`
        );
        setIsModalOpen(false);
        // Refresh danh sách client bằng cách gọi nhẹ cập nhật
        window.location.reload();
      } else {
        setFormError(res.error || 'Đã xảy ra lỗi không xác định.');
      }
    });
  };

  // Khóa / Mở lại khách hàng
  const handleToggleStatus = async (c: any) => {
    if (!canChangeStatus) {
      showToast('error', 'Chỉ có Chủ doanh nghiệp hoặc Quản lý được phép thay đổi trạng thái khách hàng.');
      return;
    }

    if (confirm(`Bạn có chắc chắn muốn ${c.status === 'ACTIVE' ? 'KHÓA' : 'MỞ KHÓA'} hoạt động khách hàng ${c.customerCode}?`)) {
      const res = await toggleCustomerStatus(c.id);
      if (res.success) {
        showToast('success', res.message || 'Cập nhật trạng thái thành công.');
        // Refresh nhanh
        window.location.reload();
      } else {
        showToast('error', res.error || 'Lỗi xử lý trạng thái.');
      }
    }
  };

  // Cập nhật: Dữ liệu khách hàng lúc này được truy vấn và lọc trực tiếp 100% từ Database server-side

  return (
    <div className="space-y-6 font-sans relative">
      {/* Toast Alert */}
      {toast && (
        <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-xl animate-slide-in ${
          toast.type === 'success' 
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' 
            : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
        }`}>
          {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
          <span className="text-xs font-bold">{toast.msg}</span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Quản lý Khách hàng</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Danh sách các đối tác, khách hàng doanh nghiệp và cá nhân đặt in bao bì.</p>
        </div>
        {canMutate && (
          <button 
            onClick={handleOpenCreateModal}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 transition-all cursor-pointer hover:shadow-lg active:scale-95"
          >
            <PlusCircle className="h-4 w-4" />
            <span>Thêm Khách hàng mới</span>
          </button>
        )}
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-wrap items-center gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 p-4 rounded-2xl shadow-sm">
        <div className="relative flex-1 min-w-[250px] max-w-md">
          <Search className="absolute left-3.5 top-3.5 h-4.5 w-4.5 text-slate-400" />
          <input
            className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-3 pl-11 pr-4 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50 transition-all"
            placeholder="Tìm theo Mã khách, Tên khách, Tên công ty, SĐT, Email, Zalo..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        
        {/* Lọc loại khách */}
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-3 text-xs text-slate-750 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer font-medium"
        >
          <option value="ALL">Tất cả loại khách</option>
          {Object.entries(CUSTOMER_TYPES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Lọc nguồn khách */}
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-3 text-xs text-slate-750 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer font-medium"
        >
          <option value="ALL">Tất cả nguồn khách</option>
          {Object.entries(CUSTOMER_SOURCES).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>

        {/* Lọc trạng thái */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3.5 py-3 text-xs text-slate-750 dark:text-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer font-medium"
        >
          <option value="ALL">Tất cả trạng thái</option>
          <option value="ACTIVE">Đang hoạt động</option>
          <option value="INACTIVE">Ngưng hoạt động</option>
        </select>
      </div>

      {/* Customer List Board */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm">
        {customers.length > 0 ? (
          <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Mã khách</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Tên khách / Công ty</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Số điện thoại</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Zalo</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Loại khách</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Nguồn khách</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Công nợ hiện tại</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Ngày tạo</th>
                  <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-center">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                {customers.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all group">
                    {/* Mã khách */}
                    <td className="py-4 px-4 font-bold text-slate-850 dark:text-white group-hover:text-teal-600 dark:group-hover:text-teal-400 transition-colors">
                      {c.customerCode}
                    </td>

                    {/* Tên khách hàng / Công ty */}
                    <td className="py-4 px-4 space-y-1">
                      <div className="font-bold text-slate-800 dark:text-slate-300">{c.name}</div>
                      {c.companyName ? (
                        <div className="flex items-center gap-1 text-[10px] text-slate-450 dark:text-slate-400 font-semibold italic">
                          <Building className="h-3 w-3 flex-shrink-0 text-slate-400" />
                          <span>{c.companyName}</span>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Khách cá nhân</span>
                      )}
                    </td>

                    {/* Số điện thoại */}
                    <td className="py-4 px-4 font-bold text-slate-650 dark:text-slate-400">
                      {c.phone}
                    </td>

                    {/* Zalo */}
                    <td className="py-4 px-4">
                      {c.zalo ? (
                        <span className="font-semibold text-sky-500">{c.zalo}</span>
                      ) : (
                        <span className="text-slate-400 italic font-normal">-</span>
                      )}
                    </td>

                    {/* Loại khách */}
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
                        CUSTOMER_TYPE_COLORS[c.customerType] || 'border-slate-200 text-slate-600'
                      }`}>
                        {CUSTOMER_TYPES[c.customerType] || c.customerType}
                      </span>
                    </td>

                    {/* Nguồn khách */}
                    <td className="py-4 px-4 font-bold text-slate-650 dark:text-slate-405">
                      {CUSTOMER_SOURCES[c.source] || c.source}
                    </td>

                    {/* Công nợ */}
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

                    {/* Trạng thái */}
                    <td className="py-4 px-4">
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                        c.status === 'ACTIVE'
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                          : 'bg-rose-500/10 text-rose-600 dark:text-rose-450 border border-rose-500/20'
                      }`}>
                        {c.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
                      </span>
                    </td>

                    {/* Ngày tạo */}
                    <td className="py-4 px-4 text-slate-450 dark:text-slate-500">
                      {formatDate(c.createdAt)}
                    </td>

                    {/* Hành động */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* Chi tiết */}
                        <Link 
                          href={`/dashboard/customers/${c.id}`}
                          title="Xem chi tiết hồ sơ"
                          className="p-1.5 rounded-lg bg-slate-100 hover:bg-teal-500/10 hover:text-teal-600 text-slate-600 dark:bg-slate-800 dark:hover:bg-teal-500/10 dark:text-slate-350 dark:hover:text-teal-400 transition-all flex items-center justify-center cursor-pointer active:scale-90"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Link>
                        
                        {/* Sửa */}
                        {canMutate && (
                          <button 
                            onClick={() => handleOpenEditModal(c)}
                            title="Sửa hồ sơ"
                            className="p-1.5 rounded-lg bg-slate-100 hover:bg-indigo-500/10 hover:text-indigo-600 text-slate-600 dark:bg-slate-800 dark:hover:bg-indigo-500/10 dark:text-slate-350 dark:hover:text-indigo-400 transition-all flex items-center justify-center cursor-pointer active:scale-90"
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                        )}

                        {/* Khóa/Mở */}
                        {canChangeStatus && (
                          <button 
                            onClick={() => handleToggleStatus(c)}
                            title={c.status === 'ACTIVE' ? 'Khóa khách hàng' : 'Mở khóa khách hàng'}
                            className={`p-1.5 rounded-lg transition-all flex items-center justify-center cursor-pointer active:scale-90 ${
                              c.status === 'ACTIVE'
                                ? 'bg-slate-100 hover:bg-rose-500/10 hover:text-rose-600 text-slate-600 dark:bg-slate-800 dark:hover:bg-rose-500/10 dark:text-slate-350'
                                : 'bg-slate-100 hover:bg-emerald-500/10 hover:text-emerald-600 text-slate-600 dark:bg-slate-800 dark:hover:bg-emerald-500/10 dark:text-slate-350'
                            }`}
                          >
                            {c.status === 'ACTIVE' ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="h-14 w-14 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 dark:text-slate-500 mb-4">
              <User className="h-7 w-7" />
            </div>
            <h4 className="text-sm font-bold text-slate-850 dark:text-white mb-1">Không tìm thấy khách hàng</h4>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">Thử nhập tìm kiếm từ khóa khác hoặc điều chỉnh các bộ lọc để có thêm kết quả.</p>
          </div>
        )}
      </div>

      {/* FORM MODAL SHEET (Thêm/Sửa Khách hàng) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <PlusCircle className="h-5 w-5 text-teal-500" />
                <span>{editingCustomer ? `Cập nhật Khách hàng ${editingCustomer.customerCode}` : 'Thêm Khách hàng mới'}</span>
              </h3>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 flex items-center justify-center cursor-pointer transition-colors"
              >
                <X className="h-4.5 w-4.5" />
              </button>
            </div>

            {/* Form Error Alert */}
            {formError && (
              <div className="flex items-center gap-2.5 p-4 rounded-xl text-xs bg-rose-500/10 text-rose-400 border border-rose-500/20">
                <AlertCircle className="h-4.5 w-4.5 flex-shrink-0" />
                <span>{formError}</span>
              </div>
            )}

            {/* Form Body */}
            <form onSubmit={handleFormSubmit} className="space-y-6">
              
              {/* PHÂN NHÓM A: THÔNG TIN CHÍNH */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold tracking-wider uppercase text-teal-500 border-l-2 border-teal-500 pl-2">
                  A. Thông tin liên hệ chính
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tên khách hàng */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-name">
                      Tên khách hàng <strong className="text-rose-500">*</strong>
                    </label>
                    <input
                      id="form-name"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      placeholder="Nguyễn Văn A"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  {/* Số điện thoại */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-phone">
                      Số điện thoại <strong className="text-rose-500">*</strong>
                    </label>
                    <input
                      id="form-phone"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  {/* Số Zalo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-zalo">
                      Zalo (nếu có)
                    </label>
                    <input
                      id="form-zalo"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      placeholder="0912345678"
                      value={zalo}
                      onChange={(e) => setZalo(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  {/* Email */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-email">
                      Địa chỉ Email
                    </label>
                    <input
                      id="form-email"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      placeholder="contact@example.com"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              {/* PHÂN NHÓM B: THÔNG TIN DOANH NGHIỆP */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold tracking-wider uppercase text-teal-500 border-l-2 border-teal-500 pl-2">
                  B. Thông tin doanh nghiệp (Tùy chọn)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Tên công ty */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-company">
                      Tên doanh nghiệp / Đơn vị công tác
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-450" />
                      <input
                        id="form-company"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        placeholder="Công ty Cổ phần A"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                  {/* Mã số thuế */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-tax">
                      Mã số thuế
                    </label>
                    <input
                      id="form-tax"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      placeholder="0102030405"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  {/* Địa chỉ doanh nghiệp */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-address">
                      Địa chỉ nhận hóa đơn / hàng hóa
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-450" />
                      <input
                        id="form-address"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        placeholder="Số 10 Lê Duẩn, Quận 1, TP. HCM"
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHÂN NHÓM C: PHÂN LOẠI */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold tracking-wider uppercase text-teal-500 border-l-2 border-teal-500 pl-2">
                  C. Phân loại & Nguồn tìm thấy
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Loại khách */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Phân loại khách hàng
                    </label>
                    <select
                      value={customerType}
                      onChange={(e) => setCustomerType(e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer font-medium"
                    >
                      {Object.entries(CUSTOMER_TYPES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {/* Nguồn khách */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Nguồn tiếp cận khách hàng
                    </label>
                    <select
                      value={source}
                      onChange={(e) => setSource(e.target.value)}
                      disabled={isPending}
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-850 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer font-medium"
                    >
                      {Object.entries(CUSTOMER_SOURCES).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  {/* Tags */}
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-tags">
                      Tags (phân cách bởi dấu phẩy)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-450" />
                      <input
                        id="form-tags"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        placeholder="VIP, Regular, Kho_tinh"
                        value={tags}
                        onChange={(e) => setTags(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* PHÂN NHÓM D: GHI CHÚ */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold tracking-wider uppercase text-teal-500 border-l-2 border-teal-500 pl-2">
                  D. Ghi chú nội bộ
                </h4>
                <div className="space-y-1.5">
                  <textarea
                    id="form-note"
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[80px]"
                    placeholder="Nhập các đặc thù cần lưu ý của khách..."
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    disabled={isPending}
                  />
                </div>
              </div>

              {/* Modal Footer Actions */}
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={isPending}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-350 hover:bg-slate-100 dark:hover:bg-slate-800 text-xs font-bold cursor-pointer disabled:opacity-50 transition-colors"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer disabled:pointer-events-none shadow-md shadow-teal-500/10 transition-colors"
                >
                  {isPending ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Đang lưu...</span>
                    </>
                  ) : (
                    <span>Lưu thông tin</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
