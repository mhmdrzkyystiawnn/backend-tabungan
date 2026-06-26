# Comprehensive API Test Checklist
# Tests all endpoints systematically

$baseUrl = "http://localhost:5000/api"
$testLog = @()
$token = $null
$refreshToken = $null
$savingsId = $null
$transactionId = $null

function LogTest {
    param(
        [string]$category,
        [string]$endpoint,
        [string]$method,
        [string]$status,
        [string]$message
    )
    
    $script:testLog += @{
        Category = $category
        Endpoint = $endpoint
        Method = $method
        Status = $status
        Message = $message
        Timestamp = Get-Date -Format "HH:mm:ss"
    }
    
    $icon = if ($status -eq "PASS") { "[OK]" } else { "[FAIL]" }
    $color = if ($status -eq "PASS") { "Green" } else { "Red" }
    
    Write-Host "$icon $category >> $method $endpoint >> $message" -ForegroundColor $color
}

Write-Host "`n========== COMPREHENSIVE API TEST SUITE ==========" -ForegroundColor Cyan
Write-Host "Start Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl`n" -ForegroundColor Cyan

# =====================================================================
# SECTION 1: AUTH
# =====================================================================

Write-Host "`n### SECTION 1: AUTH ###`n" -ForegroundColor Yellow

$testEmail = "test_$(Get-Random)@test.com"
$testPassword = "password123"
$newPassword = "newpass123"

# 1.1 Register
Write-Host "1.1 Register" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/register" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{
            email = $testEmail
            password = $testPassword
        } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "AUTH" "/auth/register" "POST" "PASS" "Email: $testEmail"
} catch {
    LogTest "AUTH" "/auth/register" "POST" "FAIL" "$($_.Exception.Message)"
}

# 1.2 Login
Write-Host "1.2 Login" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{
            email = $testEmail
            password = $testPassword
        } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    $script:token = $data.data.token
    $script:refreshToken = $data.data.refresh_token
    LogTest "AUTH" "/auth/login" "POST" "PASS" "Token acquired"
} catch {
    LogTest "AUTH" "/auth/login" "POST" "FAIL" "$($_.Exception.Message)"
    Write-Host "Cannot continue without token" -ForegroundColor Red
    exit 1
}

if (-not $token) {
    Write-Host "ERROR: No token acquired" -ForegroundColor Red
    exit 1
}

$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

# 1.3 Refresh Token
Write-Host "1.3 Refresh Token" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/refresh" -Method POST `
        -Headers $headers `
        -Body (@{ refresh_token = $refreshToken } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    if ($data.data.access_token) {
        $script:token = $data.data.access_token
        $headers["Authorization"] = "Bearer $token"
    }
    LogTest "AUTH" "/auth/refresh" "POST" "PASS" "New token acquired"
} catch {
    LogTest "AUTH" "/auth/refresh" "POST" "FAIL" "$($_.Exception.Message)"
}

# =====================================================================
# SECTION 2: PROFILE
# =====================================================================

Write-Host "`n### SECTION 2: PROFILE ###`n" -ForegroundColor Yellow

# 2.1 Get Profile
Write-Host "2.1 Get Profile" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/profile" -Method GET `
        -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "PROFILE" "/profile" "GET" "PASS" "User: $($data.data.user.email)"
} catch {
    LogTest "PROFILE" "/profile" "GET" "FAIL" "$($_.Exception.Message)"
}

# 2.2 Update Profile
Write-Host "2.2 Update Profile" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/profile" -Method PUT `
        -Headers $headers `
        -Body (@{
            name = "Test User"
            username = "testuser"
        } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "PROFILE" "/profile" "PUT" "PASS" "Profile updated"
} catch {
    LogTest "PROFILE" "/profile" "PUT" "FAIL" "$($_.Exception.Message)"
}

# 2.3 Change Password
Write-Host "2.3 Change Password" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/profile/password" -Method PUT `
        -Headers $headers `
        -Body (@{
            old_password = $testPassword
            new_password = $newPassword
        } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "PROFILE" "/profile/password" "PUT" "PASS" "Password changed"
} catch {
    LogTest "PROFILE" "/profile/password" "PUT" "FAIL" "$($_.Exception.Message)"
}

# 2.4 Re-login after Password Change
Write-Host "2.4 Re-login after password change" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/login" -Method POST `
        -Headers @{"Content-Type"="application/json"} `
        -Body (@{
            email = $testEmail
            password = $newPassword
        } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    $script:token = $data.data.token
    $script:refreshToken = $data.data.refresh_token
    $headers["Authorization"] = "Bearer $token"
    LogTest "AUTH" "/auth/login" "POST" "PASS" "Re-login successful"
} catch {
    LogTest "AUTH" "/auth/login" "POST" "FAIL" "$($_.Exception.Message)"
    Write-Host "Cannot continue without valid token after password change" -ForegroundColor Red
    exit 1
}

# =====================================================================
# SECTION 3: SAVINGS
# =====================================================================

Write-Host "`n### SECTION 3: SAVINGS ###`n" -ForegroundColor Yellow

