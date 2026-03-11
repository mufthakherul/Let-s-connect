'use strict';
/**
 * mtls.js — Mutual TLS (mTLS) support for admin panel connections
 *
 * Provides:
 *  - Certificate Authority management (generate self-signed CA)
 *  - Client certificate issuance for CLI and API clients
 *  - Certificate validation and revocation checking (CRL)
 *  - Helper to create HTTPS server options with mTLS enforcement
 *  - Helper to create HTTPS agent for client requests
 *
 * Env vars:
 *   ADMIN_MTLS_ENABLED     — 'true' to enable mTLS (default: false)
 *   ADMIN_MTLS_CA_CERT     — path to CA cert PEM
 *   ADMIN_MTLS_CLIENT_CERT — path to client cert PEM
 *   ADMIN_MTLS_CLIENT_KEY  — path to client private key PEM
 *   ADMIN_CERT_DIR         — directory for generated certs (default: .admin-cli/certs)
 */

const fs = require('fs');
const path = require('path');
const https = require('https');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const DEFAULT_CERT_DIR = process.env.ADMIN_CERT_DIR || path.join(process.env.HOME || '.', '.admin-cli', 'certs');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function ensureDir(dir) {
    fs.mkdirSync(dir, { recursive: true });
}

function opensslAvailable() {
    const result = spawnSync('openssl', ['version'], { encoding: 'utf8' });
    return result.status === 0;
}

function runOpenssl(args, input) {
    const opts = { encoding: 'utf8', stdio: input ? ['pipe', 'pipe', 'pipe'] : undefined };
    const result = spawnSync('openssl', args, opts);
    if (result.status !== 0) {
        throw new Error(`openssl failed: ${result.stderr || result.error}`);
    }
    return result.stdout;
}

// ---------------------------------------------------------------------------
// generateSelfSignedCA
// ---------------------------------------------------------------------------

/**
 * Generate a self-signed CA key + cert and store them in storeDir.
 * Requires openssl on PATH. If not available, returns { instructions, openssl_commands }.
 *
 * @param {string} storeDir  Directory where ca.key and ca.crt are written
 * @returns {{ caKeyPath: string, caCertPath: string } | { instructions: string, openssl_commands: string[] }}
 */
function generateSelfSignedCA(storeDir = DEFAULT_CERT_DIR) {
    ensureDir(storeDir);

    const caKeyPath = path.join(storeDir, 'ca.key');
    const caCertPath = path.join(storeDir, 'ca.crt');

    const cmds = [
        `openssl genrsa -out ${caKeyPath} 4096`,
        `openssl req -new -x509 -days 3650 -key ${caKeyPath} -out ${caCertPath} -subj "/CN=AdminCA/O=Milonexa/OU=Admin"`,
    ];

    if (!opensslAvailable()) {
        return {
            instructions: [
                'openssl is not available on this system.',
                'Run the following commands manually to create a self-signed CA:',
                ...cmds,
            ].join('\n'),
            openssl_commands: cmds,
        };
    }

    runOpenssl(['genrsa', '-out', caKeyPath, '4096']);
    runOpenssl([
        'req', '-new', '-x509', '-days', '3650',
        '-key', caKeyPath,
        '-out', caCertPath,
        '-subj', '/CN=AdminCA/O=Milonexa/OU=Admin',
    ]);

    return { caKeyPath, caCertPath };
}

// ---------------------------------------------------------------------------
// issueCertificate
// ---------------------------------------------------------------------------

/**
 * Issue a signed client certificate.
 *
 * @param {{ caKeyPath: string, caCertPath: string, commonName: string, outputDir: string }}
 * @returns {{ certPath: string, keyPath: string, serial: string }}
 */
