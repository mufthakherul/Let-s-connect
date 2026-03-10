const { spawn } = require('child_process');
const path = require('path');

const suites = [
    'auth-register-login-reset.test.js',
    'feed-create-read-engage.test.js',
    'messaging-send-receive-reconnect.test.js',
    'media-upload-list-delete.test.js',
    'shop-browse-cart-order.test.js',
    'admin-login-controls.test.js'
];

function runSuite(file) {
    return new Promise((resolve) => {
        const fullPath = path.join(__dirname, file);
        const child = spawn(process.execPath, [fullPath], { stdio: 'inherit' });
        child.on('close', (code) => resolve({ file, code }));
    });
}

(async () => {
    const results = [];

    for (const suite of suites) {
        // eslint-disable-next-line no-await-in-loop
        const result = await runSuite(suite);
        results.push(result);
    }

    const failed = results.filter((r) => r.code !== 0);
    if (failed.length > 0) {
        console.error('❌ Critical-path baseline failed', { failed: failed.map((f) => f.file) });
        process.exit(1);
    }

    console.log('✅ All Workstream G critical-path baseline suites completed');
})();
