# ==============================================================
#  Test-TabunganAPI.ps1
#  Pengujian otomatis SELURUH endpoint backend-tabungan
# ==============================================================

param(
    [string]$BaseUrl = "http://localhost:5000/api"
)

# --- Konfigurasi data uji ---
$TestEmail    = "tester_$(Get-Random -Maximum 9999)@tabunganku.dev"
$TestPassword = "TestPass123"
$TestName     = "Tester Otomatis"
$TestUsername = "tester_$(Get-Random -Maximum 9999)"

# --- State global ---
$Script:AccessToken     = ""
$Script:RefreshToken    = ""
$Script:SavingsId       = ""
$Script:TransactionId   = ""
$Script:SharedSavingsId = ""
$Script:SharedTxId      = ""
$Script:InviteCode      = ""

$Script:TotalTests  = 0
$Script:PassedTests = 0
$Script:FailedTests = 0
$Script:Results     = @()
$Script:LastApiResponse = $null

# ==============================================================
#  FUNGSI HELPER
# ==============================================================

function Write-Header {
    param([string]$Title)
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $Title" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Section {
    param([string]$Title)
    Write-Host ""
    Write-Host "--- $Title" -ForegroundColor DarkCyan
}

function Log-Result {
    param(
        [string]$Label,
        [bool]$Pass,
        [string]$Info = ""
    )
    $Script:TotalTests++
    if ($Pass) {
        $Script:PassedTests++
        $icon  = "[PASS]"
        $color = "Green"
    } else {
        $Script:FailedTests++
        $icon  = "[FAIL]"
        $color = "Red"
    }

    if (-not $Pass -and $Info -like "HTTP *" -and $null -ne $Script:LastApiResponse) {
        $apiMessage = Find-FirstBodyValue -Body $Script:LastApiResponse.Body -Paths @(
            @("message"),
            @("error"),
            @("errors", "message")
        )

        if (-not $apiMessage -and $Script:LastApiResponse.Raw) {
            $apiMessage = $Script:LastApiResponse.Raw
        }

        if ($apiMessage) {
            $shortMessage = "$apiMessage"
            if ($shortMessage.Length -gt 180) {
                $shortMessage = $shortMessage.Substring(0, 177) + "..."
            }
            $Info = "$Info - $shortMessage"
        }
    }

    $line = "$icon $Label"
    if ($Info -ne "") { $line = "$line  ->  $Info" }
    Write-Host $line -ForegroundColor $color
    $Script:Results += [PSCustomObject]@{
        Status = if ($Pass) { "PASS" } else { "FAIL" }
        Label  = $Label
        Info   = $Info
    }
}

function Get-BodyValue {
    param(
        [object]$Object,
        [string[]]$Path
    )

    $current = $Object
    foreach ($segment in $Path) {
        if ($null -eq $current) {
            return $null
        }

        $property = $current.PSObject.Properties[$segment]
        if ($null -eq $property) {
            return $null
        }

        $current = $property.Value
    }

    return $current
}

function Find-FirstBodyValue {
    param(
        [object]$Body,
        [string[][]]$Paths
    )

    foreach ($path in $Paths) {
        $value = Get-BodyValue -Object $Body -Path $path
        if ($null -ne $value -and "$value" -ne "") {
            return $value
        }
    }

    return $null
}

function Get-ResponseId {
    param(
        [object]$Body,
        [string]$EntityName
    )

    return Find-FirstBodyValue -Body $Body -Paths @(
        @("data", $EntityName, "id"),
        @("data", "id"),
        @($EntityName, "id"),
        @("id")
    )
}

function Get-ResponseInviteCode {
    param([object]$Body)

    return Find-FirstBodyValue -Body $Body -Paths @(
        @("data", "shared_savings", "invite_code"),
        @("data", "invite_code"),
        @("shared_savings", "invite_code"),
        @("invite_code")
    )
}

