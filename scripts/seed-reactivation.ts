import { db } from '../src/lib/db';

async function main() {
  const customers = await db.customer.findMany({ take: 4 });
  const now = new Date();
  
  if (customers[0]) {
    await db.customer.update({
      where: { id: customers[0].id },
      data: { lastOrderAt: new Date(now.getTime() - 35 * 24 * 60 * 60 * 1000), reactivationLevel: 'NO_ORDER_30_DAYS' }
    });
  }
  if (customers[1]) {
    await db.customer.update({
      where: { id: customers[1].id },
      data: { lastOrderAt: new Date(now.getTime() - 65 * 24 * 60 * 60 * 1000), reactivationLevel: 'NO_ORDER_60_DAYS' }
    });
  }
  if (customers[2]) {
    await db.customer.update({
      where: { id: customers[2].id },
      data: { lastOrderAt: new Date(now.getTime() - 95 * 24 * 60 * 60 * 1000), reactivationLevel: 'NO_ORDER_90_DAYS' }
    });
  }
  if (customers[3]) {
    await db.customer.update({
      where: { id: customers[3].id },
      data: { lastOrderAt: new Date(now.getTime() - 185 * 24 * 60 * 60 * 1000), reactivationLevel: 'INACTIVE_CUSTOMER' }
    });
  }
  console.log('Seeded 4 customers with 30, 60, 90, 180 days no order.');
}

main().catch(console.error);
