import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const result = await prisma.$executeRawUnsafe(`UPDATE ProductionQrScanLog SET userRole = 'PRODUCTION' WHERE UPPER(userRole) IN ('PRODUTION', 'PRODUTTON');`);
  console.log(`Updated ${result} records in ProductionQrScanLog with raw SQL.`);
}
main().catch(console.error).finally(() => prisma.$disconnect());
