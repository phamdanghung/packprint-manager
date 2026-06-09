import React from 'react';
import { formatCurrencyVND } from '@/lib/print-documents/helpers';

interface PaymentQrBlockProps {
  qrUrl: string;
  amount: number;
  transferContent: string;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
}

export default function PaymentQrBlock({
  qrUrl,
  amount,
  transferContent,
  bankName,
  accountNumber,
  accountHolder
}: PaymentQrBlockProps) {
  return (
    <div className="border-2 border-teal-600 rounded-xl p-4 flex gap-6 items-center bg-teal-50/30 break-inside-avoid">
      <div className="w-48 h-48 flex-shrink-0 bg-white p-2 rounded-lg border border-teal-200 shadow-sm">
        <img 
          src={qrUrl} 
          alt="Payment QR" 
          className="w-full h-full object-contain"
          crossOrigin="anonymous"
        />
      </div>
      <div className="flex-1">
        <h3 className="text-teal-800 font-black text-sm uppercase mb-2">Quét QR để thanh toán</h3>
        <div className="grid grid-cols-[100px_1fr] gap-y-1 text-xs">
          <div className="text-slate-500 font-medium">Ngân hàng:</div>
          <div className="font-bold text-slate-800">{bankName}</div>
          
          <div className="text-slate-500 font-medium">Số tài khoản:</div>
          <div className="font-bold text-slate-800 text-sm tracking-wider">{accountNumber}</div>
          
          <div className="text-slate-500 font-medium">Chủ tài khoản:</div>
          <div className="font-bold text-slate-800 uppercase">{accountHolder}</div>
          
          <div className="text-slate-500 font-medium mt-1">Số tiền:</div>
          <div className="font-black text-teal-700 text-base mt-1">{formatCurrencyVND(amount)}</div>
          
          <div className="text-slate-500 font-medium mt-1">Nội dung CK:</div>
          <div className="font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded inline-block w-fit mt-1 border border-red-100">
            {transferContent}
          </div>
        </div>
        <p className="text-[10px] text-slate-500 mt-2 italic">
          * Vui lòng giữ nguyên nội dung chuyển khoản để hệ thống đối soát tự động.
        </p>
      </div>
    </div>
  );
}
