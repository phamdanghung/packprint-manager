import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const order = await prisma.order.findFirst();
  const job = await prisma.productionJob.findFirst();
  const material = await prisma.inventoryItem.findFirst({where: {category: 'PAPER'}});
  const conversion = await prisma.inventoryConversion.findFirst();
  console.log('--- TEST LINKS ---');
  console.log(`Order: http://localhost:3000/dashboard/orders/${order?.id}`);
  console.log(`Production Job: http://localhost:3000/dashboard/production/${job?.id}`);
  console.log(`Material Recipe: http://localhost:3000/dashboard/inventory/materials/${material?.id}`);
  console.log(`Conversions List: http://localhost:3000/dashboard/inventory/conversions`);
  if (conversion) {
     const tx = await prisma.inventoryTransaction.findFirst({where: {conversionId: conversion.id, type: 'CONVERT_OUT'}});
     if (tx) {
         console.log(`Print Conversion: http://localhost:3000/dashboard/print/inventory-transactions/${tx.id}`);
     }
  }
}

main().catch(console.error).finally(()=>prisma.$disconnect());
