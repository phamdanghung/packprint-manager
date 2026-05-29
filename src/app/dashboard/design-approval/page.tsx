import React from 'react';
import { FileCheck, Search, Image, Check, X, Eye, ArrowUpRight } from 'lucide-react';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export default async function DesignApprovalPage() {
  const pendingDesignOrders = await db.order.findMany({
    where: {
      status: {
        in: ['DESIGNING', 'DESIGN_APPROVED']
      }
    },
    include: {
      customer: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  });

  return (
    <div className="space-y-6 font-sans">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Duyệt File thiết kế</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Kiểm tra thông số kỹ thuật, marquette thiết kế và duyệt file final trước khi chuyển giao xưởng sản xuất in ấn.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Side: Pending list */}
        <div className="md:col-span-2 space-y-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
            <h3 className="text-sm font-bold text-slate-800 dark:text-white">Thiết kế chờ kiểm duyệt kỹ thuật</h3>
            
            <div className="space-y-3">
              {pendingDesignOrders.length > 0 ? (
                pendingDesignOrders.map((o) => (
                  <div key={o.id} className="p-4 border border-slate-100 dark:border-slate-800 rounded-2xl flex flex-col sm:flex-row justify-between sm:items-center gap-4 hover:border-indigo-500/20 hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-all group">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-800 dark:text-white">{o.orderNumber}</span>
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 dark:bg-indigo-950/20 dark:text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase">
                          {o.status === 'DESIGN_APPROVED' ? 'Đã duyệt' : 'Chờ file'}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Khách hàng: <strong>{o.customer.name}</strong></p>
                      {o.finalFileName ? (
                        <div className="text-[10px] text-teal-600 font-bold flex items-center gap-1">
                          <FileCheck className="h-3.5 w-3.5" />
                          <span>File: {o.finalFileName}</span>
                        </div>
                      ) : (
                        <div className="text-[10px] text-amber-600 font-bold italic">Chưa tải lên file final</div>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      <button className="p-2 bg-slate-100 dark:bg-slate-800 hover:bg-teal-500/10 hover:text-teal-600 dark:hover:text-teal-400 rounded-xl text-slate-600 dark:text-slate-350 transition-colors flex items-center justify-center cursor-pointer">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button className="px-3 py-1.5 bg-teal-500 hover:bg-teal-400 text-white rounded-xl text-[10px] font-bold shadow-md shadow-teal-500/10 transition-all flex items-center gap-1 cursor-pointer">
                        <Check className="h-3.5 w-3.5" />
                        <span>Duyệt File</span>
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic">Không có thiết kế nào chờ kiểm duyệt.</div>
              )}
            </div>
          </div>
        </div>

        {/* Right Side: Standards Checklist */}
        <div className="bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 border border-slate-800 rounded-3xl p-6 text-white space-y-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-[50%] h-[50%] bg-teal-500/5 blur-[40px] pointer-events-none" />
          <h3 className="text-sm font-bold tracking-wide text-teal-300 uppercase">Quy chuẩn kiểm duyệt File in</h3>
          
          <div className="space-y-4 text-xs text-slate-300">
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold flex-shrink-0">1</div>
              <p className="leading-relaxed">Hệ màu thiết kế bắt buộc là <strong>CMYK</strong>. Kiểm tra các chi tiết phối màu RGB để tránh lệch màu khi in thực tế.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold flex-shrink-0">2</div>
              <p className="leading-relaxed">Độ phân giải hình ảnh tối thiểu đạt <strong>300 DPI</strong>. Tránh vỡ nét, mờ hình khi phóng to.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold flex-shrink-0">3</div>
              <p className="leading-relaxed">Kiểm tra đường cấn bế, đường cắt và chừa lề cắt (bleed) tối thiểu <strong>2mm</strong> để tránh lẹm vào nội dung.</p>
            </div>
            <div className="flex gap-3">
              <div className="h-5 w-5 rounded-full bg-teal-500/20 text-teal-400 flex items-center justify-center font-bold flex-shrink-0">4</div>
              <p className="leading-relaxed">Chuyển đổi toàn bộ phông chữ sang định dạng outlines (convert text to curves) trước khi xuất file PDF final.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
