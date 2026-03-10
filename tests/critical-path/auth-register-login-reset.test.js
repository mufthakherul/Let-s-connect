const {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError,
  newEmail,
  newUsername
} = require('./_helpers');

const USER_SERVICE_URL = process.env.USER_SERVICE_URL || 'http://localhost:8001';

async function run() {
  const reachable = await isServiceReachable(USER_SERVICE_URL);
  skipIfUnreachable('user-service', USER_SERVICE_URL, reachable);

  const username = newUsername('auth');
  const email = newEmail('auth');
  const password = 'SecurePass123!';

  const registerRes = await fetchJson(`${USER_SERVICE_URL}/register`, {
    method: 'POST',
    body: JSON.stringify({ username, email, password, firstName: 'Test', lastName: 'User' })
  });
  assertNoServerError('register', registerRes);

  const loginRes = await fetchJson(`${USER_SERVICE_URL}/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });
  assertNoServerError('login', loginRes);

  const checkUsernameRes = await fetchJson(`${USER_SERVICE_URL}/check-username?username=${encodeURIComponent(username)}`);
  assertNoServerError('check-username', checkUsernameRes);

  const resetCandidates = [
    '/forgot-password',
    '/password-reset/request',
    '/forgot'
  ];

  let resetSupported = false;
  for (const path of resetCandidates) {
    const res = await fetchJson(`${USER_SERVICE_URL}${path}`, {
      method: 'POST',
      body: JSON.stringify({ email })
    });
    assertNoServerError(`password-reset probe ${path}`, res);
    if (res.status !== 404 && res.status !== 405) {
      resetSupported = true;
      break;
    }
  }

  console.log('✅ Auth critical path baseline passed', {
    registerStatus: registerRes.status,
    loginStatus: loginRes.status,
    checkUsernameStatus: checkUsernameRes.status,
    passwordResetEndpointPresent: resetSupported
  });
}

run().catch((err) => {
  console.error('❌ Auth critical path baseline failed:', err);
  process.exit(1);
});
