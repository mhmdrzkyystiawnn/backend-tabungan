$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNDQ5NDEwLCJpYXQiOjE3ODI0NDU4MTAsImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ0NTgxMH1dLCJzZXNzaW9uX2lkIjoiNmY2ODE4ZTQtNjcxMy00OGYwLTk2ZWMtNmZiMjdmMDQ0MDg0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.bYAggH5z0Ei8WYLW7dg5WlynXY6tuVWLUxYtDcpUalg8a6Ba03mtI9SjhFUA7S2zN6sskc0ARtq_dJBaGdvbJQ"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Test Case 2: Delete withdrawal
Write-Host "`n=== TEST CASE 2: Delete Withdrawal ===" -ForegroundColor Cyan

# Get all transactions and find withdrawal
$txResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions?type=withdrawal" -Method Get -Headers $headers -UseBasicParsing
$txData = $txResp.Content | ConvertFrom-Json
$transactions = $txData.data.transactions

if ($transactions.Count -gt 0) {
    $withdrawalTx = $transactions[0]
    $transactionId = $withdrawalTx.id
    $savingsId = $withdrawalTx.savings_id
    $withdrawAmount = $withdrawalTx.amount
    
    Write-Host "Found withdrawal transaction: $transactionId" -ForegroundColor Yellow
    Write-Host "Amount: $withdrawAmount" -ForegroundColor Yellow
    Write-Host "Savings ID: $savingsId" -ForegroundColor Yellow
    
    # Get savings before
    $beforeResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId" -Method Get -Headers $headers -UseBasicParsing
    $beforeData = $beforeResp.Content | ConvertFrom-Json
    $saldoBefore = $beforeData.data.savings.current_amount
    
    Write-Host "Saldo before delete: $saldoBefore" -ForegroundColor Yellow
    
    # Delete transaction
    $deleteResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$transactionId" -Method Delete -Headers $headers -UseBasicParsing
    $deleteData = $deleteResp.Content | ConvertFrom-Json
    
    $expectedSaldo = $saldoBefore + $withdrawAmount
    $actualSaldo = $deleteData.data.saldo_sekarang
    
    Write-Host "Expected saldo after delete (restore withdrawal): $expectedSaldo" -ForegroundColor Yellow
    Write-Host "Actual saldo after delete: $actualSaldo" -ForegroundColor Yellow
    
    if ($expectedSaldo -eq $actualSaldo) {
        Write-Host "[OK] Withdrawal deletion correctly restored saldo" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Saldo mismatch" -ForegroundColor Red
    }
    
    # Verify with GET
    $afterResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId" -Method Get -Headers $headers -UseBasicParsing
    $afterData = $afterResp.Content | ConvertFrom-Json
    $saldoAfter = $afterData.data.savings.current_amount
    
    Write-Host "Saldo from GET after delete: $saldoAfter" -ForegroundColor Yellow
    
    if ($saldoAfter -eq $actualSaldo) {
        Write-Host "[OK] Saldo verified with GET" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Saldo mismatch with GET" -ForegroundColor Red
    }
} else {
    Write-Host "No withdrawal transactions found" -ForegroundColor Yellow
}

# Test Case 3: Delete transaction from different user (should fail)
Write-Host "`n=== TEST CASE 3: Delete Transaction from Different User ===" -ForegroundColor Cyan

# Get all transactions for current user
$txResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions" -Method Get -Headers $headers -UseBasicParsing
$txData = $txResp.Content | ConvertFrom-Json
$transactions = $txData.data.transactions

if ($transactions.Count -gt 0) {
    $txId = $transactions[0].id
    
    # Create a test token for different user (this is a fake token, should fail)
    $fakeToken = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJkaWZmZXJlbnQtdXNlci1pZCIsImF1ZCI6ImF1dGhlbnRpY2F0ZWQiLCJleHAiOjE3ODI0NDk0MTAsImlhdCI6MTc4MjQ0NTgxMCwiZW1haWwiOiJ0ZXN0QHRlc3QuY29tIn0.fake"
    $differentHeaders = @{
        "Authorization" = "Bearer $fakeToken"
        "Content-Type" = "application/json"
    }
    
    try {
        $errorResp = Invoke-WebRequest -Uri "http://localhost:5000/api/transactions/$txId" -Method Delete -Headers $differentHeaders -UseBasicParsing
        Write-Host "[FAIL] Should have been rejected but got 200" -ForegroundColor Red
    } catch {
        $statusCode = $_.Exception.Response.StatusCode
        
        if ($statusCode -eq 404 -or $statusCode -eq 401) {
            Write-Host "[OK] Request properly rejected with status $statusCode" -ForegroundColor Green
        } else {
            Write-Host "[FAIL] Unexpected status code: $statusCode" -ForegroundColor Red
        }
    }
}

Write-Host "`n=== ALL TESTS COMPLETE ===" -ForegroundColor Cyan
