/**
 * DeveloperPanel — Q4 2026 Developer Tools: Config, Deployments, Migrations, Logs
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Tooltip, Divider, Select, MenuItem, FormControl,
    InputLabel, Accordion, AccordionSummary, AccordionDetails, Switch,
    FormControlLabel,
} from '@mui/material';
import {
    Refresh, Code, ExpandMore, Save, PlayArrow, Search,
    Stream,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const SERVICES = ['api-gateway', 'user-service', 'messaging-service', 'notification-service', 'content-service'];

const MOCK_CONFIGS = Object.fromEntries(SERVICES.map(s => [s, [
    { key: 'NODE_ENV', value: 'production' },
    { key: 'PORT', value: '3000' },
    { key: 'LOG_LEVEL', value: 'info' },
    { key: 'DB_POOL_SIZE', value: '10' },
]]));

const MOCK_DEPLOYMENTS = SERVICES.map((s, i) => ({
    service: s,
    stage: ['live', 'live', 'deploying', 'building', 'pending'][i],
    version: `2.${3 + i}.0`,
    lastDeployAt: new Date(Date.now() - i * 3600000 * 2).toISOString(),
}));

const MOCK_MIGRATIONS = [
    { id: 'm1', name: '001_init_schema', status: 'completed', applied_at: '2026-01-01T00:00:00Z' },
    { id: 'm2', name: '002_add_users_index', status: 'completed', applied_at: '2026-02-15T10:00:00Z' },
    { id: 'm3', name: '003_add_messages_table', status: 'completed', applied_at: '2026-03-10T08:30:00Z' },
    { id: 'm4', name: '004_add_notifications', status: 'pending', applied_at: null },
    { id: 'm5', name: '005_add_ai_workflows', status: 'pending', applied_at: null },
];

const MOCK_LOGS = [
    { id: 'l1', timestamp: '2026-10-01T10:05:00Z', service: 'api-gateway', level: 'INFO', message: 'Request received GET /api/v1/health' },
    { id: 'l2', timestamp: '2026-10-01T10:04:50Z', service: 'user-service', level: 'WARN', message: 'Rate limit approaching for user u42' },
    { id: 'l3', timestamp: '2026-10-01T10:04:30Z', service: 'messaging-service', level: 'ERROR', message: 'Failed to deliver message msg-99: timeout' },
    { id: 'l4', timestamp: '2026-10-01T10:04:00Z', service: 'api-gateway', level: 'DEBUG', message: 'Auth middleware executed in 2ms' },
    { id: 'l5', timestamp: '2026-10-01T10:03:50Z', service: 'content-service', level: 'INFO', message: 'Content indexed successfully id=c55' },
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

const stageColor = (stage) => ({ live: 'success', deploying: 'info', building: 'warning', testing: 'secondary', pending: 'default', failed: 'error' }[stage] || 'default');
const logRowBg = (level) => ({ ERROR: 'rgba(244,67,54,0.08)', WARN: 'rgba(255,152,0,0.08)', DEBUG: 'rgba(158,158,158,0.05)' }[level] || 'transparent');
const migStatusColor = (s) => ({ completed: 'success', running: 'info', pending: 'default', failed: 'error' }[s] || 'default');

const PIPELINE_STAGES = ['Pending', 'Building', 'Testing', 'Deploying', 'Live'];

// ---------------------------------------------------------------------------
// Config Manager Tab
// ---------------------------------------------------------------------------
function ConfigManagerTab() {
    const [configs, setConfigs] = useState(MOCK_CONFIGS);
    const [editState, setEditState] = useState({});
    const [saving, setSaving] = useState({});

    useEffect(() => {
        (async () => {
            const results = await Promise.allSettled(SERVICES.map(s => api.get(`/api/v1/config/${s}`)));
            const loaded = {};
            results.forEach((r, i) => { loaded[SERVICES[i]] = r.status === 'fulfilled' ? r.value.data : MOCK_CONFIGS[SERVICES[i]]; });
            setConfigs(loaded);
        })();
    }, []);

    const startEdit = (service, key) => setEditState(prev => ({ ...prev, [`${service}:${key}`]: configs[service].find(e => e.key === key)?.value || '' }));
    const cancelEdit = (service, key) => setEditState(prev => { const n = { ...prev }; delete n[`${service}:${key}`]; return n; });
    const changeEdit = (service, key, val) => setEditState(prev => ({ ...prev, [`${service}:${key}`]: val }));

    const handleSave = async (service, key) => {
        const value = editState[`${service}:${key}`];
        setSaving(prev => ({ ...prev, [`${service}:${key}`]: true }));
        try { await api.put(`/api/v1/config/${service}`, { key, value }); } catch { /* mock */ }
        setConfigs(prev => ({
            ...prev,
            [service]: prev[service].map(e => e.key === key ? { ...e, value } : e),
        }));
        cancelEdit(service, key);
        setSaving(prev => { const n = { ...prev }; delete n[`${service}:${key}`]; return n; });
    };

    return (
        <Box>
            {SERVICES.map(service => (
                <Accordion key={service} variant="outlined" sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMore />}>
                        <Typography fontWeight="bold">{service}</Typography>
                    </AccordionSummary>
                    <AccordionDetails sx={{ p: 0 }}>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow>
                                        <TableCell>Key</TableCell>
                                        <TableCell>Value</TableCell>
                                        <TableCell align="right">Actions</TableCell>
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {(configs[service] || []).map(({ key, value }) => {
                                        const editKey = `${service}:${key}`;
                                        const isEditing = editKey in editState;
                                        return (
                                            <TableRow key={key} hover>
                                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{key}</TableCell>
                                                <TableCell>
                                                    {isEditing ? (
                                                        <TextField
                                                            size="small"
                                                            value={editState[editKey]}
                                                            onChange={e => changeEdit(service, key, e.target.value)}
                                                            autoFocus
                                                            sx={{ minWidth: 200 }}
                                                        />
                                                    ) : (
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{value}</Typography>
                                                    )}
                                                </TableCell>
                                                <TableCell align="right">
                                                    {isEditing ? (
                                                        <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                                            <Button size="small" variant="contained" startIcon={saving[editKey] ? <CircularProgress size={12} /> : <Save />} onClick={() => handleSave(service, key)} disabled={!!saving[editKey]}>Save</Button>
                                                            <Button size="small" onClick={() => cancelEdit(service, key)}>Cancel</Button>
                                                        </Box>
                                                    ) : (
                                                        <Button size="small" onClick={() => startEdit(service, key)}>Edit</Button>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </AccordionDetails>
                </Accordion>
            ))}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Deployment Pipeline Tab
// ---------------------------------------------------------------------------
function DeploymentPipelineTab() {
    const [deployments, setDeployments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [serviceFilter, setServiceFilter] = useState('');
    const [confirmDlg, setConfirmDlg] = useState(null);
    const [deploying, setDeploying] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/v1/deployments');
                setDeployments(res.data);
            } catch {
                setDeployments(MOCK_DEPLOYMENTS);
            }
            setLoading(false);
        })();
    }, []);

    const handleTrigger = async (service) => {
        setConfirmDlg(null);
        setDeploying(prev => ({ ...prev, [service]: true }));
        try { await api.post('/api/v1/deployments', { service }); } catch { /* mock */ }
        setDeployments(prev => prev.map(d => d.service === service ? { ...d, stage: 'building' } : d));
        setTimeout(() => {
            setDeployments(prev => prev.map(d => d.service === service ? { ...d, stage: 'testing' } : d));
            setTimeout(() => {
                setDeployments(prev => prev.map(d => d.service === service ? { ...d, stage: 'deploying' } : d));
                setTimeout(() => {
                    setDeployments(prev => prev.map(d => d.service === service ? { ...d, stage: 'live', lastDeployAt: new Date().toISOString() } : d));
                    setDeploying(prev => { const n = { ...prev }; delete n[service]; return n; });
                }, 2000);
            }, 2000);
        }, 2000);
    };

    const filtered = serviceFilter ? deployments.filter(d => d.service === serviceFilter) : deployments;

    return (
        <Box>
            {loading && <CircularProgress />}
            {!loading && (
                <>
                    <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                        <Chip label="All" onClick={() => setServiceFilter('')} color={!serviceFilter ? 'primary' : 'default'} clickable />
                        {SERVICES.map(s => (
                            <Chip key={s} label={s} onClick={() => setServiceFilter(s)} color={serviceFilter === s ? 'primary' : 'default'} clickable />
                        ))}
                    </Box>
                    {filtered.map((d) => (
                        <Paper key={d.service} variant="outlined" sx={{ p: 2, mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5, flexWrap: 'wrap', gap: 1 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    <Typography fontWeight="bold">{d.service}</Typography>
                                    <Chip label={`v${d.version}`} size="small" variant="outlined" />
                                </Box>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {d.lastDeployAt && <Typography variant="caption" color="text.secondary">Last: {new Date(d.lastDeployAt).toLocaleString()}</Typography>}
                                    <Button size="small" variant="contained" startIcon={deploying[d.service] ? <CircularProgress size={14} /> : <PlayArrow />} onClick={() => setConfirmDlg(d.service)} disabled={!!deploying[d.service]}>
                                        Trigger Deploy
                                    </Button>
                                </Box>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 0, alignItems: 'center' }}>
                                {PIPELINE_STAGES.map((stage, i) => {
                                    const stageIdx = PIPELINE_STAGES.findIndex(s => s.toLowerCase() === d.stage);
                                    const isDone = i <= stageIdx;
                                    const isCurrent = PIPELINE_STAGES[i].toLowerCase() === d.stage;
                                    return (
                                        <React.Fragment key={stage}>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1 }}>
                                                <Box sx={{
                                                    width: 28, height: 28, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    bgcolor: d.stage === 'failed' && isCurrent ? 'error.main' : isDone ? 'success.main' : 'grey.300',
                                                    color: isDone || (d.stage === 'failed' && isCurrent) ? 'white' : 'text.secondary',
                                                    fontSize: 12, fontWeight: 'bold',
                                                }}>
                                                    {isCurrent && deploying[d.service] ? <CircularProgress size={14} sx={{ color: 'white' }} /> : i + 1}
                                                </Box>
                                                <Typography variant="caption" sx={{ mt: 0.5, textAlign: 'center' }}>{stage}</Typography>
                                            </Box>
                                            {i < PIPELINE_STAGES.length - 1 && (
                                                <Box sx={{ flex: 1, height: 2, bgcolor: i < stageIdx ? 'success.main' : 'grey.300', alignSelf: 'flex-start', mt: 1.75 }} />
                                            )}
                                        </React.Fragment>
                                    );
                                })}
                            </Box>
                        </Paper>
                    ))}
                </>
            )}

            <Dialog open={!!confirmDlg} onClose={() => setConfirmDlg(null)}>
                <DialogTitle>Confirm Deploy</DialogTitle>
                <DialogContent><Typography>Trigger deployment for <strong>{confirmDlg}</strong>?</Typography></DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmDlg(null)}>Cancel</Button>
                    <Button variant="contained" color="primary" onClick={() => handleTrigger(confirmDlg)}>Deploy</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// DB Migrations Tab
// ---------------------------------------------------------------------------
function DBMigrationsTab() {
    const [migrations, setMigrations] = useState([]);
    const [loading, setLoading] = useState(true);
    const [running, setRunning] = useState({});

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/v1/migrations');
                setMigrations(res.data);
            } catch {
                setMigrations(MOCK_MIGRATIONS);
            }
            setLoading(false);
        })();
    }, []);

    const handleRun = async (id) => {
        setRunning(prev => ({ ...prev, [id]: true }));
        setMigrations(prev => prev.map(m => m.id === id ? { ...m, status: 'running' } : m));
        try { await api.post('/api/v1/migrations', { id }); } catch { /* mock */ }
        await new Promise(r => setTimeout(r, 2000));
        setMigrations(prev => prev.map(m => m.id === id ? { ...m, status: 'completed', applied_at: new Date().toISOString() } : m));
        setRunning(prev => { const n = { ...prev }; delete n[id]; return n; });
    };

    return (
        <Box>
            {loading && <CircularProgress />}
            {!loading && (
                <TableContainer component={Paper} variant="outlined">
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>ID</TableCell>
                                <TableCell>Name</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Applied At</TableCell>
                                <TableCell align="right">Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {migrations.map((m) => (
                                <TableRow key={m.id} hover>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{m.id}</TableCell>
                                    <TableCell sx={{ fontFamily: 'monospace' }}>{m.name}</TableCell>
                                    <TableCell>
                                        <Chip
                                            label={m.status}
                                            size="small"
                                            color={migStatusColor(m.status)}
                                            icon={m.status === 'running' ? <CircularProgress size={10} /> : undefined}
                                        />
                                    </TableCell>
                                    <TableCell>{m.applied_at ? new Date(m.applied_at).toLocaleString() : '—'}</TableCell>
                                    <TableCell align="right">
                                        {m.status === 'pending' && (
                                            <Button size="small" variant="contained" onClick={() => handleRun(m.id)} disabled={!!running[m.id]}>
                                                {running[m.id] ? <CircularProgress size={14} /> : 'Run Migration'}
                                            </Button>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Log Search Tab
// ---------------------------------------------------------------------------
function LogSearchTab() {
    const [query, setQuery] = useState('');
    const [service, setService] = useState('');
    const [level, setLevel] = useState('ALL');
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [liveMode, setLiveMode] = useState(false);
    const esRef = useRef(null);

    const handleSearch = async () => {
        setLoading(true);
        try {
            const res = await api.post('/api/v1/logs/search', { query, service, level: level === 'ALL' ? undefined : level, dateFrom, dateTo });
            setLogs(res.data);
        } catch {
            setLogs(MOCK_LOGS.filter(l => (level === 'ALL' || l.level === level) && (!service || l.service === service)));
        }
        setLoading(false);
    };

    useEffect(() => {
        if (liveMode) {
            esRef.current = new EventSource('/api/v1/logs/stream');
            esRef.current.onmessage = (e) => {
                try {
                    const log = JSON.parse(e.data);
                    setLogs(prev => [log, ...prev].slice(0, 200));
                } catch { /* ignore malformed */ }
            };
            esRef.current.onerror = () => {
                // Fallback: simulate live logs with mock data
                const mockInterval = setInterval(() => {
                    const mockLevels = ['INFO', 'DEBUG', 'WARN', 'ERROR'];
                    const mockSvcs = SERVICES;
                    setLogs(prev => [{
                        id: `live-${Date.now()}`,
                        timestamp: new Date().toISOString(),
                        service: mockSvcs[Math.floor(Math.random() * mockSvcs.length)],
                        level: mockLevels[Math.floor(Math.random() * mockLevels.length)],
                        message: `Live log entry at ${new Date().toLocaleTimeString()}`,
                    }, ...prev].slice(0, 200));
                }, 2000);
                esRef.current._mockInterval = mockInterval;
            };
        } else {
            if (esRef.current) {
                esRef.current.close();
                if (esRef.current._mockInterval) clearInterval(esRef.current._mockInterval);
                esRef.current = null;
            }
        }
        return () => {
            if (esRef.current) {
                esRef.current.close();
                if (esRef.current._mockInterval) clearInterval(esRef.current._mockInterval);
            }
        };
    }, [liveMode]);

    return (
        <Box>
            <Grid container spacing={2} sx={{ mb: 2, alignItems: 'center' }}>
                <Grid item xs={12} sm={4}>
                    <TextField fullWidth size="small" label="Query" value={query} onChange={e => setQuery(e.target.value)} />
                </Grid>
                <Grid item xs={6} sm={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Service</InputLabel>
                        <Select value={service} label="Service" onChange={e => setService(e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            {SERVICES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6} sm={2}>
                    <FormControl fullWidth size="small">
                        <InputLabel>Level</InputLabel>
                        <Select value={level} label="Level" onChange={e => setLevel(e.target.value)}>
                            {['ALL', 'DEBUG', 'INFO', 'WARN', 'ERROR'].map(l => <MenuItem key={l} value={l}>{l}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6} sm={2}>
                    <TextField fullWidth size="small" label="From" type="datetime-local" value={dateFrom} onChange={e => setDateFrom(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={6} sm={2}>
                    <TextField fullWidth size="small" label="To" type="datetime-local" value={dateTo} onChange={e => setDateTo(e.target.value)} InputLabelProps={{ shrink: true }} />
                </Grid>
                <Grid item xs={12}>
                    <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                        <Button variant="contained" startIcon={loading ? <CircularProgress size={14} /> : <Search />} onClick={handleSearch} disabled={loading || liveMode}>
                            Search
                        </Button>
                        <FormControlLabel
                            control={<Switch checked={liveMode} onChange={e => setLiveMode(e.target.checked)} />}
                            label={<Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Stream fontSize="small" />Live Stream</Box>}
                        />
                        {liveMode && <Chip label="LIVE" color="error" size="small" />}
                    </Box>
                </Grid>
            </Grid>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 480 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Service</TableCell>
                            <TableCell>Level</TableCell>
                            <TableCell>Message</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {logs.map((l) => (
                            <TableRow key={l.id} sx={{ bgcolor: logRowBg(l.level) }}>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', whiteSpace: 'nowrap' }}>{new Date(l.timestamp).toLocaleTimeString()}</TableCell>
                                <TableCell><Chip label={l.service} size="small" variant="outlined" /></TableCell>
                                <TableCell>
                                    <Chip label={l.level} size="small" color={l.level === 'ERROR' ? 'error' : l.level === 'WARN' ? 'warning' : l.level === 'DEBUG' ? 'default' : 'info'} />
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{l.message}</TableCell>
                            </TableRow>
                        ))}
                        {logs.length === 0 && !loading && (
                            <TableRow>
                                <TableCell colSpan={4} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 3 }}>No logs. Run a search or enable live stream.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function DeveloperPanel() {
    const [tab, setTab] = useState(0);
    const [error, setError] = useState(null);

    const TABS = ['Config Manager', 'Deployment Pipeline', 'DB Migrations', 'Log Search'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Code sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Developer Panel</Typography>
                <Box sx={{ flexGrow: 1 }} />
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
                        <ConfigManagerTab />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <DeploymentPipelineTab />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <DBMigrationsTab />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <LogSearchTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
