# Test Quarantine Directory

This directory contains tests that have been identified as "flaky" (intermittently failing) and quarantined from the critical-path test suite.

## Flaky Test Policy

### Criteria for Quarantine
A test is quarantined if it meets **any** of the following:
1. **2+ consecutive CI failures** in the same test
2. **Timing-dependent failures** (race conditions, setTimeout, async delays)
3. **External service dependency** not readily available in test environment
4. **Non-deterministic assertions** (array ordering, timestamp comparisons without tolerance)

### Quarantine Process
1. Move test file to `tests/quarantine/` with `@flaky` annotation in filename
2. Create issue/PR comment with:
   - Test name and failure pattern
   - Root cause analysis (if identified)
   - Steps to reproduce locally
   - Proposed fix
3. Link issue in test file comment
4. Re-enable test once root cause is fixed

### Re-enabling Tests
Once a flaky test is fixed:
1. Update test to handle identified issue (e.g., add retry logic, increase timeout, mock external service)
2. Run test locally 3× to verify stability
3. Move back to `tests/critical-path/` with same filename
4. Remove `@flaky` annotation and issue reference

## Current Quarantined Tests

*(None yet - this page documents policy for future use)*

---

## Example: Flaky Test Annotation

```javascript
/**
 * @flaky - Quarantined due to timing-sensitive fetch() call
 * @issue #234 - https://github.com/org/repo/issues/234
 * 
 * Root Cause: Test fails randomly when fetch timeout < actual latency
 * Fix: Increased timeout from 2s to 5s, add retry with exponential backoff
 * Fixed By: @contributor-name
 * Re-enabled: March 15, 2026
 */

// ... test code
```

---

## Preventing Flaky Tests

### Best Practices
- **Avoid setTimeout**: Use explicit waits (busy-loop, poll, or library like `wait-on`)
- **Mock external services**: Don't depend on live services in flaky test detection phase
- **Use deterministic test data**: Reference `fixtures.js` for predictable values
- **Add retry logic**: Implement exponential backoff for transient failures
- **Set appropriate timeouts**: Critical-path uses 10s default; increase if needed
- **Isolate tests**: No shared state, no test ordering dependencies

### Common Flaky Patterns to Avoid

❌ **Bad:** Race condition on async operation
```javascript
const res = await fetch(url);
// Test might fail if fetch takes > expected time
```

✅ **Good:** Explicit wait with timeout
```javascript
const res = await Promise.race([
  fetch(url, { signal: AbortSignal.timeout(5000) }),
  new Promise((_, rej) => setTimeout(() => rej(new Error('timeout')), 5000))
]);
```

❌ **Bad:** Dependency on current timestamp
```javascript
const userId = `user_${Date.now()}`;
// May collide if tests run in quick succession
```

✅ **Good:** Unique factory function
```javascript
const userId = newUserId();  // Uses random UUIDs
```

---

## Resources
- [Jest Best Practices](https://jestjs.io/docs/tutorial-react#setup)
- [Flaky Test Management](https://testing.googleblog.com/2016/05/flaky-tests-at-google-and-how-we.html)
- [Critical Path Tests](../WORKSTREAM_G_BASELINE.md)

---

**Owner:** Platform Engineering  
**Last Updated:** March 10, 2026
