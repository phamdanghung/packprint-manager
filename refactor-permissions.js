const fs = require('fs');

function refactorInventoryOutboundActions() {
  const f = 'src/lib/inventory-outbound-actions.ts';
  let c = fs.readFileSync(f, 'utf8');

  // createOutboundReceiptCore
  c = c.replace(/export async function createOutboundReceipt\(input: CreateOutboundReceiptInput, bypassAuthRole\?: string\) \{/, 
`export async function createOutboundReceiptCore(input: CreateOutboundReceiptInput, user: any) {`);
  c = c.replace(/let user: any;\s*if \(bypassAuthRole\) \{\s*user = \{ id: 'test-admin', role: bypassAuthRole, name: 'Test User' \};\s*\} else \{\s*user = await checkInventoryAccess\(\);\s*\}/, 
``);

  // cancelOutboundReceiptCore
  c = c.replace(/export async function cancelOutboundReceipt\(receiptId: string, reason: string, bypassAuthRole\?: string\) \{/, 
`export async function cancelOutboundReceiptCore(receiptId: string, reason: string, user: any) {`);
  c = c.replace(/let user: any;\s*if \(bypassAuthRole\) \{\s*const realUser = await db\.user\.findFirst\(\{ where: \{ role: bypassAuthRole \} \}\);\s*user = realUser \|\| \{ id: 'test-admin', role: bypassAuthRole, name: 'Test User' \};\s*\} else \{\s*user = await checkInventoryAccess\(\);\s*\}/, 
``);

  // Add the wrapper actions
  c += `
export async function createOutboundReceipt(input: CreateOutboundReceiptInput) {
  const user = await checkInventoryAccess();
  return await createOutboundReceiptCore(input, user);
}

export async function cancelOutboundReceipt(receiptId: string, reason: string) {
  const user = await checkInventoryAccess();
  return await cancelOutboundReceiptCore(receiptId, reason, user);
}
`;

  fs.writeFileSync(f, c, 'utf8');
  console.log('Fixed inventory-outbound-actions.ts');
}

function refactorProductionMaterialIssueActions() {
  const f = 'src/lib/production-material-issue-actions.ts';
  let c = fs.readFileSync(f, 'utf8');

  // createProductionMaterialIssueReceiptCore
  c = c.replace(/export async function createProductionMaterialIssueReceipt\(input: \{[^}]*\}\[\];\s*\}, bypassAuthRole\?: string\) \{/m, 
    match => match.replace('createProductionMaterialIssueReceipt', 'createProductionMaterialIssueReceiptCore').replace(', bypassAuthRole?: string', ', user: any')
  );

  c = c.replace(/let user: any;\s*if \(bypassAuthRole\) \{\s*user = \{ id: 'test', role: bypassAuthRole, name: 'Test User' \};\s*\} else \{\s*user = await getCurrentUser\(\);\s*\}/, 
``);

  // Replace delegate call
  c = c.replace(/return await createOutboundReceipt\(\{([^}]+)\},\s*bypassAuthRole\);/g, 
`return await createOutboundReceiptCore({$1}, user);`);

  // Add wrapper
  // We need the input type for the wrapper
  c += `
export async function createProductionMaterialIssueReceipt(input: {
  productionJobId: string;
  receiverName?: string;
  receiverDepartment?: string;
  note?: string;
  items: {
    inventoryItemId: string;
    quantityBase: number;
    note?: string;
  }[];
}) {
  const user = await getCurrentUser();
  return await createProductionMaterialIssueReceiptCore(input, user);
}
`;

  fs.writeFileSync(f, c, 'utf8');
  console.log('Fixed production-material-issue-actions.ts');
}

refactorInventoryOutboundActions();
refactorProductionMaterialIssueActions();
