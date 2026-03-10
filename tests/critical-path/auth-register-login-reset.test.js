const {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertStatusCode,
    assertHasProperties,
    assertIsValidEmail,
    assertIsValidUUID,
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

    // Test: Register new user
    const registerRes = await fetchJson(`${USER_SERVICE_URL}/register`, {
        method: 'POST',
        body: JSON.stringify({ username, email, password, firstName: 'Test', lastName: 'User' })
    });
    assertNoServerError('register', registerRes);
    assertStatusCode(registerRes, 200, 'register');
    assertHasProperties(registerRes.data, ['user', 'token'], 'register response');
    if (registerRes.data.user) {
        assertHasProperties(registerRes.data.user, ['id', 'username', 'email'], 'register user object');
        assertIsValidUUID(registerRes.data.user.id, 'register user id');
    }

    // Test: Login with registered user
    const loginRes = await fetchJson(`${USER_SERVICE_URL}/login`, {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    assertNoServerError('login', loginRes);
    assertStatusCode(loginRes, 200, 'login');
    assertHasProperties(loginRes.data, ['user', 'token'], 'login response');
    if (loginRes.data.token) {
        if (typeof loginRes.data.token === 'string' && loginRes.data.token.length > 20) {
            // Valid JWT-like token
        }
    }

    // Test: Check username existence
    const checkUsernameRes = await fetchJson(`${USER_SERVICE_URL}/check-username?username=${encodeURIComponent(username)}`);
    assertNoServerError('check-username', checkUsernameRes);
    assertStatusCode(checkUsernameRes, 200, 'check-username');
    assertHasProperties(checkUsernameRes.data, ['available'], 'check-username response');

    // Test: Password reset endpoint probes
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
            assertHasProperties(res.data, ['message', 'success'] || ['message'], `password-reset ${path} response`);
            break;
        }
    }

    console.log('✅ Auth critical path PASSED', {
        registerStatus: registerRes.status,
        loginStatus: loginRes.status,
        checkUsernameStatus: checkUsernameRes.status,
        passwordResetEndpointPresent: resetSupported,
        userIdValid: registerRes.data?.user?.id ? 'yes' : 'no',
        tokenPresent: !!loginRes.data?.token
    });
}

run().catch((err) => {
    console.error('❌ Auth critical path FAILED:', err.message);
    process.exit(1);
});
