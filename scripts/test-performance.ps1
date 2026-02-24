param(
    [string]$UserService = "http://localhost:8001",
    [string]$ContentService = "http://localhost:8002",
    [string]$ShopService = "http://localhost:8006"
)

$ErrorActionPreference = 'Stop'

function Write-Section($title) {
    Write-Host ""
    Write-Host "========================================"
    Write-Host $title
    Write-Host "========================================"
}

function Measure-Endpoint {
    param(
        [string]$Name,
        [string]$Url,
        [int]$Iterations = 5
    )

    Write-Host "Testing: $Name"
    Write-Host "URL: $Url"

    $times = @()
    for ($i = 1; $i -le $Iterations; $i++) {
        $sw = [System.Diagnostics.Stopwatch]::StartNew()
        try {
            Invoke-WebRequest -Uri $Url -UseBasicParsing -TimeoutSec 10 | Out-Null
            $sw.Stop()
            $times += $sw.ElapsedMilliseconds
            Write-Host -NoNewline "."
        }
        catch {
            $sw.Stop()
            Write-Host ""
            Write-Warning "Request failed for $Name ($Url): $($_.Exception.Message)"
            return
        }
    }

    Write-Host ""
    $avg = [Math]::Round(($times | Measure-Object -Average).Average, 2)
    $min = ($times | Measure-Object -Minimum).Minimum
    $max = ($times | Measure-Object -Maximum).Maximum

    Write-Host "  Avg: $avg ms"
    Write-Host "  Min: $min ms"
    Write-Host "  Max: $max ms"
}

Write-Section "Portable Performance Test (PowerShell Fallback)"

# Minimal safe checks that work natively on Windows without bash tooling.
Measure-Endpoint -Name "User service health" -Url "$UserService/health" -Iterations 3
Measure-Endpoint -Name "Content service health" -Url "$ContentService/health" -Iterations 3
Measure-Endpoint -Name "Shop service health" -Url "$ShopService/health" -Iterations 3

Write-Host ""
Write-Host "PowerShell fallback completed."
Write-Host "For full benchmark parity, install bash and run the .sh script path."
