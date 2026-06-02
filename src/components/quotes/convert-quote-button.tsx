'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { convertQuoteToOrder } from '@/lib/order-actions';
import { LucideShoppingCart } from 'lucide-react';

export default function ConvertQuoteButton({ quoteId, status, disabledTitle }: { quoteId: string; status: string; disabledTitle?: string }) {
  const router = useRouter();
  const [isConverting, setIsConverting] = useState(false);

  const handleConvert = async () => {
    if (!confirm('Bạn có chắc muốn chuyển báo giá này thành đơn hàng sản xuất? Dữ liệu giá sẽ được khoá cứng.')) return;
    setIsConverting(true);
    const res = await convertQuoteToOrder(quoteId);
    if (res.success) {
      alert('Đã chuyển thành đơn hàng thành công!');
      router.push(`/dashboard/orders/${res.data?.id}`);
    } else {
      alert(res.error || 'Có lỗi xảy ra');
      setIsConverting(false);
    }
  };

  if (status === 'CONVERTED') {
    return (
      <button disabled className="bg-slate-300 text-slate-600 font-bold py-2 px-4 rounded-lg cursor-not-allowed" title="Đã chuyển thành đơn hàng">
        Đã chuyển Đơn hàng
      </button>
    );
  }

  if (status !== 'ACCEPTED') {
    return (
      <div title={disabledTitle || "Chỉ báo giá đã được khách đồng ý mới chuyển thành đơn hàng."}>
        <button disabled className="bg-slate-300 text-slate-600 font-bold py-2 px-4 rounded-lg flex items-center gap-2 cursor-not-allowed opacity-50">
          <LucideShoppingCart className="w-5 h-5" />
          Chuyển thành Đơn hàng
        </button>
      </div>
    );
  }

  return (
    <button 
      onClick={handleConvert} 
      disabled={isConverting}
      className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2 px-4 rounded-lg flex items-center gap-2 transition-colors"
    >
      <LucideShoppingCart className="w-5 h-5" />
      {isConverting ? 'Đang chuyển...' : 'Chuyển thành Đơn hàng'}
    </button>
  );
}
