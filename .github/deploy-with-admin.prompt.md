# Deploy With Admin Prompt

## Purpose
Guides deployment of the platform with the admin panel enabled, using Docker Compose's admin profile.

## Workflow
- Use `docker compose --profile admin up --build -d` to enable admin frontend
- Ensure admin-specific environment variables are set in `.env`
- Verify admin panel is accessible at the correct port (default: 3001)

## Example Prompts
- "Deploy with admin panel enabled"
- "Start platform including admin frontend"
- "Check admin panel deployment status"

---

_Last updated: March 9, 2026_
