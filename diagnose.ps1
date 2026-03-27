Write-Host "DIAGNOSTIC"
Write-Host "=========="
Write-Host ""

Write-Host "Containers:"
docker ps --filter "name=CURRENT_APP" --format "table {{.Names}}`t{{.Status}}"

Write-Host ""
Write-Host "Trying Kong inside container:"
docker exec supabase_kong_CURRENT_APP curl -s http://localhost:8000/rest/v1/ 2>&1 | Select-Object -First 3

Write-Host ""
Write-Host "Port 55321:"
netstat -ano | findstr "55321"

Write-Host ""
Write-Host "All Supabase CURRENT_APP containers:"
docker ps -a | findstr "CURRENT_APP"