function issueCertificate({ caKeyPath, caCertPath, commonName, outputDir }) {
    outputDir = outputDir || DEFAULT_CERT_DIR;
    ensureDir(outputDir);

    const safeName = commonName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const keyPath = path.join(outputDir, `${safeName}.key`);
    const csrPath = path.join(outputDir, `${safeName}.csr`);
    const certPath = path.join(outputDir, `${safeName}.crt`);
    const serial = crypto.randomBytes(8).toString('hex').toUpperCase();

    if (!opensslAvailable()) {
        throw new Error('openssl is required to issue certificates but was not found on PATH');
    }

    runOpenssl(['genrsa', '-out', keyPath, '2048']);
    runOpenssl([
        'req', '-new',
        '-key', keyPath,
        '-out', csrPath,
        '-subj', `/CN=${commonName}/O=Milonexa/OU=Admin`,
    ]);
    runOpenssl([
        'x509', '-req',
        '-days', '365',
        '-in', csrPath,
        '-CA', caCertPath,
        '-CAkey', caKeyPath,
        '-set_serial', `0x${serial}`,
        '-out', certPath,
    ]);

    try { fs.unlinkSync(csrPath); } catch (_) { /* ignore */ }

    return { certPath, keyPath, serial };
}

// ---------------------------------------------------------------------------
// loadCACert
// ---------------------------------------------------------------------------

/**
 * Load a CA certificate PEM from disk.
 * @param {string} certPath
 * @returns {Buffer}
 */
function loadCACert(certPath) {
    return fs.readFileSync(certPath);
}

// ---------------------------------------------------------------------------
// buildServerOptions
// ---------------------------------------------------------------------------

/**
 * Build options suitable for https.createServer() that enforce mTLS.
 * Reads cert files from certDir (ca.crt, server.crt, server.key).
 * Falls back to env vars ADMIN_MTLS_CA_CERT, etc.
 *
 * @param {string} certDir
 * @returns {object} options for https.createServer
 */
function buildServerOptions(certDir = DEFAULT_CERT_DIR) {
    const caPath = process.env.ADMIN_MTLS_CA_CERT || path.join(certDir, 'ca.crt');
    const certPath = process.env.ADMIN_MTLS_CLIENT_CERT || path.join(certDir, 'server.crt');
    const keyPath = process.env.ADMIN_MTLS_CLIENT_KEY || path.join(certDir, 'server.key');

    return {
        ca: fs.readFileSync(caPath),
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        requestCert: true,
        rejectUnauthorized: true,
    };
}

// ---------------------------------------------------------------------------
// buildClientAgent
// ---------------------------------------------------------------------------

/**
 * Build an https.Agent configured with client certificate for mTLS.
 * @param {string} certDir
 * @returns {https.Agent}
 */
function buildClientAgent(certDir = DEFAULT_CERT_DIR) {
    const caPath = process.env.ADMIN_MTLS_CA_CERT || path.join(certDir, 'ca.crt');
    const certPath = process.env.ADMIN_MTLS_CLIENT_CERT || path.join(certDir, 'client.crt');
    const keyPath = process.env.ADMIN_MTLS_CLIENT_KEY || path.join(certDir, 'client.key');

    return new https.Agent({
        ca: fs.readFileSync(caPath),
        cert: fs.readFileSync(certPath),
        key: fs.readFileSync(keyPath),
        rejectUnauthorized: true,
    });
}

// ---------------------------------------------------------------------------
// validateCert
// ---------------------------------------------------------------------------

/**
 * Validate that certPem is signed by caCertPem using openssl verify.
 * @param {string} certPem  PEM string of client cert
 * @param {string} caCertPem  PEM string of CA cert
 * @returns {boolean}
 */
function validateCert(certPem, caCertPem) {
    if (!opensslAvailable()) {
        throw new Error('openssl is required for certificate validation');
    }

    const tmpDir = require('os').tmpdir();
    const certFile = path.join(tmpDir, `mtls_validate_cert_${Date.now()}.pem`);
    const caFile = path.join(tmpDir, `mtls_validate_ca_${Date.now()}.pem`);

    try {
        fs.writeFileSync(certFile, certPem, 'utf8');
        fs.writeFileSync(caFile, caCertPem, 'utf8');

        const result = spawnSync('openssl', ['verify', '-CAfile', caFile, certFile], { encoding: 'utf8' });
        return result.status === 0 && result.stdout.includes('OK');
    } finally {
        try { fs.unlinkSync(certFile); } catch (_) { /* ignore */ }
        try { fs.unlinkSync(caFile); } catch (_) { /* ignore */ }
    }
}

