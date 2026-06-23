'use client';

import React, { useState } from 'react';
import { Download, X, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { exportManagementCostReport, ReportPeriodType } from '@/lib/management-cost-report-actions';
import * as XLSX from 'xlsx';

export default function ExportModal({
  isOpen,
  onClose,
  periodType,
  fromDate,
  toDate,
  label
}: {
  isOpen: boolean;
  onClose: () => void;
  periodType: string;
  fromDate?: string;
  toDate?: string;
  label: string;
}) {
  const [includeDrilldown, setIncludeDrilldown] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  if (!isOpen) return null;

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const res = await exportManagementCostReport({
        periodType: periodType as ReportPeriodType,
        fromDate,
        toDate,
        includeDrilldown
      });

      if (!res.success) {
        if (res.error === 'EXPORT_TOO_LARGE') {
          toast.error('Dữ liệu quá lớn. Vui lòng thu hẹp khoảng thời gian hoặc bỏ chọn chi tiết vật tư.');
        } else {
          toast.error(res.error || 'Lỗi khi xuất dữ liệu');
        }
        setIsExporting(false);
        return;
      }

      // Format data to Excel
      const wb = XLSX.utils.book_new();

      // 1. Summary Sheet
      const summaryData = [
        ['BÁO CÁO CHI PHÍ QUẢN TRỊ & LỢI NHUẬN GỘP', ''],
        ['Kỳ báo cáo:', label],
        ['Tổng số đơn hàng:', res.summary.totalOrders],
        ['Tổng doanh thu (VNĐ):', res.summary.totalRevenue],
        ['Tổng chi phí vật tư thực tế (VNĐ):', res.summary.totalActualMaterialCost],
        ['Tổng chi phí bổ sung (VNĐ):', res.summary.totalActualAdditionalCost],
        ['Tổng chi phí sản xuất (VNĐ):', res.summary.totalActualProductionCost],
        ['Lợi nhuận gộp tạm tính (VNĐ):', res.summary.totalGrossProfit],
        ['Tỷ suất lợi nhuận gộp (%):', res.summary.grossMarginPercent.toFixed(2) + '%'],
        [''],
        ['* Lợi nhuận gộp tạm tính theo vật tư + chi phí sản xuất bổ sung'],
        ['* Không bao gồm định phí và lợi nhuận ròng']
      ];
      const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
      XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary');

      // 2. Orders Sheet
      const ordersData = res.orders.map(o => ({
        'Mã ĐH': o.orderCode,
        'Ngày đặt': new Date(o.orderDate).toLocaleDateString('vi-VN'),
        'Khách hàng': o.customerName || '',
        'Doanh thu (VNĐ)': o.totalAmount,
        'CP Vật tư (VNĐ)': o.actualMaterialCost,
        'CP Bổ sung (VNĐ)': o.actualAdditionalCost,
        'Tổng CP SX (VNĐ)': o.actualProductionCost,
        'LN Gộp (VNĐ)': o.grossProfit,
        'Margin (%)': parseFloat(o.grossMarginPercent.toFixed(2)),
        'Cảnh báo Margin thấp': o.warnings.lowMargin ? 'CÓ' : '',
        'Cảnh báo CP Cao': o.warnings.highProductionCost ? 'CÓ' : '',
        'Thiếu Data CP': o.warnings.missingCostData ? 'CÓ' : '',
        'Cờ Quản trị': o.managementMarginFlag ? 'ĐÁNH DẤU' : '',
        'Ghi chú Quản trị': o.managementMarginNote || '',
        'Người review': o.reviewedBy || '',
        'Ngày review': o.reviewedAt ? new Date(o.reviewedAt).toLocaleString('vi-VN') : ''
      }));
      const wsOrders = XLSX.utils.json_to_sheet(ordersData);
      XLSX.utils.book_append_sheet(wb, wsOrders, 'Orders');

      // 3. Details Sheet
      if (includeDrilldown && res.drilldowns) {
        const detailsData = res.drilldowns.map(d => ({
          'Mã ĐH': d.orderCode,
          'Ngày': new Date(d.date || '').toLocaleDateString('vi-VN'),
          'Loại CP': d.type,
          'Mô tả': d.description,
          'Số lượng': d.quantity,
          'Đơn giá (VNĐ)': d.unitCost || 0,
          'Thành tiền (VNĐ)': d.totalCost,
          'Ghi chú': d.note || ''
        }));
        const wsDetails = XLSX.utils.json_to_sheet(detailsData);
        XLSX.utils.book_append_sheet(wb, wsDetails, 'Details');
      }

      // Download
      XLSX.writeFile(wb, `Management_Report_${new Date().toISOString().slice(0,10)}.xlsx`);
      toast.success('Xuất file thành công!');
      onClose();
    } catch (error) {
      console.error(error);
      toast.error('Có lỗi xảy ra khi tạo file Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col">
        <div className="p-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
            <Download className="w-5 h-5 text-indigo-600" />
            Xuất báo cáo Excel
          </h3>
          <button onClick={onClose} disabled={isExporting} className="p-1 hover:bg-slate-200 rounded-md text-slate-500">
            <X className="w-5 h-5" />
          </button>
        </div>
        
        <div className="p-6">
          <p className="text-sm text-slate-600 mb-4">
            Báo cáo sẽ được tổng hợp dựa trên cấu hình lọc hiện tại: <strong>{label}</strong>.
          </p>

          <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50 transition-colors">
            <input 
              type="checkbox" 
              checked={includeDrilldown}
              onChange={(e) => setIncludeDrilldown(e.target.checked)}
              disabled={isExporting}
              className="mt-1 w-4 h-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500"
            />
            <div>
              <div className="font-semibold text-slate-800 text-sm">Bao gồm chi tiết vật tư & phụ phí (Drilldown)</div>
              <div className="text-xs text-slate-500 mt-1">Xuất thêm sheet Details chứa thông tin chi tiết từng vật tư và phụ phí cấu thành nên giá vốn.</div>
            </div>
          </label>
        </div>

        <div className="p-4 border-t border-slate-200 bg-slate-50 flex justify-end gap-3">
          <button 
            onClick={onClose}
            disabled={isExporting}
            className="px-4 py-2 font-medium text-slate-600 hover:bg-slate-200 rounded-lg transition-colors text-sm disabled:opacity-50"
          >
            Hủy
          </button>
          <button 
            onClick={handleExport}
            disabled={isExporting}
            className="px-4 py-2 font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            Xác nhận Xuất
          </button>
        </div>
      </div>
    </div>
  );
}
