import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardHeader,
    Chip, Alert, Button, IconButton, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, TextField, Dialog, DialogTitle, DialogContent,
    DialogActions, MenuItem, Select, FormControl, InputLabel
} from '@mui/material';
import {
    Cloud, Add, Delete, Refresh, Storage,
    CheckCircle, Error as ErrorIcon, CompareArrows
} from '@mui/icons-material';
import api from '../../utils/api';

const envConfig = {
    prod: { color: 'error', label: 'PROD' },
    staging: { color: 'warning', label: 'STAGING' },
    dev: { color: 'success', label: 'DEV' },
    unknown: { color: 'default', label: 'UNKNOWN' },
};

/**
 * Multi-Cluster Kubernetes Management Panel — Phase E
 */
const MultiClusterPanel = () => {
    const [clusters, setClusters] = useState([]);
    const [clusterStatus, setClusterStatus] = useState([]);
    const [loading, setLoading] = useState(false);
    const [statusLoading, setStatusLoading] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [newCluster, setNewCluster] = useState({
        name: '', context: '', namespace: 'milonexa', region: '', environment: 'dev'
    });

    const fetchClusters = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/clusters');
            setClusters(res.data?.clusters || []);
        } catch (err) {
            setError('Failed to load clusters');
        } finally {
            setLoading(false);
        }
    }, []);

    const fetchClusterStatus = useCallback(async () => {
        setStatusLoading(true);
        try {
            const res = await api.get('/api/admin/clusters/status');
            setClusterStatus(res.data?.clusterStatus || []);
        } catch (_) { /* non-critical */ }
        setStatusLoading(false);
    }, []);

    useEffect(() => {
        fetchClusters();
    }, [fetchClusters]);

    const handleRegisterCluster = async () => {
        try {
            await api.post('/api/admin/clusters', newCluster);
            setAddDialogOpen(false);
            setSuccess('Cluster registered successfully');
            setNewCluster({ name: '', context: '', namespace: 'milonexa', region: '', environment: 'dev' });
            fetchClusters();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to register cluster');
        }
    };

    const handleDeregister = async (cluster) => {
        if (!window.confirm(`Deregister cluster "${cluster.name}"?`)) return;
        try {
            await api.delete(`/api/admin/clusters/${cluster.id}`);
            setSuccess(`Cluster "${cluster.name}" deregistered`);
            fetchClusters();
        } catch (err) {
            setError('Failed to deregister cluster');
        }
    };

    const getStatusForCluster = (name) => {
        return clusterStatus.find(s => s.cluster === name) || null;
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Cloud color="primary" />
                    <Typography variant="h5" fontWeight="bold">
                        Multi-Cluster Kubernetes Management
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    <Button
                        variant="outlined"
                        size="small"
                        startIcon={statusLoading ? <CircularProgress size={16} /> : <CompareArrows />}
                        onClick={fetchClusterStatus}
                        disabled={statusLoading || clusters.length === 0}
                    >
                        Check Status
                    </Button>
                    <Button
                        variant="contained"
                        size="small"
                        startIcon={<Add />}
                        onClick={() => setAddDialogOpen(true)}
                    >
                        Register Cluster
                    </Button>
                    <IconButton onClick={fetchClusters} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : <Refresh />}
                    </IconButton>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Summary */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={4}>
                    <Card elevation={2}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold">{clusters.length}</Typography>
                            <Typography variant="body2" color="text.secondary">Registered Clusters</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={4}>
                    <Card elevation={2}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold" color="success.main">
                                {clusters.filter(c => c.enabled).length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Active</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={4}>
                    <Card elevation={2}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold" color="error.main">
                                {clusters.filter(c => c.environment === 'prod').length}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">Production</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Clusters Table */}
            <Card>
                <CardHeader title="Cluster Registry" />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Context</TableCell>
                                <TableCell>Environment</TableCell>
                                <TableCell>Region</TableCell>
                                <TableCell>Namespace</TableCell>
                                <TableCell>Runtime Status</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {clusters.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={7} align="center">
                                        <Box py={3} textAlign="center">
                                            <Cloud sx={{ fontSize: 48, color: 'text.disabled', mb: 1 }} />
                                            <Typography variant="body2" color="text.secondary">
                                                No clusters registered. Click "Register Cluster" to add your first cluster.
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                CLI: node admin-cli/index.js cluster register --name prod-us --context gke_project_us
                                            </Typography>
                                        </Box>
                                    </TableCell>
                                </TableRow>
                            ) : clusters.map((cluster) => {
                                const envCfg = envConfig[cluster.environment] || envConfig.unknown;
                                const status = getStatusForCluster(cluster.name);
                                return (
                                    <TableRow key={cluster.id} hover>
                                        <TableCell>
                                            <Typography variant="body2" fontWeight="bold">{cluster.name}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Typography variant="caption" fontFamily="monospace">{cluster.context}</Typography>
                                        </TableCell>
                                        <TableCell>
                                            <Chip label={envCfg.label} color={envCfg.color} size="small" />
                                        </TableCell>
                                        <TableCell>{cluster.region}</TableCell>
                                        <TableCell>
                                            <Chip label={cluster.namespace} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell>
                                            {status ? (
                                                status.available ? (
                                                    <Box display="flex" gap={0.5} flexWrap="wrap">
                                                        <Chip
                                                            label={`pods ${status.pods.running}/${status.pods.total}`}
                                                            size="small"
                                                            color={status.pods.running === status.pods.total ? 'success' : 'warning'}
                                                            icon={<CheckCircle />}
                                                        />
                                                        <Chip label={`nodes ${status.nodes.ready}`} size="small" color="info" />
                                                    </Box>
                                                ) : (
                                                    <Chip label="UNREACHABLE" color="error" size="small" icon={<ErrorIcon />} />
                                                )
                                            ) : (
                                                <Chip label={cluster.enabled ? 'enabled' : 'disabled'} size="small" color={cluster.enabled ? 'success' : 'default'} />
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <IconButton size="small" color="error" onClick={() => handleDeregister(cluster)}>
                                                <Delete fontSize="small" />
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Register Cluster Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Register Kubernetes Cluster</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField label="Cluster Name" value={newCluster.name} onChange={e => setNewCluster({ ...newCluster, name: e.target.value })} required placeholder="e.g. prod-us-east1" />
                        <TextField label="kubectl Context" value={newCluster.context} onChange={e => setNewCluster({ ...newCluster, context: e.target.value })} required placeholder="e.g. gke_project_region_cluster" />
                        <TextField label="Namespace" value={newCluster.namespace} onChange={e => setNewCluster({ ...newCluster, namespace: e.target.value })} />
                        <TextField label="Region" value={newCluster.region} onChange={e => setNewCluster({ ...newCluster, region: e.target.value })} placeholder="e.g. us-east1" />
                        <FormControl fullWidth>
                            <InputLabel>Environment</InputLabel>
                            <Select value={newCluster.environment} onChange={e => setNewCluster({ ...newCluster, environment: e.target.value })} label="Environment">
                                <MenuItem value="dev">Development</MenuItem>
                                <MenuItem value="staging">Staging</MenuItem>
                                <MenuItem value="prod">Production</MenuItem>
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRegisterCluster} variant="contained" disabled={!newCluster.name || !newCluster.context}>
                        Register
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default MultiClusterPanel;