function Get-TokenPair {
    param([object]$Body)

    $accessToken = Find-FirstBodyValue -Body $Body -Paths @(
        @("data", "access_token"),
        @("data", "token"),
        @("data", "session", "access_token"),
        @("access_token"),
        @("token"),
        @("session", "access_token")
    )

    $refreshToken = Find-FirstBodyValue -Body $Body -Paths @(
        @("data", "refresh_token"),
        @("data", "session", "refresh_token"),
        @("refresh_token"),
        @("session", "refresh_token")
    )

    return [PSCustomObject]@{
        AccessToken  = $accessToken
        RefreshToken = $refreshToken
    }
}

function Invoke-API {
    param(
        [string]$Method,
        [string]$Path,
        [hashtable]$Body  = $null,
        [hashtable]$Query = $null,
        [switch]$Auth,
        [switch]$Multipart,
        [string]$FilePath  = "",
        [string]$FileField = "image"
    )

    $uri = "$BaseUrl$Path"
    if ($Query -and $Query.Count -gt 0) {
        $parts = @()
        foreach ($k in $Query.Keys) {
            $encodedKey = [System.Uri]::EscapeDataString([string]$k)
            $encodedValue = [System.Uri]::EscapeDataString([string]$Query[$k])
            $parts += "$encodedKey=$encodedValue"
        }
        $uri = $uri + "?" + ($parts -join "&")
    }

    $headers = @{ "Content-Type" = "application/json" }
    if ($Auth) {
        $headers["Authorization"] = "Bearer $Script:AccessToken"
    }

    try {
        if ($Multipart -and $FilePath -ne "") {
            $headers.Remove("Content-Type")
            $boundary  = [System.Guid]::NewGuid().ToString()
            $fileBytes = [System.IO.File]::ReadAllBytes($FilePath)
            $fileName  = [System.IO.Path]::GetFileName($FilePath)
            $mimeType  = "image/png"
            $enc       = [System.Text.Encoding]::UTF8
            $bodyList  = [System.Collections.Generic.List[byte]]::new()

            $part = "--$boundary`r`nContent-Disposition: form-data; name=`"$FileField`"; filename=`"$fileName`"`r`nContent-Type: $mimeType`r`n`r`n"
            $bodyList.AddRange($enc.GetBytes($part))
            $bodyList.AddRange($fileBytes)
            $bodyList.AddRange($enc.GetBytes("`r`n--$boundary--`r`n"))

            $headers["Content-Type"] = "multipart/form-data; boundary=$boundary"

            $response = Invoke-WebRequest -Uri $uri -Method $Method `
                -Headers $headers -Body $bodyList.ToArray() `
                -UseBasicParsing -ErrorAction Stop

        } elseif ($Body -ne $null) {
            $jsonBody = $Body | ConvertTo-Json -Depth 10
            $response = Invoke-WebRequest -Uri $uri -Method $Method `
                -Headers $headers -Body $jsonBody `
                -UseBasicParsing -ErrorAction Stop

        } else {
            $response = Invoke-WebRequest -Uri $uri -Method $Method `
                -Headers $headers `
                -UseBasicParsing -ErrorAction Stop
        }

        $result = @{
            StatusCode = [int]$response.StatusCode
            Body       = ($response.Content | ConvertFrom-Json -ErrorAction SilentlyContinue)
            Raw        = $response.Content
            Error      = $null
        }
        $Script:LastApiResponse = $result
        return $result

    } catch {
        $sc  = 0
        $raw = ""
        try {
            $response = $_.Exception.Response
            if ($null -ne $response) {
                $sc = [int]$response.StatusCode

                if ($response -is [System.Net.HttpWebResponse]) {
                    $stream = $response.GetResponseStream()
                    $reader = [System.IO.StreamReader]::new($stream)
                    $raw = $reader.ReadToEnd()
                } elseif ($response.Content) {
                    $raw = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()
                }
            }
        } catch {
            $raw = ""
        }

        $result = @{
            StatusCode = $sc
            Body       = ($raw | ConvertFrom-Json -ErrorAction SilentlyContinue)
            Raw        = $raw
            Error      = $_.Exception.Message
        }
        $Script:LastApiResponse = $result
        return $result
    }
}

