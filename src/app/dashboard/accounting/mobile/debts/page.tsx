import React from 'react';
import Link from 'next/link';
import { getDebtCustomersMobile } from '@/lib/accounting-mobile-actions';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function DebtMobileListPage() {
  const result = await getDebtCustomersMobile();
  
  if (!result.success) {
    if (result.error === 'Chưa đăng nhập') redirect('/login');
    return (
      <div className="p-4 flex flex-col items-center justify-center min-h-[50vh]">
        <div className="bg-red-50 text-red-600 p-4 rounded-xl text-center">
          <p className="font-bold mb-2">Lỗi truy cập</p>
          <p className="text-sm">{result.error}</p>
        </div>
      </div>
    );
  }

  const customers = result.data as any[];

  return (
    <div className="p-4">
      <div className="mb-4">
        <h1 className="text-xl font-bold text-slate-800">Quản lý Công nợ</h1>
        <p className="text-sm text-slate-500">{customers.length} khách hàng đang có nợ</p>
      </div>

      {customers.length === 0 ? (
        <div className="bg-white border border-slate-200 rounded-xl p-8 text-center mt-8">
          <div className="w-16 h-16 bg-green-50 rounded-full flex items-center justify-center mx-auto mb-4 text-green-500">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <p className="text-slate-600 font-medium">Tuyệt vời! Không có khách hàng nào đang nợ.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {customers.map(customer => (
            <div key={customer.id} className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm relative overflow-hidden">
              {/* Cột trái: Thông tin */}
              <div className="mb-3">
                <div className="font-bold text-slate-800 text-lg mb-1">{customer.name}</div>
                <div className="text-sm text-slate-500 mb-2 flex items-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  {customer.phone || 'Chưa cập nhật SĐT'}
                </div>
                {customer.assignedSales && (
                  <div className="text-xs text-slate-500 bg-slate-100 inline-block px-2 py-1 rounded">
                    Sales: {customer.assignedSales.name}
                  </div>
                )}
              </div>
              
              <div className="h-px bg-slate-100 my-3"></div>
              
              {/* Tiền nợ */}
              <div className="flex justify-between items-end mb-4">
                <div>
                  <p className="text-xs text-slate-500 font-medium uppercase">Tổng nợ ({customer.orders?.length || 0} đơn)</p>
                  <p className="text-2xl font-black text-rose-600">{customer.debtBalance.toLocaleString('vi-VN')} đ</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] text-slate-400 uppercase">Thanh toán gần nhất</p>
                  <p className="text-xs font-medium text-slate-600">
                    {customer.payments?.length > 0 
                      ? new Date(customer.payments[0].paidAt).toLocaleDateString('vi-VN') 
                      : 'Chưa có GD'}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="grid grid-cols-2 gap-2 mt-4">
                <a href={`tel:${customer.phone}`} className="bg-slate-100 text-slate-700 py-2.5 rounded-lg text-sm font-bold text-center flex items-center justify-center space-x-2 active:bg-slate-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>Gọi KH</span>
                </a>
                <Link href={`/dashboard/print/customers/${customer.id}/debt-statement`} className="bg-indigo-600 text-white py-2.5 rounded-lg text-sm font-bold text-center flex items-center justify-center space-x-2 active:bg-indigo-700 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <span>Mở đối chiếu</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
