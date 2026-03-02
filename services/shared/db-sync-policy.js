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

function getSchemaMode() {
    const isProd = process.env.NODE_ENV === 'production';
    const configuredMode = (process.env.DB_SCHEMA_MODE || '').trim().toLowerCase();
    if (configuredMode === 'sync' || configuredMode === 'migrate') {
        return configuredMode;
    }
    return isProd ? 'migrate' : 'sync';
}

function shouldRunSchemaSync(serviceName = 'unknown-service') {
    const isProd = process.env.NODE_ENV === 'production';
    const allowInProd = process.env.ALLOW_SCHEMA_SYNC_IN_PROD === 'true';
    const mode = getSchemaMode();

    if (mode !== 'sync') {
        console.log(`[DB Sync] ${serviceName}: Skipping sequelize.sync() because DB_SCHEMA_MODE=${mode}.`);
        return false;
    }

    if (isProd && !allowInProd) {
        console.warn(`[DB Sync] ${serviceName}: Skipping sequelize.sync() in production. Set ALLOW_SCHEMA_SYNC_IN_PROD=true only for emergency bootstrap.`);
        return false;
    }

    return true;
}

async function syncWithPolicy(sequelize, serviceName = 'unknown-service') {
    if (!shouldRunSchemaSync(serviceName)) {
        return false;
    }

    const syncOptions = getSafeSyncOptions(serviceName);
    await sequelize.sync(syncOptions);
    return true;
}

module.exports = {
    getSafeSyncOptions,
    getSchemaMode,
    shouldRunSchemaSync,
    syncWithPolicy
};
