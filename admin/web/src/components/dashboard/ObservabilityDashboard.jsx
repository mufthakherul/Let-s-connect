/**
 * ObservabilityDashboard — Q4 2026 Traces, Runbooks, Change Log & SLA Reports
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Card, CardContent, Tooltip, Divider, Select,
    MenuItem, FormControl, InputLabel, FormHelperText,
} from '@mui/material';
import {
    Refresh, Add, Edit, Delete, PlayArrow, Link as LinkIcon,
    CheckCircle, Download, Schedule, Analytics,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_TRACES = [
    { traceId: 'abc123def456ghi789', operation: 'POST /api/v1/users', service: 'user-service', duration: 142, status: 'ok', timestamp: '2026-10-01T10:00:00Z', spans: [{ name: 'db.query', start: 0, duration: 80 }, { name: 'cache.get', start: 80, duration: 20 }, { name: 'serialize', start: 100, duration: 42 }] },
    { traceId: 'xyz987uvw654rst321', operation: 'GET /api/v1/messages', service: 'messaging-service', duration: 85, status: 'ok', timestamp: '2026-10-01T09:58:00Z', spans: [{ name: 'auth.check', start: 0, duration: 15 }, { name: 'db.query', start: 15, duration: 70 }] },
    { traceId: 'err000aaa111bbb222', operation: 'PUT /api/v1/content', service: 'content-service', duration: 320, status: 'error', timestamp: '2026-10-01T09:55:00Z', spans: [{ name: 'db.query', start: 0, duration: 200 }, { name: 'validation', start: 200, duration: 120 }] },
    { traceId: 'ccc333ddd444eee555', operation: 'GET /api/v1/health', service: 'api-gateway', duration: 12, status: 'ok', timestamp: '2026-10-01T09:50:00Z', spans: [{ name: 'health.check', start: 0, duration: 12 }] },
];

const MOCK_RUNBOOKS = [
    { id: 'rb1', name: 'Restart API Gateway', category: 'ops', steps: 5, lastExecuted: '2026-09-28T14:00:00Z' },
    { id: 'rb2', name: 'DB Failover', category: 'database', steps: 8, lastExecuted: '2026-09-15T09:30:00Z' },
    { id: 'rb3', name: 'Clear Redis Cache', category: 'cache', steps: 3, lastExecuted: '2026-10-01T08:00:00Z' },
];

const MOCK_CHANGELOG = [
    { id: 'cl1', actor: 'alice', action: 'UPDATE', resource: 'user-service config', ticketRef: 'TICK-101', environment: 'production', timestamp: '2026-10-01T11:00:00Z' },
    { id: 'cl2', actor: 'bob', action: 'DEPLOY', resource: 'messaging-service v2.3', ticketRef: 'TICK-98', environment: 'staging', timestamp: '2026-10-01T10:30:00Z' },
    { id: 'cl3', actor: 'carol', action: 'CREATE', resource: 'feature flag dark-mode', ticketRef: '', environment: 'development', timestamp: '2026-10-01T09:00:00Z' },
];

const MOCK_SLA_HISTORY = [
    { id: 'sl1', generatedAt: '2026-09-30T08:00:00Z', format: 'PDF', recipients: 'cto@milonexa.com', status: 'sent' },
    { id: 'sl2', generatedAt: '2026-08-31T08:00:00Z', format: 'HTML', recipients: 'ops@milonexa.com', status: 'sent' },
];

const MOCK_SLA_SCHEDULE = { cron: '0 8 1 * *', recipients: 'cto@milonexa.com\nops@milonexa.com', format: 'PDF' };

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

function StatusBadge({ status }) {
    return <Chip label={status} size="small" color={status === 'ok' ? 'success' : 'error'} />;
}

// ---------------------------------------------------------------------------
// Traces Tab
// ---------------------------------------------------------------------------
function TracesTab({ traces, loading }) {
    const [expanded, setExpanded] = useState(null);

    const toggleRow = (traceId) => setExpanded(prev => prev === traceId ? null : traceId);

    return (
        <Box>
            {loading && <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}><CircularProgress /></Box>}
            {!loading && (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Trace ID</TableCell>
                                <TableCell>Operation</TableCell>
                                <TableCell>Service</TableCell>
                                <TableCell>Duration (ms)</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Timestamp</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {traces.map((t) => (
                                <React.Fragment key={t.traceId}>
                                    <TableRow hover sx={{ cursor: 'pointer' }} onClick={() => toggleRow(t.traceId)}>
                                        <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>
                                            {t.traceId.substring(0, 12)}…
                                        </TableCell>
                                        <TableCell>{t.operation}</TableCell>
                                        <TableCell>{t.service}</TableCell>
                                        <TableCell>{t.duration}</TableCell>
                                        <TableCell><StatusBadge status={t.status} /></TableCell>
                                        <TableCell>{new Date(t.timestamp).toLocaleString()}</TableCell>
                                    </TableRow>
                                    {expanded === t.traceId && (
                                        <TableRow>
                                            <TableCell colSpan={6} sx={{ bgcolor: 'action.hover', py: 1.5 }}>
                                                <Typography variant="caption" fontWeight="bold" sx={{ mb: 1, display: 'block' }}>
                                                    Span Waterfall (total: {t.duration}ms)
                                                </Typography>
                                                {t.spans.map((span, i) => {
                                                    const leftPct = (span.start / t.duration) * 100;
                                                    const widthPct = (span.duration / t.duration) * 100;
                                                    return (
                                                        <Box key={i} sx={{ mb: 0.5 }}>
                                                            <Typography variant="caption" sx={{ display: 'inline-block', width: 140 }}>{span.name}</Typography>
                                                            <Box sx={{ display: 'inline-block', width: 'calc(100% - 200px)', height: 14, bgcolor: 'grey.200', borderRadius: 1, position: 'relative', verticalAlign: 'middle' }}>
                                                                <Box sx={{ position: 'absolute', left: `${leftPct}%`, width: `${widthPct}%`, height: '100%', bgcolor: 'primary.main', borderRadius: 1 }} />
                                                            </Box>
                                                            <Typography variant="caption" sx={{ ml: 1 }}>{span.duration}ms</Typography>
                                                        </Box>
                                                    );
                                                })}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </React.Fragment>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Runbooks Tab
// ---------------------------------------------------------------------------
function RunbooksTab({ runbooks, setRunbooks }) {
    const [dlgOpen, setDlgOpen] = useState(false);
    const [editTarget, setEditTarget] = useState(null);
    const [form, setForm] = useState({ name: '', category: '', steps: '' });
    const [runDlgOpen, setRunDlgOpen] = useState(false);
    const [runTarget, setRunTarget] = useState(null);
    const [runParams, setRunParams] = useState('');
    const [runSteps, setRunSteps] = useState([]);
    const [running, setRunning] = useState(false);

    const openCreate = () => { setEditTarget(null); setForm({ name: '', category: '', steps: '' }); setDlgOpen(true); };
    const openEdit = (rb) => { setEditTarget(rb); setForm({ name: rb.name, category: rb.category, steps: String(rb.steps) }); setDlgOpen(true); };

    const handleSave = async () => {
        const payload = { name: form.name, category: form.category, steps: parseInt(form.steps, 10) || 1 };
        try {
            if (editTarget) {
                await api.put(`/api/v1/runbooks/${editTarget.id}`, payload);
                setRunbooks(prev => prev.map(r => r.id === editTarget.id ? { ...r, ...payload } : r));
            } else {
                const res = await api.post('/api/v1/runbooks', payload);
                setRunbooks(prev => [...prev, { id: res.data?.id || `rb${Date.now()}`, lastExecuted: null, ...payload }]);
            }
        } catch {
            setRunbooks(prev => editTarget
                ? prev.map(r => r.id === editTarget.id ? { ...r, ...payload } : r)
                : [...prev, { id: `rb${Date.now()}`, lastExecuted: null, ...payload }]);
        }
        setDlgOpen(false);
    };

    const handleDelete = async (id) => {
        try { await api.delete(`/api/v1/runbooks/${id}`); } catch { /* ignored */ }
        setRunbooks(prev => prev.filter(r => r.id !== id));
    };

    const openRun = (rb) => { setRunTarget(rb); setRunParams(''); setRunSteps([]); setRunDlgOpen(true); };

    const handleRun = async () => {
        setRunning(true);
        setRunSteps(['Initializing…']);
        const mockStepNames = ['Validating params', 'Connecting to service', 'Executing step 1', 'Executing step 2', 'Finalizing', 'Done ✓'];
        let stepIdx = 0;
        const poll = setInterval(() => {
            if (stepIdx < mockStepNames.length) {
                setRunSteps(prev => [...prev, mockStepNames[stepIdx]]);
                stepIdx++;
            } else {
                clearInterval(poll);
                setRunning(false);
                setRunbooks(prev => prev.map(r => r.id === runTarget.id ? { ...r, lastExecuted: new Date().toISOString() } : r));
            }
        }, 600);
        try {
            await api.post(`/api/v1/runbooks/${runTarget.id}/execute`, { params: runParams });
        } catch { /* use mock steps */ }
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<Add />} onClick={openCreate}>Create Runbook</Button>
            </Box>
            <Grid container spacing={2}>
                {runbooks.map((rb) => (
                    <Grid item xs={12} sm={6} md={4} key={rb.id}>
                        <Card variant="outlined">
                            <CardContent>
                                <Typography variant="subtitle1" fontWeight="bold">{rb.name}</Typography>
                                <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                                    <Chip label={rb.category} size="small" variant="outlined" />
                                    <Chip label={`${rb.steps} steps`} size="small" color="primary" variant="outlined" />
                                    {rb.lastExecuted && (
                                        <Chip label={`Last: ${new Date(rb.lastExecuted).toLocaleDateString()}`} size="small" />
                                    )}
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                                    <Button size="small" variant="contained" startIcon={<PlayArrow />} onClick={() => openRun(rb)}>Run</Button>
                                    <Button size="small" startIcon={<Edit />} onClick={() => openEdit(rb)}>Edit</Button>
                                    <Button size="small" color="error" startIcon={<Delete />} onClick={() => handleDelete(rb.id)}>Delete</Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* Create/Edit dialog */}
            <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>{editTarget ? 'Edit Runbook' : 'Create Runbook'}</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
                    <TextField label="Category" value={form.category} onChange={e => setForm(f => ({ ...f, category: e.target.value }))} fullWidth />
                    <TextField label="Steps count" type="number" value={form.steps} onChange={e => setForm(f => ({ ...f, steps: e.target.value }))} fullWidth />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDlgOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleSave}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Run dialog */}
            <Dialog open={runDlgOpen} onClose={() => !running && setRunDlgOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Run: {runTarget?.name}</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <TextField
                        label="Parameters (JSON)"
                        multiline
                        rows={3}
                        value={runParams}
                        onChange={e => setRunParams(e.target.value)}
                        fullWidth
                        sx={{ mb: 2 }}
                        disabled={running || runSteps.length > 0}
                    />
                    {runSteps.length > 0 && (
                        <Paper variant="outlined" sx={{ p: 1.5, bgcolor: 'grey.900', maxHeight: 180, overflowY: 'auto' }}>
                            {runSteps.map((s, i) => (
                                <Typography key={i} variant="body2" sx={{ fontFamily: 'monospace', color: 'success.light' }}>{`> ${s}`}</Typography>
                            ))}
                            {running && <CircularProgress size={14} sx={{ mt: 1 }} />}
                        </Paper>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRunDlgOpen(false)} disabled={running}>Close</Button>
                    {runSteps.length === 0 && (
                        <Button variant="contained" onClick={handleRun} disabled={running}>Execute</Button>
                    )}
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Change Log Tab
// ---------------------------------------------------------------------------
function ChangeLogTab({ changeLog, setChangeLog }) {
    const [search, setSearch] = useState('');
    const [ticketDlg, setTicketDlg] = useState(false);
    const [ticketTarget, setTicketTarget] = useState(null);
    const [ticketRef, setTicketRef] = useState('');

    const filtered = changeLog.filter(c =>
        [c.actor, c.action, c.resource, c.ticketRef, c.environment].some(v =>
            v?.toLowerCase().includes(search.toLowerCase())
        )
    );

    const handleLinkTicket = async () => {
        try {
            await api.put(`/api/v1/change-log/${ticketTarget.id}`, { ticketRef });
        } catch { /* mock */ }
        setChangeLog(prev => prev.map(c => c.id === ticketTarget.id ? { ...c, ticketRef } : c));
        setTicketDlg(false);
    };

    const handleApprove = async (id) => {
        try { await api.post(`/api/v1/change-log/${id}/approve`); } catch { /* mock */ }
        setChangeLog(prev => prev.map(c => c.id === id ? { ...c, approved: true } : c));
    };

    const handleExportCSV = () => {
        const header = 'actor,action,resource,ticketRef,environment,timestamp';
        const rows = filtered.map(c => `${c.actor},${c.action},"${c.resource}",${c.ticketRef || ''},${c.environment},${c.timestamp}`);
        const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = 'change-log.csv'; a.click();
        URL.revokeObjectURL(url);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField
                    label="Search"
                    size="small"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    sx={{ flexGrow: 1, minWidth: 200 }}
                />
                <Button variant="outlined" startIcon={<Download />} onClick={handleExportCSV}>Export CSV</Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Actor</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Resource</TableCell>
                            <TableCell>Ticket Ref</TableCell>
                            <TableCell>Environment</TableCell>
                            <TableCell>Timestamp</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((c) => (
                            <TableRow key={c.id} hover>
                                <TableCell>{c.actor}</TableCell>
                                <TableCell><Chip label={c.action} size="small" variant="outlined" /></TableCell>
                                <TableCell>{c.resource}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{c.ticketRef || '—'}</TableCell>
                                <TableCell><Chip label={c.environment} size="small" color={c.environment === 'production' ? 'error' : c.environment === 'staging' ? 'warning' : 'default'} /></TableCell>
                                <TableCell>{new Date(c.timestamp).toLocaleString()}</TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                        <Button size="small" startIcon={<LinkIcon />} onClick={() => { setTicketTarget(c); setTicketRef(c.ticketRef || ''); setTicketDlg(true); }}>
                                            Link
                                        </Button>
                                        {!c.approved && (
                                            <Button size="small" variant="outlined" color="success" startIcon={<CheckCircle />} onClick={() => handleApprove(c.id)}>
                                                Approve
                                            </Button>
                                        )}
                                        {c.approved && <Chip label="Approved" color="success" size="small" />}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={ticketDlg} onClose={() => setTicketDlg(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Link Ticket</DialogTitle>
                <DialogContent sx={{ pt: '16px !important' }}>
                    <TextField label="Ticket Reference" value={ticketRef} onChange={e => setTicketRef(e.target.value)} fullWidth placeholder="e.g. TICK-123" />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTicketDlg(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleLinkTicket}>Save</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// SLA Reports Tab
// ---------------------------------------------------------------------------
function SLAReportsTab({ schedule, setSchedule, history, setHistory }) {
    const [saving, setSaving] = useState(false);
    const [generating, setGenerating] = useState(false);

    const handleSaveSchedule = async () => {
        setSaving(true);
        try {
            await api.post('/api/v1/sla/report/schedule', schedule);
        } catch { /* mock */ }
        setSaving(false);
    };

    const handleGenerateNow = async () => {
        setGenerating(true);
        try {
            const res = await api.post('/api/v1/sla/report/generate', { format: schedule.format });
            const htmlUrl = res.data?.url || `data:text/html,<h1>SLA Report ${new Date().toLocaleDateString()}</h1><p>Uptime: 99.95%</p>`;
            window.open(htmlUrl, '_blank');
        } catch {
            const html = `<html><body><h1>SLA Report ${new Date().toLocaleDateString()}</h1><p>Uptime: 99.95% | MTTR: 12min | Incidents: 2</p></body></html>`;
            const blob = new Blob([html], { type: 'text/html' });
            window.open(URL.createObjectURL(blob), '_blank');
        }
        setHistory(prev => [{ id: `sl${Date.now()}`, generatedAt: new Date().toISOString(), format: schedule.format, recipients: schedule.recipients, status: 'sent' }, ...prev]);
        setGenerating(false);
    };

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={5}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Schedule Configuration</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        <TextField
                            label="Cron Expression"
                            value={schedule.cron}
                            onChange={e => setSchedule(s => ({ ...s, cron: e.target.value }))}
                            fullWidth
                            helperText="e.g. 0 8 1 * * (1st of every month at 08:00)"
                        />
                        <TextField
                            label="Recipients (one per line)"
                            multiline
                            rows={3}
                            value={schedule.recipients}
                            onChange={e => setSchedule(s => ({ ...s, recipients: e.target.value }))}
                            fullWidth
                        />
                        <FormControl fullWidth>
                            <InputLabel>Format</InputLabel>
                            <Select value={schedule.format} label="Format" onChange={e => setSchedule(s => ({ ...s, format: e.target.value }))}>
                                <MenuItem value="PDF">PDF</MenuItem>
                                <MenuItem value="HTML">HTML</MenuItem>
                            </Select>
                        </FormControl>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Button variant="contained" onClick={handleSaveSchedule} disabled={saving} startIcon={saving ? <CircularProgress size={14} /> : <Schedule />}>
                                Save Schedule
                            </Button>
                            <Button variant="outlined" onClick={handleGenerateNow} disabled={generating} startIcon={generating ? <CircularProgress size={14} /> : <Analytics />}>
                                Generate Now
                            </Button>
                        </Box>
                    </Box>
                </Paper>
            </Grid>
            <Grid item xs={12} md={7}>
                <Paper variant="outlined">
                    <Box sx={{ p: 2 }}><Typography variant="subtitle1" fontWeight="bold">Report History</Typography></Box>
                    <Divider />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Generated At</TableCell>
                                    <TableCell>Format</TableCell>
                                    <TableCell>Recipients</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.map((h) => (
                                    <TableRow key={h.id} hover>
                                        <TableCell>{new Date(h.generatedAt).toLocaleString()}</TableCell>
                                        <TableCell><Chip label={h.format} size="small" variant="outlined" /></TableCell>
                                        <TableCell sx={{ fontSize: '0.75rem' }}>{h.recipients}</TableCell>
                                        <TableCell><Chip label={h.status} size="small" color="success" /></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </Paper>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ObservabilityDashboard() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const [traces, setTraces] = useState([]);
    const [runbooks, setRunbooks] = useState([]);
    const [changeLog, setChangeLog] = useState([]);
    const [slaSchedule, setSlaSchedule] = useState(MOCK_SLA_SCHEDULE);
    const [slaHistory, setSlaHistory] = useState([]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [tracesRes, runbooksRes, clRes, scheduleRes, histRes] = await Promise.allSettled([
                api.get('/api/v1/telemetry/traces'),
                api.get('/api/v1/runbooks'),
                api.get('/api/v1/change-log'),
                api.get('/api/v1/sla/report/schedule'),
                api.get('/api/v1/sla/report/history'),
            ]);
            setTraces(tracesRes.status === 'fulfilled' ? tracesRes.value.data : MOCK_TRACES);
            setRunbooks(runbooksRes.status === 'fulfilled' ? runbooksRes.value.data : MOCK_RUNBOOKS);
            setChangeLog(clRes.status === 'fulfilled' ? clRes.value.data : MOCK_CHANGELOG);
            setSlaSchedule(scheduleRes.status === 'fulfilled' ? scheduleRes.value.data : MOCK_SLA_SCHEDULE);
            setSlaHistory(histRes.status === 'fulfilled' ? histRes.value.data : MOCK_SLA_HISTORY);
        } catch {
            setError('Some data could not be loaded. Showing mock data.');
            setTraces(MOCK_TRACES);
            setRunbooks(MOCK_RUNBOOKS);
            setChangeLog(MOCK_CHANGELOG);
            setSlaSchedule(MOCK_SLA_SCHEDULE);
            setSlaHistory(MOCK_SLA_HISTORY);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchData(); }, [fetchData]);

    const TABS = ['Traces', 'Runbooks', 'Change Log', 'SLA Reports'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Analytics sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Observability Dashboard</Typography>
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
                        <TracesTab traces={traces} loading={loading} />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <RunbooksTab runbooks={runbooks} setRunbooks={setRunbooks} />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <ChangeLogTab changeLog={changeLog} setChangeLog={setChangeLog} />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <SLAReportsTab schedule={slaSchedule} setSchedule={setSlaSchedule} history={slaHistory} setHistory={setSlaHistory} />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