function New-DummyImage {
    $pngBytes = [Convert]::FromBase64String(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
    )
    $tmpPath = [System.IO.Path]::GetTempFileName() -replace "\.tmp$", ".png"
    [System.IO.File]::WriteAllBytes($tmpPath, $pngBytes)
    return $tmpPath
}

# ==============================================================
#  MULAI TEST
# ==============================================================

Write-Header "TABUNGANKU API - AUTOMATED TEST SUITE"
Write-Host "  Base URL : $BaseUrl" -ForegroundColor White
Write-Host "  Email    : $TestEmail" -ForegroundColor White
Write-Host "  Waktu    : $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor White

$dummyImage = New-DummyImage

# ==============================================================
#  1. AUTH
# ==============================================================

Write-Header "1. AUTH"

Write-Section "POST /api/auth/register"
$r = Invoke-API -Method POST -Path "/auth/register" -Body @{
    name     = $TestName
    username = $TestUsername
    email    = $TestEmail
    password = $TestPassword
}
$pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
Log-Result "Register user baru" $pass "HTTP $($r.StatusCode)"

Write-Section "POST /api/auth/login (valid)"
$r = Invoke-API -Method POST -Path "/auth/login" -Body @{
    email    = $TestEmail
    password = $TestPassword
}

$tokenPair = Get-TokenPair -Body $r.Body
$foundToken = $tokenPair.AccessToken
$foundRefresh = $tokenPair.RefreshToken

$pass = ($r.StatusCode -eq 200) -and ($foundToken -ne $null)
Log-Result "Login dengan kredensial valid" $pass "HTTP $($r.StatusCode)"

if ($foundToken) {
    $Script:AccessToken  = $foundToken
    $Script:RefreshToken = $foundRefresh
    Write-Host "  [INFO] Token berhasil didapat." -ForegroundColor DarkGray
}

Write-Section "POST /api/auth/login (validasi gagal)"
$r = Invoke-API -Method POST -Path "/auth/login" -Body @{
    email    = "bukan-email"
    password = "x"
}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Login email tidak valid -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "POST /api/auth/refresh"
$r = Invoke-API -Method POST -Path "/auth/refresh" -Body @{
    refresh_token = $Script:RefreshToken
}
$pass = ($r.StatusCode -eq 200)
Log-Result "Refresh access token" $pass "HTTP $($r.StatusCode)"

$refTokenPair = Get-TokenPair -Body $r.Body
$foundRefToken = $refTokenPair.AccessToken

if ($foundRefToken) {
    $Script:AccessToken  = $foundRefToken
    if ($refTokenPair.RefreshToken) {
        $Script:RefreshToken = $refTokenPair.RefreshToken
    }
}

# ==============================================================
#  2. PROFILE
# ==============================================================

Write-Header "2. PROFILE"

Write-Section "GET /api/profile"
$r = Invoke-API -Method GET -Path "/profile" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET profil sendiri" $pass "HTTP $($r.StatusCode)"

Write-Section "PUT /api/profile (valid)"
$newUsername = "tester_upd_$(Get-Random -Maximum 999)"
$r = Invoke-API -Method PUT -Path "/profile" -Auth -Body @{
    name     = "Tester Update"
    username = $newUsername
}
$pass = ($r.StatusCode -eq 200)
Log-Result "Update nama dan username" $pass "HTTP $($r.StatusCode)"

Write-Section "PUT /api/profile (body kosong)"
$r = Invoke-API -Method PUT -Path "/profile" -Auth -Body @{}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Update profil body kosong -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "POST /api/profile/avatar"
$r = Invoke-API -Method POST -Path "/profile/avatar" -Auth -Multipart -FilePath $dummyImage -FileField "avatar"
$pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
Log-Result "Upload avatar (multipart/form-data)" $pass "HTTP $($r.StatusCode)"

Write-Section "PUT /api/profile/password"
$r = Invoke-API -Method PUT -Path "/profile/password" -Auth -Body @{
    old_password = $TestPassword
    new_password = "NewPass456"
}
$pass = ($r.StatusCode -eq 200)
Log-Result "Ganti password" $pass "HTTP $($r.StatusCode)"

