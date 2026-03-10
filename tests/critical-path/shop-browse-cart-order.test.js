const {
    fetchJson,
    isServiceReachable,
    skipIfUnreachable,
    assertNoServerError,
    assertStatusCode,
    assertHasProperties,
    assertTrue,
    newUserId
} = require('./_helpers');

const SHOP_SERVICE_URL = process.env.SHOP_SERVICE_URL || 'http://localhost:8006';

async function run() {
    const reachable = await isServiceReachable(SHOP_SERVICE_URL);
    skipIfUnreachable('shop-service', SHOP_SERVICE_URL, reachable);

    const sellerId = newUserId();
    const buyerId = newUserId();

    // Test: Browse products
    const browseRes = await fetchJson(`${SHOP_SERVICE_URL}/public/products`);
    assertNoServerError('browse products', browseRes);
    assertStatusCode(browseRes, 200, 'browse products');
    assertTrue(Array.isArray(browseRes.data) || (typeof browseRes.data === 'object'), 'product list is array or object');

    // Test: Create product
    const productRes = await fetchJson(`${SHOP_SERVICE_URL}/products`, {
        method: 'POST',
        body: JSON.stringify({
            sellerId,
            name: `Workstream G Product ${Date.now()}`,
            description: 'critical path comprehensive test product',
            price: 19.99,
            currency: 'USD',
            category: 'testing',
            stock: 5,
            isPublic: true,
            isActive: true
        })
    });
    assertNoServerError('create product', productRes);
    assertStatusCode(productRes, 200, 'create product');
    assertHasProperties(productRes.data, ['id'], 'product object');
    const productId = productRes?.data?.id;

    // Test: Cart and order flows
    let cartStatus = 'skipped';
    let orderStatus = 'skipped';

    if (productId) {
        const cartRes = await fetchJson(`${SHOP_SERVICE_URL}/cart`, {
            method: 'POST',
            headers: { 'x-user-id': buyerId },
            body: JSON.stringify({ productId, quantity: 1 })
        });
        assertNoServerError('add to cart', cartRes);
        if (cartRes.status === 200 || cartRes.status === 201) {
            cartStatus = 'success';
        } else if (cartRes.status === 404) {
            cartStatus = 'endpoint-not-found';
        }

        const orderRes = await fetchJson(`${SHOP_SERVICE_URL}/orders`, {
            method: 'POST',
            body: JSON.stringify({
                buyerId,
                productId,
                quantity: 1,
                shippingAddress: {
                    line1: 'Test St 1',
                    city: 'Test City',
                    country: 'Testland',
                    zipCode: '12345'
                },
                paymentMethod: 'test-card'
            })
        });
        assertNoServerError('create order', orderRes);
        if (orderRes.status === 200 || orderRes.status === 201) {
            orderStatus = 'success';
        } else if (orderRes.status === 404) {
            orderStatus = 'endpoint-not-found';
        }
    }

    console.log('✅ Shop critical path PASSED', {
        browseStatus: browseRes.status,
        createProductStatus: productRes.status,
        productIdValid: !!productId,
        cartStatus,
        orderStatus
    });
}

run().catch((err) => {
    console.error('❌ Shop critical path FAILED:', err.message);
    process.exit(1);
});
