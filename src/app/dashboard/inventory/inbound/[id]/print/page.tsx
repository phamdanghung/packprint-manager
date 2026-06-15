import { getInboundReceiptDetail } from '@/lib/inventory-inbound-actions';
import { notFound } from 'next/navigation';
import PrintButton from '@/components/PrintButton';

export const metadata = {
  title: 'In Phiếu Nhập Kho',
};

export default async function PrintInboundReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = await params;
  const receipt = await getInboundReceiptDetail(resolvedParams.id);

  if (!receipt) {
    notFound();
  }

  const totalCost = receipt.items.reduce((sum: number, item: any) => sum + (item.totalCost || 0), 0);

  return (
    <div className="bg-white min-h-screen p-8 text-black font-sans">
      <div className="max-w-[210mm] mx-auto">
        <div className="print:hidden mb-4">
          <PrintButton />
        </div>

        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold uppercase mb-1">Phiếu Nhập Kho</h1>
          <p className="text-sm italic">Mã phiếu: {receipt.receiptCode}</p>
          <p className="text-sm italic">Ngày nhập: {new Date(receipt.receivedAt).toLocaleDateString('vi-VN')}</p>
        </div>

        <div className="mb-6 space-y-1 text-sm">
          <p><strong>Nhà cung cấp:</strong> {receipt.supplierName || '....................................................................'}</p>
          <p><strong>Số chứng từ gốc:</strong> {receipt.documentNo || '....................................................................'}</p>
          <p><strong>Ghi chú:</strong> {receipt.note || '....................................................................'}</p>
        </div>

        <table className="w-full text-sm border-collapse border border-black mb-8">
          <thead>
            <tr>
              <th className="border border-black p-2 w-10">STT</th>
              <th className="border border-black p-2">Mã Vật Tư</th>
              <th className="border border-black p-2">Tên Vật Tư</th>
              <th className="border border-black p-2">Khu kho</th>
              <th className="border border-black p-2">ĐVT</th>
              <th className="border border-black p-2">Số Lượng</th>
              <th className="border border-black p-2">Đơn Giá</th>
              <th className="border border-black p-2">Thành Tiền</th>
              <th className="border border-black p-2">Ghi Chú</th>
            </tr>
          </thead>
          <tbody>
            {receipt.items.map((item: any, idx: number) => (
              <tr key={item.id}>
                <td className="border border-black p-2 text-center">{idx + 1}</td>
                <td className="border border-black p-2 font-mono text-xs">{item.itemCode}</td>
                <td className="border border-black p-2">{item.itemName}</td>
                <td className="border border-black p-2 text-xs">{item.warehouseZoneName || ''}</td>
                <td className="border border-black p-2 text-center">{item.stockBaseUnit}</td>
                <td className="border border-black p-2 text-right">{item.quantityBase}</td>
                <td className="border border-black p-2 text-right">{item.unitCost ? item.unitCost.toLocaleString('vi-VN') : ''}</td>
                <td className="border border-black p-2 text-right">{item.totalCost ? item.totalCost.toLocaleString('vi-VN') : ''}</td>
                <td className="border border-black p-2">{item.note || ''}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={7} className="border border-black p-2 text-right font-bold">Tổng cộng tiền hàng:</td>
              <td colSpan={2} className="border border-black p-2 font-bold text-right">{totalCost > 0 ? totalCost.toLocaleString('vi-VN') + ' đ' : ''}</td>
            </tr>
          </tfoot>
        </table>

        <div className="grid grid-cols-4 gap-4 text-center text-sm pt-4">
          <div>
            <p className="font-bold mb-16">Người lập phiếu</p>
            <p className="italic text-xs">(Ký, họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-16">Thủ kho</p>
            <p className="italic text-xs">(Ký, họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-16">Kế toán</p>
            <p className="italic text-xs">(Ký, họ tên)</p>
          </div>
          <div>
            <p className="font-bold mb-16">Người giao hàng</p>
            <p className="italic text-xs">(Ký, họ tên)</p>
          </div>
        </div>
      </div>
    </div>
  );
}
