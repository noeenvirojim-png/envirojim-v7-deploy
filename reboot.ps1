$ErrorActionPreference = "SilentlyContinue"
Write-Host "REBOOT SUPABASE" -ForegroundColor Cyan
Write-Host "===============" -ForegroundColor Cyan
Write-Host ""

Write-Host "Step 1: Cleanup"
docker-compose down 2>&1 | Out-Null
$c = docker ps -a --filter "name=CURRENT_APP" -q
if ($c) { docker stop $c 2>&1 | Out-Null; docker rm $c 2>&1 | Out-Null }
$o = docker ps -a --filter "name=ENVIROJIM" -q
if ($o) { docker stop $o 2>&1 | Out-Null; docker rm $o 2>&1 | Out-Null }
Write-Host "Done`n"

Write-Host "Step 2: Config"
$cfg = @"
project_id = "CURRENT_APP"
[api]
port = 55321
external_url = "http://127.0.0.1:55321"
schemas = ["public"]
[db]
port = 55322
shadow_port = 55320
[auth]
site_url = "http://localhost:3000"
jwt_secret = "super-secret-jwt-key-with-at-least-32-characters-long"
enable_signup = true
[storage]
enabled = true
[analytics]
enabled = false
"@
Set-Content -Path "supabase/config.toml" -Value $cfg -Encoding UTF8
Write-Host "Done`n"

Write-Host "Step 3: Env"
if (Test-Path ".env.local") {
    $env = Get-Content ".env.local" -Raw
    $env = $env -replace "NEXT_PUBLIC_SUPABASE_URL=.*", "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321"
    $env = $env -replace "POSTGRES_URL=.*", "POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres"
    Set-Content -Path ".env.local" -Value $env -Encoding UTF8
    Write-Host "Done`n"
}

Write-Host "Step 4: Start"
docker-compose up -d 2>&1 | Select-String "OK|created|Started" | ForEach-Object { Write-Host "  $_" }
Start-Sleep -Seconds 35
Write-Host "Done`n"

Write-Host "Step 5: Test"
$pass = 0
for ($i=1; $i -le 5; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:55321/rest/v1/" -TimeoutSec 5 -ErrorAction Stop
        $pass = 1
        Write-Host "HTTP 200 - OK`n"
        break
    } catch {
        if ($i -lt 5) { Start-Sleep -Seconds 3 }
    }
}

if ($pass -eq 1) {
    Write-Host "RESULT: PASS" -ForegroundColor Green
    exit 0
} else {
    Write-Host "RESULT: ENDPOINT FAILED" -ForegroundColor Red
    exit 1
}
