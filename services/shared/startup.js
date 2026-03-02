const { syncWithPolicy } = require('./db-sync-policy');

async function startServiceWithDatabase({
    serviceName,
    sequelize,
    start,
    beforeStart,
    onError
}) {
    try {
        await syncWithPolicy(sequelize, serviceName);

        if (typeof beforeStart === 'function') {
            await beforeStart();
        }

        await start();
    } catch (error) {
        if (typeof onError === 'function') {
            onError(error);
        } else {
            console.error(`[${serviceName}] startup failed:`, error);
        }
        process.exit(1);
    }
}

module.exports = {
    startServiceWithDatabase
};