# Login ulang dengan password baru
$r2 = Invoke-API -Method POST -Path "/auth/login" -Body @{
    email    = $TestEmail
    password = "NewPass456"
}
$tokenPair2 = Get-TokenPair -Body $r2.Body
$foundToken2 = $tokenPair2.AccessToken

if ($foundToken2) {
    $Script:AccessToken  = $foundToken2
    if ($tokenPair2.RefreshToken) {
        $Script:RefreshToken = $tokenPair2.RefreshToken
    }
    Write-Host "  [INFO] Login ulang dengan password baru berhasil." -ForegroundColor DarkGray
}

# ==============================================================
#  3. SAVINGS
# ==============================================================

Write-Header "3. SAVINGS - Tabungan Pribadi"

Write-Section "POST /api/savings (valid)"
$r = Invoke-API -Method POST -Path "/savings" -Auth -Body @{
    name          = "Tabungan Liburan Bali"
    target_amount = 5000000
}
$pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
Log-Result "Buat tabungan baru" $pass "HTTP $($r.StatusCode)"
$createdSavingsId = Get-ResponseId -Body $r.Body -EntityName "savings"
if ($createdSavingsId) {
    $Script:SavingsId = $createdSavingsId
    Write-Host "  [INFO] savings_id = $($Script:SavingsId)" -ForegroundColor DarkGray
}

Write-Section "POST /api/savings (target negatif)"
$r = Invoke-API -Method POST -Path "/savings" -Auth -Body @{
    name          = "Test Gagal"
    target_amount = -100
}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Buat tabungan target negatif -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/savings"
$r = Invoke-API -Method GET -Path "/savings" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET semua tabungan" $pass "HTTP $($r.StatusCode)"

$r = Invoke-API -Method GET -Path "/savings" -Auth -Query @{ page = 1; limit = 5; sort = "desc" }
$pass = ($r.StatusCode -eq 200)
Log-Result "GET tabungan dengan query page limit sort" $pass "HTTP $($r.StatusCode)"

$r = Invoke-API -Method GET -Path "/savings" -Auth -Query @{ search = "Bali" }
$pass = ($r.StatusCode -eq 200)
Log-Result "GET tabungan search=Bali" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/savings/:id"
if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/savings/$($Script:SavingsId)" -Auth
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET tabungan by ID" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "GET tabungan by ID" $false "Dilewati - savings_id tidak ada"
}

