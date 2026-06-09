import { db, testRunId, cleanupTestRunData, createMockUsers, TestResult } from './inventory-tests/inventory-test-utils';
import { runCrudTests } from './inventory-tests/test-inventory-crud';
import { runStockTests } from './inventory-tests/test-inventory-stock';
import { runReservationTests } from './inventory-tests/test-inventory-reservation';
import { runConversionTests } from './inventory-tests/test-inventory-conversion';
import { runAlertTests } from './inventory-tests/test-inventory-alerts';
import { runOrderProductionTests } from './inventory-tests/test-inventory-order-production';
import { runPrintRbacTests } from './inventory-tests/test-inventory-print-rbac';

async function main() {
  console.log(`\n======================================================`);
  console.log(`Bắt đầu chạy Phase 22A Core Test Suite (Run ID: ${testRunId})`);
  console.log(`======================================================\n`);

  await cleanupTestRunData();

  const { admin, sales } = await createMockUsers();

  const results = {
    crud: { passed: 0, total: 0 },
    stock: { passed: 0, total: 0 },
    reservation: { passed: 0, total: 0 },
    conversion: { passed: 0, total: 0 },
    alerts: { passed: 0, total: 0 },
    order: { passed: 0, total: 0 },
    rbac: { passed: 0, total: 0 }
  };

  try {
    const { sheetItem, rollItem } = await runCrudTests(results.crud, admin, sales);
    await runStockTests(results.stock, admin, sheetItem);
    await runReservationTests(results.reservation, admin, sheetItem);
    await runConversionTests(results.conversion, admin, sheetItem, rollItem);
    await runAlertTests(results.alerts, admin, sheetItem);
    await runOrderProductionTests(results.order, admin, sheetItem);
    await runPrintRbacTests(results.rbac, admin, sales);

  } catch (error) {
    console.error(`\n[LỖI NGHIÊM TRỌNG TRONG QUÁ TRÌNH CHẠY TEST]`, error);
  } finally {
    if (process.env.DEBUG_TEST_DATA !== 'true') {
      console.log('\n[INFO] Dọn dẹp dữ liệu test do không bật DEBUG_TEST_DATA=true...');
      await cleanupTestRunData();
    } else {
      console.log('\n[INFO] Giữ lại dữ liệu test để debug.');
    }
    await db.$disconnect();
  }

  const totalPassed = Object.values(results).reduce((acc, curr) => acc + curr.passed, 0);
  const totalCases = Object.values(results).reduce((acc, curr) => acc + curr.total, 0);

  console.log(`\n======================================================`);
  console.log(`Inventory Core Test Summary:`);
  console.log(`- CRUD: ${results.crud.passed}/${results.crud.total}`);
  console.log(`- Stock: ${results.stock.passed}/${results.stock.total}`);
  console.log(`- Adjustment & Reservation: ${results.reservation.passed}/${results.reservation.total}`);
  console.log(`- Conversion/Addendum: ${results.conversion.passed}/${results.conversion.total}`);
  console.log(`- Alerts/Task Center: ${results.alerts.passed}/${results.alerts.total}`);
  console.log(`- Order/Production: ${results.order.passed}/${results.order.total}`);
  console.log(`- RBAC/Print: ${results.rbac.passed}/${results.rbac.total}`);
  console.log(`------------------------------------------------------`);
  console.log(`Total: ${totalPassed} / ${totalCases} PASS`);
  console.log(`======================================================\n`);

  if (totalPassed < totalCases) {
    process.exit(1);
  }
}

main().catch(console.error);
