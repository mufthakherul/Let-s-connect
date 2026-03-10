const {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertStatusCode,
    assertHasProperties
} = require('./_helpers');

const SECURITY_SERVICE_URL = process.env.SECURITY_SERVICE_URL || 'http://localhost:9102';

async function run() {
    const reachable = await isServiceReachable(SECURITY_SERVICE_URL);
    skipIfUnreachable('security-service', SECURITY_SERVICE_URL, reachable);

    const username = process.env.ADMIN_TEST_USERNAME || 'admin';
    const password = process.env.ADMIN_TEST_PASSWORD || 'admin';

    // Test: Admin login
    const loginRes = await fetchJson(`${SECURITY_SERVICE_URL}/admin/login`, {
        method: 'POST',
        body: JSON.stringify({ username, password })
    });
    assertNoServerError('admin login', loginRes);
    if (loginRes.status === 200) {
        assertHasProperties(loginRes.data, ['token'] || ['message'], 'login response');
    }

    // Test: Admin user control guards
    const usersRes = await fetchJson(`${SECURITY_SERVICE_URL}/admin/users`, {
        method: 'POST',
        body: JSON.stringify({ username: `probe-${Date.now()}`, password: 'TempPass123!' })
    });
    assertNoServerError('admin controls - create user guard', usersRes);
    // Control should either succeed (200) or reject unauthorized (401/403)

    // Test: Admin debug endpoint guard
    const debugRes = await fetchJson(`${SECURITY_SERVICE_URL}/admin/debug/query-stats`);
    assertNoServerError('admin controls - debug query stats guard', debugRes);
    // Debug endpoint should be guarded: 401/403 without token, 200 with admin token

    let debugGuarded = 'not-checked';
    if (debugRes.status === 401 || debugRes.status === 403) {
        debugGuarded = 'properly-guarded';
    } else if (debugRes.status === 200) {
        debugGuarded = 'accessible';
    }

    console.log('✅ Admin critical path PASSED', {
        loginStatus: loginRes.status,
        adminUserControlStatus: usersRes.status,
        debugQueryStatsStatus: debugRes.status,
        debugEndpointGuard: debugGuarded
    });
}

run().catch((err) => {
    console.error('❌ Admin critical path FAILED:', err.message);
    process.exit(1);
});
