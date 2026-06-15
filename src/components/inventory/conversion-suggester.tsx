'use client';

import { useState } from 'react';
import { createConversionForOrder } from '@/lib/inventory-conversion-actions';
import { useRouter } from 'next/navigation';
import { formatCurrencyVND } from '@/lib/utils';

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

  if (
    fulfillmentData.status !== 'AVAILABLE_AFTER_CONVERSION' && 
    fulfillmentData.status !== 'MISSING_RECIPE' &&
    fulfillmentData.status !== 'INSUFFICIENT'
  ) {
    return null;
  }

  const handleConvert = async (opt: any) => {
    if (!confirm('Xác nhận tạo phiếu cắt giấy? Kho sẽ trừ giấy mẹ và cộng giấy con.')) return;
    setIsSubmitting(true);
    try {
      const res = await createConversionForOrder({
        orderId,
        productionJobId,
        childMaterialId: fulfillmentData.childMaterialId,
        parentMaterialId: opt.parentMaterialId,
        recipeId: opt.recipeId,
        requiredParentQtyBase: opt.requiredParentQtyBase,
        expectedChildQtyBase: opt.expectedChildQtyBase,
        surplusChildQtyBase: opt.surplusChildQtyBase,
        totalParentCost: opt.totalParentCost,
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
        {fulfillmentData.status === 'MISSING_RECIPE' && ' Không có định mức cắt.'}
        {fulfillmentData.status === 'INSUFFICIENT' && ' Có định mức cắt nhưng thiếu giấy mẹ.'}
        {fulfillmentData.status === 'AVAILABLE_AFTER_CONVERSION' && ' Có thể cắt từ giấy mẹ:'}
      </div>
      
      {(fulfillmentData.status === 'AVAILABLE_AFTER_CONVERSION' || fulfillmentData.status === 'INSUFFICIENT') && (
        <div className="space-y-2 mt-3">
          {fulfillmentData.parentOptions.map((opt: any, index: number) => {
            const renderBadge = (badge: string) => {
              switch (badge) {
                case 'LOWEST_COST': return <span key={badge} className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded border border-green-200">Tối ưu chi phí</span>;
                case 'LOWEST_TRIM_WASTE': return <span key={badge} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs rounded border border-blue-200">Ít hao biên</span>;
                case 'LOWEST_SURPLUS': return <span key={badge} className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded border border-yellow-200">Ít dư</span>;
                case 'PREFERRED': return <span key={badge} className="px-2 py-0.5 bg-purple-100 text-purple-700 text-xs rounded border border-purple-200">Ưu tiên kho</span>;
                case 'INSUFFICIENT_STOCK': return <span key={badge} className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded border border-red-200">Thiếu giấy mẹ</span>;
                default: return <span key={badge} className="px-2 py-0.5 bg-slate-100 text-slate-700 text-xs rounded border">{badge}</span>;
              }
            };
            return (
            <div key={opt.recipeId} className={`flex flex-col md:flex-row justify-between items-start md:items-center p-4 rounded-lg border ${index === 0 ? 'bg-orange-50 border-orange-300 shadow-sm' : 'bg-white'}`}>
              <div className="mb-4 md:mb-0 w-full md:w-3/4">
                <div className="flex gap-2 items-center mb-2">
                  <p className="font-bold text-slate-800 text-sm md:text-base">{opt.parentMaterialName}</p>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-slate-600 mb-3">
                  <div className="bg-slate-50 p-2 rounded border">
                    <div className="text-slate-400">Giấy mẹ</div>
                    <div>Tồn: <strong>{opt.parentAvailableQtyBase}</strong> tờ</div>
                    <div>Cần cắt: <strong>{opt.requiredParentQtyBase}</strong> tờ</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <div className="text-slate-400">Giấy con (Tạo ra)</div>
                    <div className="text-emerald-600 font-bold">+{opt.expectedChildQtyBase} tờ</div>
                    <div>Dư: <strong>{opt.surplusChildQtyBase}</strong> tờ</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <div className="text-slate-400">Hao hụt</div>
                    <div>Biên cắt: <strong>{opt.trimWasteRate.toFixed(1)}%</strong></div>
                    <div>({opt.totalTrimWasteAreaCm2} cm²)</div>
                  </div>
                  <div className="bg-slate-50 p-2 rounded border">
                    <div className="text-slate-400">Chi phí dự kiến</div>
                    {opt.hasCostData ? (
                      <>
                        <div className="font-bold text-red-600">{formatCurrencyVND(opt.totalParentCost)}</div>
                        <div>({formatCurrencyVND(opt.costPerExpectedChildSheet)}/tờ con)</div>
                      </>
                    ) : <div>Chưa cập nhật</div>}
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {opt.optimizationBadges?.map(renderBadge)}
                </div>
              </div>
              <div className="w-full md:w-1/4 md:text-right">
                {opt.canFulfill ? (
                  <button 
                    onClick={() => handleConvert(opt)}
                    disabled={isSubmitting}
                    className="w-full md:w-auto px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-lg text-sm font-bold shadow-md disabled:opacity-50 transition-colors"
                  >
                    {isSubmitting ? 'Đang xử lý...' : 'Chọn phương án này & tạo phiếu cắt'}
                  </button>
                ) : (
                  <span className="text-red-500 text-sm font-bold block p-2 bg-red-50 rounded border border-red-100 text-center">Không đủ giấy mẹ</span>
                )}
              </div>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
