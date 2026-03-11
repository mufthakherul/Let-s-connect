/**
 * SecurityDashboard — Q3 2026 Comprehensive Security Overview
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
    TextField, Grid, Card, CardContent, LinearProgress, Tooltip,
    Switch, FormControlLabel, Badge, Divider,
} from '@mui/material';
import {
    Security, Refresh, Block, Add, Delete, VpnKey, CheckCircle,
    Warning, ErrorOutline, People, FilterList,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, BarChart, Bar,
} from 'recharts';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_SCORE = 78;
const MOCK_ANOMALIES = [
    { id: 'a1', ts: '2026-03-10T09:15:00Z', type: 'brute_force', description: 'Multiple failed logins from 192.168.1.50', riskScore: 82, ip: '192.168.1.50', resolved: false },
    { id: 'a2', ts: '2026-03-10T08:00:00Z', type: 'unusual_time', description: 'Admin login at 3:00 AM', riskScore: 55, ip: '10.0.0.3', resolved: false },
    { id: 'a3', ts: '2026-03-09T22:45:00Z', type: 'ip_change', description: 'User logged in from new country', riskScore: 40, ip: '203.0.113.7', resolved: true },
];
const MOCK_SESSIONS = [
    { id: 's1', userId: 'u1', username: 'alice', ip: '10.0.0.5', startedAt: '2026-03-10T10:00:00Z', lastActivity: '2026-03-10T10:45:00Z' },
    { id: 's2', userId: 'u2', username: 'bob', ip: '10.0.0.8', startedAt: '2026-03-10T09:30:00Z', lastActivity: '2026-03-10T10:44:00Z' },
];
const MOCK_ALLOWLIST = [
    { id: '1', ip: '10.0.0.0/8', addedAt: '2026-01-01T00:00:00Z', note: 'Internal network' },
    { id: '2', ip: '127.0.0.1', addedAt: '2026-01-01T00:00:00Z', note: 'Loopback' },
    { id: '3', ip: '203.0.113.0/24', addedAt: '2026-02-15T12:00:00Z', note: 'Partner office' },
];
const MOCK_2FA = [
    { userId: 'u1', username: 'alice', email: 'alice@example.com', enrolled: true, role: 'admin' },
    { userId: 'u2', username: 'bob', email: 'bob@example.com', enrolled: true, role: 'moderator' },
    { userId: 'u3', username: 'carol', email: 'carol@example.com', enrolled: false, role: 'user' },
    { userId: 'u4', username: 'dave', email: 'dave@example.com', enrolled: false, role: 'user' },
];
const MOCK_SECRETS = [
    { key: 'JWT_SECRET', rotatedAt: '2026-02-01T00:00:00Z' },
    { key: 'DATABASE_URL', rotatedAt: '2026-01-15T00:00:00Z' },
    { key: 'SMTP_PASSWORD', rotatedAt: '2026-03-01T00:00:00Z' },
];
const MOCK_ANOMALY_TIMELINE = Array.from({ length: 14 }, (_, i) => ({
    date: new Date(Date.now() - (13 - i) * 86400000).toLocaleDateString(),
    count: Math.floor(Math.random() * 8),
    critical: Math.floor(Math.random() * 2),
}));

// ---------------------------------------------------------------------------
// Risk badge
// ---------------------------------------------------------------------------
function RiskBadge({ score }) {
    let color = 'success';
    if (score >= 70) color = 'error';
    else if (score >= 40) color = 'warning';
    return <Chip label={`Risk: ${score}`} color={color} size="small" />;
}

function RiskProgress({ score }) {
    const color = score >= 70 ? 'error' : score >= 40 ? 'warning' : 'success';
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="caption">Security Score</Typography>
                <Typography variant="caption" fontWeight="bold">{score}/100</Typography>
            </Box>
            <LinearProgress variant="determinate" value={score} color={color} sx={{ height: 8, borderRadius: 4 }} />
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Tab panels
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
// Overview Tab
// ---------------------------------------------------------------------------
function OverviewTab({ score, anomalies, sessions, twoFaUsers, allowlist }) {
    const enrolled = twoFaUsers.filter(u => u.enrolled).length;
    const twoFaPct = twoFaUsers.length > 0 ? Math.round((enrolled / twoFaUsers.length) * 100) : 0;
    const activeSessions = sessions.length;
    const openAnomalies = anomalies.filter(a => !a.resolved).length;

    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
                <Card variant="outlined">
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Security Score</Typography>
                        <Typography variant="h2" color={score >= 70 ? 'success.main' : score >= 40 ? 'warning.main' : 'error.main'} fontWeight="bold">
                            {score}
                        </Typography>
                        <RiskProgress score={score} />
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={8}>
                <Grid container spacing={2}>
                    {[
                        { label: 'Active Sessions', value: activeSessions, icon: <People />, color: 'primary' },
                        { label: 'Open Anomalies', value: openAnomalies, icon: <Warning />, color: openAnomalies > 0 ? 'warning' : 'success' },
                        { label: '2FA Coverage', value: `${twoFaPct}%`, icon: <VpnKey />, color: twoFaPct >= 80 ? 'success' : 'warning' },
                        { label: 'IP Allowlist', value: `${allowlist.length} entries`, icon: <Security />, color: 'primary' },
                    ].map((item) => (
                        <Grid item xs={12} sm={6} key={item.label}>
                            <Card variant="outlined">
                                <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                    <Box sx={{ color: `${item.color}.main` }}>{item.icon}</Box>
                                    <Box>
                                        <Typography variant="body2" color="text.secondary">{item.label}</Typography>
                                        <Typography variant="h5" fontWeight="bold">{item.value}</Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Grid>

            <Grid item xs={12}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Anomaly Timeline (14 days)</Typography>
                    <ResponsiveContainer width="100%" height={180}>
                        <AreaChart data={MOCK_ANOMALY_TIMELINE}>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                            <YAxis />
                            <RechartsTooltip />
                            <Area type="monotone" dataKey="count" stroke="#ff9800" fill="#fff3e0" name="Anomalies" />
                            <Area type="monotone" dataKey="critical" stroke="#f44336" fill="#ffebee" name="Critical" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>

            <Grid item xs={12}>
                <Paper variant="outlined">
                    <Box sx={{ p: 2 }}><Typography variant="subtitle1" fontWeight="bold">Recent Anomalies</Typography></Box>
                    <Divider />
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Time</TableCell>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Description</TableCell>
                                    <TableCell>IP</TableCell>
                                    <TableCell>Risk</TableCell>
                                    <TableCell>Status</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {anomalies.slice(0, 5).map((a) => (
                                    <TableRow key={a.id} hover>
                                        <TableCell>{new Date(a.ts).toLocaleString()}</TableCell>
                                        <TableCell><Chip label={a.type} size="small" variant="outlined" /></TableCell>
                                        <TableCell>{a.description}</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{a.ip}</TableCell>
                                        <TableCell><RiskBadge score={a.riskScore} /></TableCell>
                                        <TableCell>
                                            <Chip label={a.resolved ? 'Resolved' : 'Open'} color={a.resolved ? 'default' : 'warning'} size="small" />
                                        </TableCell>
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
// Sessions Tab
// ---------------------------------------------------------------------------
function SessionsTab({ sessions, onLogout, onBulkLogout }) {
    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="outlined" color="error" onClick={onBulkLogout} disabled={sessions.length === 0}>
                    Logout All Sessions
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Session ID</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>IP</TableCell>
                            <TableCell>Started</TableCell>
                            <TableCell>Last Activity</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {sessions.map((s) => (
                            <TableRow key={s.id} hover>
                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.id}</TableCell>
                                <TableCell>{s.username}</TableCell>
                                <TableCell>{s.ip}</TableCell>
                                <TableCell>{new Date(s.startedAt).toLocaleString()}</TableCell>
                                <TableCell>{new Date(s.lastActivity).toLocaleString()}</TableCell>
                                <TableCell align="right">
                                    <Button size="small" color="error" variant="outlined" onClick={() => onLogout(s.id)}>
                                        Force Logout
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {sessions.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No active sessions</Typography>
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
// Anomalies Tab
// ---------------------------------------------------------------------------
function AnomaliesTab({ anomalies }) {
    const [typeFilter, setTypeFilter] = useState('');
    const filtered = typeFilter ? anomalies.filter(a => a.type === typeFilter) : anomalies;
    const types = [...new Set(anomalies.map(a => a.type))];

    return (
        <Box>
            <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
                <Chip label="All" onClick={() => setTypeFilter('')} color={typeFilter === '' ? 'primary' : 'default'} />
                {types.map(t => (
                    <Chip key={t} label={t} onClick={() => setTypeFilter(t)} color={typeFilter === t ? 'primary' : 'default'} />
                ))}
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Time</TableCell>
                            <TableCell>Type</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>IP</TableCell>
                            <TableCell>Risk</TableCell>
                            <TableCell>Status</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {filtered.map((a) => (
                            <TableRow key={a.id} hover>
                                <TableCell>{new Date(a.ts).toLocaleString()}</TableCell>
                                <TableCell><Chip label={a.type} size="small" variant="outlined" /></TableCell>
                                <TableCell>{a.description}</TableCell>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{a.ip}</TableCell>
                                <TableCell><RiskBadge score={a.riskScore} /></TableCell>
                                <TableCell>
                                    <Chip label={a.resolved ? 'Resolved' : 'Open'} color={a.resolved ? 'default' : 'warning'} size="small" />
                                </TableCell>
                            </TableRow>
                        ))}
                        {filtered.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={6} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No anomalies</Typography>
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
// IP Allowlist Tab
// ---------------------------------------------------------------------------
function IPAllowlistTab({ allowlist, onAdd, onRemove }) {
    const [newIP, setNewIP] = useState('');
    const [newNote, setNewNote] = useState('');

    return (
        <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>Add IP / CIDR</Typography>
                <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <TextField size="small" label="IP or CIDR" value={newIP} onChange={(e) => setNewIP(e.target.value)} placeholder="e.g. 10.0.0.0/8" />
                    <TextField size="small" label="Note (optional)" value={newNote} onChange={(e) => setNewNote(e.target.value)} />
                    <Button variant="contained" startIcon={<Add />} onClick={() => { onAdd(newIP, newNote); setNewIP(''); setNewNote(''); }} disabled={!newIP.trim()}>
                        Add
                    </Button>
                </Box>
            </Paper>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>IP / CIDR</TableCell>
                            <TableCell>Note</TableCell>
                            <TableCell>Added</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {allowlist.map((entry) => (
                            <TableRow key={entry.id} hover>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{entry.ip}</TableCell>
                                <TableCell>{entry.note || '—'}</TableCell>
                                <TableCell>{new Date(entry.addedAt).toLocaleDateString()}</TableCell>
                                <TableCell align="right">
                                    <IconButton size="small" color="error" onClick={() => onRemove(entry.ip)}>
                                        <Delete fontSize="small" />
                                    </IconButton>
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
// 2FA Management Tab
// ---------------------------------------------------------------------------
function TwoFATab({ users, enforce, onEnforceToggle, onGenerateSetup }) {
    return (
        <Box>
            <Paper variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="subtitle2">Enforce 2FA for all users</Typography>
                <FormControlLabel
                    control={<Switch checked={enforce} onChange={onEnforceToggle} />}
                    label={enforce ? 'Enforced' : 'Optional'}
                />
            </Paper>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>2FA Status</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((u) => (
                            <TableRow key={u.userId} hover>
                                <TableCell>{u.username}</TableCell>
                                <TableCell>{u.email}</TableCell>
                                <TableCell>{u.role}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={u.enrolled ? '✓ Enrolled' : '✗ Not enrolled'}
                                        color={u.enrolled ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell align="right">
                                    {!u.enrolled && (
                                        <Button size="small" variant="outlined" startIcon={<VpnKey />} onClick={() => onGenerateSetup(u.userId)}>
                                            Generate Setup Link
                                        </Button>
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
// Secrets Tab
// ---------------------------------------------------------------------------
function SecretsTab({ secrets, onSet, onDelete, onRotate }) {
    const [addKey, setAddKey] = useState('');
    const [addValue, setAddValue] = useState('');
    const [addOpen, setAddOpen] = useState(false);

    return (
        <Box>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', mb: 2 }}>
                <Button variant="contained" startIcon={<Add />} onClick={() => setAddOpen(true)}>
                    Set Secret
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Key Name</TableCell>
                            <TableCell>Last Rotated</TableCell>
                            <TableCell align="right">Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {secrets.map((s) => (
                            <TableRow key={s.key} hover>
                                <TableCell sx={{ fontFamily: 'monospace' }}>{s.key}</TableCell>
                                <TableCell>{s.rotatedAt ? new Date(s.rotatedAt).toLocaleDateString() : '—'}</TableCell>
                                <TableCell align="right">
                                    <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => onRotate(s.key)}>Rotate</Button>
                                    <Button size="small" color="error" variant="outlined" onClick={() => onDelete(s.key)}>Delete</Button>
                                </TableCell>
                            </TableRow>
                        ))}
                        {secrets.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={3} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No secrets</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            <Dialog open={addOpen} onClose={() => setAddOpen(false)}>
                <DialogTitle>Set Secret</DialogTitle>
                <DialogContent>
                    <TextField fullWidth label="Key" value={addKey} onChange={(e) => setAddKey(e.target.value)} sx={{ mb: 2, mt: 1 }} />
                    <TextField fullWidth label="Value" type="password" value={addValue} onChange={(e) => setAddValue(e.target.value)} />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddOpen(false)}>Cancel</Button>
                    <Button onClick={() => { onSet(addKey, addValue); setAddKey(''); setAddValue(''); setAddOpen(false); }} variant="contained" disabled={!addKey || !addValue}>
                        Set
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SecurityDashboard() {
    const [tab, setTab] = useState(0);
    const [score] = useState(MOCK_SCORE);
    const [anomalies, setAnomalies] = useState(MOCK_ANOMALIES);
    const [sessions, setSessions] = useState(MOCK_SESSIONS);
    const [allowlist, setAllowlist] = useState(MOCK_ALLOWLIST);
    const [twoFaUsers, setTwoFaUsers] = useState(MOCK_2FA);
    const [twoFaEnforce, setTwoFaEnforce] = useState(false);
    const [secrets, setSecrets] = useState(MOCK_SECRETS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);
    const pollingRef = useRef(null);

    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const [sessRes, anomRes, allowRes, twoFaRes, secretsRes] = await Promise.allSettled([
                api.get('/api/v1/security/sessions'),
                api.get('/api/v1/security/anomalies'),
                api.get('/api/v1/security/ip-allowlist'),
                api.get('/api/v1/security/2fa/status'),
                api.get('/api/v1/security/secrets'),
            ]);
            if (sessRes.status === 'fulfilled') setSessions(sessRes.value.data?.sessions || MOCK_SESSIONS);
            if (anomRes.status === 'fulfilled') setAnomalies(anomRes.value.data?.anomalies || MOCK_ANOMALIES);
            if (allowRes.status === 'fulfilled') {
                const list = allowRes.value.data?.allowlist || [];
                setAllowlist(list.map((ip, i) => ({ id: String(i), ip, addedAt: new Date().toISOString(), note: '' })));
            }
            if (twoFaRes.status === 'fulfilled') {
                const enrolled = twoFaRes.value.data?.enrolledUsers || [];
                setTwoFaUsers(prev => prev.map(u => ({ ...u, enrolled: enrolled.includes(u.userId) })));
                setTwoFaEnforce(twoFaRes.value.data?.enabled || false);
            }
            if (secretsRes.status === 'fulfilled') setSecrets(secretsRes.value.data?.keys?.map(k => ({ key: k })) || MOCK_SECRETS);
        } catch (_) {
            setError('Could not reach API — showing mock data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(fetchData, 30000);
        return () => clearInterval(pollingRef.current);
    }, [fetchData]);

    const handleLogout = async (sessionId) => {
        try {
            await api.post(`/api/v1/security/sessions/${sessionId}/logout`);
            setSessions(prev => prev.filter(s => s.id !== sessionId));
            showSuccess('Session logged out.');
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleBulkLogout = async () => {
        for (const s of sessions) {
            try { await api.post(`/api/v1/security/sessions/${s.id}/logout`); } catch (_) {}
        }
        setSessions([]);
        showSuccess('All sessions logged out.');
    };

    const handleAddIP = async (ip, note) => {
        try {
            await api.post('/api/v1/security/ip-allowlist', { ip });
            setAllowlist(prev => [...prev, { id: String(Date.now()), ip, note, addedAt: new Date().toISOString() }]);
            showSuccess(`Added ${ip} to allowlist.`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleRemoveIP = async (ip) => {
        try {
            await api.delete(`/api/v1/security/ip-allowlist/${encodeURIComponent(ip)}`);
            setAllowlist(prev => prev.filter(e => e.ip !== ip));
            showSuccess(`Removed ${ip}.`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleEnforceToggle = async () => {
        const next = !twoFaEnforce;
        try {
            await api.post('/api/v1/security/2fa/enforce', { enabled: next });
            setTwoFaEnforce(next);
            showSuccess(`2FA enforcement ${next ? 'enabled' : 'disabled'}.`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleGenerateSetup = async (userId) => {
        try {
            const res = await api.post('/api/v1/security/2fa/generate', { userId });
            showSuccess(`Setup link generated for ${userId}. QR URL: ${res.data?.qrCodeUrl || '(see API)'}`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleSetSecret = async (key, value) => {
        try {
            await api.post('/api/v1/security/secrets', { key, value });
            setSecrets(prev => [...prev.filter(s => s.key !== key), { key, rotatedAt: new Date().toISOString() }]);
            showSuccess(`Secret '${key}' set.`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleDeleteSecret = async (key) => {
        try {
            await api.delete(`/api/v1/security/secrets/${encodeURIComponent(key)}`);
            setSecrets(prev => prev.filter(s => s.key !== key));
            showSuccess(`Secret '${key}' deleted.`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const handleRotateSecret = async (key) => {
        const newVal = window.crypto
            ? Array.from(window.crypto.getRandomValues(new Uint8Array(32))).map(b => b.toString(16).padStart(2, '0')).join('')
            : `rotate-${Date.now()}-${Math.random().toString(36).slice(2)}`;
        try {
            await api.post(`/api/v1/security/secrets/${encodeURIComponent(key)}/rotate`, { newValue: newVal });
            setSecrets(prev => prev.map(s => s.key === key ? { ...s, rotatedAt: new Date().toISOString() } : s));
            showSuccess(`Secret '${key}' rotated.`);
        } catch (e) {
            setError(`Failed: ${e.message}`);
        }
    };

    const TABS = ['Overview', 'Sessions', 'Anomalies', 'IP Allowlist', '2FA Management', 'Secrets'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Security sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Security Dashboard</Typography>
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
                {successMsg && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccessMsg(null)}>{successMsg}</Alert>
                    </motion.div>
                )}
            </AnimatePresence>

            <Paper variant="outlined">
                <Tabs value={tab} onChange={(_, v) => setTab(v)} variant="scrollable" scrollButtons="auto" sx={{ borderBottom: 1, borderColor: 'divider' }}>
                    {TABS.map(label => <Tab key={label} label={label} />)}
                </Tabs>

                <Box sx={{ p: 2 }}>
                    <TabPanel value={tab} index={0}>
                        <OverviewTab score={score} anomalies={anomalies} sessions={sessions} twoFaUsers={twoFaUsers} allowlist={allowlist} />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <SessionsTab sessions={sessions} onLogout={handleLogout} onBulkLogout={handleBulkLogout} />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <AnomaliesTab anomalies={anomalies} />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <IPAllowlistTab allowlist={allowlist} onAdd={handleAddIP} onRemove={handleRemoveIP} />
                    </TabPanel>
                    <TabPanel value={tab} index={4}>
                        <TwoFATab users={twoFaUsers} enforce={twoFaEnforce} onEnforceToggle={handleEnforceToggle} onGenerateSetup={handleGenerateSetup} />
                    </TabPanel>
                    <TabPanel value={tab} index={5}>
                        <SecretsTab secrets={secrets} onSet={handleSetSecret} onDelete={handleDeleteSecret} onRotate={handleRotateSecret} />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
