const fs = require('fs');

function fixTestFile(f) {
  if (!fs.existsSync(f)) return;
  let c = fs.readFileSync(f, 'utf8');

  // Replace imports
  c = c.replace(/createOutboundReceipt,/g, 'createOutboundReceiptCore,');
  c = c.replace(/cancelOutboundReceipt,/g, 'cancelOutboundReceiptCore,');
  c = c.replace(/createProductionMaterialIssueReceipt,/g, 'createProductionMaterialIssueReceiptCore,');
  
  c = c.replace(/createOutboundReceipt\s*\}/g, 'createOutboundReceiptCore }');
  c = c.replace(/cancelOutboundReceipt\s*\}/g, 'cancelOutboundReceiptCore }');
  c = c.replace(/createProductionMaterialIssueReceipt\s*\}/g, 'createProductionMaterialIssueReceiptCore }');

  // Replace function calls
  // createOutboundReceipt(input, 'ADMIN') -> createOutboundReceiptCore(input, { id: 'test', role: 'ADMIN', name: 'Test' })
  c = c.replace(/createOutboundReceipt\(([^,]+),\s*['"]([A-Z]+)['"]\)/g, "createOutboundReceiptCore($1, { id: 'test', role: '$2', name: 'Test' })");
  
  // cancelOutboundReceipt(id, reason, 'ADMIN')
  c = c.replace(/cancelOutboundReceipt\(([^,]+),\s*([^,]+),\s*['"]([A-Z]+)['"]\)/g, "cancelOutboundReceiptCore($1, $2, { id: 'test', role: '$3', name: 'Test' })");

  // createProductionMaterialIssueReceipt(input, 'ADMIN')
  c = c.replace(/createProductionMaterialIssueReceipt\(([^,]+),\s*['"]([A-Z]+)['"]\)/g, "createProductionMaterialIssueReceiptCore($1, { id: 'test', role: '$2', name: 'Test' })");

  // In test-inventory-outbound.ts, the first arg might be a multi-line object
  // Let's use a simpler regex for the role string
  c = c.replace(/,\s*['"](ADMIN|MANAGER|ACCOUNTANT|PRODUCTION|SALES)['"]\)/g, ", { id: 'test', role: '$1', name: 'Test' })");

  c = c.replace(/createOutboundReceipt\(/g, "createOutboundReceiptCore(");
  c = c.replace(/cancelOutboundReceipt\(/g, "cancelOutboundReceiptCore(");
  c = c.replace(/createProductionMaterialIssueReceipt\(/g, "createProductionMaterialIssueReceiptCore(");

  fs.writeFileSync(f, c, 'utf8');
  console.log('Fixed', f);
}

const files = [
  'scripts/test-inventory-outbound.ts',
  'scripts/test-production-material-issue.ts'
];

files.forEach(fixTestFile);
