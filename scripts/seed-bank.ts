import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  const existingCount = await prisma.companyBankAccount.count();
  if (existingCount === 0) {
    console.log('No CompanyBankAccount found, creating a default one...');
    await prisma.companyBankAccount.create({
      data: {
        bankName: 'Vietcombank',
        accountNumber: '19031234567890',
        accountHolder: 'CÔNG TY IN ẤN PACKPRINT',
        branch: 'Chi nhánh TP HCM',
        isDefault: true,
        isActive: true,
        note: 'Tài khoản công ty mặc định',
      },
    });
    console.log('Default CompanyBankAccount created.');
  } else {
    console.log('CompanyBankAccount already exists. Skipping seed.');
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
