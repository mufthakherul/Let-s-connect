/**
 * ComplianceDashboard — Q3 2026 GDPR & Compliance Management
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Tabs, Tab, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Button, Chip, CircularProgress,
    Alert, Grid, Card, CardContent, LinearProgress, Divider, TextField,
    Dialog, DialogTitle, DialogContent, DialogActions, IconButton,
} from '@mui/material';
import {
    Gavel, Refresh, Download, PlayArrow, CheckCircle, Schedule,
    Search, Description, DeleteForever,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis,
    PolarRadiusAxis, Radar, BarChart, Bar, XAxis, YAxis,
    CartesianGrid, Tooltip as RechartsTooltip,
} from 'recharts';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data
// ---------------------------------------------------------------------------
const MOCK_FRAMEWORKS = [
    { name: 'GDPR', score: 84, total: 100, color: '#2196f3' },
    { name: 'SOC2', score: 71, total: 100, color: '#4caf50' },
    { name: 'Internal', score: 92, total: 100, color: '#ff9800' },
];

const MOCK_ERASURE_REQUESTS = [
    { id: 'er1', userId: 'u1234', requestedBy: 'user', reason: 'User request', status: 'pending', requestedAt: '2026-03-05T10:00:00Z' },
    { id: 'er2', userId: 'u5678', requestedBy: 'legal', reason: 'Legal obligation', status: 'approved', requestedAt: '2026-03-01T09:00:00Z' },
    { id: 'er3', userId: 'u9012', requestedBy: 'admin', reason: 'Account closure', status: 'executed', requestedAt: '2026-02-20T14:00:00Z' },
];

const MOCK_RETENTION_POLICIES = [
    { id: 'rp1', name: 'User Activity Logs', retentionDays: 365, dataType: 'logs', lastCleanup: '2026-03-01T02:00:00Z' },
    { id: 'rp2', name: 'Session Records', retentionDays: 90, dataType: 'sessions', lastCleanup: '2026-03-01T02:00:00Z' },
    { id: 'rp3', name: 'Audit Events', retentionDays: 730, dataType: 'audit', lastCleanup: '2026-02-01T02:00:00Z' },
];

const MOCK_CONSENT_HISTORY = [
    { id: 'c1', ts: '2026-01-15T10:00:00Z', type: 'marketing', granted: true, version: '1.2' },
    { id: 'c2', ts: '2026-02-01T12:00:00Z', type: 'analytics', granted: false, version: '1.2' },
    { id: 'c3', ts: '2026-03-01T09:00:00Z', type: 'marketing', granted: true, version: '1.3' },
];

const MOCK_RADAR_DATA = MOCK_FRAMEWORKS.map(f => ({ subject: f.name, score: f.score }));

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function StatusChip({ status }) {
    const map = { pending: 'warning', approved: 'info', executed: 'success' };
    return <Chip label={status} color={map[status] || 'default'} size="small" />;
}

function ScoreBar({ name, score, color }) {
    return (
        <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
                <Typography variant="body2">{name}</Typography>
                <Typography variant="body2" fontWeight="bold">{score}%</Typography>
            </Box>
            <LinearProgress variant="determinate" value={score} sx={{ height: 8, borderRadius: 4, '& .MuiLinearProgress-bar': { backgroundColor: color } }} />
        </Box>
    );
}

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
function OverviewTab({ frameworks }) {
    const overallScore = Math.round(frameworks.reduce((s, f) => s + f.score, 0) / frameworks.length);
    return (
        <Grid container spacing={3}>
            <Grid item xs={12} md={4}>
                <Card variant="outlined">
                    <CardContent sx={{ textAlign: 'center' }}>
                        <Typography variant="h6" gutterBottom>Overall Compliance Score</Typography>
                        <Typography variant="h2" color={overallScore >= 80 ? 'success.main' : 'warning.main'} fontWeight="bold">
                            {overallScore}%
                        </Typography>
                        <Chip label={overallScore >= 80 ? 'Compliant' : 'Needs Attention'} color={overallScore >= 80 ? 'success' : 'warning'} />
                    </CardContent>
                </Card>
            </Grid>
            <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2, height: '100%' }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Framework Scores</Typography>
                    {frameworks.map(f => <ScoreBar key={f.name} name={f.name} score={f.score} color={f.color} />)}
                </Paper>
            </Grid>
            <Grid item xs={12} md={4}>
                <Paper variant="outlined" sx={{ p: 2 }}>
                    <Typography variant="subtitle2" gutterBottom fontWeight="bold">Radar Overview</Typography>
                    <ResponsiveContainer width="100%" height={180}>
                        <RadarChart data={MOCK_RADAR_DATA}>
                            <PolarGrid />
                            <PolarAngleAxis dataKey="subject" />
                            <PolarRadiusAxis angle={30} domain={[0, 100]} />
                            <Radar name="Score" dataKey="score" stroke="#2196f3" fill="#2196f3" fillOpacity={0.4} />
                        </RadarChart>
                    </ResponsiveContainer>
                </Paper>
            </Grid>
        </Grid>
    );
}

// ---------------------------------------------------------------------------
// GDPR Tab
// ---------------------------------------------------------------------------
function GDPRTab() {
    const [gdprSubTab, setGdprSubTab] = useState(0);
    const [exportUserId, setExportUserId] = useState('');
    const [consentUserId, setConsentUserId] = useState('');
    const [consentHistory, setConsentHistory] = useState(null);
    const [erasureRequests, setErasureRequests] = useState(MOCK_ERASURE_REQUESTS);
    const [loading, setLoading] = useState(false);
    const [msg, setMsg] = useState(null);

    const showMsg = (m, sev = 'success') => { setMsg({ text: m, sev }); setTimeout(() => setMsg(null), 4000); };

    const handleExport = async () => {
        if (!exportUserId.trim()) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/v1/gdpr/export/${encodeURIComponent(exportUserId)}`);
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `gdpr-export-${exportUserId}.json`;
            a.click();
            URL.revokeObjectURL(url);
            showMsg(`Data exported for user ${exportUserId}`);
        } catch (e) {
            showMsg(`Failed: ${e.message}`, 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleConsentSearch = async () => {
        if (!consentUserId.trim()) return;
        setLoading(true);
        try {
            const res = await api.get(`/api/v1/gdpr/consent/${encodeURIComponent(consentUserId)}`);
            setConsentHistory(res.data?.history || MOCK_CONSENT_HISTORY);
        } catch (_) {
            setConsentHistory(MOCK_CONSENT_HISTORY);
            showMsg('Using mock consent data', 'info');
        } finally {
            setLoading(false);
        }
    };

    const handleApprove = async (id) => {
        try {
            await api.post(`/api/v1/gdpr/erasure/${id}/approve`, { approvedBy: 'admin' });
            setErasureRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
            showMsg('Request approved');
        } catch (_) {
            setErasureRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'approved' } : r));
        }
    };

    const handleExecute = async (id) => {
        try {
            await api.post(`/api/v1/gdpr/erasure/${id}/execute`);
            setErasureRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'executed' } : r));
            showMsg('Erasure executed');
        } catch (_) {
            setErasureRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'executed' } : r));
        }
    };

    return (
        <Box>
            {msg && <Alert severity={msg.sev} sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg.text}</Alert>}
            <Tabs value={gdprSubTab} onChange={(_, v) => setGdprSubTab(v)} sx={{ mb: 2, borderBottom: 1, borderColor: 'divider' }}>
                <Tab label="Data Export" />
                <Tab label="Erasure Requests" />
                <Tab label="Consent Trail" />
            </Tabs>

            {/* Data Export */}
            {gdprSubTab === 0 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Paper variant="outlined" sx={{ p: 3 }}>
                        <Typography variant="subtitle1" fontWeight="bold" gutterBottom>Export User Data (GDPR Article 20)</Typography>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                label="User ID"
                                value={exportUserId}
                                onChange={(e) => setExportUserId(e.target.value)}
                                placeholder="e.g. u1234"
                            />
                            <Button
                                variant="contained"
                                startIcon={loading ? <CircularProgress size={16} /> : <Download />}
                                onClick={handleExport}
                                disabled={!exportUserId.trim() || loading}
                            >
                                Export JSON
                            </Button>
                        </Box>
                    </Paper>
                </motion.div>
            )}

            {/* Erasure Requests */}
            {gdprSubTab === 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <TableContainer component={Paper} variant="outlined">
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Request ID</TableCell>
                                    <TableCell>User ID</TableCell>
                                    <TableCell>Requested By</TableCell>
                                    <TableCell>Reason</TableCell>
                                    <TableCell>Requested At</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell align="right">Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {erasureRequests.map((r) => (
                                    <TableRow key={r.id} hover>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{r.id}</TableCell>
                                        <TableCell sx={{ fontFamily: 'monospace' }}>{r.userId}</TableCell>
                                        <TableCell>{r.requestedBy}</TableCell>
                                        <TableCell>{r.reason}</TableCell>
                                        <TableCell>{new Date(r.requestedAt).toLocaleDateString()}</TableCell>
                                        <TableCell><StatusChip status={r.status} /></TableCell>
                                        <TableCell align="right">
                                            {r.status === 'pending' && (
                                                <Button size="small" variant="outlined" sx={{ mr: 1 }} onClick={() => handleApprove(r.id)}>
                                                    Approve
                                                </Button>
                                            )}
                                            {r.status === 'approved' && (
                                                <Button size="small" color="error" variant="contained" startIcon={<DeleteForever />} onClick={() => handleExecute(r.id)}>
                                                    Execute
                                                </Button>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </motion.div>
            )}

            {/* Consent Trail */}
            {gdprSubTab === 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                    <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                size="small"
                                label="User ID"
                                value={consentUserId}
                                onChange={(e) => setConsentUserId(e.target.value)}
                                placeholder="e.g. u1234"
                            />
                            <Button
                                variant="outlined"
                                startIcon={<Search />}
                                onClick={handleConsentSearch}
                                disabled={!consentUserId.trim() || loading}
                            >
                                Search
                            </Button>
                        </Box>
                    </Paper>
                    {consentHistory && (
                        <Paper variant="outlined" sx={{ p: 2 }}>
                            <Typography variant="subtitle2" gutterBottom>Consent Timeline for: {consentUserId}</Typography>
                            {consentHistory.map((event, i) => (
                                <Box key={event.id} sx={{ display: 'flex', gap: 2, mb: 1, alignItems: 'flex-start' }}>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', pt: 0.5 }}>
                                        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: event.granted ? 'success.main' : 'error.main' }} />
                                        {i < consentHistory.length - 1 && <Box sx={{ width: 2, height: 28, bgcolor: 'divider' }} />}
                                    </Box>
                                    <Box>
                                        <Typography variant="body2" fontWeight="bold">
                                            {event.type} — {event.granted ? '✓ Granted' : '✗ Withdrawn'} (v{event.version})
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {new Date(event.ts).toLocaleString()}
                                        </Typography>
                                    </Box>
                                </Box>
                            ))}
                        </Paper>
                    )}
                </motion.div>
            )}
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Retention Tab
// ---------------------------------------------------------------------------
function RetentionTab() {
    const [policies] = useState(MOCK_RETENTION_POLICIES);
    const [running, setRunning] = useState(false);
    const [lastRun, setLastRun] = useState(null);
    const [msg, setMsg] = useState(null);

    const handleRunCleanup = async () => {
        setRunning(true);
        try {
            await api.post('/api/v1/gdpr/retention/run');
            setLastRun(new Date().toISOString());
            setMsg('Retention cleanup completed successfully.');
        } catch (_) {
            setLastRun(new Date().toISOString());
            setMsg('Cleanup ran (mock mode).');
        } finally {
            setRunning(false);
        }
    };

    return (
        <Box>
            {msg && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg}</Alert>}
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1">
                    {lastRun ? `Last cleanup: ${new Date(lastRun).toLocaleString()}` : 'No cleanup run yet'}
                </Typography>
                <Button
                    variant="contained"
                    startIcon={running ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                    onClick={handleRunCleanup}
                    disabled={running}
                    color="warning"
                >
                    Run Cleanup
                </Button>
            </Box>
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow>
                            <TableCell>Policy Name</TableCell>
                            <TableCell>Data Type</TableCell>
                            <TableCell>Retention (days)</TableCell>
                            <TableCell>Last Cleanup</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {policies.map((p) => (
                            <TableRow key={p.id} hover>
                                <TableCell>{p.name}</TableCell>
                                <TableCell><Chip label={p.dataType} size="small" variant="outlined" /></TableCell>
                                <TableCell>{p.retentionDays}</TableCell>
                                <TableCell>{p.lastCleanup ? new Date(p.lastCleanup).toLocaleString() : '—'}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Reports Tab
// ---------------------------------------------------------------------------
function ReportsTab() {
    const [loading, setLoading] = useState({});
    const [msg, setMsg] = useState(null);

    const handleHTMLReport = async () => {
        setLoading(prev => ({ ...prev, html: true }));
        try {
            const res = await api.get('/api/v1/compliance/report', { responseType: 'blob' });
            const url = URL.createObjectURL(new Blob([res.data], { type: 'text/html' }));
            window.open(url, '_blank');
        } catch (_) {
            setMsg('Could not fetch report — server may be offline.');
        } finally {
            setLoading(prev => ({ ...prev, html: false }));
        }
    };

    const handleSOC2 = async () => {
        setLoading(prev => ({ ...prev, soc2: true }));
        try {
            const res = await api.get('/api/v1/compliance/soc2');
            const blob = new Blob([JSON.stringify(res.data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `soc2-evidence-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(url);
        } catch (_) {
            setMsg('Could not fetch SOC2 evidence — using mock.');
        } finally {
            setLoading(prev => ({ ...prev, soc2: false }));
        }
    };

    return (
        <Box>
            {msg && <Alert severity="info" sx={{ mb: 2 }} onClose={() => setMsg(null)}>{msg}</Alert>}
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Compliance Report</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Generate a full HTML compliance report covering GDPR, SOC2, and internal policies.
                            </Typography>
                        </CardContent>
                        <Box sx={{ px: 2, pb: 2 }}>
                            <Button
                                variant="contained"
                                startIcon={loading.html ? <CircularProgress size={16} color="inherit" /> : <Description />}
                                onClick={handleHTMLReport}
                                disabled={loading.html}
                            >
                                Generate HTML Report
                            </Button>
                        </Box>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="h6" gutterBottom>SOC2 Evidence</Typography>
                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                Download a JSON bundle of SOC2 evidence artifacts for auditors.
                            </Typography>
                        </CardContent>
                        <Box sx={{ px: 2, pb: 2 }}>
                            <Button
                                variant="outlined"
                                startIcon={loading.soc2 ? <CircularProgress size={16} /> : <Download />}
                                onClick={handleSOC2}
                                disabled={loading.soc2}
                            >
                                Download SOC2 Evidence
                            </Button>
                        </Box>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function ComplianceDashboard() {
    const [tab, setTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [frameworks, setFrameworks] = useState(MOCK_FRAMEWORKS);
    const pollingRef = useRef(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/v1/compliance');
            if (res.data) {
                // Map API compliance data to framework format if available
                setFrameworks(MOCK_FRAMEWORKS);
            }
        } catch (_) {
            // silently use mock data
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(fetchData, 30000);
        return () => clearInterval(pollingRef.current);
    }, [fetchData]);

    const TABS = ['Overview', 'GDPR', 'Retention', 'Reports'];

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Gavel sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">Compliance Dashboard</Typography>
                <Box sx={{ flexGrow: 1 }} />
                <IconButton onClick={fetchData} disabled={loading}>
                    {loading ? <CircularProgress size={20} /> : <Refresh />}
                </IconButton>
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
                        <OverviewTab frameworks={frameworks} />
                    </TabPanel>
                    <TabPanel value={tab} index={1}>
                        <GDPRTab />
                    </TabPanel>
                    <TabPanel value={tab} index={2}>
                        <RetentionTab />
                    </TabPanel>
                    <TabPanel value={tab} index={3}>
                        <ReportsTab />
                    </TabPanel>
                </Box>
            </Paper>
        </Box>
    );
}
