Write-Host "FIX KONG - Restart stack"
Write-Host "========================"
Write-Host ""

Write-Host "Step 1: Stop"
docker-compose down 2>&1 | Out-Null
Start-Sleep -Seconds 3

Write-Host "Step 2: Start"
docker-compose up -d 2>&1 | Select-String "OK|created|Started" | ForEach-Object { Write-Host "  $_" }
Start-Sleep -Seconds 40

Write-Host ""
Write-Host "Step 3: Check Kong"
docker ps | findstr "kong_CURRENT_APP"

Write-Host ""
Write-Host "Step 4: Test endpoint"
$pass = 0
for ($i=1; $i -le 5; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:55321/rest/v1/" -TimeoutSec 5 -ErrorAction Stop
        Write-Host "HTTP 200 OK"
        $pass = 1
        break
    } catch {
        Write-Host "Retry $i..."
        Start-Sleep -Seconds 2
    }
}

if ($pass -eq 1) {
    Write-Host "RESULT: FIXED" -ForegroundColor Green
} else {
    Write-Host "RESULT: STILL BROKEN" -ForegroundColor Red
}
