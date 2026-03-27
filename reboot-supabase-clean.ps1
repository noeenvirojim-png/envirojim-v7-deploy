$ErrorActionPreference = "SilentlyContinue"

Write-Host "[REBOOT] SUPABASE LOCAL CLEAN RESET POUR CURRENT_APP" -ForegroundColor Cyan
Write-Host "========================================================`n" -ForegroundColor Cyan

# ÉTAPE 1 - CLEANUP
Write-Host "[ÉTAPE 1] Cleanup containers" -ForegroundColor Yellow
docker-compose down 2>&1 | Out-Null
$current = docker ps -a --filter "name=CURRENT_APP" -q
if ($current) { docker stop $current 2>&1 | Out-Null; docker rm $current 2>&1 | Out-Null }
$old = docker ps -a --filter "name=ENVIROJIM_HANDOVER_PACKAGE" -q
if ($old) { docker stop $old 2>&1 | Out-Null; docker rm $old 2>&1 | Out-Null }
Write-Host "OK`n"

# ÉTAPE 2 - CONFIG
Write-Host "[ÉTAPE 2] Config supabase/config.toml" -ForegroundColor Yellow
$config = 'project_id = "CURRENT_APP"

[api]
port = 55321
external_url = "http://127.0.0.1:55321"
schemas = ["public"]
extra_search_path = ["public", "extensions"]

[db]
port = 55322
shadow_port = 55320

[auth]
site_url = "http://localhost:3000"
additional_redirect_urls = ["http://localhost:3000/auth/callback"]
jwt_secret = "super-secret-jwt-key-with-at-least-32-characters-long"
jwt_expiry = 3600
enable_signup = true

[storage]
enabled = true

[analytics]
enabled = false
'
Set-Content -Path "supabase/config.toml" -Value $config -Encoding UTF8
Write-Host "OK`n"

# ÉTAPE 3 - ENV
Write-Host "[ÉTAPE 3] Align .env.local" -ForegroundColor Yellow
if (Test-Path ".env.local") {
    $env = Get-Content ".env.local" -Raw
    $env = $env -replace "NEXT_PUBLIC_SUPABASE_URL=.*", "NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:55321"
    $env = $env -replace "POSTGRES_URL=.*", "POSTGRES_URL=postgresql://postgres:postgres@127.0.0.1:55322/postgres"
    Set-Content -Path ".env.local" -Value $env -Encoding UTF8
    Write-Host "OK`n"
} else {
    Write-Host "SKIP (not found)`n"
}

# ÉTAPE 4 - START
Write-Host "[ÉTAPE 4] Start Supabase stack" -ForegroundColor Yellow
docker-compose up -d 2>&1 | Select-String "✔|Created|Started" | ForEach-Object { Write-Host "  $_" }
Start-Sleep -Seconds 35
Write-Host "OK`n"

# ÉTAPE 5 - TEST
Write-Host "[ÉTAPE 5] Test REST endpoint" -ForegroundColor Yellow
$status = "FAIL"
$code = 0
for ($i=1; $i -le 5; $i++) {
    try {
        $r = Invoke-WebRequest -Uri "http://127.0.0.1:55321/rest/v1/" -Method GET -TimeoutSec 5 -ErrorAction Stop
        $code = $r.StatusCode
        $status = "PASS"
        break
    } catch {
        $code = $_.Exception.Response.StatusCode
        if ($code -eq $null) { $code = 0 }
        if ($i -lt 5) { Start-Sleep -Seconds 3 }
    }
}

Write-Host "HTTP $code - $status`n"

if ($status -eq "PASS") {
    Write-Host "[RESULT] CLEAN STACK READY" -ForegroundColor Green
    exit 0
} else {
    Write-Host "[RESULT] ENDPOINT UNREACHABLE" -ForegroundColor Red
    exit 1
}
