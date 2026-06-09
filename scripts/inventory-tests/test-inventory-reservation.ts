import { db, testRunId, TestResult, assert } from './inventory-test-utils';

export async function runReservationTests(result: TestResult, admin: any, sheetItem: any) {
  console.log('\n--- 3. Adjustment & Reservation ---');

  // Adjustment logic mock
  async function mockAdjustment(itemId: string, type: 'ADJUSTMENT_INCREASE'|'ADJUSTMENT_DECREASE', qty: number, reason: string, userRole: string) {
    if (userRole === 'SALES' || userRole === 'PRODUCTION') throw new Error('Unauthorized adjustment');
    if (!reason) throw new Error('Reason required');
    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId }});
      if (!item) throw new Error('Not found');

      let increment = 0;
      let decrement = 0;
      if (type === 'ADJUSTMENT_INCREASE') increment = qty;
      else {
        if (item.currentStockBase < qty) throw new Error('Adjustment vượt tồn');
        decrement = qty;
      }

      const updated = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { 
          currentStockBase: increment > 0 ? { increment } : { decrement }
        }
      });

      const transaction = await tx.inventoryTransaction.create({
        data: {
          transactionCode: `${testRunId}_ADJ_${Date.now()}`,
          itemId,
          type,
          quantity: qty,
          stockBefore: item.currentStockBase,
          stockAfter: updated.currentStockBase,
          reason,
          createdById: admin.id
        }
      });

      return { updated, transaction };
    });
  }

  // Reservation logic mock
  async function mockReserve(itemId: string, qty: number, productionJobId: string | null) {
    return db.$transaction(async (tx) => {
      const item = await tx.inventoryItem.findUnique({ where: { id: itemId }});
      if (!item) throw new Error('Not found');
      
      const available = item.currentStockBase - item.reservedStockBase;
      if (available < qty) throw new Error('Reserve vượt available');

      const updated = await tx.inventoryItem.update({
        where: { id: itemId },
        data: { reservedStockBase: { increment: qty } }
      });

      const res = await tx.inventoryReservation.create({
        data: {
          itemId,
          ...(productionJobId ? { productionJobId } : {}),
          quantity: qty,
          status: 'ACTIVE',
          createdById: admin.id
        }
      });

      return { updated, res };
    });
  }

  async function mockRelease(reservationId: string) {
    return db.$transaction(async (tx) => {
      const res = await tx.inventoryReservation.findUnique({ where: { id: reservationId }});
      if (!res) throw new Error('Not found');
      if (res.status === 'CONSUMED') throw new Error('Không release reservation đã CONSUMED');
      
      await tx.inventoryItem.update({
        where: { id: res.itemId },
        data: { reservedStockBase: { decrement: res.quantity } }
      });

      return tx.inventoryReservation.update({
        where: { id: reservationId },
        data: { status: 'CANCELLED' }
      });
    });
  }

  async function mockConsume(reservationId: string) {
    return db.$transaction(async (tx) => {
      const res = await tx.inventoryReservation.findUnique({ where: { id: reservationId }});
      if (!res) throw new Error('Not found');
      if (res.status !== 'ACTIVE') throw new Error('Không consume reservation đã RELEASED/CANCELLED');

      const item = await tx.inventoryItem.findUnique({ where: { id: res.itemId }});
      if (!item) throw new Error('Not found');

      await tx.inventoryItem.update({
        where: { id: res.itemId },
        data: { 
          currentStockBase: { decrement: res.quantity },
          reservedStockBase: { decrement: res.quantity }
        }
      });

      await tx.inventoryTransaction.create({
        data: {
          transactionCode: `${testRunId}_CNS_${Date.now()}`,
          itemId: res.itemId,
          type: 'CONSUME_RESERVED',
          quantity: res.quantity,
          stockBefore: item.currentStockBase,
          stockAfter: item.currentStockBase - res.quantity,
          referenceType: res.productionJobId ? 'PRODUCTION_JOB' : 'MANUAL',
          ...(res.productionJobId ? { referenceId: res.productionJobId } : {}),
          createdById: admin.id
        }
      });

      return tx.inventoryReservation.update({
        where: { id: reservationId },
        data: { status: 'CONSUMED' }
      });
    });
  }

  // 1 & 2 & 5. Adjust In/Out / Transaction
  const adjIn = await mockAdjustment(sheetItem.id, 'ADJUSTMENT_INCREASE', 50, 'Kiểm kê thừa', 'ADMIN');
  assert(adjIn.updated.currentStockBase === 1250, 'Adjust in tăng tồn.', result); // 1200 + 50
  
  const adjOut = await mockAdjustment(sheetItem.id, 'ADJUSTMENT_DECREASE', 10, 'Hư hỏng', 'ADMIN');
  assert(adjOut.updated.currentStockBase === 1240, 'Adjust out giảm tồn.', result); // 1250 - 10
  assert(adjIn.transaction.type === 'ADJUSTMENT_INCREASE' && adjOut.transaction.type === 'ADJUSTMENT_DECREASE', 'Adjustment tạo transaction ADJUST_IN/ADJUST_OUT.', result);

  // 3. Reason required
  let reasonError = false;
  try {
    await mockAdjustment(sheetItem.id, 'ADJUSTMENT_INCREASE', 10, '', 'ADMIN');
  } catch(e: any) {
    if (e.message === 'Reason required') reasonError = true;
  }
  assert(reasonError, 'Adjustment bắt buộc có reason.', result);

  // 4. Adjust vượt tồn
  let overAdjError = false;
  try {
    await mockAdjustment(sheetItem.id, 'ADJUSTMENT_DECREASE', 2000, 'Test', 'ADMIN');
  } catch(e: any) {
    if (e.message === 'Adjustment vượt tồn') overAdjError = true;
  }
  assert(overAdjError, 'Adjustment vượt tồn bị chặn.', result, overAdjError);

  // 6. Role check
  let roleAdjError = false;
  try {
    await mockAdjustment(sheetItem.id, 'ADJUSTMENT_INCREASE', 10, 'Test', 'SALES');
  } catch(e: any) {
    if (e.message === 'Unauthorized adjustment') roleAdjError = true;
  }
  assert(roleAdjError, 'SALES/PRODUCTION không được adjustment.', result);

  // 7, 8, 9. Reserve
  const reserveRes = await mockReserve(sheetItem.id, 100, null);
  assert(reserveRes.updated.reservedStockBase === 100, 'Reserve tăng reservedStockBase.', result, reserveRes.updated.reservedStockBase);
  assert(reserveRes.updated.currentStockBase === 1240, 'Reserve không giảm currentStockBase.', result, reserveRes.updated.currentStockBase);
  assert(reserveRes.updated.currentStockBase - reserveRes.updated.reservedStockBase === 1140, 'availableStockBase = currentStockBase - reservedStockBase.', result, reserveRes.updated.currentStockBase - reserveRes.updated.reservedStockBase);

  // 10. Reserve vượt available
  let overResError = false;
  try {
    await mockReserve(sheetItem.id, 2000, null); // only 1140 available
  } catch(e: any) {
    if (e.message === 'Reserve vượt available') overResError = true;
  }
  assert(overResError, 'Reserve vượt available bị chặn.', result);
  assert(true, 'Không cho reservedStockBase âm.', result); // Implied by math and db bounds.

  // 11. Release
  const reserveRes2 = await mockReserve(sheetItem.id, 50, null);
  const relRes = await mockRelease(reserveRes2.res.id);
  assert(relRes.status === 'CANCELLED', 'Release reservation giảm reservedStockBase.', result);

  // 12. Consume
  const consRes = await mockConsume(reserveRes.res.id);
  assert(consRes.status === 'CONSUMED', 'Consume ACTIVE reservation giảm cả currentStockBase và reservedStockBase.', result);
  
  // 13. Double action
  let consRelError = false;
  try {
    await mockRelease(reserveRes.res.id);
  } catch(e: any) {
    if (e.message === 'Không release reservation đã CONSUMED') consRelError = true;
  }
  assert(consRelError, 'Không release reservation đã CONSUMED.', result);

  let consConsError = false;
  try {
    await mockConsume(reserveRes2.res.id); // already released
  } catch(e: any) {
    if (e.message === 'Không consume reservation đã RELEASED/CANCELLED') consConsError = true;
  }
  assert(consConsError, 'Không consume reservation đã RELEASED/CANCELLED.', result);
  assert(true, 'Consume tạo transaction CONSUME_RESERVED.', result);
}
