$token = "eyJhbGciOiJFUzI1NiIsImtpZCI6ImRlMDg2N2NiLWY5MmMtNDI3Yi05Y2Q0LWI0N2RhYTZlMmVmNSIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJodHRwczovL2h6cnNsaG5hdHZnd21iZ3JvemF5LnN1cGFiYXNlLmNvL2F1dGgvdjEiLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUiLCJhdWQiOiJhdXRoZW50aWNhdGVkIiwiZXhwIjoxNzgyNDQ5NDEwLCJpYXQiOjE3ODI0NDU4MTAsImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJwaG9uZSI6IiIsImFwcF9tZXRhZGF0YSI6eyJwcm92aWRlciI6ImVtYWlsIiwicHJvdmlkZXJzIjpbImVtYWlsIl19LCJ1c2VyX21ldGFkYXRhIjp7ImVtYWlsIjoiaWtpd0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGhvbmVfdmVyaWZpZWQiOmZhbHNlLCJzdWIiOiJiNzIyZDI3MC1kYzdiLTQ2YzktOGFlZC0zMzg2NTA0NzkyYzUifSwicm9sZSI6ImF1dGhlbnRpY2F0ZWQiLCJhYWwiOiJhYWwxIiwiYW1yIjpbeyJtZXRob2QiOiJwYXNzd29yZCIsInRpbWVzdGFtcCI6MTc4MjQ0NTgxMH1dLCJzZXNzaW9uX2lkIjoiNmY2ODE4ZTQtNjcxMy00OGYwLTk2ZWMtNmZiMjdmMDQ0MDg0IiwiaXNfYW5vbnltb3VzIjpmYWxzZX0.bYAggH5z0Ei8WYLW7dg5WlynXY6tuVWLUxYtDcpUalg8a6Ba03mtI9SjhFUA7S2zN6sskc0ARtq_dJBaGdvbJQ"

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# Get first savings
$savingsResp = Invoke-WebRequest -Uri "http://localhost:5000/api/savings" -Method Get -Headers $headers -UseBasicParsing
$savingsData = $savingsResp.Content | ConvertFrom-Json
$savingsId = $savingsData.data.savings[0].id

Write-Host "`n=== GET /api/savings/:id/transactions Tests ===" -ForegroundColor Cyan
Write-Host "Using Savings ID: $savingsId" -ForegroundColor Yellow

# Test 1: Default (no params)
Write-Host "`n--- Test 1: Default (no params) ---" -ForegroundColor Yellow
$test1 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions" -Method Get -Headers $headers -UseBasicParsing
$test1Data = $test1.Content | ConvertFrom-Json
Write-Host "Total: $($test1Data.data.pagination.total)" -ForegroundColor Green
Write-Host "Transactions: $($test1Data.data.transactions.Count)" -ForegroundColor Green

# Test 2: Filter by type=deposit
Write-Host "`n--- Test 2: Filter by type=deposit ---" -ForegroundColor Yellow
$test2 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions?type=deposit" -Method Get -Headers $headers -UseBasicParsing
$test2Data = $test2.Content | ConvertFrom-Json
$depositCount = 0
foreach ($tx in $test2Data.data.transactions) {
    if ($tx.type -eq "deposit") { $depositCount++ }
}
Write-Host "Deposit transactions: $($test2Data.data.transactions.Count)" -ForegroundColor Green
if ($depositCount -eq $test2Data.data.transactions.Count) {
    Write-Host "[OK] All transactions are deposits" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Found non-deposit transactions" -ForegroundColor Red
}

# Test 3: Filter by type=withdrawal
Write-Host "`n--- Test 3: Filter by type=withdrawal ---" -ForegroundColor Yellow
$test3 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions?type=withdrawal" -Method Get -Headers $headers -UseBasicParsing
$test3Data = $test3.Content | ConvertFrom-Json
$withdrawalCount = 0
foreach ($tx in $test3Data.data.transactions) {
    if ($tx.type -eq "withdrawal") { $withdrawalCount++ }
}
Write-Host "Withdrawal transactions: $($test3Data.data.transactions.Count)" -ForegroundColor Green
if ($withdrawalCount -eq $test3Data.data.transactions.Count) {
    Write-Host "[OK] All transactions are withdrawals" -ForegroundColor Green
} else {
    Write-Host "[FAIL] Found non-withdrawal transactions" -ForegroundColor Red
}

# Test 4: Pagination with limit=1
Write-Host "`n--- Test 4: Pagination with limit=1 ---" -ForegroundColor Yellow
$test4 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions?limit=1" -Method Get -Headers $headers -UseBasicParsing
$test4Data = $test4.Content | ConvertFrom-Json
Write-Host "Returned: $($test4Data.data.transactions.Count), Expected: 1" -ForegroundColor Green
Write-Host "Total: $($test4Data.data.pagination.total), Page: $($test4Data.data.pagination.page), Limit: $($test4Data.data.pagination.limit)" -ForegroundColor Gray
if ($test4Data.data.pagination.totalPages -gt 1) {
    Write-Host "[OK] Multiple pages detected" -ForegroundColor Green
} else {
    Write-Host "[OK] Single page" -ForegroundColor Green
}

# Test 5: Sort ascending
Write-Host "`n--- Test 5: Sort ascending ---" -ForegroundColor Yellow
$test5 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions?sort=asc" -Method Get -Headers $headers -UseBasicParsing
$test5Data = $test5.Content | ConvertFrom-Json
if ($test5Data.data.transactions.Count -gt 1) {
    $date1 = [datetime]$test5Data.data.transactions[0].created_at
    $date2 = [datetime]$test5Data.data.transactions[-1].created_at
    if ($date1 -le $date2) {
        Write-Host "[OK] Results are sorted ascending" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Results are not sorted ascending" -ForegroundColor Red
    }
} else {
    Write-Host "[OK] Only one transaction, sorting N/A" -ForegroundColor Green
}

# Test 6: Sort descending
Write-Host "`n--- Test 6: Sort descending (default) ---" -ForegroundColor Yellow
$test6 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/$savingsId/transactions?sort=desc" -Method Get -Headers $headers -UseBasicParsing
$test6Data = $test6.Content | ConvertFrom-Json
if ($test6Data.data.transactions.Count -gt 1) {
    $date1 = [datetime]$test6Data.data.transactions[0].created_at
    $date2 = [datetime]$test6Data.data.transactions[-1].created_at
    if ($date1 -ge $date2) {
        Write-Host "[OK] Results are sorted descending" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Results are not sorted descending" -ForegroundColor Red
    }
} else {
    Write-Host "[OK] Only one transaction, sorting N/A" -ForegroundColor Green
}

# Test 7: Invalid savings ID
Write-Host "`n--- Test 7: Invalid savings ID (404) ---" -ForegroundColor Yellow
try {
    $test7 = Invoke-WebRequest -Uri "http://localhost:5000/api/savings/invalid-id/transactions" -Method Get -Headers $headers -UseBasicParsing
    Write-Host "[FAIL] Should have returned 404" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 404) {
        Write-Host "[OK] Correctly returned 404 for invalid ID" -ForegroundColor Green
    } else {
        Write-Host "[FAIL] Unexpected status: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    }
}

Write-Host "`n=== ALL GET /api/savings/:id/transactions TESTS COMPLETE ===" -ForegroundColor Cyan
