@echo off
chcp 65001 > nul
echo Running test-production-material-issue.ts... > C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-production-material-issue.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running test-inventory-outbound.ts... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-inventory-outbound.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running test-inventory-inbound.ts... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-inventory-inbound.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running test-warehouse-zones.ts... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-warehouse-zones.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running test-material-code-generator.ts... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-material-code-generator.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running test-inventory-parent-child.ts... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-inventory-parent-child.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running test-inventory-core.ts... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call .\node_modules\.bin\tsx.cmd scripts\test-inventory-core.ts >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1

echo Running npm run build... >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md
call npm run build >> C:\Users\admin\.gemini\antigravity\brain\ee2dc455-d7bb-4110-9123-d1c6fc2c3cf4\raw-logs.md 2>&1
