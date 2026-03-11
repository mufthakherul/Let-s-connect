/**
 * Multi-Cluster Kubernetes Management Module (Phase E)
 *
 * Manages multiple Kubernetes clusters using kubeconfig context switching.
 * Supports listing, switching, comparing, and executing operations across clusters.
 *
 * Cluster registry stored in .admin-cli/clusters/registry.json
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const os = require('os');

// ---------------------------------------------------------------------------
// MultiClusterManager
// ---------------------------------------------------------------------------

class MultiClusterManager {
    constructor(clustersDir) {
        this.clustersDir = clustersDir;
        this.registryFile = path.join(clustersDir, 'registry.json');
        this.ensureDir();
        this.registry = this.loadRegistry();
    }

    ensureDir() {
        if (!fs.existsSync(this.clustersDir)) {
            fs.mkdirSync(this.clustersDir, { recursive: true });
        }
    }

    loadRegistry() {
        if (fs.existsSync(this.registryFile)) {
            try { return JSON.parse(fs.readFileSync(this.registryFile, 'utf8')) || []; } catch (_) { return []; }
        }
        return [];
    }

    saveRegistry() {
        fs.writeFileSync(this.registryFile, JSON.stringify(this.registry, null, 2), 'utf8');
    }

    /**
     * Register a cluster.
     * @param {object} cfg { name, context, namespace, region, environment, kubeconfigPath? }
     */
    registerCluster(cfg) {
        if (!cfg.name) throw new Error('name is required');
        if (!cfg.context) throw new Error('context (kubectl context name) is required');

        if (this.registry.find(c => c.name === cfg.name)) {
            throw new Error(`Cluster '${cfg.name}' already registered. Use update to modify.`);
        }

        const cluster = {
            id: Date.now().toString(36),
            name: cfg.name,
            context: cfg.context,
            namespace: cfg.namespace || 'milonexa',
            region: cfg.region || 'unknown',
            environment: cfg.environment || 'unknown',
            kubeconfigPath: cfg.kubeconfigPath || path.join(os.homedir(), '.kube', 'config'),
            enabled: true,
            registeredAt: new Date().toISOString(),
        };
        this.registry.push(cluster);
        this.saveRegistry();
        return cluster;
    }

    /**
     * Update a cluster registration.
     */
    updateCluster(name, updates) {
        const cluster = this.registry.find(c => c.name === name);
        if (!cluster) throw new Error(`Cluster '${name}' not found`);
        Object.assign(cluster, updates, { updatedAt: new Date().toISOString() });
        this.saveRegistry();
        return cluster;
    }

    /**
     * Deregister a cluster.
     */
    deregisterCluster(name) {
        const before = this.registry.length;
        this.registry = this.registry.filter(c => c.name !== name);
        if (this.registry.length < before) { this.saveRegistry(); return true; }
        return false;
    }

    /**
     * List all registered clusters.
     */
    listClusters() {
        return this.registry;
    }

    /**
     * Get kubeconfig contexts available on this machine.
     */
    getKubeconfigContexts(kubeconfigPath = null) {
        const env = {};
        if (kubeconfigPath) env.KUBECONFIG = kubeconfigPath;

        const result = spawnSync('kubectl', ['config', 'get-contexts', '-o', 'name'], {
            encoding: 'utf8',
            env: { ...process.env, ...env },
            timeout: 10000,
        });

        if (result.error || result.status !== 0) {
            return { available: false, error: result.error?.message || result.stderr || 'kubectl not available', contexts: [] };
        }

        const contexts = result.stdout.trim().split('\n').filter(Boolean);
        return { available: true, contexts };
    }

    /**
     * Get current active context.
     */
    getCurrentContext() {
        const result = spawnSync('kubectl', ['config', 'current-context'], {
            encoding: 'utf8',
            timeout: 5000,
        });
        if (result.error || result.status !== 0) return null;
        return result.stdout.trim();
    }

    /**
     * Switch kubectl context.
     */
    switchContext(context) {
        const result = spawnSync('kubectl', ['config', 'use-context', context], {
            encoding: 'utf8',
            timeout: 10000,
        });
        if (result.error || result.status !== 0) {
            return { success: false, error: result.stderr || 'Failed to switch context' };
        }
        return { success: true, context };
    }

    /**
     * Execute a kubectl command against a specific cluster.
     * @param {string} clusterName  Registered cluster name
     * @param {string[]} args       kubectl arguments
     * @returns {{ success, stdout, stderr }}
     */
    execOnCluster(clusterName, args) {
        const cluster = this.registry.find(c => c.name === clusterName);
        if (!cluster) return { success: false, error: `Cluster '${clusterName}' not found` };

        const env = { ...process.env };
        if (cluster.kubeconfigPath) env.KUBECONFIG = cluster.kubeconfigPath;

        // Set context before running
        const ctxResult = spawnSync('kubectl', ['config', 'use-context', cluster.context], {
            encoding: 'utf8',
            env,
            timeout: 10000,
        });
        if (ctxResult.error || ctxResult.status !== 0) {
            return { success: false, error: `Failed to switch to context '${cluster.context}': ${ctxResult.stderr}` };
        }

        const result = spawnSync('kubectl', [...args, '--namespace', cluster.namespace], {
            encoding: 'utf8',
            env,
            timeout: 30000,
        });

        return {
            success: result.status === 0,
            stdout: result.stdout,
            stderr: result.stderr,
            exitCode: result.status,
        };
    }

    /**
     * Get pod/deployment status across all registered clusters.
     * @param {string} namespace Override namespace
     */
    getClusterStatus(namespace = null) {
        const results = [];
        for (const cluster of this.registry.filter(c => c.enabled)) {
            const ns = namespace || cluster.namespace;
            const env = { ...process.env };
            if (cluster.kubeconfigPath) env.KUBECONFIG = cluster.kubeconfigPath;

            // Switch context
            spawnSync('kubectl', ['config', 'use-context', cluster.context], { encoding: 'utf8', env, timeout: 5000 });

            // Get pod counts
            const pods = spawnSync('kubectl', ['get', 'pods', '-n', ns, '--no-headers'], {
                encoding: 'utf8', env, timeout: 10000,
            });

            // Get node count
            const nodes = spawnSync('kubectl', ['get', 'nodes', '--no-headers'], {
                encoding: 'utf8', env, timeout: 10000,
            });

            let podLines = [], nodeLines = [];
            if (pods.status === 0) podLines = pods.stdout.trim().split('\n').filter(Boolean);
            if (nodes.status === 0) nodeLines = nodes.stdout.trim().split('\n').filter(Boolean);

            const running = podLines.filter(l => l.includes('Running')).length;
            const total = podLines.length;
            const ready = nodeLines.filter(l => l.includes('Ready')).length;

            results.push({
                cluster: cluster.name,
                context: cluster.context,
                environment: cluster.environment,
                region: cluster.region,
                available: pods.status === 0,
                pods: { running, total },
                nodes: { ready, total: nodeLines.length },
            });
        }
        return results;
    }

    /**
     * Compare workloads across clusters (diff of deployment names).
     */
    compareDeployments() {
        const deploymentsByCluster = {};
        for (const cluster of this.registry.filter(c => c.enabled)) {
            const env = { ...process.env };
            if (cluster.kubeconfigPath) env.KUBECONFIG = cluster.kubeconfigPath;
            spawnSync('kubectl', ['config', 'use-context', cluster.context], { encoding: 'utf8', env, timeout: 5000 });

            const result = spawnSync('kubectl', ['get', 'deployments', '-n', cluster.namespace, '-o', 'name'], {
                encoding: 'utf8', env, timeout: 10000,
            });
            deploymentsByCluster[cluster.name] = result.status === 0
                ? result.stdout.trim().split('\n').filter(Boolean)
                : [];
        }

        // Find deployments only in some clusters
        const allDeployments = [...new Set(Object.values(deploymentsByCluster).flat())];
        const diff = allDeployments.map(dep => {
            const presentIn = Object.entries(deploymentsByCluster)
                .filter(([, deps]) => deps.includes(dep))
                .map(([name]) => name);
            return { deployment: dep, presentIn, missingFrom: this.registry.map(c => c.name).filter(n => !presentIn.includes(n)) };
        });

        return { clusters: Object.keys(deploymentsByCluster), diff };
    }
}

module.exports = { MultiClusterManager };
