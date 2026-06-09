import React from 'react';
import Link from 'next/link';
import { Printer, FileText, Package, Truck, Receipt, Users } from 'lucide-react';

export default function PrintIndexPage() {
  return (
    <div className="p-8 max-w-4xl mx-auto">
      <div className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-slate-800 flex items-center gap-2">
          <Printer className="w-6 h-6 text-teal-600" />
          Hệ Thống In Ấn Biểu Mẫu (Print Documents)
        </h1>
        <p className="text-slate-500 mt-2">
          Hệ thống cung cấp các biểu mẫu in khổ A4 tiêu chuẩn. Vui lòng truy cập từ chi tiết của từng nghiệp vụ để in với dữ liệu cụ thể.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <FileText className="w-8 h-8 text-blue-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Báo Giá</h2>
          <p className="text-sm text-slate-500">In báo giá gửi khách hàng kèm mã QR thanh toán (nếu có tiền cần thu).</p>
        </div>
        
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <Package className="w-8 h-8 text-teal-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Đơn Hàng</h2>
          <p className="text-sm text-slate-500">In phiếu xác nhận đơn hàng kèm mã QR thanh toán số tiền còn lại.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <Printer className="w-8 h-8 text-purple-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Lệnh Sản Xuất</h2>
          <p className="text-sm text-slate-500">In lệnh sản xuất với Smart QR phục vụ xưởng. Ẩn thông tin tài chính.</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <Truck className="w-8 h-8 text-orange-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Phiếu Giao Hàng</h2>
          <p className="text-sm text-slate-500">In phiếu giao cho shipper hoặc chành xe, có hỗ trợ tiền thu hộ (COD).</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <Receipt className="w-8 h-8 text-emerald-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Phiếu Thu</h2>
          <p className="text-sm text-slate-500">In xác nhận đã nhận thanh toán, hỗ trợ in nháp với Watermark "CHƯA XÁC NHẬN".</p>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <Users className="w-8 h-8 text-rose-500 mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">Bảng Đối Chiếu</h2>
          <p className="text-sm text-slate-500">In sao kê công nợ khách hàng theo từng kỳ.</p>
        </div>
      </div>
    </div>
  );
}
