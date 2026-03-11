/**
 * TenantManager — Q4 2026 Multi-Tenant Management
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Card, CardContent, Tooltip, Divider, Select,
    MenuItem, FormControl, InputLabel, Slider, LinearProgress,
} from '@mui/material';
import {
    Refresh, Add, Business, TrendingUp, TrendingDown,
    Palette,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, Legend,
} from 'recharts';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_TENANTS = [
    { id: 't1', name: 'Acme Corp', domain: 'acme.milonexa.com', plan: 'enterprise', status: 'active', ownerId: 'u1' },
    { id: 't2', name: 'Beta Inc', domain: 'beta.milonexa.com', plan: 'pro', status: 'active', ownerId: 'u2' },
    { id: 't3', name: 'Gamma LLC', domain: 'gamma.milonexa.com', plan: 'starter', status: 'suspended', ownerId: 'u3' },
    { id: 't4', name: 'Delta Co', domain: 'delta.milonexa.com', plan: 'pro', status: 'deleted', ownerId: 'u4' },
];

const MOCK_QUOTA = { cpu: 80, memory: 32, storage: 500, users: 1000, apiCalls: 5000 };
const MOCK_QUOTA_USAGE = { cpu: 52, memory: 18, storage: 210, users: 340, apiCalls: 3100 };

const MOCK_BILLING = {
    currentPeriod: 4820,
    previousPeriod: 4120,
    breakdown: [
        { name: 'Jan', compute: 1200, storage: 400, network: 200 },
        { name: 'Feb', compute: 1100, storage: 380, network: 180 },
        { name: 'Mar', compute: 1400, storage: 420, network: 220 },
        { name: 'Apr', compute: 1320, storage: 450, network: 230 },
    ],
    events: [
        { id: 'be1', date: '2026-10-01', description: 'Monthly invoice', amount: 4820 },
        { id: 'be2', date: '2026-09-01', description: 'Monthly invoice', amount: 4120 },
        { id: 'be3', date: '2026-09-15', description: 'Overage charge (API)', amount: 120 },
    ],
};

const MOCK_WHITELABEL = {
    primaryColor: '#1976d2',
    secondaryColor: '#dc004e',
    logoUrl: '',
    appName: 'Acme Connect',
    domain: 'acme.milonexa.com',
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

const planColor = (plan) => ({ enterprise: 'primary', pro: 'secondary', starter: 'default' }[plan] || 'default');
const statusColor = (s) => ({ active: 'success', suspended: 'warning', deleted: 'error' }[s] || 'default');

// ---------------------------------------------------------------------------
// Tenants Tab
// ---------------------------------------------------------------------------
function TenantsTab({ tenants, setTenants }) {
    const [dlgOpen, setDlgOpen] = useState(false);
    const [form, setForm] = useState({ name: '', domain: '', plan: 'starter', ownerId: '' });

    const handleStatusChange = async (id, newStatus) => {
        try { await api.put(`/api/v1/tenants/${id}`, { status: newStatus }); } catch { /* mock */ }
        setTenants(prev => prev.map(t => t.id === id ? { ...t, status: newStatus } : t));
    };

    const handleDelete = async (id) => {
        try { await api.delete(`/api/v1/tenants/${id}`); } catch { /* mock */ }
        setTenants(prev => prev.map(t => t.id === id ? { ...t, status: 'deleted' } : t));
    };

    const handleCreate = async () => {
        try {
            const res = await api.post('/api/v1/tenants', form);
            setTenants(prev => [...prev, { id: res.data?.id || `t${Date.now()}`, ...form, status: 'active' }]);
        } catch {
            setTenants(prev => [...prev, { id: `t${Date.now()}`, ...form, status: 'active' }]);
        }
        setDlgOpen(false);
    };

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => { setForm({ name: '', domain: '', plan: 'starter', ownerId: '' }); setDlgOpen(true); }}>
                    Create Tenant
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Domain</TableCell>
                            <TableCell>Plan</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {tenants.map((t) => (
                            <TableRow key={t.id} hover>
                                <TableCell fontWeight="bold">{t.name}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{t.domain}</TableCell>
                                <TableCell><Chip label={t.plan} size="small" color={planColor(t.plan)} /></TableCell>
                                <TableCell><Chip label={t.status} size="small" color={statusColor(t.status)} /></TableCell>
                                <TableCell align="right">
                                    <Box sx={{ display: 'flex', gap: 0.5, justifyContent: 'flex-end' }}>
                                        {t.status === 'active' && (
                                            <Button size="small" color="warning" variant="outlined" onClick={() => handleStatusChange(t.id, 'suspended')}>Suspend</Button>
                                        )}
                                        {t.status === 'suspended' && (
                                            <Button size="small" color="success" variant="outlined" onClick={() => handleStatusChange(t.id, 'active')}>Activate</Button>
                                        )}
                                        {t.status !== 'deleted' && (
                                            <Button size="small" color="error" variant="outlined" onClick={() => handleDelete(t.id)}>Delete</Button>
                                        )}
                                    </Box>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={dlgOpen} onClose={() => setDlgOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Tenant</DialogTitle>
                <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: '16px !important' }}>
                    <TextField label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} fullWidth />
                    <TextField label="Domain" value={form.domain} onChange={e => setForm(f => ({ ...f, domain: e.target.value }))} fullWidth />
                    <FormControl fullWidth>
                        <InputLabel>Plan</InputLabel>
                        <Select value={form.plan} label="Plan" onChange={e => setForm(f => ({ ...f, plan: e.target.value }))}>
                            {['starter', 'pro', 'enterprise'].map(p => <MenuItem key={p} value={p}>{p}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField label="Owner ID" value={form.ownerId} onChange={e => setForm(f => ({ ...f, ownerId: e.target.value }))} fullWidth />
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
// Quotas Tab
// ---------------------------------------------------------------------------
function QuotasTab({ tenants }) {
    const [selectedId, setSelectedId] = useState('');
    const [quota, setQuota] = useState(MOCK_QUOTA);
    const [usage, setUsage] = useState(MOCK_QUOTA_USAGE);
    const [saving, setSaving] = useState(false);

    const loadQuota = useCallback(async (id) => {
        if (!id) return;
        try {
            const [qRes, uRes] = await Promise.allSettled([
                api.get(`/api/v1/tenants/${id}/quota`),
                api.get(`/api/v1/tenants/${id}/quota/usage`),
            ]);
            setQuota(qRes.status === 'fulfilled' ? qRes.value.data : MOCK_QUOTA);
            setUsage(uRes.status === 'fulfilled' ? uRes.value.data : MOCK_QUOTA_USAGE);
        } catch {
            setQuota(MOCK_QUOTA);
            setUsage(MOCK_QUOTA_USAGE);
        }
    }, []);

    useEffect(() => { loadQuota(selectedId); }, [selectedId, loadQuota]);

    const handleSave = async () => {
        setSaving(true);
        try { await api.put(`/api/v1/tenants/${selectedId}/quota`, quota); } catch { /* mock */ }
        setSaving(false);
    };

    const quotaFields = [
        { key: 'cpu', label: 'CPU (%)', max: 100, unit: '%' },
        { key: 'memory', label: 'Memory (GB)', max: 256, unit: 'GB' },
        { key: 'storage', label: 'Storage (GB)', max: 5000, unit: 'GB' },
        { key: 'users', label: 'Max Users', max: 10000, unit: '' },
        { key: 'apiCalls', label: 'API Calls/min', max: 50000, unit: '/min' },
    ];

    return (
        <Box>
            <FormControl sx={{ mb: 3, minWidth: 240 }}>
                <InputLabel>Select Tenant</InputLabel>
                <Select value={selectedId} label="Select Tenant" onChange={e => setSelectedId(e.target.value)}>
                    {tenants.filter(t => t.status !== 'deleted').map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedId && (
                <Paper variant="outlined" sx={{ p: 3 }}>
                    <Grid container spacing={3}>
                        {quotaFields.map(({ key, label, max, unit }) => (
                            <Grid item xs={12} md={6} key={key}>
                                <Box sx={{ mb: 1 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                                        <Typography variant="body2" fontWeight="bold">{label}</Typography>
                                        <Typography variant="body2">{quota[key]}{unit}</Typography>
                                    </Box>
                                    <Slider
                                        value={quota[key]}
                                        min={0}
                                        max={max}
                                        onChange={(_, v) => setQuota(q => ({ ...q, [key]: v }))}
                                        sx={{ mt: 0.5 }}
                                    />
                                    <Box sx={{ mt: 0.5 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                                            <Typography variant="caption" color="text.secondary">Usage</Typography>
                                            <Typography variant="caption">{usage[key]}{unit} / {quota[key]}{unit}</Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={quota[key] > 0 ? Math.min((usage[key] / quota[key]) * 100, 100) : 0}
                                            color={usage[key] / quota[key] > 0.8 ? 'error' : 'primary'}
                                            sx={{ height: 6, borderRadius: 3 }}
                                        />
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>
                    <Box sx={{ mt: 2 }}>
                        <Button variant="contained" onClick={handleSave} disabled={saving}>
                            {saving ? <CircularProgress size={18} /> : 'Save Quotas'}
                        </Button>
                    </Box>
                </Paper>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Billing Tab
// ---------------------------------------------------------------------------
function BillingTab({ tenants }) {
    const [selectedId, setSelectedId] = useState('');
    const [billing, setBilling] = useState(null);

    const loadBilling = useCallback(async (id) => {
        if (!id) return;
        try {
            const res = await api.get(`/api/v1/tenants/${id}/billing`);
            setBilling(res.data);
        } catch {
            setBilling(MOCK_BILLING);
        }
    }, []);

    useEffect(() => { loadBilling(selectedId); }, [selectedId, loadBilling]);

    const trend = billing ? billing.currentPeriod - billing.previousPeriod : 0;

    return (
        <Box>
            <FormControl sx={{ mb: 3, minWidth: 240 }}>
                <InputLabel>Select Tenant</InputLabel>
                <Select value={selectedId} label="Select Tenant" onChange={e => setSelectedId(e.target.value)}>
                    {tenants.filter(t => t.status !== 'deleted').map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedId && billing && (
                <Grid container spacing={3}>
                    {[
                        { label: 'Current Period', value: `$${billing.currentPeriod.toLocaleString()}` },
                        { label: 'Previous Period', value: `$${billing.previousPeriod.toLocaleString()}` },
                        { label: 'Trend', value: `${trend >= 0 ? '+' : ''}$${trend}`, icon: trend >= 0 ? <TrendingUp color="error" /> : <TrendingDown color="success" /> },
                    ].map(c => (
                        <Grid item xs={12} sm={4} key={c.label}>
                            <Card variant="outlined">
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {c.icon}
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">{c.label}</Typography>
                                        <Typography variant="h5" fontWeight="bold">{c.value}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}

                    <Grid item xs={12}>
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Cost Breakdown</Typography>
                            <ResponsiveContainer width="100%" height={220}>
                                <BarChart data={billing.breakdown}>
                                    <CartesianGrid strokeDasharray="3 3" />
                                    <XAxis dataKey="name" />
                                    <YAxis />
                                    <RechartsTooltip />
                                    <Legend />
                                    <Bar dataKey="compute" stackId="a" fill="#1976d2" name="Compute" />
                                    <Bar dataKey="storage" stackId="a" fill="#9c27b0" name="Storage" />
                                    <Bar dataKey="network" stackId="a" fill="#ed6c02" name="Network" />
                                </BarChart>
                            </ResponsiveContainer>
                        </Paper>
                    </Grid>

                    <Grid item xs={12}>
                        <Paper variant="outlined">
                            <Box sx={{ p: 2 }}><Typography variant="subtitle1" fontWeight="bold">Billing Events</Typography></Box>
                            <Divider />
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Date</TableCell>
                                            <TableCell>Description</TableCell>
                                            <TableCell align="right">Amount</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {billing.events.map(e => (
                                            <TableRow key={e.id} hover>
                                                <TableCell>{e.date}</TableCell>
                                                <TableCell>{e.description}</TableCell>
                                                <TableCell align="right">${e.amount.toLocaleString()}</TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// White-labelling Tab
// ---------------------------------------------------------------------------
function WhitelabelTab({ tenants }) {
    const [selectedId, setSelectedId] = useState('');
    const [wl, setWl] = useState(MOCK_WHITELABEL);
    const [saving, setSaving] = useState(false);

    const loadWl = useCallback(async (id) => {
        if (!id) return;
        try {
            const res = await api.get(`/api/v1/tenants/${id}/whitelabel`);
            setWl(res.data);
        } catch {
            setWl(MOCK_WHITELABEL);
        }
    }, []);

    useEffect(() => { loadWl(selectedId); }, [selectedId, loadWl]);

    const handleSave = async () => {
        setSaving(true);
        try { await api.put(`/api/v1/tenants/${selectedId}/whitelabel`, wl); } catch { /* mock */ }
        setSaving(false);
    };

    return (
        <Box>
            <FormControl sx={{ mb: 3, minWidth: 240 }}>
                <InputLabel>Select Tenant</InputLabel>
                <Select value={selectedId} label="Select Tenant" onChange={e => setSelectedId(e.target.value)}>
                    {tenants.filter(t => t.status !== 'deleted').map(t => (
                        <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
                    ))}
                </Select>
            </FormControl>

            {selectedId && (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
                            <Typography variant="subtitle1" fontWeight="bold">Branding Settings</Typography>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2">Primary Color</Typography>
                                <input type="color" value={wl.primaryColor} onChange={e => setWl(w => ({ ...w, primaryColor: e.target.value }))} style={{ width: 48, height: 32, cursor: 'pointer', border: 'none' }} />
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{wl.primaryColor}</Typography>
                            </Box>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="body2">Secondary Color</Typography>
                                <input type="color" value={wl.secondaryColor} onChange={e => setWl(w => ({ ...w, secondaryColor: e.target.value }))} style={{ width: 48, height: 32, cursor: 'pointer', border: 'none' }} />
                                <Typography variant="body2" sx={{ fontFamily: 'monospace' }}>{wl.secondaryColor}</Typography>
                            </Box>
                            <TextField label="Logo URL" value={wl.logoUrl} onChange={e => setWl(w => ({ ...w, logoUrl: e.target.value }))} fullWidth />
                            <TextField label="App Name" value={wl.appName} onChange={e => setWl(w => ({ ...w, appName: e.target.value }))} fullWidth />
                            <TextField label="Domain" value={wl.domain} onChange={e => setWl(w => ({ ...w, domain: e.target.value }))} fullWidth />
                            <Button variant="contained" startIcon={<Palette />} onClick={handleSave} disabled={saving}>
                                {saving ? <CircularProgress size={18} /> : 'Save Branding'}
                            </Button>
                        </Paper>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                            <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Preview</Typography>
                            <Box sx={{
                                border: '2px solid',
                                borderColor: wl.primaryColor,
                                borderRadius: 2,
                                overflow: 'hidden',
                                mt: 1,
                            }}>
                                <Box sx={{ bgcolor: wl.primaryColor, px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                                    {wl.logoUrl && <Box component="img" src={wl.logoUrl} sx={{ height: 24 }} alt="logo" onError={e => { e.target.style.display = 'none'; }} />}
                                    <Typography variant="subtitle2" sx={{ color: '#fff', fontWeight: 'bold' }}>{wl.appName || 'App'}</Typography>
                                </Box>
                                <Box sx={{ p: 2 }}>
                                    <Button size="small" sx={{ bgcolor: wl.secondaryColor, color: '#fff', '&:hover': { bgcolor: wl.secondaryColor, opacity: 0.9 } }}>
                                        Action Button
                                    </Button>
                                    <Typography variant="caption" display="block" sx={{ mt: 1, color: 'text.secondary' }}>{wl.domain}</Typography>
                                </Box>
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function TenantManager() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [tenants, setTenants] = useState([]);

    const fetchTenants = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/tenants');
            setTenants(res.data);
        } catch {
            setError('Could not load tenants. Showing mock data.');
            setTenants(MOCK_TENANTS);
        }
        setLoading(false);
    }, []);

    useEffect(() => { fetchTenants(); }, [fetchTenants]);

    const TABS = ['Tenants', 'Quotas', 'Billing', 'White-labelling'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Business sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Tenant Manager</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <Tooltip title="Refresh">
                    <IconButton onClick={fetchTenants} disabled={loading}>
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
                        <TenantsTab tenants={tenants} setTenants={setTenants} />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <QuotasTab tenants={tenants} />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <BillingTab tenants={tenants} />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <WhitelabelTab tenants={tenants} />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
