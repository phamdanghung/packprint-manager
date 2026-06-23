'use client';

import React, { useState, useTransition } from 'react';
import {
  Package, Layers, Scissors, BookOpen, FileText,
  PlusCircle, Edit3, Power, AlertTriangle, CheckCircle2,
  AlertCircle, X, Loader2, ChevronDown, Eye
} from 'lucide-react';
import { formatCurrencyVND } from '@/lib/utils';
import {
  getMaterials, createMaterial, updateMaterial, toggleMaterialStatus,
  getLaminationPrices, createLaminationPrice, updateLaminationPrice, toggleLaminationStatus,
  getDieCutPrices, createDieCutPrice, updateDieCutPrice, toggleDieCutStatus,
  getPricingRules, updatePricingRule, togglePricingRuleStatus,
  getFileHandlingFees, createFileHandlingFee, updateFileHandlingFee, toggleFileHandlingFeeStatus,
} from '@/lib/pricing-actions';
import {
  getDieCutMachineConfigs, createDieCutMachineConfig, updateDieCutMachineConfig, toggleDieCutMachineConfigStatus
} from '@/lib/diecut-machine-actions';
import { Settings } from 'lucide-react';

// ─── Types ──────────────────────────────────────────────────────────────────
type Material = Awaited<ReturnType<typeof getMaterials>>[0];
type LaminationPrice = Awaited<ReturnType<typeof getLaminationPrices>>[0];
type DieCutPrice = Awaited<ReturnType<typeof getDieCutPrices>>[0];
type PricingRule = Awaited<ReturnType<typeof getPricingRules>>[0];
type FileHandlingFee = Awaited<ReturnType<typeof getFileHandlingFees>>[0];
type DieCutMachineConfig = Awaited<ReturnType<typeof getDieCutMachineConfigs>>[0];

