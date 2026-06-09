import { PrismaClient } from '@prisma/client';

export const db = new PrismaClient();

export const testRunId = `INVCORE_${Date.now()}`;

export interface TestResult {
  passed: number;
  total: number;
}

export function assert(condition: boolean, msg: string, result: TestResult, details?: any) {
  result.total++;
  if (condition) {
    console.log(`  [PASS] ${msg}`);
    result.passed++;
  } else {
    console.error(`  [FAIL] ${msg}`, details !== undefined ? `(Got: ${details})` : '');
  }
}

export async function cleanupTestRunData() {
  console.log(`Cleaning up old test data...`);
  // Try to clean up anything starting with INVCORE_
  // Because of foreign key constraints, we delete from leaf to root, or use cascade.
  
  await db.taskItem.deleteMany({ where: { title: { startsWith: 'INVCORE_' } } });
  
  await db.printQueueItem.deleteMany({
    where: { OR: [ { order: { orderCode: { startsWith: 'INVCORE_' } } }, { material: { itemCode: { startsWith: 'INVCORE_' } } } ] }
  });

  await db.productionJob.deleteMany({
    where: { order: { orderCode: { startsWith: 'INVCORE_' } } }
  });

  await db.order.deleteMany({
    where: { orderCode: { startsWith: 'INVCORE_' } }
  });

  await db.dieCutMold.deleteMany({
    where: { code: { startsWith: 'INVCORE_' } }
  });

  // Material conversions and outputs are deleted via Cascade from InventoryItem hopefully, 
  // but let's delete them directly if not.
  const oldItems = await db.inventoryItem.findMany({ where: { itemCode: { startsWith: 'INVCORE_' } } });
  const oldItemIds = oldItems.map(i => i.id);
  
  await db.inventoryConversionOutputLine.deleteMany({ where: { toMaterialId: { in: oldItemIds } } });
  await db.inventoryConversion.deleteMany({ where: { fromMaterialId: { in: oldItemIds } } });
  await db.inventoryReservation.deleteMany({ where: { itemId: { in: oldItemIds } } });
  await db.inventoryTransaction.deleteMany({ where: { itemId: { in: oldItemIds } } });

  await db.inventoryItem.deleteMany({
    where: { itemCode: { startsWith: 'INVCORE_' } }
  });

  await db.customer.deleteMany({
    where: { customerCode: { startsWith: 'INVCORE_' } }
  });

  await db.taskLog.deleteMany({
    where: { actorId: { startsWith: 'INVCORE_' } }
  });

  await db.taskItem.deleteMany({
    where: { OR: [ { title: { startsWith: 'INVCORE_' } }, { createdBy: { email: { startsWith: 'INVCORE_' } } } ] }
  });

  await db.systemAuditLog.deleteMany({
    where: { actorId: { startsWith: 'INVCORE_' } }
  });

  try {
    await db.user.deleteMany({
      where: { email: { startsWith: 'INVCORE_' } }
    });
  } catch (e) {
    // Ignore user delete errors due to FK constraints
  }
  console.log(`Cleanup finished.`);
}

export async function createMockUsers() {
  const admin = await db.user.create({
    data: { id: `${testRunId}_ADMIN`, email: `${testRunId}_ADMIN@test.com`, name: 'Admin', role: 'ADMIN', status: 'ACTIVE', passwordHash: 'dummy' }
  });
  const sales = await db.user.create({
    data: { id: `${testRunId}_SALES`, email: `${testRunId}_SALES@test.com`, name: 'Sales', role: 'SALES', status: 'ACTIVE', passwordHash: 'dummy' }
  });
  const prod = await db.user.create({
    data: { id: `${testRunId}_PROD`, email: `${testRunId}_PROD@test.com`, name: 'Prod', role: 'PRODUCTION', status: 'ACTIVE', passwordHash: 'dummy' }
  });
  const acct = await db.user.create({
    data: { id: `${testRunId}_ACCT`, email: `${testRunId}_ACCT@test.com`, name: 'Accountant', role: 'ACCOUNTANT', status: 'ACTIVE', passwordHash: 'dummy' }
  });
  return { admin, sales, prod, acct };
}

export async function createMockCustomer(salesId: string) {
  return db.customer.create({
    data: {
      customerCode: `${testRunId}_CUST`,
      name: `Test Customer ${testRunId}`,
      phone: '0900111222',
      customerType: 'RETAIL',
      source: 'OTHER',
      assignedSalesId: salesId
    }
  });
}