$r = Invoke-API -Method GET -Path "/savings/bukan-uuid-valid" -Auth
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "GET tabungan ID tidak valid -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "POST /api/savings/:id/image"
if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method POST -Path "/savings/$($Script:SavingsId)/image" `
        -Auth -Multipart -FilePath $dummyImage -FileField "image"
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
    Log-Result "Upload gambar tabungan (multipart)" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Upload gambar tabungan" $false "Dilewati - savings_id tidak ada"
}

Write-Section "PUT /api/savings/:id"
if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method PUT -Path "/savings/$($Script:SavingsId)" -Auth -Body @{
        name          = "Tabungan Liburan Bali Updated"
        target_amount = 7500000
    }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "Update tabungan (name + target_amount)" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Update tabungan" $false "Dilewati - savings_id tidak ada"
}

# ==============================================================
#  4. TRANSACTIONS
# ==============================================================

Write-Header "4. TRANSACTIONS"

Write-Section "POST /api/transactions (deposit)"
if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method POST -Path "/transactions" -Auth -Body @{
        savings_id  = $Script:SavingsId
        type        = "deposit"
        amount      = 500000
        description = "Top-up awal dari gaji"
    }
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
    Log-Result "Buat transaksi deposit" $pass "HTTP $($r.StatusCode)"
    $createdTransactionId = Get-ResponseId -Body $r.Body -EntityName "transaction"
    if (-not $createdTransactionId) {
        $createdTransactionId = Get-ResponseId -Body $r.Body -EntityName "transactions"
    }
    if ($createdTransactionId) {
        $Script:TransactionId = $createdTransactionId
        Write-Host "  [INFO] transaction_id = $($Script:TransactionId)" -ForegroundColor DarkGray
    }
} else {
    Log-Result "Buat transaksi deposit" $false "Dilewati - savings_id tidak ada"
}

Write-Section "POST /api/transactions (withdrawal)"
if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method POST -Path "/transactions" -Auth -Body @{
        savings_id  = $Script:SavingsId
        type        = "withdrawal"
        amount      = 100000
        description = "Beli tiket pesawat"
    }
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
    Log-Result "Buat transaksi withdrawal" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Buat transaksi withdrawal" $false "Dilewati - savings_id tidak ada"
}

Write-Section "POST /api/transactions (data tidak valid)"
$r = Invoke-API -Method POST -Path "/transactions" -Auth -Body @{
    savings_id = "bukan-uuid"
    type       = "deposit"
    amount     = 0
}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Buat transaksi data tidak valid -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/transactions"
$r = Invoke-API -Method GET -Path "/transactions" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET semua transaksi" $pass "HTTP $($r.StatusCode)"

$r = Invoke-API -Method GET -Path "/transactions" -Auth -Query @{ type = "deposit"; sort = "desc"; limit = 10 }
$pass = ($r.StatusCode -eq 200)
Log-Result "GET transaksi filter type=deposit sort=desc" $pass "HTTP $($r.StatusCode)"

if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/transactions" -Auth -Query @{ savings_id = $Script:SavingsId }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET transaksi filter by savings_id" $pass "HTTP $($r.StatusCode)"
}

Write-Section "GET /api/transactions/:id"
if ($Script:TransactionId -ne "") {
    $r = Invoke-API -Method GET -Path "/transactions/$($Script:TransactionId)" -Auth
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET transaksi by ID" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "GET transaksi by ID" $false "Dilewati - transaction_id tidak ada"
}

Write-Section "PATCH /api/transactions/:id"
if ($Script:TransactionId -ne "") {
    $r = Invoke-API -Method PATCH -Path "/transactions/$($Script:TransactionId)" -Auth -Body @{
        amount      = 600000
        description = "Top-up diperbarui"
    }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "Update transaksi (amount + description)" $pass "HTTP $($r.StatusCode)"

    $r = Invoke-API -Method PATCH -Path "/transactions/$($Script:TransactionId)" -Auth -Body @{}
    $pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
    Log-Result "Update transaksi body kosong -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Update transaksi" $false "Dilewati - transaction_id tidak ada"
    Log-Result "Update transaksi body kosong" $false "Dilewati - transaction_id tidak ada"
}

Write-Section "GET /api/savings/:id/transactions"
if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/savings/$($Script:SavingsId)/transactions" -Auth -Query @{
        page  = 1
        limit = 10
        sort  = "desc"
    }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET transaksi dalam tabungan tertentu" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "GET transaksi dalam tabungan tertentu" $false "Dilewati"
}

# ==============================================================
#  5. DASHBOARD
# ==============================================================

Write-Header "5. DASHBOARD"

Write-Section "GET /api/dashboard"
$r = Invoke-API -Method GET -Path "/dashboard" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET ringkasan dashboard" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/dashboard/statistics"
$r = Invoke-API -Method GET -Path "/dashboard/statistics" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET statistik dashboard" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/dashboard/recent-transactions"
$r = Invoke-API -Method GET -Path "/dashboard/recent-transactions" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET transaksi terbaru (tanpa limit)" $pass "HTTP $($r.StatusCode)"

$r = Invoke-API -Method GET -Path "/dashboard/recent-transactions" -Auth -Query @{ limit = 5 }
$pass = ($r.StatusCode -eq 200)
Log-Result "GET transaksi terbaru limit=5" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/dashboard/monthly-summary"
$currentMonth = (Get-Date).ToString("yyyy-MM")
$r = Invoke-API -Method GET -Path "/dashboard/monthly-summary" -Auth -Query @{ month = $currentMonth }
$pass = ($r.StatusCode -eq 200)
Log-Result "GET monthly-summary bulan ini ($currentMonth)" $pass "HTTP $($r.StatusCode)"

if ($Script:SavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/dashboard/monthly-summary" -Auth -Query @{
        month      = $currentMonth
        savings_id = $Script:SavingsId
    }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET monthly-summary filter savings_id" $pass "HTTP $($r.StatusCode)"
}

$r = Invoke-API -Method GET -Path "/dashboard/monthly-summary" -Auth -Query @{ month = "Juni-2025" }
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Monthly-summary format bulan salah -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

# ==============================================================
#  6. SHARED SAVINGS
# ==============================================================

Write-Header "6. SHARED SAVINGS - Tabungan Bersama"

Write-Section "POST /api/shared-savings (valid)"
$r = Invoke-API -Method POST -Path "/shared-savings" -Auth -Body @{
    name          = "Tabungan Kos Bareng"
    description   = "Nabung bareng buat bayar kos akhir tahun"
    target_amount = 10000000
}
$pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
Log-Result "Buat tabungan bersama" $pass "HTTP $($r.StatusCode)"
$createdSharedSavingsId = Get-ResponseId -Body $r.Body -EntityName "shared_savings"
if ($createdSharedSavingsId) {
    $Script:SharedSavingsId = $createdSharedSavingsId
    Write-Host "  [INFO] shared_savings_id = $($Script:SharedSavingsId)" -ForegroundColor DarkGray
}

$createdInviteCode = Get-ResponseInviteCode -Body $r.Body
if ($createdInviteCode) {
    $Script:InviteCode = $createdInviteCode
    Write-Host "  [INFO] invite_code = $($Script:InviteCode)" -ForegroundColor DarkGray
}

Write-Section "POST /api/shared-savings (data tidak valid)"
$r = Invoke-API -Method POST -Path "/shared-savings" -Auth -Body @{
    name          = ""
    target_amount = -1
}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Buat tabungan bersama data tidak valid -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/shared-savings"
$r = Invoke-API -Method GET -Path "/shared-savings" -Auth
$pass = ($r.StatusCode -eq 200)
Log-Result "GET semua tabungan bersama" $pass "HTTP $($r.StatusCode)"

$r = Invoke-API -Method GET -Path "/shared-savings" -Auth -Query @{ page = 1; limit = 5; sort = "asc" }
$pass = ($r.StatusCode -eq 200)
Log-Result "GET tabungan bersama dengan query page limit sort" $pass "HTTP $($r.StatusCode)"

Write-Section "GET /api/shared-savings/:id"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/shared-savings/$($Script:SharedSavingsId)" -Auth
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET tabungan bersama by ID" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "GET tabungan bersama by ID" $false "Dilewati - shared_savings_id tidak ada"
}

Write-Section "POST /api/shared-savings/:id/image"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method POST -Path "/shared-savings/$($Script:SharedSavingsId)/image" `
        -Auth -Multipart -FilePath $dummyImage -FileField "image"
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
    Log-Result "Upload gambar tabungan bersama (multipart)" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Upload gambar tabungan bersama" $false "Dilewati - shared_savings_id tidak ada"
}

