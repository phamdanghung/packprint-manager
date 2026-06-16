const fs = require('fs');
const files = [
  'src/lib/inventory-actions.ts',
  'src/lib/mold-actions.ts',
  'src/lib/post-print-actions.ts',
  'src/lib/production-schedule-actions.ts'
];
files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');
  if (content.includes('revalidatePath(')) {
    if (!content.includes('safeRevalidatePath')) {
      content = "import { safeRevalidatePath } from '@/lib/safe-revalidate';\n" + content.replace(/import\s+\{([^}]*)revalidatePath([^}]*)\}\s+from\s+['"]next\/cache['"];?/g, 'import {$1$2} from "next/cache";');
    }
    content = content.replace(/(?<!safe)revalidatePath\(/g, 'safeRevalidatePath(');
    fs.writeFileSync(f, content, 'utf8');
    console.log('Fixed', f);
  }
});
