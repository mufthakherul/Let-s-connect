function getSafeSyncOptions(serviceName = 'unknown-service') {
    const isProd = process.env.NODE_ENV === 'production';
    const allowInProd = process.env.ALLOW_SCHEMA_SYNC_IN_PROD === 'true';

    const requestedAlter = process.env.DB_SYNC_ALTER === 'true';
    const requestedForce = process.env.DB_SYNC_FORCE === 'true';

    if (isProd && !allowInProd) {
        if (requestedAlter || requestedForce) {
            console.warn(`[DB Sync] ${serviceName}: DB_SYNC_ALTER/DB_SYNC_FORCE ignored in production. Set ALLOW_SCHEMA_SYNC_IN_PROD=true to override.`);
        }
        return { alter: false, force: false };
    }

    return {
        alter: requestedAlter,
        force: requestedForce
    };
}

module.exports = {
    getSafeSyncOptions
};
