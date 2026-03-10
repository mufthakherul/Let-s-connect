const {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertStatusCode,
    assertHasProperties,
    assertTrue,
    newUserId,
    newEmail
} = require('./_helpers');

const API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://localhost:8000';

async function run() {
    const reachable = await isServiceReachable(API_GATEWAY_URL);
    skipIfUnreachable('api-gateway', API_GATEWAY_URL, reachable);

    console.log('🔗 Starting API Gateway contract tests...');

    // Test 1: Gateway health endpoint
    const healthRes = await fetchJson(`${API_GATEWAY_URL}/health`);
    assertNoServerError('gateway health', healthRes);
    assertStatusCode(healthRes, 200, 'gateway health');
    if (healthRes.data?.services) {
        assertTrue(typeof healthRes.data.services === 'object', 'health response includes services object');
    }

    // Test 2: Gateway routing - user service
    const email = newEmail('contract');
    const registerRes = await fetchJson(`${API_GATEWAY_URL}/auth/register`, {
        method: 'POST',
        body: JSON.stringify({
            username: `contracttest_${Date.now()}`,
            email,
            password: 'ContractTest123!',
            firstName: 'Contract',
            lastName: 'Test'
        })
    });
    assertNoServerError('gateway -> user-service register', registerRes);
    if (registerRes.status !== 404) {
        // Gateway may or may not expose this route; if it does, check structure
        if (registerRes.status < 500) {
            console.log(`  ✓ Register route returns ${registerRes.status}`);
        }
    }

    // Test 3: Gateway routing - content service
    const userId = newUserId();
    const postsRes = await fetchJson(`${API_GATEWAY_URL}/posts/feed/${userId}`);
    assertNoServerError('gateway -> content-service posts feed', postsRes);
    if (postsRes.status < 500) {
        console.log(`  ✓ Posts feed route returns ${postsRes.status}`);
    }

    // Test 4: Gateway routing - messaging service
    const convoRes = await fetchJson(`${API_GATEWAY_URL}/conversations/${userId}`);
    assertNoServerError('gateway -> messaging-service conversations', convoRes);
    if (convoRes.status < 500) {
        console.log(`  ✓ Conversations route returns ${convoRes.status}`);
    }

    // Test 5: Gateway routing - shop service
    const shopRes = await fetchJson(`${API_GATEWAY_URL}/products`);
    assertNoServerError('gateway -> shop-service products', shopRes);
    if (shopRes.status < 500) {
        console.log(`  ✓ Products route returns ${shopRes.status}`);
    }

    // Test 6: Gateway error envelope contract
    const errorRes = await fetchJson(`${API_GATEWAY_URL}/api/nonexistent-endpoint`);
    assertNoServerError('gateway error envelope', errorRes);
    if (errorRes.status === 404) {
        // Should return consistent error envelope, even for 404s
        if (errorRes.data && (errorRes.data.error || errorRes.data.message)) {
            console.log('  ✓ Gateway error envelope includes error/message field');
        }
    }

    // Test 7: Gateway resilience - verify timeout behavior
    // (This is a capability probe; actual timeout testing requires service simulation)
    const slowProbeRes = await fetchJson(`${API_GATEWAY_URL}/health?test=slow-probe`, {
        signal: AbortSignal.timeout(2000) // 2 second timeout
    }).catch(err => ({
        status: 'timeout',
        error: err.message,
        data: null
    }));
    
    if (slowProbeRes.status !== 'timeout') {
        console.log(`  ✓ Slow probe request handled (status: ${slowProbeRes.status})`);
    }

    // Test 8: Gateway circuit breaker state (via optional debug endpoint)
    const circuitBreakerRes = await fetchJson(`${API_GATEWAY_URL}/debug/circuit-breaker-state`);
    assertNoServerError('gateway circuit breaker debug endpoint', circuitBreakerRes);
    if (circuitBreakerRes.status !== 404) {
        if (circuitBreakerRes.data && typeof circuitBreakerRes.data === 'object') {
            console.log('  ✓ Circuit breaker state endpoint available');
        }
    } else {
        console.log('  ⏭️  Circuit breaker debug endpoint not exposed (expected for production)');
    }

    // Test 9: Gateway service discovery
    const servicesRes = await fetchJson(`${API_GATEWAY_URL}/admin/services`);
    assertNoServerError('gateway service discovery', servicesRes);
    if (servicesRes.status !== 404) {
        if (Array.isArray(servicesRes.data) || (servicesRes.data && typeof servicesRes.data === 'object')) {
            console.log('  ✓ Service discovery endpoint available');
        }
    } else {
        console.log('  ⏭️  Service discovery endpoint not exposed (expected for production)');
    }

    console.log('✅ API Gateway contract tests PASSED');
}

run().catch((err) => {
    console.error('❌ API Gateway contract tests FAILED:', err.message);
    process.exit(1);
});
