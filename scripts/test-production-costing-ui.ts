import { db } from '../src/lib/db';
import { 
  getProductionJobCosting, 
  getOrderProfitability, 
  createProductionCostLine, 
  cancelProductionCostLine 
} from '../src/lib/production-costing-actions';
import assert from 'assert';

// Deep scan helper to ensure sensitive keys DO NOT EXIST anywhere in the object tree
function assertKeysNotExist(obj: any, keys: string[], path = 'root') {
  if (obj === null || obj === undefined) return;
  if (Array.isArray(obj)) {
    obj.forEach((item, index) => assertKeysNotExist(item, keys, `${path}[${index}]`));
    return;
  }
  if (typeof obj === 'object') {
    for (const key of Object.keys(obj)) {
      if (keys.includes(key)) {
        throw new Error(`Security Violation: Sensitive key "${key}" leaked at ${path}.${key}`);
      }
      assertKeysNotExist(obj[key], keys, `${path}.${key}`);
    }
  }
}

async function main() {
  console.log('--- STARTING PHASE 22A.13 COSTING UI & RBAC TESTS ---');

  // 0. Cleanup
  await db.productionCostLine.deleteMany({
    where: { productionJob: { jobCode: { startsWith: 'TEST_22A13_' } } }
  });
  await db.productionJob.deleteMany({ where: { jobCode: { startsWith: 'TEST_22A13_' } } });
  await db.order.deleteMany({ where: { orderCode: { startsWith: 'TEST_22A13_' } } });
  await db.customer.deleteMany({ where: { name: { startsWith: 'TEST_22A13_' } } });

  // 1. Users setup
  const roles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
  const testUsers: Record<string, any> = {};

  for (const role of roles) {
    let user = await db.user.findFirst({ where: { role, status: 'ACTIVE' } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: `test_${role.toLowerCase()}_22a13@example.com`,
          name: `Test ${role}`,
          role: role,
          passwordHash: 'mock',
          status: 'ACTIVE'
        }
      });
    }
    testUsers[role] = user;
  }

  // 2. Data setup
  const customer = await db.customer.create({
    data: {
      name: 'TEST_22A13_CUSTOMER',
      customerCode: 'TEST_22A13_CUST_001',
      phone: `099${Date.now().toString().slice(-7)}`,
      address: 'Test',
      customerType: 'B2B',
      crmStatus: 'LEAD',
      createdById: testUsers['SALES'].id
    }
  });

  const order = await db.order.create({
    data: {
      orderCode: 'TEST_22A13_ORDER_001',
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 10000000,
      depositAmount: 5000000,
      paymentStatus: 'PARTIAL',
      dueDate: new Date()
    }
  });

  const job = await db.productionJob.create({
    data: {
      jobCode: 'TEST_22A13_JOB_001',
      orderId: order.id,
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      assignedProductionId: testUsers['PRODUCTION'].id
    }
  });

  console.log('✓ Setup test data successfully');

  // 3. Test Create & Validation
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  const createRes1 = await createProductionCostLine({
    productionJobId: job.id,
    category: 'LABOR',
    description: 'Test Labor Cost',
    quantity: 2,
    unitCost: 150000,
    totalCost: 99999999 // Client sends fake totalCost
  });
  
  assert(createRes1.success === true, 'Admin should create cost line successfully');
  assert(createRes1.data!.totalCost === 300000, 'Server MUST ignore fake totalCost and calculate itself');

  // Test strict cancel reason
  const cancelFail = await cancelProductionCostLine(createRes1.data!.id, '   ');
  assert(cancelFail.success === false, 'Server MUST reject empty cancelReason');
  
  const cancelRes = await cancelProductionCostLine(createRes1.data!.id, 'Valid Reason');
  assert(cancelRes.success === true, 'Cancel with reason MUST succeed');

  console.log('✓ Validation and Logic strictness passed');

  // Create an active line for cost testing
  await createProductionCostLine({
    productionJobId: job.id, category: 'OUTSOURCING', description: 'Active Cost', quantity: 1, unitCost: 500000
  });

  // 4. Test RBAC Hidden Roles (Deep Scan)
  const hiddenRoles = ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
  const sensitiveKeys = [
    'actualMaterialCost', 
    'actualAdditionalCost', 
    'actualProductionCost', 
    'grossProfit', 
    'grossMarginPercent', 
    'unitCost', 
    'totalCost',
    'costs',
    'profit'
  ];

  for (const role of hiddenRoles) {
    process.env.TEST_USER_ID = testUsers[role].id;
    
    // Create/Cancel block test
    const tryCreate = await createProductionCostLine({
      productionJobId: job.id, category: 'OTHER', description: 'Test', quantity: 1, unitCost: 10
    });
    assert(tryCreate.success === false, `${role} MUST NOT be able to create cost line`);
    
    const tryCancel = await cancelProductionCostLine(createRes1.data!.id, 'Test');
    assert(tryCancel.success === false, `${role} MUST NOT be able to cancel cost line`);

    // Response Leakage Test
    const jobRes = await getProductionJobCosting(job.id);
    assert(jobRes.success === true);
    assert(jobRes.data!.canViewCost === false);
    
    try {
      assertKeysNotExist(jobRes.data, sensitiveKeys, 'jobRes');
    } catch (e: any) {
      assert.fail(`[${role}] getProductionJobCosting failed deep scan: ${e.message}`);
    }

    const orderRes = await getOrderProfitability(order.id);
    assert(orderRes.success === true);
    assert(orderRes.data!.canViewCost === false);

    try {
      assertKeysNotExist(orderRes.data, sensitiveKeys, 'orderRes');
    } catch (e: any) {
      assert.fail(`[${role}] getOrderProfitability failed deep scan: ${e.message}`);
    }
  }

  console.log('✓ Hidden roles strict RBAC & Deep Scan passed');

  // 5. Test Profit calculation safe conditions (Division by zero check)
  const zeroOrder = await db.order.create({
    data: {
      orderCode: 'TEST_22A13_ORDER_ZERO',
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 0, // Zero revenue
      paymentStatus: 'UNPAID',
    }
  });
  
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  const zeroOrderRes = await getOrderProfitability(zeroOrder.id);
  assert(zeroOrderRes.success === true);
  // Should safely handle grossMarginPercent when revenue = 0
  assert(zeroOrderRes.data!.profit.grossMarginPercent === undefined, 'grossMarginPercent should be undefined/safe when revenue is 0');

  console.log('✓ Zero revenue safe calculation passed');

  // 6. Cleanup
  await db.productionCostLine.deleteMany({
    where: { productionJob: { jobCode: { startsWith: 'TEST_22A13_' } } }
  });
  await db.productionJob.deleteMany({ where: { jobCode: { startsWith: 'TEST_22A13_' } } });
  await db.order.deleteMany({ where: { orderCode: { startsWith: 'TEST_22A13_' } } });
  await db.customer.deleteMany({ where: { name: { startsWith: 'TEST_22A13_' } } });

  console.log('--- ALL PHASE 22A.13 TESTS PASSED ---');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
