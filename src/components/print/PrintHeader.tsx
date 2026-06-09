import React from 'react';
import { getCompanyProfile } from '@/lib/print-documents/helpers';

export default async function PrintHeader({ title }: { title: string }) {
  const profile = await getCompanyProfile();
  
  const logoUrl = profile?.logoUrl || '/brand/logo.png';
  const legalName = 'CTY TNHH SX TM DV HOA SEN VIỆT';
  const companyAddress = '82/15 Đường số 2, KP29, P.Hiệp Bình, TP.HCM';
  const slogan = profile?.slogan || 'Tốc độ quyết định sự thành công';
  
  return (
    <div className="flex flex-col border-b-2 border-slate-800 pb-4 mb-8">
      <div className="flex items-center gap-6 mb-6">
        <div className="w-64 h-28 relative flex-shrink-0 flex items-center justify-center">
          <img 
            src={logoUrl} 
            alt="Logo" 
            className="w-full h-full object-contain absolute inset-0"
          />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-black text-slate-900 uppercase leading-tight mb-1">{legalName}</h1>
          <p className="text-sm font-bold text-teal-600 mb-3 italic">{slogan}</p>
          <div className="space-y-1">
            <p className="text-xs text-slate-700"><span className="font-semibold">MST:</span> {profile?.taxCode || '0313096606'}</p>
            <p className="text-xs text-slate-700"><span className="font-semibold">VP:</span> {companyAddress}</p>
            <p className="text-xs text-slate-700 mb-2"><span className="font-semibold">Xưởng:</span> {profile?.factoryAddress || '381 Nguyễn Sơn, P.Phú Thạnh, TP.HCM'}</p>
          </div>
          <div className="flex items-center gap-6 mt-2">
            <p className="text-xs text-slate-800 whitespace-nowrap"><span className="font-bold text-slate-600">Tel:</span> <span className="font-bold">{profile?.phone || '028 397 22222'}</span></p>
            <p className="text-xs text-slate-800 whitespace-nowrap"><span className="font-bold text-slate-600">Hotline/Zalo:</span> <span className="font-bold text-rose-600">{profile?.hotline || '0907.707.770'}</span></p>
            <p className="text-xs text-slate-800 whitespace-nowrap"><span className="font-bold text-slate-600">Web:</span> <span className="font-bold text-teal-700">{profile?.website || 'insieutoc.vn'}</span></p>
          </div>
        </div>
      </div>
      <div className="text-center w-full">
        <h2 className="text-2xl font-black text-slate-800 uppercase tracking-widest whitespace-nowrap">{title}</h2>
      </div>
    </div>
  );
}
