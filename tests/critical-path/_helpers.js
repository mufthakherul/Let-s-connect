const { randomUUID } = require('crypto');

async function fetchJson(url, options = {}) {
    const res = await fetch(url, {
        ...options,
        headers: {
            'Content-Type': 'application/json',
            ...(options.headers || {})
        }
    });

    const text = await res.text();
    let data;
    try {
        data = text ? JSON.parse(text) : null;
    } catch (_err) {
        data = text;
    }

    return { status: res.status, ok: res.ok, data };
}

async function isServiceReachable(baseUrl) {
    try {
        const res = await fetch(`${baseUrl}/health`);
        return res.ok || res.status < 500;
    } catch (_err) {
        return false;
    }
}

function skipIfUnreachable(serviceName, baseUrl, reachable) {
    if (!reachable) {
        console.log(`⏭️  Skipping ${serviceName} critical-path test: service unreachable at ${baseUrl}`);
        process.exit(0);
    }
}

function assertNoServerError(step, result) {
    if (result.status >= 500) {
        throw new Error(`${step} failed with server error ${result.status}: ${JSON.stringify(result.data)}`);
    }
}

function assertEqual(actual, expected, message) {
    if (actual !== expected) {
        throw new Error(`Assertion failed: ${message}. Expected ${expected}, got ${actual}`);
    }
}

function assertTrue(condition, message) {
    if (!condition) {
        throw new Error(`Assertion failed: ${message}`);
    }
}

function assertStatusCode(result, expectedStatus, step) {
    if (result.status !== expectedStatus) {
        throw new Error(`${step} failed: expected status ${expectedStatus}, got ${result.status}. Response: ${JSON.stringify(result.data)}`);
    }
}

function assertStatusInRange(result, minStatus, maxStatus, step) {
    if (result.status < minStatus || result.status > maxStatus) {
        throw new Error(`${step} failed: expected status ${minStatus}-${maxStatus}, got ${result.status}`);
    }
}

function assertHasProperty(obj, prop, step) {
    if (obj === null || typeof obj !== 'object' || !prop in obj) {
        throw new Error(`${step} failed: expected object to have property '${prop}'. Object: ${JSON.stringify(obj)}`);
    }
}

function assertHasProperties(obj, props, step) {
    props.forEach(prop => assertHasProperty(obj, prop, `${step} -> ${prop}`));
}

function assertIsValidUUID(value, step) {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(value)) {
        throw new Error(`${step} failed: expected valid UUID, got '${value}'`);
    }
}

function assertIsValidEmail(value, step) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(value)) {
        throw new Error(`${step} failed: expected valid email, got '${value}'`);
    }
}

function newUserId() {
    return randomUUID();
}

function newEmail(prefix = 'testuser') {
    return `${prefix}.${Date.now()}.${Math.floor(Math.random() * 10000)}@example.com`;
}

function newUsername(prefix = 'user') {
    return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
}

// Test fixtures for deterministic seeded data
const fixtures = {
    users: {
        standard: {
            username: 'fixture_standard_user',
            email: 'fixture.standard@example.com',
            password: 'SecurePass123!',
            firstName: 'Fixture',
            lastName: 'User'
        },
        admin: {
            username: 'fixture_admin_user',
            email: 'fixture.admin@example.com',
            password: 'AdminPass123!',
            firstName: 'Admin',
            lastName: 'User'
        },
        blocked: {
            username: 'fixture_blocked_user',
            email: 'fixture.blocked@example.com',
            password: 'BlockedPass123!',
            firstName: 'Blocked',
            lastName: 'User'
        }
    },
    posts: {
        standard: {
            content: 'This is a test post about technology and innovation.',
            tags: ['tech', 'testing']
        },
        image: {
            content: 'Check out this image!',
            mediaUrls: ['https://example.com/image.jpg']
        },
        video: {
            content: 'Watch this video',
            mediaUrls: ['https://example.com/video.mp4']
        }
    },
    products: {
        electronic: {
            name: 'Test Laptop',
            description: 'A powerful test laptop',
            price: 999.99,
            category: 'Electronics'
        },
        book: {
            name: 'Test Book',
            description: 'An informative test book',
            price: 29.99,
            category: 'Books'
        }
    }
};

module.exports = {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertEqual,
    assertTrue,
    assertStatusCode,
    assertStatusInRange,
    assertHasProperty,
    assertHasProperties,
    assertIsValidUUID,
    assertIsValidEmail,
    newUserId,
    newEmail,
    newUsername,
    fixtures
};
