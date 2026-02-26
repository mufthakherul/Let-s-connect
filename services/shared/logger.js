const path = require('path');
const fs = require('fs');
const { createRequire } = require('module');

// Locate the nearest ancestor directory (above shared) that contains a package.json
function findServiceRoot(startDir) {
    let current = startDir;
    while (true) {
        const pkgPath = path.join(current, 'package.json');
        if (fs.existsSync(pkgPath) && current !== __dirname) {
            return current;
        }
        const parent = path.dirname(current);
        if (parent === current) break; // reached filesystem root
        current = parent;
    }
    // fallback to shared itself
    return __dirname;
}

const serviceRoot = findServiceRoot(__dirname);
const requireFromService = createRequire(path.join(serviceRoot, 'package.json'));
const pino = requireFromService('pino');

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