Write-Section "PATCH /api/shared-savings/:id"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method PATCH -Path "/shared-savings/$($Script:SharedSavingsId)" -Auth -Body @{
        name        = "Tabungan Kos Bareng Updated"
        description = "Deskripsi diperbarui"
    }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "Update tabungan bersama" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Update tabungan bersama" $false "Dilewati - shared_savings_id tidak ada"
}

Write-Section "GET /api/shared-savings/:id/members"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/shared-savings/$($Script:SharedSavingsId)/members" -Auth
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET daftar member tabungan bersama" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "GET daftar member tabungan bersama" $false "Dilewati"
}

Write-Section "GET /api/shared-savings/:id/statistics"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method GET -Path "/shared-savings/$($Script:SharedSavingsId)/statistics" -Auth
    $pass = ($r.StatusCode -eq 200)
    Log-Result "GET statistik tabungan bersama" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "GET statistik tabungan bersama" $false "Dilewati"
}

Write-Section "POST /api/shared-savings/join (kode tidak valid)"
$r = Invoke-API -Method POST -Path "/shared-savings/join" -Auth -Body @{
    invite_code = "KODE-TIDAK-ADA"
}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 409)
Log-Result "Join shared savings kode tidak valid -> ditolak" $pass "HTTP $($r.StatusCode)"

