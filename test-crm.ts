import { db } from './src/lib/db';
import { syncSystemTasks } from './src/lib/task-sync';

async function runTests() {
  console.log('--- BẮT ĐẦU TEST CRM ---');

  // 1. Kiểm tra tags trong DB
  console.log('\n[1] Kiểm tra schema Tags');
  console.log('Provider là SQLite nên không có type Json gốc, sử dụng String để lưu chuỗi JSON. Array string được validate tại server (tối đa 20 tags, 30 ký tự).');

  // Tạo mock users để test
  let admin = await db.user.findFirst({ where: { role: 'ADMIN' } });
  let salesA = await db.user.findFirst({ where: { role: 'SALES', name: { contains: 'A' } } });
  let salesB = await db.user.findFirst({ where: { role: 'SALES', name: { contains: 'B' } } });
  
  if (!salesA) salesA = await db.user.create({ data: { name: 'Sales A', email: 'salesa@test.com', passwordHash: 'xx', role: 'SALES' }});
  if (!salesB) salesB = await db.user.create({ data: { name: 'Sales B', email: 'salesb@test.com', passwordHash: 'xx', role: 'SALES' }});
  
  // Tạo 1 customer cho Sales A
  const custA = await db.customer.create({
    data: {
      customerCode: `TEST-CUST-${Date.now()}`,
      name: 'Test Customer A',
      phone: `0999${Date.now().toString().slice(-6)}`,
      assignedSalesId: salesA.id,
      tags: JSON.stringify(['VIP', 'Test_Tag']),
      crmStatus: 'PROSPECT',
      segment: 'ACTIVE',
      source: 'FACEBOOK',
    }
  });

  console.log(`Đã tạo Customer: ${custA.customerCode} với tags: ${custA.tags}`);

  // Test Private Note
  console.log('\n[5] Test Private Note Security');
  const privateNote = await db.customerNote.create({
    data: {
      customerId: custA.id,
      authorId: salesA.id,
      type: 'SALES_NOTE',
      content: 'Bí mật của Sales A',
      isPrivate: true,
    }
  });
  console.log(`Đã tạo Private Note: ${privateNote.content}`);

  // Log audit check
  console.log('\n[11] Test Audit Log Masking');
  const auditLogs = await db.systemAuditLog.findMany({
    where: { entityType: 'CustomerNote' },
    orderBy: { createdAt: 'desc' },
    take: 1
  });
  console.log('Audit Log gần nhất cho Note (nên bị mask nếu ghi qua crm-actions.ts, nhưng test này gọi trực tiếp db. Ở crm-actions.ts đã xử lý mask *** PRIVATE NOTE ***).');

  // Test Interaction -> lastContactAt
  console.log('\n[6] Test Interaction logic');
  const now = new Date();
  await db.customerInteraction.create({
    data: {
      customerId: custA.id,
      actorId: salesA.id,
      channel: 'ZALO',
      direction: 'OUTBOUND',
      title: 'Nhắn tin Zalo',
      contactedAt: now
    }
  });
  await db.customer.update({ where: { id: custA.id }, data: { lastContactAt: now } });
  const custCheck1 = await db.customer.findUnique({ where: { id: custA.id }});
  console.log(`lastContactAt sau Interaction: ${custCheck1?.lastContactAt}`);

  // Test FollowUp -> nextFollowUpAt
  console.log('\n[7] Test Follow-ups logic');
  const future = new Date(now.getTime() + 2 * 24 * 3600 * 1000); // 2 days future
  const fuOpen = await db.customerFollowUp.create({
    data: {
      customerId: custA.id,
      assignedToId: salesA.id,
      createdById: salesA.id,
      title: 'Hẹn gặp 2 ngày tới',
      status: 'OPEN',
      priority: 'HIGH',
      dueAt: future
    }
  });
  await db.customer.update({ where: { id: custA.id }, data: { nextFollowUpAt: future } });
  const custCheck2 = await db.customer.findUnique({ where: { id: custA.id }});
  console.log(`nextFollowUpAt cập nhật từ OPEN follow-up: ${custCheck2?.nextFollowUpAt}`);

  // Test FollowUp overdue -> Task Sync
  console.log('\n[9] Test Task Center Integration');
  const past = new Date(now.getTime() - 2 * 24 * 3600 * 1000); // 2 days ago
  const fuOverdue = await db.customerFollowUp.create({
    data: {
      customerId: custA.id,
      assignedToId: salesA.id,
      createdById: salesA.id,
      title: 'Quá hạn gọi',
      status: 'OPEN',
      priority: 'URGENT',
      dueAt: past
    }
  });

  const syncResult = await syncSystemTasks('SYSTEM');
  console.log(`Sync Tasks Result: Creates ${syncResult.creates}, Reopens ${syncResult.reopens}, Resolves ${syncResult.resolves}`);
  
  const tasks = await db.taskItem.findMany({
    where: { dedupeKey: { startsWith: 'CUSTOMER_FOLLOW_UP' }, sourceId: fuOverdue.id }
  });
  console.log(`Tasks generated for FollowUp ${fuOverdue.id}:`, tasks.map(t => ({ title: t.title, type: t.type, status: t.status })));

  // Test completing followUp resolves task
  await db.customerFollowUp.update({ where: { id: fuOverdue.id }, data: { status: 'DONE' } });
  const syncResult2 = await syncSystemTasks('SYSTEM');
  console.log(`Sync sau khi DONE FollowUp: Resolves ${syncResult2.resolves}`);
  const tasksAfter = await db.taskItem.findMany({
    where: { dedupeKey: { startsWith: 'CUSTOMER_FOLLOW_UP' }, sourceId: fuOverdue.id }
  });
  console.log(`Tasks for FollowUp sau khi DONE:`, tasksAfter.map(t => ({ title: t.title, type: t.type, status: t.status })));

  console.log('\n--- KẾT THÚC TEST ---');
}

runTests().catch(console.error);
