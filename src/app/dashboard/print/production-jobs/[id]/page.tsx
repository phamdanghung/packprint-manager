import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintLayout from '@/components/print/PrintLayout';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';
import SmartQrBlock from '@/components/print/SmartQrBlock';
import { formatDateVN, formatDateTimeVN } from '@/lib/print-documents/helpers';
import { logPrintAction } from '@/lib/print-documents/audit';
import crypto from 'crypto';

export default async function ProductionPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  // STRICT QUERYING: explicitly select only non-financial fields
  const job = await db.productionJob.findUnique({
    where: { id },
    select: {
      id: true,
      jobCode: true,
      priority: true,
      dueDate: true,
      createdAt: true,
      note: true,
      qrToken: true,
      assignedTo: {
        select: { name: true }
      },
      order: {
        select: {
          orderCode: true,
          deliveryAddress: true,
          customer: {
            select: {
              customerCode: true,
              name: true,
              phone: true,
              companyName: true,
            }
          },
          items: {
            select: {
              id: true,
              name: true,
              widthCm: true,
              heightCm: true,
              quantity: true,
              labelShape: true,
              materialId: true,
              laminationId: true,
              dieCutType: true,
              productionNote: true,
            }
          }
        }
      },
      operations: {
        select: {
          id: true,
          operationName: true,
          status: true,
          assignedTo: { select: { name: true } },
          startedAt: true,
          completedAt: true,
          goodSheets: true,
          wasteSheets: true,
          sequence: true
        },
        orderBy: { sequence: 'asc' }
      }
    }
  });

  if (!job) notFound();

  // If no qrToken exists, generate one
  let activeToken = job.qrToken;
  if (!activeToken) {
    activeToken = crypto.randomBytes(16).toString('hex');
    await db.productionJob.update({
      where: { id: job.id },
      data: { 
        qrToken: activeToken,
        qrIssuedAt: new Date()
      }
    });
    // Log token generation
    await db.systemAuditLog.create({
      data: {
        action: 'ISSUE_SMART_QR',
        entityType: 'ProductionJob',
        entityId: job.id,
        actorId: session.id,
        actorRole: session.role,
        description: 'Generated Smart QR on Print'
      }
    });
  }

  // Audit Log
  await logPrintAction('PRINT_PRODUCTION_JOB', 'ProductionJob', job.id, session.id, session.role);

  return (
    <PrintLayout>
      <PrintHeader title="Lệnh Sản Xuất" />
      
      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Thông tin khách hàng:</h3>
          <p className="font-bold text-base text-slate-800 uppercase">{job.order.customer.companyName || job.order.customer.name}</p>
          {job.order.customer.companyName && <p className="text-sm text-slate-700">Người đại diện: {job.order.customer.name}</p>}
          <p className="text-sm text-slate-700">SĐT: {job.order.customer.phone}</p>
          <p className="text-sm text-slate-700 mt-2 font-semibold">Ghi chú yêu cầu:</p>
          <div className="text-sm text-slate-700 border border-slate-200 p-2 mt-1 rounded bg-slate-50 min-h-[80px]">
            {job.note || 'Không có'}
          </div>
        </div>
        <div className="w-1/2 pl-4 border-l border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Mã Lệnh SX:</td>
                <td className="py-1 font-bold text-slate-800 text-lg">{job.jobCode}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Mã Đơn Hàng:</td>
                <td className="py-1 font-bold text-slate-800">{job.order.orderCode}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày lập lệnh:</td>
                <td className="py-1 font-bold text-slate-800">{formatDateVN(job.createdAt)}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Hạn giao / Cần giao trước:</td>
                {job.dueDate ? (
                  <td className="py-1 font-bold text-rose-600 uppercase text-base">{formatDateVN(job.dueDate)}</td>
                ) : (
                  <td className="py-1 font-medium text-orange-500 uppercase text-sm">Chưa xác định</td>
                )}
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Mức ưu tiên:</td>
                <td className="py-1 font-bold text-slate-800">{job.priority}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Người phụ trách:</td>
                <td className="py-1 font-bold text-slate-800">{job.assignedTo?.name || 'Chưa gán'}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="mb-8">
        <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Chi tiết yêu cầu sản xuất:</h3>
        <table className="w-full border-collapse border border-slate-300">
          <thead>
            <tr className="bg-slate-100">
              <th className="border border-slate-300 py-2 px-2 text-left font-bold text-slate-700 w-12">STT</th>
              <th className="border border-slate-300 py-2 px-2 text-left font-bold text-slate-700">Tên sản phẩm</th>
              <th className="border border-slate-300 py-2 px-2 text-left font-bold text-slate-700">Thông số kỹ thuật</th>
              <th className="border border-slate-300 py-2 px-2 text-right font-bold text-slate-700 w-24">Số lượng</th>
            </tr>
          </thead>
          <tbody>
            {job.order.items.map((item, index) => (
              <tr key={item.id}>
                <td className="border border-slate-300 py-2 px-2 text-center text-slate-600 align-top">{index + 1}</td>
                <td className="border border-slate-300 py-2 px-2 font-bold text-slate-800 align-top">{item.name}</td>
                <td className="border border-slate-300 py-2 px-2 text-slate-700 text-[13px] align-top">
                  <div><span className="font-medium text-slate-600">Kích thước:</span> {item.widthCm}x{item.heightCm}cm | <span className="font-medium text-slate-600">Hình dáng:</span> {item.labelShape}</div>
                  <div className="mt-0.5"><span className="font-medium text-slate-600">Chất liệu:</span> {item.materialId || '—'} | <span className="font-medium text-slate-600">Cán màng:</span> {item.laminationId || '—'}</div>
                  <div className="mt-0.5"><span className="font-medium text-slate-600">Loại bế:</span> {item.dieCutType || '—'}</div>
                  {item.productionNote && (
                    <div className="mt-1 text-rose-700 font-medium text-xs italic bg-rose-50 p-1 rounded inline-block border border-rose-100">Ghi chú SX: {item.productionNote}</div>
                  )}
                </td>
                <td className="border border-slate-300 py-2 px-2 text-right font-bold text-slate-800 align-top text-base">{item.quantity.toLocaleString('vi-VN')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex gap-6 mb-8">
        <div className="flex-1">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Checklist Công Đoạn:</h3>
          <table className="w-full border-collapse border border-slate-300 text-sm">
            <thead>
              <tr className="bg-slate-100">
                <th className="border border-slate-300 py-2 px-2 text-center font-bold w-10">#</th>
                <th className="border border-slate-300 py-2 px-2 text-left font-bold w-1/3">Tên công đoạn</th>
                <th className="border border-slate-300 py-2 px-2 text-center font-bold w-28">Giờ bắt đầu</th>
                <th className="border border-slate-300 py-2 px-2 text-center font-bold w-28">Giờ xong</th>
                <th className="border border-slate-300 py-2 px-2 text-center font-bold w-28">Ký tên</th>
              </tr>
            </thead>
            <tbody>
              {job.operations.length > 0 ? (
                job.operations.map((op, i) => (
                  <tr key={op.id}>
                    <td className="border border-slate-300 py-3 px-2 text-center text-slate-500">{i + 1}</td>
                    <td className="border border-slate-300 py-3 px-2 font-bold text-slate-800">{op.operationName}</td>
                    <td className="border border-slate-300 py-3 px-2 text-center text-slate-500 text-xs">{formatDateTimeVN(op.startedAt)}</td>
                    <td className="border border-slate-300 py-3 px-2 text-center text-slate-500 text-xs">{formatDateTimeVN(op.completedAt)}</td>
                    <td className="border border-slate-300 py-3 px-2"></td>
                  </tr>
                ))
              ) : (
                // Fallback static checklist
                ['Thiết kế/Bình file', 'In ấn', 'Cán màng', 'Bế/Cắt', 'QC (Kiểm tra)', 'Đóng gói'].map((step, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 py-4 px-2 text-center text-slate-500">{i + 1}</td>
                    <td className="border border-slate-300 py-4 px-2 font-bold text-slate-800">{step}</td>
                    <td className="border border-slate-300 py-4 px-2"></td>
                    <td className="border border-slate-300 py-4 px-2"></td>
                    <td className="border border-slate-300 py-4 px-2"></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
        {/* Smart QR */}
        <div className="flex-shrink-0 w-[200px]">
          <SmartQrBlock token={activeToken} />
        </div>
      </div>

      {/* Signature Row */}
      <div className="break-inside-avoid mt-8">
        <div className="flex justify-between mb-28 px-8">
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-20">Bộ phận sản xuất nhận lệnh</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-slate-800 mb-20">Người lập lệnh</p>
            <p className="font-bold text-slate-800">{session.name}</p>
          </div>
        </div>
      </div>

      <PrintFooter 
        customNotes={[
          'Vui lòng kiểm tra đúng mã đơn, file, chất liệu và số lượng trước khi sản xuất.',
          'Tuyệt đối tuân thủ quy trình kiểm soát chất lượng (QC).',
          'Mọi công đoạn cần quét Smart QR để cập nhật tiến độ lên hệ thống.'
        ]}
      />
    </PrintLayout>
  );
}
