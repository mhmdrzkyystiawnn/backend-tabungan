$loginBody = '{
  "email": "ikiw@gmail.com",
  "password": "password2026"
}'

$headers = @{
    "Content-Type" = "application/json"
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/auth/login" -Method Post -Headers $headers -Body $loginBody -ErrorAction Stop
    $loginData = $response.Content | ConvertFrom-Json
    
    Write-Host "=== LOGIN RESPONSE ===" -ForegroundColor Green
    Write-Host ($loginData | ConvertTo-Json -Depth 10)
    
    if ($loginData.data -and $loginData.data.access_token) {
        Write-Host "`n=== ACCESS TOKEN ===" -ForegroundColor Cyan
        Write-Host $loginData.data.access_token
        Write-Host "`n=== USER ID ===" -ForegroundColor Cyan
        Write-Host $loginData.data.user.id
    }
} catch {
    Write-Host "ERROR: $_" -ForegroundColor Red
    Write-Host $_.Exception.Response.StatusCode
}
