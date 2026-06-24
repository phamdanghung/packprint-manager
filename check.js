const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const rules = await prisma.pricingRule.findMany();
  console.log(rules);
}

main().finally(() => prisma.$disconnect());
