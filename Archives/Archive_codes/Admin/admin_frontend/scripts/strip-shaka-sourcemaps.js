const fs = require('fs');
const path = require('path');

const targets = [
    path.join(__dirname, '..', 'node_modules', 'shaka-player', 'dist', 'shaka-player.ui.js'),
    path.join(__dirname, '..', 'node_modules', 'shaka-player', 'dist', 'controls.css')
];

const stripSourceMapRefs = (content) => {
    return content
        .replace(/\r?\n\/\/# sourceMappingURL=.*$/gm, '')
        .replace(/\/\*# sourceMappingURL=[^*]*\*\//gm, '')
        .replace(/\r?\n$/g, '\n');
};

for (const target of targets) {
    try {
        if (!fs.existsSync(target)) {
            continue;
        }

        const original = fs.readFileSync(target, 'utf8');
        const cleaned = stripSourceMapRefs(original);

        if (cleaned !== original) {
            fs.writeFileSync(target, cleaned, 'utf8');
            console.log(`[strip-shaka-sourcemaps] cleaned: ${path.basename(target)}`);
        }
    } catch (error) {
        console.warn(`[strip-shaka-sourcemaps] failed for ${target}: ${error.message}`);
    }
}
