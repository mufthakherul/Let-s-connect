'use strict';
/**
 * tenant-manager.js — Multi-tenant SaaS management
 *
 * Features:
 *  - Full tenant lifecycle (create, suspend, activate, delete)
 *  - Per-tenant quota management and simulated usage reporting
 *  - Billing event ledger and summary with trend analysis
 *  - White-label configuration per tenant
 *  - Plan-based default quotas
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PLAN_QUOTAS = {
    free:       { cpu: 1,   memory: 512,   storage: 5,    users: 5,   apiCallsPerMin: 60  },
    starter:    { cpu: 2,   memory: 1024,  storage: 20,   users: 25,  apiCallsPerMin: 300 },
    pro:        { cpu: 4,   memory: 4096,  storage: 100,  users: 100, apiCallsPerMin: 1000 },
    enterprise: { cpu: 16,  memory: 32768, storage: 1000, users: 0,   apiCallsPerMin: 10000 },
};

class TenantManager {
    constructor(storeDir) {
        this.storeDir = storeDir;
        this.tenantsFile = path.join(storeDir, 'tenants.json');
        this.quotasFile  = path.join(storeDir, 'tenant-quotas.json');
        this.billingFile = path.join(storeDir, 'tenant-billing.json');
        this._ensureDir();
    }

    _ensureDir() {
        if (!fs.existsSync(this.storeDir)) {
            fs.mkdirSync(this.storeDir, { recursive: true });
        }
    }

    _readJSON(file, defaultVal) {
        if (!fs.existsSync(file)) return defaultVal;
        try {
            return JSON.parse(fs.readFileSync(file, 'utf8'));
        } catch (_) {
            return defaultVal;
        }
    }

    _writeJSON(file, data) {
        this._ensureDir();
        fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
    }

    createTenant({ name, domain, plan, ownerId, whiteLabelConfig }) {
        const tenants = this._readJSON(this.tenantsFile, []);
        const now = new Date().toISOString();
        const tenantId = 'tenant_' + crypto.randomBytes(8).toString('hex');
        const defaultQuota = PLAN_QUOTAS[plan] || PLAN_QUOTAS.free;

        const tenant = {
            tenantId,
            name,
            domain: domain || null,
            plan: plan || 'free',
            ownerId,
            status: 'active',
            created: now,
            updated: now,
            billing: [],
            whiteLabelConfig: whiteLabelConfig || {},
            suspendedReason: null,
        };

        tenants.push(tenant);
        this._writeJSON(this.tenantsFile, tenants);

        const quotas = this._readJSON(this.quotasFile, {});
        quotas[tenantId] = Object.assign({}, defaultQuota);
        this._writeJSON(this.quotasFile, quotas);

        return tenant;
    }

    updateTenant(tenantId, changes) {
        const tenants = this._readJSON(this.tenantsFile, []);
        const idx = tenants.findIndex(t => t.tenantId === tenantId);
        if (idx === -1) throw new Error(`Tenant ${tenantId} not found`);
        Object.assign(tenants[idx], changes, { updated: new Date().toISOString() });
        this._writeJSON(this.tenantsFile, tenants);
        return tenants[idx];
    }

    suspendTenant(tenantId, reason) {
        return this.updateTenant(tenantId, { status: 'suspended', suspendedReason: reason || '' });
    }

    activateTenant(tenantId) {
        return this.updateTenant(tenantId, { status: 'active', suspendedReason: null });
    }

    deleteTenant(tenantId) {
        return this.updateTenant(tenantId, { status: 'deleted' });
    }

    listTenants(filter = {}) {
        let tenants = this._readJSON(this.tenantsFile, []);
        if (filter.plan) tenants = tenants.filter(t => t.plan === filter.plan);
        if (filter.status) tenants = tenants.filter(t => t.status === filter.status);
        return tenants;
    }

    getTenant(tenantId) {
        return this._readJSON(this.tenantsFile, []).find(t => t.tenantId === tenantId) || null;
    }

    setQuota(tenantId, { cpu, memory, storage, users, apiCallsPerMin }) {
        const quotas = this._readJSON(this.quotasFile, {});
        quotas[tenantId] = Object.assign(quotas[tenantId] || {}, {
            cpu, memory, storage, users, apiCallsPerMin,
        });
        this._writeJSON(this.quotasFile, quotas);
        return quotas[tenantId];
    }

    getQuota(tenantId) {
        const quotas = this._readJSON(this.quotasFile, {});
        return quotas[tenantId] || null;
    }

    getQuotaUsage(tenantId) {
        const quota = this.getQuota(tenantId);
        if (!quota) throw new Error(`No quota found for tenant ${tenantId}`);
        // NOTE: Returns simulated (random) usage percentages for demonstration purposes.
        // Replace with real metrics from your monitoring infrastructure in production.

        const pct = () => Math.floor(Math.random() * 100);
        const field = (limit, percent) => ({ limit, used: Math.floor(limit * percent / 100), percent });

        return {
            cpu:           field(quota.cpu,           pct()),
            memory:        field(quota.memory,        pct()),
            storage:       field(quota.storage,       pct()),
            users:         field(quota.users,         pct()),
            apiCallsPerMin: field(quota.apiCallsPerMin, pct()),
        };
    }

    recordBillingEvent(tenantId, { type, amount, currency, description }) {
        const billing = this._readJSON(this.billingFile, []);
        const event = {
            eventId: 'bill_' + crypto.randomBytes(8).toString('hex'),
            tenantId,
            type,
            amount,
            currency: currency || 'USD',
            description: description || '',
            timestamp: new Date().toISOString(),
        };
        billing.push(event);
        this._writeJSON(this.billingFile, billing);
        return event;
    }

    getBillingHistory(tenantId, dateFrom, dateTo) {
        let events = this._readJSON(this.billingFile, []).filter(e => e.tenantId === tenantId);
        if (dateFrom) events = events.filter(e => new Date(e.timestamp) >= new Date(dateFrom));
        if (dateTo) events = events.filter(e => new Date(e.timestamp) <= new Date(dateTo));
        return events;
    }

    getBillingSummary(tenantId) {
        const all = this._readJSON(this.billingFile, []).filter(e => e.tenantId === tenantId);
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const current = all.filter(e => new Date(e.timestamp) >= startOfMonth);
        const previous = all.filter(e =>
            new Date(e.timestamp) >= startOfLastMonth &&
            new Date(e.timestamp) < startOfMonth
        );

        const sum = arr => arr.reduce((s, e) => s + (e.amount || 0), 0);
        const currentPeriodCost = sum(current);
        const previousPeriodCost = sum(previous);

        let trend = 'stable';
        if (currentPeriodCost > previousPeriodCost * 1.05) trend = 'up';
        else if (currentPeriodCost < previousPeriodCost * 0.95) trend = 'down';

        const breakdown = {};
        for (const e of current) {
            breakdown[e.type] = (breakdown[e.type] || 0) + (e.amount || 0);
        }

        return {
            currentPeriodCost,
            previousPeriodCost,
            trend,
            breakdown: Object.entries(breakdown).map(([service, amount]) => ({ service, amount })),
        };
    }

    setWhiteLabel(tenantId, config) {
        return this.updateTenant(tenantId, { whiteLabelConfig: config });
    }

    getWhiteLabel(tenantId) {
        const tenant = this.getTenant(tenantId);
        if (!tenant) throw new Error(`Tenant ${tenantId} not found`);
        return tenant.whiteLabelConfig || {};
    }
}

module.exports = { TenantManager };
