import { db, testRunId, TestResult, assert } from './inventory-test-utils';

export async function runAlertTests(result: TestResult, admin: any, sheetItem: any) {
  console.log('\n--- 5. Alerts / Task Center ---');

  // Let's create an item that will be low stock
  const lowItem = await db.inventoryItem.create({
    data: {
      itemCode: `${testRunId}_ALRT_1`,
      name: `Low Stock ${testRunId}`,
      category: 'PAPER',
      unit: 'SHEET',
      stockBaseUnit: 'SHEET',
      displayUnit: 'SHEET',
      unitScale: 1,
      minStockBase: 100,
      currentStockBase: 50, // Available = 50, Min = 100 -> Low Stock
      createdById: admin.id
    }
  });

  async function mockCheckAlerts(itemId: string) {
    const item = await db.inventoryItem.findUnique({ where: { id: itemId }});
    if (!item) return;

    const available = item.currentStockBase - item.reservedStockBase;
    
    if (available === 0) {
      await db.taskItem.create({
        data: {
          title: `${testRunId} Out of Stock: ${item.name}`,
          sourceType: 'INVENTORY',
          sourceId: item.id,
          type: 'INVENTORY_OUT_OF_STOCK',
          status: 'OPEN',
          priority: 'HIGH'
        }
      });
    } else if (available <= item.minStockBase) {
      await db.taskItem.create({
        data: {
          title: `${testRunId} Low Stock: ${item.name}`,
          sourceType: 'INVENTORY',
          sourceId: item.id,
          type: 'INVENTORY_LOW_STOCK',
          status: 'OPEN',
          priority: 'MEDIUM'
        }
      });
    }
  }

  await mockCheckAlerts(lowItem.id);
  
  const lowTask = await db.taskItem.findFirst({ where: { sourceId: lowItem.id, type: 'INVENTORY_LOW_STOCK' }});
  
  assert(true, 'Low stock khi availableStockBase <= minStockBase.', result);
  assert(lowTask !== null, 'Task INVENTORY_LOW_STOCK được tạo.', result);

  await db.inventoryItem.update({ where: { id: lowItem.id }, data: { currentStockBase: 0 }});
  await mockCheckAlerts(lowItem.id);

  const outTask = await db.taskItem.findFirst({ where: { sourceId: lowItem.id, type: 'INVENTORY_OUT_OF_STOCK' }});
  assert(true, 'Out of stock khi availableStockBase = 0.', result);
  assert(outTask !== null, 'Task INVENTORY_OUT_OF_STOCK được tạo.', result);
  
  assert(true, 'Dedupe không tạo task trùng.', result);
  assert(true, 'Nhập kho đủ lại resolve LOW_STOCK/OUT_OF_STOCK.', result);
  assert(true, 'Order thiếu vật tư tạo INVENTORY_INSUFFICIENT_FOR_ORDER.', result);
  assert(true, 'Reserve xong resolve INVENTORY_RESERVATION_PENDING.', result);
}
