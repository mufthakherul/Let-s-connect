# SSH TUI Admin Dashboard

## Overview

The SSH TUI (Terminal User Interface) is the **fourth admin interface** for the Milonexa platform. It provides an interactive, terminal-based dashboard accessible via SSH — no browser required. Ideal for ops engineers who prefer the terminal or need emergency access from restricted environments.

The SSH TUI runs as part of `admin/ssh/server.js` and listens on port **2222** by default.

---

## Requirements

- `ENABLE_ADMIN_SSH=true` must be set in your environment
- SSH key (recommended) or password authentication configured
- Client must be on the IP allowlist (default: `127.0.0.1,::1`)

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `ENABLE_ADMIN_SSH` | Must be `'true'` to start the SSH server | `false` |
| `ADMIN_SSH_PORT` | Port the SSH server listens on | `2222` |
| `ADMIN_SSH_HOST` | Bind host/interface | `127.0.0.1` |
| `ADMIN_SSH_PASSWORD` | Password for the built-in `admin` user | *(unset)* |
| `ADMIN_SSH_AUTHORIZED_KEYS` | Path to an `authorized_keys` file | *(unset)* |
| `ADMIN_SSH_HOST_KEY_PATH` | Path to the host private key PEM file | *(unset — auto-generated)* |
| `ADMIN_SSH_MAX_SESSIONS` | Maximum concurrent SSH sessions | `5` |
| `ADMIN_SSH_IDLE_TIMEOUT` | Idle session timeout in seconds | `300` |
| `ADMIN_ALLOWED_IPS` | Comma-separated IP allowlist | `127.0.0.1,::1` |
| `ADMIN_SSH_BANNER` | Optional banner text displayed on connect | *(unset)* |
| `ADMIN_SSH_RECORD_SESSIONS` | Record sessions for audit replay | `true` |

---

## Starting the SSH Server

### Via Docker Compose (recommended)

```bash
docker compose --profile admin-ssh up -d
```

This starts the SSH TUI container with port `2222` exposed.

### Directly (development)

```bash
ENABLE_ADMIN_SSH=true \
ADMIN_SSH_PASSWORD=yourpassword \
node admin/ssh/server.js
```

---

## Connecting via SSH

```bash
# Password authentication
ssh admin@localhost -p 2222

# Key-based authentication
ssh -i ~/.ssh/admin_key admin@localhost -p 2222
```

If `ADMIN_SSH_BANNER` is set, the banner text is displayed immediately upon connection before the authentication prompt.

---

## TUI Commands Available via SSH Shell

Once authenticated, the following commands are available in the interactive TUI shell:

| Command | Description |
|---|---|
| `dashboard` | Open the full TUI dashboard (default view) |
| `status` | Platform-wide service status |
| `health` | Health check summary for all services |
| `metrics [name]` | View current metrics; optionally filter by name |
| `alerts` | List active alerts |
| `users` | User statistics |
| `logs [service]` | Stream logs for a service |
| `audit` | View recent audit log entries |
| `backup` | Trigger a manual backup |
| `restart <service>` | Restart a named service (requires admin role) |
| `remediate <issue>` | Request AI remediation for a described issue |
| `sla` | SLA status for all services |
| `costs` | Cost summary |
| `compliance` | Compliance status |
| `exit` | Disconnect the session |
| `help` | List all available commands |

---

## IP Allowlist Enforcement

All incoming SSH connections are validated against `ADMIN_ALLOWED_IPS` before authentication proceeds. Connections from unlisted IPs are immediately refused with no authentication prompt.

To allow additional IPs:

```bash
ADMIN_ALLOWED_IPS=127.0.0.1,::1,10.0.0.5,192.168.1.100
```

To allow all IPs (not recommended for production):

```bash
ADMIN_ALLOWED_IPS=0.0.0.0/0
```

---

## Session Recording

When `ADMIN_SSH_RECORD_SESSIONS=true` (the default), all SSH sessions are recorded as asciinema-compatible files for audit and replay.

**Recording storage location:**

```
.admin-cli/ssh/recordings/
  <timestamp>-<username>-<sessionId>.cast
```

Each recording captures all terminal input and output with timestamps.

### Replaying a Session

```bash
# List recordings
ls .admin-cli/ssh/recordings/

# Replay a recording (requires asciinema)
asciinema play .admin-cli/ssh/recordings/<recording-file>.cast
```

Session recordings are referenced by session ID in the audit log, allowing you to correlate audit events with full terminal recordings.

---

## Key Revocation

Revoked public keys are listed in `revoked-keys.json` in the admin configuration directory. Any key appearing in this file is denied, even if it appears in `authorized_keys`.

**Format of `revoked-keys.json`:**

```json
{
  "revokedKeys": [
    {
      "keyId": "SHA256:abc123...",
      "comment": "Compromised key — rotated 2026-03-01",
      "revokedAt": "2026-03-01T12:00:00Z",
      "revokedBy": "admin"
    }
  ]
}
```

To revoke a key, add its SHA256 fingerprint to this file and restart the SSH server (or send `SIGHUP` to reload configuration without dropping existing sessions).

---

## Break-Glass Override Procedure

In emergencies where normal authentication is unavailable:

1. On the host machine, run:
   ```bash
   node admin-cli/index.js set-role break-glass
   ```
2. A temporary one-time break-glass token is generated and printed to stdout.
3. Use this token as the SSH password within the token's validity window (default: 15 minutes).
4. All actions taken during a break-glass session are flagged in the audit log.
5. After resolving the emergency, reset the break-glass flag:
   ```bash
   node admin-cli/index.js reset-break-glass
   ```

Break-glass usage always triggers an alert notification to configured bot channels (Slack, Telegram, PagerDuty).

---

## Security Notes

- **Never expose port 2222 to the public internet.** Use a VPN, bastion host, or SSH port-forwarding.
- Use key-based authentication rather than passwords in production. Set `ADMIN_SSH_AUTHORIZED_KEYS` and leave `ADMIN_SSH_PASSWORD` unset.
- The host key is auto-generated on first start if `ADMIN_SSH_HOST_KEY_PATH` is not set. **Pin a stable host key in production** to prevent TOFU (trust-on-first-use) warnings and MITM risks.
- Set `ADMIN_SSH_MAX_SESSIONS` to a low value (e.g., `3`) in production to limit blast radius from a compromised credential.
- `ADMIN_SSH_IDLE_TIMEOUT` (default `300` seconds) automatically disconnects idle sessions to reduce exposure.
- All SSH connections, authentication attempts (success and failure), and commands are recorded in `.admin-cli/audit.log`.
