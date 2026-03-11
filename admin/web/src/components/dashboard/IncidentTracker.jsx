import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Button, Card, CardContent, Chip, CircularProgress,
    Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, InputLabel, MenuItem, Paper, Select,
    TextField, Typography, Grid, Alert,
    Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, IconButton, Divider,
    Tooltip, Stack,
} from '@mui/material';
import {
    Add, BugReport, CheckCircle, ErrorOutline, HourglassEmpty,
    ExpandMore, ExpandLess, Refresh, Timeline,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITIES = ['critical', 'high', 'medium', 'low'];
const STATUSES   = ['open', 'investigating', 'resolved'];

const SERVICES = [
    'user-service', 'api-gateway', 'content-service', 'messaging-service',
    'notification-service', 'auth-service', 'media-service', 'search-service',
];

const SEVERITY_COLOR = { critical: 'error', high: 'warning', medium: 'info', low: 'success' };
const STATUS_COLOR   = { open: 'error', investigating: 'warning', resolved: 'success' };

const STATUS_ICON = {
    open:          <ErrorOutline fontSize="small" />,
    investigating: <HourglassEmpty fontSize="small" />,
    resolved:      <CheckCircle fontSize="small" />,
};

// ---------------------------------------------------------------------------
// Mock data (used when API is unavailable)
// ---------------------------------------------------------------------------

const MOCK_INCIDENTS = [
    {
        id: 'INC-0001',
        title: 'API gateway elevated error rate',
        description: '5xx errors spiking above 2% on /api/v1/users',
        severity: 'high',
        status: 'investigating',
        affectedServices: ['api-gateway', 'user-service'],
        assignee: 'alice@milonexa.io',
        timeline: [
            { timestamp: '2026-07-01T09:00:00Z', text: 'Incident created' },
            { timestamp: '2026-07-01T09:15:00Z', text: 'Assigned to on-call engineer' },
        ],
        createdAt: '2026-07-01T09:00:00Z',
        updatedAt: '2026-07-01T09:15:00Z',
    },
    {
        id: 'INC-0002',
        title: 'Database connection pool exhausted',
        description: 'PostgreSQL max_connections reached on primary',
        severity: 'critical',
        status: 'resolved',
        affectedServices: ['user-service', 'content-service'],
        assignee: 'bob@milonexa.io',
        timeline: [
            { timestamp: '2026-06-28T14:00:00Z', text: 'Incident created' },
            { timestamp: '2026-06-28T14:30:00Z', text: 'Connection pool size increased' },
            { timestamp: '2026-06-28T15:00:00Z', text: 'Incident resolved' },
        ],
        createdAt: '2026-06-28T14:00:00Z',
        updatedAt: '2026-06-28T15:00:00Z',
        resolvedAt: '2026-06-28T15:00:00Z',
    },
    {
        id: 'INC-0003',
        title: 'Push notification delivery delays',
        description: 'Notification service queue backed up — P95 delivery >10 s',
        severity: 'medium',
        status: 'open',
        affectedServices: ['notification-service'],
        assignee: '',
        timeline: [{ timestamp: '2026-07-02T11:00:00Z', text: 'Incident created' }],
        createdAt: '2026-07-02T11:00:00Z',
        updatedAt: '2026-07-02T11:00:00Z',
    },
    {
        id: 'INC-0004',
        title: 'Media upload service returning 503',
        description: 'Storage backend unreachable intermittently',
        severity: 'high',
        status: 'resolved',
        affectedServices: ['media-service'],
        assignee: 'charlie@milonexa.io',
        timeline: [
            { timestamp: '2026-06-30T08:00:00Z', text: 'Incident created' },
            { timestamp: '2026-06-30T09:00:00Z', text: 'Failover to secondary bucket' },
            { timestamp: '2026-06-30T10:00:00Z', text: 'Incident resolved' },
        ],
        createdAt: '2026-06-30T08:00:00Z',
        updatedAt: '2026-06-30T10:00:00Z',
        resolvedAt: '2026-06-30T10:00:00Z',
    },
    {
        id: 'INC-0005',
        title: 'Auth service token refresh latency',
        description: 'JWT refresh P99 latency >800 ms',
        severity: 'low',
        status: 'open',
        affectedServices: ['auth-service'],
        assignee: '',
        timeline: [{ timestamp: '2026-07-03T07:00:00Z', text: 'Incident created' }],
        createdAt: '2026-07-03T07:00:00Z',
        updatedAt: '2026-07-03T07:00:00Z',
    },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function calcMTTR(incidents) {
    const resolved = incidents.filter((i) => i.resolvedAt && i.createdAt);
    if (!resolved.length) return 'N/A';
    const totalMs = resolved.reduce((sum, i) => {
        return sum + (new Date(i.resolvedAt) - new Date(i.createdAt));
    }, 0);
    const avgMin = Math.round(totalMs / resolved.length / 60000);
    return `${avgMin} min`;
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

function StatCard({ label, value, color }) {
    return (
        <Card sx={{ flex: 1, minWidth: 120 }} elevation={2}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Typography variant="h4" color={color} fontWeight={700}>{value}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent>
        </Card>
    );
}

function IncidentDetail({ incident, onAddUpdate, onResolve }) {
    const [updateText, setUpdateText] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const handleAddUpdate = async () => {
        if (!updateText.trim()) return;
        setSubmitting(true);
        await onAddUpdate(incident.id, updateText.trim());
        setUpdateText('');
        setSubmitting(false);
    };

    return (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
            <Typography variant="subtitle2" gutterBottom>
                <Timeline sx={{ fontSize: 14, mr: 0.5, verticalAlign: 'middle' }} />
                Timeline
            </Typography>
            {incident.timeline.map((t, idx) => (
                <Box key={idx} sx={{ display: 'flex', gap: 1, mb: 0.5, ml: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ minWidth: 180 }}>
                        {new Date(t.timestamp).toLocaleString()}
                    </Typography>
                    <Typography variant="caption">{t.text}</Typography>
                </Box>
            ))}
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" spacing={1} alignItems="flex-end">
                <TextField
                    size="small"
                    fullWidth
                    label="Add update"
                    value={updateText}
                    onChange={(e) => setUpdateText(e.target.value)}
                    multiline
                    maxRows={3}
                />
                <Button
                    variant="outlined"
                    size="small"
                    onClick={handleAddUpdate}
                    disabled={submitting || !updateText.trim()}
                >
                    {submitting ? <CircularProgress size={16} /> : 'Add'}
                </Button>
                {incident.status !== 'resolved' && (
                    <Button
                        variant="contained"
                        color="success"
                        size="small"
                        onClick={() => onResolve(incident.id)}
                    >
                        Resolve
                    </Button>
                )}
            </Stack>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function IncidentTracker() {
    const [incidents, setIncidents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [filterStatus, setFilterStatus] = useState('');
    const [filterSeverity, setFilterSeverity] = useState('');
    const [expandedId, setExpandedId] = useState(null);
    const [newDialog, setNewDialog] = useState(false);

    // New incident form state
    const [newTitle, setNewTitle] = useState('');
    const [newDescription, setNewDescription] = useState('');
    const [newSeverity, setNewSeverity] = useState('medium');
    const [newServices, setNewServices] = useState([]);
    const [newAssignee, setNewAssignee] = useState('');
    const [creating, setCreating] = useState(false);

    const fetchIncidents = useCallback(async () => {
        setLoading(true);
        setError('');
        try {
            const res = await api.get('/api/v1/incidents');
            setIncidents(res.data.incidents || []);
        } catch (_) {
            setIncidents(MOCK_INCIDENTS);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchIncidents(); }, [fetchIncidents]);

    const handleCreate = async () => {
        if (!newTitle.trim()) return;
        setCreating(true);
        try {
            await api.post('/api/v1/incidents', {
                title: newTitle.trim(),
                description: newDescription.trim(),
                severity: newSeverity,
                affectedServices: newServices,
                assignee: newAssignee.trim(),
            });
            setNewDialog(false);
            setNewTitle(''); setNewDescription(''); setNewSeverity('medium');
            setNewServices([]); setNewAssignee('');
            fetchIncidents();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to create incident');
        } finally {
            setCreating(false);
        }
    };

    const handleAddUpdate = async (id, text) => {
        try {
            await api.post(`/api/v1/incidents/${id}/update`, { text });
            fetchIncidents();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to add update');
        }
    };

    const handleResolve = async (id) => {
        try {
            await api.post(`/api/v1/incidents/${id}/resolve`);
            fetchIncidents();
        } catch (e) {
            setError(e.response?.data?.error || 'Failed to resolve incident');
        }
    };

    const filtered = incidents.filter((i) => {
        if (filterStatus && i.status !== filterStatus) return false;
        if (filterSeverity && i.severity !== filterSeverity) return false;
        return true;
    });

    const stats = {
        open:          incidents.filter((i) => i.status === 'open').length,
        investigating: incidents.filter((i) => i.status === 'investigating').length,
        resolved:      incidents.filter((i) => i.status === 'resolved').length,
        mttr:          calcMTTR(incidents),
    };

    return (
        <Box sx={{ p: 2 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h5" fontWeight={700}>
                    <BugReport sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Incident Tracker
                </Typography>
                <Stack direction="row" spacing={1}>
                    <Tooltip title="Refresh">
                        <IconButton onClick={fetchIncidents} size="small">
                            <Refresh />
                        </IconButton>
                    </Tooltip>
                    <Button
                        variant="contained"
                        startIcon={<Add />}
                        onClick={() => setNewDialog(true)}
                        size="small"
                    >
                        New Incident
                    </Button>
                </Stack>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>{error}</Alert>}

            {/* Stats */}
            <Stack direction="row" spacing={2} sx={{ mb: 3 }} flexWrap="wrap">
                <StatCard label="Open"          value={stats.open}          color="error.main" />
                <StatCard label="Investigating" value={stats.investigating} color="warning.main" />
                <StatCard label="Resolved"      value={stats.resolved}      color="success.main" />
                <StatCard label="MTTR"          value={stats.mttr}          color="text.primary" />
            </Stack>

            {/* Filters */}
            <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={filterStatus} label="Status" onChange={(e) => setFilterStatus(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Severity</InputLabel>
                    <Select value={filterSeverity} label="Severity" onChange={(e) => setFilterSeverity(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>
            </Stack>

            {/* Table */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Title</TableCell>
                                <TableCell>Severity</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Assignee</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Updated</TableCell>
                                <TableCell />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            <AnimatePresence initial={false}>
                                {filtered.map((inc) => (
                                    <React.Fragment key={inc.id}>
                                        <motion.tr
                                            layout
                                            initial={{ opacity: 0, y: -8 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: 8 }}
                                            style={{ display: 'table-row' }}
                                        >
                                            <TableCell>
                                                <Typography variant="caption" fontFamily="monospace">
                                                    {inc.id}
                                                </Typography>
                                            </TableCell>
                                            <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {inc.title}
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    label={inc.severity}
                                                    color={SEVERITY_COLOR[inc.severity] || 'default'}
                                                    size="small"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Chip
                                                    icon={STATUS_ICON[inc.status]}
                                                    label={inc.status}
                                                    color={STATUS_COLOR[inc.status] || 'default'}
                                                    size="small"
                                                    variant="outlined"
                                                />
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">{inc.assignee || '—'}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {new Date(inc.createdAt).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="caption">
                                                    {new Date(inc.updatedAt).toLocaleDateString()}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <IconButton
                                                    size="small"
                                                    onClick={() => setExpandedId(expandedId === inc.id ? null : inc.id)}
                                                    aria-label={expandedId === inc.id ? 'Collapse' : 'Expand'}
                                                >
                                                    {expandedId === inc.id ? <ExpandLess /> : <ExpandMore />}
                                                </IconButton>
                                            </TableCell>
                                        </motion.tr>
                                        {expandedId === inc.id && (
                                            <TableRow>
                                                <TableCell colSpan={8} sx={{ py: 0, px: 2 }}>
                                                    <AnimatePresence>
                                                        <motion.div
                                                            initial={{ height: 0, opacity: 0 }}
                                                            animate={{ height: 'auto', opacity: 1 }}
                                                            exit={{ height: 0, opacity: 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            {inc.description && (
                                                                <Typography variant="body2" sx={{ mt: 1, mb: 0.5 }} color="text.secondary">
                                                                    {inc.description}
                                                                </Typography>
                                                            )}
                                                            {inc.affectedServices?.length > 0 && (
                                                                <Stack direction="row" spacing={0.5} sx={{ mb: 1 }} flexWrap="wrap">
                                                                    {inc.affectedServices.map((s) => (
                                                                        <Chip key={s} label={s} size="small" variant="outlined" />
                                                                    ))}
                                                                </Stack>
                                                            )}
                                                            <IncidentDetail
                                                                incident={inc}
                                                                onAddUpdate={handleAddUpdate}
                                                                onResolve={handleResolve}
                                                            />
                                                        </motion.div>
                                                    </AnimatePresence>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </React.Fragment>
                                ))}
                            </AnimatePresence>
                            {filtered.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                                        <Typography color="text.secondary">No incidents found</Typography>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}

            {/* New Incident Dialog */}
            <Dialog open={newDialog} onClose={() => setNewDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Incident</DialogTitle>
                <DialogContent>
                    <TextField
                        required autoFocus fullWidth
                        label="Title" margin="normal"
                        value={newTitle} onChange={(e) => setNewTitle(e.target.value)}
                    />
                    <TextField
                        fullWidth multiline rows={3}
                        label="Description" margin="normal"
                        value={newDescription} onChange={(e) => setNewDescription(e.target.value)}
                    />
                    <Grid container spacing={2} sx={{ mt: 0 }}>
                        <Grid item xs={6}>
                            <FormControl fullWidth size="small">
                                <InputLabel>Severity</InputLabel>
                                <Select value={newSeverity} label="Severity" onChange={(e) => setNewSeverity(e.target.value)}>
                                    {SEVERITIES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                                </Select>
                            </FormControl>
                        </Grid>
                        <Grid item xs={6}>
                            <TextField
                                fullWidth size="small"
                                label="Assignee (email)"
                                value={newAssignee} onChange={(e) => setNewAssignee(e.target.value)}
                            />
                        </Grid>
                    </Grid>
                    <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                        <InputLabel>Affected Services</InputLabel>
                        <Select
                            multiple
                            value={newServices}
                            label="Affected Services"
                            onChange={(e) => setNewServices(e.target.value)}
                            renderValue={(selected) => (
                                <Stack direction="row" flexWrap="wrap" gap={0.5}>
                                    {selected.map((s) => <Chip key={s} label={s} size="small" />)}
                                </Stack>
                            )}
                        >
                            {SERVICES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewDialog(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={handleCreate}
                        disabled={creating || !newTitle.trim()}
                        startIcon={creating ? <CircularProgress size={16} /> : <Add />}
                    >
                        Create
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
