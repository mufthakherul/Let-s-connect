param(
  [string]$ApiBase = "http://localhost:8000/api"
)

$ErrorActionPreference = 'Stop'

function Assert-Status {
  param(
    [string]$Name,
    [int]$Actual,
    [int[]]$Expected
  )

  if ($Expected -contains $Actual) {
    Write-Host "[PASS] $Name -> $Actual" -ForegroundColor Green
    return
  }

  throw "[FAIL] $Name expected [$($Expected -join ', ')] got $Actual"
}

$runId = [Guid]::NewGuid().ToString('N').Substring(0, 8)
$email = "smoke+$runId@letsconnect.test"
$username = "smoke_$runId"
$password = "Sm0ke!Pass123"

Write-Host "Running API smoke checks against: $ApiBase" -ForegroundColor Cyan

# 1) Health
$healthResp = Invoke-WebRequest -Uri "http://localhost:8000/health" -Method Get -UseBasicParsing
Assert-Status -Name "gateway health" -Actual $healthResp.StatusCode -Expected @(200)

# 2) Register
$registerBody = @{
  username = $username
  email = $email
  password = $password
  firstName = 'Smoke'
  lastName = 'Tester'
} | ConvertTo-Json

$registerResp = Invoke-WebRequest -Uri "$ApiBase/user/register" -Method Post -ContentType 'application/json' -Body $registerBody -UseBasicParsing
Assert-Status -Name "register" -Actual $registerResp.StatusCode -Expected @(200, 201)

# 3) Login
$loginBody = @{
  email = $email
  password = $password
} | ConvertTo-Json

$loginResp = Invoke-WebRequest -Uri "$ApiBase/user/login" -Method Post -ContentType 'application/json' -Body $loginBody -UseBasicParsing
Assert-Status -Name "login" -Actual $loginResp.StatusCode -Expected @(200)

$loginJson = $loginResp.Content | ConvertFrom-Json
$token = $loginJson.data.token
$userId = $loginJson.data.user.id

if (-not $token -or -not $userId) {
  throw "[FAIL] login payload missing token/userId"
}

$headers = @{ Authorization = "Bearer $token" }

# 4) Feed endpoint
$feedResp = Invoke-WebRequest -Uri "$ApiBase/content/posts/feed/$userId" -Method Get -Headers $headers -UseBasicParsing
Assert-Status -Name "content feed" -Actual $feedResp.StatusCode -Expected @(200)

# 5) Messaging endpoint
$msgResp = Invoke-WebRequest -Uri "$ApiBase/messaging/health" -Method Get -Headers $headers -UseBasicParsing
Assert-Status -Name "messaging health" -Actual $msgResp.StatusCode -Expected @(200)

Write-Host "All smoke checks passed." -ForegroundColor Green
