'use client';

import React, { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, Save, ArrowRight, CheckCircle2 } from 'lucide-react';
import { calculateDigitalLabelQuotePreviewAction, createQuote, getActiveMaterials, getActiveLaminations, getActiveMachines } from '@/lib/quote-actions';
import { getCustomers } from '@/lib/customer-actions';
import { toast } from 'react-hot-toast';

export default function NewQuoteMobileWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const prefillCustomerId = searchParams.get('customerId');

  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<any[]>([]);
  const [dbMaterials, setDbMaterials] = useState<any[]>([]);
  const [dbLaminations, setDbLaminations] = useState<any[]>([]);
  const [dbMachines, setDbMachines] = useState<any[]>([]);
  
  // State
  const [customerId, setCustomerId] = useState(prefillCustomerId || '');
  const [productType, setProductType] = useState('DECAL'); // DECAL or CUSTOM
  
  // Decal inputs
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [quantity, setQuantity] = useState('');
  const [material, setMaterial] = useState('');
  const [lamination, setLamination] = useState('');
  const [machineCode, setMachineCode] = useState('');
  
  // Custom inputs
  const [customDesc, setCustomDesc] = useState('');
  const [customPrice, setCustomPrice] = useState('');

  // Result
  const [quotePreview, setQuotePreview] = useState<any>(null);

  useEffect(() => {
    // Load customers for selection if no prefill
    getCustomers({}).then(res => {
      if (res.success && res.data) setCustomers(res.data);
    });
    getActiveMaterials().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setDbMaterials(res.data);
        setMaterial(res.data[0].id);
      }
    });
    getActiveLaminations().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setDbLaminations(res.data);
        setLamination(res.data[0].id);
      }
    });
    getActiveMachines().then(res => {
      if (res.success && res.data && res.data.length > 0) {
        setDbMachines(res.data);
        setMachineCode(res.data[0].machineCode);
      }
    });
  }, []);

  const handleNextStep1 = () => {
    if (!customerId) return toast.error('Vui lòng chọn khách hàng');
    setStep(2);
  };

  const handleCalculate = async () => {
    if (productType === 'DECAL') {
      if (!width || !height || !quantity) return toast.error('Vui lòng nhập đủ KT và SL');
      if (!machineCode) return toast.error('Chưa có cấu hình máy bế trong hệ thống. Vui lòng liên hệ Admin.');
      
      setLoading(true);
      try {
        const res = await calculateDigitalLabelQuotePreviewAction({
          quantity: Number(quantity),
          widthCm: Number(width),
          heightCm: Number(height),
          labelShape: 'RECTANGLE',
          gapMm: 3,
          layoutType: 'AUTO',
          wasteSheets: 10,
          dieCutType: 'STRAIGHT',
          printingPricePerSheet: 1000,
          otherFee: 0,
          profitRate: 40,
          vatRate: 8,
          shippingFee: 0,
          materialId: material,
          laminationId: lamination || undefined,
          dieCutMachine: machineCode,
          sheetSize: '32x35'
        });

        if (res.success && res.data) {
          const previewData: any = res.data;
          setQuotePreview({
            totalAmount: previewData.totalAmount,
            items: [{
              ...previewData,
              productType: 'DECAL',
              name: `In Decal ${width}x${height}cm`,
              quantity: Number(quantity),
              unitPrice: previewData.unitPrice,
              totalAmount: previewData.totalAmount,
              widthCm: Number(width),
              heightCm: Number(height),
              materialId: material,
              laminationId: lamination || null,
              labelShape: 'RECTANGLE',
              dieCutType: 'STRAIGHT',
              wasteSheets: 10,
              printingPricePerSheet: 1000,
              pricingDetails: JSON.stringify(previewData)
            }]
          });
          setStep(3);
        } else {
          toast.error(res.error || 'Lỗi tính giá');
        }
      } catch (e: any) {
        toast.error(e.message);
      } finally {
        setLoading(false);
      }
    } else {
      // CUSTOM
      if (!customDesc || !customPrice) return toast.error('Vui lòng nhập mô tả và giá');
      setQuotePreview({
        totalAmount: Number(customPrice),
        items: [{
          productType: 'CUSTOM',
          name: customDesc,
          quantity: 1,
          unitPrice: Number(customPrice),
          totalAmount: Number(customPrice),
          // Required for DB creation (dummy values for Custom item)
          widthCm: 0,
          heightCm: 0,
          materialId: dbMaterials[0]?.id || 'unknown',
          labelShape: 'CUSTOM',
          dieCutType: 'STRAIGHT',
          labelsPerSheet: 0,
          printSheets: 0,
          wasteSheets: 0,
          totalSheets: 0,
          materialPricePerSheet: 0,
          materialDiscountPercent: 0,
          finalMaterialPricePerSheet: 0,
          laminationPricePerSheet: 0,
          dieCutPricePerSheet: 0,
          printingPricePerSheet: 0,
          fileHandlingFee: 0,
          otherFee: 0,
          materialCost: 0,
          laminationCost: 0,
          dieCutCost: 0,
          printingCost: 0,
          costAmount: 0,
          profitRate: 0,
          saleAmount: Number(customPrice)
        }]
      });
      setStep(3);
    }
  };

  const handleSaveQuote = async () => {
    setLoading(true);
    try {
      const res = await createQuote({
        customerId,
        subtotal: quotePreview.totalAmount,
        vatRate: 0,
        vatAmount: 0,
        shippingFee: 0,
        totalAmount: quotePreview.totalAmount,
        totalCost: 0,
        grossProfit: 0,
        grossProfitRate: 0,
        items: quotePreview.items.map((i: any) => ({
          ...i,
          costAmount: 0,
          grossProfit: 0,
          profitRate: 40,
        }))
      });

      if (res.success && res.data) {
        toast.success('Đã lưu báo giá!');
        router.push(`/dashboard/sales/mobile/quotes/${res.data.id}`);
      } else {
        toast.error(res.error || 'Lỗi lưu báo giá');
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Header */}
      <div className="bg-white p-4 border-b border-slate-200 sticky top-0 z-10 flex items-center gap-3">
        <button onClick={() => step > 1 ? setStep(step - 1) : router.back()} className="p-2 -ml-2 rounded-full hover:bg-slate-100">
          <ChevronLeft className="w-6 h-6 text-slate-700" />
        </button>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-slate-800">Tạo báo giá (Bước {step}/3)</h1>
          <div className="flex gap-1 mt-1">
            <div className={`h-1 flex-1 rounded-full ${step >= 1 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 2 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
            <div className={`h-1 flex-1 rounded-full ${step >= 3 ? 'bg-teal-500' : 'bg-slate-200'}`}></div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-24">
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="font-bold text-slate-700">Bước 1: Chọn khách hàng</h2>
            
            <select 
              value={customerId} 
              onChange={e => setCustomerId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none focus:border-teal-500"
            >
              <option value="">-- Chọn khách hàng --</option>
              {customers.map(c => (
                <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
              ))}
            </select>
            
            <button 
              onClick={handleNextStep1}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-md mt-6 flex justify-center items-center gap-2"
            >
              Tiếp tục <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <h2 className="font-bold text-slate-700">Bước 2: Thông tin sản phẩm</h2>
            
            <div className="flex bg-slate-200 p-1 rounded-xl">
              <button 
                onClick={() => setProductType('DECAL')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg ${productType === 'DECAL' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500'}`}
              >
                In Decal
              </button>
              <button 
                onClick={() => setProductType('CUSTOM')}
                className={`flex-1 py-2 text-sm font-bold rounded-lg ${productType === 'CUSTOM' ? 'bg-white shadow-sm text-teal-600' : 'text-slate-500'}`}
              >
                Nhập tay / Khác
              </button>
            </div>

            {productType === 'DECAL' ? (
              <div className="space-y-3 mt-4">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Rộng (cm)</label>
                    <input type="number" value={width} onChange={e => setWidth(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" placeholder="VD: 5" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-slate-500">Cao (cm)</label>
                    <input type="number" value={height} onChange={e => setHeight(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" placeholder="VD: 10" />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Số lượng tem</label>
                  <input type="number" value={quantity} onChange={e => setQuantity(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" placeholder="VD: 1000" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Chất liệu</label>
                  <select value={material} onChange={e => setMaterial(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none">
                    {dbMaterials.map(m => (
                      <option key={m.id} value={m.id}>{m.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Cán màng</label>
                  <select value={lamination} onChange={e => setLamination(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none">
                    <option value="">Không cán</option>
                    {dbLaminations.map(l => (
                      <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                  </select>
                </div>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500">Mô tả sản phẩm / Dịch vụ</label>
                  <textarea value={customDesc} onChange={e => setCustomDesc(e.target.value)} rows={3} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" placeholder="Nhập chi tiết..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500">Thành tiền (VNĐ)</label>
                  <input type="number" value={customPrice} onChange={e => setCustomPrice(e.target.value)} className="w-full bg-white border border-slate-200 rounded-xl p-3 outline-none" placeholder="VD: 500000" />
                </div>
              </div>
            )}

            <button 
              onClick={handleCalculate}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-md mt-6 disabled:opacity-50"
            >
              {loading ? 'Đang tính...' : 'Tính giá / Xem trước'}
            </button>
          </div>
        )}

        {step === 3 && quotePreview && (
          <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
            <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-xl">
              <CheckCircle2 className="w-6 h-6" />
              <span className="font-bold">Đã tính giá thành công</span>
            </div>

            <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
              <h3 className="font-bold text-slate-800 mb-3 border-b pb-2">Chi tiết</h3>
              {quotePreview.items.map((item: any, idx: number) => (
                <div key={idx} className="mb-3 last:mb-0">
                  <p className="font-semibold text-sm">{item.name}</p>
                  <div className="flex justify-between text-xs text-slate-500 mt-1">
                    <span>SL: {item.quantity}</span>
                    <span>Đơn giá: {item.unitPrice?.toLocaleString()}đ</span>
                  </div>
                  <p className="text-right font-bold text-slate-700 mt-1">{item.totalAmount?.toLocaleString()}đ</p>
                </div>
              ))}
              
              <div className="border-t mt-4 pt-4 flex justify-between items-center">
                <span className="font-semibold text-slate-500">TỔNG CỘNG</span>
                <span className="text-2xl font-bold text-teal-600">{quotePreview.totalAmount?.toLocaleString()}đ</span>
              </div>
            </div>

            <button 
              onClick={handleSaveQuote}
              disabled={loading}
              className="w-full bg-teal-600 hover:bg-teal-700 text-white font-bold py-4 rounded-xl shadow-md flex justify-center gap-2 items-center mt-6 disabled:opacity-50"
            >
              <Save className="w-5 h-5" />
              {loading ? 'Đang lưu...' : 'Lưu Báo giá'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
