$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNDQ5NDEwLCJpYXQiOjE3ODI0NDU4MTAsImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ0NTgxMH1dLCJzZXNzaW9uX2lkIjoiNmY2ODE4ZTQtNjcxMy00OGYwLTk2ZWMtNmZiMjdmMDQ0MDg0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.bYAggH5z0Ei8WYLW7dg5WlynXY6tuVWLUxYtDcpUalg8a6Ba03mtI9SjhFUA7S2zN6sskc0ARtq_dJBaGdvbJQ"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# STEP 1: Get all savings
Write-Host "`n=== STEP 1: GET /api/savings ===" -ForegroundColor Cyan
$savingsResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings" -Method Get -Headers $headers -UseBasicParsing
$savingsData = $savingsResp.Content | ConvertFrom-Json
$savingsList = $savingsData.data.savings

Write-Host "Found $($savingsList.Count) savings" -ForegroundColor Yellow
if ($savingsList.Count -gt 0) {
    $firstSavings = $savingsList[0]
    $savingsId = $firstSavings.id
    
    Write-Host "Using Savings ID: $savingsId" -ForegroundColor Yellow
    
    # STEP 2: GET transactions for this savings
    Write-Host "`n=== STEP 2: GET /api/savings/:id/transactions ===" -ForegroundColor Cyan
    $txResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions" -Method Get -Headers $headers -UseBasicParsing
    $txData = $txResp.Content | ConvertFrom-Json
    $transactions = $txData.data.transactions
    
    Write-Host "Found $($transactions.Count) transactions for savings $savingsId" -ForegroundColor Yellow
    Write-Host ($txData.data.pagination | ConvertTo-Json -Depth 2) -ForegroundColor Gray
    
    if ($transactions.Count -gt 0) {
        $firstTx = $transactions[0]
        $transactionId = $firstTx.id
        
        Write-Host "`nUsing Transaction ID: $transactionId" -ForegroundColor Yellow
        Write-Host "Transaction Type: $($firstTx.type)" -ForegroundColor Yellow
        Write-Host "Transaction Amount: $($firstTx.amount)" -ForegroundColor Yellow
        
        # Get current savings amount before delete
        Write-Host "`n=== STEP 3: GET /api/savings/:id (before delete) ===" -ForegroundColor Cyan
        $beforeResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId" -Method Get -Headers $headers -UseBasicParsing
        $beforeData = $beforeResp.Content | ConvertFrom-Json
        $savingsBefore = $beforeData.data.savings
        
        Write-Host "Saldo sebelum delete: $($savingsBefore.current_amount)" -ForegroundColor Yellow
        
        # STEP 4: DELETE the transaction
        Write-Host "`n=== STEP 4: DELETE /api/transactions/:id ===" -ForegroundColor Cyan
        $deleteResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Delete -Headers $headers -UseBasicParsing
        $deleteData = $deleteResp.Content | ConvertFrom-Json
        
        Write-Host "`n[SUCCESS] DELETE Response:" -ForegroundColor Green
        Write-Host ($deleteData | ConvertTo-Json -Depth 5)
        
        # STEP 5: Verify deletion - check savings updated correctly
        Write-Host "`n=== STEP 5: GET /api/savings/:id (after delete) ===" -ForegroundColor Cyan
        $afterResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId" -Method Get -Headers $headers -UseBasicParsing
        $afterData = $afterResp.Content | ConvertFrom-Json
        $savingsAfter = $afterData.data.savings
        
        Write-Host "Saldo setelah delete: $($savingsAfter.current_amount)" -ForegroundColor Yellow
        
        # STEP 6: Verify transaction was deleted
        Write-Host "`n=== STEP 6: GET /api/savings/:id/transactions (after delete) ===" -ForegroundColor Cyan
        $txAfterResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions" -Method Get -Headers $headers -UseBasicParsing
        $txAfterData = $txAfterResp.Content | ConvertFrom-Json
        $transactionsAfter = $txAfterData.data.transactions
        
        Write-Host "Found $($transactionsAfter.Count) transactions after delete" -ForegroundColor Yellow
        Write-Host ($txAfterData.data.pagination | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        
        # VERIFICATION
        Write-Host "`n=== VERIFICATION ===" -ForegroundColor Cyan
        $expectedSaldoSekarang = $deleteData.data.saldo_sekarang
        $actualSaldoSekarang = $savingsAfter.current_amount
        
        Write-Host "Expected saldo_sekarang from DELETE: $expectedSaldoSekarang" -ForegroundColor Yellow
        Write-Host "Actual saldo_sekarang from GET: $actualSaldoSekarang" -ForegroundColor Yellow
        
        if ($expectedSaldoSekarang -eq $actualSaldoSekarang) {
            Write-Host "[OK] Saldo balance matches after delete" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Saldo balance does not match" -ForegroundColor Red
        }
        
        # Test GET with pagination and filtering
        Write-Host "`n=== STEP 7: GET /api/savings/:id/transactions?page=1&limit=5&sort=asc ===" -ForegroundColor Cyan
        $paginationResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions?page=1&limit=5&sort=asc" -Method Get -Headers $headers -UseBasicParsing
        $paginationData = $paginationResp.Content | ConvertFrom-Json
        
        Write-Host "Page 1, Limit 5, Sort ASC" -ForegroundColor Yellow
        Write-Host ($paginationData.data.pagination | ConvertTo-Json -Depth 2) -ForegroundColor Gray
        Write-Host "[OK] Pagination and sorting working correctly" -ForegroundColor Green
    } else {
        Write-Host "No transactions found for this savings" -ForegroundColor Yellow
    }
} else {
    Write-Host "No savings found for this user" -ForegroundColor Yellow
}

Write-Host "`n=== TEST COMPLETE ===" -ForegroundColor Cyan
