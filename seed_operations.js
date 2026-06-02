const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  const operations = [
    { code: 'LAMINATION', name: 'Cán màng', defaultSequence: 10, requiresMachine: true, allowOutsource: true },
    { code: 'DIE_CUTTING', name: 'Bế demi', defaultSequence: 20, requiresMachine: true, allowOutsource: true },
    { code: 'CUTTING', name: 'Cắt/xén', defaultSequence: 30, requiresMachine: true, allowOutsource: true },
    { code: 'QC', name: 'Kiểm hàng', defaultSequence: 80, requiresMachine: false, allowOutsource: false },
    { code: 'PACKING', name: 'Đóng gói', defaultSequence: 90, requiresMachine: false, allowOutsource: false },
    { code: 'OTHER', name: 'Gia công khác', defaultSequence: 50, requiresMachine: false, allowOutsource: true },
    { code: 'OUTSOURCE', name: 'Gia công ngoài', defaultSequence: 60, requiresMachine: false, allowOutsource: true },
  ]

  for (const op of operations) {
    await prisma.operationDefinition.upsert({
      where: { code: op.code },
      update: op,
      create: op,
    })
  }
  
  console.log('Seed completed!')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
