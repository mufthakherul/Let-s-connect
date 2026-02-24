param(
    [int]$RefreshInterval = 2
)

$ErrorActionPreference = 'Stop'

function Get-RedisContainerId {
    $cid = docker compose ps -q redis 2>$null
    if (-not $cid) {
        throw "Redis container is not running. Start it with: docker compose up -d redis"
    }
    return $cid.Trim()
}

function Get-RedisStats($containerId) {
    $statsRaw = docker exec $containerId redis-cli INFO stats 2>$null
    if (-not $statsRaw) {
        throw "Could not fetch Redis stats"
    }

    $hits = 0
    $misses = 0

    foreach ($line in $statsRaw) {
        if ($line -match '^keyspace_hits:(\d+)') { $hits = [int64]$Matches[1] }
        if ($line -match '^keyspace_misses:(\d+)') { $misses = [int64]$Matches[1] }
    }

    $total = $hits + $misses
    $rate = if ($total -gt 0) { [Math]::Round(($hits * 100.0) / $total, 2) } else { 0 }

    [PSCustomObject]@{
        Hits = $hits
        Misses = $misses
        Total = $total
        HitRate = $rate
    }
}

$containerId = Get-RedisContainerId
Write-Host "Monitoring Redis cache (PowerShell fallback). Press Ctrl+C to stop."

while ($true) {
    Clear-Host
    Write-Host "========================================"
    Write-Host "Redis Cache Monitor (PowerShell)"
    Write-Host "========================================"
    Write-Host "Timestamp: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
    Write-Host "Container: $containerId"
    Write-Host ""

    try {
        $s = Get-RedisStats -containerId $containerId
        Write-Host "Cache Hits:    $($s.Hits)"
        Write-Host "Cache Misses:  $($s.Misses)"
        Write-Host "Total:         $($s.Total)"
        Write-Host "Hit Rate:      $($s.HitRate)%"
    }
    catch {
        Write-Warning $_.Exception.Message
    }

    Start-Sleep -Seconds $RefreshInterval
}
