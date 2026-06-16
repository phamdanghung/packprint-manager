const fs = require('fs');

// 1. Fix production-material-issue-actions.ts
const pmiFile = 'src/lib/production-material-issue-actions.ts';
let pmiContent = fs.readFileSync(pmiFile, 'utf8');
pmiContent = pmiContent.replace(/}, bypassAuthRole\);/g, '}, user);');
fs.writeFileSync(pmiFile, pmiContent, 'utf8');
console.log('Fixed bypassAuthRole in production-material-issue-actions.ts');

// 2. Fix test scripts
const files = [
  'scripts/test-inventory-outbound.ts',
  'scripts/test-production-material-issue.ts'
];

files.forEach(f => {
  let c = fs.readFileSync(f, 'utf8');

  // Insert fetching users at the beginning of runTests
  if (!c.includes('const adminUser = await db.user.findFirst')) {
    c = c.replace(/async function runTests\(\) \{/, 
`async function runTests() {
  const adminUser = await db.user.findFirst({ where: { role: 'ADMIN' } }) || { id: 'admin', role: 'ADMIN', name: 'Admin' };
  const managerUser = await db.user.findFirst({ where: { role: 'MANAGER' } }) || { id: 'manager', role: 'MANAGER', name: 'Manager' };
  const productionUser = await db.user.findFirst({ where: { role: 'PRODUCTION' } }) || { id: 'production', role: 'PRODUCTION', name: 'Production' };
  const accountantUser = await db.user.findFirst({ where: { role: 'ACCOUNTANT' } }) || { id: 'accountant', role: 'ACCOUNTANT', name: 'Accountant' };
  const salesUser = await db.user.findFirst({ where: { role: 'SALES' } }) || { id: 'sales', role: 'SALES', name: 'Sales' };
`);
  }

  // Replace hardcoded mock user with the fetched user variable
  c = c.replace(/\{ id: 'test', role: 'ADMIN', name: 'Test' \}/g, 'adminUser');
  c = c.replace(/\{ id: 'test', role: 'MANAGER', name: 'Test' \}/g, 'managerUser');
  c = c.replace(/\{ id: 'test', role: 'PRODUCTION', name: 'Test' \}/g, 'productionUser');
  c = c.replace(/\{ id: 'test', role: 'ACCOUNTANT', name: 'Test' \}/g, 'accountantUser');
  c = c.replace(/\{ id: 'test', role: 'SALES', name: 'Test' \}/g, 'salesUser');

  fs.writeFileSync(f, c, 'utf8');
  console.log('Fixed', f);
});
