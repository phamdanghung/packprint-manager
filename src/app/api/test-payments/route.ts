import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { createPayment, confirmPayment, cancelPayment } from '@/lib/payment-actions';

export async function GET() {
  const logs: string[] = [];
  function log(msg: string) { logs.push(msg); console.log(msg); }
  
  try {
    const accountUser = await db.user.findFirst({ where: { role: 'ACCOUNTANT' } });
    const deliveryUser = await db.user.findFirst({ where: { role: 'DELIVERY' } });
    if (!accountUser || !deliveryUser) return NextResponse.json({ error: 'Missing users' });

    // Use ACCOUNTANT
    process.env.TEST_USER_ID = accountUser.id;

    // Get an order with debt
    const order = await db.order.findFirst({
      where: { debtAmount: { gt: 0 } },
      include: { customer: true }
    });
    
    if (!order) return NextResponse.json({ error: 'No order with debt found' });

    log(`Customer initial debt: ${order.customer.debtBalance}`);
    
    // 3. Test PENDING
    const res1 = await createPayment(order.id, 100000, 'BANK_TRANSFER', 'PENDING', 'Test PENDING');
    log(`Tạo PENDING: ${res1.success ? 'SUCCESS' : 'FAILED: ' + (res1 as any).error}`);
    let paymentId1 = '';
    if (res1.success) paymentId1 = (res1 as any).data.id;
    
    let currentOrder = await db.order.findUnique({ where: { id: order.id }});
    let currentCustomer = await db.customer.findUnique({ where: { id: order.customerId }});
    log(`Sau khi tạo PENDING -> Order debt: ${currentOrder?.debtAmount}, Customer debt: ${currentCustomer?.debtBalance}`);
    
    // 4. Test CONFIRM
    const res2 = await confirmPayment(paymentId1);
    log(`Confirm PENDING: ${res2.success ? 'SUCCESS' : 'FAILED: ' + (res2 as any).error}`);

    currentOrder = await db.order.findUnique({ where: { id: order.id }});
    currentCustomer = await db.customer.findUnique({ where: { id: order.customerId }});
    log(`Sau khi confirm -> Order debt: ${currentOrder?.debtAmount}, Customer debt: ${currentCustomer?.debtBalance}`);

    // 5. Test chặn confirm 2 lần
    const res3 = await confirmPayment(paymentId1);
    log(`Confirm lần 2: ${res3.success ? 'SUCCESS' : 'FAILED: ' + (res3 as any).error}`);

    // 7. Test CANCEL CONFIRMED
    const res4 = await cancelPayment(paymentId1, 'Test Cancel Confirmed');
    log(`Cancel CONFIRMED rollback: ${res4.success ? 'SUCCESS' : 'FAILED: ' + (res4 as any).error}`);

    currentOrder = await db.order.findUnique({ where: { id: order.id }});
    currentCustomer = await db.customer.findUnique({ where: { id: order.customerId }});
    log(`Customer.debtBalance trước: ${order.customer.debtBalance} / sau rollback: ${currentCustomer?.debtBalance}`);
    
    // 6. Test CANCEL PENDING
    const res5 = await createPayment(order.id, 50000, 'BANK_TRANSFER', 'PENDING', 'Test PENDING 2');
    if (res5.success) {
       const res6 = await cancelPayment((res5 as any).data.id, 'Test Cancel PENDING');
       log(`Cancel PENDING: ${res6.success ? 'SUCCESS' : 'FAILED: ' + (res6 as any).error}`);
    }

    // 8. Test Delivery COD
    process.env.TEST_USER_ID = deliveryUser.id; // Switch to Delivery
    const res7 = await createPayment(order.id, 200000, 'COD', 'PENDING', 'Delivery COD PENDING');
    log(`Delivery tạo COD PENDING: ${res7.success ? 'SUCCESS' : 'FAILED: ' + (res7 as any).error}`);
    if (res7.success) {
      currentOrder = await db.order.findUnique({ where: { id: order.id }});
      log(`Sau khi tạo COD PENDING -> Order debt (không cập nhật ngay): ${currentOrder?.debtAmount}`);
      
      // Confirm COD
      process.env.TEST_USER_ID = accountUser.id; // Switch back to Accountant
      const res8 = await confirmPayment((res7 as any).data.id);
      log(`Accountant confirm COD: ${res8.success ? 'SUCCESS' : 'FAILED: ' + (res8 as any).error}`);
      currentOrder = await db.order.findUnique({ where: { id: order.id }});
      log(`Sau khi confirm COD -> Order debt đã giảm: ${currentOrder?.debtAmount}`);
    }

    return NextResponse.json({ logs });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, logs });
  }
}
