import { PrismaClient } from '@prisma/client';

const db = new PrismaClient();

async function main() {
  console.log('Seeding mock Print Queue data...');

  // 1. Get or create a user for assignment
  let user = await db.user.findFirst({ where: { role: 'PRODUCTION' } });
  if (!user) {
    user = await db.user.create({
      data: {
        email: 'production_mock@packprint.vn',
        passwordHash: 'mock',
        name: 'Thợ in Mock',
        role: 'PRODUCTION',
        status: 'ACTIVE'
      }
    });
  }

  // 2. Create mock customer & order
  let customer = await db.customer.findFirst();
  if (!customer) {
    customer = await db.customer.create({
      data: {
        name: 'Công ty Mock',
        customerCode: 'MOCK-001',
        phone: '0123456789',
        status: 'ACTIVE'
      }
    });
  }

  const createOrder = async () => {
    return db.order.create({
      data: {
        orderCode: 'ORD-MOCK-' + Math.random().toString(36).substring(7),
        customerId: customer.id,
        status: 'PRODUCTION',
        totalAmount: 1000000,
        paidAmount: 0
      }
    });
  }

  let order1 = await createOrder();
  let order2 = await createOrder();
  let order3 = await createOrder();
  let order4 = await createOrder();

  // 3. Create mock production jobs
  const pJob1 = await db.productionJob.create({ data: { orderId: order1.id, jobCode: 'PROD-MOCK-1' + Date.now(), status: 'PENDING' } });
  const pJob2 = await db.productionJob.create({ data: { orderId: order2.id, jobCode: 'PROD-MOCK-2' + Date.now(), status: 'PENDING' } });
  const pJob3 = await db.productionJob.create({ data: { orderId: order3.id, jobCode: 'PROD-MOCK-3' + Date.now(), status: 'IN_PROGRESS' } });
  const pJob4 = await db.productionJob.create({ data: { orderId: order4.id, jobCode: 'PROD-MOCK-4' + Date.now(), status: 'IN_PROGRESS' } });

  // 4. Create mock materials
  const mat1 = await db.inventoryItem.create({
    data: {
      itemCode: 'MAT-MOCK-1-' + Date.now(), name: 'Decal nhựa', category: 'DECAL', unit: 'SHEET', status: 'ACTIVE',
      currentStock: 0, availableStock: 0, minStock: 1000
    }
  }); // For WAITING_MATERIAL

  const mat2 = await db.inventoryItem.create({
    data: {
      itemCode: 'MAT-MOCK-2-' + Date.now(), name: 'Giấy Couche 150', category: 'PAPER', unit: 'SHEET', status: 'ACTIVE',
      currentStock: 10000, availableStock: 10000, minStock: 1000
    }
  }); // For READY

  // 5. Machines
  const machines = await db.productionMachine.findMany({ where: { machineType: 'PRINTER' } });
  const m1 = machines[0];
  const m2 = machines[1];

  // 6. Create PrintQueueItems
  
  // Job 1: Unassigned & WAITING_FILE
  await db.printQueueItem.create({
    data: {
      productionJobId: pJob1.id,
      orderId: order1.id,
      totalSheets: 5000,
      status: 'WAITING_FILE',
      fileStatus: 'MISSING',
      materialStatus: 'READY',
      waitingReason: 'Chưa có file thiết kế in',
      priority: 'HIGH'
    }
  });

  // Job 2: Unassigned & WAITING_MATERIAL
  await db.printQueueItem.create({
    data: {
      productionJobId: pJob2.id,
      orderId: order2.id,
      materialId: mat1.id,
      totalSheets: 5000,
      status: 'WAITING_MATERIAL',
      fileStatus: 'READY',
      materialStatus: 'MISSING',
      waitingReason: `Thiếu vật tư. Cần 5000, Kho còn 0.`,
      priority: 'URGENT'
    }
  });

  // Job 3: Assigned to Machine 1, READY_TO_PRINT
  await db.printQueueItem.create({
    data: {
      productionJobId: pJob3.id,
      orderId: order3.id,
      machineId: m1?.id,
      materialId: mat2.id,
      totalSheets: 2000,
      status: 'READY_TO_PRINT',
      fileStatus: 'READY',
      materialStatus: 'READY',
      queuePosition: 1,
      priority: 'NORMAL'
    }
  });

  // Job 4: Assigned to Machine 1, PRINTING
  await db.printQueueItem.create({
    data: {
      productionJobId: pJob4.id,
      orderId: order4.id,
      machineId: m1?.id,
      materialId: mat2.id,
      totalSheets: 10000,
      printedSheets: 3500,
      status: 'PRINTING',
      fileStatus: 'READY',
      materialStatus: 'RESERVED',
      isMaterialReserved: true,
      assignedToId: user.id,
      queuePosition: 2,
      priority: 'NORMAL',
      actualStartAt: new Date()
    }
  });

  // Job 5: Unassigned & READY (WAITING_ASSIGNMENT)
  await db.printQueueItem.create({
    data: {
      productionJobId: pJob4.id, // Just reuse a production job or create a new one
      orderId: order4.id,
      materialId: mat2.id,
      totalSheets: 3000,
      status: 'WAITING_ASSIGNMENT',
      fileStatus: 'READY',
      materialStatus: 'READY',
      priority: 'NORMAL'
    }
  });

  console.log('✅ Mock Print Queue Data seeded!');
}

main()
  .catch(e => console.error(e))
  .finally(() => db.$disconnect());
