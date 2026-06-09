import React from 'react';
import { notFound, redirect } from 'next/navigation';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import PrintLayout from '@/components/print/PrintLayout';
import PrintHeader from '@/components/print/PrintHeader';
import PrintFooter from '@/components/print/PrintFooter';
import { formatCurrencyVND, formatDateVN } from '@/lib/print-documents/helpers';
import { logPrintAction } from '@/lib/print-documents/audit';

export default async function DebtStatementPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const session = await getCurrentUser();
  if (!session) redirect('/login');

  const customer = await db.customer.findUnique({
    where: { id },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 50 // In real app, we'd filter by period
      },
      paymentRequests: {
        where: { status: 'CONFIRMED' },
        orderBy: { createdAt: 'desc' },
        take: 50
      }
    }
  });

  if (!customer) notFound();

  // RBAC: SALES can only print their own customers
  if (session.role === 'SALES' && customer.createdById !== session.id) {
    redirect('/dashboard/sales/mobile/customers');
  }

  // Combine orders and payments into a ledger
  type LedgerItem = {
    date: Date;
    code: string;
    description: string;
    incurred: number;
    paid: number;
    type: 'ORDER' | 'PAYMENT';
  };

  const ledger: LedgerItem[] = [
    ...customer.orders.map(o => ({
      date: o.createdAt,
      code: o.orderCode,
      description: `Phát sinh đơn hàng ${o.orderCode}`,
      incurred: o.totalAmount,
      paid: 0,
      type: 'ORDER' as const
    })),
    ...customer.paymentRequests.map(p => ({
      date: p.reportedPaidAt || p.createdAt,
      code: `PT-${p.id.substring(0, 8).toUpperCase()}`,
      description: p.transferContent || 'Khách hàng thanh toán',
      incurred: 0,
      paid: p.amount,
      type: 'PAYMENT' as const
    }))
  ];

  // Sort chronological
  ledger.sort((a, b) => a.date.getTime() - b.date.getTime());

  // Calculate running balance and totals
  let runningBalance = 0;
  const totalIncurred = ledger.reduce((acc, item) => acc + item.incurred, 0);
  const totalPaid = ledger.reduce((acc, item) => acc + item.paid, 0);
  const currentDebt = totalIncurred - totalPaid; // Simplified for MVP. Real app uses opening balance + incurred - paid.

  // Audit Log
  await logPrintAction('PRINT_DEBT_STATEMENT', 'Customer', customer.id, session.id, session.role);

  return (
    <PrintLayout>
      <PrintHeader title="Bảng Đối Chiếu Công Nợ" />
      
      <div className="flex justify-between mb-8">
        <div className="w-1/2 pr-4">
          <h3 className="font-bold text-slate-800 mb-2 border-b border-slate-200 pb-1">Kính gửi Quý Khách:</h3>
          <p className="font-bold text-base text-teal-800 uppercase">{customer.companyName || customer.name}</p>
          {customer.companyName && <p className="text-sm text-slate-700">Người liên hệ: {customer.name}</p>}
          <p className="text-sm text-slate-700">SĐT: {customer.phone}</p>
          <p className="text-sm text-slate-700">Email: {customer.email || '—'}</p>
          <p className="text-sm text-slate-700">Địa chỉ: {customer.address || '—'}</p>
        </div>
        <div className="w-1/2 pl-4 border-l border-slate-200">
          <table className="w-full text-sm">
            <tbody>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Mã Khách Hàng:</td>
                <td className="py-1 font-bold text-slate-800">{customer.customerCode || '—'}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Ngày In:</td>
                <td className="py-1 font-bold text-slate-800">{formatDateVN(new Date())}</td>
              </tr>
              <tr>
                <td className="py-1 text-slate-500 font-medium">Kỳ Đối Chiếu:</td>
                <td className="py-1 font-bold text-slate-800">Đến ngày hiện tại</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary Boxes */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Nợ Đầu Kỳ</p>
          <p className="text-base font-black text-slate-800">{formatCurrencyVND(0)}</p>
        </div>
        <div className="bg-slate-50 border border-slate-200 rounded p-3 text-center">
          <p className="text-xs font-bold text-slate-500 uppercase mb-1">Tổng Phát Sinh</p>
          <p className="text-base font-black text-slate-800">{formatCurrencyVND(totalIncurred)}</p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded p-3 text-center">
          <p className="text-xs font-bold text-teal-600 uppercase mb-1">Đã Thanh Toán</p>
          <p className="text-base font-black text-teal-800">{formatCurrencyVND(totalPaid)}</p>
        </div>
        <div className="bg-rose-50 border border-rose-200 rounded p-3 text-center">
          <p className="text-xs font-bold text-rose-600 uppercase mb-1">Dư Nợ Cuối Kỳ</p>
          <p className="text-base font-black text-rose-700">{formatCurrencyVND(currentDebt)}</p>
        </div>
      </div>

      <table className="w-full mb-8 border-collapse">
        <thead>
          <tr className="bg-slate-100 border-y-2 border-slate-300">
            <th className="py-3 px-2 text-left font-bold text-slate-700 w-12">STT</th>
            <th className="py-3 px-2 text-left font-bold text-slate-700 w-24">Ngày</th>
            <th className="py-3 px-2 text-left font-bold text-slate-700 w-28">Chứng Từ</th>
            <th className="py-3 px-2 text-left font-bold text-slate-700">Diễn Giải</th>
            <th className="py-3 px-2 text-right font-bold text-slate-700 w-28">Phát Sinh</th>
            <th className="py-3 px-2 text-right font-bold text-slate-700 w-28">Đã Thu</th>
            <th className="py-3 px-2 text-right font-bold text-slate-700 w-28">Dư Nợ</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 text-sm">
          {ledger.map((item, index) => {
            runningBalance += (item.incurred - item.paid);
            
            // Shorten code if it's too long
            const displayCode = item.code.length > 15 ? item.code.substring(0, 8) + '...' + item.code.substring(item.code.length - 4) : item.code;

            return (
              <tr key={index} className="group">
                <td className="py-2 px-2 align-top text-slate-500">{index + 1}</td>
                <td className="py-2 px-2 align-top">{formatDateVN(item.date)}</td>
                <td className="py-2 px-2 align-top font-medium text-slate-800 break-words">{displayCode}</td>
                <td className="py-2 px-2 align-top text-slate-700">{item.description}</td>
                <td className="py-2 px-2 align-top text-right font-medium text-slate-800">{formatCurrencyVND(item.incurred)}</td>
                <td className="py-2 px-2 align-top text-right font-medium text-teal-700">{formatCurrencyVND(item.paid)}</td>
                <td className="py-2 px-2 align-top text-right font-bold text-rose-600">{formatCurrencyVND(runningBalance)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Signature Row */}
      <div className="break-inside-avoid">
        <p className="font-bold text-slate-800 italic text-center mb-8">
          "Hai bên xác nhận số liệu công nợ trên là đúng tại thời điểm đối chiếu."
        </p>
        <div className="flex justify-between mt-8 mb-24 px-4">
          <div className="text-center w-1/3">
            <p className="font-bold text-slate-800 mb-20">Đại diện khách hàng</p>
            <p className="text-sm text-slate-500 italic">(Ký, đóng dấu)</p>
          </div>
          <div className="text-center w-1/3">
            <p className="font-bold text-slate-800 mb-20">Kế toán</p>
            <p className="text-sm text-slate-500 italic">(Ký, ghi rõ họ tên)</p>
          </div>
          <div className="text-center w-1/3">
            <p className="font-bold text-slate-800 mb-20">Đại diện công ty</p>
            <p className="text-sm text-slate-500 italic">(Ký, đóng dấu)</p>
          </div>
        </div>
      </div>

      <PrintFooter 
        customNotes={[
          'Bảng đối chiếu này thay cho giấy đề nghị thanh toán.',
          'Mọi thắc mắc về số liệu vui lòng phản hồi trong vòng 5 ngày làm việc. Quá thời hạn trên, số liệu mặc định được xác nhận đúng.'
        ]}
      />
    </PrintLayout>
  );
}
