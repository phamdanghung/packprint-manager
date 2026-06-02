import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

async function main() {
  console.log('Bắt đầu dọn dẹp database...');
  await prisma.fileHandlingFee.deleteMany({});
  await prisma.pricingRule.deleteMany({});
  await prisma.dieCutPrice.deleteMany({});
  await prisma.laminationPrice.deleteMany({});
  await prisma.material.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.productionStep.deleteMany({});
  await prisma.designFile.deleteMany({});
  await prisma.orderItem.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.quoteItem.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Bắt đầu nạp dữ liệu mẫu (Seeding)...');

  // 1. Tạo Users
  console.log('Tạo người dùng mẫu...');
  const defaultPassword = hashPassword('123456');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Nguyễn Văn Admin',
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: 'manager@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Trần Văn Quản Lý',
      role: 'MANAGER',
      status: 'ACTIVE',
    },
  });

  const sale = await prisma.user.create({
    data: {
      email: 'sale@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Trần Thị Sale',
      role: 'SALES',
      status: 'ACTIVE',
    },
  });

  const designer = await prisma.user.create({
    data: {
      email: 'design@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Lê Văn Thiết Kế',
      role: 'DESIGNER',
      status: 'ACTIVE',
    },
  });

  const production = await prisma.user.create({
    data: {
      email: 'production@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Phạm Văn Sản Xuất',
      role: 'PRODUCTION',
      status: 'ACTIVE',
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Hoàng Thị Kế Toán',
      role: 'ACCOUNTANT',
      status: 'ACTIVE',
    },
  });

  const delivery = await prisma.user.create({
    data: {
      email: 'delivery@packprint.vn',
      passwordHash: defaultPassword,
      name: 'Nguyễn Văn Giao Hàng',
      role: 'DELIVERY',
      status: 'ACTIVE',
    },
  });

  // 2. Tạo Customers
  console.log('Tạo khách hàng mẫu...');
  const customerKindo = await prisma.customer.create({
    data: {
      customerCode: 'KH-000001',
      name: 'Nguyễn Lâm Kinh Đô',
      phone: '02838270838',
      email: 'contact@kinhdo.vn',
      address: '138-142 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. HCM',
      companyName: 'Kinh Do Corporation',
      customerType: 'COMPANY',
      source: 'WALK_IN',
      debtBalance: 10000000,
      note: 'Khách hàng VIP, doanh số in ấn thùng carton và vỏ hộp lớn.',
      tags: 'VIP,Regular,BigVolume',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerCholimex = await prisma.customer.create({
    data: {
      customerCode: 'KH-000002',
      name: 'Phan Minh Cholimex',
      phone: '02837653389',
      email: 'info@cholimexfood.com.vn',
      address: 'Lô C40-43/I, Đường số 7, KCN Vĩnh Lộc, Bình Chánh, TP. HCM',
      companyName: 'Cholimex Food JSC',
      customerType: 'COMPANY',
      source: 'WALK_IN',
      debtBalance: 0,
      note: 'In thùng carton 3 lớp số lượng lớn thường xuyên.',
      tags: 'Regular,EasyGoing',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerLinhChi = await prisma.customer.create({
    data: {
      customerCode: 'KH-000003',
      name: 'Trần Thị Linh Chi',
      phone: '0988123456',
      email: 'linhchiorganic@gmail.com',
      address: '85 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
      companyName: 'Hộ kinh doanh Linh Chi Organic',
      customerType: 'COSMETIC',
      source: 'FACEBOOK',
      debtBalance: 2500000,
      note: 'In vỏ hộp mỹ phẩm, túi Kraft thân thiện môi trường.',
      tags: 'Cosmetics,GreenLife',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerDalat = await prisma.customer.create({
    data: {
      customerCode: 'KH-000004',
      name: 'Lê Hoàng Đà Lạt',
      phone: '02633822123',
      email: 'dalatorganic@coop.vn',
      address: '12 Trần Phú, Phường 3, TP. Đà Lạt, Lâm Đồng',
      companyName: 'Da Lat Organic Co-operative',
      customerType: 'AGENCY',
      source: 'REFERRAL',
      debtBalance: -5000000,
      note: 'Khách hàng đặt cọc trước để in hộp trà Actiso số lượng lớn.',
      tags: 'Prepaid,Friendly',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerHighlands = await prisma.customer.create({
    data: {
      customerCode: 'KH-000005',
      name: 'Highlands Coffee',
      phone: '02871063333',
      email: 'contact@highlandscoffee.com.vn',
      address: '135/37/50 Nguyễn Hữu Cảnh, Phường 22, Quận Bình Thạnh, TP. HCM',
      companyName: 'Công ty CP Dịch vụ Cà phê Cao Nguyên',
      customerType: 'FNB',
      source: 'WALK_IN',
      debtBalance: 0,
      note: 'Khách hàng chuỗi F&B, chuyên in túi giấy đựng ly và hộp bánh.',
      tags: 'FNB,ChainStore',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerTheCoffeeHouse = await prisma.customer.create({
    data: {
      customerCode: 'KH-000006',
      name: 'The Coffee House',
      phone: '18006936',
      email: 'op@thecoffeehouse.vn',
      address: '86-88 Cao Thắng, Phường 4, Quận 3, TP. HCM',
      companyName: 'Công ty CP Thương mại Dịch vụ Trà Cà phê Việt Nam',
      customerType: 'FNB',
      source: 'ZALO',
      debtBalance: 0,
      note: 'Chuyên in hộp giấy đựng bánh ngọt và túi giấy take-away.',
      tags: 'FNB,TakeAway',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerPharmacity = await prisma.customer.create({
    data: {
      customerCode: 'KH-000007',
      name: 'Pharmacity',
      phone: '18006821',
      email: 'support@pharmacity.vn',
      address: '248A Nơ Trang Long, Phường 12, Quận Bình Thạnh, TP. HCM',
      companyName: 'Công ty CP Dược phẩm Pharmacity',
      customerType: 'PHARMA',
      source: 'GOOGLE',
      debtBalance: 0,
      note: 'In túi giấy đựng thuốc, hộp giấy thực phẩm chức năng.',
      tags: 'Pharma,Corporate',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  const customerNguyenVanA = await prisma.customer.create({
    data: {
      customerCode: 'KH-000008',
      name: 'Nguyễn Văn A',
      phone: '0912345678',
      email: 'nguyenvana@gmail.com',
      address: '456 Lê Lợi, Quận Gò Vấp, TP. HCM',
      customerType: 'RETAIL',
      source: 'TIKTOK',
      debtBalance: 1200000,
      note: 'Khách hàng lẻ, in thiệp cưới, bao bì quà tặng handmade.',
      tags: 'Retail,Handmade',
      createdById: sale.id,
      status: 'ACTIVE',
    },
  });

  // 3. Tạo Quotes
  console.log('Tạo báo giá mẫu...');
  const quoteKindo = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-001',
      customerId: customerKindo.id,
      totalAmount: 25000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Báo giá đã bao gồm thuế và chiết khấu cho khách hàng thân thiết.',
      
    },
  });

  const quoteCholimex = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-002',
      customerId: customerCholimex.id,
      totalAmount: 45000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Khách hàng đặt số lượng lớn thường xuyên, giao hàng theo từng đợt.',
      
    },
  });

  const quoteLinhChi = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-003',
      customerId: customerLinhChi.id,
      totalAmount: 8000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Thiết kế tối giản thân thiện với môi trường.',
      
    },
  });

  const quoteDalat = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-004',
      customerId: customerDalat.id,
      totalAmount: 15000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Yêu cầu giấy Ivory loại tốt nhất, phủ định hình phản quang nổi bật.',
      
    },
  });

    console.log('Seed dữ liệu mẫu thành công!');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
}).finally(async () => {
  await prisma.$disconnect();
});
