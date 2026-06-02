const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const result = await prisma.payment.updateMany({
    where: { paymentStatus: 'PAID' },
    data: { paymentStatus: 'CONFIRMED' }
  });
  console.log('Updated payments:', result.count);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
