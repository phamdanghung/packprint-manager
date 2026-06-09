import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Company Profile...');
  const count = await prisma.companyProfile.count();
  if (count === 0) {
    await prisma.companyProfile.create({
      data: {
        legalName: 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ HOA SEN VIỆT',
        brandName: 'In Siêu Tốc',
        taxCode: '0313096606',
        companyAddress: '82/15 ĐƯỜNG SỐ 2, KHU PHỐ 6, PHƯỜNG HIỆP BÌNH, THÀNH PHỐ HỒ CHÍ MINH',
        factoryAddress: '381 Nguyễn Sơn, P.Phú Thạnh, TP.HCM',
        phone: '028 397 22222',
        hotline: '0907.707.770',
        email: 'sales.insieutoc@gmail.com',
        website: 'insieutoc.vn',
        slogan: 'Tốc độ quyết định sự thành công',
        logoUrl: '/brand/logo.png',
        primaryColor: '#0d9488', // teal-600
        secondaryColor: '#f8fafc',
      }
    });
    console.log('Created Company Profile.');
  }

  console.log('Seeding Company Bank Account...');
  await prisma.companyBankAccount.deleteMany({});
  await prisma.companyBankAccount.create({
    data: {
      bankName: 'NH TMCP Á Châu - CN Sài Gòn',
      vietQrBankId: '970416', // ACB
      accountNumber: '246292349',
      accountHolder: 'CÔNG TY TNHH SẢN XUẤT THƯƠNG MẠI DỊCH VỤ HOA SEN VIỆT',
      branch: 'CN Sài Gòn',
      isDefault: true,
      isActive: true,
    }
  });
  console.log('Updated Company Bank Account.');
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
