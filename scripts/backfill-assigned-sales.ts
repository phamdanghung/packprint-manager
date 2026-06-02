import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Starting backfill for assignedSalesId...');

  // 1. Fetch all SALES users
  const salesUsers = await prisma.user.findMany({
    where: { role: 'SALES', status: 'ACTIVE' },
    select: { id: true }
  });
  const salesUserIds = new Set(salesUsers.map(u => u.id));
  console.log(`Found ${salesUserIds.size} ACTIVE SALES users.`);

  let customersUpdated = 0;
  let quotesUpdated = 0;
  let ordersUpdated = 0;

  // 2. Backfill Customers
  const customers = await prisma.customer.findMany({
    where: { assignedSalesId: null }
  });

  for (const customer of customers) {
    if (customer.createdById && salesUserIds.has(customer.createdById)) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { assignedSalesId: customer.createdById }
      });
      customersUpdated++;
    }
  }

  // 3. Backfill Quotes
  const quotes = await prisma.quote.findMany({
    where: { assignedSalesId: null },
    include: { customer: true }
  });

  for (const quote of quotes) {
    let assignedSalesId = null;
    
    // Priority 1: customer.assignedSalesId
    if (quote.customer.assignedSalesId) {
      assignedSalesId = quote.customer.assignedSalesId;
    } 
    // Priority 2: createdById if SALES
    else if (salesUserIds.has(quote.createdById)) {
      assignedSalesId = quote.createdById;
    }

    if (assignedSalesId) {
      await prisma.quote.update({
        where: { id: quote.id },
        data: { assignedSalesId }
      });
      quotesUpdated++;
    }
  }

  // 4. Backfill Orders
  const orders = await prisma.order.findMany({
    where: { assignedSalesId: null },
    include: { customer: true, quote: true }
  });

  for (const order of orders) {
    let assignedSalesId = null;

    // Priority 1: quote.assignedSalesId
    if (order.quote?.assignedSalesId) {
      assignedSalesId = order.quote.assignedSalesId;
    }
    // Priority 2: customer.assignedSalesId
    else if (order.customer.assignedSalesId) {
      assignedSalesId = order.customer.assignedSalesId;
    }
    // Priority 3: createdById if SALES
    else if (order.createdById && salesUserIds.has(order.createdById)) {
      assignedSalesId = order.createdById;
    }

    if (assignedSalesId) {
      await prisma.order.update({
        where: { id: order.id },
        data: { assignedSalesId }
      });
      ordersUpdated++;
    }
  }

  console.log('Backfill completed successfully!');
  console.log(`- Customers updated: ${customersUpdated}`);
  console.log(`- Quotes updated: ${quotesUpdated}`);
  console.log(`- Orders updated: ${ordersUpdated}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
