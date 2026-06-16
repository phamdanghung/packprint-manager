const fs = require('fs');
const files = [
  'src/lib/mold-actions.ts',
  'src/lib/post-print-actions.ts',
  'src/lib/production-schedule-actions.ts',
  'src/lib/inventory-actions.ts'
];
files.forEach(f => {
  if (fs.existsSync(f)) {
    let c = fs.readFileSync(f, 'utf8');
    if (c.includes("'use server';") && !c.startsWith("'use server';")) {
      c = c.replace(/'use server';\s*/g, '');
      c = "'use server';\n" + c;
      fs.writeFileSync(f, c, 'utf8');
      console.log('Fixed use server in', f);
    }
  }
});
