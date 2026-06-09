import React from 'react';
import { getCompanyProfile } from '@/lib/print-documents/helpers';

export default async function PrintFooter({ customNotes }: { customNotes?: string[] }) {
  const profile = await getCompanyProfile();
  
  return (
    <div className="mt-8 border-t border-slate-300 pt-4 pb-8 break-inside-avoid">
      {customNotes && customNotes.length > 0 && (
        <div className="mb-6 text-[11px] text-slate-700 italic">
          <p className="font-bold mb-1">Ghi chú & Điều khoản:</p>
          <ul className="list-disc pl-4 space-y-0.5">
            {customNotes.map((note, idx) => (
              <li key={idx}>{note}</li>
            ))}
          </ul>
        </div>
      )}
      
      <div className="text-center text-[10px] text-slate-500 mt-8 font-medium">
        Cảm ơn Quý khách đã sử dụng dịch vụ của <span className="font-bold">{profile?.brandName || 'In Siêu Tốc'}</span>!
      </div>
    </div>
  );
}
