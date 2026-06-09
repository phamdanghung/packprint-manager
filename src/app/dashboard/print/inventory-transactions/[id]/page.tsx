import React from 'react';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';

export default async function PrintInventoryTransactionPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return <div>Không có quyền truy cập</div>;

  const { id } = await params;
  
  // Try finding as transaction first
  const transaction = await db.inventoryTransaction.findUnique({
    where: { id },
    include: {
      item: true,
      createdBy: true,
      order: true,
      productionJob: true
    }
  });

  if (transaction) {
    return (
      <div className="bg-white text-black p-8 max-w-4xl mx-auto text-sm print:p-0">
        <PrintHeader title={`PHIẾU ${transaction.type.includes('IN') || transaction.type === 'IMPORT' ? 'NHẬP' : 'XUẤT'} KHO`} />
        
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p><strong>Mã GD:</strong> {transaction.id.slice(-6).toUpperCase()}</p>
            <p><strong>Ngày:</strong> {new Date(transaction.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Người thực hiện:</strong> {transaction.createdBy?.name}</p>
          </div>
          <div className="text-right">
            {transaction.orderId && <p><strong>Tham chiếu ĐH:</strong> {transaction.order?.orderCode}</p>}
            {transaction.productionJobId && <p><strong>Tham chiếu LSX:</strong> {transaction.productionJob?.jobCode}</p>}
          </div>
        </div>

        <table className="w-full mb-8 border-collapse">
          <thead>
            <tr className="border-b-2 border-black">
              <th className="py-2 text-left">Vật tư</th>
              <th className="py-2 text-center">ĐVT</th>
              <th className="py-2 text-right">Số lượng</th>
              <th className="py-2 text-left pl-4">Lý do / Ghi chú</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-gray-300">
              <td className="py-3">{transaction.item?.name}</td>
              <td className="py-3 text-center">{transaction.item?.stockBaseUnit}</td>
              <td className="py-3 text-right font-bold">{Math.abs(transaction.quantity)}</td>
              <td className="py-3 pl-4">{transaction.reason || transaction.note}</td>
            </tr>
          </tbody>
        </table>

        <PrintFooter />
      </div>
    );
  }

  // Try finding as conversion
  const conversion = await db.inventoryConversion.findUnique({
    where: { id },
    include: {
      fromMaterial: true,
      outputLines: { include: { toMaterial: true } },
      createdBy: true,
      order: true,
      productionJob: true
    }
  });

  if (conversion) {
    return (
      <div className="bg-white text-black p-8 max-w-4xl mx-auto text-sm print:p-0">
        <PrintHeader title="PHIẾU CẮT / CHUYỂN ĐỔI GIẤY" />
        
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <p><strong>Mã GD:</strong> {conversion.id.slice(-6).toUpperCase()}</p>
            <p><strong>Ngày:</strong> {new Date(conversion.createdAt).toLocaleString('vi-VN')}</p>
            <p><strong>Người thực hiện:</strong> {conversion.createdBy?.name}</p>
          </div>
          <div className="text-right">
            {conversion.orderId && <p><strong>Tham chiếu ĐH:</strong> {conversion.order?.orderCode}</p>}
            {conversion.productionJobId && <p><strong>Tham chiếu LSX:</strong> {conversion.productionJob?.jobCode}</p>}
          </div>
        </div>

        <h3 className="font-bold mb-2 uppercase text-xs text-gray-500">I. VẬT TƯ XUẤT CẮT (GIẤY MẸ)</h3>
        <table className="w-full mb-6 border-collapse border border-black">
          <thead>
            <tr className="border-b border-black bg-gray-100">
              <th className="py-2 px-2 text-left border-r border-black">Tên vật tư</th>
              <th className="py-2 px-2 text-center border-r border-black">ĐVT</th>
              <th className="py-2 px-2 text-right">Số lượng xuất</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="py-2 px-2 border-r border-black font-medium">{conversion.fromMaterial?.name}</td>
              <td className="py-2 px-2 text-center border-r border-black">{conversion.fromMaterial?.stockBaseUnit}</td>
              <td className="py-2 px-2 text-right font-bold text-red-600">-{conversion.fromQuantityBase}</td>
            </tr>
          </tbody>
        </table>

        <h3 className="font-bold mb-2 uppercase text-xs text-gray-500">II. VẬT TƯ NHẬP SAU CẮT (GIẤY CON)</h3>
        <table className="w-full mb-8 border-collapse border border-black">
          <thead>
            <tr className="border-b border-black bg-gray-100">
              <th className="py-2 px-2 text-left border-r border-black">Tên vật tư</th>
              <th className="py-2 px-2 text-center border-r border-black">ĐVT</th>
              <th className="py-2 px-2 text-right">Số lượng nhập</th>
            </tr>
          </thead>
          <tbody>
            {conversion.outputLines.map((line) => (
              <tr key={line.id} className="border-b border-gray-300">
                <td className="py-2 px-2 border-r border-black font-medium">{line.toMaterial?.name}</td>
                <td className="py-2 px-2 text-center border-r border-black">{line.toMaterial?.stockBaseUnit}</td>
                <td className="py-2 px-2 text-right font-bold text-green-600">+{line.toQuantityBase}</td>
              </tr>
            ))}
            {conversion.wasteQuantityBase > 0 && (
              <tr>
                <td className="py-2 px-2 border-r border-black italic text-gray-600">Hao hụt / Phế phẩm</td>
                <td className="py-2 px-2 text-center border-r border-black">{conversion.fromMaterial?.stockBaseUnit}</td>
                <td className="py-2 px-2 text-right text-gray-600">{conversion.wasteQuantityBase}</td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="mb-8">
          <p><strong>Ghi chú:</strong> {conversion.note || 'Không'}</p>
        </div>

        <PrintFooter />
      </div>
    );
  }

  return <div className="p-8">Không tìm thấy mã giao dịch</div>;
}
