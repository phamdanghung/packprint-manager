'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { QrCode, Factory, AlertCircle, Copy, CheckCircle2, Printer } from 'lucide-react';
import { createPaymentRequest, reportPaymentRequestPaid } from '@/lib/payment-request-actions';
import { sendOrderToProductionMobile } from '@/lib/production-actions';
import { toast } from 'react-hot-toast';

export default function OrderDetailMobileClient({ order, user }: { order: any, user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  
  // QR State
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrAmount, setQrAmount] = useState(order.debtAmount);
  const [generatedQr, setGeneratedQr] = useState<any>(null);

  // Send to Production State
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);

  const handleGenerateQR = async () => {
    if (qrAmount <= 0) return toast.error('Số tiền phải lớn hơn 0');
    if (qrAmount > order.debtAmount && user.role === 'SALES') {
      return toast.error(`Số tiền (${qrAmount}) không được vượt quá số còn nợ (${order.debtAmount})`);
    }

    setLoading(true);
    try {
      const res = await createPaymentRequest({
        amount: Number(qrAmount),
        sourceType: 'ORDER',
        orderId: order.id,
        customerId: order.customerId
      });
      if (res.success) {
        setGeneratedQr(res.data);
      } else {
        toast.error((res as any).error || 'Lỗi tạo QR');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleReportPaid = async () => {
    if (!generatedQr) return;
    setLoading(true);
    try {
      const res = await reportPaymentRequestPaid(generatedQr.id);
      if (res.success) {
        toast.success('Đã báo khách chuyển khoản thành công!');
        setGeneratedQr({ ...generatedQr, status: 'PAID_REPORTED' });
        router.refresh();
      } else {
        toast.error((res as any).error || 'Lỗi báo cáo');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSendToProduction = async () => {
    if (!confirm('Gửi đơn hàng này xuống bộ phận sản xuất?')) return;
    
    setLoading(true);
    try {
      const res = await sendOrderToProductionMobile(order.id);
      if (res.success) {
        toast.success('Đã gửi sản xuất thành công!');
        router.refresh();
      } else {
        if ((res as any).missingFields) {
          setMissingFields((res as any).missingFields);
          setShowErrorModal(true);
        } else {
          toast.error((res as any).error || 'Lỗi gửi sản xuất');
        }
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="grid grid-cols-2 gap-3 mt-6">
        <button 
          onClick={() => { setQrAmount(order.debtAmount); setShowQrModal(true); }}
          className="bg-purple-50 border border-purple-200 text-purple-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm"
        >
          <QrCode className="w-5 h-5" /> Thanh toán
        </button>
        <button 
          onClick={() => router.push(`/dashboard/print/orders/${order.id}`)}
          className="bg-blue-50 text-blue-700 border border-blue-200 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm"
        >
          <Printer className="w-4 h-4" /> In / Xuất PDF
        </button>

        {order.productionJob ? (
          <Link 
            href={`/dashboard/production/${order.productionJob.id}/trace`}
            className="bg-teal-50 border border-teal-200 text-teal-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm"
          >
            <Factory className="w-5 h-5" /> Xem tiến độ
          </Link>
        ) : (
          <button 
            onClick={handleSendToProduction}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 text-white font-bold py-3 rounded-xl shadow-md flex justify-center items-center gap-2 disabled:opacity-50"
          >
            <Factory className="w-5 h-5" /> 
            {loading ? 'Đang gửi...' : 'Gửi sản xuất'}
          </button>
        )}
      </div>

      {/* QR Modal */}
      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg text-slate-800">Tạo QR Thanh toán</h3>
              <p className="text-xs text-slate-500">Cho đơn hàng {order.orderCode}</p>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {!generatedQr ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Số tiền thanh toán (VNĐ)</label>
                    <input 
                      type="number" 
                      value={qrAmount}
                      onChange={e => setQrAmount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-bold text-lg text-teal-600"
                    />
                    <p className="text-xs text-slate-500 mt-1">Còn nợ: {order.debtAmount.toLocaleString()}đ</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setQrAmount(Math.round(order.debtAmount * 0.5))} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">50% nợ</button>
                    <button onClick={() => setQrAmount(order.debtAmount)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">Tất toán</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center text-center">
                  <div className="w-64 h-64 bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center p-2">
                    <img src={generatedQr.qrUrl} alt="VietQR" className="max-w-full max-h-full object-contain mix-blend-multiply" />
                  </div>
                  <p className="font-bold text-teal-600 text-2xl">{generatedQr.amount.toLocaleString()}đ</p>
                  
                  {generatedQr.bankAccount && (
                    <div className="bg-slate-50 w-full rounded-xl p-3 mt-4 text-left border border-slate-100">
                      <p className="text-xs text-slate-500 mb-1">Ngân hàng</p>
                      <p className="font-bold text-slate-800 text-sm mb-3">{generatedQr.bankAccount.bankName}</p>
                      
                      <p className="text-xs text-slate-500 mb-1">Chủ tài khoản</p>
                      <p className="font-bold text-slate-800 text-sm mb-3 uppercase">{generatedQr.bankAccount.accountHolder}</p>
                      
                      <p className="text-xs text-slate-500 mb-1">Số tài khoản</p>
                      <div className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg mb-3">
                        <span className="font-bold text-slate-800">{generatedQr.bankAccount.accountNumber}</span>
                        <button onClick={() => { navigator.clipboard.writeText(generatedQr.bankAccount.accountNumber); toast.success('Đã copy số tài khoản'); }} className="text-teal-600 p-1"><Copy className="w-4 h-4"/></button>
                      </div>

                      <p className="text-xs text-slate-500 mb-1">Nội dung chuyển khoản</p>
                      <div className="flex justify-between items-center bg-white border border-slate-200 p-2 rounded-lg">
                        <span className="font-bold text-slate-800">{generatedQr.transferContent}</span>
                        <button onClick={() => { navigator.clipboard.writeText(generatedQr.transferContent); toast.success('Đã copy nội dung'); }} className="text-teal-600 p-1"><Copy className="w-4 h-4"/></button>
                      </div>
                    </div>
                  )}

                  {generatedQr.status === 'PENDING' && (
                    <div className="mt-4 bg-amber-50 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">Đang chờ thanh toán</div>
                  )}
                  {generatedQr.status === 'PAID_REPORTED' && (
                    <div className="mt-4 flex items-center gap-1 bg-blue-50 text-blue-700 px-3 py-1 rounded-full text-xs font-bold border border-blue-200">
                      <CheckCircle2 className="w-4 h-4" /> Khách đã thanh toán
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="p-4 border-t flex gap-3">
              <button 
                onClick={() => { setShowQrModal(false); setGeneratedQr(null); }}
                className="flex-1 bg-slate-100 text-slate-700 py-3 rounded-xl font-bold"
              >
                Đóng
              </button>
              {!generatedQr ? (
                <button 
                  onClick={handleGenerateQR}
                  disabled={loading}
                  className="flex-1 bg-purple-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? 'Đang tạo...' : 'Tạo QR'}
                </button>
              ) : generatedQr.status === 'PENDING' ? (
                <button 
                  onClick={handleReportPaid}
                  disabled={loading}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold disabled:opacity-50"
                >
                  {loading ? 'Đang xử lý...' : 'Đã thu tiền'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}

      {/* Pre-flight Error Modal */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col p-5">
            <div className="flex items-center gap-3 text-red-600 mb-4">
              <AlertCircle className="w-8 h-8" />
              <h3 className="font-bold text-lg">Chưa thể gửi sản xuất!</h3>
            </div>
            
            <p className="text-sm text-slate-600 mb-3">Vui lòng bổ sung các thông tin sau trước khi gửi sản xuất:</p>
            <ul className="list-disc pl-5 text-sm text-slate-700 space-y-1 mb-6">
              {missingFields.map((f, i) => (
                <li key={i}>{f}</li>
              ))}
            </ul>

            <button 
              onClick={() => setShowErrorModal(false)}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold py-3 rounded-xl transition-colors"
            >
              Đã hiểu
            </button>
          </div>
        </div>
      )}
    </>
  );
}
