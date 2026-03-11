/**
 * AIIntegrationPanel — Q4 2026 AI Agent Integration & Monitoring
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, IconButton, Grid, Card, CardContent, Tooltip, Divider, Select,
    MenuItem, FormControl, InputLabel,
} from '@mui/material';
import {
    Refresh, CheckCircle, Cancel, SmartToy, Download,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
} from 'recharts';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const CHANNELS = ['CLI', 'SSH', 'API', 'Webhook', 'Dashboard'];

const MOCK_CHANNELS = [
    { name: 'CLI', connected: true },
    { name: 'SSH', connected: true },
    { name: 'API', connected: true },
    { name: 'Webhook', connected: false },
    { name: 'Dashboard', connected: true },
];

const MOCK_STATS = {
    totalWorkflows: 42,
    pendingApprovals: 3,
    executedToday: 17,
    aiEventsTimeline: Array.from({ length: 14 }, (_, i) => ({
        date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString(),
        events: Math.floor(Math.random() * 30 + 5),
        approvals: Math.floor(Math.random() * 5),
    })),
};

const MOCK_WORKFLOWS = [
    { id: 'wf1', agentId: 'agent-alpha', name: 'Scale API Gateway', channel: 'API', status: 'pending_approval', createdAt: '2026-10-01T10:00:00Z' },
    { id: 'wf2', agentId: 'agent-beta', name: 'Rotate JWT Secret', channel: 'CLI', status: 'approved_executing', createdAt: '2026-10-01T09:45:00Z' },
    { id: 'wf3', agentId: 'agent-alpha', name: 'Deploy Notification Service', channel: 'Webhook', status: 'completed', createdAt: '2026-10-01T08:30:00Z' },
    { id: 'wf4', agentId: 'agent-gamma', name: 'Clear Cache', channel: 'SSH', status: 'denied', createdAt: '2026-10-01T07:00:00Z' },
    { id: 'wf5', agentId: 'agent-beta', name: 'Run DB Migration', channel: 'API', status: 'pending_approval', createdAt: '2026-10-01T06:50:00Z' },
];

const MOCK_EVENTS = [
    { id: 'ev1', type: 'workflow_created', source: 'agent-alpha', severity: 'info', data: { name: 'Scale API Gateway' }, timestamp: '2026-10-01T10:00:00Z' },
    { id: 'ev2', type: 'secret_rotation_triggered', source: 'agent-beta', severity: 'warning', data: { key: 'JWT_SECRET' }, timestamp: '2026-10-01T09:45:00Z' },
    { id: 'ev3', type: 'unauthorized_ssh_attempt', source: 'agent-delta', severity: 'critical', data: { ip: '198.51.100.5' }, timestamp: '2026-10-01T09:20:00Z' },
    { id: 'ev4', type: 'deployment_requested', source: 'agent-alpha', severity: 'info', data: { service: 'notification-service' }, timestamp: '2026-10-01T08:30:00Z' },
    { id: 'ev5', type: 'cache_cleared', source: 'agent-gamma', severity: 'warning', data: { service: 'redis' }, timestamp: '2026-10-01T07:00:00Z' },
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function TabPanel({ value, index, children }) {
    if (value !== index) return null;
    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2 }}>
            <Box sx={{ pt: 2 }}>{children}</Box>
        </motion.div>
    );
}

const workflowStatusColor = (s) => ({
    pending_approval: 'warning',
    approved_executing: 'info',
    completed: 'success',
    denied: 'error',
}[s] || 'default');

const severityColor = (s) => ({ critical: 'error', warning: 'warning', info: 'info' }[s] || 'default');

// ---------------------------------------------------------------------------
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab({ channels, stats }) {
    return (
        <Grid container spacing={3}>
            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Channel Status</Typography>
                    <Grid container spacing={2}>
                        {channels.map((ch) => (
                            <Grid item xs={6} sm={4} md={2.4} key={ch.name}>
                                <Card variant="outlined" sx={{ textAlign: 'center', py: 1 }}>
                                    <CardContent sx={{ py: '8px !important' }}>
                                        {ch.connected
                                            ? <CheckCircle color="success" sx={{ fontSize: 28 }} />
                                            : <Cancel color="error" sx={{ fontSize: 28 }} />
                                        }
                                        <Typography variant="body2" fontWeight="bold" sx={{ mt: 0.5 }}>{ch.name}</Typography>
                                        <Chip label={ch.connected ? 'Connected' : 'Disconnected'} size="small" color={ch.connected ? 'success' : 'error'} sx={{ mt: 0.5 }} />
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Paper>
            </Grid>

            <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Workflows</Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary.main">{stats.totalWorkflows}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Pending Approvals</Typography>
                        <Typography variant="h3" fontWeight="bold" color="warning.main">{stats.pendingApprovals}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Executed Today</Typography>
                        <Typography variant="h3" fontWeight="bold" color="success.main">{stats.executedToday}</Typography>
                    </CardContent>
                </Card>
            </Grid>

            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>AI Events (14 days)</Typography>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={stats.aiEventsTimeline}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="events" stroke="#1976d2" fill="#e3f2fd" name="Events" />
                            <Area type="monotone" dataKey="approvals" stroke="#ed6c02" fill="#fff3e0" name="Approvals" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------------------------
// Workflows Tab
// ---------------------------------------------------------------------------
function WorkflowsTab({ workflows, setWorkflows }) {
    const [statusFilter, setStatusFilter] = useState('');
    const [channelFilter, setChannelFilter] = useState('');

    const filtered = workflows.filter(w =>
        (!statusFilter || w.status === statusFilter) &&
        (!channelFilter || w.channel === channelFilter)
    );

    const handleApprove = async (id) => {
        try { await api.post(`/api/v1/ai/integration/workflows/${id}/approve`); } catch { /* mock */ }
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: 'approved_executing' } : w));
    };

    const handleDeny = async (id) => {
        try { await api.post(`/api/v1/ai/integration/workflows/${id}/deny`); } catch { /* mock */ }
        setWorkflows(prev => prev.map(w => w.id === id ? { ...w, status: 'denied' } : w));
    };

    const handleApproveAllPending = async () => {
        const pending = workflows.filter(w => w.status === 'pending_approval');
        for (const w of pending) await handleApprove(w.id);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={statusFilter} label="Status" onChange={e => setStatusFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {['pending_approval', 'approved_executing', 'completed', 'denied'].map(s => (
                            <MenuItem key={s} value={s}>{s}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Channel</InputLabel>
                    <Select value={channelFilter} label="Channel" onChange={e => setChannelFilter(e.target.value)}>
                        <MenuItem value="">All</MenuItem>
                        {CHANNELS.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                    </Select>
                </FormControl>
                <Box sx={{ flexGrow: 1 }} />
                <Button variant="contained" color="warning" onClick={handleApproveAllPending}>
                    Approve All Pending
                </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Agent ID</TableCell>
                            <TableCell>Name</TableCell>
                            <TableCell>Channel</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((w) => (
                            <TableRow key={w.id} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{w.agentId}</TableCell>
                                <TableCell>{w.name}</TableCell>
                                <TableCell><Chip label={w.channel} size="small" variant="outlined" /></TableCell>
                                <TableCell><Chip label={w.status} size="small" color={workflowStatusColor(w.status)} /></TableCell>
                                <TableCell>{new Date(w.createdAt).toLocaleString()}</TableCell>
                                <TableCell align="right">
                                    {w.status === 'pending_approval' && (
                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                            <Button size="small" variant="contained" color="success" onClick={() => handleApprove(w.id)}>Approve</Button>
                                            <Button size="small" variant="outlined" color="error" onClick={() => handleDeny(w.id)}>Deny</Button>
                                        </Box>
                                    )}
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Events Tab
// ---------------------------------------------------------------------------
function EventsTab({ events, setEvents }) {
    const [severityFilter, setSeverityFilter] = useState('');
    const [exporting, setExporting] = useState(false);

    const filtered = severityFilter ? events.filter(e => e.severity === severityFilter) : events;

    const handleExport = () => {
        setExporting(true);
        const header = 'type,source,severity,data,timestamp';
        const rows = filtered.map(e => `${e.type},${e.source},${e.severity},"${JSON.stringify(e.data).replace(/"/g, '""')}",${e.timestamp}`);
        const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'ai-events.csv'; a.click();
        URL.revokeObjectURL(url);
        setExporting(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <Typography variant="body2" color="text.secondary">Severity:</Typography>
                {['', 'critical', 'warning', 'info'].map(s => (
                    <Chip
                        key={s || 'all'}
                        label={s || 'All'}
                        size="small"
                        color={s ? severityColor(s) : 'default'}
                        onClick={() => setSeverityFilter(s)}
                        variant={severityFilter === s ? 'filled' : 'outlined'}
                        clickable
                    />
                ))}
                <Box sx={{ flexGrow: 1 }} />
                <Button size="small" variant="outlined" startIcon={exporting ? <CircularProgress size={14} /> : <Download />} onClick={handleExport} disabled={exporting}>
                    Export
                </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Type</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell>Severity</TableCell>
                            <TableCell>Data</TableCell>
                            <TableCell>Timestamp</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((e) => (
                            <TableRow key={e.id} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{e.type}</TableCell>
                                <TableCell>{e.source}</TableCell>
                                <TableCell><Chip label={e.severity} size="small" color={severityColor(e.severity)} /></TableCell>
                                <TableCell sx={{ fontSize: '0.75rem', fontFamily: 'monospace', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {JSON.stringify(e.data)}
                                </TableCell>
                                <TableCell>{new Date(e.timestamp).toLocaleString()}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// AI Monitor Tab
// ---------------------------------------------------------------------------
function AIMonitorTab({ workflows, events, onApproveAllPending }) {
    const [refreshing, setRefreshing] = useState(false);
    const pending = workflows.filter(w => w.status === 'pending_approval');

    const recentActivity = [...events.slice(0, 5).map(e => ({ ...e, kind: 'event' })),
        ...workflows.slice(0, 5).map(w => ({ ...w, kind: 'workflow' }))]
        .sort((a, b) => new Date(b.timestamp || b.createdAt) - new Date(a.timestamp || a.createdAt))
        .slice(0, 10);

    const handleRefresh = async () => {
        setRefreshing(true);
        await new Promise(r => setTimeout(r, 800));
        setRefreshing(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 3, alignItems: 'center' }}>
                <Button variant="outlined" startIcon={refreshing ? <CircularProgress size={14} /> : <Refresh />} onClick={handleRefresh} disabled={refreshing}>
                    Refresh
                </Button>
                {pending.length > 0 && (
                    <Button variant="contained" color="warning" onClick={onApproveAllPending}>
                        Approve All Pending ({pending.length})
                    </Button>
                )}
                {pending.length === 0 && (
                    <Chip label="No pending approvals" color="success" size="small" />
                )}
            </Box>

            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Agent Activity Timeline</Typography>
            <Box>
                {recentActivity.map((item) => (
                    <motion.div key={item.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                        <Paper variant="outlined" sx={{ p: 1.5, mb: 1, display: 'flex', gap: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                            <SmartToy color="primary" />
                            <Box sx={{ flex: 1, minWidth: 0 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ fontFamily: 'monospace' }}>
                                        {item.agentId || item.source}
                                    </Typography>
                                    <Chip label={item.channel || item.type} size="small" variant="outlined" />
                                    {item.kind === 'workflow' && <Chip label={item.status} size="small" color={workflowStatusColor(item.status)} />}
                                    {item.kind === 'event' && <Chip label={item.severity} size="small" color={severityColor(item.severity)} />}
                                </Box>
                                <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                                    {item.name || item.type}
                                </Typography>
                            </Box>
                            <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                {new Date(item.timestamp || item.createdAt).toLocaleString()}
                            </Typography>
                        </Paper>
                    </motion.div>
                ))}
                {recentActivity.length === 0 && (
                    <Typography variant="body2" color="text.secondary" sx={{ py: 3, textAlign: 'center' }}>No recent activity.</Typography>
                )}
            </Box>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function AIIntegrationPanel() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [channels, setChannels] = useState([]);
    const [stats, setStats] = useState(MOCK_STATS);
    const [workflows, setWorkflows] = useState([]);
    const [events, setEvents] = useState([]);

    const eventsIntervalRef = useRef(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [chRes, stRes, wfRes, evRes] = await Promise.allSettled([
                api.get('/api/v1/ai/integration/channels'),
                api.get('/api/v1/ai/integration/stats'),
                api.get('/api/v1/ai/integration/workflows'),
                api.get('/api/v1/ai/integration/events'),
            ]);
            setChannels(chRes.status === 'fulfilled' ? chRes.value.data : MOCK_CHANNELS);
            setStats(stRes.status === 'fulfilled' ? stRes.value.data : MOCK_STATS);
            setWorkflows(wfRes.status === 'fulfilled' ? wfRes.value.data : MOCK_WORKFLOWS);
            setEvents(evRes.status === 'fulfilled' ? evRes.value.data : MOCK_EVENTS);
        } catch {
            setError('Some data could not be loaded. Showing mock data.');
            setChannels(MOCK_CHANNELS);
            setStats(MOCK_STATS);
            setWorkflows(MOCK_WORKFLOWS);
            setEvents(MOCK_EVENTS);
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchData();
        // Auto-refresh events every 30 seconds
        eventsIntervalRef.current = setInterval(async () => {
            try {
                const res = await api.get('/api/v1/ai/integration/events');
                setEvents(res.data);
            } catch { /* keep existing */ }
        }, 30000);
        return () => clearInterval(eventsIntervalRef.current);
    }, [fetchData]);

    const handleApproveAllPending = useCallback(async () => {
        const pending = workflows.filter(w => w.status === 'pending_approval');
        for (const w of pending) {
            try { await api.post(`/api/v1/ai/integration/workflows/${w.id}/approve`); } catch { /* mock */ }
        }
        setWorkflows(prev => prev.map(w => w.status === 'pending_approval' ? { ...w, status: 'approved_executing' } : w));
    }, [workflows]);

    const TABS = ['Overview', 'Workflows', 'Events', 'AI Monitor'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <SmartToy sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">AI Integration Panel</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchData} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : <Refresh />}
                    </IconButton>
                </Tooltip>
            </Box>

            <AnimatePresence>
                {error && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            <Paper variant="outlined">
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {TABS.map(label => <Tab key={label} label={label} />)}
                </Tabs>
                <Box sx={{ p: 2 }}>
                    <TabPanel value={tab} index={0}>
                        <OverviewTab channels={channels} stats={stats} />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <WorkflowsTab workflows={workflows} setWorkflows={setWorkflows} />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <EventsTab events={events} setEvents={setEvents} />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <AIMonitorTab workflows={workflows} events={events} onApproveAllPending={handleApproveAllPending} />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
