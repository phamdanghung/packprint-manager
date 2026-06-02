const fs = require('fs');
let src = fs.readFileSync('prisma/seed.ts', 'utf8');
const idx = src.indexOf('// 4. Tạo Orders');
if(idx > -1) {
  src = src.substring(0, idx) + `  console.log('Seed dữ liệu mẫu thành công!');\n}\n\nmain().catch((e) => {\n  console.error(e);\n  process.exit(1);\n}).finally(async () => {\n  await prisma.$disconnect();\n});\n`;
  fs.writeFileSync('prisma/seed.ts', src);
}
