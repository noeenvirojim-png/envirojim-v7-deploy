Write-Host "LOGS - Kong (API gateway)"
Write-Host "========================"
docker logs supabase_kong_CURRENT_APP 2>&1 | Select-Object -Last 30
