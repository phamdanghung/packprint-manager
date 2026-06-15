npx.cmd tsx scripts/seed-warehouse-zones.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx.cmd tsx scripts/backfill-inventory-warehouse-zones.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx.cmd tsx scripts/test-warehouse-zones.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx.cmd tsx scripts/test-material-code-generator.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx.cmd tsx scripts/test-inventory-parent-child.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npx.cmd tsx scripts/test-inventory-core.ts
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

npm.cmd run build
if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }

echo "ALL TESTS PASSED"
