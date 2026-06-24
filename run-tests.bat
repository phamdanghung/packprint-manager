call npx tsx scripts/test-management-cost-drilldown.ts > test-drilldown.log 2>&1
call npx tsx scripts/test-management-cost-reports.ts > test-reports.log 2>&1
call npx tsx scripts/test-production-costing.ts > test-prod-costing.log 2>&1
call npx tsx scripts/test-production-additional-costing.ts > test-add-costing.log 2>&1
call npx tsx scripts/test-production-costing-ui.ts > test-prod-ui.log 2>&1
call npx tsx scripts/test-inventory-core.ts > test-inv-core.log 2>&1
call npm run build > build-log.log 2>&1
