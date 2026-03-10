const {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError
} = require('./_helpers');

const SECURITY_SERVICE_URL = process.env.SECURITY_SERVICE_URL || 'http://localhost:9102';

async function run() {
  const reachable = await isServiceReachable(SECURITY_SERVICE_URL);
  skipIfUnreachable('security-service', SECURITY_SERVICE_URL, reachable);

  const username = process.env.ADMIN_TEST_USERNAME || 'admin';
  const password = process.env.ADMIN_TEST_PASSWORD || 'admin';

  const loginRes = await fetchJson(`${SECURITY_SERVICE_URL}/admin/login`, {
    method: 'POST',
    body: JSON.stringify({ username, password })
  });
  assertNoServerError('admin login', loginRes);

  const usersRes = await fetchJson(`${SECURITY_SERVICE_URL}/admin/users`, {
    method: 'POST',
    body: JSON.stringify({ username: `probe-${Date.now()}`, password: 'TempPass123!' })
  });
  assertNoServerError('admin controls - create user guard', usersRes);

  const debugRes = await fetchJson(`${SECURITY_SERVICE_URL}/admin/debug/query-stats`);
  assertNoServerError('admin controls - debug query stats guard', debugRes);

  console.log('✅ Admin critical path baseline passed', {
    loginStatus: loginRes.status,
    adminUserControlStatus: usersRes.status,
    debugQueryStatsStatus: debugRes.status
  });
}

run().catch((err) => {
  console.error('❌ Admin critical path baseline failed:', err);
  process.exit(1);
});