// ---------------------------------------------------------------------------
// getCertInfo
// ---------------------------------------------------------------------------

/**
 * Extract metadata from a PEM certificate.
 * @param {string} certPem  PEM string
 * @returns {{ subject: string, issuer: string, validFrom: string, validTo: string, fingerprint: string }}
 */
function getCertInfo(certPem) {
    if (!opensslAvailable()) {
        throw new Error('openssl is required to inspect certificates');
    }

    const tmpDir = require('os').tmpdir();
    const certFile = path.join(tmpDir, `mtls_info_${Date.now()}.pem`);

    try {
        fs.writeFileSync(certFile, certPem, 'utf8');

        const subjectOut = spawnSync('openssl', ['x509', '-noout', '-subject', '-in', certFile], { encoding: 'utf8' });
        const issuerOut = spawnSync('openssl', ['x509', '-noout', '-issuer', '-in', certFile], { encoding: 'utf8' });
        const datesOut = spawnSync('openssl', ['x509', '-noout', '-dates', '-in', certFile], { encoding: 'utf8' });
        const fpOut = spawnSync('openssl', ['x509', '-noout', '-fingerprint', '-sha256', '-in', certFile], { encoding: 'utf8' });

        const parseField = (str, key) => {
            const match = str.match(new RegExp(`${key}=(.+)`));
            return match ? match[1].trim() : '';
        };

        return {
            subject: subjectOut.stdout.replace('subject=', '').trim(),
            issuer: issuerOut.stdout.replace('issuer=', '').trim(),
            validFrom: parseField(datesOut.stdout, 'notBefore'),
            validTo: parseField(datesOut.stdout, 'notAfter'),
            fingerprint: fpOut.stdout.replace(/^.*Fingerprint=/, '').trim(),
        };
    } finally {
        try { fs.unlinkSync(certFile); } catch (_) { /* ignore */ }
    }
}

// ---------------------------------------------------------------------------
// CRL — revocation list stored as JSON
// ---------------------------------------------------------------------------

function crlPath(storeDir) {
    return path.join(storeDir || DEFAULT_CERT_DIR, 'crl.json');
}

function readCRL(storeDir) {
    const p = crlPath(storeDir);
    if (!fs.existsSync(p)) return [];
    try { return JSON.parse(fs.readFileSync(p, 'utf8')); } catch (_) { return []; }
}

function writeCRL(list, storeDir) {
    ensureDir(storeDir || DEFAULT_CERT_DIR);
    fs.writeFileSync(crlPath(storeDir), JSON.stringify(list, null, 2), 'utf8');
}

/**
 * Add a certificate serial number to the CRL.
 * @param {string} serialNumber  Hex serial (e.g. "A1B2C3D4")
 * @param {string} storeDir
 */
function revokeCert(serialNumber, storeDir = DEFAULT_CERT_DIR) {
    const list = readCRL(storeDir);
    const serial = serialNumber.toUpperCase();
    if (!list.includes(serial)) {
        list.push(serial);
        writeCRL(list, storeDir);
    }
}

/**
 * Check if a serial number is in the CRL.
 * @param {string} serialNumber
 * @param {string} storeDir
 * @returns {boolean}
 */
function isCertRevoked(serialNumber, storeDir = DEFAULT_CERT_DIR) {
    const list = readCRL(storeDir);
    return list.includes(serialNumber.toUpperCase());
}

// ---------------------------------------------------------------------------
// Exports
// ---------------------------------------------------------------------------

module.exports = {
    generateSelfSignedCA,
    issueCertificate,
    loadCACert,
    buildServerOptions,
    buildClientAgent,
    validateCert,
    getCertInfo,
    revokeCert,
    isCertRevoked,
};
