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
      items: {
        create: [
          {
            name: 'Hộp bánh trung thu cao cấp',
            qty: 10000,
            size: '22x22x6cm',
            paper: 'Couche 350gsm + carton lạnh',
            print: 'In offset 4 màu',
            process: 'Cán màng mờ, ép kim logo, bế dán thành phẩm',
            price: 2500,
          }
        ]
      }
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
      items: {
        create: [
          {
            name: 'Thùng carton 3 lớp đựng tương ớt',
            qty: 5000,
            size: '40x30x25cm',
            paper: 'Carton sóng B nâu',
            print: 'In flexo 2 màu',
            process: 'Chạy sóng, bế chập, đóng ghim thành phẩm',
            price: 9000,
          }
        ]
      }
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
      items: {
        create: [
          {
            name: 'Túi giấy Kraft đựng mỹ phẩm',
            qty: 2000,
            size: '15x20x8cm',
            paper: 'Giấy Kraft nâu 180gsm',
            print: 'In offset 1 màu đen',
            process: 'Bế dán thành phẩm, xỏ quai dây thừng',
            price: 4000,
          }
        ]
      }
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
      items: {
        create: [
          {
            name: 'Hộp giấy đựng trà Actiso cao cấp',
            qty: 3000,
            size: '10x15x6cm',
            paper: 'Ivory 300gsm',
            print: 'In offset 4 màu',
            process: 'Cán màng mờ, phủ UV định hình chữ nổi, bế dán gài',
            price: 5000,
          }
        ]
      }
    },
  });

  // 4. Tạo Orders & OrderItems & DesignFiles & ProductionSteps & Payments
  console.log('Tạo đơn hàng mẫu...');
  const today = new Date();

  // Đơn 1: Kinh Đô - Đang sản xuất, LỜI
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-001',
      quoteId: quoteKindo.id,
      customerId: customerKindo.id,
      status: 'PRODUCING',
      deliveryDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000),
      totalAmount: 25000000,
      paidAmount: 15000000,
      debtAmount: 10000000,
      estimatedCost: 18000000,
      estimatedProfit: 7000000,
      profitMargin: 28.0,
      notes: 'Đơn hàng phục vụ đợt Tết Trung thu gấp, cần chú ý kiểm tra khâu ép kim nhũ vàng.',
      items: {
        create: [
          {
            name: 'Hộp bánh trung thu cao cấp',
            qty: 10000,
            size: '22x22x6cm',
            paper: 'Couche 350gsm + carton lạnh',
            print: 'In offset 4 màu',
            process: 'Cán màng mờ, ép kim logo, bế dán thành phẩm',
            price: 2500,
          }
        ]
      },
      designFiles: {
        create: [
          {
            fileName: 'hop_kinh_do_final.pdf',
            fileUrl: '/uploads/files/hop_kinh_do_final.pdf',
            uploadedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
            approvedById: designer.id,
            approvedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
          }
        ]
      },
      productionSteps: {
        create: [
          { stepName: 'IN_AN', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
          { stepName: 'BE_THANH_PHAM', status: 'PROCESSING', assignedTo: 'Phạm Văn Sản Xuất' },
          { stepName: 'DAN_GIAO', status: 'PENDING' },
          { stepName: 'DONG_GOI', status: 'PENDING' },
        ]
      },
      payments: {
        create: [
          {
            amount: 15000000,
            paymentMethod: 'TRANSFER',
            notes: 'Khách hàng đặt cọc trước 60% trị giá đơn hàng.',
          }
        ]
      }
    },
  });

  // Đơn 2: Cholimex - Đang thiết kế, LỜI
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-002',
      quoteId: quoteCholimex.id,
      customerId: customerCholimex.id,
      status: 'DESIGNING',
      deliveryDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000),
      totalAmount: 45000000,
      paidAmount: 45000000,
      debtAmount: 0,
      estimatedCost: 32000000,
      estimatedProfit: 13000000,
      profitMargin: 28.89,
      notes: 'Khách đã thanh toán 100% trước để được hưởng ưu đãi miễn phí vận chuyển.',
      items: {
        create: [
          {
            name: 'Thùng carton 3 lớp đựng tương ớt',
            qty: 5000,
            size: '40x30x25cm',
            paper: 'Carton sóng B nâu',
            print: 'In flexo 2 màu',
            process: 'Chạy sóng, bế chập, đóng ghim thành phẩm',
            price: 9000,
          }
        ]
      },
      productionSteps: {
        create: [
          { stepName: 'IN_AN', status: 'PENDING' },
          { stepName: 'BE_THANH_PHAM', status: 'PENDING' },
          { stepName: 'DAN_GIAO', status: 'PENDING' },
          { stepName: 'DONG_GOI', status: 'PENDING' },
        ]
      },
      payments: {
        create: [
          {
            amount: 45000000,
            paymentMethod: 'TRANSFER',
            notes: 'Thanh toán 100% bằng chuyển khoản ngân hàng.',
          }
        ]
      }
    },
  });

  // Đơn 3: Shop Linh Chi - Đã hoàn thành (Quá hạn giao), LỜI
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-003',
      quoteId: quoteLinhChi.id,
      customerId: customerLinhChi.id,
      status: 'COMPLETED',
      deliveryDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      totalAmount: 8000000,
      paidAmount: 5500000,
      debtAmount: 2500000,
      estimatedCost: 6500000,
      estimatedProfit: 1500000,
      profitMargin: 18.75,
      notes: 'Đã sản xuất xong và đóng gói, khách hàng báo bận chưa qua nhận hàng. Cần nhắc sale liên hệ lại.',
      items: {
        create: [
          {
            name: 'Túi giấy Kraft đựng mỹ phẩm',
            qty: 2000,
            size: '15x20x8cm',
            paper: 'Giấy Kraft nâu 180gsm',
            print: 'In offset 1 màu đen',
            process: 'Bế dán thành phẩm, xỏ quai dây thừng',
            price: 4000,
          }
        ]
      },
      designFiles: {
        create: [
          {
            fileName: 'tui_kraft_linhchi_v2.ai',
            fileUrl: '/uploads/files/tui_kraft_linhchi_v2.ai',
            uploadedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
            approvedById: designer.id,
            approvedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
          }
        ]
      },
      productionSteps: {
        create: [
          { stepName: 'IN_AN', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
          { stepName: 'BE_THANH_PHAM', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
          { stepName: 'DAN_GIAO', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
          { stepName: 'DONG_GOI', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
        ]
      },
      payments: {
        create: [
          {
            amount: 5500000,
            paymentMethod: 'CASH',
            notes: 'Khách trả trước tiền mặt tại xưởng.',
          }
        ]
      }
    },
  });

  // Đơn 4: HTX Đà Lạt - Đã duyệt file, LỖ
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-004',
      quoteId: quoteDalat.id,
      customerId: customerDalat.id,
      status: 'DESIGN_APPROVED',
      deliveryDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000),
      totalAmount: 15000000,
      paidAmount: 20000000,
      debtAmount: -5000000,
      estimatedCost: 15500000,
      estimatedProfit: -500000,
      profitMargin: -3.33,
      notes: 'Khách hàng thanh toán dư 5tr chuyển sang công nợ kỳ sau. Chấp nhận lỗ nhẹ đơn này vì là khách hàng lớn tiềm năng.',
      items: {
        create: [
          {
            name: 'Hộp giấy đựng trà Actiso cao cấp',
            qty: 3000,
            size: '10x15x6cm',
            paper: 'Ivory 300gsm',
            print: 'In offset 4 màu',
            process: 'Cán màng mờ, phủ UV định hình chữ nổi, bế dán gài',
            price: 5000,
          }
        ]
      },
      designFiles: {
        create: [
          {
            fileName: 'hop_tra_dalat_final.pdf',
            fileUrl: '/uploads/files/hop_tra_dalat_final.pdf',
            uploadedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
            approvedById: designer.id,
            approvedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
          }
        ]
      },
      productionSteps: {
        create: [
          { stepName: 'IN_AN', status: 'PENDING' },
          { stepName: 'BE_THANH_PHAM', status: 'PENDING' },
          { stepName: 'DAN_GIAO', status: 'PENDING' },
          { stepName: 'DONG_GOI', status: 'PENDING' },
        ]
      },
      payments: {
        create: [
          {
            amount: 20000000,
            paymentMethod: 'TRANSFER',
            notes: 'Khách chuyển khoản dư cọc để giữ giá nguyên vật liệu.',
          }
        ]
      }
    },
  });

  // 5. Seed Materials (Vật tư decal khổ 32x35)
  console.log('Tạo vật tư decal mẫu...');
  await prisma.material.createMany({
    data: [
      { materialCode: 'DECAL-GIAY-3235', name: 'Decal giấy 32x35', materialType: 'DECAL_GIAY', sheetWidthCm: 32, sheetHeightCm: 35, basePrice: 2500, unit: 'SHEET', status: 'ACTIVE' },
      { materialCode: 'DECAL-NHUA-SUA-3235', name: 'Decal nhựa sữa 32x35', materialType: 'DECAL_NHUA_SUA', sheetWidthCm: 32, sheetHeightCm: 35, basePrice: 3500, unit: 'SHEET', status: 'ACTIVE' },
      { materialCode: 'DECAL-NHUA-TRONG-3235', name: 'Decal nhựa trong 32x35', materialType: 'DECAL_NHUA_TRONG', sheetWidthCm: 32, sheetHeightCm: 35, basePrice: 4000, unit: 'SHEET', status: 'ACTIVE' },
      { materialCode: 'DECAL-XI-BAC-3235', name: 'Decal xi bạc 32x35', materialType: 'DECAL_XI_BAC', sheetWidthCm: 32, sheetHeightCm: 35, basePrice: 4500, unit: 'SHEET', status: 'ACTIVE' },
      { materialCode: 'DECAL-7-MAU-3235', name: 'Decal 7 màu 32x35', materialType: 'DECAL_7_MAU', sheetWidthCm: 32, sheetHeightCm: 35, basePrice: 5000, unit: 'SHEET', status: 'ACTIVE' },
    ],
  });

  // 6. Seed LaminationPrice (Giá cán màng)
  console.log('Tạo bảng giá cán màng mẫu...');
  await prisma.laminationPrice.createMany({
    data: [
      { name: 'Không cán màng', laminationType: 'NONE', pricePerSheet: 0, status: 'ACTIVE' },
      { name: 'Cán nhiệt bóng', laminationType: 'THERMAL_GLOSS', pricePerSheet: 1000, status: 'ACTIVE' },
      { name: 'Cán nhiệt mờ', laminationType: 'THERMAL_MATTE', pricePerSheet: 1000, status: 'ACTIVE' },
      { name: 'Cán màng keo bóng', laminationType: 'ADHESIVE_GLOSS', pricePerSheet: 1200, status: 'ACTIVE' },
      { name: 'Cán màng keo mờ', laminationType: 'ADHESIVE_MATTE', pricePerSheet: 1200, status: 'ACTIVE' },
    ],
  });

  // 7. Seed DieCutPrice (Bảng giá bế demi khổ 32x35)
  console.log('Tạo bảng giá bế demi mẫu...');
  await prisma.dieCutPrice.createMany({
    data: [
      { minSheets: 1,   maxSheets: 20,  shapeCutPrice: 8000, straightCutPrice: 5600, status: 'ACTIVE' },
      { minSheets: 21,  maxSheets: 30,  shapeCutPrice: 7000, straightCutPrice: 4900, status: 'ACTIVE' },
      { minSheets: 31,  maxSheets: 50,  shapeCutPrice: 6000, straightCutPrice: 4200, status: 'ACTIVE' },
      { minSheets: 51,  maxSheets: 80,  shapeCutPrice: 5000, straightCutPrice: 3500, status: 'ACTIVE' },
      { minSheets: 81,  maxSheets: 150, shapeCutPrice: 4000, straightCutPrice: 2800, status: 'ACTIVE' },
      { minSheets: 151, maxSheets: 200, shapeCutPrice: 3000, straightCutPrice: 2100, status: 'ACTIVE' },
      { minSheets: 201, maxSheets: null, shapeCutPrice: 2500, straightCutPrice: 1800, status: 'ACTIVE' },
    ],
  });

  // 8. Seed PricingRule (Quy tắc tính giá)
  console.log('Tạo quy tắc tính giá mẫu...');
  await prisma.pricingRule.createMany({
    data: [
      {
        ruleCode: 'ROUND_5CM_LABEL_RULE',
        ruleName: 'Quy tắc nhãn tròn 5cm',
        description: 'Nếu nhãn tròn 5cm và số lượng trên 1000 nhãn thì đề xuất 34 nhãn/tờ. Nếu dưới 1000 nhãn thì đề xuất 30 nhãn/tờ.',
        configJson: JSON.stringify({ diameterCm: 5, thresholdQuantity: 1000, labelsPerSheetAboveThreshold: 34, labelsPerSheetBelowThreshold: 30 }),
        status: 'ACTIVE',
      },
      {
        ruleCode: 'MATERIAL_DISCOUNT_OVER_200_SHEETS',
        ruleName: 'Giảm giá vật tư trên 200 tờ',
        description: 'Nếu số tờ in trên 200 thì giảm 5% đơn giá vật tư.',
        configJson: JSON.stringify({ minSheets: 201, discountPercent: 5 }),
        status: 'ACTIVE',
      },
      {
        ruleCode: 'DIE_CUT_LESS_THAN_8_LABELS',
        ruleName: 'Giảm giá bế khi ít nhãn trên tờ',
        description: 'Nếu 1 tờ có dưới 8 nhãn và tổng số tờ trên 100 thì giá bế bằng 90% giá bảng.',
        configJson: JSON.stringify({ maxLabelsPerSheet: 7, minTotalSheets: 101, priceMultiplier: 0.9 }),
        status: 'ACTIVE',
      },
      {
        ruleCode: 'DIE_CUT_OVER_100_LABELS',
        ruleName: 'Tăng giá bế khi trên 100 nhãn/tờ',
        description: 'Nếu 1 tờ có trên 100 nhãn thì giá bế tăng 10%.',
        configJson: JSON.stringify({ minLabelsPerSheet: 101, increasePercent: 10 }),
        status: 'ACTIVE',
      },
      {
        ruleCode: 'DIE_CUT_OVER_200_LABELS',
        ruleName: 'Tăng giá bế khi trên 200 nhãn/tờ',
        description: 'Nếu 1 tờ có trên 200 nhãn thì giá bế tăng 20%.',
        configJson: JSON.stringify({ minLabelsPerSheet: 201, increasePercent: 20 }),
        status: 'ACTIVE',
      },
      {
        ruleCode: 'LAMINATION_RULE_BY_MATERIAL',
        ruleName: 'Quy tắc cán màng theo chất liệu',
        description: 'Decal giấy có thể không cán màng. Decal nhựa sữa tem lớn hơn 5cm đề xuất cán nhiệt, dưới 5cm đề xuất cán keo. Decal xi bạc, nhựa trong, 7 màu luôn đề xuất cán màng keo.',
        configJson: JSON.stringify({
          decalGiay: { allowNoLamination: true },
          decalNhuaSua: { largeLabelGreaterThanCm: 5, largeLabelRecommended: 'THERMAL_GLOSS', smallLabelRecommended: 'ADHESIVE_GLOSS' },
          decalXiBac: { recommended: 'ADHESIVE_GLOSS' },
          decalNhuaTrong: { recommended: 'ADHESIVE_GLOSS' },
          decal7Mau: { recommended: 'ADHESIVE_GLOSS' },
        }),
        status: 'ACTIVE',
      },
    ],
  });

  // 9. Seed FileHandlingFee (Phí xử lý file)
  console.log('Tạo bảng phí xử lý file mẫu...');
  await prisma.fileHandlingFee.createMany({
    data: [
      { minQuantity: 1,     maxQuantity: 500,   feeAmount: 20000,  note: 'Phí xử lý file cho đơn dưới 500 cái', status: 'ACTIVE' },
      { minQuantity: 501,   maxQuantity: 1000,  feeAmount: 40000,  note: 'Phí xử lý file cho đơn 501-1000 cái', status: 'ACTIVE' },
      { minQuantity: 1001,  maxQuantity: 5000,  feeAmount: 160000, note: 'Phí xử lý file cho đơn 1001-5000 cái', status: 'ACTIVE' },
      { minQuantity: 5001,  maxQuantity: 10000, feeAmount: 300000, note: 'Phí xử lý file cho đơn 5001-10000 cái', status: 'ACTIVE' },
      { minQuantity: 10001, maxQuantity: 30000, feeAmount: 500000, note: 'Phí xử lý file cho đơn 10001-30000 cái', status: 'ACTIVE' },
    ],
  });

  console.log('Nạp dữ liệu mẫu thành công!');
}

main()
  .catch((e) => {
    console.error('Lỗi khi nạp dữ liệu mẫu:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