if ($Script:InviteCode -ne "") {
    $r = Invoke-API -Method POST -Path "/shared-savings/join" -Auth -Body @{
        invite_code = $Script:InviteCode
    }
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201) -or ($r.StatusCode -eq 409)
    Log-Result "Join shared savings dengan kode valid (200 atau 409)" $pass "HTTP $($r.StatusCode)"
}

# ==============================================================
#  7. SHARED TRANSACTIONS
# ==============================================================

Write-Header "7. SHARED TRANSACTIONS"

Write-Section "POST /api/shared-transactions (deposit)"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method POST -Path "/shared-transactions" -Auth -Body @{
        shared_savings_id = $Script:SharedSavingsId
        type              = "deposit"
        amount            = 250000
        description       = "Iuran bulan ini"
    }
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
    Log-Result "Buat transaksi deposit di tabungan bersama" $pass "HTTP $($r.StatusCode)"
    $createdSharedTxId = Get-ResponseId -Body $r.Body -EntityName "transaction"
    if (-not $createdSharedTxId) {
        $createdSharedTxId = Get-ResponseId -Body $r.Body -EntityName "shared_transaction"
    }
    if (-not $createdSharedTxId) {
        $createdSharedTxId = Get-ResponseId -Body $r.Body -EntityName "shared_transactions"
    }
    if ($createdSharedTxId) {
        $Script:SharedTxId = $createdSharedTxId
        Write-Host "  [INFO] shared_tx_id = $($Script:SharedTxId)" -ForegroundColor DarkGray
    }
} else {
    Log-Result "Buat transaksi deposit di tabungan bersama" $false "Dilewati - shared_savings_id tidak ada"
}

Write-Section "POST /api/shared-transactions (withdrawal)"
if ($Script:SharedSavingsId -ne "") {
    $r = Invoke-API -Method POST -Path "/shared-transactions" -Auth -Body @{
        shared_savings_id = $Script:SharedSavingsId
        type              = "withdrawal"
        amount            = 50000
        description       = "Beli keperluan bersama"
    }
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 201)
    Log-Result "Buat transaksi withdrawal di tabungan bersama" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Buat transaksi withdrawal di tabungan bersama" $false "Dilewati"
}

Write-Section "POST /api/shared-transactions (data tidak valid)"
$r = Invoke-API -Method POST -Path "/shared-transactions" -Auth -Body @{
    shared_savings_id = "bukan-uuid"
    type              = "unknown"
    amount            = -500
}
$pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
Log-Result "Buat shared transaction data tidak valid -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"

Write-Section "PATCH /api/shared-transactions/:id"
if ($Script:SharedTxId -ne "") {
    $r = Invoke-API -Method PATCH -Path "/shared-transactions/$($Script:SharedTxId)" -Auth -Body @{
        amount      = 300000
        description = "Iuran diperbarui"
    }
    $pass = ($r.StatusCode -eq 200)
    Log-Result "Update transaksi tabungan bersama" $pass "HTTP $($r.StatusCode)"

    $r = Invoke-API -Method PATCH -Path "/shared-transactions/$($Script:SharedTxId)" -Auth -Body @{}
    $pass = ($r.StatusCode -ge 400 -and $r.StatusCode -le 422)
    Log-Result "Update shared transaction body kosong -> ditolak 4xx" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Update transaksi tabungan bersama" $false "Dilewati - shared_tx_id tidak ada"
    Log-Result "Update shared transaction body kosong" $false "Dilewati - shared_tx_id tidak ada"
}

# ==============================================================
#  8. CLEANUP
# ==============================================================

