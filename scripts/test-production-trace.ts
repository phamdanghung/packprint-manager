import { resolveSmartQR } from '../src/lib/smart-qr';
import { getProductionTrace, buildUnifiedProductionEvents } from '../src/lib/production-trace';

async function mockDbAndRunTests() {
  console.log('--- STARTING 18B TESTS ---');
  let passed = 0;
  let total = 27;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
      console.log(`[PASS] ${msg}`);
    } else {
      console.error(`[FAIL] ${msg}`);
    }
  }

  const mockUserAdmin = { id: 'admin1', role: 'ADMIN', email: 'admin@test.com', name: 'Admin' } as any;
  const mockUserSales = { id: 'sales1', role: 'SALES', email: 'sales1@test.com', name: 'Sales 1' } as any;
  const mockUserSalesOther = { id: 'sales2', role: 'SALES', email: 'sales2@test.com', name: 'Sales 2' } as any;
  const mockUserAcc = { id: 'acc1', role: 'ACCOUNTANT', email: 'acc@test.com', name: 'Accountant' } as any;
  const mockUserProd = { id: 'prod1', role: 'PRODUCTION', email: 'prod@test.com', name: 'Prod' } as any;

  const mockJobData = {
    id: 'job1',
    jobCode: 'JOB-001',
    qrToken: 'test-token',
    qrRevokedAt: null,
    orderId: 'order1',
    order: {
      id: 'order1',
      assignedSalesId: 'sales1',
      subtotal: 1000000,
      totalAmount: 1080000,
      items: [
        { id: 'item1', saleAmount: 500000, costAmount: 300000, materialCost: 100000 }
      ],
      designFiles: [
        { status: 'LOCKED_FOR_PRODUCTION' }
      ],
      payments: [
        { paymentStatus: 'PENDING' }
      ]
    },
    printQueueItems: [],
    operations: [],
    qrScanLogs: []
  };

  // Mock require cache to intercept db calls
  const mockDb = {
    productionJob: {
      findUnique: async (args: any) => {
        if (args.where.qrToken === 'test-token' || args.where.id === 'job1') return mockJobData;
        return null;
      }
    },
    deliveryJob: {
      findFirst: async () => null
    },
    productionOperationLog: {
      findMany: async () => []
    },
    productionQrScanLog: {
      create: async () => {} // ignore
    }
  };

  // Monkey patch db
  const { db } = require('../src/lib/db');
  Object.assign(db, mockDb);

  // TESTS FOR SMART QR
  // 1. ADMIN redirect
  let res = await resolveSmartQR('test-token', mockUserAdmin);
  assert(res.targetUrl === '/dashboard/production/job1/trace' && res.result === 'REDIRECT', 'ADMIN is redirected to trace');

  // 2. SALES authorized
  res = await resolveSmartQR('test-token', mockUserSales);
  assert(res.targetUrl === '/dashboard/production/job1/trace' && res.result === 'REDIRECT', 'SALES authorized is redirected to trace');

  // 3. SALES unauthorized
  res = await resolveSmartQR('test-token', mockUserSalesOther);
  assert(res.result === 'FORBIDDEN', 'SALES unauthorized gets FORBIDDEN');

  // 4. ACCOUNTANT redirect
  res = await resolveSmartQR('test-token', mockUserAcc);
  assert(res.targetUrl === '/dashboard/production/job1/trace' && res.result === 'REDIRECT', 'ACCOUNTANT is redirected to trace');

  // TESTS FOR getProductionTrace
  // 5. Normal fetch
  let traceRes = await getProductionTrace('job1', mockUserAdmin);
  assert(traceRes.success === true && traceRes.data?.id === 'job1', 'Trace fetch successful for ADMIN');

  // 6. SALES authorized fetch
  traceRes = await getProductionTrace('job1', mockUserSales);
  assert(traceRes.success === true, 'Trace fetch successful for assigned SALES');

  // 7. SALES unauthorized fetch
  traceRes = await getProductionTrace('job1', mockUserSalesOther);
  assert(traceRes.success === false && traceRes.error === 'Không có quyền truy cập Đơn hàng này', 'Trace fetch fails for unauthorized SALES');

  // 8. Masking for PRODUCTION
  traceRes = await getProductionTrace('job1', mockUserProd);
  assert(traceRes.success === true, 'Trace fetch successful for PRODUCTION');
  assert(traceRes.data!.order.subtotal === 0, 'PRODUCTION subtotal is masked');
  assert(traceRes.data!.order.totalAmount === 0, 'PRODUCTION totalAmount is masked');
  assert(traceRes.data!.order.items[0].saleAmount === 0, 'PRODUCTION item saleAmount is masked');
  assert(traceRes.data!.order.items[0].costAmount === 0, 'PRODUCTION item costAmount is masked');
  assert(traceRes.data!.order.items[0].materialCost === 0, 'PRODUCTION item materialCost is masked');
  assert(traceRes.data!.order.payments.length === 0, 'PRODUCTION payments are hidden');

  // TESTS FOR EVENT BUILDER
  const mockTraceData = {
    jobCode: 'JOB-001',
    createdAt: new Date('2023-01-02'),
    order: {
      orderCode: 'ORD-001',
      createdAt: new Date('2023-01-01'),
      customer: { name: 'Test Customer' },
      designFiles: [
        { fileName: 'f1.pdf', status: 'IN_PROGRESS', createdAt: new Date('2023-01-03') },
        { fileName: 'f2.pdf', status: 'APPROVED', createdAt: new Date('2023-01-04'), approvedAt: new Date('2023-01-05'), approvedById: 'u1' }
      ],
      payments: [
        { paymentCode: 'PAY-1', amount: 500, paymentStatus: 'PENDING', createdAt: new Date('2023-01-10') },
        { paymentCode: 'PAY-2', amount: 500, paymentStatus: 'COMPLETED', paidAt: new Date('2023-01-11') }
      ]
    },
    printQueueItems: [
      { machineCode: 'M1', startedAt: new Date('2023-01-06'), completedAt: new Date('2023-01-07') }
    ],
    operations: [
      { operationName: 'Lam', startedAt: new Date('2023-01-08'), completedAt: null }
    ],
    deliveryJob: {
      deliveryCode: 'DEL-1',
      createdAt: new Date('2023-01-09'),
      startedAt: new Date('2023-01-12'),
      deliveredAt: new Date('2023-01-13')
    }
  };

  const events = buildUnifiedProductionEvents(mockTraceData);
  
  // Verify events
  assert(events.some(e => e.type === 'ORDER' && e.status === 'DONE'), 'Event: Order created is DONE');
  assert(events.some(e => e.type === 'DESIGN' && e.status === 'IN_PROGRESS'), 'Event: Design f1 is IN_PROGRESS');
  assert(events.some(e => e.type === 'DESIGN' && e.status === 'DONE'), 'Event: Design f2 is DONE');
  assert(events.some(e => e.type === 'DESIGN_APPROVED' && e.status === 'DONE'), 'Event: Design approved is DONE');
  assert(events.some(e => e.type === 'PRODUCTION_CREATED' && e.status === 'DONE'), 'Event: Production created is DONE');
  assert(events.some(e => e.type === 'PRINT_STARTED' && e.status === 'IN_PROGRESS'), 'Event: Print started is IN_PROGRESS');
  assert(events.some(e => e.type === 'PRINT_COMPLETED' && e.status === 'DONE'), 'Event: Print completed is DONE');
  assert(events.some(e => e.type === 'OPERATION_STARTED' && e.status === 'IN_PROGRESS'), 'Event: Operation started is IN_PROGRESS');
  assert(!events.some(e => e.type === 'OPERATION_COMPLETED'), 'Event: Operation completed should not exist');
  assert(events.some(e => e.type === 'DELIVERY_CREATED' && e.status === 'DONE'), 'Event: Delivery created is DONE');
  assert(events.some(e => e.type === 'DELIVERY_STARTED' && e.status === 'IN_PROGRESS'), 'Event: Delivery started is IN_PROGRESS');
  assert(events.some(e => e.type === 'DELIVERY_COMPLETED' && e.status === 'DONE'), 'Event: Delivery completed is DONE');
  assert(events.some(e => e.type === 'PAYMENT' && e.status === 'IN_PROGRESS'), 'Event: Payment pending is IN_PROGRESS');
  assert(events.some(e => e.type === 'PAYMENT' && e.status === 'DONE'), 'Event: Payment completed is DONE');

  // Ensure chronological sort
  let isSorted = true;
  for (let i = 1; i < events.length; i++) {
    if (new Date(events[i-1].timestamp).getTime() > new Date(events[i].timestamp).getTime()) {
      isSorted = false;
      break;
    }
  }
  assert(isSorted, 'Events are chronologically sorted');

  console.log(`\nTotal: ${passed}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${0}`);
}

mockDbAndRunTests();
