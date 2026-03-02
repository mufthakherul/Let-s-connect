# Batch Test Plan

This document describes a reproducible sequence of shell commands to exercise the full test plan used during the recent audit.  Running these commands in order (from the workspace root) will launch the Docker stack, verify health, and exercise API and UI flows across all services.

Commands assume PowerShell on Windows but can be adapted for bash by changing `Invoke-` calls to `curl` and adjusting quoting.

---

## 1. Start and build all services

```powershell
Set-Location 'E:/Miraz_Work/Let-s-connect'
docker compose up -d --build
```

Ensure `docker compose ps` shows all containers `Up (healthy)`.

---

## 2. Basic health checks

```powershell
# check a few health endpoints
curl.exe -s http://127.0.0.1:8000/health
curl.exe -s http://127.0.0.1:8001/health
curl.exe -s http://127.0.0.1:8002/health
```

All should return `200 OK` JSON.

---

## 3. Register a temporary user and store JWT

```powershell
$ts=[int][double]::Parse((Get-Date -UFormat %s))
$username="batchuser$ts"
$email="$username@example.com"
$password='P@ssw0rd!234'
$regBody=@{ username=$username; email=$email; password=$password; firstName='Batch'; lastName='Runner' } | ConvertTo-Json
$reg=Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8000/api/user/register' -ContentType 'application/json' -Body $regBody
$token=$reg.data.token
$headers=@{ Authorization="Bearer $token" }
Write-Output "Registered $username, token length $($token.Length)"
```

Use `$headers` for authenticated calls below.

---

## 4. Gateway API batch

```powershell
function T($name,$url,$method='GET',$body=$null){
  try {
    if($body){
      $resp=Invoke-WebRequest -UseBasicParsing -Method $method -Uri $url -Headers $headers -ContentType 'application/json' -Body $body;
    } else {
      $resp=Invoke-WebRequest -UseBasicParsing -Method $method -Uri $url -Headers $headers;
    };
    Write-Output ("PASS|"+$name+"|"+$resp.StatusCode);
  } catch {
    $code=$_.Exception.Response.StatusCode.value__;
    Write-Output ("FAIL|"+$name+"|"+$code);
  }
}

# collaboration
T 'collab_public_docs' 'http://127.0.0.1:8000/api/collaboration/public/docs'
T 'collab_public_wiki' 'http://127.0.0.1:8000/api/collaboration/public/wiki'

# media health
T 'media_health' 'http://127.0.0.1:8000/api/media/health'

# shop public products
T 'shop_public_products' 'http://127.0.0.1:8000/api/shop/public/products'

# streaming endpoints
T 'streaming_radio' 'http://127.0.0.1:8000/api/streaming/radio/stations'
T 'streaming_tv' 'http://127.0.0.1:8000/api/streaming/tv/channels'

# AI chat (must include messages array)
$aiBody=@{ messages=@(@{ role='user'; content='Say hello in one short sentence.' }); userId='batch-bot' } | ConvertTo-Json -Depth 6
T 'ai_chat' 'http://127.0.0.1:8000/api/ai/chat' 'POST' $aiBody
```

Expected output: all `PASS` lines.

---

## 5. Service-specific sanity tests (direct service URLs)

```powershell
# content service quick smoke
curl.exe -s http://127.0.0.1:8002/posts/feed/$username?filter=for_you

# messaging: create conversation
$conv=Invoke-RestMethod -Method Post -Uri 'http://127.0.0.1:8003/conversations' -Headers @{ 'x-user-id'=$username; 'x-internal-gateway-token'=$env:INTERNAL_GATEWAY_TOKEN } -ContentType 'application/json' -Body '{"name":"smokebatch","type":"direct","participants":["'$username'","2b8d4179-365a-4e5e-8886-627c11e2b8d3"]}'
Write-Output "created conv $($conv.id)"
```

---

## 6. Frontend E2E (Playwright)

```powershell
Set-Location 'E:/Miraz_Work/Let-s-connect/frontend'
npm run test:e2e
```

Should report all tests passed.

---

## 7. Additional utility commands

- Rebuild a single service after fixes: `docker compose up -d --build <service-name>`
- View logs: `docker compose logs <service-name> --tail 50`
- Restart stack: `docker compose restart`

---

### Notes

* Many services skip `sequelize.sync()` in `DB_SCHEMA_MODE=migrate`.  If you see `relation <X>` errors, add a small bootstrap helper (see examples in `content-service`, `shop-service`, etc.)
* Use `$headers` with a valid token for authenticated endpoints; or set `x-internal-gateway-token` directly for gateway-level calls.
* The plan is intentionally linear; commands can be placed in a script (`batch-test.ps1`) for automation.

---

This file should be checked into source control so any developer can re-run the suite with a single command.
