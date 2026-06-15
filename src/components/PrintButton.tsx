'use client';

import { Printer } from 'lucide-react';

export default function PrintButton() {
  return (
    <button 
      onClick={() => window.print()}
      className="flex items-center gap-2 bg-slate-800 text-white px-4 py-2 rounded shadow hover:bg-slate-700 transition-colors"
    >
      <Printer className="h-4 w-4" />
      In tài liệu
    </button>
  );
}
