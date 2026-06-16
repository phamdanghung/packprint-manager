$ErrorActionPreference = "Continue"
Write-Host "Running test-production-material-issue.ts"
.\node_modules\.bin\tsx.cmd scripts\test-production-material-issue.ts
Write-Host "--------------------------------"
Write-Host "Running test-inventory-outbound.ts"
.\node_modules\.bin\tsx.cmd scripts\test-inventory-outbound.ts
Write-Host "--------------------------------"
Write-Host "Running test-inventory-inbound.ts"
.\node_modules\.bin\tsx.cmd scripts\test-inventory-inbound.ts
Write-Host "--------------------------------"
Write-Host "Running test-warehouse-zones.ts"
.\node_modules\.bin\tsx.cmd scripts\test-warehouse-zones.ts
Write-Host "--------------------------------"
Write-Host "Running test-material-code-generator.ts"
.\node_modules\.bin\tsx.cmd scripts\test-material-code-generator.ts
Write-Host "--------------------------------"
Write-Host "Running test-inventory-parent-child.ts"
.\node_modules\.bin\tsx.cmd scripts\test-inventory-parent-child.ts
Write-Host "--------------------------------"
Write-Host "Running test-inventory-core.ts"
.\node_modules\.bin\tsx.cmd scripts\test-inventory-core.ts
Write-Host "--------------------------------"
Write-Host "Running npm run build"
cmd.exe /c "npm run build"
