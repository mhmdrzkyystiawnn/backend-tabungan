$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNDQ5NDEwLCJpYXQiOjE3ODI0NDU4MTAsImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ0NTgxMH1dLCJzZXNzaW9uX2lkIjoiNmY2ODE4ZTQtNjcxMy00OGYwLTk2ZWMtNmZiMjdmMDQ0MDg0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.bYAggH5z0Ei8WYLW7dg5WlynXY6tuVWLUxYtDcpUalg8a6Ba03mtI9SjhFUA7S2zN6sskc0ARtq_dJBaGdvbJQ"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "=== GET Savings Goals ===" -ForegroundColor Cyan
$resp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings" -Method Get -Headers $headers -UseBasicParsing
$savingsData = $resp.Content | ConvertFrom-Json
Write-Host ($savingsData | ConvertTo-Json -Depth 5)

$savings = $savingsData.data.savings
if ($savings.Length -gt 0) {
    $savingsId = $savings[0].id
    Write-Host "`n=== CREATE Transaction ===" -ForegroundColor Cyan
    $txBody = @{
        savings_id = $savingsId
        type = "deposit"
        amount = 50000
        description = "Test transaction"
    } | ConvertTo-Json
    
    Write-Host "Body: $txBody"
    $txResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions" -Method Post -Headers $headers -Body $txBody -UseBasicParsing
    $txData = $txResp.Content | ConvertFrom-Json
    Write-Host ($txData | ConvertTo-Json -Depth 5)
} else {
    Write-Host "No savings goals found!" -ForegroundColor Red
}
