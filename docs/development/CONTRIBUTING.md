# Contributing to Milonexa

Thank you for your interest in contributing to the Milonexa platform! This document describes how to contribute effectively.

---

## Table of Contents

1. [Code of Conduct](#1-code-of-conduct)
2. [Submitting Issues](#2-submitting-issues)
3. [Submitting Pull Requests](#3-submitting-pull-requests)
4. [Branch Naming](#4-branch-naming)
5. [Commit Message Format](#5-commit-message-format)
6. [Code Style](#6-code-style)
7. [Frontend Build](#7-frontend-build)
8. [Testing Requirements](#8-testing-requirements)
9. [Documentation Requirements](#9-documentation-requirements)
10. [Archiving Deprecated Code & Docs](#10-archiving-deprecated-code--docs)
11. [API Response Format](#11-api-response-format)
12. [PR Review Process](#12-pr-review-process)
13. [Release Process](#13-release-process)

---

## 1. Code of Conduct

All contributors must adhere to our Code of Conduct:

- **Be respectful.** Treat all contributors with kindness and professionalism.
- **Be inclusive.** Welcome contributors of all backgrounds and experience levels.
- **Be constructive.** Provide feedback that helps others improve.
- **Be patient.** Understand that contributors have varying availability and priorities.

Harassment, discrimination, or disrespectful behaviour will not be tolerated. Violations may result in removal from the project.

---

## 2. Submitting Issues

### Bug Reports

When filing a bug report, include:

1. **Summary:** One-line description of the bug
2. **Environment:** OS, Node.js version, browser (for frontend bugs), Docker version
3. **Steps to reproduce:** Numbered list of exact steps
4. **Expected behaviour:** What should happen
5. **Actual behaviour:** What actually happens
6. **Logs:** Relevant error messages or stack traces
7. **Screenshots:** For UI bugs

### Feature Requests

When requesting a feature, include:

1. **Problem description:** What problem does this feature solve?
2. **Proposed solution:** How should the feature work?
3. **Alternatives considered:** Other approaches you've thought about
4. **Scope impact:** Which services/files would be affected?

### Before Filing

Search existing issues to avoid duplicates. Check both open and closed issues.

---

## 3. Submitting Pull Requests

### Prerequisites

- Fork the repository and clone your fork
- Create a feature branch from `develop` (not `main`)
- Ensure all CI checks pass locally before pushing

### PR Checklist

Before opening a PR, ensure:

- [ ] Code follows the style guide (ESLint passes)
- [ ] Tests are written for new functionality
- [ ] Existing tests still pass (`npm test`)
- [ ] Documentation is updated (if applicable)
- [ ] Deprecated code/docs are archived in `Archives/`
- [ ] API changes use `response.success()` / `response.error()` format
- [ ] PR description explains the change and links the related issue
- [ ] PR is against `develop`, not `main`

### PR Description Template

```markdown
## Summary
Brief description of the change.

## Related Issue
Closes #123

## Changes
- Added X feature to user-service
- Updated Y API endpoint to return Z
- Fixed bug where ABC happened when XYZ

## Testing
- [ ] Unit tests added
- [ ] Integration tests pass
- [ ] Manual testing performed (describe steps)

## Screenshots (if applicable)
```

---

## 4. Branch Naming

Use these prefixes for branch names:

| Prefix | When to Use | Example |
|---|---|---|
| `feature/` | New features | `feature/add-video-reactions` |
| `fix/` | Bug fixes | `fix/oauth-callback-csrf` |
| `docs/` | Documentation only | `docs/update-api-reference` |
| `chore/` | Maintenance, dependency updates | `chore/upgrade-socket-io-v4` |
| `refactor/` | Code refactoring without behaviour change | `refactor/extract-cache-manager` |
| `test/` | Adding or fixing tests only | `test/user-service-coverage` |
| `hotfix/` | Critical production fixes | `hotfix/jwt-validation-bypass` |

Branch names should be:
- Lowercase
- Hyphen-separated
- Descriptive but concise

---

## 5. Commit Message Format

Use **Conventional Commits** format:

```
<type>(<scope>): <subject>

[optional body]

[optional footer]
```

### Types

| Type | When to Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `docs` | Documentation changes |
| `style` | Formatting, missing semicolons (no logic change) |
| `refactor` | Code refactoring |
| `test` | Adding or updating tests |
| `chore` | Maintenance, dependency updates |
| `perf` | Performance improvements |
| `security` | Security fixes |

### Scopes

Use the service name or area as scope:

```
feat(user-service): add 2FA setup endpoint
fix(api-gateway): correct circuit breaker timeout config
docs(deployment): update kubernetes guide for v1.28
chore(frontend): upgrade material-ui to 5.16.0
```

### Subject Guidelines

- Use imperative mood: "add feature" not "added feature" or "adds feature"
- No period at the end
- Max 72 characters
- Reference issue numbers in footer: `Closes #123`

### Examples

```
feat(messaging-service): add message threading support

Add parent_id field to messages and return nested replies in
conversation queries.

Closes #456
```

```
fix(user-service): prevent OAuth state replay attacks

consumeState() now deletes the state entry immediately on first use,
preventing CSRF replay attacks with the same state token.

Security: CVE-2024-XXXX
```

---

## 6. Code Style

### ESLint

Run the linter before committing:

```bash
# Backend service
cd services/user-service
npm run lint

# Frontend
cd frontend
npm run lint
```

Fix auto-fixable issues:

```bash
npm run lint -- --fix
```

### General Rules

- **Indentation:** 2 spaces (no tabs)
- **Quotes:** Single quotes for strings
- **Semicolons:** Required
- **Trailing commas:** Required in multi-line expressions
- **Line length:** Max 100 characters
- **Arrow functions:** Preferred for callbacks
- **`const`/`let`:** Use `const` by default; `let` only when reassignment is needed; never `var`
- **`async/await`:** Prefer over `.then()/.catch()` chains
- **Error handling:** Always use try/catch with async functions

### Comments

Only comment code that genuinely needs clarification. Avoid:

```js
// Bad: obvious comment
const userId = req.headers['x-user-id']; // Get user ID from header

// Good: non-obvious explanation
// consumeState() deletes the entry to prevent CSRF replay attacks
const stateData = consumeState(req.query.state);
```

---

## 7. Frontend Build

### Development

```bash
cd frontend
npm install --legacy-peer-deps   # Always use --legacy-peer-deps
npm start
```

### Production Build

```bash
cd frontend
DISABLE_ESLINT_PLUGIN=true npx react-scripts build
```

The `DISABLE_ESLINT_PLUGIN=true` flag is required because `react-scripts` runs ESLint during build, and some peer dependency configurations cause false positives. The CI pipeline uses this flag.

### Bundle Size

Avoid importing entire libraries when only one function is needed:

```js
// Bad: imports entire lodash
import _ from 'lodash';
_.debounce(fn, 300);

// Good: imports only what's needed
import debounce from 'lodash/debounce';
debounce(fn, 300);
```

---

## 8. Testing Requirements

### Backend Tests

- Write tests for all new service endpoints
- Tests live in `services/<service-name>/tests/`
- Use Jest as the test runner
- Mock external dependencies (database, Redis, other services)
- Minimum 60% line coverage for new code

```bash
# Run tests for a service
cd services/user-service
npm test

# Run with coverage
npm test -- --coverage

# Run a specific test file
npm test -- tests/auth.test.js
```

### Frontend Tests

```bash
cd frontend
npm test -- --watchAll=false
```

### What to Test

- All new API endpoints (happy path + error cases)
- Authentication and authorisation logic
- Business logic in service functions
- Edge cases and input validation
- Middleware behaviour

### What Not to Test

- Third-party library internals
- Database ORM query syntax (trust Sequelize)
- Trivial getters/setters with no logic

---

## 9. Documentation Requirements

Update relevant documentation when:

- Adding a new API endpoint → update `docs/development/` and Swagger comments
- Changing environment variables → update `docs/deployment/ENVIRONMENT.md`
- Adding a new service → update `docs/development/MICROSERVICES.md`
- Changing authentication behaviour → update `docs/development/AUTHENTICATION.md`
- Changing Docker setup → update `docs/deployment/DOCKER.md`

Documentation changes can be submitted without code changes (use the `docs/` branch prefix).

---

## 10. Archiving Deprecated Code & Docs

When removing or replacing code or documentation, move the old version to the archive directories rather than deleting:

### Code

```bash
# Move deprecated service code
mv services/old-feature/ Archives/Archive_codes/old-feature/

# Move deprecated frontend component
mv frontend/src/components/OldComponent.jsx Archives/Archive_codes/OldComponent.jsx
```

### Documentation

```bash
# Move deprecated docs
mv docs/deployment/OLD_GUIDE.md Archives/Archive_docs/OLD_GUIDE.md
```

### Why Archive?

- Preserves historical context and implementation details
- Allows easy recovery if the deprecation is reversed
- Maintains a record of what was tried and removed

---

## 11. API Response Format

All API responses MUST use the shared `response-wrapper.js` helper:

```js
const response = require('../shared/response-wrapper');

// Success response
response.success(req, res, data, meta, statusCode);
// Produces: { success: true, data, meta, requestId }

// Error response
response.error(req, res, statusCode, message, details);
// Produces: { success: false, error: { message, details }, requestId }
```

**Never** use `res.json()` directly for API responses. This ensures:
- Consistent `requestId` propagation for distributed tracing
- Consistent `success` flag for clients
- Consistent pagination `meta` structure

---

## 12. PR Review Process

### For PR Authors

1. Open PR against `develop` with a clear description
2. Assign to yourself
3. Request reviews from at least one maintainer
4. Respond to all review comments within 48 hours
5. Re-request review after addressing feedback

### For Reviewers

1. Review within 2 business days
2. Use GitHub's "Request changes" or "Approve" decisions — avoid leaving comments without a decision
3. Focus feedback on: correctness, security, performance, test coverage
4. Approve when satisfied; only block for genuine issues

### Merge Requirements

- CI must pass (all GitHub Actions checks green)
- At least 1 approving review
- No unresolved "Request changes" reviews
- Branch must be up to date with `develop`

---

## 13. Release Process

Releases follow **semantic versioning** (`MAJOR.MINOR.PATCH`):

| Version bump | When |
|---|---|
| PATCH (1.0.x) | Bug fixes only |
| MINOR (1.x.0) | New features, backward compatible |
| MAJOR (x.0.0) | Breaking API changes |

### Release Steps

1. Create release branch from `develop`: `git checkout -b release/v1.2.0`
2. Update `CHANGELOG.md` with changes since last release
3. Bump versions in `package.json` files
4. Open PR from `release/v1.2.0` to `main`
5. After merge, create a git tag: `git tag v1.2.0`
6. CI automatically builds and pushes Docker images for tagged commits
7. Merge `main` back into `develop`
