/**
 * SSHAdminPanel — Q3 2026 SSH Administration Panel
 * Milonexa Admin Dashboard
 */
import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Button, Chip, CircularProgress, Alert, IconButton,
    Dialog, DialogTitle, DialogContent, DialogActions, TextField, Divider,
    Card, CardContent, CardActions, Tooltip, Grid, LinearProgress,
} from '@mui/material';
import {
    Refresh, VpnKey, RotateRight, Block, PlayCircle, CheckCircle,
    Warning, ErrorOutline, Security, Terminal,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Mock data fallback
// ---------------------------------------------------------------------------
const MOCK_KEYS = [
    { id: 'host_rsa', file: 'host_rsa', type: 'RSA 4096', fingerprint: 'SHA256:mock1234abcd...', createdAt: '2026-01-15T10:00:00Z', modifiedAt: '2026-01-15T10:00:00Z', status: 'active' },
    { id: 'host_rsa.backup.1720000000000', file: 'host_rsa.backup.1720000000000', type: 'RSA 2048', fingerprint: 'SHA256:oldkey5678efgh...', createdAt: '2025-06-01T08:00:00Z', modifiedAt: '2025-06-01T08:00:00Z', status: 'revoked' },
];
const MOCK_SESSIONS = [
    { sessionId: 'abc123def456', actor: 'admin', ip: '127.0.0.1', startTs: '2026-03-10T09:00:00Z', endTs: '2026-03-10T09:25:00Z', duration_sec: 1500, commandCount: 12, active: false },
    { sessionId: 'xyz789uvw012', actor: 'admin', ip: '10.0.0.5', startTs: '2026-03-10T10:30:00Z', endTs: null, duration_sec: null, commandCount: 3, active: true },
];
const MOCK_BG_STATUS = { active: false };
const MOCK_RECORDINGS = [
    { filename: 'abc123def456.cast', sessionId: 'abc123def456', size: 12048 },
    { filename: 'xyz789uvw012.cast', sessionId: 'xyz789uvw012', size: 3200 },
];

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------
function StatusChip({ status }) {
    const map = {
        active: { color: 'success', label: 'Active' },
        revoked: { color: 'error', label: 'Revoked' },
        backup: { color: 'default', label: 'Backup' },
    };
    const cfg = map[status] || { color: 'default', label: status };
    return <Chip label={cfg.label} color={cfg.color} size="small" />;
}

function SessionChip({ active }) {
    return <Chip label={active ? 'Active' : 'Ended'} color={active ? 'success' : 'default'} size="small" />;
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------
export default function SSHAdminPanel() {
    const [keys, setKeys] = useState(MOCK_KEYS);
    const [sessions, setSessions] = useState(MOCK_SESSIONS);
    const [recordings] = useState(MOCK_RECORDINGS);
    const [breakGlass, setBreakGlass] = useState(MOCK_BG_STATUS);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [successMsg, setSuccessMsg] = useState(null);

    // Dialogs
    const [rotateDialogOpen, setRotateDialogOpen] = useState(false);
    const [revokeDialogOpen, setRevokeDialogOpen] = useState(null); // keyId
    const [bgActivateOpen, setBgActivateOpen] = useState(false);
    const [bgConfirmText, setBgConfirmText] = useState('');
    const [bgReason, setBgReason] = useState('');
    const [bgRevokeOpen, setBgRevokeOpen] = useState(false);
    const [bgCountdown, setBgCountdown] = useState(null);

    const pollingRef = useRef(null);

    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [keysRes, sessionsRes, bgRes] = await Promise.allSettled([
                api.get('/api/v1/ssh/keys'),
                api.get('/api/v1/ssh/sessions'),
                api.get('/api/v1/security/break-glass/status'),
            ]);
            if (keysRes.status === 'fulfilled') setKeys(keysRes.value.data?.keys || MOCK_KEYS);
            if (sessionsRes.status === 'fulfilled') setSessions(sessionsRes.value.data?.sessions || MOCK_SESSIONS);
            if (bgRes.status === 'fulfilled') setBreakGlass(bgRes.value.data || MOCK_BG_STATUS);
        } catch (_) {
            setError('Failed to load SSH admin data — showing mock data');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
        pollingRef.current = setInterval(fetchData, 30000);
        return () => clearInterval(pollingRef.current);
    }, [fetchData]);

    // Break-glass countdown
    useEffect(() => {
        if (!breakGlass?.active || !breakGlass?.expiry) { setBgCountdown(null); return; }
        const update = () => {
            const rem = Math.max(0, Math.round((new Date(breakGlass.expiry).getTime() - Date.now()) / 1000));
            setBgCountdown(rem);
        };
        update();
        const t = setInterval(update, 1000);
        return () => clearInterval(t);
    }, [breakGlass]);

    const showSuccess = (msg) => { setSuccessMsg(msg); setTimeout(() => setSuccessMsg(null), 4000); };

    const handleRotateKey = async () => {
        setRotateDialogOpen(false);
        setLoading(true);
        try {
            await api.post('/api/v1/ssh/keys/rotate');
            showSuccess('Host key rotated successfully. Restart SSH server to apply.');
            await fetchData();
        } catch (e) {
            setError(`Failed to rotate key: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeKey = async (keyId) => {
        setRevokeDialogOpen(null);
        setLoading(true);
        try {
            await api.delete(`/api/v1/ssh/keys/${encodeURIComponent(keyId)}`);
            showSuccess(`Key '${keyId}' revoked.`);
            await fetchData();
        } catch (e) {
            setError(`Failed to revoke key: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleActivateBreakGlass = async () => {
        if (bgConfirmText !== 'EMERGENCY') return;
        setBgActivateOpen(false);
        setLoading(true);
        try {
            await api.post('/api/v1/security/break-glass/activate', { reason: bgReason, activatedBy: 'admin-web' });
            showSuccess('Break-glass activated for 15 minutes.');
            setBgConfirmText('');
            setBgReason('');
            await fetchData();
        } catch (e) {
            setError(`Failed to activate break-glass: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const handleRevokeBreakGlass = async () => {
        setBgRevokeOpen(false);
        setLoading(true);
        try {
            await api.post('/api/v1/security/break-glass/revoke');
            showSuccess('Break-glass revoked.');
            await fetchData();
        } catch (e) {
            setError(`Failed to revoke break-glass: ${e.message}`);
        } finally {
            setLoading(false);
        }
    };

    const FadeIn = ({ children, delay = 0 }) => (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay }}>
            {children}
        </motion.div>
    );

    return (
        <Box sx={{ p: 3 }}>
            {/* Header */}
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 3, gap: 2 }}>
                <Terminal sx={{ fontSize: 32, color: 'primary.main' }} />
                <Typography variant="h5" fontWeight="bold">SSH Administration</Typography>
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

            <Grid container spacing={3}>
                {/* Break-Glass Card */}
                <Grid item xs={12} md={4}>
                    <FadeIn delay={0}>
                        <Card variant="outlined" sx={{ border: breakGlass?.active ? '2px solid #f44336' : undefined }}>
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    {breakGlass?.active
                                        ? <ErrorOutline color="error" />
                                        : <CheckCircle color="success" />}
                                    <Typography variant="h6">Break-Glass</Typography>
                                </Box>
                                {breakGlass?.active ? (
                                    <>
                                        <Alert severity="error" sx={{ mb: 1 }}>ACTIVE — Emergency Mode</Alert>
                                        <Typography variant="body2">Activated by: <strong>{breakGlass.activatedBy}</strong></Typography>
                                        <Typography variant="body2">Expires: {breakGlass.expiry}</Typography>
                                        {bgCountdown !== null && (
                                            <Box sx={{ mt: 1 }}>
                                                <Typography variant="caption">Time remaining: {Math.floor(bgCountdown / 60)}m {bgCountdown % 60}s</Typography>
                                                <LinearProgress
                                                    variant="determinate"
                                                    value={Math.min(100, (bgCountdown / 900) * 100)}
                                                    color="error"
                                                    sx={{ mt: 0.5 }}
                                                />
                                            </Box>
                                        )}
                                    </>
                                ) : (
                                    <Typography variant="body2" color="text.secondary">Not active. Use only in emergencies.</Typography>
                                )}
                            </CardContent>
                            <CardActions>
                                {breakGlass?.active ? (
                                    <Button color="error" variant="outlined" size="small" onClick={() => setBgRevokeOpen(true)}>
                                        Revoke
                                    </Button>
                                ) : (
                                    <Button color="warning" variant="contained" size="small" startIcon={<Warning />} onClick={() => setBgActivateOpen(true)}>
                                        Activate
                                    </Button>
                                )}
                            </CardActions>
                        </Card>
                    </FadeIn>
                </Grid>

                {/* Key stats */}
                <Grid item xs={12} md={4}>
                    <FadeIn delay={0.05}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <VpnKey color="primary" />
                                    <Typography variant="h6">SSH Keys</Typography>
                                </Box>
                                <Typography variant="h3">{keys.length}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {keys.filter(k => k.status === 'active').length} active, {keys.filter(k => k.status === 'revoked').length} revoked
                                </Typography>
                            </CardContent>
                            <CardActions>
                                <Button size="small" startIcon={<RotateRight />} onClick={() => setRotateDialogOpen(true)} variant="outlined">
                                    Rotate Host Key
                                </Button>
                            </CardActions>
                        </Card>
                    </FadeIn>
                </Grid>

                {/* Session stats */}
                <Grid item xs={12} md={4}>
                    <FadeIn delay={0.1}>
                        <Card variant="outlined">
                            <CardContent>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                                    <Security color="primary" />
                                    <Typography variant="h6">Sessions</Typography>
                                </Box>
                                <Typography variant="h3">{sessions.length}</Typography>
                                <Typography variant="body2" color="text.secondary">
                                    {sessions.filter(s => s.active).length} active, {recordings.length} recordings
                                </Typography>
                            </CardContent>
                        </Card>
                    </FadeIn>
                </Grid>

                {/* Key Management Table */}
                <Grid item xs={12}>
                    <FadeIn delay={0.15}>
                        <Paper variant="outlined">
                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <VpnKey />
                                <Typography variant="h6">Key Management</Typography>
                            </Box>
                            <Divider />
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Filename</TableCell>
                                            <TableCell>Type</TableCell>
                                            <TableCell>Fingerprint</TableCell>
                                            <TableCell>Created</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell align="right">Actions</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {keys.map((k) => (
                                            <TableRow key={k.id} hover>
                                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{k.file}</TableCell>
                                                <TableCell>{k.type || '—'}</TableCell>
                                                <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                    {k.fingerprint || '—'}
                                                </TableCell>
                                                <TableCell>{k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '—'}</TableCell>
                                                <TableCell><StatusChip status={k.status} /></TableCell>
                                                <TableCell align="right">
                                                    {k.status !== 'revoked' && (
                                                        <Tooltip title="Revoke key">
                                                            <IconButton size="small" color="error" onClick={() => setRevokeDialogOpen(k.id)}>
                                                                <Block fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    )}
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                        {keys.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={6} align="center">
                                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No SSH keys found</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </FadeIn>
                </Grid>

                {/* Session Audit Table */}
                <Grid item xs={12}>
                    <FadeIn delay={0.2}>
                        <Paper variant="outlined">
                            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                                <Security />
                                <Typography variant="h6">Session Audit Log</Typography>
                            </Box>
                            <Divider />
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Session ID</TableCell>
                                            <TableCell>User</TableCell>
                                            <TableCell>IP</TableCell>
                                            <TableCell>Start</TableCell>
                                            <TableCell>Duration (s)</TableCell>
                                            <TableCell>Commands</TableCell>
                                            <TableCell>Status</TableCell>
                                            <TableCell>Recording</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {sessions.map((s) => {
                                            const rec = recordings.find(r => r.sessionId === s.sessionId);
                                            return (
                                                <TableRow key={s.sessionId} hover>
                                                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.75rem' }}>{s.sessionId?.slice(0, 16)}…</TableCell>
                                                    <TableCell>{s.actor}</TableCell>
                                                    <TableCell>{s.ip}</TableCell>
                                                    <TableCell>{s.startTs ? new Date(s.startTs).toLocaleString() : '—'}</TableCell>
                                                    <TableCell>{s.duration_sec ?? '—'}</TableCell>
                                                    <TableCell>{s.commandCount ?? 0}</TableCell>
                                                    <TableCell><SessionChip active={s.active} /></TableCell>
                                                    <TableCell>
                                                        {rec ? (
                                                            <Tooltip title="View recording (asciinema v2)">
                                                                <IconButton size="small" color="primary">
                                                                    <PlayCircle fontSize="small" />
                                                                </IconButton>
                                                            </Tooltip>
                                                        ) : '—'}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                        {sessions.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={8} align="center">
                                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>No sessions recorded</Typography>
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Paper>
                    </FadeIn>
                </Grid>
            </Grid>

            {/* Rotate Key Confirmation Dialog */}
            <Dialog open={rotateDialogOpen} onClose={() => setRotateDialogOpen(false)}>
                <DialogTitle>Rotate SSH Host Key</DialogTitle>
                <DialogContent>
                    <Alert severity="warning" sx={{ mb: 2 }}>
                        This generates a new RSA 4096 host key. The old key will be backed up.
                        SSH clients will see a host key change warning on next connect.
                        You must restart the SSH server for the new key to take effect.
                    </Alert>
                    <Typography variant="body2">Are you sure you want to rotate the SSH host key?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRotateDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleRotateKey} color="warning" variant="contained" startIcon={<RotateRight />}>
                        Rotate Key
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Revoke Key Dialog */}
            <Dialog open={!!revokeDialogOpen} onClose={() => setRevokeDialogOpen(null)}>
                <DialogTitle>Revoke SSH Key</DialogTitle>
                <DialogContent>
                    <Typography>Revoke key: <strong>{revokeDialogOpen}</strong>?</Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                        This will mark the key as revoked in the revoked-keys registry.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRevokeDialogOpen(null)}>Cancel</Button>
                    <Button onClick={() => handleRevokeKey(revokeDialogOpen)} color="error" variant="contained" startIcon={<Block />}>
                        Revoke
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Break-Glass Activate Dialog */}
            <Dialog open={bgActivateOpen} onClose={() => { setBgActivateOpen(false); setBgConfirmText(''); setBgReason(''); }} maxWidth="sm" fullWidth>
                <DialogTitle sx={{ color: 'error.main' }}>⚠ Emergency Break-Glass Activation</DialogTitle>
                <DialogContent>
                    <Alert severity="error" sx={{ mb: 2 }}>
                        This grants temporary admin override for 15 minutes. All activity is audited and alerted.
                        Use only in genuine emergencies.
                    </Alert>
                    <TextField
                        fullWidth
                        label="Reason (optional)"
                        value={bgReason}
                        onChange={(e) => setBgReason(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <TextField
                        fullWidth
                        label='Type "EMERGENCY" to confirm'
                        value={bgConfirmText}
                        onChange={(e) => setBgConfirmText(e.target.value)}
                        error={bgConfirmText.length > 0 && bgConfirmText !== 'EMERGENCY'}
                        helperText={bgConfirmText.length > 0 && bgConfirmText !== 'EMERGENCY' ? 'Must type EMERGENCY exactly' : ''}
                        inputProps={{ style: { fontFamily: 'monospace' } }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => { setBgActivateOpen(false); setBgConfirmText(''); setBgReason(''); }}>Cancel</Button>
                    <Button
                        onClick={handleActivateBreakGlass}
                        color="error"
                        variant="contained"
                        disabled={bgConfirmText !== 'EMERGENCY'}
                    >
                        Activate Break-Glass
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Break-Glass Revoke Dialog */}
            <Dialog open={bgRevokeOpen} onClose={() => setBgRevokeOpen(false)}>
                <DialogTitle>Revoke Break-Glass</DialogTitle>
                <DialogContent>
                    <Typography>Immediately end the break-glass window?</Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBgRevokeOpen(false)}>Cancel</Button>
                    <Button onClick={handleRevokeBreakGlass} color="error" variant="contained">
                        Revoke Now
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}
