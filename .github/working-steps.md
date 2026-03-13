You are a senior DevOps engineer, backend engineer, frontend engineer, and QA automation specialist.

Your task is to fully audit, run, test, debug, and improve this entire project until it becomes stable, modern, and production-ready.

Follow all steps sequentially.

---

## STEP 1 — System Environment Check

Check if the following tools are installed and working:

* Docker
* Docker Compose
* Node.js
* npm
* Python (if used)
* Playwright
* Chrome DevTools tools

If any required tool is missing, install it automatically.

---

## STEP 2 — Docker Startup and Recovery

1. Check if Docker daemon is running.

2. If Docker is not running, start it using:

   sudo dockerd

3. Validate docker-compose.yml.

4. Build and start all services:

   docker compose build
   docker compose up -d

5. If any container fails:

   * analyze logs
   * fix Dockerfile or configuration
   * fix environment variables
   * rebuild until all services are healthy.

---

## STEP 3 — Improve Log System

Current logs are messy, uncategorized, and difficult to read.

Improve logging across all services.

Requirements:

Logs must include:

* timestamp
* service name
* module/component
* log level (INFO, WARN, ERROR, DEBUG)
* readable message

Example format:

[2026-03-13 12:45:11] [API-SERVICE] [INFO] Server started successfully

Logs should be:

* professional
* categorized
* readable
* structured
* optionally colorized

Remove unclear messages or non-standard text.

---

## STEP 4 — Detect and Fix Warnings

Scan all container logs for:

* warnings
* deprecated libraries
* container restart loops
* dependency issues
* startup failures

Fix all issues found.

---

## STEP 5 — Website Testing

Install Playwright if missing.

npm install -D playwright
npx playwright install

Use Playwright to automatically:

1. start the website
2. crawl all pages
3. open each page
4. capture:

   * console errors
   * console warnings
   * network failures
   * 404 errors
   * 500 errors

Log every issue found.

---

## STEP 6 — Fix Frontend Problems

Fix issues including:

* JavaScript runtime errors
* console warnings
* missing assets
* broken API requests
* hydration issues
* UI rendering bugs

Ensure browser console shows zero errors.

---

## STEP 7 — Fix Backend Problems

Identify and fix:

* HTTP 500 errors
* broken routes
* middleware issues
* API crashes
* database errors
* authentication problems

Trace errors to the source and repair them.

---

## STEP 8 — Test All Services

Test every running service:

* backend APIs
* database
* cache services
* worker services
* background tasks
* AI services

Ensure all services respond correctly and remain stable.

---

## STEP 9 — Verify All Admin Panels

Check all administrative interfaces.

Specifically test:

1. Web admin dashboard
2. CLI admin panel
3. AI admin interfaces
4. any other management interface

Verify:

* authentication works
* dashboards load correctly
* settings can be changed
* logs and monitoring pages work
* AI features respond properly
* admin commands execute successfully

Fix any broken admin functionality.

---

## STEP 10 — Storage and Disk Optimization

Check disk usage.

Identify:

* unused Docker images
* unused containers
* dangling volumes
* old logs
* build cache

Clean safely using commands such as:

docker system prune
docker image prune
docker volume prune

Free up disk space when needed.

Do NOT delete important project data.

---

## STEP 11 — Improve Code Quality

Refactor code to:

* remove dead code
* improve readability
* improve performance
* modernize outdated patterns
* improve error handling

---

## STEP 12 — Final Project Report

Generate a file:

project_audit_report.md

Include:

1. system environment status
2. docker status
3. services status
4. frontend issues fixed
5. backend issues fixed
6. admin panel verification
7. AI system verification
8. storage cleanup results
9. logs improvements
10. remaining risks

Goal: make the project clean, stable, modern, and production-ready.
