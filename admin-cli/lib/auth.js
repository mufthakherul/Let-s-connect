'use strict';
/**
 * auth.js — Role-based command authorization for Milonexa Admin CLI (Phase 2)
 *
 * Role resolution order:
 *   1. ADMIN_CLI_ROLE environment variable
 *   2. .admin-cli/role.json persisted file
 *   3. Default: 'operator' (safe fallback)
 *
 * Roles (ascending privilege):
 *   viewer       Read-only inspection commands
 *   operator     Build/start/monitor for non-production environments
 *   admin        Full write access including production and destructive ops
 *   break-glass  Emergency override — bypasses confirmation, always audited with flag
 */

const fs = require('fs');
const path = require('path');

const ADMIN_HOME = path.resolve(__dirname, '..', '..', '.admin-cli');
const ROLE_FILE = path.join(ADMIN_HOME, 'role.json');

const ROLES = ['viewer', 'operator', 'admin', 'break-glass'];

/**
 * Minimum role required to run each command in normal (non-production) context.
 * Commands not listed default to 'viewer' (read-only).
 */
const COMMAND_POLICY = {
    doctor: 'viewer',
    check: 'viewer',
    incident: 'viewer',
    metrics: 'viewer',
    alerts: 'viewer',
    policies: 'operator',
    costs: 'viewer',
    compliance: 'viewer',
    recommendations: 'viewer',
    dashboard: 'viewer',
    status: 'viewer',
    logs: 'viewer',
    health: 'viewer',
    run: 'viewer',
    audit: 'viewer',
    monitor: 'viewer',
    'set-role': 'admin',
    role: 'viewer',   // read-only: show current role
    build: 'operator',
    scale: 'operator',
    rollout: 'operator',
    start: 'operator',
    restart: 'operator',
    stop: 'admin',
    backup: 'admin',
};

/**
 * When a command targets production-scope (--env prod or --runtime k8s),
 * the minimum role escalates to these values. Unspecified commands keep their
 * normal policy.
 */
const PROD_COMMAND_POLICY = {
    build: 'operator',
    scale: 'admin',
    rollout: 'admin',
    start: 'admin',
    restart: 'admin',
    stop: 'admin',
    backup: 'admin',
    monitor: 'operator',
    policies: 'admin',
    costs: 'admin',
    compliance: 'viewer',
};

function getRoleLevel(role) {
    const idx = ROLES.indexOf(role);
    return idx === -1 ? 1 : idx; // default to operator (index 1) if unknown
}

/** Resolve the active role from env, persisted file, or default. */
function resolveRole() {
    const envRole = (process.env.ADMIN_CLI_ROLE || '').trim().toLowerCase();
    if (envRole && ROLES.includes(envRole)) return envRole;

    try {
        if (fs.existsSync(ROLE_FILE)) {
            const data = JSON.parse(fs.readFileSync(ROLE_FILE, 'utf8'));
            if (data && data.role && ROLES.includes(data.role)) return data.role;
        }
    } catch (_) {
        // ignore parse errors
    }

    return 'operator';
}

/** Persist a role to the .admin-cli/role.json file. */
function persistRole(role) {
    if (!ROLES.includes(role)) {
        throw new Error(`Invalid role '${role}'. Valid roles: ${ROLES.join(', ')}`);
    }
    fs.mkdirSync(ADMIN_HOME, { recursive: true });
    fs.writeFileSync(ROLE_FILE, JSON.stringify({ role, setAt: new Date().toISOString() }, null, 2));
}

/**
 * Returns true if the command options target a production-scoped environment.
 * Production scope = --env prod/production OR --runtime k8s/kubernetes.
 */
function isProductionScope(options) {
    if (!options || typeof options !== 'object') return false;
    const env = String(options.env || options.target || '').toLowerCase();
    const runtime = String(options.runtime || '').toLowerCase();
    return (
        env === 'prod' ||
        env === 'production' ||
        runtime === 'k8s' ||
        runtime === 'kubernetes'
    );
}

/**
 * Check whether the given role may execute the command with the supplied options.
 * @returns {{ allowed: boolean, role: string, required: string|null, isProd: boolean, breakGlass: boolean }}
 */
function checkAuthorization(command, options, role) {
    const currentRole = role || resolveRole();
    const isProd = isProductionScope(options);

    const requiredRole =
        isProd && PROD_COMMAND_POLICY[command]
            ? PROD_COMMAND_POLICY[command]
            : (COMMAND_POLICY[command] || 'viewer');

    // break-glass bypasses all policy (but is audited with the breakGlass flag)
    if (currentRole === 'break-glass') {
        return { allowed: true, role: currentRole, required: requiredRole, isProd, breakGlass: true };
    }

    const currentLevel = getRoleLevel(currentRole);
    const requiredLevel = getRoleLevel(requiredRole);

    return {
        allowed: currentLevel >= requiredLevel,
        role: currentRole,
        required: requiredRole,
        isProd,
        breakGlass: false,
    };
}

module.exports = {
    ROLES,
    resolveRole,
    persistRole,
    checkAuthorization,
    isProductionScope,
    ROLE_FILE,
};
