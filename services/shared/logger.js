const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

function findNearestPackageDir(startDir) {
    let current = startDir;
    while (true) {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath)) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) break; // reached filesystem root
        current = parent;
    }
    return null;
}

function resolvePino() {
    const callerDir = module.parent && module.parent.filename
        ? path.dirname(module.parent.filename)
        : null;

    const candidateRoots = [
        callerDir,
        process.cwd(),
        __dirname,
    ].filter(Boolean);

    for (const root of candidateRoots) {
        const packageDir = findNearestPackageDir(root);
        if (!packageDir) continue;

        try {
            const requireFromPackage = createRequire(path.join(packageDir, 'package.json'));
            return requireFromPackage('pino');
        } catch (_error) {
            // try next candidate root
        }
    }

    try {
        return require('pino');
    } catch (_error) {
        return null;
    }
}

const pino = resolvePino();

if (!pino) {
    const fallback = {
        info: (...args) => console.log(...args),
        warn: (...args) => console.warn(...args),
        error: (...args) => console.error(...args),
        debug: (...args) => console.debug(...args),
        child: () => fallback,
    };
    module.exports = fallback;
} else {
    const logger = pino({
        level: process.env.LOG_LEVEL || 'info',
        formatters: {
            level: (label) => {
                return { level: label.toUpperCase() };
            },
        },
        timestamp: pino.stdTimeFunctions.isoTime,
    });

    module.exports = logger;
}
