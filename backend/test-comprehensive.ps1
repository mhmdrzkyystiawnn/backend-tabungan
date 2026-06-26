# Comprehensive API Test Suite
# Tests all endpoints with detailed checklist

$baseUrl = "http://localhost:5000/api"
$testResults = @()

function Test-Endpoint {
    param(
        [string]$name,
        [string]$method,
        [string]$endpoint,
        [object]$body,
        [hashtable]$headers,
        [scriptblock]$validation,
        [int]$expectedStatus = 200
    )

    try {
        $url = "$baseUrl$endpoint"
        
        $params = @{
            Uri = $url
            Method = $method
            UseBasicParsing = $true
        }

        if ($headers) {
            $params.Headers = $headers
        }

        if ($body -and $method -ne "GET") {
            $params.Body = $body | ConvertTo-Json
            if (-not $params.Headers) { $params.Headers = @{} }
            $params.Headers["Content-Type"] = "application/json"
        }

        $response = Invoke-WebRequest @params
        $content = $response.Content | ConvertFrom-Json
        
        $result = $validation.Invoke($content, $response.StatusCode)
        
        $testResults += @{
            Name = $name
            Status = "✓ PASS"
            Details = $result
            Endpoint = "$method $endpoint"
            StatusCode = $response.StatusCode
        }

        return $content
    } catch {
        $statusCode = $_.Exception.Response.StatusCode
        $response = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($response)
        $content = $reader.ReadToEnd() | ConvertFrom-Json

        $testResults += @{
            Name = $name
            Status = "✗ FAIL"
            Details = $content.message
            Endpoint = "$method $endpoint"
            StatusCode = $statusCode
        }

        if ($statusCode -ne $expectedStatus) {
            Write-Host "ERROR: Expected $expectedStatus, got $statusCode" -ForegroundColor Red
            throw $_
        }
    }
}

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Cyan
Write-Host "║        COMPREHENSIVE API TEST SUITE                            ║" -ForegroundColor Cyan
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Cyan

# ============================================================================
# SECTION 1: AUTH
# ============================================================================

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "SECTION 1: AUTH ENDPOINTS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

$authToken = $null
$refreshToken = $null

# 1.1 Register
Write-Host "1.1 Testing POST /auth/register..." -ForegroundColor Cyan
$registerResult = Test-Endpoint -name "Register" -method "POST" -endpoint "/auth/register" `
    -body @{
        email = "testuser_$(Get-Random)@test.com"
        password = "password123"
    } `
    -validation {
        param($content, $statusCode)
        if ($content.success) {
            return "User registered successfully"
        }
        throw "Registration failed"
    } -expectedStatus 201

# 1.2 Login
Write-Host "1.2 Testing POST /auth/login..." -ForegroundColor Cyan
$loginEmail = "ikiwtest@gmail.com"
$loginPassword = "password123"

$loginResult = Test-Endpoint -name "Login" -method "POST" -endpoint "/auth/login" `
    -body @{
        email = $loginEmail
        password = $loginPassword
    } `
    -validation {
        param($content, $statusCode)
        if ($content.success -and $content.data.token) {
            $script:authToken = $content.data.token
            $script:refreshToken = $content.data.refresh_token
            return "Login successful, token acquired"
        }
        throw "Login failed"
    }

if (-not $authToken) {
    Write-Host "ERROR: Failed to acquire auth token. Cannot continue tests." -ForegroundColor Red
    exit 1
}

$authHeaders = @{
    "Authorization" = "Bearer $authToken"
    "Content-Type" = "application/json"
}

# 1.3 Refresh Token
Write-Host "1.3 Testing POST /auth/refresh..." -ForegroundColor Cyan
Test-Endpoint -name "Refresh Token" -method "POST" -endpoint "/auth/refresh" `
    -body @{ refresh_token = $refreshToken } `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success -and $content.data.access_token) {
            return "Token refreshed successfully"
        }
        throw "Token refresh failed"
    }

# 1.4 Logout
Write-Host "1.4 Testing POST /auth/logout..." -ForegroundColor Cyan
Test-Endpoint -name "Logout" -method "POST" -endpoint "/auth/logout" `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success) {
            return "Logout successful"
        }
        throw "Logout failed"
    }

# ============================================================================
# SECTION 2: PROFILE
# ============================================================================

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "SECTION 2: PROFILE ENDPOINTS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

# 2.1 Get Profile
Write-Host "2.1 Testing GET /profile..." -ForegroundColor Cyan
Test-Endpoint -name "Get Profile" -method "GET" -endpoint "/profile" `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success -and $content.data.user) {
            return "Profile retrieved: $($content.data.user.email)"
        }
        throw "Failed to get profile"
    }

