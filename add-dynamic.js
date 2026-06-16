const fs = require('fs');
const files = [
  'src/app/dashboard/production/[id]/page.tsx',
  'src/app/dashboard/production/[id]/issue-materials/page.tsx',
  'src/app/dashboard/inventory/outbound/[id]/page.tsx',
  'src/app/dashboard/inventory/outbound/[id]/print/page.tsx'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    if (!c.includes('force-dynamic')) {
      c = "export const dynamic = 'force-dynamic';\n" + c;
      fs.writeFileSync(f, c);
      console.log('Fixed', f);
    }
  }
});