# 3.1 Create Savings
Write-Host "3.1 Create Savings" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/savings" -Method POST `
        -Headers $headers `
        -Body (@{
            name = "Liburan $(Get-Random)"
            target_amount = 5000000
        } | ConvertTo-Json) -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    $script:savingsId = $data.data.savings.id
    LogTest "SAVINGS" "/savings" "POST" "PASS" "Created: $($data.data.savings.name)"
} catch {
    LogTest "SAVINGS" "/savings" "POST" "FAIL" "$($_.Exception.Message)"
}

# 3.2 Get All Savings
Write-Host "3.2 Get All Savings" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/savings" -Method GET `
        -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "SAVINGS" "/savings" "GET" "PASS" "Count: $($data.data.savings.Count)"
} catch {
    LogTest "SAVINGS" "/savings" "GET" "FAIL" "$($_.Exception.Message)"
}

# 3.3 Search Savings
Write-Host "3.3 Search Savings" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/savings?search=Liburan" -Method GET `
        -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "SAVINGS" "/savings?search=..." "GET" "PASS" "Found: $($data.data.savings.Count)"
} catch {
    LogTest "SAVINGS" "/savings?search=..." "GET" "FAIL" "$($_.Exception.Message)"
}

# 3.4 Pagination
Write-Host "3.4 Pagination" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/savings?page=1&limit=5" -Method GET `
        -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    $page = $data.data.pagination.page
    $total = $data.data.pagination.totalPages
    LogTest "SAVINGS" "/savings?page=1&limit=5" "GET" "PASS" "Page $page/$total"
} catch {
    LogTest "SAVINGS" "/savings?page=1&limit=5" "GET" "FAIL" "$($_.Exception.Message)"
}

# 3.5 Get Savings Detail
Write-Host "3.5 Get Savings Detail" -ForegroundColor Cyan
if ($savingsId) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/savings/$savingsId" -Method GET `
            -Headers $headers -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        LogTest "SAVINGS" "/savings/:id" "GET" "PASS" "Name: $($data.data.savings.name)"
    } catch {
        LogTest "SAVINGS" "/savings/:id" "GET" "FAIL" "$($_.Exception.Message)"
    }
}

