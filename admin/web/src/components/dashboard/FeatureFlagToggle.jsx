/**
 * FeatureFlagToggle — Q4 2026 Feature Flag Management
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Card, CardContent, Tooltip, Divider, Select,
    MenuItem, FormControl, InputLabel, Switch, FormControlLabel, Slider, Avatar,
    Checkbox,
} from '@mui/material';
import {
    Refresh, Add, Flag, BarChart as BarChartIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
} from 'recharts';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_FLAGS = [
    { id: 'f1', name: 'dark-mode', owner: 'alice', tags: ['ui', 'theming'], production: true, staging: true, development: true, rollout: 100 },
    { id: 'f2', name: 'ai-suggestions', owner: 'bob', tags: ['ai', 'beta'], production: false, staging: true, development: true, rollout: 30 },
    { id: 'f3', name: 'new-dashboard', owner: 'carol', tags: ['admin', 'ui'], production: false, staging: false, development: true, rollout: 10 },
    { id: 'f4', name: 'bulk-import', owner: 'dave', tags: ['data'], production: true, staging: true, development: true, rollout: 80 },
];

const MOCK_HISTORY = [
    { id: 'h1', changedBy: 'alice', timestamp: '2026-10-01T11:00:00Z', environment: 'production', changeType: 'enabled', oldValue: 'false', newValue: 'true' },
    { id: 'h2', changedBy: 'bob', timestamp: '2026-09-30T09:00:00Z', environment: 'staging', changeType: 'rollout', oldValue: '20', newValue: '30' },
    { id: 'h3', changedBy: 'carol', timestamp: '2026-09-29T15:30:00Z', environment: 'development', changeType: 'disabled', oldValue: 'true', newValue: 'false' },
];

const MOCK_EVAL = { enabled: true, rolloutPercent: 80 };

const MOCK_STATS = {
    total: 4,
    byEnv: [
        { env: 'production', count: 2 },
        { env: 'staging', count: 3 },
        { env: 'development', count: 4 },
    ],
    recentChanges: MOCK_HISTORY,
};

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

// ---------------------------------------------------------------------------
// Flags Tab
// ---------------------------------------------------------------------------
function FlagsTab({ flags, setFlags }) {
    const [search, setSearch] = useState('');
    const [selected, setSelected] = useState([]);
    const [dlgOpen, setDlgOpen] = useState(false);
    const [form, setForm] = useState({ name: '', owner: '', tags: '', production: false, staging: false, development: false, rollout: 0 });

    const filtered = flags.filter(f =>
        f.name.toLowerCase().includes(search.toLowerCase()) ||
        f.owner.toLowerCase().includes(search.toLowerCase()) ||
        f.tags.some(t => t.toLowerCase().includes(search.toLowerCase()))
    );

    const toggleEnv = async (flag, env) => {
        const updated = { ...flag, [env]: !flag[env] };
        try { await api.put(`/api/v1/feature-flags/${flag.id}`, { [env]: updated[env] }); } catch { /* mock */ }
        setFlags(prev => prev.map(f => f.id === flag.id ? updated : f));
    };

    const updateRollout = async (flag, value) => {
        try { await api.put(`/api/v1/feature-flags/${flag.id}`, { rollout: value }); } catch { /* mock */ }
        setFlags(prev => prev.map(f => f.id === flag.id ? { ...f, rollout: value } : f));
    };

    const handleBulkToggle = async (env) => {
        for (const id of selected) {
            const flag = flags.find(f => f.id === id);
            if (flag) await toggleEnv(flag, env);
        }
        setSelected([]);
    };

    const handleCreate = async () => {
        const payload = { ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) };
        try {
            const res = await api.post('/api/v1/feature-flags', payload);
            setFlags(prev => [...prev, { id: res.data?.id || `f${Date.now()}`, ...payload }]);
        } catch {
            setFlags(prev => [...prev, { id: `f${Date.now()}`, ...payload }]);
        }
        setDlgOpen(false);
    };

    const handleDelete = async (id) => {
        try { await api.delete(`/api/v1/feature-flags/${id}`); } catch { /* mock */ }
        setFlags(prev => prev.filter(f => f.id !== id));
    };

    const toggleSelect = (id) => setSelected(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'center', flexWrap: 'wrap' }}>
                <TextField size="small" label="Search flags" value={search} onChange={e => setSearch(e.target.value)} sx={{ flexGrow: 1, minWidth: 200 }} />
                {selected.length > 0 && (
                    <>
                        <Button size="small" variant="outlined" onClick={() => handleBulkToggle('production')}>Bulk Toggle Prod</Button>
                        <Button size="small" variant="outlined" onClick={() => handleBulkToggle('staging')}>Bulk Toggle Staging</Button>
                        <Button size="small" variant="outlined" onClick={() => handleBulkToggle('development')}>Bulk Toggle Dev</Button>
                    </>
                )}
                <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ name: '', owner: '', tags: '', production: false, staging: false, development: false, rollout: 0 }); setDlgOpen(true); }}>
                    New Flag
                </Button>
            </Box>

            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox" />
                            <TableCell>Name</TableCell>
                            <TableCell>Owner</TableCell>
                            <TableCell>Tags</TableCell>
                            <TableCell align="center">Production</TableCell>
                            <TableCell align="center">Staging</TableCell>
                            <TableCell align="center">Development</TableCell>
                            <TableCell>Rollout %</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((f) => (
                            <TableRow key={f.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox checked={selected.includes(f.id)} onChange={() => toggleSelect(f.id)} size="small" />
                                </TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{f.name}</TableCell>
                                <TableCell><Chip label={f.owner} size="small" /></TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                                        {f.tags.map(t => <Chip key={t} label={t} size="small" variant="outlined" />)}
                                    </Box>
                                </TableCell>
                                {['production', 'staging', 'development'].map(env => (
                                    <TableCell align="center" key={env}>
                                        <Switch size="small" checked={f[env]} onChange={() => toggleEnv(f, env)} />
                                    </TableCell>
                                ))}
                                <TableCell sx={{ minWidth: 140 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Slider
                                            size="small"
                                            value={f.rollout}
                                            min={0}
                                            max={100}
                                            onChange={(_, v) => updateRollout(f, v)}
                                            sx={{ flex: 1 }}
                                        />
                                        <Typography variant="caption">{f.rollout}%</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Button size="small" color="error" onClick={() => handleDelete(f.id)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>New Feature Flag</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField label="Flag Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
                    <TextField label="Owner" value={form.owner} onChange={e => setForm(f => ({ ...f, owner: e.target.value }))} fullWidth />
                    <TextField label="Tags (comma-separated)" value={form.tags} onChange={e => setForm(f => ({ ...f, tags: e.target.value }))} fullWidth />
                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {['production', 'staging', 'development'].map(env => (
                            <FormControlLabel key={env} control={<Switch checked={form[env]} onChange={e => setForm(f => ({ ...f, [env]: e.target.checked }))} />} label={env} />
                        ))}
                    </Box>
                    <Box>
                        <Typography variant="body2" gutterBottom>Rollout: {form.rollout}%</Typography>
                        <Slider value={form.rollout} min={0} max={100} onChange={(_, v) => setForm(f => ({ ...f, rollout: v }))} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDlgOpen(false)}>Cancel</Button>
                    <Button variant="contained" onClick={handleCreate}>Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// History Tab
// ---------------------------------------------------------------------------
function HistoryTab({ flags }) {
    const [selectedFlagId, setSelectedFlagId] = useState('');
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);

    const loadHistory = useCallback(async (id) => {
        if (!id) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/v1/feature-flags/${id}/history`);
            setHistory(res.data);
        } catch {
            setHistory(MOCK_HISTORY);
        }
        setLoading(false);
    }, []);

    useEffect(() => { loadHistory(selectedFlagId); }, [selectedFlagId, loadHistory]);

    return (
        <Box>
            <FormControl sx={{ mb: 3, minWidth: 240 }}>
                <InputLabel>Select Flag</InputLabel>
                <Select value={selectedFlagId} label="Select Flag" onChange={e => setSelectedFlagId(e.target.value)}>
                    {flags.map(f => <MenuItem key={f.id} value={f.id}>{f.name}</MenuItem>)}
                </Select>
            </FormControl>

            {loading && <CircularProgress />}
            {!loading && selectedFlagId && (
                <Box>
                    {history.map((h) => (
                        <Box key={h.id} sx={{ display: 'flex', gap: 2, mb: 2, alignItems: 'flex-start' }}>
                            <Avatar sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 14 }}>
                                {h.changedBy.substring(0, 2).toUpperCase()}
                            </Avatar>
                            <Paper variant="outlined" sx={{ p: 1.5, flex: 1 }}>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', mb: 0.5 }}>
                                    <Typography variant="body2" fontWeight="bold">{h.changedBy}</Typography>
                                    <Chip label={h.environment} size="small" color={h.environment === 'production' ? 'error' : h.environment === 'staging' ? 'warning' : 'default'} />
                                    <Chip label={h.changeType} size="small" variant="outlined" />
                                    <Typography variant="caption" color="text.secondary">{new Date(h.timestamp).toLocaleString()}</Typography>
                                </Box>
                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                    <Chip label={h.oldValue} size="small" color="error" variant="outlined" />
                                    <Typography variant="caption">→</Typography>
                                    <Chip label={h.newValue} size="small" color="success" variant="outlined" />
                                </Box>
                            </Paper>
                        </Box>
                    ))}
                </Box>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Evaluate Tab
// ---------------------------------------------------------------------------
function EvaluateTab() {
    const [form, setForm] = useState({ flagName: '', environment: 'production', userId: '' });
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);

    const handleEvaluate = async () => {
        setLoading(true);
        setResult(null);
        try {
            const res = await api.post('/api/v1/feature-flags/evaluate', form);
            setResult(res.data);
        } catch {
            setResult(MOCK_EVAL);
        }
        setLoading(false);
    };

    return (
        <Box sx={{ maxWidth: 480 }}>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mb: 3 }}>
                <TextField label="Flag Name" value={form.flagName} onChange={e => setForm(f => ({ ...f, flagName: e.target.value }))} fullWidth />
                <FormControl fullWidth>
                    <InputLabel>Environment</InputLabel>
                    <Select value={form.environment} label="Environment" onChange={e => setForm(f => ({ ...f, environment: e.target.value }))}>
                        {['production', 'staging', 'development'].map(env => (
                            <MenuItem key={env} value={env}>{env}</MenuItem>
                        ))}
                    </Select>
                </FormControl>
                <TextField label="User ID" value={form.userId} onChange={e => setForm(f => ({ ...f, userId: e.target.value }))} fullWidth />
                <Button variant="contained" onClick={handleEvaluate} disabled={loading || !form.flagName}>
                    {loading ? <CircularProgress size={20} /> : 'Evaluate'}
                </Button>
            </Box>

            {result && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}>
                    <Paper variant="outlined" sx={{ p: 3, textAlign: 'center' }}>
                        <Chip
                            label={result.enabled ? 'ENABLED' : 'DISABLED'}
                            color={result.enabled ? 'success' : 'error'}
                            sx={{ fontSize: 18, py: 2, px: 2, height: 'auto', mb: 1 }}
                        />
                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                            Rollout: {result.rolloutPercent}%
                        </Typography>
                    </Paper>
                </motion.div>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Stats Tab
// ---------------------------------------------------------------------------
function StatsTab() {
    const [stats, setStats] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/api/v1/feature-flags/stats');
                setStats(res.data);
            } catch {
                setStats(MOCK_STATS);
            }
            setLoading(false);
        })();
    }, []);

    if (loading) return <CircularProgress />;
    if (!stats) return null;

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} sm={4}>
                <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="body2" color="text.secondary">Total Flags</Typography>
                        <Typography variant="h3" fontWeight="bold" color="primary.main">{stats.total}</Typography>
                    </CardContent>
                </Card>
            </Grid>
            {stats.byEnv.map(e => (
                <Grid item xs={12} sm={4} key={e.env}>
                    <Card variant="outlined">
                        <CardContent sx={{ textAlign: 'center' }}>
                            <Typography variant="body2" color="text.secondary">{e.env} enabled</Typography>
                            <Typography variant="h3" fontWeight="bold">{e.count}</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            ))}

            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Flags per Environment</Typography>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={stats.byEnv}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="env" />
                            <YAxis allowDecimals={false} />
                            <RechartsTooltip />
                            <Bar dataKey="count" fill="#1976d2" name="Enabled flags" />
                        </BarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>

            <Grid item xs={12}>
                <Paper variant="outlined">
                    <Box sx={{ p: 2 }}><Typography variant="subtitle1" fontWeight="bold">Recent Changes</Typography></Box>
                    <Divider />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Changed By</TableCell>
                                    <TableCell>Environment</TableCell>
                                    <TableCell>Change Type</TableCell>
                                    <TableCell>Timestamp</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {stats.recentChanges.map(c => (
                                    <TableRow key={c.id} hover>
                                        <TableCell>{c.changedBy}</TableCell>
                                        <TableCell><Chip label={c.environment} size="small" /></TableCell>
                                        <TableCell><Chip label={c.changeType} size="small" variant="outlined" /></TableCell>
                                        <TableCell>{new Date(c.timestamp).toLocaleString()}</TableCell>
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
export default function FeatureFlagToggle() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [flags, setFlags] = useState([]);

    const fetchFlags = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/feature-flags');
            setFlags(res.data);
        } catch {
            setError('Could not load flags. Showing mock data.');
            setFlags(MOCK_FLAGS);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchFlags(); }, [fetchFlags]);

    const TABS = ['Flags', 'History', 'Evaluate', 'Stats'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Flag sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Feature Flag Toggle</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchFlags} disabled={loading}>
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
                        <FlagsTab flags={flags} setFlags={setFlags} />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <HistoryTab flags={flags} />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <EvaluateTab />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <StatsTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
