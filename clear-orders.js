const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  await prisma.designFile.deleteMany();
  await prisma.productionStep.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.$executeRawUnsafe(`DELETE FROM "Order"`);
  console.log('done');
}
main().catch(console.error);
