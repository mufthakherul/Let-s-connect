import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardHeader,
    Chip, Alert, Button, IconButton, CircularProgress,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, LinearProgress, Divider, Badge, Tooltip,
    List, ListItem, ListItemText, ListItemIcon, Switch,
    FormControlLabel, Dialog, DialogTitle, DialogContent,
    DialogActions, TextField
} from '@mui/material';
import {
    SmartToy, Refresh, Security, Healing, Speed, CheckCircle,
    Warning, Error as ErrorIcon, Info, AutoFixHigh, Shield,
    BugReport, Psychology, Notifications, Timer, PlayArrow,
    Stop, Block, CheckBox, DoNotDisturb, FlashOn
} from '@mui/icons-material';

const stateColors = {
    IDLE: 'default',
    MONITORING: 'info',
    ANALYZING: 'warning',
    ACTING: 'error',
    NOTIFYING: 'success',
};

const stateIcons = {
    IDLE: <Timer fontSize="small" />,
    MONITORING: <SmartToy fontSize="small" />,
    ANALYZING: <Psychology fontSize="small" />,
    ACTING: <AutoFixHigh fontSize="small" />,
    NOTIFYING: <Notifications fontSize="small" />,
};

const threatSeverityColor = { critical: 'error', high: 'error', medium: 'warning', low: 'info', info: 'default' };
const actionColor = { approved: 'success', pending: 'warning', denied: 'error' };

/**
 * AI Autonomous Admin Agent Panel
 *
 * Shows live AI agent status, actions, threats detected, and permissions queue.
 * Connects to the AI agent's HTTP status API at AI_STATUS_PORT (default 8890).
 */
