'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Smartphone, X } from 'lucide-react';

export default function SalesMobileCTA({ role }: { role: string }) {
  const [showCTA, setShowCTA] = useState(false);

  useEffect(() => {
    if (role === 'SALES') {
      const isMobile = window.innerWidth <= 768; // basic mobile detection
      const dismissed = localStorage.getItem('dismissSalesMobileCTA');
      
      if (isMobile && !dismissed) {
        setShowCTA(true);
      }
    }
  }, [role]);

  if (!showCTA) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 bg-teal-600 text-white p-4 rounded-2xl shadow-xl z-50 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="bg-teal-500 p-2 rounded-full">
          <Smartphone className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="text-sm font-bold">Chuyển sang giao diện Mobile?</p>
          <p className="text-[10px] text-teal-100">Dành riêng cho Sales làm việc trên điện thoại</p>
        </div>
      </div>
      
      <div className="flex items-center gap-2">
        <Link 
          href="/dashboard/sales/mobile" 
          className="bg-white text-teal-700 text-xs font-bold py-2 px-3 rounded-xl shadow-sm"
        >
          Trải nghiệm ngay
        </Link>
        <button 
          onClick={() => {
            localStorage.setItem('dismissSalesMobileCTA', 'true');
            setShowCTA(false);
          }}
          className="p-2 bg-teal-700 rounded-full hover:bg-teal-800"
        >
          <X className="w-4 h-4 text-white" />
        </button>
      </div>
    </div>
  );
}
