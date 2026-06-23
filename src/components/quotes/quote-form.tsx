'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { formatCurrencyVND, sanitizePercentInput, sanitizeMoneyInput, stripLeadingZeros, parseVietnameseInteger, sanitizeDecimalTechnicalInput } from '@/lib/utils';
import { sanitizeIntegerInput, formatVietnameseInteger } from '@/lib/pricing/shared/numeric-input-utils';
import { calculateDigitalLabelQuotePreviewAction } from '@/lib/quote-actions';
import { LucideAlertCircle, LucideSave, LucideCheck, LucideCalculator, LucideArrowRight, LucideLock, LucideInfo, LucideZap } from 'lucide-react';

import { parseQuickQuoteInput } from '@/lib/pricing/quick-input/parse-quick-quote-input';
import { resolveMaterialFromParsedIntent } from '@/lib/pricing/quick-input/material-resolver';
import { ParseQuickQuoteResult } from '@/lib/pricing/quick-input/types';
import { generateVisualLayout } from '@/lib/pricing/digital-label/visual-layout';

export default function QuoteForm({ customers, materials, machines, laminations, initialData, userRole, isDirectOrder = false }: any) {
  const router = useRouter();
  
  // A. Khách hàng
  const initialCustomer = customers.find((c: any) => c.id === initialData?.customerId);
  const [customerId, setCustomerId] = useState(initialData?.customerId || '');
  const [customerSearch, setCustomerSearch] = useState(initialCustomer ? initialCustomer.name : '');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);

  // Quick Input state
  const [quickInputText, setQuickInputText] = useState('');
  const [quickInputResult, setQuickInputResult] = useState<ParseQuickQuoteResult | null>(null);
  const [materialWarning, setMaterialWarning] = useState<string | null>(null);

  const handleQuickInputParse = () => {
    if (!quickInputText.trim()) return;
    const result = parseQuickQuoteInput(quickInputText);
    setQuickInputResult(result);
    setMaterialWarning(null);

    const p = result.parsed;
    if (p.quantity) setQuantity(sanitizeIntegerInput(String(p.quantity)));
    if (p.shape) setLabelShape(p.shape);
    if (p.diameterMm) {
      setDiameterCm(String(p.diameterMm / 10));
      setWidthCm(String(p.diameterMm / 10));
      setHeightCm(String(p.diameterMm / 10));
    }
    if (p.widthMm && p.heightMm) {
      setWidthCm(String(p.widthMm / 10));
      setHeightCm(String(p.heightMm / 10));
    }
    if (p.dieCutIntent) {
      const targetType = p.dieCutIntent === 'CUSTOM_SHAPE' ? 'SHAPE' : p.dieCutIntent;
      setDieCutType(targetType);
      if (targetType === 'NONE') {
        setDieCutMachine('NONE');
      }
    }
    if (p.laminationIntent) {
      if (p.laminationIntent === 'NONE') {
         setLaminationId('');
      } else {
         const lamMap: any = { 'GLOSSY': ['bóng', 'glossy'], 'MATTE': ['mờ', 'matte'] };
         const keywords = lamMap[p.laminationIntent] || [];
         const match = laminations.find((l: any) => keywords.some((k: string) => l.name.toLowerCase().includes(k)));
         if (match) setLaminationId(match.id);
      }
    }
    if (p.printSizeIntent) {
      let proceed = true;
      if (sheetSize && p.printSizeIntent !== sheetSize) {
        proceed = window.confirm(`Khổ in nhận diện được là "${p.printSizeIntent}", khác với Khổ in hiện tại "${sheetSize}". Bạn có muốn ghi đè không?`);
      }
      if (proceed) {
        setSheetSize(p.printSizeIntent);
      }
    }
    if (p.dieCutMachineIntent) {
      let proceed = true;
      if (dieCutMachine && p.dieCutMachineIntent !== dieCutMachine) {
        proceed = window.confirm(`Máy bế nhận diện được là "${p.dieCutMachineIntent}", khác với Máy bế hiện tại "${dieCutMachine}". Bạn có muốn ghi đè không?`);
      }
      if (proceed) {
        setDieCutMachine(p.dieCutMachineIntent);
        if ((p.dieCutMachineIntent as string) === 'NONE') {
          setDieCutType('NONE');
        }
      }
    }
    if (p.shippingFee !== null) setShippingFee(sanitizeIntegerInput(String(p.shippingFee)));
    if (p.hasVat !== null) setVatRate(p.hasVat ? '8' : '0');

    const matRes = resolveMaterialFromParsedIntent(p.materialIntent, materials, p.printSizeIntent);
    if (matRes.materialId) {
      setMaterialId(matRes.materialId);
    } else if (matRes.warningMessage) {
      setMaterialWarning(matRes.warningMessage);
    }
  };

  const handleIntegerChange = (newValue: string, prevValue: string, setter: (val: string) => void) => {
    const prevFormatted = formatVietnameseInteger(prevValue);
    
    // 1. Trường hợp xóa ký tự (newValue ngắn hơn prevFormatted)
    if (newValue.length < prevFormatted.length) {
      const raw = newValue.replace(/\./g, '');
      setter(sanitizeIntegerInput(raw));
      return;
    }
    
    // 2. Trường hợp gõ thêm đúng 1 ký tự (newValue dài hơn prevFormatted đúng 1 ký tự)
    if (newValue.length === prevFormatted.length + 1) {
      let addedChar = '';
      let addedIndex = -1;
      for (let i = 0; i < newValue.length; i++) {
        if (i >= prevFormatted.length || newValue[i] !== prevFormatted[i]) {
          addedChar = newValue[i];
          addedIndex = i;
          break;
        }
      }
      
      if (addedIndex !== -1) {
        let digitCountBefore = 0;
        for (let i = 0; i < addedIndex; i++) {
          if (/\d/.test(prevFormatted[i])) {
            digitCountBefore++;
          }
        }
        
        if (/\d/.test(addedChar)) {
          const rawPrev = prevValue.replace(/\D/g, '');
          const rawNew = rawPrev.slice(0, digitCountBefore) + addedChar + rawPrev.slice(digitCountBefore);
          setter(sanitizeIntegerInput(rawNew));
          return;
        } else if (addedChar === '.' || addedChar === ',') {
          // Người dùng gõ dấu chấm/phẩy thập phân => với số nguyên ta giữ nguyên số cũ (cắt thập phân)
          setter(sanitizeIntegerInput(prevValue));
          return;
        }
      }
    }
    
    // 3. Trường hợp paste chuỗi dài hoặc thay đổi nhiều ký tự
    setter(sanitizeIntegerInput(newValue));
  };

  const [submittedInputs, setSubmittedInputs] = useState<any>(null);

  // B. Thông tin cơ bản
  const [name, setName] = useState(initialData?.items?.[0]?.name || '');
  const [labelShape, setLabelShape] = useState(initialData?.items?.[0]?.labelShape || 'CIRCLE');
  const [diameterCm, setDiameterCm] = useState<string>(String(initialData?.items?.[0]?.diameterCm ?? 5));
  const [widthCm, setWidthCm] = useState<string>(String(initialData?.items?.[0]?.widthCm ?? 5));
  const [heightCm, setHeightCm] = useState<string>(String(initialData?.items?.[0]?.heightCm ?? 5));
  const [quantity, setQuantity] = useState<string>(sanitizeIntegerInput(String(initialData?.items?.[0]?.quantity ?? 1000)));
  const [gapMm, setGapMm] = useState<string>(String(initialData?.items?.[0]?.gapMm ?? 1));

  // C. Tùy chọn nâng cao
  const [materialId, setMaterialId] = useState(initialData?.items?.[0]?.materialId || '');
  const [laminationId, setLaminationId] = useState(initialData?.items?.[0]?.laminationId || '');
  const [dieCutType, setDieCutType] = useState(initialData?.items?.[0]?.dieCutType || 'SHAPE');
  // Trích xuất danh sách Khổ in duy nhất từ machines
  const sheetSizes = useMemo(() => {
    if (!machines) return [];
    const map = new Map<string, { code: string; label: string }>();
    machines.forEach((m: any) => {
      if (!map.has(m.sheetSizeCode)) {
        map.set(m.sheetSizeCode, { code: m.sheetSizeCode, label: m.sheetLabel });
      }
    });
    return Array.from(map.values());
  }, [machines]);

  const [sheetSize, setSheetSize] = useState(() => {
    if (initialData?.items?.[0]?.sheetSize) return initialData.items[0].sheetSize;
    if (initialData?.items?.[0]?.layoutDetails) {
      try {
        const layout = JSON.parse(initialData.items[0].layoutDetails);
        if (layout.sheetWidthCm && layout.sheetHeightCm) {
          return `${layout.sheetWidthCm}x${layout.sheetHeightCm}`;
        }
      } catch (e) {}
    }
    if (machines && machines.length > 0) {
      return machines[0].sheetSizeCode;
    }
    return '32x35';
  });

  const [dieCutMachine, setDieCutMachine] = useState(() => {
    if (initialData?.items?.[0]?.dieCutMachine) return initialData.items[0].dieCutMachine;
    if (machines && machines.length > 0) {
      const initSize = initialData?.items?.[0]?.sheetSize || machines[0].sheetSizeCode;
      const found = machines.find((m: any) => m.sheetSizeCode === initSize);
      if (found) return found.machineCode;
    }
    return 'Graphtec';
  });

  const availableMachines = useMemo(() => {
    if (!machines || !sheetSize) return [];
    return machines.filter((m: any) => m.sheetSizeCode === sheetSize);
  }, [machines, sheetSize]);

  const isEmptyConfig = !machines || machines.length === 0;
  const isAdminOrManager = ['ADMIN', 'MANAGER'].includes(userRole);

  const handleSheetSizeChange = (newSize: string) => {
    setSheetSize(newSize);
    if (machines) {
      const hasCurrentMachine = machines.some((m: any) => m.sheetSizeCode === newSize && m.machineCode === dieCutMachine);
      if (!hasCurrentMachine) {
        const firstAvail = machines.find((m: any) => m.sheetSizeCode === newSize);
        if (firstAvail) {
          setDieCutMachine(firstAvail.machineCode);
          if (firstAvail.machineCode === 'NONE') {
            setDieCutType('NONE');
          } else {
            setDieCutType('SHAPE');
          }
        }
      }
    }
  };

  const handleDieCutMachineChange = (newMachine: string) => {
    setDieCutMachine(newMachine);
    if (newMachine === 'NONE') {
      setDieCutType('NONE');
    } else {
      if (dieCutType === 'NONE') {
        setDieCutType('SHAPE');
      }
    }
  };
  const [layoutType, setLayoutType] = useState(initialData?.items?.[0]?.pricingDetails ? (JSON.parse(initialData?.items?.[0]?.pricingDetails).packingResult?.layoutType === 'NORMAL' ? 'NORMAL' : 'AUTO') : 'AUTO');

  const materialSizeWarning = useMemo(() => {
    if (!materialId) return null;
    const mat = materials.find((m: any) => m.id === materialId);
    if (!mat) return null;
    
    let expectedW = 32;
    let expectedH = 35;
    if (sheetSize === '32x43') {
      expectedH = 43;
    } else if (sheetSize.includes('x')) {
      const parts = sheetSize.split('x');
      const w = parseFloat(parts[0]);
      const h = parseFloat(parts[1]);
      if (!isNaN(w) && !isNaN(h)) {
        expectedW = w;
        expectedH = h;
      }
    }
    
    if (mat.sheetWidthCm !== expectedW || mat.sheetHeightCm !== expectedH) {
      return "Chất liệu đã chọn không phù hợp với Khổ in hiện tại.";
    }
    return null;
  }, [materialId, sheetSize, materials]);
  const [labelsPerSheet, setLabelsPerSheet] = useState<string>(
    initialData?.items?.[0]?.labelsPerSheet !== undefined && initialData?.items?.[0]?.labelsPerSheet !== null && initialData?.items?.[0]?.labelsPerSheet !== ''
      ? sanitizeIntegerInput(String(initialData?.items?.[0]?.labelsPerSheet))
      : ''
  );
  const [wasteSheets, setWasteSheets] = useState<string>(
    initialData?.items?.[0]?.wasteSheets !== undefined && initialData?.items?.[0]?.wasteSheets !== null && initialData?.items?.[0]?.wasteSheets !== ''
      ? sanitizeIntegerInput(String(initialData?.items?.[0]?.wasteSheets))
      : '2'
  );
  const [printingPricePerSheet, setPrintingPricePerSheet] = useState<string>(
    initialData?.items?.[0]?.printingPricePerSheet !== undefined && initialData?.items?.[0]?.printingPricePerSheet !== null && initialData?.items?.[0]?.printingPricePerSheet !== ''
      ? sanitizeIntegerInput(String(initialData?.items?.[0]?.printingPricePerSheet))
      : ''
  );
  
  // D. Thuế & Lợi nhuận & Giao hàng
  const [profitRate, setProfitRate] = useState<string>(sanitizePercentInput(String(initialData?.items?.[0]?.profitRate ?? 30)));
  const [vatRate, setVatRate] = useState<string>(sanitizePercentInput(String(initialData?.items?.[0]?.quote?.vatRate ?? 8)));
  const [shippingFee, setShippingFee] = useState<string>(sanitizeIntegerInput(String(initialData?.items?.[0]?.quote?.shippingFee ?? 0)));
  const [otherFee, setOtherFee] = useState(initialData?.items?.[0]?.otherFee || 0);

  const [previewData, setPreviewData] = useState<any>(null);
  const [isCalculating, setIsCalculating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const selectedCustomer = customers.find((c: any) => c.id === customerId);
  const canViewInternalCost = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(userRole);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCalculate(true);
    }, 500);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    customerId, name, materialId, labelShape, diameterCm, widthCm, heightCm, 
    quantity, gapMm, sheetSize, dieCutMachine, dieCutType, laminationId, 
    labelsPerSheet, wasteSheets, printingPricePerSheet, profitRate, vatRate, shippingFee, layoutType, otherFee
  ]);

  const handleCalculate = async (silent = false) => {
    if (!silent) setErrorMsg('');
    
    if (isEmptyConfig) {
      if (silent) { setPreviewData(null); setSubmittedInputs(null); return; }
      return setErrorMsg(isAdminOrManager 
        ? "Chưa có cấu hình máy bế. Vui lòng vào Cấu hình bảng giá để thiết lập."
        : "Bảng cấu hình máy bế chưa đủ, vui lòng báo quản lý cấu hình.");
    }
    if (!customerId) {
      if (silent) { setPreviewData(null); setSubmittedInputs(null); return; }
      return setErrorMsg('Vui lòng chọn khách hàng');
    }
    if (!name) {
      if (silent) { setPreviewData(null); setSubmittedInputs(null); return; }
      return setErrorMsg('Vui lòng nhập tên sản phẩm');
    }
    if (!materialId) {
      if (silent) { setPreviewData(null); setSubmittedInputs(null); return; }
      return setErrorMsg('Vui lòng chọn chất liệu');
    }
    
    const qtyVal = parseVietnameseInteger(quantity);
    if (qtyVal <= 0) {
      if (silent) { setPreviewData(null); setSubmittedInputs(null); return; }
      return setErrorMsg('Số lượng phải > 0');
    }

    if ((dieCutType === 'SHAPE' || dieCutType === 'STRAIGHT') && dieCutMachine === 'NONE') {
      if (silent) { setPreviewData(null); setSubmittedInputs(null); return; }
      return setErrorMsg('Bạn đã chọn bế nhưng chưa chọn máy bế.');
    }

    if (silent) setErrorMsg('');

    setIsCalculating(true);
    const input = {
      quantity: qtyVal,
      labelShape,
      widthCm: Number(widthCm),
      heightCm: Number(heightCm),
      diameterCm: Number(diameterCm),
      gapMm: gapMm === '' ? 0 : Number(gapMm),
      layoutType,
      wasteSheets: parseVietnameseInteger(wasteSheets),
      dieCutType,
      otherFee,
      profitRate: parseVietnameseInteger(profitRate),
      vatRate: parseVietnameseInteger(vatRate),
      shippingFee: parseVietnameseInteger(shippingFee),
      materialId,
      laminationId,
      sheetSize,
      dieCutMachine,
      labelsPerSheet: labelsPerSheet !== '' ? parseVietnameseInteger(labelsPerSheet) : undefined,
      printingPricePerSheet: printingPricePerSheet !== '' ? parseVietnameseInteger(printingPricePerSheet) : undefined
    };

    const res = await calculateDigitalLabelQuotePreviewAction(input as any);
    if (res.success) {
      if ((res.data as any)?.blockPreview) {
        setPreviewData(null);
        setSubmittedInputs(null);
        setErrorMsg('Cấu hình máy bế này chưa hoạt động hoặc chưa được thiết lập.');
      } else {
        setPreviewData(res.data);
        setSubmittedInputs(input);
      }
    } else {
      setPreviewData(null);
      setSubmittedInputs(null);
      setErrorMsg(res.error || 'Lỗi tính giá');
    }
    setIsCalculating(false);
  };

  const handleSave = async (status: string) => {
    alert('Lưu báo giá theo chuẩn mới sẽ được thực hiện ở Phase sau (23A.1D). Cảm ơn!');
    return;
  };

  // Tính toán Grid minh họa (Visual demo)
  const renderLayoutDemo = () => {
    if (!previewData) return null;
    const effective = previewData.internalBreakdown?.effectiveItemsPerSheet || previewData.salesBreakdown?.itemsPerSheet || 0;
    if (effective <= 0) return null;

    const width = previewData.internalBreakdown?.sheetWidthCm || previewData.salesBreakdown?.sheetWidthCm || 32;
    const height = previewData.internalBreakdown?.sheetHeightCm || previewData.salesBreakdown?.sheetHeightCm || 35;

    // Tính toán vùng khả dụng từ backend, nếu không có thì mới xấp xỉ
    const backendUsableW = previewData.internalBreakdown?.usableWidthCm || previewData.salesBreakdown?.usableWidthCm;
    const backendUsableH = previewData.internalBreakdown?.usableHeightCm || previewData.salesBreakdown?.usableHeightCm;

    const usedWidth = submittedInputs?.widthCm || Number(widthCm);
    const usedHeight = submittedInputs?.heightCm || Number(heightCm);
    const usedGapMm = submittedInputs?.gapMm !== undefined ? submittedInputs.gapMm : (gapMm === '' ? 0 : Number(gapMm));
    
    const usableW = backendUsableW || (width === 32 ? 30.5 : width - 1.5);
    const usableH = backendUsableH || (height === 35 ? 31.5 : (height === 43 ? 39.5 : height - 3.5));

    const selectedMachineObjForPadding = machines?.find((m: any) => m.machineCode === dieCutMachine);
    const paddingMachineName = selectedMachineObjForPadding?.machineName || '';
    const paddingMachineCode = selectedMachineObjForPadding?.machineCode || dieCutMachine || '';
    const machineIdentifier = `${paddingMachineName} ${paddingMachineCode}`.toLowerCase();
    
    const isGraphtec = machineIdentifier.includes('graphtec');
    const isAvitech = machineIdentifier.includes('avitech');
    const edgePaddingCm = isGraphtec ? 0.5 : (isAvitech ? 0.1 : 0);

    const usedLayoutType = previewData.internalBreakdown?.layoutType || 'NORMAL';
    const visualItems = generateVisualLayout(
      submittedInputs?.labelShape || labelShape,
      submittedInputs?.labelShape === 'CIRCLE' ? (submittedInputs?.diameterCm || Number(diameterCm)) : usedWidth,
      submittedInputs?.labelShape === 'CIRCLE' ? (submittedInputs?.diameterCm || Number(diameterCm)) : usedHeight,
      usedGapMm / 10,
      usableW,
      usableH,
      usedLayoutType,
      effective,
      edgePaddingCm
    );

    const safeMarginX = (width - usableW) / 2;
    const safeMarginY = (height - usableH) / 2;

    return (
      <div className="w-full flex justify-center mt-10 mb-6 px-10">
        <div className="relative w-full max-w-[460px] mx-auto">
          {/* Top Dimension Marker */}
          <div className="absolute -top-8 left-0 right-0 h-6 flex items-center justify-center text-sky-500 z-0">
             <div className="absolute left-0 right-0 top-1/2 h-px bg-sky-400"></div>
             <svg className="absolute left-0 top-1/2 -translate-y-1/2 w-2 h-3" fill="currentColor" viewBox="0 0 8 16"><polygon points="8,0 0,8 8,16"/></svg>
             <svg className="absolute right-0 top-1/2 -translate-y-1/2 w-2 h-3" fill="currentColor" viewBox="0 0 8 16"><polygon points="0,0 8,8 0,16"/></svg>
             <div className="absolute left-0 top-1/2 h-6 border-l border-dashed border-sky-300"></div>
             <div className="absolute right-0 top-1/2 h-6 border-r border-dashed border-sky-300"></div>
             
             <div className="relative bg-white border border-sky-400 text-sky-600 text-xs font-bold px-3 py-0.5 rounded-full z-10 flex items-center gap-1.5 shadow-sm">
               <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
               {width} cm
             </div>
          </div>

          {/* Left Dimension Marker */}
          <div className="absolute top-0 -left-8 bottom-0 w-6 flex items-center justify-center text-sky-500 z-0">
             <div className="absolute top-0 bottom-0 left-1/2 w-px bg-sky-400"></div>
             <svg className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-2" fill="currentColor" viewBox="0 0 16 8"><polygon points="0,8 8,0 16,8"/></svg>
             <svg className="absolute bottom-0 left-1/2 -translate-x-1/2 w-3 h-2" fill="currentColor" viewBox="0 0 16 8"><polygon points="0,0 8,8 16,0"/></svg>
             <div className="absolute top-0 left-1/2 w-6 border-t border-dashed border-sky-300"></div>
             <div className="absolute bottom-0 left-1/2 w-6 border-b border-dashed border-sky-300"></div>
             
             <div className="relative bg-white border border-sky-400 text-sky-600 text-xs font-bold px-3 py-0.5 rounded-full z-10 flex items-center gap-1.5 shadow-sm -rotate-90 whitespace-nowrap">
               <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
               {height} cm
             </div>
          </div>

          <div 
            className="relative bg-white border-2 border-slate-300 shadow-sm w-full z-10 overflow-hidden"
            style={{ aspectRatio: `${width} / ${height}` }}
          >
          {/* Safe Zone */}
          <div 
            className="absolute border border-dashed border-slate-400 pointer-events-none flex items-center justify-center overflow-hidden"
            style={{
              left: `${(safeMarginX / width) * 100}%`,
              top: `${(safeMarginY / height) * 100}%`,
              width: `${(usableW / width) * 100}%`,
              height: `${(usableH / height) * 100}%`
            }}
          >
             <span className="text-red-300/30 font-bold text-xl lg:text-3xl uppercase rotate-45 select-none whitespace-nowrap z-0">
               Safe Zone
             </span>
             
             {/* Render Items */}
             <div className="absolute inset-0 z-10 pointer-events-none">
               {visualItems.map((item, i) => (
                 <div key={i} style={{
                   position: 'absolute',
                   left: `${(item.x / usableW) * 100}%`,
                   top: `${(item.y / usableH) * 100}%`,
                   width: `${(item.w / usableW) * 100}%`,
                   height: `${(item.h / usableH) * 100}%`,
                   background: item.type === 'circle' ? 'rgba(236, 72, 153, 0.2)' : (item.isRotated ? 'rgba(16, 185, 129, 0.2)' : 'rgba(14, 165, 233, 0.2)'),
                   border: '1px solid ' + (item.type === 'circle' ? '#ec4899' : (item.isRotated ? '#10b981' : '#0ea5e9')),
                   borderRadius: labelShape === 'CIRCLE' ? '50%' : (labelShape === 'ROUNDED_RECTANGLE' ? '4px' : '0'),
                   boxShadow: 'inset 0 0 2px rgba(255,255,255,0.5)'
                 }} />
               ))}
             </div>
          </div>

          {/* L Marks for Graphtec / Avitech */}
          {(() => {
            const selectedMachineObj = machines?.find((m: any) => m.machineCode === dieCutMachine);
            const machineName = selectedMachineObj?.machineName || dieCutMachine || '';
            const isGraphtec = machineName.toLowerCase().includes('graphtec');
            const isAvitech = machineName.toLowerCase().includes('avitech');
            
            if (!isGraphtec && !isAvitech) return null;

            return (
              <div 
                className="absolute pointer-events-none z-20"
                style={{
                  left: `${(safeMarginX / width) * 100}%`,
                  top: `${(safeMarginY / height) * 100}%`,
                  width: `${(usableW / width) * 100}%`,
                  height: `${(usableH / height) * 100}%`
                }}
              >
                {isGraphtec && (() => {
                  const offsetCm = 0.5; // shift inwards by 0.5cm
                  const offsetXPct = `${(offsetCm / usableW) * 100}%`;
                  const offsetYPct = `${(offsetCm / usableH) * 100}%`;
                  
                  const markPhysicalLen = Math.min(safeMarginX, safeMarginY, 1.5) + offsetCm;
                  const markLenX = `${(markPhysicalLen / usableW) * 100}%`;
                  const markLenY = `${(markPhysicalLen / usableH) * 100}%`;
                  
                  return (
                    <>
                      {/* Top-Left */}
                      <div className="absolute h-[3px] bg-slate-900 -translate-x-full -translate-y-1/2" style={{ top: offsetYPct, left: offsetXPct, width: markLenX }}></div>
                      <div className="absolute w-[3px] bg-slate-900 -translate-x-1/2 -translate-y-full" style={{ top: offsetYPct, left: offsetXPct, height: markLenY }}></div>
                      
                      {/* Top-Right */}
                      <div className="absolute h-[3px] bg-slate-900 translate-x-full -translate-y-1/2" style={{ top: offsetYPct, right: offsetXPct, width: markLenX }}></div>
                      <div className="absolute w-[3px] bg-slate-900 translate-x-1/2 -translate-y-full" style={{ top: offsetYPct, right: offsetXPct, height: markLenY }}></div>
                      
                      {/* Bottom-Right */}
                      <div className="absolute h-[3px] bg-slate-900 translate-x-full translate-y-1/2" style={{ bottom: offsetYPct, right: offsetXPct, width: markLenX }}></div>
                      <div className="absolute w-[3px] bg-slate-900 translate-x-1/2 translate-y-full" style={{ bottom: offsetYPct, right: offsetXPct, height: markLenY }}></div>
                      
                      {/* Bottom-Left */}
                      <div className="absolute h-[3px] bg-slate-900 -translate-x-full translate-y-1/2" style={{ bottom: offsetYPct, left: offsetXPct, width: markLenX }}></div>
                      <div className="absolute w-[3px] bg-slate-900 -translate-x-1/2 translate-y-full" style={{ bottom: offsetYPct, left: offsetXPct, height: markLenY }}></div>
                    </>
                  );
                })()}

                {isAvitech && (
                  <>
                    <div className="absolute -top-[2px] -left-[2px] w-5 h-5 border-t-[3px] border-l-[3px] border-slate-900"></div>
                    <div className="absolute -top-[2px] -right-[2px] w-5 h-5 border-t-[3px] border-r-[3px] border-slate-900"></div>
                    <div className="absolute -bottom-[2px] -right-[2px] w-5 h-5 border-b-[3px] border-r-[3px] border-slate-900"></div>
                    <div className="absolute -bottom-[2px] -left-[2px] w-5 h-5 border-b-[3px] border-l-[3px] border-slate-900"></div>
                  </>
                )}
              </div>
            );
          })()}
        </div>
      </div>
      </div>
    );
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
      
      {/* 1. CỘT TRÁI - THÔNG SỐ (25-33%) */}
      <div className="xl:col-span-4 space-y-4">
        
        {errorMsg && (
          <div className="p-3 bg-red-100 text-red-700 rounded-lg flex items-center gap-2 text-sm font-medium">
            <LucideAlertCircle className="w-4 h-4 shrink-0" />
            {errorMsg}
          </div>
        )}

        {isEmptyConfig && (
          <div className="p-4 bg-red-100 text-red-800 rounded-lg border border-red-200 dark:bg-red-950/20 dark:text-red-300 dark:border-red-800 text-sm space-y-2">
            <div className="font-bold flex items-center gap-1.5">
              <LucideAlertCircle className="w-4.5 h-4.5 shrink-0" />
              Cấu hình máy bế chưa sẵn sàng
            </div>
            <p>
              {isAdminOrManager 
                ? "Chưa có cấu hình máy bế. Vui lòng vào Cấu hình bảng giá để thiết lập."
                : "Bảng cấu hình máy bế chưa đủ, vui lòng báo quản lý cấu hình."}
            </p>
            {isAdminOrManager && (
              <a href="/dashboard/pricing-config" className="text-blue-600 hover:underline font-semibold block mt-1">
                Đi tới Cấu hình bảng giá &rarr;
              </a>
            )}
          </div>
        )}

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 mb-4">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-blue-50 dark:bg-blue-900/20 rounded-t-xl flex justify-between items-center">
            <h2 className="font-bold text-blue-800 dark:text-blue-300 flex items-center gap-2">
              <LucideZap className="w-5 h-5" /> Nhập nhanh báo giá
            </h2>
          </div>
          <div className="p-4 space-y-3">
            <textarea
              value={quickInputText}
              onChange={e => setQuickInputText(e.target.value)}
              placeholder="VD: 600 tem tròn 5cm decal giấy cán bóng bế demi theo hình..."
              className="w-full p-3 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500 resize-none h-24"
            />
            <button
              type="button"
              onClick={handleQuickInputParse}
              disabled={!quickInputText.trim()}
              className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg disabled:opacity-50 transition-colors flex justify-center items-center gap-2"
            >
              <LucideZap className="w-4 h-4" /> Tự điền form
            </button>

            {quickInputResult && (
              <div className="mt-4 text-sm bg-slate-50 dark:bg-slate-800/50 p-3 rounded-lg border border-slate-200 dark:border-slate-700">
                <div className="font-medium text-slate-700 dark:text-slate-300 mb-2">Trạng thái nhận diện:</div>
                
                {quickInputResult.missingFields.length > 0 && (
                  <div className="text-red-600 dark:text-red-400 mb-2">
                    <span className="font-semibold">Còn thiếu:</span> {quickInputResult.missingFields.join(', ')}
                  </div>
                )}
                
                {quickInputResult.warnings.length > 0 && (
                  <ul className="text-amber-600 dark:text-amber-500 list-disc list-inside mb-2 space-y-1">
                    {quickInputResult.warnings.map((w, i) => <li key={i}>{w.message}</li>)}
                  </ul>
                )}

                {materialWarning && (
                  <div className="text-amber-600 dark:text-amber-500 mb-2">
                    <span className="font-semibold">Lưu ý chất liệu:</span> {materialWarning}
                  </div>
                )}

                {quickInputResult.success && !materialWarning && (
                  <div className="text-emerald-600 dark:text-emerald-400">
                    <span className="font-semibold">Đã tự điền form thành công.</span> Bạn có thể kiểm tra lại thông tin và bấm "Tính giá".
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-t-xl">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">1. Thông tin khách hàng</h2>
          </div>
          <div className="p-4">
            <div className="relative">
              <input 
                type="text" 
                value={customerSearch} 
                onChange={e => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerDropdown(true);
                  if (customerId) setCustomerId(''); // Xóa id nếu user gõ text mới
                }}
                onFocus={() => setShowCustomerDropdown(true)}
                onBlur={() => setTimeout(() => setShowCustomerDropdown(false), 200)}
                placeholder="Nhập tên hoặc số điện thoại để tìm khách hàng..."
                className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 mb-2 focus:ring-2 focus:ring-blue-500"
              />
              {showCustomerDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  {customers.filter((c: any) => 
                    c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                    (c.phone && c.phone.includes(customerSearch))
                  ).length > 0 ? (
                    customers.filter((c: any) => 
                      c.name.toLowerCase().includes(customerSearch.toLowerCase()) || 
                      (c.phone && c.phone.includes(customerSearch))
                    ).map((c: any) => (
                      <div 
                        key={c.id} 
                        onMouseDown={() => {
                          setCustomerId(c.id);
                          setCustomerSearch(c.name);
                          setShowCustomerDropdown(false);
                        }}
                        className="p-2 text-sm cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-700 border-b last:border-b-0 border-slate-100 dark:border-slate-700/50"
                      >
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{c.name}</div>
                        <div className="text-xs text-slate-500">{c.phone || 'Chưa có SĐT'}</div>
                      </div>
                    ))
                  ) : (
                    <div className="p-3 text-sm text-slate-500 text-center">Không tìm thấy khách hàng.</div>
                  )}
                </div>
              )}
            </div>
            {selectedCustomer && (
              <div className="text-xs text-slate-500 mt-2 space-y-1 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-lg border border-slate-100 dark:border-slate-800">
                <p>Khách hàng: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedCustomer.name}</span></p>
                <p>Điện thoại: <span className="font-semibold text-slate-700 dark:text-slate-300">{selectedCustomer.phone || 'Chưa có'}</span></p>
                <p>Công nợ: <span className="font-semibold text-red-500">{formatCurrencyVND(selectedCustomer.debtBalance)}</span></p>
              </div>
            )}
          </div>
        </div>

        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50">
            <h2 className="font-bold text-slate-800 dark:text-slate-100">2. Thông tin tem nhãn</h2>
          </div>
          <div className="p-4 space-y-3">
            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-600">Tên sản phẩm</label>
              <input type="text" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" placeholder="VD: Tem logo tròn" />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Hình dạng</label>
                <select value={labelShape} onChange={e => setLabelShape(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                  <option value="CIRCLE">Tròn</option>
                  <option value="RECTANGLE">Chữ nhật</option>
                  <option value="ROUNDED_RECTANGLE">Bo góc</option>
                  <option value="HEXAGON">Lục giác</option>
                  <option value="CUSTOM">Theo hình</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Số lượng tem</label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  pattern="[0-9.]*" 
                  value={formatVietnameseInteger(quantity)} 
                  onChange={e => handleIntegerChange(e.target.value, quantity, setQuantity)} 
                  className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            {labelShape === 'CIRCLE' ? (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Đường kính (cm)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={diameterCm} 
                    onChange={e => setDiameterCm(sanitizeDecimalTechnicalInput(e.target.value))} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Khoảng cách gap (mm)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={gapMm} 
                    onChange={e => setGapMm(sanitizeDecimalTechnicalInput(e.target.value))} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Rộng (cm)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={widthCm} 
                    onChange={e => setWidthCm(sanitizeDecimalTechnicalInput(e.target.value))} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Cao (cm)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={heightCm} 
                    onChange={e => setHeightCm(sanitizeDecimalTechnicalInput(e.target.value))} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Gap (mm)</label>
                  <input 
                    type="text" 
                    inputMode="decimal" 
                    value={gapMm} 
                    onChange={e => setGapMm(sanitizeDecimalTechnicalInput(e.target.value))} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-600">Chất liệu</label>
              <select value={materialId} onChange={e => setMaterialId(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                <option value="">-- Chọn chất liệu --</option>
                {materials.map((m: any) => (
                  <option key={m.id} value={m.id}>{m.name}</option>
                ))}
              </select>
              {materialSizeWarning && (
                <div className="mt-1 text-xs text-amber-600 dark:text-amber-500 flex items-center gap-1">
                  <LucideAlertCircle className="w-3.5 h-3.5 shrink-0" />
                  <span>{materialSizeWarning}</span>
                </div>
              )}
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Cán màng</label>
                <select value={laminationId} onChange={e => setLaminationId(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                  <option value="">-- Không cán màng --</option>
                  {laminations.map((l: any) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Loại bế</label>
                <select value={dieCutType} onChange={e => {
                  const val = e.target.value;
                  setDieCutType(val);
                  if (val === 'NONE') {
                    setDieCutMachine('NONE');
                  } else if (dieCutMachine === 'NONE') {
                    setDieCutMachine('Graphtec');
                  }
                }} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                  <option value="SHAPE">Bế theo hình</option>
                  <option value="STRAIGHT">Bế thẳng</option>
                  <option value="NONE">Không bế</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <details className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden group">
          <summary className="p-4 border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 font-bold text-slate-800 dark:text-slate-100 cursor-pointer list-none flex justify-between items-center hover:bg-slate-100 transition-colors">
            3. Tùy chọn nâng cao & Giá
            <span className="transition group-open:rotate-180">
              <svg fill="none" height="24" shapeRendering="geometricPrecision" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" viewBox="0 0 24 24" width="24"><path d="M6 9l6 6 6-6"></path></svg>
            </span>
          </summary>
          <div className="p-4 space-y-3 bg-white dark:bg-slate-800">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Khổ in</label>
                {isEmptyConfig ? (
                  <div className="w-full p-2 text-xs border rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400">
                    Trống
                  </div>
                ) : (
                  <select value={sheetSize} onChange={e => handleSheetSizeChange(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                    {sheetSizes.map((s: any) => (
                      <option key={s.code} value={s.code}>{s.label}</option>
                    ))}
                  </select>
                )}
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Máy bế</label>
                {isEmptyConfig ? (
                  <div className="w-full p-2 text-xs border rounded-lg bg-red-50 text-red-600 dark:bg-red-950/20 dark:text-red-400">
                    Trống
                  </div>
                ) : (
                  <select value={dieCutMachine} onChange={e => handleDieCutMachineChange(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                    {availableMachines.map((m: any) => (
                      <option key={m.machineCode} value={m.machineCode}>{m.machineName}</option>
                    ))}
                  </select>
                )}
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Kiểu bình</label>
                <select value={layoutType} onChange={e => setLayoutType(e.target.value)} className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500">
                  <option value="AUTO">Tự động (Tối ưu)</option>
                  <option value="NORMAL">Bình thường (Giữ đúng chiều)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Số con/tờ</label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  pattern="[0-9.]*" 
                  value={formatVietnameseInteger(labelsPerSheet)} 
                  placeholder="Tự động tính" 
                  onChange={e => handleIntegerChange(e.target.value, labelsPerSheet, setLabelsPerSheet)} 
                  className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">Bù hao tờ <span className="text-[10px] font-normal text-slate-400">(Chưa áp dụng)</span></label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  pattern="[0-9.]*" 
                  disabled 
                  value={wasteSheets} 
                  onChange={e => handleIntegerChange(e.target.value, wasteSheets, setWasteSheets)} 
                  className="w-full p-2 text-sm border rounded-lg bg-slate-100 dark:bg-slate-900 dark:border-slate-700 text-slate-400 cursor-not-allowed" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">
                  {canViewInternalCost ? 'Ghi đè giá in/tờ' : 'Giá in/tờ'}
                </label>
                {canViewInternalCost ? (
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    pattern="[0-9.]*" 
                    value={formatVietnameseInteger(printingPricePerSheet)} 
                    placeholder="Để trống để dùng bảng giá" 
                    onChange={e => handleIntegerChange(e.target.value, printingPricePerSheet, setPrintingPricePerSheet)} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                ) : (
                  <div className="w-full p-2 text-sm border rounded-lg bg-slate-100 dark:bg-slate-900 text-slate-500 cursor-not-allowed">
                    Tự động theo bảng giá
                  </div>
                )}
              </div>
            </div>

            <hr className="border-slate-100 dark:border-slate-700 my-2" />

            <div className="grid grid-cols-2 gap-3">
              {canViewInternalCost && (
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-600">Lợi nhuận (%)</label>
                  <input 
                    type="text" 
                    inputMode="numeric" 
                    pattern="[0-9]*" 
                    value={profitRate} 
                    onChange={e => setProfitRate(sanitizePercentInput(e.target.value))} 
                    className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                  />
                </div>
              )}
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-600">VAT (%)</label>
                <input 
                  type="text" 
                  inputMode="numeric" 
                  pattern="[0-9]*" 
                  value={vatRate} 
                  onChange={e => {
                    const val = sanitizePercentInput(e.target.value);
                    const num = parseInt(val, 10);
                    if (!isNaN(num) && num > 100) {
                      setVatRate("100");
                    } else {
                      setVatRate(val);
                    }
                  }} 
                  className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold mb-1 text-slate-600">Phí vận chuyển (VNĐ)</label>
              <input 
                type="text" 
                inputMode="numeric" 
                pattern="[0-9.]*" 
                value={formatVietnameseInteger(shippingFee)} 
                onChange={e => handleIntegerChange(e.target.value, shippingFee, setShippingFee)} 
                className="w-full p-2 text-sm border rounded-lg dark:bg-slate-900 dark:border-slate-700 focus:ring-2 focus:ring-blue-500" 
              />
            </div>
            
          </div>
        </details>
      </div>

      {/* 2. CỘT GIỮA - PREVIEW BÌNH BÀI (33-40%) */}
      <div className="xl:col-span-4">
        <div className="bg-slate-50 dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
          <div className="flex items-center justify-center mb-4">
            <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100 text-center">Sơ đồ minh họa bình bài</h2>
          </div>
          
          {previewData ? (
            <div className="flex flex-col items-center">
              {renderLayoutDemo()}
              
              <div className="grid grid-cols-2 w-full gap-4 mt-2 text-sm">
                <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
                  <div className="text-slate-500 text-xs mb-1">Số con / tờ</div>
                  <div className="font-bold text-lg text-blue-600">
                    {previewData.internalBreakdown?.effectiveItemsPerSheet || previewData.salesBreakdown?.itemsPerSheet || 0}
                  </div>
                </div>
                <div className="bg-white border rounded-lg p-3 text-center shadow-sm">
                  <div className="text-slate-500 text-xs mb-1">Khổ in</div>
                  <div className="font-bold text-lg text-slate-700">
                    {(previewData.internalBreakdown?.sheetWidthCm || previewData.salesBreakdown?.sheetWidthCm) ?? '32'} x {(previewData.internalBreakdown?.sheetHeightCm || previewData.salesBreakdown?.sheetHeightCm) ?? '35'} cm
                  </div>
                </div>
              </div>

              <div className="text-center w-full mt-3 text-xs text-slate-500">
                <p>
                  Vùng bế khả dụng:{' '}
                  <strong>
                    {(previewData.internalBreakdown?.usableWidthCm || previewData.salesBreakdown?.usableWidthCm) ?? '30.5'} x {(previewData.internalBreakdown?.usableHeightCm || previewData.salesBreakdown?.usableHeightCm) ?? '31.5'} cm
                  </strong>
                  {/* Vùng bế khả dụng: <strong>30.5 x 31.5 cm</strong> */}
                </p>

              </div>

              {previewData.internalBreakdown?.autoPackedItemsPerSheet > previewData.internalBreakdown?.effectiveItemsPerSheet && (
                 <div className="mt-4 p-3 bg-yellow-50 text-yellow-800 text-xs rounded-lg border border-yellow-200 flex items-start gap-2">
                   <LucideAlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                   <span>
                     Engine tính hình học được <strong>{previewData.internalBreakdown.autoPackedItemsPerSheet}</strong> con/tờ, 
                     nhưng hệ thống đã dùng <strong>{previewData.internalBreakdown.effectiveItemsPerSheet}</strong> con/tờ 
                     theo policy sản xuất để báo giá an toàn.
                   </span>
                 </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed border-slate-200 rounded-xl text-slate-400 text-sm">
              Sơ đồ sẽ hiển thị sau khi tính giá
            </div>
          )}
        </div>
      </div>

      {/* 3. CỘT PHẢI - KẾT QUẢ & ĐỀ XUẤT (25-33%) */}
      <div className="xl:col-span-4 space-y-6">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-sm border border-slate-200 dark:border-slate-700 p-6 sticky top-6">
          <h2 className="text-xl font-bold mb-4 text-slate-800 dark:text-slate-100">Kết quả báo giá</h2>
          
          {previewData ? (
            <>
              <div className="space-y-3 mb-6 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số lượng tem:</span> 
                  <span className="font-bold text-slate-800">{quantity}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Tổng tờ in:</span> 
                  <span className="font-semibold text-slate-700">{previewData.internalBreakdown?.totalSheets || previewData.salesBreakdown?.totalSheets || 0}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Số tem dư:</span> 
                  <span className="font-semibold text-slate-700">{previewData.internalBreakdown?.wasteItems || previewData.salesBreakdown?.wasteItems || 0}</span>
                </div>
              </div>

              <hr className="my-4 border-slate-200 dark:border-slate-700 border-dashed" />

              {/* Bảng giá */}
              <div className="space-y-3 mb-6">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Đơn giá / tem:</span> 
                  <span className="font-semibold text-slate-800">{formatCurrencyVND(previewData.unitPrice)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Thành tiền (Chưa VAT):</span> 
                  <span className="font-bold text-green-600">{formatCurrencyVND(previewData.sellingPrice)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">Phí vận chuyển:</span> 
                  <span className="font-medium text-slate-700">{formatCurrencyVND(Number(shippingFee) || 0)}</span>
                </div>
                <div className="flex justify-between items-center text-sm">
                  <span className="text-slate-500">VAT ({vatRate}%):</span> 
                  <span className="text-slate-700">{formatCurrencyVND(previewData.vatAmount)}</span>
                </div>
                <div className="flex justify-between items-end mt-4 pt-4 border-t border-slate-200">
                  <span className="font-bold text-slate-800">TỔNG THANH TOÁN:</span> 
                  <span className="text-2xl font-black text-blue-600 leading-none">{formatCurrencyVND(previewData.totalAmount)} {/* totalAmount + (shippingFee || 0) */}</span>
                </div>
              </div>

              {/* Internal Cost Block */}
              {canViewInternalCost && previewData.internalTotalCost !== undefined && (
                <div className="mt-6 p-4 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-2">
                  <div className="font-bold text-slate-700 mb-3 border-b pb-2">Chi phí sản xuất nội bộ</div>
                  <div className="flex justify-between text-slate-600"><span>Vật liệu:</span> <span>{formatCurrencyVND(previewData.internalMaterialCost)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>In ấn:</span> <span>{formatCurrencyVND(previewData.internalPrintCost)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Cán màng:</span> <span>{formatCurrencyVND(previewData.internalFinishingCost)}</span></div>
                  <div className="flex justify-between text-slate-600"><span>Bế:</span> <span>{formatCurrencyVND(previewData.internalDieCutCost)}</span></div>
                  <div className="flex justify-between font-bold text-slate-800 pt-2 border-t mt-2"><span>Tổng chi phí:</span> <span>{formatCurrencyVND(previewData.internalTotalCost)}</span></div>
                  <div className="flex justify-between font-bold text-green-700 mt-2"><span>Lợi nhuận gộp:</span> <span>{formatCurrencyVND(previewData.grossProfit)} ({previewData.grossMarginPercent}%)</span></div>
                </div>
              )}

              {/* Khối Đề xuất tối ưu */}
              <div className="mt-6 p-4 bg-emerald-50 border border-emerald-100 rounded-xl">
                <h3 className="font-bold text-emerald-800 text-sm mb-2 flex items-center gap-1">
                  Đề xuất tối ưu
                </h3>
                <p className="text-emerald-700 text-xs">
                  Chưa có đề xuất tối ưu cho cấu hình này.
                </p>
              </div>

              {previewData.safeWarnings?.length > 0 && (
                <div className="mt-6 p-3 bg-red-50 text-red-800 text-xs rounded-lg border border-red-200">
                  <strong className="block mb-1">Cảnh báo hệ thống:</strong>
                  <ul className="list-disc pl-4 space-y-1">
                    {previewData.safeWarnings.map((w: string, i: number) => {
                      if (w.startsWith('MISSING_') && w !== 'MISSING_DIECUT_MACHINE_CONFIG' && !canViewInternalCost) return null;
                      
                      let text = w;
                      if (w === 'AUTO_PACK_EXCEEDS_PRODUCTION_POLICY') text = 'Auto-pack vượt policy sản xuất.';
                      if (w === 'ITEMS_PER_SHEET_OVERRIDDEN') text = 'Số con/tờ đã được nhập tay.';
                      if (w === 'MISSING_MATERIAL_CONFIG') text = 'Thiếu cấu hình giá vật liệu.';
                      if (w === 'MISSING_PRINT_CONFIG') text = 'Thiếu cấu hình giá in ấn.';
                      if (w === 'MISSING_LAMINATION_CONFIG') text = 'Thiếu cấu hình giá cán màng.';
                      if (w === 'MISSING_DIECUT_CONFIG') text = 'Thiếu cấu hình giá bế.';
                      if (w === 'MISSING_DIECUT_MACHINE_CONFIG') text = 'Thiếu cấu hình vùng bế cho máy bế này.';
                      if (w === 'INVALID_INPUT') text = 'Thông tin nhập chưa hợp lệ.';
                      return <li key={i}>{text}</li>;
                    })}
                    {previewData.safeWarnings.some((w: string) => w.startsWith('MISSING_')) && !canViewInternalCost && (
                      <li>Bảng giá chưa đủ, vui lòng báo quản lý cấu hình.</li>
                    )}
                  </ul>
                  
                  {canViewInternalCost && previewData.safeWarnings.some((w: string) => w.startsWith('MISSING_')) && (
                    <div className="mt-2 pt-2 border-t border-red-200">
                      <a href="/dashboard/pricing-config" target="_blank" className="text-blue-600 hover:underline inline-flex items-center gap-1 font-medium">
                        Đi tới Cấu hình bảng giá <LucideArrowRight className="w-3 h-3" />
                      </a>
                    </div>
                  )}
                </div>
              )}

              <div className="mt-6 flex flex-col gap-2">
                <button 
                  onClick={() => handleSave('DRAFT')}
                  disabled={isSaving}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <LucideSave className="w-4 h-4" /> Lưu báo giá
                </button>
                <button 
                  onClick={() => handleSave('SENT')}
                  disabled={isSaving}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg flex items-center justify-center gap-2 shadow transition-colors"
                >
                  <LucideArrowRight className="w-4 h-4" /> Tạo bản gửi khách
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-48 text-slate-400 text-sm">
              <LucideCalculator className="w-12 h-12 text-slate-200 mb-3" />
              Chưa có kết quả báo giá
            </div>
          )}
        </div>
      </div>
      
    </div>
  );
}
