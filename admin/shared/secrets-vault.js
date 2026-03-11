'use strict';
/**
 * secrets-vault.js — Secrets vault integration
 *
 * Supports:
 *  - HashiCorp Vault (VAULT_ADDR + VAULT_TOKEN env vars)
 *  - AWS Secrets Manager (AWS_REGION + AWS_ACCESS_KEY_ID + AWS_SECRET_ACCESS_KEY)
 *  - Local encrypted fallback (AES-256-GCM, key from VAULT_ENCRYPTION_KEY env var)
 *
 * Auto-detects backend from environment. Falls back to local encrypted store.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const https = require('https');

// ---------------------------------------------------------------------------
// AWS SigV4 signing (no SDK)
// ---------------------------------------------------------------------------

function hmacSha256(key, data) {
    return crypto.createHmac('sha256', key).update(data).digest();
}

function sha256hex(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

function getSigningKey(secretKey, dateStamp, region, service) {
    const kDate = hmacSha256('AWS4' + secretKey, dateStamp);
    const kRegion = hmacSha256(kDate, region);
    const kService = hmacSha256(kRegion, service);
    return hmacSha256(kService, 'aws4_request');
}

function buildSigV4Headers(method, host, path_, region, service, payload, accessKeyId, secretKey, sessionToken) {
    const now = new Date();
    const amzDate = now.toISOString().replace(/[:\-]|\.\d{3}/g, '').slice(0, 15) + 'Z';
    const dateStamp = amzDate.slice(0, 8);
    const payloadHash = sha256hex(payload);

    const headers = {
        host,
        'x-amz-date': amzDate,
        'x-amz-target': 'secretsmanager.GetSecretValue',
        'content-type': 'application/x-amz-json-1.1',
        'x-amz-content-sha256': payloadHash,
    };
    if (sessionToken) headers['x-amz-security-token'] = sessionToken;

    const signedHeaderKeys = Object.keys(headers).sort();
    const canonicalHeaders = signedHeaderKeys.map(k => `${k}:${headers[k]}`).join('\n') + '\n';
    const signedHeadersStr = signedHeaderKeys.join(';');

    const canonicalRequest = [
        method,
        path_,
        '',
        canonicalHeaders,
        signedHeadersStr,
        payloadHash,
    ].join('\n');

    const credentialScope = `${dateStamp}/${region}/${service}/aws4_request`;
    const stringToSign = [
        'AWS4-HMAC-SHA256',
        amzDate,
        credentialScope,
        sha256hex(canonicalRequest),
    ].join('\n');

    const signingKey = getSigningKey(secretKey, dateStamp, region, service);
    const signature = crypto.createHmac('sha256', signingKey).update(stringToSign).digest('hex');

    const authHeader = `AWS4-HMAC-SHA256 Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeadersStr}, Signature=${signature}`;
    headers['Authorization'] = authHeader;

    return { headers, amzDate };
}

// ---------------------------------------------------------------------------
// HTTP helper
// ---------------------------------------------------------------------------

function httpsRequest(options, body) {
    return new Promise((resolve, reject) => {
        const req = https.request(options, res => {
            let data = '';
            res.on('data', chunk => { data += chunk; });
            res.on('end', () => {
                try {
                    resolve({ statusCode: res.statusCode, body: JSON.parse(data) });
                } catch (_) {
                    resolve({ statusCode: res.statusCode, body: data });
                }
            });
        });
        req.on('error', reject);
        if (body) req.write(body);
        req.end();
    });
}

// ---------------------------------------------------------------------------
// Local encrypted store (AES-256-GCM)
// ---------------------------------------------------------------------------

const LOCAL_ENC_VERSION = 1;
const ALGO = 'aes-256-gcm';

function deriveKey(rawKey) {
    // Accept 32-byte hex or arbitrary string → derive 32-byte key via SHA-256
    const buf = Buffer.from(rawKey, 'utf8');
    if (buf.length === 32) return buf;
    return crypto.createHash('sha256').update(buf).digest();
}

function encryptValue(key, plaintext) {
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv(ALGO, key, iv);
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const tag = cipher.getAuthTag();
    return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptValue(key, ciphertext) {
    const buf = Buffer.from(ciphertext, 'base64');
    const iv = buf.slice(0, 12);
    const tag = buf.slice(12, 28);
    const data = buf.slice(28);
    const decipher = crypto.createDecipheriv(ALGO, key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString('utf8');
}

// ---------------------------------------------------------------------------
// SecretsVault
// ---------------------------------------------------------------------------

class SecretsVault {
    constructor(storeDir) {
        this.storeDir = storeDir;
        this.encFile = path.join(storeDir, 'secrets.enc');
        this._backend = this._detectBackend();
    }

    _detectBackend() {
        if (process.env.VAULT_ADDR && process.env.VAULT_TOKEN) return 'vault';
        if (process.env.AWS_REGION && process.env.AWS_ACCESS_KEY_ID && process.env.AWS_SECRET_ACCESS_KEY) return 'aws-sm';
        return 'local-encrypted';
    }

    getBackendType() {
        return this._backend;
    }

    // ---- Local encrypted store helpers ----

    _loadLocalStore() {
        if (!fs.existsSync(this.encFile)) return {};
        try {
            const raw = fs.readFileSync(this.encFile, 'utf8');
            const envelope = JSON.parse(raw);
            if (envelope.v !== LOCAL_ENC_VERSION) return {};
            const key = this._localKey();
            const decrypted = decryptValue(key, envelope.data);
            return JSON.parse(decrypted);
        } catch (_) {
            return {};
        }
    }

    _saveLocalStore(store) {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
        const key = this._localKey();
        const plaintext = JSON.stringify(store);
        const enc = encryptValue(key, plaintext);
        const envelope = { v: LOCAL_ENC_VERSION, data: enc };
        fs.writeFileSync(this.encFile, JSON.stringify(envelope, null, 2), 'utf8');
    }

    _localKey() {
        const raw = process.env.VAULT_ENCRYPTION_KEY;
        if (!raw) {
            process.stderr.write('[secrets-vault] WARNING: VAULT_ENCRYPTION_KEY not set. Using insecure default key — set this env var in production!\n');
            return deriveKey('default-dev-key-change-in-prod!!');
        }
        return deriveKey(raw);
    }

    // ---- HashiCorp Vault helpers ----

    async _vaultRequest(method, keyPath, payload) {
        const vaultAddr = process.env.VAULT_ADDR;
        const token = process.env.VAULT_TOKEN;
        const parsed = new URL(vaultAddr);
        const isHttps = parsed.protocol === 'https:';
        const host = parsed.hostname;
        const port = parsed.port || (isHttps ? 443 : 80);
        const requestPath = `/v1/secret/data/${keyPath}`;

        const options = {
            hostname: host,
            port,
            path: requestPath,
            method,
            headers: {
                'X-Vault-Token': token,
                'Content-Type': 'application/json',
            },
        };

        const bodyStr = payload ? JSON.stringify(payload) : undefined;
        if (bodyStr) {
            options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
        }

        if (!isHttps) {
            // Fall back to http for local Vault dev instances
            const http = require('http');
            return new Promise((resolve, reject) => {
                const req = http.request(options, res => {
                    let data = '';
                    res.on('data', chunk => { data += chunk; });
                    res.on('end', () => {
                        try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
                        catch (_) { resolve({ statusCode: res.statusCode, body: data }); }
                    });
                });
                req.on('error', reject);
                if (bodyStr) req.write(bodyStr);
                req.end();
            });
        }

        return httpsRequest(options, bodyStr);
    }

    async _vaultListRequest() {
        const vaultAddr = process.env.VAULT_ADDR;
        const token = process.env.VAULT_TOKEN;
        const parsed = new URL(vaultAddr);
        const isHttps = parsed.protocol === 'https:';
        const host = parsed.hostname;
        const port = parsed.port || (isHttps ? 443 : 80);

        const options = {
            hostname: host,
            port,
            path: `/v1/secret/metadata?list=true`,
            method: 'GET',
            headers: { 'X-Vault-Token': token },
        };

        if (!isHttps) {
            const http = require('http');
            return new Promise((resolve, reject) => {
                const req = http.request(options, res => {
                    let data = '';
                    res.on('data', chunk => { data += chunk; });
                    res.on('end', () => {
                        try { resolve({ statusCode: res.statusCode, body: JSON.parse(data) }); }
                        catch (_) { resolve({ statusCode: res.statusCode, body: data }); }
                    });
                });
                req.on('error', reject);
                req.end();
            });
        }
        return httpsRequest(options, undefined);
    }

    // ---- AWS SM helpers ----

    async _awsRequest(target, payload) {
        const region = process.env.AWS_REGION;
        const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
        const secretKey = process.env.AWS_SECRET_ACCESS_KEY;
        const sessionToken = process.env.AWS_SESSION_TOKEN;
        const host = `secretsmanager.${region}.amazonaws.com`;
        const bodyStr = JSON.stringify(payload);
        const { headers } = buildSigV4Headers(
            'POST', host, '/', region, 'secretsmanager', bodyStr,
            accessKeyId, secretKey, sessionToken
        );
        headers['x-amz-target'] = target;
        headers['content-length'] = Buffer.byteLength(bodyStr);

        return httpsRequest({ hostname: host, port: 443, path: '/', method: 'POST', headers }, bodyStr);
    }

    // ---- Public API ----

    async getSecret(key) {
        if (this._backend === 'vault') {
            const result = await this._vaultRequest('GET', key, null);
            if (result.statusCode !== 200) throw new Error(`Vault: secret '${key}' not found`);
            return result.body.data && result.body.data.data && result.body.data.data.value;
        }
        if (this._backend === 'aws-sm') {
            const result = await this._awsRequest('secretsmanager.GetSecretValue', { SecretId: key });
            if (result.statusCode !== 200) throw new Error(`AWS SM: secret '${key}' not found`);
            return result.body.SecretString;
        }
        // local-encrypted
        const store = this._loadLocalStore();
        if (!(key in store)) throw new Error(`Local vault: secret '${key}' not found`);
        return store[key];
    }

    async setSecret(key, value) {
        if (this._backend === 'vault') {
            const result = await this._vaultRequest('POST', key, { data: { value } });
            if (result.statusCode !== 200 && result.statusCode !== 204) {
                throw new Error(`Vault: failed to set secret '${key}'`);
            }
            return;
        }
        if (this._backend === 'aws-sm') {
            // Try create first, then update
            let result = await this._awsRequest('secretsmanager.CreateSecret', {
                Name: key, SecretString: value,
            });
            if (result.statusCode === 400 && result.body.__type && result.body.__type === 'com.amazonaws.secretsmanager#ResourceExistsException') {
                result = await this._awsRequest('secretsmanager.PutSecretValue', {
                    SecretId: key, SecretString: value,
                });
            }
            if (result.statusCode !== 200) throw new Error(`AWS SM: failed to set secret '${key}'`);
            return;
        }
        const store = this._loadLocalStore();
        store[key] = value;
        this._saveLocalStore(store);
    }

    async deleteSecret(key) {
        if (this._backend === 'vault') {
            await this._vaultRequest('DELETE', key, null);
            return;
        }
        if (this._backend === 'aws-sm') {
            await this._awsRequest('secretsmanager.DeleteSecret', {
                SecretId: key, ForceDeleteWithoutRecovery: true,
            });
            return;
        }
        const store = this._loadLocalStore();
        delete store[key];
        this._saveLocalStore(store);
    }

    async rotateSecret(key, newValue) {
        const oldValue = await this.getSecret(key).catch(() => null);
        await this.setSecret(key, newValue);
        return oldValue;
    }

    async listSecrets() {
        if (this._backend === 'vault') {
            const result = await this._vaultListRequest();
            if (result.statusCode !== 200) return [];
            return (result.body.data && result.body.data.keys) || [];
        }
        if (this._backend === 'aws-sm') {
            const result = await this._awsRequest('secretsmanager.ListSecrets', {});
            if (result.statusCode !== 200) return [];
            return (result.body.SecretList || []).map(s => s.Name);
        }
        const store = this._loadLocalStore();
        return Object.keys(store);
    }
}

module.exports = { SecretsVault };