const AIAgentPanel = () => {
    const [status, setStatus] = useState(null);
    const [permissions, setPermissions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [agentAvailable, setAgentAvailable] = useState(false);
    const [approveDialog, setApproveDialog] = useState({ open: false, id: null, action: null });
    const [denyDialog, setDenyDialog] = useState({ open: false, id: null });
    const [decisionBy, setDecisionBy] = useState('');

    const AI_STATUS_BASE = process.env.REACT_APP_AI_STATUS_URL || 'http://localhost:8890';

    const fetchStatus = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${AI_STATUS_BASE}/status`);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json();
            setStatus(data);
            setAgentAvailable(true);
        } catch (err) {
            setError('AI Agent offline or not enabled. Start with ENABLE_ADMIN_AI=true.');
            setAgentAvailable(false);
        } finally {
            setLoading(false);
        }
    }, [AI_STATUS_BASE]);

    const fetchPermissions = useCallback(async () => {
        try {
            const res = await fetch(`${AI_STATUS_BASE}/permissions`);
            if (!res.ok) return;
            const data = await res.json();
            setPermissions(data.pending || []);
        } catch (_) {
            setPermissions([]);
        }
    }, [AI_STATUS_BASE]);

    useEffect(() => {
        fetchStatus();
        fetchPermissions();
        const interval = setInterval(() => {
            fetchStatus();
            fetchPermissions();
        }, 15000);
        return () => clearInterval(interval);
    }, [fetchStatus, fetchPermissions]);

    const handleApprove = async () => {
        const { id } = approveDialog;
        try {
            await fetch(`${AI_STATUS_BASE}/permissions/${id}/approve`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ by: decisionBy || 'admin-web' }),
            });
            setApproveDialog({ open: false, id: null, action: null });
            setDecisionBy('');
            fetchPermissions();
        } catch (err) {
            console.error('Approve failed:', err);
        }
    };

    const handleDeny = async () => {
        const { id } = denyDialog;
        try {
            await fetch(`${AI_STATUS_BASE}/permissions/${id}/deny`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ by: decisionBy || 'admin-web' }),
            });
            setDenyDialog({ open: false, id: null });
            setDecisionBy('');
            fetchPermissions();
        } catch (err) {
            console.error('Deny failed:', err);
        }
    };

    const formatUptime = (seconds) => {
        if (!seconds) return '—';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = Math.floor(seconds % 60);
        return `${h}h ${m}m ${s}s`;
    };

    return (
        <Box>
            {/* Header */}
            <Box display="flex" alignItems="center" justifyContent="space-between" mb={2}>
                <Box display="flex" alignItems="center" gap={1}>
                    <SmartToy color="primary" />
                    <Typography variant="h6" fontWeight="bold">AI Autonomous Admin Agent</Typography>
                    <Chip
                        size="small"
                        label={agentAvailable ? 'ONLINE' : 'OFFLINE'}
                        color={agentAvailable ? 'success' : 'default'}
                    />
                    {status?.emergencyMode && (
                        <Chip size="small" icon={<FlashOn />} label="EMERGENCY MODE" color="error" />
                    )}
                </Box>
                <IconButton onClick={() => { fetchStatus(); fetchPermissions(); }} disabled={loading}>
                    <Refresh />
                </IconButton>
            </Box>

            {error && (
                <Alert severity="info" sx={{ mb: 2 }}>
                    {error}
                    <Box mt={1}>
                        <Typography variant="caption">
                            Enable the AI agent: set <code>ENABLE_ADMIN_AI=true</code> and start with{' '}
                            <code>docker compose --profile admin-ai up admin-ai</code>
                        </Typography>
                    </Box>
                </Alert>
            )}

            {/* Status Cards */}
            <Grid container spacing={2} mb={2}>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">Current State</Typography>
                            <Box display="flex" alignItems="center" gap={1} mt={0.5}>
                                {stateIcons[status?.currentState || 'IDLE']}
                                <Chip
                                    size="small"
                                    label={status?.currentState || '—'}
                                    color={stateColors[status?.currentState] || 'default'}
                                />
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">AI Provider</Typography>
                            <Typography variant="body1" fontWeight="bold" mt={0.5}>
                                {status?.provider || '—'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">Analysis Cycles</Typography>
                            <Typography variant="h5" fontWeight="bold" color="primary" mt={0.5}>
                                {status?.cycles ?? '—'}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} sm={6} md={3}>
                    <Card variant="outlined">
                        <CardContent>
                            <Typography variant="caption" color="text.secondary">Uptime</Typography>
                            <Typography variant="body1" fontWeight="bold" mt={0.5}>
                                {formatUptime(status?.uptime)}
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            {/* Capabilities */}
            {status && (
                <Grid container spacing={2} mb={2}>
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardHeader
                                title={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Healing fontSize="small" color="success" />
                                        <Typography variant="subtitle2">Auto-Heal</Typography>
                                    </Box>
                                }
                                action={
                                    <Chip
                                        size="small"
                                        label={status.autoHeal ? 'ENABLED' : 'DISABLED'}
                                        color={status.autoHeal ? 'success' : 'default'}
                                    />
                                }
                            />
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    Automatically restarts crashed services, rolls back bad deployments,
                                    and resolves performance issues without human intervention.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card variant="outlined">
                            <CardHeader
                                title={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <Shield fontSize="small" color="error" />
                                        <Typography variant="subtitle2">Auto-Security</Typography>
                                    </Box>
                                }
                                action={
                                    <Chip
                                        size="small"
                                        label={status.autoSecurity ? 'ENABLED' : 'DISABLED'}
                                        color={status.autoSecurity ? 'success' : 'default'}
                                    />
                                }
                            />
                            <CardContent>
                                <Typography variant="body2" color="text.secondary">
                                    Detects and responds to security threats: DDoS, brute force, intrusion,
                                    data exfiltration, and compromised services.
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {/* Pending Permissions */}
            {permissions.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2, borderColor: 'warning.main' }}>
                    <CardHeader
                        title={
                            <Box display="flex" alignItems="center" gap={1}>
                                <Badge badgeContent={permissions.length} color="warning">
                                    <Notifications color="warning" />
                                </Badge>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    Pending AI Permissions
                                </Typography>
                            </Box>
                        }
                        subheader="The AI agent is requesting your approval before taking action"
                    />
                    <CardContent>
                        <List disablePadding>
                            {permissions.map((perm, idx) => (
                                <React.Fragment key={perm.id}>
                                    {idx > 0 && <Divider />}
                                    <ListItem
                                        alignItems="flex-start"
                                        secondaryAction={
                                            <Box display="flex" gap={1}>
                                                <Tooltip title="Approve this action">
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        color="success"
                                                        startIcon={<CheckBox />}
                                                        onClick={() => setApproveDialog({ open: true, id: perm.id, action: perm.action })}
                                                    >
                                                        Approve
                                                    </Button>
                                                </Tooltip>
                                                <Tooltip title="Deny this action">
                                                    <Button
                                                        size="small"
                                                        variant="outlined"
                                                        color="error"
                                                        startIcon={<DoNotDisturb />}
                                                        onClick={() => setDenyDialog({ open: true, id: perm.id })}
                                                    >
                                                        Deny
                                                    </Button>
                                                </Tooltip>
                                            </Box>
                                        }
                                    >
                                        <ListItemIcon>
                                            {perm.severity === 'critical' || perm.severity === 'emergency'
                                                ? <ErrorIcon color="error" />
                                                : perm.severity === 'high'
                                                    ? <Warning color="warning" />
                                                    : <Info color="info" />}
                                        </ListItemIcon>
                                        <ListItemText
                                            primary={
                                                <Box display="flex" alignItems="center" gap={1}>
                                                    <Typography variant="body2" fontWeight="bold">
                                                        {perm.action}
                                                    </Typography>
                                                    <Chip size="small" label={perm.severity} color={threatSeverityColor[perm.severity] || 'default'} />
                                                </Box>
                                            }
                                            secondary={
                                                <>
                                                    <Typography variant="caption" display="block">
                                                        {perm.description}
                                                    </Typography>
                                                    <Typography variant="caption" color="text.disabled">
                                                        Requested: {new Date(perm.requestedAt).toLocaleString()}
                                                    </Typography>
                                                </>
                                            }
                                        />
                                    </ListItem>
                                </React.Fragment>
                            ))}
                        </List>
                    </CardContent>
                </Card>
            )}

            {/* Recent Activity */}
            {status?.lastCycleReport && (
                <Card variant="outlined" sx={{ mb: 2 }}>
                    <CardHeader
                        title={
                            <Box display="flex" alignItems="center" gap={1}>
                                <Psychology fontSize="small" color="primary" />
                                <Typography variant="subtitle2">Last Analysis Cycle</Typography>
                            </Box>
                        }
                        subheader={status.lastCycle ? `Completed: ${new Date(status.lastCycle).toLocaleString()}` : ''}
                    />
                    <CardContent>
                        <Grid container spacing={2}>
                            {status.lastCycleReport.threats?.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                        Security Threats Detected
                                    </Typography>
                                    {status.lastCycleReport.threats.map((t, i) => (
                                        <Chip
                                            key={i}
                                            size="small"
                                            label={t.type || t}
                                            color={threatSeverityColor[t.severity] || 'warning'}
                                            icon={<Security />}
                                            sx={{ m: 0.25 }}
                                        />
                                    ))}
                                </Grid>
                            )}
                            {status.lastCycleReport.healingActions?.length > 0 && (
                                <Grid item xs={12} md={6}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                        Healing Actions Taken
                                    </Typography>
                                    {status.lastCycleReport.healingActions.map((a, i) => (
                                        <Chip
                                            key={i}
                                            size="small"
                                            label={a.action || a}
                                            color="success"
                                            icon={<Healing />}
                                            sx={{ m: 0.25 }}
                                        />
                                    ))}
                                </Grid>
                            )}
                            {status.lastCycleReport.optimizations?.length > 0 && (
                                <Grid item xs={12}>
                                    <Typography variant="caption" color="text.secondary" gutterBottom display="block">
                                        Optimizations Applied
                                    </Typography>
                                    {status.lastCycleReport.optimizations.map((o, i) => (
                                        <Chip
                                            key={i}
                                            size="small"
                                            label={o.type || o}
                                            color="info"
                                            icon={<Speed />}
                                            sx={{ m: 0.25 }}
                                        />
                                    ))}
                                </Grid>
                            )}
                            {(!status.lastCycleReport.threats?.length &&
                              !status.lastCycleReport.healingActions?.length &&
                              !status.lastCycleReport.optimizations?.length) && (
                                <Grid item xs={12}>
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <CheckCircle color="success" />
                                        <Typography variant="body2" color="text.secondary">
                                            All systems healthy — no actions needed this cycle.
                                        </Typography>
                                    </Box>
                                </Grid>
                            )}
                        </Grid>
                    </CardContent>
                </Card>
            )}

            {/* Setup hint when offline */}
            {!agentAvailable && (
                <Card variant="outlined">
                    <CardHeader
                        title={
                            <Box display="flex" alignItems="center" gap={1}>
                                <SmartToy color="disabled" />
                                <Typography variant="subtitle2">Enable the AI Admin Agent</Typography>
                            </Box>
                        }
                    />
                    <CardContent>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            The AI Autonomous Admin Agent continuously monitors your platform, automatically heals
                            issues, responds to security threats, and optimizes performance.
                        </Typography>
                        <Typography variant="caption" component="pre" sx={{
                            bgcolor: 'action.hover',
                            p: 1.5,
                            borderRadius: 1,
                            display: 'block',
                            overflow: 'auto',
                            fontFamily: 'monospace',
                        }}>
{`# In .env:
ENABLE_ADMIN_AI=true
AI_PROVIDER=demo       # or: openai, anthropic
AI_AUTO_HEAL=true
AI_AUTO_SECURITY=true

# Start with Docker Compose:
docker compose --profile admin-ai up admin-ai`}
                        </Typography>
                    </CardContent>
                </Card>
            )}

            {/* Approve Dialog */}
            <Dialog open={approveDialog.open} onClose={() => setApproveDialog({ open: false, id: null, action: null })}>
                <DialogTitle>Approve AI Action</DialogTitle>
                <DialogContent>
                    <Typography paragraph>
                        Approve the AI agent to execute: <strong>{approveDialog.action}</strong>
                    </Typography>
                    <TextField
                        label="Approved by (your name)"
                        value={decisionBy}
                        onChange={(e) => setDecisionBy(e.target.value)}
                        fullWidth
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setApproveDialog({ open: false, id: null, action: null })}>Cancel</Button>
                    <Button onClick={handleApprove} color="success" variant="contained">Approve</Button>
                </DialogActions>
            </Dialog>

            {/* Deny Dialog */}
            <Dialog open={denyDialog.open} onClose={() => setDenyDialog({ open: false, id: null })}>
                <DialogTitle>Deny AI Action</DialogTitle>
                <DialogContent>
                    <Typography paragraph>
                        Deny the pending AI action. The agent will not execute this action.
                    </Typography>
                    <TextField
                        label="Denied by (your name)"
                        value={decisionBy}
                        onChange={(e) => setDecisionBy(e.target.value)}
                        fullWidth
                        size="small"
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDenyDialog({ open: false, id: null })}>Cancel</Button>
                    <Button onClick={handleDeny} color="error" variant="contained">Deny</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AIAgentPanel;
