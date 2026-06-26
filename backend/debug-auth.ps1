$body = @{ email = 'testmanual123@test.com'; password = 'password123' } | ConvertTo-Json
$r = Invoke-WebRequest -Uri 'http://localhost:5000/api/auth/login' -Method POST -Headers @{ 'Content-Type' = 'application/json' } -Body $body -UseBasicParsing
Write-Host 'LOGIN STATUS:' $r.StatusCode
$content = $r.Content | ConvertFrom-Json
Write-Host 'TOKEN:' $content.data.token
$headers = @{ 'Authorization' = "Bearer $($content.data.token)"; 'Content-Type' = 'application/json' }
Write-Host 'HEADERS:'
$headers.GetEnumerator() | ForEach-Object { Write-Host $_.Key '=' $_.Value }
$r2 = Invoke-WebRequest -Uri 'http://localhost:5000/api/profile' -Method GET -Headers $headers -UseBasicParsing
Write-Host 'PROFILE STATUS:' $r2.StatusCode
Write-Host $r2.Content
