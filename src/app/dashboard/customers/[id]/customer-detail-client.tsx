'use client';

import React, { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Building, 
  Phone, 
  Mail, 
  MapPin, 
  MessageSquare, 
  Tag, 
  Calendar, 
  FileText, 
  ShoppingBag, 
  DollarSign, 
  Download, 
  Edit3, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertCircle,
  X,
  Loader2
} from 'lucide-react';
import { formatCurrencyVND, formatVND, formatDate, getRoleName, getOrderStatusBadge } from '@/lib/utils';
import { updateCustomer } from '@/lib/customer-actions';

interface CustomerDetailClientProps {
  customer: any;
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

const CUSTOMER_SOURCES: Record<string, string> = {
  FACEBOOK: 'Facebook',
  ZALO: 'Zalo',
  TIKTOK: 'TikTok',
  GOOGLE: 'Google',
  REFERRAL: 'Giới thiệu',
  WALK_IN: 'Khách trực tiếp',
  OTHER: 'Khác'
};

const TABS = [
  { id: 'general', name: 'Thông tin chung' },
  { id: 'quotes', name: 'Báo giá' },
  { id: 'orders', name: 'Đơn hàng' },
  { id: 'payments', name: 'Công nợ & Lịch sử' },
  { id: 'files', name: 'File đã lưu' },
  { id: 'notes', name: 'Ghi chú' }
];

export default function CustomerDetailClient({ customer, userRole }: CustomerDetailClientProps) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('general');
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // States cho Form chỉnh sửa
  const [name, setName] = useState(customer.name || '');
  const [phone, setPhone] = useState(customer.phone || '');
  const [zalo, setZalo] = useState(customer.zalo || '');
  const [email, setEmail] = useState(customer.email || '');
  const [address, setAddress] = useState(customer.address || '');
  const [customerType, setCustomerType] = useState(customer.customerType || 'RETAIL');
  const [source, setSource] = useState(customer.source || 'OTHER');
  const [taxCode, setTaxCode] = useState(customer.taxCode || '');
  const [companyName, setCompanyName] = useState(customer.companyName || '');
  const [note, setNote] = useState(customer.note || '');
  const [tags, setTags] = useState(customer.tags || '');

  const [isPending, startTransition] = useTransition();
  const [formError, setFormError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);

  const canMutate = ['ADMIN', 'MANAGER', 'SALES'].includes(userRole);

  const showToast = (type: 'success' | 'error', msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  // Tính toán các số liệu tài chính từ SQLite Data nạp lên
  const totalQuotesCount = customer.quotes?.length || 0;
  const totalOrdersCount = customer.orders?.length || 0;
  
  const totalRevenue = customer.orders?.reduce((acc: number, curr: any) => {
    // Chỉ tính doanh số của các đơn hàng không bị hủy
    if (curr.status !== 'CANCELLED') {
      return acc + curr.totalAmount;
    }
    return acc;
  }, 0) || 0;

  const lastPurchaseDate = customer.orders?.length > 0 
    ? customer.orders[0].createdAt 
    : null;

  // Thu thập lịch sử thanh toán thực tế của khách hàng từ các đơn hàng
  const paymentHistory: any[] = [];
  customer.orders?.forEach((order: any) => {
    if (order.payments && order.payments.length > 0) {
      order.payments.forEach((payment: any) => {
        paymentHistory.push({
          ...payment,
          orderNumber: order.orderCode
        });
      });
    }
  });
  // Sắp xếp lịch sử thanh toán mới nhất lên đầu
  paymentHistory.sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime());

  // Thu thập danh sách tệp thiết kế đã lưu
  const designFilesList: any[] = [];
  customer.orders?.forEach((order: any) => {
    if (order.designFiles && order.designFiles.length > 0) {
      order.designFiles.forEach((file: any) => {
        designFilesList.push({
          ...file,
          orderNumber: order.orderCode
        });
      });
    }
  });

