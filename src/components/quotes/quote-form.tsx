'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrencyVND } from '@/lib/utils';
import { calculateQuotePreview, createQuote, updateQuote } from '@/lib/quote-actions';
import { LucideAlertCircle, LucideSave, LucideCheck, LucideCalculator } from 'lucide-react';

export default function QuoteForm({ customers, materials, machines, laminations, initialData }: any) {
  const router = useRouter();
  
  // A. Khách hàng
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');

  // B. Tem nhãn
  const [name, setName] = useState(initialData?.items?.[0]?.name || '');
  const [materialId, setMaterialId] = useState(initialData?.items?.[0]?.materialId || '');
  const [machineCode, setMachineCode] = useState(machines.length > 0 ? machines[0].machineCode : '');
  const [labelShape, setLabelShape] = useState(initialData?.items?.[0]?.labelShape || 'CIRCLE');
  const [diameterCm, setDiameterCm] = useState(initialData?.items?.[0]?.diameterCm || 5);
  const [widthCm, setWidthCm] = useState(initialData?.items?.[0]?.widthCm || 5);
  const [heightCm, setHeightCm] = useState(initialData?.items?.[0]?.heightCm || 5);
  const [quantity, setQuantity] = useState(initialData?.items?.[0]?.quantity || 1000);
  const [gapCm, setGapCm] = useState(0.1);

  // C. Bình bài
  const [layoutType, setLayoutType] = useState(initialData?.items?.[0]?.pricingDetails ? JSON.parse(initialData?.items?.[0]?.pricingDetails).packingResult?.layoutType : 'NORMAL');
  const [labelsPerSheet, setLabelsPerSheet] = useState(initialData?.items?.[0]?.labelsPerSheet || 0);
  const [wasteSheets, setWasteSheets] = useState(initialData?.items?.[0]?.wasteSheets || 2);

  // D. Gia công
  const [laminationId, setLaminationId] = useState(initialData?.items?.[0]?.laminationId || '');
  const [dieCutType, setDieCutType] = useState(initialData?.items?.[0]?.dieCutType || 'SHAPE');

  // E. Chi phí
  const [printingPricePerSheet, setPrintingPricePerSheet] = useState(initialData?.items?.[0]?.printingPricePerSheet || 0);
  const [fileHandlingFee, setFileHandlingFee] = useState(initialData?.items?.[0]?.fileHandlingFee || 0);
  const [otherFee, setOtherFee] = useState(initialData?.items?.[0]?.otherFee || 0);
  const [profitRate, setProfitRate] = useState(initialData?.items?.[0]?.profitRate || 30);
  const [vatRate, setVatRate] = useState(initialData?.items?.[0]?.quote?.vatRate || 8);
  const [shippingFee, setShippingFee] = useState(initialData?.items?.[0]?.quote?.shippingFee || 0);

  const [previewData, setPreviewData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCustomer = customers.find((c: any) => c.id === customerId);

  const handleCalculate = async () => {
    setErrorMsg('');
    if (!customerId) return setErrorMsg('Vui lòng chọn khách hàng');
    if (!name) return setErrorMsg('Vui lòng nhập tên sản phẩm');
    if (!materialId) return setErrorMsg('Vui lòng chọn chất liệu');
    if (quantity <= 0) return setErrorMsg('Số lượng phải > 0');

    setIsCalculating(true);
    const input = {
      quantity,
      labelShape,
      widthCm,
      heightCm,
      diameterCm,
      gapCm,
      layoutType,
      wasteSheets,
      dieCutType,
      printingPricePerSheet,
      otherFee,
      profitRate,
      vatRate,
      shippingFee,
      materialId,
      laminationId,
      machineCode,
      labelsPerSheet: labelsPerSheet > 0 ? labelsPerSheet : undefined,
      fileHandlingFee: fileHandlingFee > 0 ? fileHandlingFee : undefined
    };

    const res = await calculateQuotePreview(input as any);
    if (res.success) {
      setPreviewData(res.data);
    } else {
      setErrorMsg(res.error || 'Lỗi tính giá');
    }
    setIsCalculating(false);
  };

  const handleSave = async (status: string) => {
    if (!previewData) return setErrorMsg('Vui lòng tính giá trước khi lưu');
    setIsSaving(true);
    setErrorMsg('');

    const itemData = {
      productType: 'PACKAGING',
      name,
      materialId,
      labelShape,
      widthCm,
      heightCm,
      diameterCm: labelShape === 'CIRCLE' ? diameterCm : null,
      quantity,
      labelsPerSheet: previewData.labelsPerSheet,
      printSheets: previewData.printSheets,
      wasteSheets,
      totalSheets: previewData.totalSheets,
      laminationId,
      dieCutType,
      materialPricePerSheet: previewData.materialPricePerSheet,
      materialDiscountPercent: previewData.materialDiscountPercent,
      finalMaterialPricePerSheet: previewData.finalMaterialPricePerSheet,
      laminationPricePerSheet: previewData.laminationPricePerSheet,
      dieCutPricePerSheet: previewData.dieCutPricePerSheet,
      printingPricePerSheet,
      fileHandlingFee: previewData.fileHandlingFee,
      otherFee: previewData.otherFee,
      materialCost: previewData.materialCost,
      laminationCost: previewData.laminationCost,
      dieCutCost: previewData.dieCutCost,
      printingCost: previewData.printingCost,
      costAmount: previewData.costAmount,
      profitRate,
      saleAmount: previewData.saleAmount,
      pricingDetails: JSON.stringify(previewData),
      layoutDetails: previewData.packingResult ? JSON.stringify(previewData.packingResult) : null,
      warningNote: previewData.warnings.join(' | ')
    };

    const quoteData = {
      customerId,
      status,
      subtotal: previewData.saleAmount,
      vatRate,
      vatAmount: previewData.vatAmount,
      shippingFee,
      totalAmount: previewData.totalAmount,
      totalCost: previewData.costAmount,
      grossProfit: previewData.grossProfit,
      grossProfitRate: previewData.grossProfitRate,
      items: [itemData]
    };

    let res;
    if (initialData?.id) {
      res = await updateQuote(initialData.id, quoteData);
    } else {
      res = await createQuote(quoteData);
    }

    if (res.success) {
      router.push('/dashboard/quotes');
    } else {
      setErrorMsg(res.error || 'Lỗi khi lưu báo giá');
      setIsSaving(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
      <div className="xl:col-span-2 space-y-6">
        
        {errorMsg && (
          <div className="p-4 bg-red-100 text-red-700 rounded-lg flex items-center gap-2">
            <LucideAlertCircle className="w-5 h-5" />
            {errorMsg}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">A. Thông tin khách hàng</h2>
          <select 
            value={customerId} 
            onChange={e => setCustomerId(e.target.value)}
            className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700 mb-2"
          >
            <option value="">-- Chọn khách hàng --</option>
            {customers.map((c: any) => (
              <option key={c.id} value={c.id}>{c.name} - {c.phone}</option>
            ))}
          </select>
          {selectedCustomer && (
            <p className="text-sm text-slate-500">
              Mã: {selectedCustomer.customerCode} | Công nợ: <span className="font-semibold text-red-500">{formatCurrencyVND(selectedCustomer.debtBalance)}</span>
            </p>
          )}
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">B. Thông tin tem nhãn</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Tên sản phẩm</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Chất liệu</label>
              <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                <option value="">-- Chọn chất liệu --</option>
                {materials.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Máy bế / Khổ in</label>
              <select value={machineCode} onChange={e => setMachineCode(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                {machines.map((m: any) => (
                  <option key={m.id} value={m.machineCode}>{m.machineName} ({m.sheetWidthCm}x{m.sheetHeightCm})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Hình dạng tem</label>
              <select value={labelShape} onChange={e => setLabelShape(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                <option value="CIRCLE">Tròn</option>
                <option value="RECTANGLE">Chữ nhật</option>
                <option value="ROUNDED_RECTANGLE">Bo góc</option>
                <option value="HEXAGON">Lục giác</option>
                <option value="CUSTOM">Theo hình</option>
              </select>
            </div>
            {labelShape === 'CIRCLE' ? (
              <div>
                <label className="block text-sm font-semibold mb-1">Đường kính (cm)</label>
                <input type="number" step="0.1" value={diameterCm} onChange={e => setDiameterCm(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-sm font-semibold mb-1">Rộng (cm)</label>
                  <input type="number" step="0.1" value={widthCm} onChange={e => setWidthCm(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
                <div>
                  <label className="block text-sm font-semibold mb-1">Cao (cm)</label>
                  <input type="number" step="0.1" value={heightCm} onChange={e => setHeightCm(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
                </div>
              </>
            )}
            <div>
              <label className="block text-sm font-semibold mb-1">Số lượng</label>
              <input type="number" value={quantity} onChange={e => setQuantity(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Khoảng cách gap (cm)</label>
              <input type="number" step="0.1" value={gapCm} onChange={e => setGapCm(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700">
          <h2 className="text-xl font-bold mb-4">C. Bình bài & D. Gia công & E. Chi phí</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold mb-1">Layout type</label>
              <select value={layoutType} onChange={e => setLayoutType(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                <option value="NORMAL">Bình thường</option>
                <option value="ROTATED">Xoay 90 độ</option>
                <option value="MIXED">Hỗn hợp</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Số con/tờ (Để 0 tự tính)</label>
              <input type="number" value={labelsPerSheet} onChange={e => setLabelsPerSheet(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Bù hao tờ</label>
              <input type="number" value={wasteSheets} onChange={e => setWasteSheets(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Cán màng</label>
              <select value={laminationId} onChange={e => setLaminationId(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                {laminations.map((l: any) => (
                  <option key={l.id} value={l.id}>{l.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Loại bế</label>
              <select value={dieCutType} onChange={e => setDieCutType(e.target.value)} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700">
                <option value="SHAPE">Bế theo hình</option>
                <option value="STRAIGHT">Bế thẳng</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Giá in / tờ</label>
              <input type="number" value={printingPricePerSheet} onChange={e => setPrintingPricePerSheet(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Lợi nhuận (%)</label>
              <input type="number" value={profitRate} onChange={e => setProfitRate(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">VAT (%)</label>
              <input type="number" value={vatRate} onChange={e => setVatRate(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
            <div>
              <label className="block text-sm font-semibold mb-1">Phí vận chuyển</label>
              <input type="number" value={shippingFee} onChange={e => setShippingFee(Number(e.target.value))} className="w-full p-2 border rounded-lg dark:bg-slate-900 dark:border-slate-700" />
            </div>
          </div>
        </div>

        <button 
          onClick={handleCalculate}
          disabled={isCalculating}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-4 rounded-xl flex items-center justify-center gap-2"
        >
          <LucideCalculator className="w-5 h-5" />
          {isCalculating ? 'Đang tính...' : 'Tính Giá Preview'}
        </button>

      </div>

      <div className="space-y-6">
        {previewData ? (
          <div className="bg-white dark:bg-slate-800 rounded-xl shadow p-6 border border-slate-200 dark:border-slate-700 sticky top-6">
            <h2 className="text-xl font-bold mb-4">Kết quả Báo Giá</h2>
            
            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span>Số lượng tem:</span> <strong>{quantity}</strong></div>
              <div className="flex justify-between"><span>Số con / tờ:</span> <strong>{previewData.labelsPerSheet}</strong></div>
              <div className="flex justify-between"><span>Tổng tờ in:</span> <strong>{previewData.totalSheets}</strong></div>
            </div>

            <hr className="my-4 border-slate-200 dark:border-slate-700" />

            <div className="space-y-2 mb-4 text-sm">
              <div className="flex justify-between"><span>Chi phí vật tư:</span> <span>{formatCurrencyVND(previewData.materialCost)}</span></div>
              <div className="flex justify-between"><span>Chi phí cán màng:</span> <span>{formatCurrencyVND(previewData.laminationCost)}</span></div>
              <div className="flex justify-between"><span>Chi phí bế:</span> <span>{formatCurrencyVND(previewData.dieCutCost)}</span></div>
              <div className="flex justify-between"><span>Chi phí in:</span> <span>{formatCurrencyVND(previewData.printingCost)}</span></div>
              <div className="flex justify-between"><span>Phí xử lý file:</span> <span>{formatCurrencyVND(previewData.fileHandlingFee)}</span></div>
            </div>

            <hr className="my-4 border-slate-200 dark:border-slate-700" />

            <div className="space-y-2 mb-4">
              <div className="flex justify-between font-bold"><span>Tổng vốn:</span> <span>{formatCurrencyVND(previewData.costAmount)}</span></div>
              <div className="flex justify-between font-bold text-green-600"><span>Giá bán (trước VAT):</span> <span>{formatCurrencyVND(previewData.saleAmount)}</span></div>
              <div className="flex justify-between text-sm"><span>VAT ({vatRate}%):</span> <span>{formatCurrencyVND(previewData.vatAmount)}</span></div>
              <div className="flex justify-between text-xl font-black text-blue-600 mt-2 pt-2 border-t">
                <span>TỔNG TIỀN:</span> <span>{formatCurrencyVND(previewData.totalAmount)}</span>
              </div>
            </div>

            {previewData.warnings?.length > 0 && (
              <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-sm rounded-lg border border-yellow-200">
                <strong>Cảnh báo:</strong>
                <ul className="list-disc pl-4 mt-1">
                  {previewData.warnings.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}
            {previewData.appliedRules?.length > 0 && (
              <div className="mt-4 p-3 bg-blue-50 text-blue-800 text-sm rounded-lg border border-blue-200">
                <strong>Gợi ý thông minh (Rules applied):</strong>
                <ul className="list-disc pl-4 mt-1">
                  {previewData.appliedRules.map((w: string, i: number) => <li key={i}>{w}</li>)}
                </ul>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              <button 
                onClick={() => handleSave('DRAFT')}
                disabled={isSaving}
                className="w-full bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <LucideSave className="w-4 h-4" /> Lưu Nháp
              </button>
              <button 
                onClick={() => handleSave('SENT')}
                disabled={isSaving}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <LucideCheck className="w-4 h-4" /> Lưu & Gửi Khách
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-slate-100 dark:bg-slate-800/50 rounded-xl p-6 text-center text-slate-500 border border-slate-200 dark:border-slate-700">
            Hãy điền đầy đủ thông tin và bấm Tính giá để xem trước kết quả
          </div>
        )}
      </div>
    </div>
  );
}
