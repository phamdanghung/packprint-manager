import React from 'react';
import PrintActions from './PrintActions';

export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-200 print:bg-white flex flex-col items-center py-10 print:py-0">
      <PrintActions />
      
      {/* A4 Wrapper */}
      <div className="w-[210mm] min-h-[297mm] bg-white print:w-full print:min-h-0 print:shadow-none shadow-xl mx-auto p-[15mm] print:p-0 relative text-slate-900 text-sm">
        {children}
      </div>
      
      <style dangerouslySetInnerHTML={{__html: `
        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }
          body {
            margin: 0;
            padding: 0;
            background: white !important;
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
          }
        }
      `}} />
    </div>
  );
}
