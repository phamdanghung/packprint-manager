import React from 'react';
import { QRCodeSVG } from 'qrcode.react';

interface SmartQrBlockProps {
  token: string;
}

export default function SmartQrBlock({ token }: SmartQrBlockProps) {
  // In production, you would generate absolute URL using ENV or request origin
  const scanUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'https://insieutoc.vn'}/r/${token}`;

  return (
    <div className="flex flex-col items-center justify-center p-4 border-2 border-slate-800 rounded-xl bg-white max-w-[200px]">
      <QRCodeSVG value={scanUrl} size={120} level="M" />
      <div className="mt-3 text-center">
        <div className="text-[12px] font-bold uppercase text-slate-900 leading-tight">Quét QR Cập Nhật<br/>Tiến Độ</div>
        <div className="text-[9px] text-slate-600 mt-1 leading-tight px-1">Dùng cho các bộ phận quét để bắt đầu/hoàn thành công đoạn</div>
        <div className="text-[8px] text-slate-300 break-all mt-2 font-mono">ID: {token.substring(0, 12)}...</div>
      </div>

    </div>
  );
}
