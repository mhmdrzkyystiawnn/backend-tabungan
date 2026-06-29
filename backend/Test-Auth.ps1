# ==============================================================
#  Test-Auth.ps1 (Fokus pada Auth & Profile saja)
# ==============================================================

param([string]$BaseUrl = "http://localhost:5000/api")

$TestEmail    = "tester_$(Get-Random -Maximum 9999)@tabunganku.dev"
$TestPassword = "TestPass123"
$TestName     = "Tester Auth"
$TestUsername = "tester_auth_$(Get-Random -Maximum 9999)"

$Script:AccessToken = ""

function Log-Result([string]$Label, [bool]$Pass, [string]$Info = "") {
    $color = if ($Pass) { "Green" } else { "Red" }
    $icon  = if ($Pass) { "[PASS]" } else { "[FAIL]" }
    Write-Host "$icon $Label -> $Info" -ForegroundColor $color
}

function Invoke-API {
    param([string]$Method, [string]$Path, [hashtable]$Body = $null, [switch]$Auth)
    $uri = "$BaseUrl$Path"
    $headers = @{ "Content-Type" = "application/json" }
    if ($Auth) { $headers["Authorization"] = "Bearer $Script:AccessToken" }

    try {
        if ($Body) {
            $json = $Body | ConvertTo-Json -Depth 10
            $res = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -Body $json -UseBasicParsing -ErrorAction Stop
        } else {
            $res = Invoke-WebRequest -Uri $uri -Method $Method -Headers $headers -UseBasicParsing -ErrorAction Stop
        }
        return @{ StatusCode = [int]$res.StatusCode; Body = ($res.Content | ConvertFrom-Json); Raw = $res.Content }
    } catch [System.Net.WebException] {
        $raw = ""
        try { $raw = [System.IO.StreamReader]::new($_.Exception.Response.GetResponseStream()).ReadToEnd() } catch {}
        return @{ StatusCode = [int]$_.Exception.Response.StatusCode; Body = ($raw | ConvertFrom-Json -ErrorAction SilentlyContinue); Raw = $raw }
    }
}

Write-Host "========================================" -ForegroundColor Cyan
Write-Host " TEST SCRIPT 1 : AUTH & PROFILE" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# 1. REGISTER
$r1 = Invoke-API -Method POST -Path "/auth/register" -Body @{
    name = $TestName; username = $TestUsername; email = $TestEmail; password = $TestPassword
}
Log-Result "Register user baru" ($r1.StatusCode -in @(200, 201)) "HTTP $($r1.StatusCode)"

# 2. LOGIN
$r2 = Invoke-API -Method POST -Path "/auth/login" -Body @{ email = $TestEmail; password = $TestPassword }

# Coba cari token dengan berbagai kemungkinan nama
$foundToken = $null
if ($r2.Body.data.access_token) { $foundToken = $r2.Body.data.access_token }
elseif ($r2.Body.data.token) { $foundToken = $r2.Body.data.token }
elseif ($r2.Body.access_token) { $foundToken = $r2.Body.access_token }
elseif ($r2.Body.token) { $foundToken = $r2.Body.token }

$passLogin = ($r2.StatusCode -eq 200 -and $foundToken -ne $null)
Log-Result "Login kredensial valid" $passLogin "HTTP $($r2.StatusCode)"

if ($foundToken) {
    $Script:AccessToken = $foundToken
    Write-Host "  [INFO] Token berhasil ditemukan dan disimpan!" -ForegroundColor DarkGray
} else {
    Write-Host "  [WARNING] Login HTTP 200, tapi Token tidak ditemukan! Berikut isi response dari server:" -ForegroundColor Yellow
    Write-Host $r2.Raw -ForegroundColor DarkYellow
}

# 3. AKSES PROFILE (Membutuhkan Token yang benar)
if ($Script:AccessToken -ne "") {
    $r3 = Invoke-API -Method GET -Path "/profile" -Auth
    Log-Result "GET Profile (Membuktikan token valid)" ($r3.StatusCode -eq 200) "HTTP $($r3.StatusCode)"
} else {
    Log-Result "GET Profile" $false "Dilewati karena Token tidak ada"
}