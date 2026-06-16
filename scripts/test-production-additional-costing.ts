import { db } from '../src/lib/db';
import { 
  getProductionJobCosting, 
  getOrderProfitability, 
  createProductionCostLine, 
  updateProductionCostLine, 
  cancelProductionCostLine 
} from '../src/lib/production-costing-actions';
import assert from 'assert';

async function main() {
  console.log('--- STARTING PHASE 22A.12 ADDITIONAL COSTING TESTS ---');

  // 0. Cleanup existing test data
  await db.productionCostLine.deleteMany({
    where: { productionJob: { jobCode: { startsWith: 'TEST_22A12_' } } }
  });
  await db.productionJob.deleteMany({ where: { jobCode: { startsWith: 'TEST_22A12_' } } });
  await db.order.deleteMany({ where: { orderCode: { startsWith: 'TEST_22A12_' } } });
  await db.customer.deleteMany({ where: { name: { startsWith: 'TEST_22A12_' } } });

  // 1. Check/Create Mock Users
  const roles = ['ADMIN', 'MANAGER', 'ACCOUNTANT', 'SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
  const testUsers: Record<string, any> = {};

  for (const role of roles) {
    let user = await db.user.findFirst({ where: { role, status: 'ACTIVE' } });
    if (!user) {
      user = await db.user.create({
        data: {
          email: `test_${role.toLowerCase()}_22a12@example.com`,
          name: `Test ${role}`,
          role: role,
          passwordHash: 'mock',
          status: 'ACTIVE'
        }
      });
    }
    testUsers[role] = user;
  }

  // 2. Create a Mock Customer and Order
  const customer = await db.customer.create({
    data: {
      name: 'TEST_22A12_CUSTOMER',
      customerCode: 'TEST_22A12_CUST_001',
      phone: `099${Date.now().toString().slice(-7)}`,
      address: 'Test',
      customerType: 'B2B',
      crmStatus: 'LEAD',
      createdById: testUsers['SALES'].id
    }
  });

  const order = await db.order.create({
    data: {
      orderCode: 'TEST_22A12_ORDER_001',
      customerId: customer.id,
      createdById: testUsers['SALES'].id,
      status: 'PRODUCTION',
      totalAmount: 10000000, // 10M
      depositAmount: 5000000,
      paymentStatus: 'PARTIAL',
      dueDate: new Date()
    }
  });

  // 3. Create a Production Job
  const job = await db.productionJob.create({
    data: {
      jobCode: 'TEST_22A12_JOB_001',
      orderId: order.id,
      status: 'IN_PROGRESS',
      priority: 'NORMAL',
      assignedProductionId: testUsers['PRODUCTION'].id
    }
  });

  console.log('✓ Setup test data successfully');

  // --- TESTS --- //

  // Test 1: Admin can create a valid cost line
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;

  const createRes1 = await createProductionCostLine({
    productionJobId: job.id,
    category: 'LABOR',
    description: 'Test Labor Cost',
    quantity: 2,
    unitCost: 150000
  });

  assert(createRes1.success === true, 'Admin should create cost line successfully');
  assert(createRes1.data!.totalCost === 300000, 'Server must calculate totalCost = quantity * unitCost (2 * 150000)');

  // Test 2: Reject invalid quantity
  const createResInvalidQty = await createProductionCostLine({
    productionJobId: job.id,
    category: 'LABOR',
    description: 'Invalid Qty',
    quantity: 0,
    unitCost: 1000
  });
  assert(createResInvalidQty.success === false, 'Should reject quantity <= 0');

  // Test 3: Reject invalid unit cost
  const createResInvalidCost = await createProductionCostLine({
    productionJobId: job.id,
    category: 'LABOR',
    description: 'Invalid Cost',
    quantity: 1,
    unitCost: -100
  });
  assert(createResInvalidCost.success === false, 'Should reject unitCost < 0');

  // Test 4: Manager can create another cost line (Outsourcing)
  process.env.TEST_USER_ID = testUsers['MANAGER'].id;
  const createRes2 = await createProductionCostLine({
    productionJobId: job.id,
    category: 'OUTSOURCING',
    description: 'Bế màng',
    quantity: 1000,
    unitCost: 200,
    vendorName: 'Đối tác bế'
  });
  assert(createRes2.success === true, 'Manager can create cost line');
  assert(createRes2.data!.totalCost === 200000, 'totalCost is 200k');

  // Test 5: Accountant can update a cost line
  process.env.TEST_USER_ID = testUsers['ACCOUNTANT'].id;
  const updateRes1 = await updateProductionCostLine(createRes2.data!.id, {
    quantity: 1500, // updating quantity
    unitCost: 200
  });
  assert(updateRes1.success === true, 'Accountant can update cost line');
  assert(updateRes1.data!.totalCost === 300000, 'totalCost is recalculated to 300k');

  // Test 6: Cost visibility for authorized roles
  // current costs: 300k (Labor) + 300k (Outsourcing) = 600k total additional cost
  const jobCostingAdmin = await getProductionJobCosting(job.id);
  assert(jobCostingAdmin.success === true);
  assert(jobCostingAdmin.data?.canViewCost === true);
  assert(jobCostingAdmin.data?.actualAdditionalCost === 600000, 'actualAdditionalCost = 600k');
  assert(jobCostingAdmin.data?.actualProductionCost === 600000, 'actualProductionCost = 600k (material = 0)');
  
  const orderProfitAdmin = await getOrderProfitability(order.id);
  assert(orderProfitAdmin.success === true);
  assert(orderProfitAdmin.data?.costs?.actualAdditionalCost === 600000);
  assert(orderProfitAdmin.data?.profit?.grossProfit === 10000000 - 600000, 'grossProfit = 10M - 600k = 9.4M');
  
  console.log('✓ Calculation logic works perfectly');

  // Test 7: Cancel a cost line
  process.env.TEST_USER_ID = testUsers['ADMIN'].id;
  const cancelRes = await cancelProductionCostLine(createRes1.data!.id, 'Sai sót nhập liệu');
  assert(cancelRes.success === true, 'Admin can cancel cost line');
  assert(cancelRes.data!.status === 'CANCELLED', 'Status changed to CANCELLED');
  assert(cancelRes.data!.cancelledById === testUsers['ADMIN'].id, 'Audit cancelledById is set');
  assert(cancelRes.data!.cancelReason === 'Sai sót nhập liệu', 'Audit cancelReason is set');

  const checkDb = await db.productionCostLine.findUnique({ where: { id: createRes1.data!.id } });
  assert(checkDb !== null, 'Cancelled line must NOT be hard deleted');

  // Test 8: Cancelled line is not counted in costing
  const jobCostingAdmin2 = await getProductionJobCosting(job.id);
  assert(jobCostingAdmin2.data?.actualAdditionalCost === 300000, 'actualAdditionalCost is now only 300k (cancelled line removed from sum)');

  console.log('✓ Cancellation logic works perfectly');

  // Test 9: Update on Cancelled line is rejected
  const updateCancelled = await updateProductionCostLine(createRes1.data!.id, { quantity: 5 });
  assert(updateCancelled.success === false, 'Cannot update a cancelled line');

  // Test 10: Strict RBAC check
  const nonAuthorizedRoles = ['SALES', 'PRODUCTION', 'DESIGNER', 'DELIVERY'];
  
  for (const role of nonAuthorizedRoles) {
    process.env.TEST_USER_ID = testUsers[role].id;
    
    // Try to create
    const tryCreate = await createProductionCostLine({
      productionJobId: job.id, category: 'OTHER', description: 'Test', quantity: 1, unitCost: 10
    });
    assert(tryCreate.success === false, `${role} cannot create cost line`);

    // Try to view costing
    const costing = await getProductionJobCosting(job.id);
    assert(costing.data?.canViewCost === false, `${role} canViewCost = false`);
    
    const obj = costing.data;
    assert(obj.actualMaterialCost === undefined, `${role} should not see actualMaterialCost`);
    assert(obj.actualAdditionalCost === undefined, `${role} should not see actualAdditionalCost`);
    assert(obj.actualProductionCost === undefined, `${role} should not see actualProductionCost`);
    assert(obj.materialCostLines === undefined, `${role} should not see materialCostLines`);
    assert(obj.additionalCostLines === undefined, `${role} should not see additionalCostLines`);

    const profitability = await getOrderProfitability(order.id);
    assert(profitability.data?.canViewCost === false);
    
    const pObj = profitability.data;
    assert(pObj.costs === undefined, `${role} should not see costs object`);
    assert(pObj.profit === undefined, `${role} should not see profit object`);
    assert(pObj.grossProfit === undefined, `${role} should not see grossProfit`);
    assert(pObj.grossMarginPercent === undefined, `${role} should not see grossMarginPercent`);
    assert(pObj.productionJobs[0].actualAdditionalCost === undefined, `${role} should not see production job nested additional cost`);
    assert(pObj.productionJobs[0].actualProductionCost === undefined, `${role} should not see production job nested production cost`);
  }

  console.log('✓ Strict RBAC & Sanitization works perfectly');

  // Cleanup TEST_22A12_ prefixed data
  await db.productionCostLine.deleteMany({
    where: { productionJob: { jobCode: { startsWith: 'TEST_22A12_' } } }
  });
  await db.productionJob.deleteMany({ where: { jobCode: { startsWith: 'TEST_22A12_' } } });
  await db.order.deleteMany({ where: { orderCode: { startsWith: 'TEST_22A12_' } } });
  await db.customer.deleteMany({ where: { name: { startsWith: 'TEST_22A12_' } } });

  console.log('✓ Cleanup successful');
  console.log('--- ALL TESTS PASSED ---');
  process.exit(0);
}

main().catch(e => {
  console.error(e);
  process.exit(1);
});