  // Submit cập nhật hồ sơ khách hàng
  const handleFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

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
      const res = await updateCustomer(customer.id, payload);
      if (res.success) {
        showToast('success', `Đã cập nhật hồ sơ khách hàng ${customer.customerCode} thành công.`);
        setIsModalOpen(false);
        router.refresh();
        // Reload nhẹ để đồng bộ
        setTimeout(() => window.location.reload(), 500);
      } else {
        setFormError(res.error || 'Lỗi cập nhật dữ liệu.');
      }
    });
  };

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

      {/* Navigation & Actions Top */}
      <div className="flex items-center justify-between">
        <Link 
          href="/dashboard/customers"
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer group"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Danh sách khách hàng</span>
        </Link>
      </div>

      {/* Customer Hero Card */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-start gap-4">
          <div className="h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 flex items-center justify-center font-bold text-lg flex-shrink-0">
            {customer.name ? customer.name.substring(0, 2).toUpperCase() : 'KH'}
          </div>
          
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-extrabold text-teal-600 bg-teal-500/10 px-2 py-0.5 rounded-md">{customer.customerCode}</span>
              <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-none">{customer.name}</h2>
              <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold border ${
                CUSTOMER_TYPE_COLORS[customer.customerType] || 'border-slate-200 text-slate-600'
              }`}>
                {CUSTOMER_TYPES[customer.customerType] || customer.customerType}
              </span>
            </div>

            <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-slate-500">
              <div className="flex items-center gap-1">
                <Phone className="h-3.5 w-3.5 text-slate-400" />
                <strong>{customer.phone}</strong>
              </div>
              {customer.email && (
                <div className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5 text-slate-400" />
                  <span>{customer.email}</span>
                </div>
              )}
              <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-extrabold uppercase ${
                customer.status === 'ACTIVE'
                  ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/10'
                  : 'bg-rose-500/10 text-rose-600 border border-rose-500/10'
              }`}>
                {customer.status === 'ACTIVE' ? 'Đang hoạt động' : 'Ngưng hoạt động'}
              </span>
            </div>
          </div>
        </div>

        {canMutate && (
          <button 
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-slate-900 hover:bg-slate-800 dark:bg-slate-800 dark:hover:bg-slate-700 text-white shadow-sm active:scale-95 transition-all cursor-pointer"
          >
            <Edit3 className="h-4 w-4" />
            <span>Sửa hồ sơ khách</span>
          </button>
        )}
      </div>

      {/* 5 Financial Statistical Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Số báo giá */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-1 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Số báo giá</span>
            <FileText className="h-4.5 w-4.5 text-indigo-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-850 dark:text-white">{totalQuotesCount}</h3>
          <p className="text-[9px] text-slate-400">Báo giá đã lập</p>
        </div>

        {/* Số đơn hàng */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-1 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Đơn hàng</span>
            <ShoppingBag className="h-4.5 w-4.5 text-teal-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-850 dark:text-white">{totalOrdersCount}</h3>
          <p className="text-[9px] text-slate-400">Đơn hàng sản xuất</p>
        </div>

        {/* Doanh thu tích lũy */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-1 hover:shadow-md transition-all col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Doanh thu mua</span>
            <DollarSign className="h-4.5 w-4.5 text-emerald-500" />
          </div>
          <h3 className="text-xl font-extrabold text-slate-850 dark:text-white">{formatVND(totalRevenue)}</h3>
          <p className="text-[9px] text-slate-400">Tích lũy thực tế</p>
        </div>

        {/* Dư nợ hiện tại */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-1 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Dư nợ</span>
            <DollarSign className="h-4.5 w-4.5 text-amber-500" />
          </div>
          <h3 className={`text-xl font-extrabold ${
            customer.debtBalance > 0 
              ? 'text-amber-500' 
              : customer.debtBalance < 0 
                ? 'text-blue-500' 
                : 'text-teal-600'
          }`}>
            {customer.debtBalance > 0 
              ? formatVND(customer.debtBalance) 
              : customer.debtBalance < 0 
                ? `Ứng: ${formatVND(Math.abs(customer.debtBalance))}` 
                : 'Hết nợ'}
          </h3>
          <p className="text-[9px] text-slate-400">Số nợ cần thu hồi</p>
        </div>

        {/* Lần mua gần nhất */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-2xl p-4 space-y-1 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Giao dịch cuối</span>
            <Clock className="h-4.5 w-4.5 text-slate-400" />
          </div>
          <h3 className="text-sm font-extrabold text-slate-850 dark:text-white py-1">
            {lastPurchaseDate ? formatDate(lastPurchaseDate) : 'Chưa giao dịch'}
          </h3>
          <p className="text-[9px] text-slate-400">Thời điểm đặt đơn gần nhất</p>
        </div>
      </div>

      {/* Tabs Menu Navigation */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 overflow-x-auto gap-4 scrollbar-none">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`py-3 px-1.5 text-xs font-bold border-b-2 cursor-pointer transition-all flex-shrink-0 ${
              activeTab === tab.id
                ? 'border-teal-500 text-teal-600 dark:text-teal-400'
                : 'border-transparent text-slate-400 hover:text-slate-700 dark:hover:text-slate-250'
            }`}
          >
            {tab.name}
          </button>
        ))}
      </div>

      {/* Tab Workspaces */}
      <div className="min-h-[40vh]">
        
        {/* TAB 1: THÔNG TIN CHUNG */}
        {activeTab === 'general' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Left Col: Core Details */}
            <div className="md:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-5">
              <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Thông tin Hồ sơ Khách hàng</h3>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-4 text-xs">
                {/* Tên công ty */}
                <div className="space-y-1">
                  <span className="text-slate-400">Tên doanh nghiệp:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <Building className="h-4 w-4 text-slate-400" />
                    <span>{customer.companyName || <span className="italic text-slate-400 font-normal">Khách hàng cá nhân</span>}</span>
                  </div>
                </div>

                {/* Mã số thuế */}
                <div className="space-y-1">
                  <span className="text-slate-400">Mã số thuế:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-350">
                    {customer.taxCode || <span className="italic text-slate-400 font-normal">Chưa cập nhật MST</span>}
                  </div>
                </div>

                {/* Zalo */}
                <div className="space-y-1">
                  <span className="text-slate-400">Tài khoản Zalo liên hệ:</span>
                  <div className="font-bold text-sky-500 flex items-center gap-1.5">
                    <MessageSquare className="h-4 w-4" />
                    <span>{customer.zalo || <span className="italic text-slate-400 font-normal">Chưa có liên hệ Zalo</span>}</span>
                  </div>
                </div>

                {/* Email */}
                <div className="space-y-1">
                  <span className="text-slate-400">Hòm thư Email:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <Mail className="h-4 w-4 text-slate-400" />
                    <span>{customer.email || <span className="italic text-slate-400 font-normal">Chưa có địa chỉ Email</span>}</span>
                  </div>
                </div>

                {/* Địa chỉ giao nhận */}
                <div className="space-y-1 sm:col-span-2">
                  <span className="text-slate-400">Địa chỉ giao nhận hàng hóa:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{customer.address || <span className="italic text-slate-400 font-normal">Chưa cập nhật địa chỉ giao nhận</span>}</span>
                  </div>
                </div>

                {/* Nguồn tiếp cận */}
                <div className="space-y-1">
                  <span className="text-slate-400">Nguồn tiếp cận:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-300">
                    {CUSTOMER_SOURCES[customer.source] || customer.source}
                  </div>
                </div>

                {/* Người tạo hồ sơ */}
                <div className="space-y-1">
                  <span className="text-slate-400">Người tạo hồ sơ:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    <User className="h-4 w-4 text-slate-400" />
                    <span>{customer.createdBy?.name || 'Hệ thống'} <span className="text-[10px] text-slate-400 font-medium">({getRoleName(customer.createdBy?.role || 'SYSTEM')})</span></span>
                  </div>
                </div>

                {/* Sales phụ trách */}
                <div className="space-y-1">
                  <span className="text-slate-400">Sales phụ trách:</span>
                  <div className="font-semibold text-slate-800 dark:text-slate-300 flex items-center gap-1.5">
                    {customer.assignedSales ? (
                      <>
                        <User className="h-4 w-4 text-teal-500" />
                        <span className="text-teal-600">{customer.assignedSales.name}</span>
                      </>
                    ) : (
                      <span className="italic text-slate-400 font-normal">Chưa phân công</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Right Col: Tags and Side notes */}
            <div className="space-y-6">
              {/* Tags */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-bold text-slate-855 dark:text-white uppercase tracking-wider">Tags nhãn hàng</h4>
                <div className="flex flex-wrap gap-1.5">
                  {customer.tags ? (
                    customer.tags.split(',').map((tag: string, i: number) => (
                      <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-[10px] font-bold border border-slate-200 dark:border-slate-700/50">
                        <Tag className="h-3 w-3 text-slate-400" />
                        {tag.trim()}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400 italic">Chưa gắn tag phân loại</span>
                  )}
                </div>
              </div>

              {/* Note */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-3">
                <h4 className="text-xs font-bold text-slate-855 dark:text-white uppercase tracking-wider">Ghi chú nội bộ</h4>
                <p className="text-xs leading-relaxed text-slate-650 dark:text-slate-400 whitespace-pre-line">
                  {customer.note || 'Không có ghi chú đặc thù nào.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: BÁO GIÁ */}
        {activeTab === 'quotes' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm animate-fade-in">
            {customer.quotes && customer.quotes.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Mã báo giá / Ngày lập</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Chi tiết sản phẩm in</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Tổng tiền</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Người lập</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                    {customer.quotes.map((q: any) => (
                      <tr key={q.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                        <td className="py-4 px-4 space-y-1">
                          <div className="font-bold text-slate-850 dark:text-white flex items-center gap-1">
                            <FileText className="h-4 w-4 text-slate-400" />
                            <span>{q.quoteNumber}</span>
                          </div>
                          <div className="text-[10px] text-slate-500">{formatDate(q.createdAt)}</div>
                        </td>
                        <td className="py-4 px-4 max-w-[280px]">
                          {q.items && q.items.map((item: any, i: number) => (
                            <div key={i} className="space-y-0.5">
                              <span className="font-bold text-slate-750 dark:text-slate-300">{item.name}</span>
                              <div className="text-[10px] text-slate-550 flex flex-wrap gap-x-2">
                                <span>SL: <strong>{item.quantity.toLocaleString()}</strong></span>
                                <span>Kích thước: <strong>{item.widthCm}</strong></span>
                                <span>Chất liệu: <strong>{item.materialId}</strong></span>
                              </div>
                            </div>
                          ))}
                        </td>
                        <td className="py-4 px-4 text-right font-bold text-slate-800 dark:text-white">
                          {formatVND(q.totalAmount)}
                        </td>
                        <td className="py-4 px-4">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                            q.status === 'APPROVED'
                              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20'
                              : q.status === 'DRAFT'
                                ? 'bg-slate-100 text-slate-600 border border-slate-200'
                                : 'bg-rose-500/10 text-rose-600 border border-rose-500/20'
                          }`}>
                            {q.status === 'APPROVED' ? 'Đã duyệt (Lên đơn)' : q.status === 'DRAFT' ? 'Bản nháp' : 'Từ chối'}
                          </span>
                        </td>
                        <td className="py-4 px-4 text-slate-500 font-medium">
                          {q.createdBy?.name || '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 italic">
                <FileText className="h-10 w-10 text-slate-350 dark:text-slate-600 mb-2" />
                <span className="text-xs">Chưa có báo giá nào được tạo cho khách hàng này.</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 3: ĐƠN HÀNG */}
        {activeTab === 'orders' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm animate-fade-in">
            {customer.orders && customer.orders.length > 0 ? (
              <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar text-xs">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Mã đơn hàng / Ngày lập</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Quy cách in sản phẩm</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Tiến độ sản xuất</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Hạn giao</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Giá trị đơn</th>
                      <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                    {customer.orders.map((o: any) => {
                      const badge = getOrderStatusBadge(o.status);
                      
                      const getStepDotColor = (stepName: string) => {
                        const step = o.productionJob?.steps?.find((s: any) => s.stepName === stepName);
                        if (!step) return 'bg-slate-200 dark:bg-slate-800';
                        if (step.status === 'COMPLETED') return 'bg-teal-500';
                        if (step.status === 'PROCESSING') return 'bg-orange-500';
                        return 'bg-slate-300 dark:bg-slate-700';
                      };

                      return (
                        <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                          <td className="py-4 px-4 space-y-1">
                            <div className="font-bold text-slate-850 dark:text-white flex items-center gap-1.5">
                              <ShoppingBag className="h-4 w-4 text-slate-400" />
                              <span>{o.orderCode}</span>
                            </div>
                            <div className="text-[10px] text-slate-500">{formatDate(o.createdAt)}</div>
                          </td>
                          <td className="py-4 px-4 max-w-[280px]">
                            {o.items && o.items.map((item: any, i: number) => (
                              <div key={i} className="space-y-0.5">
                                <span className="font-bold text-slate-750 dark:text-slate-300">{item.name}</span>
                                <div className="text-[10px] text-slate-550 flex flex-wrap gap-x-2">
                                  <span>SL: <strong>{item.quantity.toLocaleString()}</strong></span>
                                  <span>Chất liệu: <strong>{item.materialId}</strong></span>
                                </div>
                              </div>
                            ))}
                          </td>
                          <td className="py-4 px-4 space-y-1">
                            <div className="flex items-center gap-2">
                              <div className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${getStepDotColor('IN_AN')}`} />
                                <span className="text-[9px] text-slate-550">In</span>
                              </div>
                  <div className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${getStepDotColor('BE_THANH_PHAM')}`} />
                                <span className="text-[9px] text-slate-550">Bế</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${getStepDotColor('DAN_GIAO')}`} />
                                <span className="text-[9px] text-slate-550">Dán</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <div className={`h-2 w-2 rounded-full ${getStepDotColor('DONG_GOI')}`} />
                                <span className="text-[9px] text-slate-550">Gói</span>
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4 font-bold text-slate-700 dark:text-slate-300 whitespace-nowrap">
                            {formatDate(o.dueDate)}
                          </td>
                          <td className="py-4 px-4 text-right font-bold text-slate-800 dark:text-white whitespace-nowrap">
                            {formatVND(o.totalAmount)}
                          </td>
                          <td className="py-4 px-4 whitespace-nowrap">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold ${badge.bg} ${badge.text}`}>
                              {badge.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 italic">
                <ShoppingBag className="h-10 w-10 text-slate-350 dark:text-slate-600 mb-2" />
                <span className="text-xs">Chưa có đơn hàng sản xuất nào được đặt cho khách hàng này.</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: CÔNG NỢ & LỊCH SỬ THU TIỀN */}
        {activeTab === 'payments' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 animate-fade-in">
            {/* Cột chính: Đơn nợ & Lịch sử thanh toán */}
            <div className="md:col-span-2 space-y-6">
              
              {/* Danh sách đơn hàng còn nợ */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Danh sách Đơn hàng còn nợ</h3>
                
                {customer.orders?.filter((o: any) => o.debtAmount > 0 && o.status !== 'CANCELLED').length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Đơn hàng</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Tổng phải thu</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Đã thu</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Còn nợ</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái TT</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái Đơn</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-center">Hành động</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                        {customer.orders.filter((o: any) => o.debtAmount > 0 && o.status !== 'CANCELLED').map((o: any) => (
                          <tr key={o.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                            <td className="py-4 px-4">
                              <Link href={`/dashboard/orders/${o.id}`} className="font-bold text-teal-600 hover:underline">
                                {o.orderCode}
                              </Link>
                              <div className="text-[10px] text-slate-500 mt-1">{formatDate(o.createdAt)}</div>
                            </td>
                            <td className="py-4 px-4 text-right font-medium text-slate-800 dark:text-white whitespace-nowrap">
                              {formatCurrencyVND(o.totalAmount)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-emerald-600 whitespace-nowrap">
                              {formatCurrencyVND(o.paidAmount)}
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-rose-600 whitespace-nowrap">
                              {formatCurrencyVND(o.debtAmount)}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                                o.paymentStatus === 'PAID' ? 'bg-emerald-100 text-emerald-700' :
                                o.paymentStatus === 'PARTIAL' ? 'bg-blue-100 text-blue-700' :
                                'bg-rose-100 text-rose-700'
                              }`}>
                                {o.paymentStatus === 'UNPAID' ? 'Chưa thanh toán' : o.paymentStatus === 'PARTIAL' ? 'Thanh toán 1 phần' : o.paymentStatus === 'PAID' ? 'Đã thanh toán đủ' : o.paymentStatus === 'REFUNDED' ? 'Đã hoàn tiền' : o.paymentStatus}
                              </span>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${getOrderStatusBadge(o.status).bg} ${getOrderStatusBadge(o.status).text}`}>
                                {getOrderStatusBadge(o.status).label}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-center whitespace-nowrap">
                              <Link 
                                href={`/dashboard/orders/${o.id}`}
                                className="text-[10px] font-bold px-3 py-1.5 bg-teal-50 hover:bg-teal-100 text-teal-700 rounded-lg whitespace-nowrap"
                              >
                                Xem / Thu tiền
                              </Link>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center text-slate-500 italic py-6 text-xs">Khách hàng không còn công nợ.</div>
                )}
              </div>

              {/* Lịch sử nộp tiền */}
              <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
                <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Lịch sử Phiếu thu gần đây</h3>
                
                {paymentHistory.length > 0 ? (
                  <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80 custom-scrollbar text-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-slate-50 dark:bg-slate-900/60 text-slate-500 dark:text-slate-400 font-bold border-b border-slate-100 dark:border-slate-800">
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Mã PT / Ngày nộp</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Đơn hàng</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px] text-right">Số tiền thu</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Phương thức</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Trạng thái</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Người thu</th>
                          <th className="py-4 px-4 font-semibold uppercase tracking-wider text-[10px]">Ghi chú</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80 bg-white dark:bg-transparent">
                        {paymentHistory.slice(0, 10).map((p: any) => (
                          <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition-all">
                            <td className="py-4 px-4">
                              <div className="font-bold text-slate-800 dark:text-white">{p.paymentCode}</div>
                              <div className="text-[10px] text-slate-500 mt-1">{formatDate(p.createdAt)}</div>
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <Link href={`/dashboard/orders/${p.orderId}`} className="font-bold text-teal-600 hover:underline">
                                {p.orderNumber}
                              </Link>
                            </td>
                            <td className="py-4 px-4 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                              {formatCurrencyVND(p.amount)}
                            </td>
                            <td className="py-4 px-4 font-medium text-slate-700 dark:text-slate-300 whitespace-nowrap">
                              {p.paymentMethod}
                            </td>
                            <td className="py-4 px-4 whitespace-nowrap">
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[9px] font-bold ${
                                p.paymentStatus === 'CONFIRMED' ? 'bg-emerald-100 text-emerald-700' :
                                p.paymentStatus === 'PENDING' ? 'bg-amber-100 text-amber-700' :
                                'bg-slate-200 text-slate-700'
                              }`}>
                                {p.paymentStatus === 'CONFIRMED' ? 'Đã xác nhận' : p.paymentStatus === 'PENDING' ? 'Chờ xác nhận' : 'Đã hủy'}
                              </span>
                            </td>
                            <td className="py-4 px-4 text-slate-600 dark:text-slate-400 whitespace-nowrap">
                              {p.receivedBy?.name || p.createdBy?.name || '-'}
                            </td>
                            <td className="py-4 px-4 text-slate-500 max-w-[150px] truncate" title={p.note}>
                              {p.note || '-'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 italic">
                    <DollarSign className="h-10 w-10 text-slate-350 dark:text-slate-600 mb-2" />
                    <span className="text-xs">Chưa có phiếu thu nào.</span>
                  </div>
                )}
              </div>
            </div>

            {/* Tóm tắt nợ (Sidebar phải) */}
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-4 h-fit">
              <h4 className="text-xs font-bold text-slate-855 dark:text-white uppercase tracking-wider">Tổng quan công nợ khách</h4>
              <div className="space-y-3.5 text-xs">
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/30">
                  <span className="text-slate-500 block mb-1">Tổng công nợ hiện tại:</span>
                  <span className={`text-2xl font-extrabold block whitespace-nowrap ${
                    customer.debtBalance > 0 
                      ? 'text-rose-600' 
                      : customer.debtBalance < 0 
                        ? 'text-blue-600' 
                        : 'text-teal-600'
                  }`}>
                    {customer.debtBalance > 0 
                      ? formatCurrencyVND(customer.debtBalance) 
                      : customer.debtBalance < 0 
                        ? `Khách ứng trước: ${formatCurrencyVND(Math.abs(customer.debtBalance))}` 
                        : 'Không có nợ'}
                  </span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tổng đã mua (Doanh thu):</span>
                  <span className="font-bold text-slate-800 dark:text-slate-200">{formatCurrencyVND(totalRevenue)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Tổng đã thanh toán:</span>
                  <span className="font-bold text-emerald-600">{formatCurrencyVND(customer.orders?.reduce((sum: number, o: any) => sum + (o.status !== 'CANCELLED' ? o.paidAmount : 0), 0) || 0)}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Số đơn còn nợ:</span>
                  <span className="font-bold text-amber-600">{customer.orders?.filter((o: any) => o.debtAmount > 0 && o.status !== 'CANCELLED').length || 0}</span>
                </div>

                <div className="flex justify-between items-center py-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-slate-500">Trạng thái thanh toán:</span>
                  <span className={`font-bold ${customer.debtBalance > 0 ? 'text-rose-500' : 'text-teal-500'}`}>
                    {customer.debtBalance > 0 ? 'Đang dư nợ' : 'Hoàn tất'}
                  </span>
                </div>

                <div className="space-y-2 text-[11px] text-slate-500 leading-relaxed mt-4">
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-rose-500 mt-1 flex-shrink-0" />
                    <span>Hệ thống tự động tính tổng nợ từ các đơn hàng chưa thanh toán đủ.</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <div className="h-1.5 w-1.5 rounded-full bg-teal-500 mt-1 flex-shrink-0" />
                    <span>Để giảm nợ, cần tạo phiếu thu trong chi tiết Đơn hàng.</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: FILE ĐÃ LƯU */}
        {activeTab === 'files' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm animate-fade-in">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider mb-4">Danh sách File Final Thiết kế</h3>
            
            {designFilesList.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                {designFilesList.map((file: any) => (
                  <div key={file.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center justify-between gap-4 hover:border-teal-500/20 hover:bg-slate-50/50 dark:hover:bg-slate-950/20 transition-all">
                    <div className="space-y-1 overflow-hidden">
                      <div className="font-bold text-slate-800 dark:text-white text-xs truncate" title={file.fileName}>
                        {file.fileName}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Đơn hàng: <strong>{file.orderCode}</strong></p>
                      <span className="text-[9px] text-slate-400 block">{formatDate(file.uploadedAt)}</span>
                    </div>

                    <a 
                      href="#" 
                      className="p-2 rounded-xl bg-slate-100 hover:bg-teal-500/10 hover:text-teal-600 dark:bg-slate-800 text-slate-600 dark:text-slate-350 transition-colors cursor-pointer"
                    >
                      <Download className="h-4 w-4" />
                    </a>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-10 text-center text-slate-400 dark:text-slate-500 italic">
                <FileText className="h-10 w-10 text-slate-350 dark:text-slate-600 mb-2" />
                <span className="text-xs">Chưa có tệp thiết kế final nào được tải lên cho các đơn của khách này.</span>
              </div>
            )}
          </div>
        )}

        {/* TAB 6: GHI CHÚ */}
        {activeTab === 'notes' && (
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm animate-fade-in space-y-4">
            <h3 className="text-xs font-bold text-slate-800 dark:text-white uppercase tracking-wider">Đặc tính nội bộ & Lưu ý giao dịch</h3>
            <div className="p-5 bg-slate-50 dark:bg-slate-950/40 border border-slate-100 dark:border-slate-900/30 rounded-2xl">
              <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-350 whitespace-pre-line">
                {customer.note || 'Không có ghi chú nội bộ đặc trưng.'}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL SHEET (Chỉnh sửa Khách hàng nhanh) */}
      {isModalOpen && canMutate && (
        <div className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in font-sans">
          <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 overflow-y-auto max-h-[90vh] custom-scrollbar">
            
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Edit3 className="h-5 w-5 text-teal-500" />
                <span>Cập nhật Khách hàng {customer.customerCode}</span>
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
                  {/* Tên */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-name">
                      Tên khách hàng <strong className="text-rose-500">*</strong>
                    </label>
                    <input
                      id="form-name"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  {/* SĐT */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-phone">
                      Số điện thoại <strong className="text-rose-500">*</strong>
                    </label>
                    <input
                      id="form-phone"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  {/* Zalo */}
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-zalo">
                      Zalo (nếu có)
                    </label>
                    <input
                      id="form-zalo"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
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
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                </div>
              </div>

              {/* PHÂN NHÓM B: CÔNG TY */}
              <div className="space-y-3.5">
                <h4 className="text-[10px] font-bold tracking-wider uppercase text-teal-500 border-l-2 border-teal-500 pl-2">
                  B. Thông tin doanh nghiệp
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-company">
                      Tên doanh nghiệp / Đơn vị công tác
                    </label>
                    <div className="relative">
                      <Building className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-450" />
                      <input
                        id="form-company"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        disabled={isPending}
                      />
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-tax">
                      Mã số thuế
                    </label>
                    <input
                      id="form-tax"
                      className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
                      value={taxCode}
                      onChange={(e) => setTaxCode(e.target.value)}
                      disabled={isPending}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-address">
                      Địa chỉ nhận hàng
                    </label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-450" />
                      <input
                        id="form-address"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
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
                  C. Phân loại
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Loại khách hàng
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
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Nguồn khách hàng
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
                  <div className="space-y-1.5 sm:col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider" htmlFor="form-tags">
                      Tags (phân cách bởi dấu phẩy)
                    </label>
                    <div className="relative">
                      <Tag className="absolute left-3 top-3 h-4.5 w-4.5 text-slate-450" />
                      <input
                        id="form-tags"
                        className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 py-2.5 pl-10 pr-4 text-xs text-slate-850 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50"
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
                    className="w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-850 dark:text-white placeholder-slate-550 focus:outline-none focus:ring-2 focus:ring-teal-500/50 min-h-[80px]"
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
