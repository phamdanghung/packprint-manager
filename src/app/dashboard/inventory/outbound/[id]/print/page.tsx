import { getOutboundReceiptDetail } from '@/lib/inventory-outbound-actions';
import { getOutboundTypeLabel } from '@/lib/inventory-outbound-types';
import { checkInventoryAccess } from '@/lib/inventory-actions';
import { notFound } from 'next/navigation';
// import { format } from 'date-fns';
import { formatCurrencyVND } from '@/lib/utils';
import { Printer } from 'lucide-react';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'In Phiếu Xuất Kho',
};

export default async function PrintOutboundReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await checkInventoryAccess();
  const showCosts = ['ADMIN', 'MANAGER', 'ACCOUNTANT'].includes(user.role);

  const resolvedParams = await params;
  const receipt = await getOutboundReceiptDetail(resolvedParams.id);

  if (!receipt) {
    notFound();
  }

  const totalCost = receipt.items.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);

  return (
    <div className="bg-gray-100 min-h-screen py-8 print:py-0 print:bg-white font-serif">
      {/* Nút in (chỉ hiện trên màn hình, ẩn khi in) */}
      <div className="max-w-[210mm] mx-auto mb-4 flex justify-end print:hidden">
        <button
          className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700"
          onClick="window.print()"
        >
          <Printer className="w-4 h-4" />
          In phiếu
        </button>
      </div>

      {/* Khung giấy A4 */}
      <div className="max-w-[210mm] min-h-[297mm] mx-auto bg-white shadow-lg print:shadow-none print:m-0 p-[20mm] box-border relative">
        {/* Header */}
        <div className="flex justify-between items-start border-b-2 border-black pb-4 mb-6">
          <div>
            <h1 className="text-xl font-bold uppercase">CÔNG TY ...</h1>
            <p className="text-sm">Địa chỉ: ...</p>
            <p className="text-sm">Điện thoại: ...</p>
          </div>
          <div className="text-right">
            <p className="text-sm">Mẫu số: 02-VT</p>
            <p className="text-xs italic">(Ban hành theo TT số ...)</p>
          </div>
        </div>

        {/* Title */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold uppercase mb-2">PHIẾU XUẤT KHO</h2>
          <p className="text-sm italic">Ngày {new Date(receipt.issuedAt).getDate().toString().padStart(2, '0')} tháng {(new Date(receipt.issuedAt).getMonth() + 1).toString().padStart(2, '0')} năm {new Date(receipt.issuedAt).getFullYear()}</p>
          <p className="text-sm">Số: <span className="font-semibold">{receipt.receiptCode}</span></p>
        </div>

        {/* Info */}
        <div className="mb-6 space-y-2 text-sm">
          <div className="flex gap-4">
            <span className="w-32">Loại xuất kho:</span>
            <span className="font-semibold">{getOutboundTypeLabel(receipt.outboundType)}</span>
          </div>
          {receipt.productionJobId && (
            <div className="flex gap-4">
              <span className="w-32">Lệnh sản xuất:</span>
              <span className="font-semibold">{receipt.productionJobId}</span>
            </div>
          )}
          {receipt.orderId && (
            <div className="flex gap-4">
              <span className="w-32">Đơn hàng:</span>
              <span className="font-semibold">{receipt.orderId}</span>
            </div>
          )}
          <div className="flex gap-4">
            <span className="w-32">Người nhận:</span>
            <span className="font-semibold">{receipt.receiverName || '...........................................'}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Bộ phận nhận:</span>
            <span className="font-semibold">{receipt.receiverDepartment || '...........................................'}</span>
          </div>
          <div className="flex gap-4">
            <span className="w-32">Ghi chú:</span>
            <span className="font-semibold">{receipt.note || '...........................................'}</span>
          </div>
        </div>

        {/* Table */}
        <table className="w-full text-sm border-collapse border border-black mb-6">
          <thead>
            <tr className="bg-gray-50">
              <th className="border border-black p-2 text-center w-12">STT</th>
              <th className="border border-black p-2 text-left">Tên, nhãn hiệu, quy cách phẩm chất vật tư</th>
              <th className="border border-black p-2 text-center">Mã số</th>
              <th className="border border-black p-2 text-center">ĐVT</th>
              <th className="border border-black p-2 text-center w-24">Số lượng</th>
              {showCosts && <th className="border border-black p-2 text-right">Đơn giá vốn</th>}
              {showCosts && <th className="border border-black p-2 text-right">Thành tiền</th>}
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item: any, idx: number) => (
              <tr key={item.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2">
                  <div className="font-medium">{item.itemName}</div>
                  {item.warehouseZoneName && <div className="text-xs text-gray-500 italic">Khu kho: {item.warehouseZoneName}</div>}
                  {item.note && <div className="text-xs italic">{item.note}</div>}
                </td>
                <td className="border border-black p-2 text-center text-xs">{item.itemCode}</td>
                <td className="border border-black p-2 text-center">{item.stockBaseUnit}</td>
                <td className="border border-black p-2 text-center font-medium">
                  {item.quantityBase.toLocaleString()}
                </td>
                {showCosts && (
                  <td className="border border-black p-2 text-right">
                    {formatCurrencyVND(item.unitCost || 0)}
                  </td>
                )}
                {showCosts && (
                  <td className="border border-black p-2 text-right font-medium">
                    {formatCurrencyVND(item.totalCost || 0)}
                  </td>
                )}
              </tr>
            ))}
            {showCosts && (
              <tr>
                <td colSpan={5} className="border border-black p-2 text-right font-bold uppercase">
                  Tổng cộng
                </td>
                <td colSpan={2} className="border border-black p-2 text-right font-bold">
                  {formatCurrencyVND(totalCost)}
                </td>
              </tr>
            )}
          </tbody>
        </table>

        {/* Signatures */}
        <div className="grid grid-cols-4 gap-4 text-center mt-8 text-sm">
          <div>
            <p className="font-bold mb-16">Người lập phiếu</p>
            <p className="text-xs italic">(Ký, họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-16">Người nhận</p>
            <p className="text-xs italic">(Ký, họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-16">Thủ kho</p>
            <p className="text-xs italic">(Ký, họ tên)</p>
          </div>
          <div>
            <p className="italic mb-1 text-xs">Ngày ..... tháng ..... năm .....</p>
            <p className="font-bold mb-16">Kế toán trưởng</p>
            <p className="text-xs italic">(Ký, họ tên)</p>
          </div>
        </div>
      </div>

      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (typeof window !== 'undefined') {
              window.document.querySelector('button').onclick = function() { window.print(); };
            }
          `
        }}
      />
    </div>
  );
}