# 3.6 Update Savings
Write-Host "3.6 Update Savings" -ForegroundColor Cyan
if ($savingsId) {
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/savings/$savingsId" -Method PUT `
            -Headers $headers `
            -Body (@{
                name = "Liburan Updated $(Get-Random)"
                target_amount = 6000000
            } | ConvertTo-Json) -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        LogTest "SAVINGS" "/savings/:id" "PUT" "PASS" "Updated: $($data.data.savings.name)"
    } catch {
        LogTest "SAVINGS" "/savings/:id" "PUT" "FAIL" "$($_.Exception.Message)"
    }
}

# =====================================================================
# SECTION 4: TRANSACTIONS
# =====================================================================

Write-Host "`n### SECTION 4: TRANSACTIONS ###`n" -ForegroundColor Yellow

if ($savingsId) {
    # 4.1 Create Transaction (Deposit)
    Write-Host "4.1 Create Transaction (Deposit)" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/transactions" -Method POST `
            -Headers $headers `
            -Body (@{
                savings_id = $savingsId
                type = "deposit"
                amount = 500000
                description = "Monthly savings"
            } | ConvertTo-Json) -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        $script:transactionId = $data.data.detail_transaksi.id
        LogTest "TRANSACTIONS" "/transactions" "POST" "PASS" "Amount: $($data.data.detail_transaksi.amount)"
    } catch {
        LogTest "TRANSACTIONS" "/transactions" "POST" "FAIL" "$($_.Exception.Message)"
    }

    # 4.2 Get All Transactions
    Write-Host "4.2 Get All Transactions" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/transactions" -Method GET `
            -Headers $headers -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        LogTest "TRANSACTIONS" "/transactions" "GET" "PASS" "Count: $($data.data.transactions.Count)"
    } catch {
        LogTest "TRANSACTIONS" "/transactions" "GET" "FAIL" "$($_.Exception.Message)"
    }

    # 4.3 Pagination
    Write-Host "4.3 Pagination" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/transactions?page=1&limit=5" -Method GET `
            -Headers $headers -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        $page = $data.data.pagination.page
        $total = $data.data.pagination.totalPages
        LogTest "TRANSACTIONS" "/transactions?page=1&limit=5" "GET" "PASS" "Page $page/$total"
    } catch {
        LogTest "TRANSACTIONS" "/transactions?page=1&limit=5" "GET" "FAIL" "$($_.Exception.Message)"
    }

    # 4.4 Search Transactions
    Write-Host "4.4 Search Transactions" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/transactions?search=Monthly" -Method GET `
            -Headers $headers -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        LogTest "TRANSACTIONS" "/transactions?search=..." "GET" "PASS" "Found: $($data.data.transactions.Count)"
    } catch {
        LogTest "TRANSACTIONS" "/transactions?search=..." "GET" "FAIL" "$($_.Exception.Message)"
    }

    # 4.5 Get Transaction Detail
    Write-Host "4.5 Get Transaction Detail" -ForegroundColor Cyan
    if ($transactionId) {
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/transactions/$transactionId" -Method GET `
                -Headers $headers -UseBasicParsing
            $data = $response.Content | ConvertFrom-Json
            LogTest "TRANSACTIONS" "/transactions/:id" "GET" "PASS" "Type: $($data.data.transaction.type)"
        } catch {
            LogTest "TRANSACTIONS" "/transactions/:id" "GET" "FAIL" "$($_.Exception.Message)"
        }
    }

    # 4.6 Update Transaction
    Write-Host "4.6 Update Transaction" -ForegroundColor Cyan
    if ($transactionId) {
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/transactions/$transactionId" -Method PATCH `
                -Headers $headers `
                -Body (@{
                    amount = 600000
                    description = "Updated savings"
                } | ConvertTo-Json) -UseBasicParsing
            $data = $response.Content | ConvertFrom-Json
            LogTest "TRANSACTIONS" "/transactions/:id" "PATCH" "PASS" "Amount: $($data.data.detail_transaksi.amount)"
        } catch {
            LogTest "TRANSACTIONS" "/transactions/:id" "PATCH" "FAIL" "$($_.Exception.Message)"
        }
    }

    # 4.7 Get Savings Transactions
    Write-Host "4.7 Get Savings Transactions" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/savings/$savingsId/transactions" -Method GET `
            -Headers $headers -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        LogTest "TRANSACTIONS" "/savings/:id/transactions" "GET" "PASS" "Count: $($data.data.transactions.Count)"
    } catch {
        LogTest "TRANSACTIONS" "/savings/:id/transactions" "GET" "FAIL" "$($_.Exception.Message)"
    }

    # 4.8 Delete Transaction
    Write-Host "4.8 Delete Transaction" -ForegroundColor Cyan
    if ($transactionId) {
        try {
            $response = Invoke-WebRequest -Uri "$baseUrl/transactions/$transactionId" -Method DELETE `
                -Headers $headers -UseBasicParsing
            $data = $response.Content | ConvertFrom-Json
            LogTest "TRANSACTIONS" "/transactions/:id" "DELETE" "PASS" "Deleted successfully"
        } catch {
            LogTest "TRANSACTIONS" "/transactions/:id" "DELETE" "FAIL" "$($_.Exception.Message)"
        }
    }

    # 4.9 Delete Savings
    Write-Host "4.9 Delete Savings" -ForegroundColor Cyan
    try {
        $response = Invoke-WebRequest -Uri "$baseUrl/savings/$savingsId" -Method DELETE `
            -Headers $headers -UseBasicParsing
        $data = $response.Content | ConvertFrom-Json
        LogTest "SAVINGS" "/savings/:id" "DELETE" "PASS" "Deleted successfully"
    } catch {
        LogTest "SAVINGS" "/savings/:id" "DELETE" "FAIL" "$($_.Exception.Message)"
    }
}

# 4.10 Logout
Write-Host "4.10 Logout" -ForegroundColor Cyan
try {
    $response = Invoke-WebRequest -Uri "$baseUrl/auth/logout" -Method POST `
        -Headers $headers -UseBasicParsing
    $data = $response.Content | ConvertFrom-Json
    LogTest "AUTH" "/auth/logout" "POST" "PASS" "Logout successful"
} catch {
    LogTest "AUTH" "/auth/logout" "POST" "FAIL" "$($_.Exception.Message)"
}

# =====================================================================
# SUMMARY
# =====================================================================

Write-Host "`n========== TEST SUMMARY ==========" -ForegroundColor Green
$passed = ($testLog | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testLog | Where-Object { $_.Status -eq "FAIL" }).Count
$total = $testLog.Count

$passed = ($testLog | Where-Object { $_.Status -eq "PASS" }).Count
$failed = ($testLog | Where-Object { $_.Status -eq "FAIL" }).Count
$total = ($testLog | Measure-Object).Count

Write-Host "Total: $total | Passed: $passed | Failed: $failed" -ForegroundColor $(if ($failed -eq 0) { "Green" } else { "Yellow" })
Write-Host "`nEnd Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Cyan

if ($failed -eq 0) {
    Write-Host "`nAll tests PASSED!" -ForegroundColor Green
} else {
    Write-Host "`n$failed test(s) FAILED" -ForegroundColor Red
}
