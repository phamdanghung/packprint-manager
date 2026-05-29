import React from 'react';
import { Cpu, Search, Calendar, User, CheckCircle2, Clock, AlertTriangle } from 'lucide-react';
import { db } from '@/lib/db';
import { formatDate } from '@/lib/utils';

export default async function ProductionPage() {
  const orders = await db.order.findMany({
    where: {
      status: {
        in: ['PRODUCING', 'DESIGN_APPROVED']
      }
    },
    include: {
      customer: true,
      productionSteps: true
    },
    orderBy: {
      deliveryDate: 'asc'
    }
  });

  const getStepStatus = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return { label: 'Đã hoàn thành', bg: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20' };
      case 'PROCESSING':
        return { label: 'Đang gia công', bg: 'bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20' };
      case 'PENDING':
        return { label: 'Đang chờ', bg: 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-450 border border-slate-200 dark:border-slate-700/50' };
      default:
        return { label: status, bg: 'bg-slate-100' };
    }
  };

  return (
    <div className="space-y-6 font-sans">
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Tiến độ Sản xuất vận hành</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">Theo dõi chi tiết các ca máy in, bế hộp thành phẩm, gia công dán cạnh và đóng gói xuất xưởng hàng bao bì.</p>
      </div>

      {/* Main Boards */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/80 rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="text-sm font-bold text-slate-800 dark:text-white">Lệnh sản xuất trong xưởng</h3>
        
        <div className="space-y-4">
          {orders.length > 0 ? (
            orders.map((o) => (
              <div key={o.id} className="p-5 border border-slate-100 dark:border-slate-800 rounded-2xl space-y-4 hover:border-teal-500/20 transition-all">
                {/* Order Top */}
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-3 pb-3 border-b border-slate-100 dark:border-slate-800/80">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-slate-800 dark:text-white">{o.orderNumber}</span>
                    <p className="text-[10px] text-slate-500">Khách hàng: <strong>{o.customer.name}</strong></p>
                  </div>
                  
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 font-medium">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" />
                      <span>Hẹn giao: <strong>{formatDate(o.deliveryDate)}</strong></span>
                    </div>
                  </div>
                </div>

                {/* Steps Detailed */}
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                  {['IN_AN', 'BE_THANH_PHAM', 'DAN_GIAO', 'DONG_GOI'].map((stepName) => {
                    const step = o.productionSteps.find(s => s.stepName === stepName);
                    const statusInfo = getStepStatus(step?.status || 'PENDING');
                    
                    const getStepTitle = (name: string) => {
                      if (name === 'IN_AN') return '1. Ca In ấn Offset';
                      if (name === 'BE_THANH_PHAM') return '2. Bế thành phẩm';
                      if (name === 'DAN_GIAO') return '3. Gia công Dán';
                      return '4. Đóng gói & KCS';
                    };

                    return (
                      <div key={stepName} className="p-3 bg-slate-50 dark:bg-slate-950/40 rounded-xl space-y-2 border border-slate-100/50 dark:border-slate-900/30">
                        <span className="text-[10px] font-bold text-slate-650 dark:text-slate-400 block">{getStepTitle(stepName)}</span>
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-bold ${statusInfo.bg}`}>
                            {statusInfo.label}
                          </span>
                          
                          {step?.assignedTo && (
                            <span className="text-[9px] text-slate-500 font-medium flex items-center gap-1">
                              <User className="h-3 w-3 text-slate-400" />
                              {step.assignedTo}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-8 text-slate-400 dark:text-slate-500 italic">Không có lệnh sản xuất nào đang chạy.</div>
          )}
        </div>
      </div>
    </div>
  );
}
