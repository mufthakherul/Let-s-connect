/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const projectRoot = process.cwd();
const buildDir = path.join(projectRoot, 'build');
const jsDir = path.join(buildDir, 'static', 'js');
const cssDir = path.join(buildDir, 'static', 'css');

const maxMainJsKb = Number(process.env.BUNDLE_BUDGET_MAIN_JS_KB || 350);
const maxTotalAssetsKb = Number(process.env.BUNDLE_BUDGET_TOTAL_KB || 900);

const toKb = (bytes) => Number((bytes / 1024).toFixed(2));

const gzipSize = (filePath) => {
  const content = fs.readFileSync(filePath);
  return zlib.gzipSync(content).length;
};

const listFiles = (dirPath, ext) => {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((name) => name.endsWith(ext))
    .map((name) => path.join(dirPath, name));
};

if (!fs.existsSync(buildDir)) {
  console.error('[bundle-budget] Build directory not found. Run npm run build first.');
  process.exit(1);
}

const jsFiles = listFiles(jsDir, '.js');
const cssFiles = listFiles(cssDir, '.css');

if (jsFiles.length === 0 && cssFiles.length === 0) {
  console.error('[bundle-budget] No build assets found.');
  process.exit(1);
}

const mainJsFile = jsFiles.find((file) => path.basename(file).startsWith('main.'));
if (!mainJsFile) {
  console.error('[bundle-budget] main.*.js not found in build output.');
  process.exit(1);
}

const mainJsGzip = gzipSize(mainJsFile);
const allAssets = [...jsFiles, ...cssFiles];
const totalGzip = allAssets.reduce((sum, file) => sum + gzipSize(file), 0);

console.log(`[bundle-budget] main.js gzip: ${toKb(mainJsGzip)} KB (budget: ${maxMainJsKb} KB)`);
console.log(`[bundle-budget] total static assets gzip: ${toKb(totalGzip)} KB (budget: ${maxTotalAssetsKb} KB)`);

const failures = [];
if (toKb(mainJsGzip) > maxMainJsKb) {
  failures.push(`main.js gzip exceeds budget (${toKb(mainJsGzip)} KB > ${maxMainJsKb} KB)`);
}
if (toKb(totalGzip) > maxTotalAssetsKb) {
  failures.push(`total assets gzip exceeds budget (${toKb(totalGzip)} KB > ${maxTotalAssetsKb} KB)`);
}

if (failures.length > 0) {
  console.error('[bundle-budget] Budget check failed:');
  failures.forEach((failure) => console.error(`  - ${failure}`));
  process.exit(1);
}

console.log('[bundle-budget] Budget check passed ✅');
