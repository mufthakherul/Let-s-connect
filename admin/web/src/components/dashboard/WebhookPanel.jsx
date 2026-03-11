import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardHeader,
    Button, TextField, MenuItem, Select, FormControl, InputLabel,
    IconButton, Chip, Alert, Dialog, DialogTitle, DialogContent,
    DialogActions, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Tooltip, CircularProgress, Switch,
    FormControlLabel
} from '@mui/material';
import {
    Webhook, Add, Delete, PlayArrow, History,
    CheckCircle, Error as ErrorIcon, Refresh
} from '@mui/icons-material';
import api from '../../utils/api';

const WEBHOOK_TYPES = ['slack', 'teams', 'pagerduty', 'github'];
const SEVERITY_OPTIONS = ['all', 'info', 'warning', 'critical'];

/**
 * Webhook Integrations Panel — Phase E
 * Manage and test webhook integrations for Slack, Teams, PagerDuty, and GitHub.
 */
const WebhookPanel = () => {
    const [webhooks, setWebhooks] = useState([]);
    const [stats, setStats] = useState({ total: 0, enabled: 0, deliveries: 0 });
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(false);
    const [addDialogOpen, setAddDialogOpen] = useState(false);
    const [fireDialogOpen, setFireDialogOpen] = useState(false);
    const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
    const [error, setError] = useState(null);
    const [success, setSuccess] = useState(null);
    const [firing, setFiring] = useState(false);

    const [newWebhook, setNewWebhook] = useState({
        type: 'slack', name: '', url: '', token: '', channel: '', severity: 'all'
    });
    const [firePayload, setFirePayload] = useState({
        eventType: 'alert', severity: 'info', message: 'Test notification from Milonexa Admin'
    });

    const fetchWebhooks = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.get('/api/admin/webhooks');
            setWebhooks(res.data?.webhooks || []);
            setStats(res.data?.stats || {});
        } catch (err) {
            setError('Failed to load webhooks. Using local display.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchWebhooks(); }, [fetchWebhooks]);

    const handleAddWebhook = async () => {
        try {
            await api.post('/api/admin/webhooks', newWebhook);
            setAddDialogOpen(false);
            setSuccess('Webhook added successfully');
            setNewWebhook({ type: 'slack', name: '', url: '', token: '', channel: '', severity: 'all' });
            fetchWebhooks();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to add webhook');
        }
    };

    const handleRemoveWebhook = async (hook) => {
        if (!window.confirm(`Remove webhook "${hook.name}"?`)) return;
        try {
            await api.delete(`/api/admin/webhooks/${hook.id}?type=${hook.type}`);
            setSuccess('Webhook removed');
            fetchWebhooks();
        } catch (err) {
            setError('Failed to remove webhook');
        }
    };

    const handleFireWebhooks = async () => {
        setFiring(true);
        try {
            const res = await api.post('/api/admin/webhooks/fire', firePayload);
            const results = res.data?.results || [];
            const ok = results.filter(r => r.status === 'ok').length;
            const fail = results.filter(r => r.status === 'error').length;
            setSuccess(`Fired ${results.length} webhooks: ${ok} delivered, ${fail} failed`);
            setFireDialogOpen(false);
            fetchWebhooks();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to fire webhooks');
        } finally {
            setFiring(false);
        }
    };

    const handleViewHistory = async () => {
        try {
            const res = await api.get('/api/admin/webhooks/history?limit=20');
            setHistory(res.data?.history || []);
            setHistoryDialogOpen(true);
        } catch (err) {
            setError('Failed to load history');
        }
    };

    const typeColor = (type) => {
        const m = { slack: '#4A154B', teams: '#6264A7', pagerduty: '#06AC38', github: '#24292e' };
        return m[type] || '#666';
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    🔗 Webhook Integrations
                </Typography>
                <Box display="flex" gap={1}>
                    <Button variant="outlined" size="small" startIcon={<History />} onClick={handleViewHistory}>
                        History
                    </Button>
                    <Button variant="outlined" size="small" startIcon={<PlayArrow />} onClick={() => setFireDialogOpen(true)}>
                        Fire Event
                    </Button>
                    <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setAddDialogOpen(true)}>
                        Add Webhook
                    </Button>
                    <IconButton onClick={fetchWebhooks} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : <Refresh />}
                    </IconButton>
                </Box>
            </Box>

            {error && <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Stats */}
            <Grid container spacing={2} mb={3}>
                <Grid item xs={4}>
                    <Card elevation={2}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold">{stats.total || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Webhooks</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={4}>
                    <Card elevation={2}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold" color="success.main">{stats.enabled || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">Enabled</Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={4}>
                    <Card elevation={2}>
                        <CardContent sx={{ textAlign: 'center', py: 2 }}>
                            <Typography variant="h3" fontWeight="bold" color="primary">{stats.deliveries || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">Total Deliveries</Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Integration Type Cards */}
            <Grid container spacing={2} mb={3}>
                {WEBHOOK_TYPES.map(type => {
                    const count = (stats.byType || {})[type] || 0;
                    return (
                        <Grid item xs={6} sm={3} key={type}>
                            <Card elevation={1} sx={{ borderLeft: `4px solid ${typeColor(type)}` }}>
                                <CardContent sx={{ py: 2 }}>
                                    <Typography variant="body2" fontWeight="bold" sx={{ textTransform: 'capitalize' }}>
                                        {type}
                                    </Typography>
                                    <Typography variant="h4" fontWeight="bold">{count}</Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    );
                })}
            </Grid>

            {/* Webhooks Table */}
            <Card>
                <CardHeader title="Configured Webhooks" />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Name</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Severity Filter</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Created</TableCell>
                                <TableCell>Actions</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {webhooks.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            No webhooks configured. Click "Add Webhook" to get started.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : webhooks.map((hook) => (
                                <TableRow key={hook.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">{hook.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {hook.url ? hook.url.slice(0, 40) + '...' : hook.token ? '(token configured)' : ''}
                                        </Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={hook.type}
                                            size="small"
                                            sx={{ bgcolor: typeColor(hook.type), color: 'white' }}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={hook.severity || 'all'} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell>
                                        {hook.enabled
                                            ? <Chip label="enabled" color="success" size="small" icon={<CheckCircle />} />
                                            : <Chip label="disabled" size="small" />
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Typography variant="caption">{new Date(hook.createdAt).toLocaleDateString()}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <IconButton size="small" color="error" onClick={() => handleRemoveWebhook(hook)}>
                                            <Delete fontSize="small" />
                                        </IconButton>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Add Webhook Dialog */}
            <Dialog open={addDialogOpen} onClose={() => setAddDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Webhook</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select value={newWebhook.type} onChange={e => setNewWebhook({ ...newWebhook, type: e.target.value })} label="Type">
                                {WEBHOOK_TYPES.map(t => <MenuItem key={t} value={t} sx={{ textTransform: 'capitalize' }}>{t}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Name" value={newWebhook.name} onChange={e => setNewWebhook({ ...newWebhook, name: e.target.value })} required />
                        {newWebhook.type !== 'pagerduty' && (
                            <TextField label="Webhook URL" value={newWebhook.url} onChange={e => setNewWebhook({ ...newWebhook, url: e.target.value })} placeholder="https://..." />
                        )}
                        {(newWebhook.type === 'pagerduty' || newWebhook.type === 'github') && (
                            <TextField label={newWebhook.type === 'pagerduty' ? 'Routing Key' : 'Personal Access Token'} value={newWebhook.token} onChange={e => setNewWebhook({ ...newWebhook, token: e.target.value })} type="password" />
                        )}
                        {newWebhook.type === 'slack' && (
                            <TextField label="Channel (optional)" value={newWebhook.channel} onChange={e => setNewWebhook({ ...newWebhook, channel: e.target.value })} placeholder="#alerts" />
                        )}
                        <FormControl fullWidth>
                            <InputLabel>Severity Filter</InputLabel>
                            <Select value={newWebhook.severity} onChange={e => setNewWebhook({ ...newWebhook, severity: e.target.value })} label="Severity Filter">
                                {SEVERITY_OPTIONS.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleAddWebhook} variant="contained" disabled={!newWebhook.name}>Add</Button>
                </DialogActions>
            </Dialog>

            {/* Fire Webhooks Dialog */}
            <Dialog open={fireDialogOpen} onClose={() => setFireDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>🔥 Fire Webhook Event</DialogTitle>
                <DialogContent>
                    <Box display="flex" flexDirection="column" gap={2} mt={1}>
                        <TextField label="Event Type" value={firePayload.eventType} onChange={e => setFirePayload({ ...firePayload, eventType: e.target.value })} />
                        <FormControl fullWidth>
                            <InputLabel>Severity</InputLabel>
                            <Select value={firePayload.severity} onChange={e => setFirePayload({ ...firePayload, severity: e.target.value })} label="Severity">
                                {['info', 'warning', 'critical'].map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField label="Message" value={firePayload.message} onChange={e => setFirePayload({ ...firePayload, message: e.target.value })} multiline rows={3} />
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFireDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleFireWebhooks} variant="contained" color="warning" disabled={firing}>
                        {firing ? <CircularProgress size={20} sx={{ mr: 1 }} /> : null} Fire
                    </Button>
                </DialogActions>
            </Dialog>

            {/* History Dialog */}
            <Dialog open={historyDialogOpen} onClose={() => setHistoryDialogOpen(false)} maxWidth="md" fullWidth>
                <DialogTitle>Webhook Delivery History</DialogTitle>
                <DialogContent>
                    <TableContainer>
                        <Table size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Time</TableCell>
                                    <TableCell>Event</TableCell>
                                    <TableCell>Severity</TableCell>
                                    <TableCell>Results</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {history.length === 0 ? (
                                    <TableRow><TableCell colSpan={4} align="center">No delivery history</TableCell></TableRow>
                                ) : history.map((h, i) => {
                                    const ok = h.results?.filter(r => r.status === 'ok').length || 0;
                                    const fail = h.results?.filter(r => r.status === 'error').length || 0;
                                    return (
                                        <TableRow key={i} hover>
                                            <TableCell>{new Date(h.ts).toLocaleString()}</TableCell>
                                            <TableCell><Chip label={h.eventType} size="small" /></TableCell>
                                            <TableCell><Chip label={h.severity} size="small" color={h.severity === 'critical' ? 'error' : h.severity === 'warning' ? 'warning' : 'default'} /></TableCell>
                                            <TableCell>
                                                <Chip label={`✓${ok}`} size="small" color="success" sx={{ mr: 0.5 }} />
                                                {fail > 0 && <Chip label={`✗${fail}`} size="small" color="error" />}
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHistoryDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default WebhookPanel;
