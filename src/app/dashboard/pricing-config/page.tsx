import React from 'react';
import { Sliders, Search, Edit2, PlusCircle, Paperclip, CheckSquare, Layers } from 'lucide-react';
import { db } from '@/lib/db';
import { formatVND, formatDate } from '@/lib/utils';

export default async function PricingConfigPage() {
  const configs = await db.pricingConfig.findMany({
    orderBy: {
      category: 'asc'
    }
  });

  const getCategoryName = (cat: string) => {
    switch (cat) {
      case 'GIAY':
        return 'Chất liệu Giấy in';
      case 'MAY_IN':
        return 'Công suất & Ca máy in';
      case 'GIA_CONG':
        return 'Gia công thành phẩm';
      default:
        return cat;
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat) {
      case 'GIAY':
        return <Paperclip className="h-4.5 w-4.5 text-teal-500" />;
      case 'MAY_IN':
        return <Layers className="h-4.5 w-4.5 text-indigo-500" />;
      default:
        return <CheckSquare className="h-4.5 w-4.5 text-orange-500" />;
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Cấu hình Bảng giá Dịch vụ</h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">Điều chỉnh đơn giá nguyên vật liệu đầu vào, định mức ca máy in và đơn giá gia công cơ bản phục vụ tính dự toán báo giá tự động.</p>
        </div>
        <button className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 transition-all cursor-pointer">
          <PlusCircle className="h-4 w-4" />
          <span>Thêm Định mức mới</span>
        </button>
      </div>

      {/* Grid of pricing options */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Định mức chi phí cấu thành báo giá in ấn</h3>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {['GIAY', 'MAY_IN', 'GIA_CONG'].map((cat) => {
            const catConfigs = configs.filter(c => c.category === cat);

            return (
              <div key={cat} className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800/85">
                  {getCategoryIcon(cat)}
                  <h4 className="font-bold text-xs text-slate-800 dark:text-white uppercase tracking-wider">{getCategoryName(cat)}</h4>
                </div>

                <div className="space-y-3">
                  {catConfigs.map((c) => (
                    <div key={c.id} className="flex justify-between items-center p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl border border-slate-100/50 dark:border-slate-900/30 group">
                      <div className="space-y-0.5">
                        <span className="font-bold text-xs text-slate-700 dark:text-slate-350">{c.key}</span>
                        {c.description && (
                          <p className="text-[10px] text-slate-400 leading-relaxed max-w-[200px]">{c.description}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <span className="font-bold text-xs text-teal-600 dark:text-teal-400 block">{formatVND(c.value)}</span>
                          <span className="text-[9px] text-slate-550 italic block">Đơn vị: {c.unit}</span>
                        </div>
                        
                        <button className="p-1.5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-lg hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer">
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
