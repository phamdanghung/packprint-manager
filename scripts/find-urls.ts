import { db } from '../src/lib/db';

async function main() {
  const orders = await db.order.findMany({ take: 3, orderBy: { createdAt: 'desc' } });
  const jobs = await db.productionJob.findMany({ take: 2, orderBy: { createdAt: 'desc' } });

  console.log('--- URLs MẪU TRONG DB ---');
  if (orders.length > 0) {
    console.log('Order Detail 1:', `http://localhost:3000/dashboard/orders/${orders[0].id}`);
  }
  if (orders.length > 1) {
    console.log('Order Detail 2:', `http://localhost:3000/dashboard/orders/${orders[1].id}`);
  }
  if (jobs.length > 0) {
    console.log('Production Detail:', `http://localhost:3000/dashboard/production/${jobs[0].id}`);
  }
  console.log('Conversion List:', `http://localhost:3000/dashboard/inventory/conversions`);
  
  console.log('\nBạn có thể tự thay id của Order/Production Job đang test vào link trên để xem.');
}

main().catch(console.error).finally(() => process.exit(0));