# 2.2 Update Profile
Write-Host "2.2 Testing PUT /profile..." -ForegroundColor Cyan
Test-Endpoint -name "Update Profile" -method "PUT" -endpoint "/profile" `
    -body @{
        name = "Test User"
        username = "testuser"
    } `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success) {
            return "Profile updated successfully"
        }
        throw "Failed to update profile"
    }

# 2.3 Change Password
Write-Host "2.3 Testing PUT /profile/password..." -ForegroundColor Cyan
Test-Endpoint -name "Change Password" -method "PUT" -endpoint "/profile/password" `
    -body @{
        old_password = "password123"
        new_password = "newpassword123"
    } `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success) {
            return "Password changed successfully"
        }
        throw "Failed to change password"
    }

# ============================================================================
# SECTION 3: SAVINGS
# ============================================================================

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "SECTION 3: SAVINGS ENDPOINTS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

$savingsId = $null

# 3.1 Create Savings
Write-Host "3.1 Testing POST /savings..." -ForegroundColor Cyan
$createSavingsResult = Test-Endpoint -name "Create Savings" -method "POST" -endpoint "/savings" `
    -body @{
        name = "Liburan $(Get-Random)"
        target_amount = 5000000
    } `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success -and $content.data.savings.id) {
            $script:savingsId = $content.data.savings.id
            return "Savings created: $($content.data.savings.id)"
        }
        throw "Failed to create savings"
    } -expectedStatus 201

# 3.2 Get All Savings
Write-Host "3.2 Testing GET /savings..." -ForegroundColor Cyan
Test-Endpoint -name "Get All Savings" -method "GET" -endpoint "/savings" `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success -and $content.data.savings) {
            return "Retrieved $($content.data.savings.Count) savings"
        }
        throw "Failed to get savings"
    }

# 3.3 Search Savings
Write-Host "3.3 Testing GET /savings?search=..." -ForegroundColor Cyan
Test-Endpoint -name "Search Savings" -method "GET" -endpoint "/savings?search=Liburan" `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success) {
            return "Search returned $($content.data.savings.Count) results"
        }
        throw "Search failed"
    }

# 3.4 Pagination
Write-Host "3.4 Testing GET /savings?page=1&limit=5..." -ForegroundColor Cyan
Test-Endpoint -name "Savings Pagination" -method "GET" -endpoint "/savings?page=1&limit=5" `
    -headers $authHeaders `
    -validation {
        param($content, $statusCode)
        if ($content.success -and $content.data.pagination) {
            return "Pagination: page $($content.data.pagination.page)/$($content.data.pagination.totalPages)"
        }
        throw "Pagination failed"
    }

