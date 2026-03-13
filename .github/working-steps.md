PROJECT TASK: Full Admin System Refactor, Security Hardening, and Stealth Authentication Upgrade

OBJECTIVE
Analyze the entire repository and upgrade the admin system architecture to a modern, secure, and maintainable structure. Refactor the admin-web interface into a stealth authentication portal with multi-step verification while preserving existing functionality.

PHASE 1 — REPOSITORY ANALYSIS

Scan the entire repository and generate a structural map.

Identify:

* frontend directories
* backend services
* admin-web frontend
* CLI admin panel
* authentication logic
* database models
* API routes
* middleware
* environment configuration
* email services
* logging systems

Detect and report:

* incomplete features
* dead code
* disconnected frontend/backend routes
* unused dependencies
* weak authentication logic
* security vulnerabilities

Create analysis report:

docs/system-analysis.md

Include:

* architecture overview
* system components
* detected problems
* improvement suggestions

---

PHASE 2 — ADMIN WEB STEALTH INTERFACE

Refactor admin-web login interface.

Requirements:

The admin login page must look like a blank anonymous page.

Remove:

* title
* SEO tags
* meta tags
* favicon
* identifiable HTML attributes
* branding
* framework identifiers where possible

Page should visually appear as a minimal animation canvas.

CENTER UI

Two blank input boxes appear.

Box 1 animation:
Characters typed fall downward.

Box 2 animation:
Characters typed float upward as bubbles.

Collision system:
If both inputs exist:
falling letters collide with bubbles
bubbles pop
letters fall down

Extra characters behave independently.

All animations must be handled in a modular frontend component.

---

PHASE 3 — HIDDEN AUTHENTICATION SYSTEM

Input box roles:

Box 1:
username OR email

Box 2:
password

Server behavior:

Every input change is silently stored.

Frontend animation should simulate echo responses but must not reveal real server validation.

Authentication trigger:

1. user types username/email
2. user types password
3. user deletes last character of box1
4. user retypes the same character

This action triggers authentication.

---

PHASE 4 — MULTI STEP VERIFICATION

STEP 1

If username/email match database:

If username used:
request email

If email used:
request username

Minimal interface only:
input field
Proceed button

If mismatch:
no error message
no logs
no warnings
continue animation silently.

STEP 2

Send verification code to email.

Code length:
6–8 digits.

User submits code.

If valid:
login successful
redirect to admin dashboard.

---

PHASE 5 — ADMIN ACCOUNT POLICY

Disable public admin registration.

Use environment variables:

MASTER_ADMIN_EMAIL
MASTER_ADMIN_USERNAME
MASTER_ADMIN_PASSWORD

On server startup:

Check if master admin exists.
If not, automatically create it.

---

PHASE 6 — ADMIN MANAGEMENT SYSTEM

Inside admin dashboard:

Master admin can:

create new admins
delete admins
change admin roles
disable accounts

Permissions system required.

---

PHASE 7 — SECURITY HARDENING

Implement:

rate limiting
input sanitization
secure password hashing
CSRF protection
secure cookies
session validation
email verification timeout
IP anomaly detection

Remove:

console authentication logs
debug responses
sensitive stack traces

Ensure:

no response reveals login success/failure conditions.

---

PHASE 8 — CLI ADMIN PANEL IMPROVEMENT

Upgrade existing CLI admin tools.

Add commands:

admin:list
admin:create
admin:disable
admin:logs
admin:verify

Improve CLI output:

professional formatting
categorized logs
readable tables
clear status indicators.

---

PHASE 9 — CODE QUALITY IMPROVEMENTS

Ensure:

modular code architecture
clean separation of concerns
consistent naming conventions
error handling
testable authentication services

Upgrade outdated code patterns.

---

PHASE 10 — ARCHITECTURE DOCUMENTATION

Generate documentation files.

docs/admin-auth-system.md
docs/security-architecture.md
docs/admin-workflow.md

Include:

authentication flow
admin management flow
security design
environment configuration

Generate diagrams:

authentication flow diagram
admin system architecture diagram
API interaction map

---

PHASE 11 — FINAL VALIDATION

After refactor verify:

admin-web runs correctly
stealth login interface loads
animations function properly
authentication flow works
email verification works
admin dashboard loads
master admin creation works
CLI admin tools function correctly

Fix any detected issues.

Finally generate:

docs/refactor-summary.md

Include:
files modified
files added
security improvements
feature upgrades
remaining recommendations
