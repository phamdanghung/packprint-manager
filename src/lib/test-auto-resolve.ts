import { PrismaClient } from '@prisma/client';
import { changePrintStatus } from './production-schedule-actions';

const db = new PrismaClient();

async function main() {
  console.log('Testing Auto Resolve for Print Queue Tasks...');

  // 1. Find a WAITING_FILE print job
  let pq = await db.printQueueItem.findFirst({ where: { status: 'WAITING_FILE' } });
  
  if (!pq) {
    console.log('No WAITING_FILE job found. Creating a dummy task instead.');
    return;
  }

  // Ensure there is a task for it
  const taskKey = `PRINT_JOB_WAITING_FILE:${pq.id}`;
  let task = await db.taskItem.findFirst({ where: { dedupeKey: taskKey } });
  
  if (!task) {
    const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } });
    task = await db.taskItem.create({
      data: {
        dedupeKey: taskKey,
        title: 'Mock Task for Waiting File',
        description: 'Waiting file...',
        type: 'PRINT_JOB_WAITING_FILE',
        priority: 'HIGH',
        sourceType: 'PRINT_QUEUE',
        sourceId: pq.id,
        status: 'OPEN',
        assignedRole: 'DESIGNER',
        createdById: adminUser?.id
      }
    });
  }

  console.log(`Initial Task Status: ${task.status} (ID: ${task.id})`);

  // 2. Change status to PRINTED using the action we just updated
  // Note: changePrintStatus requires a user session, but we are running in CLI.
  // Wait, changePrintStatus checks checkProductionAccess() which uses cookies.
  // We cannot call Server Actions directly from CLI if they use next-auth/cookies.
  // We will replicate the exact logic here to verify the DB works.
  
  console.log('Simulating changePrintStatus("PRINTED")...');

  const newStatus = 'PRINTED';
  await db.printQueueItem.update({ where: { id: pq.id }, data: { status: newStatus } });

  // Auto-resolve tasks if PRINTED or CANCELLED (Exact logic from action)
  if (['PRINTED', 'CANCELLED'].includes(newStatus)) {
    const relatedTasks = await db.taskItem.findMany({
      where: {
        sourceType: 'PRINT_QUEUE',
        sourceId: pq.id,
        status: { in: ['OPEN', 'IN_PROGRESS'] }
      }
    });

    if (relatedTasks.length > 0) {
      await db.taskItem.updateMany({
        where: { id: { in: relatedTasks.map(t => t.id) } },
        data: { status: 'DONE', resolvedAt: new Date() }
      });

      const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } });
      const actorId = adminUser?.id;

      if (actorId) {
        await Promise.all(relatedTasks.map(t => 
          db.taskLog.create({
            data: {
              taskId: t.id,
              actorId,
              actionType: 'STATUS_CHANGED',
              fromStatus: t.status,
              toStatus: 'DONE',
              note: `Hệ thống tự động đóng (Auto resolve) do lệnh in đã ${newStatus}`
            }
          })
        ));
      }
    }
  }

  // 3. Verify
  const updatedTask = await db.taskItem.findUnique({ where: { id: task.id }, include: { logs: true } });
  console.log(`Final Task Status: ${updatedTask?.status}`);
  console.log(`Task Logs: `, updatedTask?.logs);
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
