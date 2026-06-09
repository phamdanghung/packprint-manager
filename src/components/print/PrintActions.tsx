'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Printer, Download, ArrowLeft } from 'lucide-react';

export default function PrintActions() {
  const router = useRouter();

  return (
    <div className="print:hidden fixed top-0 left-0 w-full bg-slate-900 text-white p-4 shadow-md z-50 flex justify-between items-center">
      <button 
        onClick={() => router.back()} 
        className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> Quay lại
      </button>
      
      <div className="flex gap-3">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 px-6 py-2 rounded-lg text-sm font-bold transition-colors shadow-lg shadow-teal-900/50"
        >
          <Printer className="w-4 h-4" /> In / Xuất PDF
        </button>
      </div>
    </div>
  );
}
