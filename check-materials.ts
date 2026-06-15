import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
async function main() {
  const items = await prisma.inventoryItem.findMany({where: {name: 'Giấy Couche 150'}});
  console.log(JSON.stringify(items, null, 2));
}
main().catch(console.error).finally(()=>prisma.$disconnect());
