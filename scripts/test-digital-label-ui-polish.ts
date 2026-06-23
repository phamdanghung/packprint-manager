import { calculateDigitalLabelQuotePreviewAction } from '../src/lib/quote-actions';
import { db } from '../src/lib/db';
import { Role } from '../src/lib/pricing/shared/types';
import fs from 'fs';
import path from 'path';

async function runPolishTests() {
  console.log('--- TESTING DIGITAL LABEL UI POLISH ---');
  let passCount = 0;
  let failCount = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`[PASS] ${message}`);
      passCount++;
    } else {
      console.error(`[FAIL] ${message}`);
      failCount++;
    }
  }

  // 1. Setup mock users and data
  const testUsers: Record<Role, string> = {} as any;
  const roles: Role[] = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];

  await db.user.deleteMany({
    where: { email: { startsWith: 'test_polish_' } }
  });
  await db.material.deleteMany({
    where: { materialCode: 'TEST_MAT_POLISH' }
  });

  for (const r of roles) {
    const user = await db.user.create({
      data: {
        email: `test_polish_${r.toLowerCase()}@test.com`,
        passwordHash: 'dummy',
        name: `Test Polish ${r}`,
        role: r,
        status: 'ACTIVE'
      }
    });
    testUsers[r] = user.id;
  }

  // Setup test config
  await db.dieCutMachineConfig.deleteMany({
    where: {
      OR: [
        { machineCode: 'TEST_DIECUT_GRAPHTEC' },
        { sheetSizeCode: 'test_polish_32x35' }
      ]
    }
  });

  const testConfig = await db.dieCutMachineConfig.create({
    data: {
      machineCode: 'TEST_DIECUT_GRAPHTEC',
      machineName: 'Graphtec Test',
      sheetSizeCode: 'test_polish_32x35',
      sheetLabel: '32 x 35 cm',
      sheetWidthCm: 32,
      sheetHeightCm: 35,
      usableWidthCm: 30.5,
      usableHeightCm: 31.5,
      isActive: true
    }
  });

  const material = await db.material.create({
    data: {
      materialCode: 'TEST_MAT_POLISH',
      name: 'Test Polish Material',
      basePrice: 2000,
      unit: 'Tờ',
      materialType: 'DECAL'
    }
  });

  const baseInput = {
    materialId: material.id,
    quantity: 1000,
    labelShape: 'CIRCLE',
    diameterCm: 5,
    gapMm: 1, // Testing gapMm = 1 -> gapCm = 0.1
    profitRate: 0.3, 
    vatRate: 0.08,   
    printingPricePerSheet: 1000,
    dieCutMachine: 'TEST_DIECUT_GRAPHTEC',
    sheetSize: 'test_polish_32x35'
  };

  try {
    process.env.TEST_USER_ID = testUsers['ADMIN'];
    const adminRes = await calculateDigitalLabelQuotePreviewAction(baseInput);
    assert(adminRes.success, "Action should succeed for ADMIN");
    
    // Check Gap calculation: 5cm diameter + 0.1cm gap = 5.1cm.
    // SafeZone 30.5 x 31.5 -> cols: floor(30.5/5.1) = 5, rows: floor(31.5/5.1) = 6. Total = 30 auto-packed items.
    const adminData = adminRes.data as any;
    assert(adminData.internalBreakdown.autoPackedItemsPerSheet === 30, `Gap mapping correctly applied (gapMm: 1 -> gapCm: 0.1, 5cm+0.1cm=5.1cm, 30.5x31.5 -> 30 con/tờ) - Actual: ${adminData.internalBreakdown.autoPackedItemsPerSheet}`);

    // Test Sales response
    process.env.TEST_USER_ID = testUsers['SALES'];
    const salesRes = await calculateDigitalLabelQuotePreviewAction(baseInput);
    const salesData = salesRes.data as any;
    assert(!('internalTotalCost' in salesData), "Sales response omits internalTotalCost");
    assert(!('internalBreakdown' in salesData), "Sales response omits internalBreakdown");
    assert('salesBreakdown' in salesData, "Sales response includes salesBreakdown");

    // 2. Static Analysis of React Component (Quote Form UI)
    const quoteFormPath = path.join(__dirname, '../src/components/quotes/quote-form.tsx');
    const quoteFormContent = fs.readFileSync(quoteFormPath, 'utf8');
    
    assert(quoteFormContent.includes('Sơ đồ minh họa bình bài'), 'UI có text "Sơ đồ minh họa bình bài"');
    assert(quoteFormContent.includes('Chưa có đề xuất tối ưu cho cấu hình này.'), 'UI có text "Chưa có đề xuất tối ưu cho cấu hình này."');
    assert(quoteFormContent.includes('Engine tính hình học được'), 'UI có text cảnh báo policy vs auto pack');
    assert(!quoteFormContent.includes('skipPermission'), 'Không có logic skipPermission/bypassPermission trong file UI');
    assert(!quoteFormContent.includes('Áp dụng cấu hình tối ưu'), 'Không render nút áp dụng tối ưu khi chưa có data hợp lệ (hoặc hardcode ẩn)');
    
    // Additional UI Polish Checks
    assert(quoteFormContent.includes('Phí vận chuyển:'), 'UI hiển thị Phí vận chuyển');
    assert(quoteFormContent.includes('totalAmount + (shippingFee || 0)'), 'Tổng thanh toán được cộng shipping fee');
    assert(quoteFormContent.includes('sanitizeDecimalTechnicalInput(e.target.value)'), 'Gap display không bị lỗi leading zero (sanitized)');
    assert(quoteFormContent.includes('disabled') && quoteFormContent.includes('value={wasteSheets}'), 'Bù hao tờ bị disable do chưa áp dụng');
    assert(quoteFormContent.includes('Vùng bế khả dụng'), 'Preview có ghi chú vùng bế khả dụng');
    assert(quoteFormContent.includes('Sơ đồ chỉ mang tính minh họa, giá tính theo số con/tờ chính thức từ engine'), 'Preview có text ghi chú minh họa');
    
    // Technical static UI tests per User Request 3
    assert(quoteFormContent.includes('Khổ in'), 'UI static tests check: Có "Khổ in"');
    assert(quoteFormContent.includes('Máy bế'), 'UI static tests check: Có "Máy bế"');
    assert(!quoteFormContent.includes('Máy in / Khổ'), 'UI static tests check: Không còn "Máy in / Khổ"');
    assert(!quoteFormContent.includes('Máy bế Test (32x35)'), 'UI static tests check: Không còn "Máy bế Test (32x35)"');
    
  } finally {
    // Cleanup
    await db.user.deleteMany({
      where: { id: { in: Object.values(testUsers) } }
    });
    await db.material.delete({
      where: { id: material.id }
    });
    await db.dieCutMachineConfig.deleteMany({
      where: {
        OR: [
          { machineCode: { startsWith: 'TEST_DIECUT_' } },
          { sheetSizeCode: { startsWith: 'test_polish_' } }
        ]
      }
    });
    console.log('\n[INFO] Cleanup successful.');
  }

  console.log(`\nTESTS COMPLETED. PASS: ${passCount}, FAIL: ${failCount}`);
  if (failCount > 0) {
    process.exit(1);
  }
}

runPolishTests().catch(e => {
  console.error(e);
  process.exit(1);
});
