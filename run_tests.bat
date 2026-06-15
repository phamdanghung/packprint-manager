@echo off
"C:\Program Files\nodejs\npx.cmd" tsx scripts/test-material-code-generator.ts > test1.log 2>&1
"C:\Program Files\nodejs\npx.cmd" tsx scripts/normalize-inventory-codes.ts --dry-run > test2.log 2>&1
"C:\Program Files\nodejs\npx.cmd" tsx scripts/test-inventory-parent-child.ts > test3.log 2>&1
"C:\Program Files\nodejs\npx.cmd" tsx scripts/test-inventory-core.ts > test4.log 2>&1
"C:\Program Files\nodejs\npm.cmd" run build > test5.log 2>&1
echo DONE
