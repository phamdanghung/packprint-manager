import { PrismaClient } from '@prisma/client';
import crypto from 'crypto';

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function main() {
  console.log('Bắt đầu dọn dẹp database...');
  await prisma.pricingConfig.deleteMany({});
  await prisma.payment.deleteMany({});
  await prisma.productionStep.deleteMany({});
  await prisma.order.deleteMany({});
  await prisma.quote.deleteMany({});
  await prisma.customer.deleteMany({});
  await prisma.user.deleteMany({});

  console.log('Bắt đầu nạp dữ liệu mẫu (Seeding)...');

  // 1. Tạo Users
  console.log('Tạo người dùng mẫu...');
  const adminPassword = hashPassword('admin123');
  const salePassword = hashPassword('sale123');
  const designPassword = hashPassword('design123');
  const productionPassword = hashPassword('production123');
  const accountantPassword = hashPassword('accountant123');

  const admin = await prisma.user.create({
    data: {
      email: 'admin@inbaobi.com',
      passwordHash: adminPassword,
      name: 'Nguyễn Văn Admin',
      role: 'ADMIN',
    },
  });

  const sale = await prisma.user.create({
    data: {
      email: 'sale@inbaobi.com',
      passwordHash: salePassword,
      name: 'Trần Thị Sale',
      role: 'SALE',
    },
  });

  const designer = await prisma.user.create({
    data: {
      email: 'design@inbaobi.com',
      passwordHash: designPassword,
      name: 'Lê Văn Thiết Kế',
      role: 'DESIGNER',
    },
  });

  const production = await prisma.user.create({
    data: {
      email: 'production@inbaobi.com',
      passwordHash: productionPassword,
      name: 'Phạm Văn Sản Xuất',
      role: 'PRODUCTION',
    },
  });

  const accountant = await prisma.user.create({
    data: {
      email: 'accountant@inbaobi.com',
      passwordHash: accountantPassword,
      name: 'Hoàng Thị Kế Toán',
      role: 'ACCOUNTANT',
    },
  });

  // 2. Tạo Customers
  console.log('Tạo khách hàng mẫu...');
  const customerKindo = await prisma.customer.create({
    data: {
      name: 'Công ty TNHH Bánh kẹo Kinh Đô',
      phone: '02838270838',
      email: 'contact@kinhdo.vn',
      address: '138-142 Hai Bà Trưng, Phường Đa Kao, Quận 1, TP. HCM',
      companyName: 'Kinh Do Corporation',
      debtBalance: 10000000, // Còn nợ 10tr
    },
  });

  const customerCholimex = await prisma.customer.create({
    data: {
      name: 'Công ty Cổ phần Thực phẩm Cholimex',
      phone: '02837653389',
      email: 'info@cholimexfood.com.vn',
      address: 'Lô C40-43/I, Đường số 7, KCN Vĩnh Lộc, Bình Chánh, TP. HCM',
      companyName: 'Cholimex Food JSC',
      debtBalance: 0, // Đã thanh toán hết
    },
  });

  const customerLinhChi = await prisma.customer.create({
    data: {
      name: 'Shop Mỹ phẩm Organic Linh Chi',
      phone: '0988123456',
      email: 'linhchiorganic@gmail.com',
      address: '85 Nguyễn Huệ, Phường Bến Nghé, Quận 1, TP. HCM',
      companyName: 'Hộ kinh doanh Linh Chi Organic',
      debtBalance: 2500000, // Còn nợ 2.5tr
    },
  });

  const customerDalat = await prisma.customer.create({
    data: {
      name: 'Hợp tác xã Nông sản Hữu cơ Đà Lạt',
      phone: '02633822123',
      email: 'dalatorganic@coop.vn',
      address: '12 Trần Phú, Phường 3, TP. Đà Lạt, Lâm Đồng',
      companyName: 'Da Lat Organic Co-operative',
      debtBalance: -5000000, // Trả trước/Thừa nợ 5tr
    },
  });

  // 3. Tạo Quotes
  console.log('Tạo báo giá mẫu...');
  const itemsKindo = JSON.stringify([
    { name: 'Hộp bánh trung thu cao cấp', qty: 10000, size: '22x22x6cm', paper: 'Couche 350gsm + carton lạnh', print: 'In offset 4 màu', process: 'Cán màng mờ, ép kim logo, bế dán thành phẩm', price: 2500 },
  ]);
  const quoteKindo = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-001',
      customerId: customerKindo.id,
      itemsJson: itemsKindo,
      totalAmount: 25000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Báo giá đã bao gồm thuế và chiết khấu cho khách hàng thân thiết.',
    },
  });

  const itemsCholimex = JSON.stringify([
    { name: 'Thùng carton 3 lớp đựng tương ớt', qty: 5000, size: '40x30x25cm', paper: 'Carton sóng B nâu', print: 'In flexo 2 màu', process: 'Chạy sóng, bế chập, đóng ghim thành phẩm', price: 9000 },
  ]);
  const quoteCholimex = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-002',
      customerId: customerCholimex.id,
      itemsJson: itemsCholimex,
      totalAmount: 45000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Khách hàng đặt số lượng lớn thường xuyên, giao hàng theo từng đợt.',
    },
  });

  const itemsLinhChi = JSON.stringify([
    { name: 'Túi giấy Kraft đựng mỹ phẩm', qty: 2000, size: '15x20x8cm', paper: 'Giấy Kraft nâu 180gsm', print: 'In offset 1 màu đen', process: 'Bế dán thành phẩm, xỏ quai dây thừng', price: 4000 },
  ]);
  const quoteLinhChi = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-003',
      customerId: customerLinhChi.id,
      itemsJson: itemsLinhChi,
      totalAmount: 8000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Thiết kế tối giản thân thiện với môi trường.',
    },
  });

  const itemsDalat = JSON.stringify([
    { name: 'Hộp giấy đựng trà Actiso cao cấp', qty: 3000, size: '10x15x6cm', paper: 'Ivory 300gsm', print: 'In offset 4 màu', process: 'Cán màng mờ, phủ UV định hình chữ nổi, bế dán gài', price: 5000 },
  ]);
  const quoteDalat = await prisma.quote.create({
    data: {
      quoteNumber: 'BG-2026-004',
      customerId: customerDalat.id,
      itemsJson: itemsDalat,
      totalAmount: 15000000,
      status: 'APPROVED',
      createdById: sale.id,
      notes: 'Yêu cầu giấy Ivory loại tốt nhất, phủ định hình phản quang nổi bật.',
    },
  });

  // 4. Tạo Orders & ProductionSteps & Payments
  console.log('Tạo đơn hàng mẫu & công đoạn sản xuất...');
  const today = new Date();

  // Đơn 1: Kinh Đô - Đang sản xuất, LỜI
  const order1 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-001',
      quoteId: quoteKindo.id,
      customerId: customerKindo.id,
      status: 'PRODUCING',
      deliveryDate: new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000), // Hôm nay + 3 ngày
      finalFileUrl: '/uploads/files/hop_kinh_do_final.pdf',
      finalFileName: 'hop_kinh_do_final.pdf',
      finalFileUploadedAt: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000),
      finalFileApprovedById: designer.id,
      totalAmount: 25000000,
      paidAmount: 15000000,
      debtAmount: 10000000,
      estimatedCost: 18000000,
      estimatedProfit: 7000000,
      profitMargin: 28.0,
      notes: 'Đơn hàng phục vụ đợt Tết Trung thu gấp, cần chú ý kiểm tra khâu ép kim nhũ vàng.',
    },
  });

  await prisma.productionStep.createMany({
    data: [
      { orderId: order1.id, stepName: 'IN_AN', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
      { orderId: order1.id, stepName: 'BE_THANH_PHAM', status: 'PROCESSING', assignedTo: 'Phạm Văn Sản Xuất' },
      { orderId: order1.id, stepName: 'DAN_GIAO', status: 'PENDING' },
      { orderId: order1.id, stepName: 'DONG_GOI', status: 'PENDING' },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order1.id,
      amount: 15000000,
      paymentMethod: 'TRANSFER',
      notes: 'Khách hàng đặt cọc trước 60% trị giá đơn hàng.',
    },
  });


  // Đơn 2: Cholimex - Đang thiết kế, LỜI
  const order2 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-002',
      quoteId: quoteCholimex.id,
      customerId: customerCholimex.id,
      status: 'DESIGNING',
      deliveryDate: new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000), // Hôm nay + 7 ngày
      totalAmount: 45000000,
      paidAmount: 45000000,
      debtAmount: 0,
      estimatedCost: 32000000,
      estimatedProfit: 13000000,
      profitMargin: 28.89,
      notes: 'Khách đã thanh toán 100% trước để được hưởng ưu đãi miễn phí vận chuyển.',
    },
  });

  await prisma.productionStep.createMany({
    data: [
      { orderId: order2.id, stepName: 'IN_AN', status: 'PENDING' },
      { orderId: order2.id, stepName: 'BE_THANH_PHAM', status: 'PENDING' },
      { orderId: order2.id, stepName: 'DAN_GIAO', status: 'PENDING' },
      { orderId: order2.id, stepName: 'DONG_GOI', status: 'PENDING' },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order2.id,
      amount: 45000000,
      paymentMethod: 'TRANSFER',
      notes: 'Thanh toán 100% bằng chuyển khoản ngân hàng.',
    },
  });


  // Đơn 3: Shop Linh Chi - Đã hoàn thành (Quá hạn giao), LỜI
  const order3 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-003',
      quoteId: quoteLinhChi.id,
      customerId: customerLinhChi.id,
      status: 'COMPLETED',
      deliveryDate: new Date(today.getTime() - 2 * 24 * 60 * 60 * 1000), // Cách đây 2 ngày (Quá hạn)
      finalFileUrl: '/uploads/files/tui_kraft_linhchi_v2.ai',
      finalFileName: 'tui_kraft_linhchi_v2.ai',
      finalFileUploadedAt: new Date(today.getTime() - 5 * 24 * 60 * 60 * 1000),
      finalFileApprovedById: designer.id,
      totalAmount: 8000000,
      paidAmount: 5500000,
      debtAmount: 2500000,
      estimatedCost: 6500000,
      estimatedProfit: 1500000,
      profitMargin: 18.75,
      notes: 'Đã sản xuất xong và đóng gói, khách hàng báo bận chưa qua nhận hàng. Cần nhắc sale liên hệ lại.',
    },
  });

  await prisma.productionStep.createMany({
    data: [
      { orderId: order3.id, stepName: 'IN_AN', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
      { orderId: order3.id, stepName: 'BE_THANH_PHAM', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
      { orderId: order3.id, stepName: 'DAN_GIAO', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
      { orderId: order3.id, stepName: 'DONG_GOI', status: 'COMPLETED', assignedTo: 'Phạm Văn Sản Xuất' },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order3.id,
      amount: 5500000,
      paymentMethod: 'CASH',
      notes: 'Khách trả trước tiền mặt tại xưởng.',
    },
  });


  // Đơn 4: HTX Đà Lạt - Đã duyệt file, LỖ (để test chỉ số tài chính lỗ)
  const order4 = await prisma.order.create({
    data: {
      orderNumber: 'ORD-2026-004',
      quoteId: quoteDalat.id,
      customerId: customerDalat.id,
      status: 'DESIGN_APPROVED',
      deliveryDate: new Date(today.getTime() + 10 * 24 * 60 * 60 * 1000), // Hôm nay + 10 ngày
      finalFileUrl: '/uploads/files/hop_tra_dalat_final.pdf',
      finalFileName: 'hop_tra_dalat_final.pdf',
      finalFileUploadedAt: new Date(today.getTime() - 1 * 24 * 60 * 60 * 1000),
      finalFileApprovedById: designer.id,
      totalAmount: 15000000,
      paidAmount: 20000000, // Khách trả thừa/ứng trước 5 triệu
      debtAmount: -5000000,
      estimatedCost: 15500000, // Chi phí thực tế tăng do đổi giấy Ivory cao cấp
      estimatedProfit: -500000, // Lỗ 500k
      profitMargin: -3.33,
      notes: 'Khách hàng thanh toán dư 5tr chuyển sang công nợ kỳ sau. Chấp nhận lỗ nhẹ đơn này vì là khách hàng lớn tiềm năng cho vụ trà cuối năm.',
    },
  });

  await prisma.productionStep.createMany({
    data: [
      { orderId: order4.id, stepName: 'IN_AN', status: 'PENDING' },
      { orderId: order4.id, stepName: 'BE_THANH_PHAM', status: 'PENDING' },
      { orderId: order4.id, stepName: 'DAN_GIAO', status: 'PENDING' },
      { orderId: order4.id, stepName: 'DONG_GOI', status: 'PENDING' },
    ],
  });

  await prisma.payment.create({
    data: {
      orderId: order4.id,
      amount: 20000000,
      paymentMethod: 'TRANSFER',
      notes: 'Khách chuyển khoản dư cọc để giữ giá nguyên vật liệu.',
    },
  });

  // 5. Tạo Cấu hình giá
  console.log('Tạo cấu hình giá mẫu...');
  await prisma.pricingConfig.createMany({
    data: [
      { category: 'GIAY', key: 'Giấy Couche 300gsm', value: 4500, unit: 'Tờ A3', description: 'Giấy Couche định lượng 300g mịn 2 mặt' },
      { category: 'GIAY', key: 'Giấy Kraft nâu 180gsm', value: 2200, unit: 'Tờ A3', description: 'Giấy Kraft tái chế thân thiện môi trường' },
      { category: 'GIAY', key: 'Giấy Ivory 350gsm', value: 6800, unit: 'Tờ A3', description: 'Giấy Ivory cao cấp cứng cáp, chuyên làm vỏ hộp' },
      { category: 'MAY_IN', key: 'In offset 4 màu ca máy', value: 1200000, unit: 'Ca', description: 'Chi phí chạy ca máy in Offset Mitsubishi 4 màu' },
      { category: 'GIA_CONG', key: 'Cán màng mờ', value: 400, unit: 'Mặt/A3', description: 'Phủ màng mờ bảo vệ bề mặt in' },
      { category: 'GIA_CONG', key: 'Ép kim logo nhũ vàng', value: 1500, unit: 'Sản phẩm', description: 'Ép nhũ vàng nhiệt logo kích thước dưới 5x5cm' },
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
