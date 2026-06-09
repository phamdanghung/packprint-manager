'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Copy, ShoppingBag, QrCode, Printer } from 'lucide-react';
import { convertQuoteToOrder } from '@/lib/order-actions';
import { createPaymentRequest } from '@/lib/payment-request-actions';
import { toast } from 'react-hot-toast';

export default function QuoteDetailMobileClient({ quote, user }: { quote: any, user: any }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrAmount, setQrAmount] = useState(quote.totalAmount);
  const [generatedQr, setGeneratedQr] = useState<any>(null);

  const handleCopy = () => {
    let text = `Báo giá ${quote.quoteNumber}\nKhách hàng: ${quote.customer.name}\n\n`;
    quote.items.forEach((item: any, index: number) => {
      text += `${index + 1}. ${item.productName}\nSL: ${item.quantity}\nĐơn giá: ${item.unitPrice?.toLocaleString()}đ\nThành tiền: ${item.totalAmount?.toLocaleString()}đ\n\n`;
    });
    text += `TỔNG CỘNG: ${quote.totalAmount?.toLocaleString()}đ\n\nTrân trọng cảm ơn!`;
    
    navigator.clipboard.writeText(text);
    toast.success('Đã copy nội dung báo giá');
  };

  const handleConvertToOrder = async () => {
    // Check ownership
    if (quote.assignedSalesId && quote.assignedSalesId !== user.id && !['ADMIN', 'MANAGER'].includes(user.role)) {
      return toast.error('Bạn không có quyền chốt báo giá của người khác');
    }

    if (!confirm('Chốt báo giá này thành đơn hàng?')) return;

    setLoading(true);
    try {
      const res = await convertQuoteToOrder(quote.id);
      if (res.success) {
        toast.success('Đã tạo đơn hàng thành công!');
        router.refresh();
      } else {
        toast.error(res.error || 'Có lỗi xảy ra');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateQR = async () => {
    if (qrAmount <= 0) return toast.error('Số tiền phải lớn hơn 0');
    setLoading(true);
    try {
      const res = await createPaymentRequest({
        amount: Number(qrAmount),
        sourceType: 'QUOTE',
        quoteId: quote.id,
        customerId: quote.customerId
      });
      if (res.success) {
        setGeneratedQr(res.data);
      } else {
        toast.error(res.error || 'Lỗi tạo QR');
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
          onClick={handleCopy}
          className="bg-white border border-slate-200 text-slate-700 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm"
        >
          <Copy className="w-4 h-4" /> Copy
        </button>
        <button 
          onClick={() => setShowQrModal(true)}
          className="bg-purple-50 text-purple-700 border border-purple-200 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm"
        >
          <QrCode className="w-4 h-4" /> Nhận Cọc
        </button>
        <button 
          onClick={() => router.push(`/dashboard/print/quotes/${quote.id}`)}
          className="bg-blue-50 text-blue-700 border border-blue-200 font-bold py-3 rounded-xl flex justify-center items-center gap-2 shadow-sm col-span-2"
        >
          <Printer className="w-4 h-4" /> In / Xuất PDF
        </button>
        <button 
          onClick={handleConvertToOrder}
          disabled={loading}
          className="col-span-2 bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-md flex justify-center items-center gap-2 disabled:opacity-50 mt-2"
        >
          <ShoppingBag className="w-5 h-5" />
          {loading ? 'Đang xử lý...' : 'Chốt đơn hàng'}
        </button>
      </div>

      {showQrModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b">
              <h3 className="font-bold text-lg text-slate-800">Tạo QR Mã Cọc</h3>
              <p className="text-xs text-slate-500">Cho báo giá {quote.quoteNumber}</p>
            </div>
            
            <div className="p-4 overflow-y-auto flex-1">
              {!generatedQr ? (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-slate-700 block mb-1">Số tiền cọc (VNĐ)</label>
                    <input 
                      type="number" 
                      value={qrAmount}
                      onChange={e => setQrAmount(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500 font-bold text-lg text-teal-600"
                    />
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => setQrAmount(Math.round(quote.totalAmount * 0.3))} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">30%</button>
                    <button onClick={() => setQrAmount(Math.round(quote.totalAmount * 0.5))} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">50%</button>
                    <button onClick={() => setQrAmount(quote.totalAmount)} className="flex-1 bg-slate-100 text-slate-600 py-2 rounded-lg text-xs font-bold hover:bg-slate-200">100%</button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-center">
                  <div className="w-64 h-64 bg-slate-100 rounded-xl mb-4 overflow-hidden flex items-center justify-center relative group">
                    <img src={generatedQr.qrUrl} alt="VietQR" className="max-w-full max-h-full object-contain" />
                  </div>
                  <p className="font-bold text-teal-600 text-xl">{generatedQr.amount.toLocaleString()}đ</p>
                  <p className="text-xs font-semibold text-slate-500 mt-2 bg-slate-100 px-3 py-1 rounded-full">Nội dung: {generatedQr.transferContent}</p>
                  <p className="text-[10px] text-slate-400 mt-2 italic">Lưu ý: Báo khách quét mã trên App Ngân Hàng</p>
                  <div className="w-full text-left space-y-2 mt-4 bg-slate-50 p-3 rounded-xl border border-slate-100">
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Số tài khoản:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700">{generatedQr.bankAccount?.accountNumber || '—'}</span>
                        <button onClick={() => { navigator.clipboard.writeText(generatedQr.bankAccount?.accountNumber || ''); toast.success('Đã copy số tài khoản'); }} className="p-1.5 bg-white shadow-sm border border-slate-200 rounded text-slate-500 hover:text-teal-600"><Copy className="w-3 h-3" /></button>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-slate-500">Nội dung:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-700 text-xs">{generatedQr.transferContent}</span>
                        <button onClick={() => { navigator.clipboard.writeText(generatedQr.transferContent || ''); toast.success('Đã copy nội dung'); }} className="p-1.5 bg-white shadow-sm border border-slate-200 rounded text-slate-500 hover:text-teal-600"><Copy className="w-3 h-3" /></button>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex w-full gap-2 mt-4">
                    <button 
                      onClick={async () => {
                        try {
                          const response = await fetch(generatedQr.qrUrl);
                          const blob = await response.blob();
                          const url = window.URL.createObjectURL(blob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `QR_Thanh_Toan_${quote.quoteNumber}.png`;
                          document.body.appendChild(link);
                          link.click();
                          document.body.removeChild(link);
                          window.URL.revokeObjectURL(url);
                          toast.success('Đã tải ảnh QR');
                        } catch (err) {
                          window.open(generatedQr.qrUrl, '_blank');
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-slate-100 text-slate-700 py-2 rounded-lg text-sm font-bold hover:bg-slate-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
                      Tải về
                    </button>
                    <button 
                      onClick={async () => {
                        try {
                          const text = `Thanh toán tạm ứng báo giá ${quote.quoteNumber}\nSố tiền: ${generatedQr.amount.toLocaleString()}đ\nNội dung: ${generatedQr.transferContent}`;
                          const fallbackText = text + `\n\nLink mã QR: ${generatedQr.qrUrl}`;
                          
                          let sharedWithFile = false;
                          if (navigator.share) {
                            try {
                              const response = await fetch(generatedQr.qrUrl);
                              const blob = await response.blob();
                              const file = new File([blob], `QR_${quote.quoteNumber}.png`, { type: blob.type });
                              if (navigator.canShare && navigator.canShare({ files: [file] })) {
                                await navigator.share({ title: 'QR Thanh Toán', text, files: [file] });
                                sharedWithFile = true;
                              }
                            } catch(e) {
                              console.log('Share with file failed, falling back to text', e);
                            }
                            
                            if (!sharedWithFile) {
                              try {
                                await navigator.share({ title: 'QR Thanh Toán', text: fallbackText });
                              } catch(e: any) {
                                if (e.name !== 'AbortError') toast.error('Không thể mở menu chia sẻ');
                              }
                            }
                          } else {
                            // Fallback to clipboard if navigator.share is missing (HTTP LAN)
                            try {
                              if (navigator.clipboard && navigator.clipboard.writeText) {
                                await navigator.clipboard.writeText(fallbackText);
                                toast.success('Đã copy thông tin thanh toán');
                              } else {
                                const textArea = document.createElement("textarea");
                                textArea.value = fallbackText;
                                document.body.appendChild(textArea);
                                textArea.select();
                                document.execCommand("copy");
                                document.body.removeChild(textArea);
                                toast.success('Đã copy thông tin thanh toán');
                              }
                            } catch(err) {
                               toast.error('Trình duyệt chặn chia sẻ & copy. Vui lòng copy thủ công!');
                            }
                          }
                        } catch (error) {
                          console.error(error);
                        }
                      }}
                      className="flex-1 flex items-center justify-center gap-2 bg-teal-50 text-teal-700 border border-teal-200 py-2 rounded-lg text-sm font-bold hover:bg-teal-100"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
                      Chia sẻ
                    </button>
                  </div>
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
              ) : (
                <button 
                  onClick={() => {
                    toast.success('Đã lưu thông báo khách chuyển khoản! Kế toán sẽ kiểm tra.');
                    setShowQrModal(false);
                  }}
                  className="flex-1 bg-teal-600 text-white py-3 rounded-xl font-bold"
                >
                  Khách đã chuyển
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
