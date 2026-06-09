'use client';

import { useState } from 'react';
import { createConversionForOrder } from '@/lib/inventory-actions';
import { useRouter } from 'next/navigation';

export default function ConversionSuggester({ 
  orderId, 
  productionJobId, 
  fulfillmentData 
}: { 
  orderId?: string;
  productionJobId?: string;
  fulfillmentData: any;
}) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  if (fulfillmentData.status !== 'AVAILABLE_AFTER_CONVERSION' && fulfillmentData.status !== 'MISSING_RECIPE') {
    return null;
  }

  const handleConvert = async (recipeId: string, parentMaterialId: string) => {
    if (!confirm('Xác nhận tạo phiếu cắt giấy? Kho sẽ trừ giấy mẹ và cộng giấy con.')) return;
    setIsSubmitting(true);
    try {
      const res = await createConversionForOrder({
        orderId,
        productionJobId,
        childMaterialId: fulfillmentData.childMaterialId,
        parentMaterialId,
        requiredChildQtyBase: fulfillmentData.requiredChildQtyBase,
        recipeId
      });
      if (res.success) {
        alert('Tạo phiếu cắt giấy thành công!');
        router.refresh();
      } else {
        alert('Có lỗi xảy ra');
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi hệ thống');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="mt-2 p-3 bg-orange-50 border border-orange-200 rounded-lg text-sm">
      <div className="font-bold text-orange-800 mb-2">
        Thiếu {fulfillmentData.shortageChildQtyBase} tờ con. 
        {fulfillmentData.status === 'MISSING_RECIPE' ? ' Không có định mức cắt.' : ' Có thể cắt từ giấy mẹ:'}
      </div>
      
      {fulfillmentData.status === 'AVAILABLE_AFTER_CONVERSION' && (
        <div className="space-y-2">
          {fulfillmentData.parentOptions.map((opt: any) => (
            <div key={opt.recipeId} className="flex justify-between items-center p-2 bg-white rounded border">
              <div>
                <p className="font-semibold text-slate-700">{opt.parentMaterialName}</p>
                <p className="text-slate-500 text-xs">
                  {opt.note}. Cần cắt {opt.requiredParentQtyBase} tờ mẹ (Kho còn {opt.parentAvailableQtyBase}). 
                  Dư sau cắt: {opt.wasteChildQtyBase} tờ con.
                </p>
              </div>
              {opt.canFulfill ? (
                <button 
                  onClick={() => handleConvert(opt.recipeId, opt.parentMaterialId)}
                  disabled={isSubmitting}
                  className="px-3 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded text-xs font-bold disabled:opacity-50"
                >
                  {isSubmitting ? 'Đang tạo...' : 'Tạo phiếu cắt'}
                </button>
              ) : (
                <span className="text-red-500 text-xs font-bold">Không đủ giấy mẹ</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
