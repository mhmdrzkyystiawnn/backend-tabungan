$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNDQ5NDEwLCJpYXQiOjE3ODI0NDU4MTAsImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ0NTgxMH1dLCJzZXNzaW9uX2lkIjoiNmY2ODE4ZTQtNjcxMy00OGYwLTk2ZWMtNmZiMjdmMDQ0MDg0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.bYAggH5z0Ei8WYLW7dg5WlynXY6tuVWLUxYtDcpUalg8a6Ba03mtI9SjhFUA7S2zN6sskc0ARtq_dJBaGdvbJQ"
$savingsId = $null
$transactionId = $null

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# STEP 1: Get list transactions
Write-Host "`n=== STEP 1: GET /api/transactions ===" -ForegroundColor Cyan
$resp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions" -Method Get -Headers $headers -UseBasicParsing
$data = $resp.Content | ConvertFrom-Json
$transactions = $data.data

Write-Host "Found $($transactions.Length) transactions" -ForegroundColor Yellow
if ($transactions.Length -gt 0) {
    $firstTx = $transactions[0]
    $transactionId = $firstTx.id
    $savingsId = $firstTx.savings_id
    $oldAmount = $firstTx.amount
    $oldType = $firstTx.type
    
    Write-Host "Using Transaction ID: $transactionId" -ForegroundColor Yellow
    Write-Host "Savings ID: $savingsId" -ForegroundColor Yellow
    Write-Host "Old Amount: $oldAmount" -ForegroundColor Yellow
    Write-Host "Old Type: $oldType" -ForegroundColor Yellow
    
    # STEP 2: PATCH transaction
    Write-Host "`n=== STEP 2: PATCH /api/transactions/:id ===" -ForegroundColor Cyan
    $patchBody = '{"amount": 150000}'
    Write-Host "Sending PATCH with body: $patchBody" -ForegroundColor Yellow
    
    $patchResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Patch -Headers $headers -Body $patchBody -UseBasicParsing
    $patchData = $patchResp.Content | ConvertFrom-Json
    
    Write-Host "`n[SUCCESS] PATCH Response:" -ForegroundColor Green
    Write-Host ($patchData | ConvertTo-Json -Depth 5)
    
    # STEP 3: GET transaction by ID
    Write-Host "`n=== STEP 3: GET /api/transactions/:id ===" -ForegroundColor Cyan
    $getResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Get -Headers $headers -UseBasicParsing
    $getTxData = $getResp.Content | ConvertFrom-Json
    
    Write-Host "`n[SUCCESS] Transaction Details:" -ForegroundColor Green
    Write-Host ($getTxData.transaction | ConvertTo-Json -Depth 3)
    
    # STEP 4: GET savings goal
    Write-Host "`n=== STEP 4: GET /api/savings/:id ===" -ForegroundColor Cyan
    $savingsResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId" -Method Get -Headers $headers -UseBasicParsing
    $savingsData = $savingsResp.Content | ConvertFrom-Json
    
    Write-Host "`n[SUCCESS] Savings Details:" -ForegroundColor Green
    Write-Host ($savingsData.savings_goal | ConvertTo-Json -Depth 3)
    
    Write-Host "`n=== VERIFICATION ===" -ForegroundColor Cyan
    $newAmount = $getTxData.transaction.amount
    $currentAmount = $savingsData.savings_goal.current_amount
    
    if ($newAmount -eq 150000) {
        Write-Host "[OK] Transaction amount berhasil diubah ke 150000" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Transaction amount tidak sesuai. Expected: 150000, Got: $newAmount" -ForegroundColor Red
    }
    
    if ($currentAmount -eq 100000) {
        Write-Host "[OK] Savings current_amount sesuai: 100000" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Savings current_amount tidak sesuai. Expected: 100000, Got: $currentAmount" -ForegroundColor Red
    }
    
    # STEP 5: Test error case - withdrawal 200000
    Write-Host "`n=== STEP 5: Test Error Case - PATCH dengan withdrawal 200000 ===" -ForegroundColor Cyan
    $errorBody = '{"type": "withdrawal", "amount": 200000}'
    Write-Host "Sending PATCH with body: $errorBody" -ForegroundColor Yellow
    
    try {
        $errorResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Patch -Headers $headers -Body $errorBody -UseBasicParsing
        $errorData = $errorResp.Content | ConvertFrom-Json
        Write-Host "[FAIL] Should have failed but got response:" -ForegroundColor Red
        Write-Host ($errorData | ConvertTo-Json -Depth 5)
    } catch {
        $errorResp = $_.Exception.Response
        $errorStream = $errorResp.GetResponseStream()
        $streamReader = New-Object System.IO.StreamReader($errorStream)
        $errorContent = $streamReader.ReadToEnd()
        $streamReader.Close()
        
        Write-Host "`n[SUCCESS] Error Response (Expected):" -ForegroundColor Green
        $errorData = $errorContent | ConvertFrom-Json
        Write-Host ($errorData | ConvertTo-Json -Depth 3)
        
        if ($errorData.message -like "*tidak mencukupi*") {
            Write-Host "`n[OK] Error message sesuai: Saldo tabungan tidak mencukupi" -ForegroundColor Green
        } else {
            Write-Host "`n[FAIL] Error message tidak sesuai" -ForegroundColor Red
        }
    }
}