# 3.5 Get Savings Detail
Write-Host "3.5 Testing GET /savings/:id..." -ForegroundColor Cyan
if ($savingsId) {
    Test-Endpoint -name "Get Savings Detail" -method "GET" -endpoint "/savings/$savingsId" `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success -and $content.data.savings) {
                return "Savings detail: $($content.data.savings.name)"
            }
            throw "Failed to get savings detail"
        }
}

# 3.6 Update Savings
Write-Host "3.6 Testing PUT /savings/:id..." -ForegroundColor Cyan
if ($savingsId) {
    Test-Endpoint -name "Update Savings" -method "PUT" -endpoint "/savings/$savingsId" `
        -body @{
            name = "Liburan Updated $(Get-Random)"
            target_amount = 6000000
        } `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success) {
                return "Savings updated: $($content.data.savings.name)"
            }
            throw "Failed to update savings"
        }
}

# ============================================================================
# SECTION 4: TRANSACTIONS
# ============================================================================

Write-Host "`n═══════════════════════════════════════════════════════════════" -ForegroundColor Yellow
Write-Host "SECTION 4: TRANSACTION ENDPOINTS" -ForegroundColor Yellow
Write-Host "═══════════════════════════════════════════════════════════════`n" -ForegroundColor Yellow

$transactionId = $null

if ($savingsId) {
    # 4.1 Create Transaction (Deposit)
    Write-Host "4.1 Testing POST /transactions (Deposit)..." -ForegroundColor Cyan
    $createTxResult = Test-Endpoint -name "Create Transaction (Deposit)" -method "POST" -endpoint "/transactions" `
        -body @{
            savings_id = $savingsId
            type = "deposit"
            amount = 500000
            description = "Monthly savings"
        } `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success -and $content.data.detail_transaksi.id) {
                $script:transactionId = $content.data.detail_transaksi.id
                return "Transaction created: $($content.data.detail_transaksi.id)"
            }
            throw "Failed to create transaction"
        } -expectedStatus 201

    # 4.2 Get All Transactions
    Write-Host "4.2 Testing GET /transactions..." -ForegroundColor Cyan
    Test-Endpoint -name "Get All Transactions" -method "GET" -endpoint "/transactions" `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success -and $content.data.transactions) {
                return "Retrieved $($content.data.transactions.Count) transactions"
            }
            throw "Failed to get transactions"
        }

    # 4.3 Pagination
    Write-Host "4.3 Testing GET /transactions?page=1&limit=5..." -ForegroundColor Cyan
    Test-Endpoint -name "Transactions Pagination" -method "GET" -endpoint "/transactions?page=1&limit=5" `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success -and $content.data.pagination) {
                return "Pagination: page $($content.data.pagination.page)/$($content.data.pagination.totalPages)"
            }
            throw "Pagination failed"
        }

    # 4.4 Search Transactions
    Write-Host "4.4 Testing GET /transactions?search=..." -ForegroundColor Cyan
    Test-Endpoint -name "Search Transactions" -method "GET" -endpoint "/transactions?search=Monthly" `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success) {
                return "Search returned $($content.data.transactions.Count) results"
            }
            throw "Search failed"
        }

    # 4.5 Get Transaction Detail
    Write-Host "4.5 Testing GET /transactions/:id..." -ForegroundColor Cyan
    if ($transactionId) {
        Test-Endpoint -name "Get Transaction Detail" -method "GET" -endpoint "/transactions/$transactionId" `
            -headers $authHeaders `
            -validation {
                param($content, $statusCode)
                if ($content.success -and $content.data.transaction) {
                    return "Transaction detail: $($content.data.transaction.type) - $($content.data.transaction.amount)"
                }
                throw "Failed to get transaction detail"
            }
    }

    # 4.6 Update Transaction
    Write-Host "4.6 Testing PATCH /transactions/:id..." -ForegroundColor Cyan
    if ($transactionId) {
        Test-Endpoint -name "Update Transaction" -method "PATCH" -endpoint "/transactions/$transactionId" `
            -body @{
                amount = 600000
                description = "Updated savings"
            } `
            -headers $authHeaders `
            -validation {
                param($content, $statusCode)
                if ($content.success) {
                    return "Transaction updated"
                }
                throw "Failed to update transaction"
            }
    }

    # 4.7 Savings Transactions
    Write-Host "4.7 Testing GET /savings/:id/transactions..." -ForegroundColor Cyan
    Test-Endpoint -name "Get Savings Transactions" -method "GET" -endpoint "/savings/$savingsId/transactions" `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success -and $content.data.transactions) {
                return "Retrieved $($content.data.transactions.Count) transactions for savings"
            }
            throw "Failed to get savings transactions"
        }

    # 4.8 Delete Transaction
    Write-Host "4.8 Testing DELETE /transactions/:id..." -ForegroundColor Cyan
    if ($transactionId) {
        Test-Endpoint -name "Delete Transaction" -method "DELETE" -endpoint "/transactions/$transactionId" `
            -headers $authHeaders `
            -validation {
                param($content, $statusCode)
                if ($content.success) {
                    return "Transaction deleted, balance restored"
                }
                throw "Failed to delete transaction"
            }
    }

    # 4.9 Delete Savings
    Write-Host "4.9 Testing DELETE /savings/:id..." -ForegroundColor Cyan
    Test-Endpoint -name "Delete Savings" -method "DELETE" -endpoint "/savings/$savingsId" `
        -headers $authHeaders `
        -validation {
            param($content, $statusCode)
            if ($content.success) {
                return "Savings deleted successfully"
            }
            throw "Failed to delete savings"
        }
}

# ============================================================================
# SUMMARY
# ============================================================================

Write-Host "`n╔════════════════════════════════════════════════════════════════╗" -ForegroundColor Green
Write-Host "║                    TEST SUMMARY                               ║" -ForegroundColor Green
Write-Host "╚════════════════════════════════════════════════════════════════╝`n" -ForegroundColor Green

$passed = ($testResults | Where-Object { $_.Status -eq "✓ PASS" }).Count
$failed = ($testResults | Where-Object { $_.Status -eq "✗ FAIL" }).Count
$total = $testResults.Count

Write-Host "Total Tests: $total" -ForegroundColor Cyan
Write-Host "Passed: $passed" -ForegroundColor Green
Write-Host "Failed: $failed" -ForegroundColor $(if ($failed -gt 0) { "Red" } else { "Green" })

Write-Host "`nDetailed Results:`n" -ForegroundColor Cyan

foreach ($result in $testResults) {
    $statusIcon = if ($result.Status -eq "✓ PASS") { "✓" } else { "✗" }
    $statusColor = if ($result.Status -eq "✓ PASS") { "Green" } else { "Red" }
    
    Write-Host "$statusIcon [$($result.StatusCode)] $($result.Name)" -ForegroundColor $statusColor
    Write-Host "   Endpoint: $($result.Endpoint)" -ForegroundColor Gray
    Write-Host "   Details: $($result.Details)" -ForegroundColor Gray
    Write-Host ""
}

Write-Host "═══════════════════════════════════════════════════════════════" -ForegroundColor Cyan
Write-Host "Test execution complete at $(Get-Date -Format 'HH:mm:ss')" -ForegroundColor Cyan
