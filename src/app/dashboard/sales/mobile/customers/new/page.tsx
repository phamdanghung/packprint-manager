'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Save, AlertCircle } from 'lucide-react';
import { createCustomer } from '@/lib/customer-actions';
import { toast } from 'react-hot-toast';

export default function NewCustomerMobilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    companyName: '',
    taxCode: '',
    address: '',
    note: '',
    source: 'SALES_MOBILE'
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const trimmedPhone = formData.phone.trim();
    const trimmedName = formData.name.trim();
    
    if (!trimmedName || !trimmedPhone) {
      setError('Vui lòng nhập Tên và Số điện thoại');
      return;
    }
    
    if (trimmedPhone.length < 9) {
      setError('Số điện thoại phải có ít nhất 9 chữ số');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const submitData = { ...formData, name: trimmedName, phone: trimmedPhone };
      const res = await createCustomer(submitData as any);
      if (res.success && res.data) {
        toast.success('Thêm khách hàng thành công!');
        router.push(`/dashboard/sales/mobile/quotes/new?customerId=${res.data.id}`);
      } else {
        if (res.error?.includes('tồn tại') || res.error?.includes('Unique constraint') || res.error?.includes('Duplicate')) {
          setError('Số điện thoại này có thể đã tồn tại');
        } else {
          setError(res.error || 'Có lỗi xảy ra');
        }
        toast.error(res.error || 'Lỗi');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h1 className="text-xl font-bold text-slate-800 flex-1">Thêm khách mới</h1>
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-4 pb-24">
        {error && (
          <div className="bg-red-50 p-3 flex items-start gap-2 rounded-xl text-red-600 text-sm">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Tên khách hàng <span className="text-red-500">*</span></label>
          <input 
            type="text" 
            name="name"
            value={formData.name}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
            placeholder="VD: Anh Tuấn"
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Số điện thoại <span className="text-red-500">*</span></label>
          <input 
            type="tel" 
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
            placeholder="09..."
            required
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Email / Zalo</label>
          <input 
            type="text" 
            name="email"
            value={formData.email}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
            placeholder="Email hoặc SDT Zalo"
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Tên công ty</label>
          <input 
            type="text" 
            name="companyName"
            value={formData.companyName}
            onChange={handleChange}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
            placeholder="Công ty TNHH..."
          />
        </div>

        <div className="space-y-1">
          <label className="text-sm font-semibold text-slate-700">Địa chỉ / Ghi chú</label>
          <textarea 
            name="address"
            value={formData.address}
            onChange={handleChange}
            rows={3}
            className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500" 
            placeholder="Thông tin thêm..."
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl flex justify-center items-center gap-2 shadow-md disabled:opacity-50"
        >
          {loading ? 'Đang lưu...' : (
            <>
              <Save className="w-5 h-5" />
              Lưu & Đi tới Báo giá
            </>
          )}
        </button>
      </form>
    </div>
  );
}