Write-Header "8. CLEANUP - Hapus Data Uji"

if ($Script:SharedTxId -ne "") {
    Write-Section "DELETE /api/shared-transactions/:id"
    $r = Invoke-API -Method DELETE -Path "/shared-transactions/$($Script:SharedTxId)" -Auth
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 204)
    Log-Result "DELETE shared transaction" $pass "HTTP $($r.StatusCode)"
}

if ($Script:SharedSavingsId -ne "") {
    Write-Section "DELETE /api/shared-savings/:id"
    $r = Invoke-API -Method DELETE -Path "/shared-savings/$($Script:SharedSavingsId)" -Auth
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 204)
    Log-Result "DELETE tabungan bersama" $pass "HTTP $($r.StatusCode)"
}

if ($Script:TransactionId -ne "") {
    Write-Section "DELETE /api/transactions/:id"
    $r = Invoke-API -Method DELETE -Path "/transactions/$($Script:TransactionId)" -Auth
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 204)
    Log-Result "DELETE transaksi pribadi" $pass "HTTP $($r.StatusCode)"
}

if ($Script:SavingsId -ne "") {
    Write-Section "DELETE /api/savings/:id"
    $r = Invoke-API -Method DELETE -Path "/savings/$($Script:SavingsId)" -Auth
    $pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 204)
    Log-Result "DELETE tabungan pribadi" $pass "HTTP $($r.StatusCode)"
}

Write-Section "POST /api/auth/logout"
$r = Invoke-API -Method POST -Path "/auth/logout" -Auth
$pass = ($r.StatusCode -ge 200 -and $r.StatusCode -le 204)
Log-Result "Logout" $pass "HTTP $($r.StatusCode)"

$r = Invoke-API -Method GET -Path "/profile" -Auth
$pass = ($r.StatusCode -eq 401 -or $r.StatusCode -eq 403 -or $r.StatusCode -eq 200)
if ($r.StatusCode -eq 200) {
    Log-Result "Akses endpoint setelah logout (JWT lama masih valid)" $pass "HTTP $($r.StatusCode)"
} else {
    Log-Result "Akses endpoint setelah logout -> ditolak 401/403" $pass "HTTP $($r.StatusCode)"
}

# Hapus file gambar sementara
if (Test-Path $dummyImage) {
    Remove-Item $dummyImage -Force
}

# ==============================================================
#  RINGKASAN
# ==============================================================

Write-Host ""
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  RINGKASAN HASIL PENGUJIAN" -ForegroundColor Cyan
Write-Host "============================================================" -ForegroundColor Cyan
Write-Host "  Total   : $Script:TotalTests pengujian" -ForegroundColor White
Write-Host "  PASS    : $Script:PassedTests" -ForegroundColor Green

if ($Script:FailedTests -gt 0) {
    Write-Host "  FAIL    : $Script:FailedTests" -ForegroundColor Red
} else {
    Write-Host "  FAIL    : $Script:FailedTests" -ForegroundColor Green
}

Write-Host ""

if ($Script:FailedTests -gt 0) {
    Write-Host "  Pengujian yang GAGAL:" -ForegroundColor Red
    foreach ($item in $Script:Results) {
        if ($item.Status -eq "FAIL") {
            Write-Host "    x $($item.Label)" -ForegroundColor Red
            if ($item.Info -ne "") {
                Write-Host "      $($item.Info)" -ForegroundColor DarkRed
            }
        }
    }
    Write-Host ""
}

if ($Script:TotalTests -gt 0) {
    $pct = [math]::Round(($Script:PassedTests / $Script:TotalTests) * 100, 1)
    if ($pct -ge 80) {
        Write-Host "  Skor    : $pct%" -ForegroundColor Green
    } elseif ($pct -ge 50) {
        Write-Host "  Skor    : $pct%" -ForegroundColor Yellow
    } else {
        Write-Host "  Skor    : $pct%" -ForegroundColor Red
    }
}

Write-Host "============================================================" -ForegroundColor Cyan
Write-Host ""
