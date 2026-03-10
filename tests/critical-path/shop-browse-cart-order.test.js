const {
  fetchJson,
  isServiceReachable,
  skipIfUnreachable,
  assertNoServerError,
  newUserId
} = require('./_helpers');

const SHOP_SERVICE_URL = process.env.SHOP_SERVICE_URL || 'http://localhost:8006';

async function run() {
  const reachable = await isServiceReachable(SHOP_SERVICE_URL);
  skipIfUnreachable('shop-service', SHOP_SERVICE_URL, reachable);

  const sellerId = newUserId();
  const buyerId = newUserId();

  const browseRes = await fetchJson(`${SHOP_SERVICE_URL}/public/products`);
  assertNoServerError('browse products', browseRes);

  const productRes = await fetchJson(`${SHOP_SERVICE_URL}/products`, {
    method: 'POST',
    body: JSON.stringify({
      sellerId,
      name: `Workstream G Product ${Date.now()}`,
      description: 'critical path baseline product',
      price: 19.99,
      currency: 'USD',
      category: 'testing',
      stock: 5,
      isPublic: true,
      isActive: true
    })
  });
  assertNoServerError('create product', productRes);

  const productId = productRes?.data?.id;
  let cartStatus = 'skipped';
  let orderStatus = 'skipped';

  if (productId) {
    const cartRes = await fetchJson(`${SHOP_SERVICE_URL}/cart`, {
      method: 'POST',
      headers: { 'x-user-id': buyerId },
      body: JSON.stringify({ productId, quantity: 1 })
    });
    assertNoServerError('add to cart', cartRes);
    cartStatus = cartRes.status;

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
    orderStatus = orderRes.status;
  }

  console.log('✅ Shop critical path baseline passed', {
    browseStatus: browseRes.status,
    createProductStatus: productRes.status,
    cartStatus,
    orderStatus
  });
}

run().catch((err) => {
  console.error('❌ Shop critical path baseline failed:', err);
  process.exit(1);
});
