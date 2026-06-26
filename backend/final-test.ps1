$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNDQ5NDEwLCJpYXQiOjE3ODI0NDU4MTAsImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ0NTgxMH1dLCJzZXNzaW9uX2lkIjoiNmY2ODE4ZTQtNjcxMy00OGYwLTk2ZWMtNmZiMjdmMDQ0MDg0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.bYAggH5z0Ei8WYLW7dg5WlynXY6tuVWLUxYtDcpUalg8a6Ba03mtI9SjhFUA7S2zN6sskc0ARtq_dJBaGdvbJQ"
$savingsId = "4341c83c-726d-4cd4-9965-52f05a967a47"
$transactionId = "f9253ad1-aa8a-4d8d-ae10-bc648b137a72"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "STEP 1: PATCH /api/transactions/:id" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "URL: http://localhost:5000/api/transactions/$transactionId" -ForegroundColor Yellow
$patchBody = '{"amount": 150000}'
Write-Host "Body: $patchBody" -ForegroundColor Yellow

$patchResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Patch -Headers $headers -Body $patchBody -UseBasicParsing
$patchData = $patchResp.Content | ConvertFrom-Json

Write-Host "`n[SUCCESS] Response:" -ForegroundColor Green
Write-Host ($patchData | ConvertTo-Json -Depth 5)

$newAmount = $patchData.data.detail_transaksi.amount
$newSaldo = $patchData.data.saldo_sekarang

Write-Host "`n[INFO] New transaction amount: $newAmount" -ForegroundColor Yellow
Write-Host "[INFO] New savings balance: $newSaldo" -ForegroundColor Yellow

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "STEP 2: GET /api/transactions/:id" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$getResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Get -Headers $headers -UseBasicParsing
$getTxData = $getResp.Content | ConvertFrom-Json

Write-Host "[SUCCESS] Transaction Details:" -ForegroundColor Green
Write-Host ($getTxData | ConvertTo-Json -Depth 5)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "STEP 3: GET /api/savings/:id" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$savingsResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId" -Method Get -Headers $headers -UseBasicParsing
$savingsData = $savingsResp.Content | ConvertFrom-Json

Write-Host "[SUCCESS] Savings Details:" -ForegroundColor Green
Write-Host ($savingsData.data.savings[0] | ConvertTo-Json -Depth 5)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION - Cek 1: Amount berubah jadi 150000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$currentTxAmount = $getTxData.data.transaction.amount
if ($currentTxAmount -eq 150000) {
    Write-Host "[OK] Transaction amount = $currentTxAmount (CORRECT)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Transaction amount = $currentTxAmount (Expected 150000)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "VERIFICATION - Cek 2: Savings current_amount = 100000" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

$currentSavingsAmount = $savingsData.data.savings[0].current_amount
if ($currentSavingsAmount -eq 100000) {
    Write-Host "[OK] Savings current_amount = $currentSavingsAmount (CORRECT)" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Savings current_amount = $currentSavingsAmount (Expected 100000)" -ForegroundColor Red
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "ERROR TEST: Withdrawal 200000 (should fail)" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "URL: http://localhost:5000/api/transactions/$transactionId" -ForegroundColor Yellow
$errorBody = '{"type": "withdrawal", "amount": 200000}'
Write-Host "Body: $errorBody" -ForegroundColor Yellow

try {
    $errorResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Patch -Headers $headers -Body $errorBody -UseBasicParsing
    $errorData = $errorResp.Content | ConvertFrom-Json
    Write-Host "[FAIL] Should have failed but got 200 response!" -ForegroundColor Red
    Write-Host ($errorData | ConvertTo-Json -Depth 5)
} catch {
    $errorResp = $_.Exception.Response
    $errorStream = $errorResp.GetResponseStream()
    $streamReader = New-Object System.IO.StreamReader($errorStream)
    $errorContent = $streamReader.ReadToEnd()
    $streamReader.Close()
    
    Write-Host "[SUCCESS] Got expected error response:" -ForegroundColor Green
    $errorData = $errorContent | ConvertFrom-Json
    Write-Host ($errorData | ConvertTo-Json -Depth 3)
    
    if ($errorData.message -like "*tidak mencukupi*") {
        Write-Host "`n[OK] Error message sesuai: Saldo tabungan tidak mencukupi" -ForegroundColor Green
    } else {
        Write-Host "`n[INFO] Error message: $($errorData.message)" -ForegroundColor Yellow
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "TEST COMPLETED" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