interface Props {
  initialMaterials: Material[];
  initialLaminationPrices: LaminationPrice[];
  initialDieCutPrices: DieCutPrice[];
  initialPricingRules: PricingRule[];
  initialFileHandlingFees: FileHandlingFee[];
  initialDieCutMachineConfigs: DieCutMachineConfig[];
  userRole: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────
const MATERIAL_TYPES: Record<string, string> = {
  DECAL_GIAY: 'Decal Giấy', DECAL_NHUA_SUA: 'Decal Nhựa Sữa', DECAL_NHUA_TRONG: 'Decal Nhựa Trong',
  DECAL_XI_BAC: 'Decal Xi Bạc', DECAL_7_MAU: 'Decal 7 Màu', PAPER: 'Giấy', OTHER: 'Khác',
};
const MATERIAL_TYPE_COLORS: Record<string, string> = {
  DECAL_GIAY: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  DECAL_NHUA_SUA: 'bg-sky-500/10 text-sky-600 border-sky-500/20',
  DECAL_NHUA_TRONG: 'bg-teal-500/10 text-teal-600 border-teal-500/20',
  DECAL_XI_BAC: 'bg-slate-500/10 text-slate-600 border-slate-500/20',
  DECAL_7_MAU: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  PAPER: 'bg-green-500/10 text-green-600 border-green-500/20',
  OTHER: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
};
const LAMINATION_TYPES: Record<string, string> = {
  NONE: 'Không cán màng', THERMAL_GLOSS: 'Cán nhiệt bóng', THERMAL_MATTE: 'Cán nhiệt mờ',
  ADHESIVE_GLOSS: 'Cán màng keo bóng', ADHESIVE_MATTE: 'Cán màng keo mờ',
};
const LAMINATION_COLORS: Record<string, string> = {
  NONE: 'bg-slate-500/10 text-slate-500 border-slate-500/20',
  THERMAL_GLOSS: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  THERMAL_MATTE: 'bg-orange-500/10 text-orange-600 border-orange-500/20',
  ADHESIVE_GLOSS: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  ADHESIVE_MATTE: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
};

const TABS = [
  { id: 'materials', label: 'Vật tư in', icon: Package },
  { id: 'lamination', label: 'Cán màng', icon: Layers },
  { id: 'diecut', label: 'Bế demi', icon: Scissors },
  { id: 'diecut-machine', label: 'Cấu hình máy bế', icon: Settings },
  { id: 'rules', label: 'Quy tắc tính giá', icon: BookOpen },
  { id: 'fees', label: 'Phí xử lý file', icon: FileText },
];

// ─── Status Badge ────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${
      status === 'ACTIVE'
        ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
        : 'bg-rose-500/10 text-rose-600 border-rose-500/20'
    }`}>
      {status === 'ACTIVE' ? 'Đang dùng' : 'Tắt'}
    </span>
  );
}

// ─── Action Buttons ──────────────────────────────────────────────────────────
function ActionBtn({ onClick, icon: Icon, color, title }: { onClick: () => void; icon: any; color: string; title: string }) {
  return (
    <button onClick={onClick} title={title}
      className={`p-1.5 rounded-lg text-slate-500 dark:text-slate-400 transition-all cursor-pointer active:scale-90 ${color}`}>
      <Icon className="h-3.5 w-3.5" />
    </button>
  );
}

// ─── Toast ──────────────────────────────────────────────────────────────────
function Toast({ toast }: { toast: { type: 'success' | 'error'; msg: string } | null }) {
  if (!toast) return null;
  return (
    <div className={`fixed top-5 right-5 z-50 flex items-center gap-2.5 px-5 py-4 rounded-2xl shadow-xl border backdrop-blur-xl ${
      toast.type === 'success' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
    }`}>
      {toast.type === 'success' ? <CheckCircle2 className="h-5 w-5" /> : <AlertCircle className="h-5 w-5" />}
      <span className="text-xs font-bold">{toast.msg}</span>
    </div>
  );
}

// ─── Modal Wrapper ───────────────────────────────────────────────────────────
function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center px-4 bg-slate-950/60 backdrop-blur-sm font-sans">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 overflow-y-auto max-h-[90vh]">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="h-8 w-8 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 flex items-center justify-center cursor-pointer transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ─── Form Input ──────────────────────────────────────────────────────────────
function FormInput({ label, id, required, children }: { label: string; id?: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
        {label} {required && <strong className="text-rose-500">*</strong>}
      </label>
      {children}
    </div>
  );
}
const inputCls = "w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3.5 py-2.5 text-xs text-slate-800 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500/50";
const selectCls = "w-full rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 px-3 py-2.5 text-xs text-slate-800 dark:text-white focus:outline-none focus:ring-2 focus:ring-teal-500/50 cursor-pointer";

// ─── Table Wrapper ───────────────────────────────────────────────────────────
function TableWrap({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-100 dark:border-slate-800/80">
      <table className="w-full text-left border-collapse text-xs">{children}</table>
    </div>
  );
}
function Th({ children, right, center }: { children: React.ReactNode; right?: boolean; center?: boolean }) {
  return <th className={`py-3.5 px-4 font-semibold uppercase tracking-wider text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/60 ${right ? 'text-right' : ''} ${center ? 'text-center' : ''}`}>{children}</th>;
}
function Td({ children, right, center }: { children: React.ReactNode; right?: boolean; center?: boolean }) {
  return <td className={`py-3.5 px-4 text-slate-700 dark:text-slate-300 ${right ? 'text-right' : ''} ${center ? 'text-center' : ''}`}>{children}</td>;
}
function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <div className="h-12 w-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-3">
        <Package className="h-6 w-6" />
      </div>
      <p className="text-xs text-slate-500">{text}</p>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ══════════════════════════════════════════════════════════════════════════════
export default function PricingConfigClient({
  initialMaterials,
  initialLaminationPrices,
  initialDieCutPrices,
  initialPricingRules,
  initialFileHandlingFees,
  initialDieCutMachineConfigs,
  userRole
}: Props) {
  const [activeTab, setActiveTab] = useState('materials');
  const [isPending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: 'success' | 'error'; msg: string } | null>(null);
  const showToast = (type: 'success' | 'error', msg: string) => { setToast({ type, msg }); setTimeout(() => setToast(null), 4000); };

  const canEdit = ['ADMIN', 'MANAGER'].includes(userRole);

  // ── DieCutMachineConfig state
  const [dieCutMachines, setDieCutMachines] = useState(initialDieCutMachineConfigs);
  const [dcmModal, setDcmModal] = useState(false);
  const [editDcm, setEditDcm] = useState<DieCutMachineConfig | null>(null);
  const [dcmMachineCode, setDcmMachineCode] = useState('');
  const [dcmMachineName, setDcmMachineName] = useState('');
  const [dcmSheetSizeCode, setDcmSheetSizeCode] = useState('');
  const [dcmSheetLabel, setDcmSheetLabel] = useState('');
  const [dcmSheetWidth, setDcmSheetWidth] = useState('');
  const [dcmSheetHeight, setDcmSheetHeight] = useState('');
  const [dcmUsableWidth, setDcmUsableWidth] = useState('');
  const [dcmUsableHeight, setDcmUsableHeight] = useState('');
  const [dcmNote, setDcmNote] = useState('');
  const [dcmErr, setDcmErr] = useState<string | null>(null);

  const openDcmModal = (m?: DieCutMachineConfig) => {
    if (!canEdit) return;
    setEditDcm(m || null);
    setDcmMachineCode(m?.machineCode || '');
    setDcmMachineName(m?.machineName || '');
    setDcmSheetSizeCode(m?.sheetSizeCode || '');
    setDcmSheetLabel(m?.sheetLabel || '');
    setDcmSheetWidth(m ? String(m.sheetWidthCm) : '');
    setDcmSheetHeight(m ? String(m.sheetHeightCm) : '');
    setDcmUsableWidth(m ? String(m.usableWidthCm) : '');
    setDcmUsableHeight(m ? String(m.usableHeightCm) : '');
    setDcmNote(m?.note || '');
    setDcmErr(null);
    setDcmModal(true);
  };

  const submitDcm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canEdit) return;
    setDcmErr(null);

    const sheetWidthCm = parseFloat(dcmSheetWidth);
    const sheetHeightCm = parseFloat(dcmSheetHeight);
    const usableWidthCm = parseFloat(dcmUsableWidth);
    const usableHeightCm = parseFloat(dcmUsableHeight);

    if (isNaN(sheetWidthCm) || sheetWidthCm <= 0 || isNaN(sheetHeightCm) || sheetHeightCm <= 0) {
      return setDcmErr('Kích thước khổ in phải lớn hơn 0.');
    }
    if (isNaN(usableWidthCm) || usableWidthCm <= 0 || isNaN(usableHeightCm) || usableHeightCm <= 0) {
      return setDcmErr('Kích thước vùng bế khả dụng phải lớn hơn 0.');
    }
    if (usableWidthCm > sheetWidthCm) {
      return setDcmErr('Chiều rộng vùng bế khả dụng không được lớn hơn chiều rộng khổ in.');
    }
    if (usableHeightCm > sheetHeightCm) {
      return setDcmErr('Chiều cao vùng bế khả dụng không được lớn hơn chiều cao khổ in.');
    }

    const data = {
      machineCode: dcmMachineCode,
      machineName: dcmMachineName,
      sheetSizeCode: dcmSheetSizeCode,
      sheetLabel: dcmSheetLabel,
      sheetWidthCm,
      sheetHeightCm,
      usableWidthCm,
      usableHeightCm,
      note: dcmNote
    };

    startTransition(async () => {
      const res = editDcm 
        ? await updateDieCutMachineConfig(editDcm.id, data) 
        : await createDieCutMachineConfig(data);
      if (res.success) {
        showToast('success', editDcm ? 'Cập nhật cấu hình thành công.' : 'Thêm cấu hình mới thành công.');
        setDcmModal(false);
        setDieCutMachines(await getDieCutMachineConfigs());
      } else {
        setDcmErr(res.error || 'Lỗi không xác định.');
      }
    });
  };

  const toggleDcm = async (m: DieCutMachineConfig) => {
    if (!canEdit) return;
    startTransition(async () => {
      const res = await toggleDieCutMachineConfigStatus(m.id);
      if (res.success) {
        showToast('success', `Đã thay đổi trạng thái cấu hình.`);
        setDieCutMachines(await getDieCutMachineConfigs());
      } else {
        showToast('error', res.error || 'Lỗi.');
      }
    });
  };

  // ── Materials state
  const [materials, setMaterials] = useState(initialMaterials);
  const [matModal, setMatModal] = useState(false);
  const [editMat, setEditMat] = useState<Material | null>(null);
  const [matCode, setMatCode] = useState(''); const [matName, setMatName] = useState('');
  const [matType, setMatType] = useState('DECAL_GIAY');
  const [matW, setMatW] = useState('32'); const [matH, setMatH] = useState('35');
  const [matPrice, setMatPrice] = useState(''); const [matNote, setMatNote] = useState('');
  const [matErr, setMatErr] = useState<string | null>(null);

  const openMatModal = (m?: Material) => {
    setEditMat(m || null); setMatCode(m?.materialCode || ''); setMatName(m?.name || '');
    setMatType(m?.materialType || 'DECAL_GIAY'); setMatW(String(m?.sheetWidthCm || 32));
    setMatH(String(m?.sheetHeightCm || 35)); setMatPrice(String(m?.basePrice || ''));
    setMatNote(m?.note || ''); setMatErr(null); setMatModal(true);
  };
  const submitMat = async (e: React.FormEvent) => {
    e.preventDefault(); setMatErr(null);
    const data = { materialCode: matCode, name: matName, materialType: matType, sheetWidthCm: parseFloat(matW), sheetHeightCm: parseFloat(matH), basePrice: parseFloat(matPrice), note: matNote };
    startTransition(async () => {
      const res = editMat ? await updateMaterial(editMat.id, data) : await createMaterial(data);
      if (res.success) {
        showToast('success', editMat ? 'Đã cập nhật vật tư thành công.' : 'Đã tạo vật tư mới thành công.');
        setMatModal(false);
        const fresh = await getMaterials();
        setMaterials(fresh);
      } else { setMatErr(res.error || 'Lỗi không xác định.'); }
    });
  };
  const toggleMat = async (m: Material) => {
    startTransition(async () => {
      const res = await toggleMaterialStatus(m.id);
      if (res.success) { showToast('success', `Đã ${res.data?.status === 'ACTIVE' ? 'bật' : 'tắt'} vật tư ${m.materialCode}.`); const fresh = await getMaterials(); setMaterials(fresh); }
      else showToast('error', res.error || 'Lỗi thay đổi trạng thái.');
    });
  };

  // ── Lamination state
  const [laminations, setLaminations] = useState(initialLaminationPrices);
  const [lamModal, setLamModal] = useState(false);
  const [editLam, setEditLam] = useState<LaminationPrice | null>(null);
  const [lamName, setLamName] = useState(''); const [lamType, setLamType] = useState('NONE');
  const [lamPrice, setLamPrice] = useState(''); const [lamNote, setLamNote] = useState('');
  const [lamErr, setLamErr] = useState<string | null>(null);

  const openLamModal = (m?: LaminationPrice) => {
    setEditLam(m || null); setLamName(m?.name || ''); setLamType(m?.laminationType || 'NONE');
    setLamPrice(String(m?.pricePerSheet || '')); setLamNote(m?.note || ''); setLamErr(null); setLamModal(true);
  };
  const submitLam = async (e: React.FormEvent) => {
    e.preventDefault(); setLamErr(null);
    const data = { name: lamName, laminationType: lamType, pricePerSheet: parseFloat(lamPrice), note: lamNote };
    startTransition(async () => {
      const res = editLam ? await updateLaminationPrice(editLam.id, data) : await createLaminationPrice(data);
      if (res.success) { showToast('success', 'Cập nhật cán màng thành công.'); setLamModal(false); setLaminations(await getLaminationPrices()); }
      else { setLamErr(res.error || 'Lỗi.'); }
    });
  };
  const toggleLam = async (m: LaminationPrice) => {
    startTransition(async () => {
      const res = await toggleLaminationStatus(m.id);
      if (res.success) { showToast('success', `Đã ${res.data?.status === 'ACTIVE' ? 'bật' : 'tắt'} cán màng.`); setLaminations(await getLaminationPrices()); }
      else showToast('error', res.error || 'Lỗi.');
    });
  };

  // ── DieCut state
  const [dieCuts, setDieCuts] = useState(initialDieCutPrices);
  const [dcModal, setDcModal] = useState(false);
  const [editDc, setEditDc] = useState<DieCutPrice | null>(null);
  const [dcMin, setDcMin] = useState(''); const [dcMax, setDcMax] = useState('');
  const [dcShape, setDcShape] = useState(''); const [dcStraight, setDcStraight] = useState('');
  const [dcErr, setDcErr] = useState<string | null>(null);

  const openDcModal = (m?: DieCutPrice) => {
    setEditDc(m || null); setDcMin(String(m?.minSheets || '')); setDcMax(m?.maxSheets != null ? String(m.maxSheets) : '');
    setDcShape(String(m?.shapeCutPrice || '')); setDcStraight(String(m?.straightCutPrice || ''));
    setDcErr(null); setDcModal(true);
  };
  const submitDc = async (e: React.FormEvent) => {
    e.preventDefault(); setDcErr(null);
    const data = { minSheets: parseInt(dcMin), maxSheets: dcMax.trim() ? parseInt(dcMax) : null, shapeCutPrice: parseFloat(dcShape), straightCutPrice: parseFloat(dcStraight) };
    startTransition(async () => {
      const res = editDc ? await updateDieCutPrice(editDc.id, data) : await createDieCutPrice(data);
      if (res.success) { showToast('success', 'Cập nhật bảng bế demi thành công.'); setDcModal(false); setDieCuts(await getDieCutPrices()); }
      else { setDcErr(res.error || 'Lỗi.'); }
    });
  };
  const toggleDc = async (m: DieCutPrice) => {
    startTransition(async () => {
      const res = await toggleDieCutStatus(m.id);
      if (res.success) { showToast('success', 'Đã thay đổi trạng thái bế demi.'); setDieCuts(await getDieCutPrices()); }
      else showToast('error', res.error || 'Lỗi.');
    });
  };

  // ── PricingRule state
  const [rules, setRules] = useState(initialPricingRules);
  const [ruleModal, setRuleModal] = useState(false);
  const [viewRuleModal, setViewRuleModal] = useState(false);
  const [editRule, setEditRule] = useState<PricingRule | null>(null);
  const [ruleName, setRuleName] = useState(''); const [ruleDesc, setRuleDesc] = useState('');
  const [ruleJson, setRuleJson] = useState(''); const [ruleErr, setRuleErr] = useState<string | null>(null);

  const openRuleEdit = (r: PricingRule) => {
    setEditRule(r); setRuleName(r.ruleName); setRuleDesc(r.description || '');
    setRuleJson(JSON.stringify(JSON.parse(r.configJson), null, 2)); setRuleErr(null); setRuleModal(true);
  };
  const openRuleView = (r: PricingRule) => { setEditRule(r); setViewRuleModal(true); };
  const submitRule = async (e: React.FormEvent) => {
    e.preventDefault(); setRuleErr(null);
    if (!editRule) return;
    startTransition(async () => {
      const res = await updatePricingRule(editRule.id, { ruleName, description: ruleDesc, configJson: ruleJson });
      if (res.success) { showToast('success', 'Đã cập nhật quy tắc thành công.'); setRuleModal(false); setRules(await getPricingRules()); }
      else { setRuleErr(res.error || 'Lỗi.'); }
    });
  };
  const toggleRule = async (r: PricingRule) => {
    startTransition(async () => {
      const res = await togglePricingRuleStatus(r.id);
      if (res.success) { showToast('success', `Đã ${res.data?.status === 'ACTIVE' ? 'bật' : 'tắt'} quy tắc.`); setRules(await getPricingRules()); }
      else showToast('error', res.error || 'Lỗi.');
    });
  };

  // ── FileHandlingFee state
  const [fees, setFees] = useState(initialFileHandlingFees);
  const [feeModal, setFeeModal] = useState(false);
  const [editFee, setEditFee] = useState<FileHandlingFee | null>(null);
  const [feeMin, setFeeMin] = useState(''); const [feeMax, setFeeMax] = useState('');
  const [feeAmt, setFeeAmt] = useState(''); const [feeNote, setFeeNote] = useState('');
  const [feeErr, setFeeErr] = useState<string | null>(null);

  const openFeeModal = (f?: FileHandlingFee) => {
    setEditFee(f || null); setFeeMin(String(f?.minQuantity || '')); setFeeMax(f?.maxQuantity != null ? String(f.maxQuantity) : '');
    setFeeAmt(String(f?.feeAmount || '')); setFeeNote(f?.note || ''); setFeeErr(null); setFeeModal(true);
  };
  const submitFee = async (e: React.FormEvent) => {
    e.preventDefault(); setFeeErr(null);
    const data = { minQuantity: parseInt(feeMin), maxQuantity: feeMax.trim() ? parseInt(feeMax) : null, feeAmount: parseFloat(feeAmt), note: feeNote };
    startTransition(async () => {
      const res = editFee ? await updateFileHandlingFee(editFee.id, data) : await createFileHandlingFee(data);
      if (res.success) { showToast('success', 'Cập nhật phí xử lý file thành công.'); setFeeModal(false); setFees(await getFileHandlingFees()); }
      else { setFeeErr(res.error || 'Lỗi.'); }
    });
  };
  const toggleFee = async (f: FileHandlingFee) => {
    startTransition(async () => {
      const res = await toggleFileHandlingFeeStatus(f.id);
      if (res.success) { showToast('success', 'Đã thay đổi trạng thái phí xử lý file.'); setFees(await getFileHandlingFees()); }
      else showToast('error', res.error || 'Lỗi.');
    });
  };

  // ══════════════════════════════════════════════════════════════════════════
  // RENDER
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="space-y-6 font-sans relative">
      <Toast toast={toast} />

      {/* Page Header */}
      <div className="space-y-1">
        <h1 className="text-xl font-bold text-slate-800 dark:text-white tracking-wide">Cấu hình Bảng giá</h1>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Quản lý vật tư, cán màng, bế demi, quy tắc tính giá và phí xử lý file cho module Báo giá tem nhãn decal.
        </p>
      </div>

      {/* Warning Banner */}
      <div className="flex items-start gap-3 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
        <AlertTriangle className="h-4 w-4 mt-0.5 flex-shrink-0" />
        <p className="text-xs font-medium leading-relaxed">
          <strong>Lưu ý quan trọng:</strong> Các thay đổi trong bảng giá chỉ áp dụng cho báo giá được tạo <strong>sau thời điểm chỉnh sửa</strong>. Báo giá cũ đã lưu sẽ không tự động thay đổi.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1.5 border-b border-slate-200 dark:border-slate-800 pb-0">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-semibold rounded-t-xl border-b-2 transition-all cursor-pointer ${
                isActive ? 'border-teal-500 text-teal-600 dark:text-teal-400 bg-teal-500/5' : 'border-transparent text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/50'
              }`}>
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ────── TAB: VẬT TƯ IN ────── */}
      {activeTab === 'materials' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Vật tư in ({materials.length})</span>
            <button onClick={() => openMatModal()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all">
              <PlusCircle className="h-4 w-4" /><span>Thêm vật tư</span>
            </button>
          </div>
          {materials.length === 0 ? <EmptyState text="Chưa có vật tư nào." /> : (
            <TableWrap>
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Mã vật tư</Th><Th>Tên vật tư</Th><Th>Loại</Th><Th>Khổ tờ (cm)</Th>
                <Th right>Đơn giá/tờ</Th><Th>Trạng thái</Th><Th>Ghi chú</Th><Th center>Hành động</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <Td><span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px]">{m.materialCode}</span></Td>
                    <Td><span className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</span></Td>
                    <Td>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${MATERIAL_TYPE_COLORS[m.materialType] || 'bg-slate-100'}`}>
                        {MATERIAL_TYPES[m.materialType] || m.materialType}
                      </span>
                    </Td>
                    <Td><span className="font-mono text-slate-600 dark:text-slate-400">{m.sheetWidthCm} × {m.sheetHeightCm}</span></Td>
                    <Td right><span className="font-bold text-slate-800 dark:text-white">{formatCurrencyVND(m.basePrice)}</span></Td>
                    <Td><StatusBadge status={m.status} /></Td>
                    <Td><span className="text-slate-500 text-[11px] max-w-[120px] truncate block">{m.note || '—'}</span></Td>
                    <Td center>
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn onClick={() => openMatModal(m)} icon={Edit3} color="hover:bg-indigo-500/10 hover:text-indigo-500" title="Sửa vật tư" />
                        <ActionBtn onClick={() => toggleMat(m)} icon={Power} color={m.status === 'ACTIVE' ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'} title={m.status === 'ACTIVE' ? 'Tắt' : 'Bật'} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ────── TAB: CÁN MÀNG ────── */}
      {activeTab === 'lamination' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Giá cán màng ({laminations.length})</span>
            <button onClick={() => openLamModal()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all">
              <PlusCircle className="h-4 w-4" /><span>Thêm loại cán màng</span>
            </button>
          </div>
          {laminations.length === 0 ? <EmptyState text="Chưa có loại cán màng nào." /> : (
            <TableWrap>
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Tên cán màng</Th><Th>Loại cán màng</Th><Th right>Đơn giá/tờ</Th>
                <Th>Trạng thái</Th><Th>Ghi chú</Th><Th center>Hành động</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {laminations.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <Td><span className="font-semibold text-slate-800 dark:text-slate-200">{m.name}</span></Td>
                    <Td>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${LAMINATION_COLORS[m.laminationType] || 'bg-slate-100'}`}>
                        {LAMINATION_TYPES[m.laminationType] || m.laminationType}
                      </span>
                    </Td>
                    <Td right><span className="font-bold text-slate-800 dark:text-white">{m.pricePerSheet === 0 ? 'Miễn phí' : formatCurrencyVND(m.pricePerSheet)}</span></Td>
                    <Td><StatusBadge status={m.status} /></Td>
                    <Td><span className="text-slate-500 text-[11px]">{m.note || '—'}</span></Td>
                    <Td center>
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn onClick={() => openLamModal(m)} icon={Edit3} color="hover:bg-indigo-500/10 hover:text-indigo-500" title="Sửa" />
                        <ActionBtn onClick={() => toggleLam(m)} icon={Power} color={m.status === 'ACTIVE' ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'} title={m.status === 'ACTIVE' ? 'Tắt' : 'Bật'} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ────── TAB: BẾ DEMI ────── */}
      {activeTab === 'diecut' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Bảng giá bế demi ({dieCuts.length} bậc)</span>
            <button onClick={() => openDcModal()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all">
              <PlusCircle className="h-4 w-4" /><span>Thêm bậc giá</span>
            </button>
          </div>
          {dieCuts.length === 0 ? <EmptyState text="Chưa có bậc giá bế demi nào." /> : (
            <TableWrap>
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Số tờ từ</Th><Th>Số tờ đến</Th><Th right>Giá bế theo hình/tờ</Th>
                <Th right>Giá bế thẳng/tờ</Th><Th>Trạng thái</Th><Th center>Hành động</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {dieCuts.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <Td><span className="font-bold text-slate-800 dark:text-slate-200">{m.minSheets.toLocaleString('vi-VN')}</span></Td>
                    <Td>{m.maxSheets != null ? <span className="font-bold">{m.maxSheets.toLocaleString('vi-VN')}</span> : <span className="italic text-slate-400">Không giới hạn</span>}</Td>
                    <Td right><span className="font-bold text-orange-600 dark:text-orange-400">{formatCurrencyVND(m.shapeCutPrice)}</span></Td>
                    <Td right><span className="font-bold text-blue-600 dark:text-blue-400">{formatCurrencyVND(m.straightCutPrice)}</span></Td>
                    <Td><StatusBadge status={m.status} /></Td>
                    <Td center>
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn onClick={() => openDcModal(m)} icon={Edit3} color="hover:bg-indigo-500/10 hover:text-indigo-500" title="Sửa" />
                        <ActionBtn onClick={() => toggleDc(m)} icon={Power} color={m.status === 'ACTIVE' ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'} title={m.status === 'ACTIVE' ? 'Tắt' : 'Bật'} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ────── TAB: QUY TẮC TÍNH GIÁ ────── */}
      {activeTab === 'rules' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Quy tắc tính giá ({rules.length})</span>
          </div>
          {rules.length === 0 ? <EmptyState text="Chưa có quy tắc tính giá nào." /> : (
            <TableWrap>
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Mã quy tắc</Th><Th>Tên quy tắc</Th><Th>Mô tả</Th>
                <Th>Trạng thái</Th><Th center>Hành động</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {rules.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <Td><span className="font-mono text-[11px] font-bold text-purple-600 dark:text-purple-400">{r.ruleCode}</span></Td>
                    <Td><span className="font-semibold text-slate-800 dark:text-slate-200">{r.ruleName}</span></Td>
                    <Td><span className="text-slate-500 text-[11px] max-w-[280px] line-clamp-2 block leading-relaxed">{r.description || '—'}</span></Td>
                    <Td><StatusBadge status={r.status} /></Td>
                    <Td center>
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn onClick={() => openRuleView(r)} icon={Eye} color="hover:bg-teal-500/10 hover:text-teal-500" title="Xem cấu hình JSON" />
                        <ActionBtn onClick={() => openRuleEdit(r)} icon={Edit3} color="hover:bg-indigo-500/10 hover:text-indigo-500" title="Sửa quy tắc" />
                        <ActionBtn onClick={() => toggleRule(r)} icon={Power} color={r.status === 'ACTIVE' ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'} title={r.status === 'ACTIVE' ? 'Tắt' : 'Bật'} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ────── TAB: PHÍ XỬ LÝ FILE ────── */}
      {activeTab === 'fees' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Phí xử lý file ({fees.length} bậc)</span>
            <button onClick={() => openFeeModal()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all">
              <PlusCircle className="h-4 w-4" /><span>Thêm bậc phí</span>
            </button>
          </div>
          {fees.length === 0 ? <EmptyState text="Chưa có bậc phí xử lý file nào." /> : (
            <TableWrap>
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Số lượng từ</Th><Th>Số lượng đến</Th><Th right>Phí xử lý file</Th>
                <Th>Ghi chú</Th><Th>Trạng thái</Th><Th center>Hành động</Th>
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {fees.map((f) => (
                  <tr key={f.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <Td><span className="font-bold text-slate-800 dark:text-slate-200">{f.minQuantity.toLocaleString('vi-VN')}</span></Td>
                    <Td>{f.maxQuantity != null ? <span className="font-bold">{f.maxQuantity.toLocaleString('vi-VN')}</span> : <span className="italic text-slate-400">Không giới hạn</span>}</Td>
                    <Td right><span className="font-bold text-teal-600 dark:text-teal-400">{formatCurrencyVND(f.feeAmount)}</span></Td>
                    <Td><span className="text-slate-500 text-[11px]">{f.note || '—'}</span></Td>
                    <Td><StatusBadge status={f.status} /></Td>
                    <Td center>
                      <div className="flex items-center justify-center gap-1">
                        <ActionBtn onClick={() => openFeeModal(f)} icon={Edit3} color="hover:bg-indigo-500/10 hover:text-indigo-500" title="Sửa" />
                        <ActionBtn onClick={() => toggleFee(f)} icon={Power} color={f.status === 'ACTIVE' ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'} title={f.status === 'ACTIVE' ? 'Tắt' : 'Bật'} />
                      </div>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* ════════ MODALS ════════ */}

      {/* Modal: Vật tư */}
      <Modal open={matModal} onClose={() => setMatModal(false)} title={editMat ? `Sửa vật tư ${editMat.materialCode}` : 'Thêm vật tư mới'}>
        {matErr && <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle className="h-4 w-4 flex-shrink-0" />{matErr}</div>}
        <form onSubmit={submitMat} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Mã vật tư" id="mat-code" required>
              <input id="mat-code" className={inputCls} value={matCode} onChange={e => setMatCode(e.target.value)} placeholder="DECAL-GIAY-3235" disabled={!!editMat || isPending} />
            </FormInput>
            <FormInput label="Loại vật tư" required>
              <select className={selectCls} value={matType} onChange={e => setMatType(e.target.value)} disabled={isPending}>
                {Object.entries(MATERIAL_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormInput>
          </div>
          <FormInput label="Tên vật tư" id="mat-name" required>
            <input id="mat-name" className={inputCls} value={matName} onChange={e => setMatName(e.target.value)} placeholder="Decal giấy 32x35" disabled={isPending} />
          </FormInput>
          <div className="grid grid-cols-3 gap-3">
            <FormInput label="Rộng (cm)" required>
              <input type="number" className={inputCls} value={matW} onChange={e => setMatW(e.target.value)} min="1" step="0.5" disabled={isPending} />
            </FormInput>
            <FormInput label="Cao (cm)" required>
              <input type="number" className={inputCls} value={matH} onChange={e => setMatH(e.target.value)} min="1" step="0.5" disabled={isPending} />
            </FormInput>
            <FormInput label="Đơn giá/tờ (VND)" required>
              <input type="number" className={inputCls} value={matPrice} onChange={e => setMatPrice(e.target.value)} min="0" placeholder="2500" disabled={isPending} />
            </FormInput>
          </div>
          <FormInput label="Ghi chú">
            <input className={inputCls} value={matNote} onChange={e => setMatNote(e.target.value)} placeholder="Ghi chú thêm..." disabled={isPending} />
          </FormInput>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setMatModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Hủy</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer">
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : 'Lưu vật tư'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Cán màng */}
      <Modal open={lamModal} onClose={() => setLamModal(false)} title={editLam ? 'Sửa loại cán màng' : 'Thêm loại cán màng'}>
        {lamErr && <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle className="h-4 w-4 flex-shrink-0" />{lamErr}</div>}
        <form onSubmit={submitLam} className="space-y-4">
          <FormInput label="Tên loại cán màng" required>
            <input className={inputCls} value={lamName} onChange={e => setLamName(e.target.value)} placeholder="Cán nhiệt bóng" disabled={isPending} />
          </FormInput>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Loại cán màng" required>
              <select className={selectCls} value={lamType} onChange={e => setLamType(e.target.value)} disabled={isPending}>
                {Object.entries(LAMINATION_TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </FormInput>
            <FormInput label="Đơn giá/tờ (VND)" required>
              <input type="number" className={inputCls} value={lamPrice} onChange={e => setLamPrice(e.target.value)} min="0" placeholder="1000" disabled={isPending} />
            </FormInput>
          </div>
          <FormInput label="Ghi chú">
            <input className={inputCls} value={lamNote} onChange={e => setLamNote(e.target.value)} placeholder="Ghi chú..." disabled={isPending} />
          </FormInput>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setLamModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Hủy</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer">
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Bế demi */}
      <Modal open={dcModal} onClose={() => setDcModal(false)} title={editDc ? 'Sửa bậc giá bế demi' : 'Thêm bậc giá bế demi'}>
        {dcErr && <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle className="h-4 w-4 flex-shrink-0" />{dcErr}</div>}
        <form onSubmit={submitDc} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Số tờ từ" required>
              <input type="number" className={inputCls} value={dcMin} onChange={e => setDcMin(e.target.value)} min="1" disabled={isPending} />
            </FormInput>
            <FormInput label="Số tờ đến (để trống = không giới hạn)">
              <input type="number" className={inputCls} value={dcMax} onChange={e => setDcMax(e.target.value)} min="1" placeholder="Không giới hạn" disabled={isPending} />
            </FormInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Giá bế theo hình/tờ (VND)" required>
              <input type="number" className={inputCls} value={dcShape} onChange={e => setDcShape(e.target.value)} min="0" disabled={isPending} />
            </FormInput>
            <FormInput label="Giá bế thẳng/tờ (VND)" required>
              <input type="number" className={inputCls} value={dcStraight} onChange={e => setDcStraight(e.target.value)} min="0" disabled={isPending} />
            </FormInput>
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setDcModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Hủy</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer">
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Xem JSON quy tắc */}
      <Modal open={viewRuleModal} onClose={() => setViewRuleModal(false)} title={`Cấu hình: ${editRule?.ruleName}`}>
        <div className="space-y-3">
          <p className="text-xs text-slate-500">{editRule?.description}</p>
          <div className="bg-slate-950 rounded-xl p-4 overflow-x-auto">
            <pre className="text-[11px] text-teal-400 font-mono leading-relaxed whitespace-pre-wrap">
              {editRule ? JSON.stringify(JSON.parse(editRule.configJson), null, 2) : ''}
            </pre>
          </div>
          <div className="flex justify-end">
            <button onClick={() => { setViewRuleModal(false); openRuleEdit(editRule!); }} className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold bg-indigo-500 hover:bg-indigo-400 text-white cursor-pointer">
              <Edit3 className="h-3.5 w-3.5" /> Chỉnh sửa quy tắc
            </button>
          </div>
        </div>
      </Modal>

      {/* Modal: Sửa quy tắc */}
      <Modal open={ruleModal} onClose={() => setRuleModal(false)} title={`Sửa quy tắc: ${editRule?.ruleCode}`}>
        <div className="flex items-start gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-700 dark:text-amber-400">
          <AlertTriangle className="h-4 w-4 flex-shrink-0 mt-0.5" />
          <p className="text-[11px] font-medium">Thay đổi quy tắc này có thể ảnh hưởng đến các báo giá tạo sau thời điểm chỉnh sửa.</p>
        </div>
        {ruleErr && <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle className="h-4 w-4 flex-shrink-0" />{ruleErr}</div>}
        <form onSubmit={submitRule} className="space-y-4">
          <FormInput label="Tên quy tắc" required>
            <input className={inputCls} value={ruleName} onChange={e => setRuleName(e.target.value)} disabled={isPending} />
          </FormInput>
          <FormInput label="Mô tả">
            <textarea className={`${inputCls} min-h-[60px]`} value={ruleDesc} onChange={e => setRuleDesc(e.target.value)} disabled={isPending} />
          </FormInput>
          <FormInput label="Cấu hình JSON" required>
            <textarea className={`${inputCls} min-h-[140px] font-mono text-[11px] leading-relaxed`} value={ruleJson} onChange={e => setRuleJson(e.target.value)} disabled={isPending} />
          </FormInput>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setRuleModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Hủy</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer">
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : 'Lưu quy tắc'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal: Phí xử lý file */}
      <Modal open={feeModal} onClose={() => setFeeModal(false)} title={editFee ? 'Sửa bậc phí xử lý file' : 'Thêm bậc phí xử lý file'}>
        {feeErr && <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle className="h-4 w-4 flex-shrink-0" />{feeErr}</div>}
        <form onSubmit={submitFee} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Số lượng từ" required>
              <input type="number" className={inputCls} value={feeMin} onChange={e => setFeeMin(e.target.value)} min="1" disabled={isPending} />
            </FormInput>
            <FormInput label="Số lượng đến (trống = không giới hạn)">
              <input type="number" className={inputCls} value={feeMax} onChange={e => setFeeMax(e.target.value)} min="1" placeholder="Không giới hạn" disabled={isPending} />
            </FormInput>
          </div>
          <FormInput label="Phí xử lý file (VND)" required>
            <input type="number" className={inputCls} value={feeAmt} onChange={e => setFeeAmt(e.target.value)} min="0" disabled={isPending} />
          </FormInput>
          <FormInput label="Ghi chú">
            <input className={inputCls} value={feeNote} onChange={e => setFeeNote(e.target.value)} placeholder="Ghi chú..." disabled={isPending} />
          </FormInput>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setFeeModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Hủy</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer">
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : 'Lưu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ────── TAB: CẤU HÌNH MÁY BẾ ────── */}
      {activeTab === 'diecut-machine' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-slate-800 dark:text-white">Cấu hình máy bế ({dieCutMachines.length})</span>
            {canEdit && (
              <button onClick={() => openDcmModal()} className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white shadow-md shadow-teal-500/10 cursor-pointer transition-all">
                <PlusCircle className="h-4 w-4" /><span>Thêm cấu hình</span>
              </button>
            )}
          </div>
          {dieCutMachines.length === 0 ? <EmptyState text="Chưa có cấu hình máy bế nào." /> : (
            <TableWrap>
              <thead><tr className="border-b border-slate-100 dark:border-slate-800">
                <Th>Mã máy bế</Th><Th>Tên máy bế</Th><Th>Khổ in</Th><Th>Kích thước khổ (cm)</Th>
                <Th>Vùng bế khả dụng (cm)</Th><Th>Trạng thái</Th><Th>Ghi chú</Th>{canEdit && <Th center>Hành động</Th>}
              </tr></thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {dieCutMachines.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/20 transition-all">
                    <Td><span className="font-mono font-bold text-teal-600 dark:text-teal-400 text-[11px]">{m.machineCode}</span></Td>
                    <Td><span className="font-semibold text-slate-800 dark:text-slate-200">{m.machineName}</span></Td>
                    <Td><span className="font-semibold text-slate-800 dark:text-slate-200">{m.sheetLabel} ({m.sheetSizeCode})</span></Td>
                    <Td><span className="font-mono text-slate-600 dark:text-slate-400">{m.sheetWidthCm} × {m.sheetHeightCm}</span></Td>
                    <Td><span className="font-mono font-bold text-orange-600 dark:text-orange-400">{m.usableWidthCm} × {m.usableHeightCm}</span></Td>
                    <Td><StatusBadge status={m.isActive ? 'ACTIVE' : 'INACTIVE'} /></Td>
                    <Td><span className="text-slate-500 text-[11px] max-w-[120px] truncate block">{m.note || '—'}</span></Td>
                    {canEdit && (
                      <Td center>
                        <div className="flex items-center justify-center gap-1">
                          <ActionBtn onClick={() => openDcmModal(m)} icon={Edit3} color="hover:bg-indigo-500/10 hover:text-indigo-500" title="Sửa cấu hình" />
                          <ActionBtn onClick={() => toggleDcm(m)} icon={Power} color={m.isActive ? 'hover:bg-rose-500/10 hover:text-rose-500' : 'hover:bg-emerald-500/10 hover:text-emerald-500'} title={m.isActive ? 'Tắt' : 'Bật'} />
                        </div>
                      </Td>
                    )}
                  </tr>
                ))}
              </tbody>
            </TableWrap>
          )}
        </div>
      )}

      {/* Modal: Cấu hình máy bế */}
      <Modal open={dcmModal} onClose={() => setDcmModal(false)} title={editDcm ? `Sửa cấu hình máy bế` : 'Thêm cấu hình máy bế mới'}>
        {dcmErr && <div className="flex items-center gap-2 p-3 rounded-xl text-xs bg-rose-500/10 text-rose-500 border border-rose-500/20"><AlertCircle className="h-4 w-4 flex-shrink-0" />{dcmErr}</div>}
        <form onSubmit={submitDcm} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Mã máy bế" id="dcm-machine-code" required>
              <input id="dcm-machine-code" className={inputCls} value={dcmMachineCode} onChange={e => setDcmMachineCode(e.target.value)} placeholder="VD: GRAPHTEC, AVITECH, NONE" disabled={!!editDcm || isPending} />
            </FormInput>
            <FormInput label="Tên máy bế" id="dcm-machine-name" required>
              <input id="dcm-machine-name" className={inputCls} value={dcmMachineName} onChange={e => setDcmMachineName(e.target.value)} placeholder="VD: Graphtec FC9000, Avitech Demarc" disabled={isPending} />
            </FormInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Mã khổ in (sheetSizeCode)" id="dcm-sheet-size-code" required>
              <input id="dcm-sheet-size-code" className={inputCls} value={dcmSheetSizeCode} onChange={e => setDcmSheetSizeCode(e.target.value)} placeholder="VD: 32x35, 32x43" disabled={!!editDcm || isPending} />
            </FormInput>
            <FormInput label="Nhãn khổ in (sheetLabel)" id="dcm-sheet-label" required>
              <input id="dcm-sheet-label" className={inputCls} value={dcmSheetLabel} onChange={e => setDcmSheetLabel(e.target.value)} placeholder="VD: 32 x 35 cm, 32 x 43 cm" disabled={isPending} />
            </FormInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Chiều rộng khổ (cm)" required>
              <input type="number" step="0.01" className={inputCls} value={dcmSheetWidth} onChange={e => setDcmSheetWidth(e.target.value)} placeholder="32" disabled={isPending} />
            </FormInput>
            <FormInput label="Chiều cao khổ (cm)" required>
              <input type="number" step="0.01" className={inputCls} value={dcmSheetHeight} onChange={e => setDcmSheetHeight(e.target.value)} placeholder="35" disabled={isPending} />
            </FormInput>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <FormInput label="Rộng vùng bế khả dụng (cm)" required>
              <input type="number" step="0.01" className={inputCls} value={dcmUsableWidth} onChange={e => setDcmUsableWidth(e.target.value)} placeholder="30.5" disabled={isPending} />
            </FormInput>
            <FormInput label="Cao vùng bế khả dụng (cm)" required>
              <input type="number" step="0.01" className={inputCls} value={dcmUsableHeight} onChange={e => setDcmUsableHeight(e.target.value)} placeholder="31.5" disabled={isPending} />
            </FormInput>
          </div>
          <FormInput label="Ghi chú">
            <input className={inputCls} value={dcmNote} onChange={e => setDcmNote(e.target.value)} placeholder="Ghi chú thêm..." disabled={isPending} />
          </FormInput>
          <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
            <button type="button" onClick={() => setDcmModal(false)} className="px-4 py-2 rounded-xl border text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer">Hủy</button>
            <button type="submit" disabled={isPending} className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-teal-500 hover:bg-teal-400 text-white disabled:opacity-60 cursor-pointer">
              {isPending ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang lưu...</> : 'Lưu cấu hình'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
