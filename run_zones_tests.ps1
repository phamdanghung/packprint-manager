$ErrorActionPreference = "Stop"

Write-Host "Running seed-warehouse-zones.ts..."
.\node_modules\.bin\tsx.cmd scripts\seed-warehouse-zones.ts

Write-Host "Running backfill-inventory-warehouse-zones.ts..."
.\node_modules\.bin\tsx.cmd scripts\backfill-inventory-warehouse-zones.ts

Write-Host "Running test-warehouse-zones.ts..."
.\node_modules\.bin\tsx.cmd scripts\test-warehouse-zones.ts

Write-Host "Running test-material-code-generator.ts..."
.\node_modules\.bin\tsx.cmd scripts\test-material-code-generator.ts

Write-Host "Running test-inventory-parent-child.ts..."
.\node_modules\.bin\tsx.cmd scripts\test-inventory-parent-child.ts

Write-Host "Running test-inventory-core.ts..."
.\node_modules\.bin\tsx.cmd scripts\test-inventory-core.ts

Write-Host "Building project..."
cmd.exe /c "npm run build"
