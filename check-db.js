const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main() {
  const d = await prisma.dieCutPrice.findMany();
  console.log('DieCut Prices:');
  console.log(d.map(x => x.straightCutPrice));
  const f = await prisma.fileHandlingFee.findMany();
  console.log('File Fees:');
  console.log(f.map(x => x.feeAmount));
}
main().finally(() => prisma.$disconnect());
