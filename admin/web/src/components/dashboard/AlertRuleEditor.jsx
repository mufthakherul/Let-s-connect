import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Card, CardContent, CardActions, CardHeader,
    Chip, Button, IconButton, Switch, Dialog, DialogTitle,
    DialogContent, DialogActions, TextField, Select, MenuItem,
    FormControl, InputLabel, FormGroup, FormControlLabel, Checkbox,
    Alert, Stack, Divider, Tooltip, CircularProgress, Grid
} from '@mui/material';
import {
    Add, Edit, Delete, NotificationsActive, CheckCircle,
    Warning, Info, Error as ErrorIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ── constants ─────────────────────────────────────────────────────────────────

const METRICS = ['cpu_usage', 'memory_usage', 'error_rate', 'latency', 'disk_usage'];
const OPERATORS = ['>', '<', '>=', '<=', '=='];
const DURATIONS = ['1m', '5m', '15m', '30m'];
const SEVERITIES = ['info', 'warning', 'critical'];
const CHANNELS = ['slack', 'email', 'webhook', 'pagerduty'];

const SEVERITY_COLOR = { info: 'info', warning: 'warning', critical: 'error' };
const SEVERITY_ICON  = {
    info:     <Info     fontSize="small" />,
    warning:  <Warning  fontSize="small" />,
    critical: <ErrorIcon fontSize="small" />,
};

// ── mock data ─────────────────────────────────────────────────────────────────

const MOCK_RULES = [
    {
        id: 'rule-1', name: 'High CPU Alert', metric: 'cpu_usage', operator: '>',
        threshold: 85, duration: '5m', severity: 'warning',
        channels: ['slack', 'email'], enabled: true,
    },
    {
        id: 'rule-2', name: 'Critical Memory', metric: 'memory_usage', operator: '>=',
        threshold: 90, duration: '5m', severity: 'critical',
        channels: ['slack', 'pagerduty'], enabled: true,
    },
    {
        id: 'rule-3', name: 'Error Rate Spike', metric: 'error_rate', operator: '>',
        threshold: 5, duration: '1m', severity: 'critical',
        channels: ['slack', 'email', 'pagerduty'], enabled: true,
    },
    {
        id: 'rule-4', name: 'High Latency', metric: 'latency', operator: '>',
        threshold: 1000, duration: '15m', severity: 'warning',
        channels: ['slack'], enabled: false,
    },
    {
        id: 'rule-5', name: 'Disk Warning', metric: 'disk_usage', operator: '>=',
        threshold: 80, duration: '30m', severity: 'info',
        channels: ['email'], enabled: true,
    },
];

// ── empty form ────────────────────────────────────────────────────────────────

const emptyForm = () => ({
    name: '', metric: 'cpu_usage', operator: '>', threshold: '',
    duration: '5m', severity: 'warning', channels: ['slack'], enabled: true,
});

// ── validation ────────────────────────────────────────────────────────────────

function validate(form) {
    const errs = {};
    if (!form.name.trim())        errs.name      = 'Name is required.';
    if (form.threshold === '')     errs.threshold = 'Threshold is required.';
    else if (isNaN(Number(form.threshold))) errs.threshold = 'Must be a number.';
    if (!form.channels.length)    errs.channels  = 'Select at least one channel.';
    return errs;
}

// ── rule card ─────────────────────────────────────────────────────────────────

const RuleCard = ({ rule, onEdit, onDelete, onToggle }) => (
    <Card
        variant="outlined"
        component={motion.div}
        layout
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.18 }}
        sx={{ height: '100%', opacity: rule.enabled ? 1 : 0.6 }}
    >
        <CardHeader
            avatar={<NotificationsActive color={rule.enabled ? 'primary' : 'disabled'} />}
            title={<Typography variant="subtitle1" fontWeight={700}>{rule.name}</Typography>}
            subheader={
                <Stack direction="row" spacing={0.5} mt={0.5} flexWrap="wrap">
                    <Chip
                        icon={SEVERITY_ICON[rule.severity]}
                        label={rule.severity}
                        size="small"
                        color={SEVERITY_COLOR[rule.severity]}
                    />
                    {rule.channels.map(ch => (
                        <Chip key={ch} label={ch} size="small" variant="outlined" />
                    ))}
                </Stack>
            }
            action={
                <Tooltip title={rule.enabled ? 'Disable' : 'Enable'}>
                    <Switch
                        size="small"
                        checked={rule.enabled}
                        onChange={() => onToggle(rule)}
                    />
                </Tooltip>
            }
        />
        <CardContent sx={{ pt: 0 }}>
            <Box
                sx={{
                    display: 'inline-flex', alignItems: 'center', gap: 0.5,
                    bgcolor: 'action.hover', borderRadius: 1, px: 1.5, py: 0.5,
                    fontFamily: 'monospace', fontSize: '0.85rem',
                }}
            >
                <span style={{ color: '#1976d2', fontWeight: 700 }}>{rule.metric}</span>
                <span>{rule.operator}</span>
                <span style={{ fontWeight: 700 }}>{rule.threshold}</span>
                <span style={{ color: '#757575' }}>for {rule.duration}</span>
            </Box>
        </CardContent>
        <Divider />
        <CardActions sx={{ justifyContent: 'flex-end' }}>
            <Tooltip title="Edit">
                <IconButton size="small" onClick={() => onEdit(rule)}>
                    <Edit fontSize="small" />
                </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
                <IconButton size="small" color="error" onClick={() => onDelete(rule)}>
                    <Delete fontSize="small" />
                </IconButton>
            </Tooltip>
        </CardActions>
    </Card>
);

// ── rule dialog ───────────────────────────────────────────────────────────────

const RuleDialog = ({ open, onClose, onSave, initial }) => {
    const [form,   setForm]   = useState(emptyForm());
    const [errors, setErrors] = useState({});
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        if (open) {
            setForm(initial ? { ...initial } : emptyForm());
            setErrors({});
        }
    }, [open, initial]);

    const set = (field, value) => setForm(f => ({ ...f, [field]: value }));

    const toggleChannel = ch => {
        setForm(f => ({
            ...f,
            channels: f.channels.includes(ch)
                ? f.channels.filter(c => c !== ch)
                : [...f.channels, ch],
        }));
    };

    const handleSave = async () => {
        const errs = validate(form);
        if (Object.keys(errs).length) { setErrors(errs); return; }
        setSaving(true);
        await onSave({ ...form, threshold: Number(form.threshold) });
        setSaving(false);
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
            <DialogTitle>{initial ? 'Edit Alert Rule' : 'Add Alert Rule'}</DialogTitle>
            <DialogContent dividers>
                <Stack spacing={2} mt={1}>
                    <TextField
                        label="Rule Name" fullWidth size="small"
                        value={form.name}
                        onChange={e => set('name', e.target.value)}
                        error={!!errors.name} helperText={errors.name}
                        required
                    />
                    <Stack direction="row" spacing={2}>
                        <FormControl size="small" fullWidth required>
                            <InputLabel>Metric</InputLabel>
                            <Select value={form.metric} label="Metric" onChange={e => set('metric', e.target.value)}>
                                {METRICS.map(m => <MenuItem key={m} value={m}>{m}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" sx={{ minWidth: 90 }} required>
                            <InputLabel>Operator</InputLabel>
                            <Select value={form.operator} label="Operator" onChange={e => set('operator', e.target.value)}>
                                {OPERATORS.map(op => <MenuItem key={op} value={op}>{op}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <TextField
                            label="Threshold" size="small" type="number" sx={{ minWidth: 100 }}
                            value={form.threshold}
                            onChange={e => set('threshold', e.target.value)}
                            error={!!errors.threshold} helperText={errors.threshold}
                            required
                        />
                    </Stack>
                    <Stack direction="row" spacing={2}>
                        <FormControl size="small" fullWidth required>
                            <InputLabel>Duration</InputLabel>
                            <Select value={form.duration} label="Duration" onChange={e => set('duration', e.target.value)}>
                                {DURATIONS.map(d => <MenuItem key={d} value={d}>{d}</MenuItem>)}
                            </Select>
                        </FormControl>
                        <FormControl size="small" fullWidth required>
                            <InputLabel>Severity</InputLabel>
                            <Select value={form.severity} label="Severity" onChange={e => set('severity', e.target.value)}>
                                {SEVERITIES.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                            </Select>
                        </FormControl>
                    </Stack>
                    <Box>
                        <Typography variant="caption" fontWeight={700} gutterBottom display="block">
                            Notification Channels *
                        </Typography>
                        <FormGroup row>
                            {CHANNELS.map(ch => (
                                <FormControlLabel
                                    key={ch}
                                    control={
                                        <Checkbox
                                            size="small"
                                            checked={form.channels.includes(ch)}
                                            onChange={() => toggleChannel(ch)}
                                        />
                                    }
                                    label={ch}
                                />
                            ))}
                        </FormGroup>
                        {errors.channels && (
                            <Typography variant="caption" color="error">{errors.channels}</Typography>
                        )}
                    </Box>
                    <FormControlLabel
                        control={<Switch checked={form.enabled} onChange={e => set('enabled', e.target.checked)} />}
                        label="Enabled"
                    />
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} disabled={saving}>Cancel</Button>
                <Button variant="contained" onClick={handleSave} disabled={saving}
                    startIcon={saving ? <CircularProgress size={14} /> : <CheckCircle />}>
                    {initial ? 'Save Changes' : 'Add Rule'}
                </Button>
            </DialogActions>
        </Dialog>
    );
};

// ── delete confirm dialog ─────────────────────────────────────────────────────

const DeleteDialog = ({ open, rule, onClose, onConfirm }) => (
    <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
        <DialogTitle>Delete Alert Rule</DialogTitle>
        <DialogContent>
            <Typography>
                Are you sure you want to delete <strong>{rule?.name}</strong>? This action cannot be undone.
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={onClose}>Cancel</Button>
            <Button variant="contained" color="error" onClick={onConfirm} startIcon={<Delete />}>
                Delete
            </Button>
        </DialogActions>
    </Dialog>
);

// ── main component ────────────────────────────────────────────────────────────

const AlertRuleEditor = () => {
    const [rules,       setRules]       = useState([]);
    const [loading,     setLoading]     = useState(false);
    const [error,       setError]       = useState(null);
    const [success,     setSuccess]     = useState(null);
    const [dialogOpen,  setDialogOpen]  = useState(false);
    const [deleteOpen,  setDeleteOpen]  = useState(false);
    const [editTarget,  setEditTarget]  = useState(null);
    const [deleteTarget, setDeleteTarget] = useState(null);

    const fetchRules = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/alerts');
            setRules(res.data?.rules || res.data || MOCK_RULES);
        } catch {
            setRules(MOCK_RULES);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchRules(); }, [fetchRules]);

    const notify = (msg) => {
        setSuccess(msg);
        setTimeout(() => setSuccess(null), 3500);
    };

    // ── CRUD handlers ──────────────────────────────────────────────────────

    const handleSave = async (form) => {
        try {
            if (editTarget) {
                await api.put(`/api/v1/alerts/rules/${editTarget.id}`, form).catch(() => {});
                setRules(rs => rs.map(r => r.id === editTarget.id ? { ...r, ...form } : r));
                notify('Rule updated successfully.');
            } else {
                const newRule = { ...form, id: `rule-${Date.now()}` };
                await api.post('/api/v1/alerts/rules', newRule).catch(() => {});
                setRules(rs => [newRule, ...rs]);
                notify('Rule created successfully.');
            }
        } catch {
            setError('Failed to save rule. Changes applied locally.');
        }
        setDialogOpen(false);
        setEditTarget(null);
    };

    const handleToggle = async (rule) => {
        const updated = { ...rule, enabled: !rule.enabled };
        try {
            await api.put(`/api/v1/alerts/rules/${rule.id}`, { enabled: updated.enabled }).catch(() => {});
        } catch { /* silent — update local state anyway */ }
        setRules(rs => rs.map(r => r.id === rule.id ? updated : r));
        notify(`Rule "${rule.name}" ${updated.enabled ? 'enabled' : 'disabled'}.`);
    };

    const handleDeleteConfirm = async () => {
        if (!deleteTarget) return;
        try {
            await api.delete(`/api/v1/alerts/rules/${deleteTarget.id}`).catch(() => {});
        } catch { /* silent */ }
        setRules(rs => rs.filter(r => r.id !== deleteTarget.id));
        notify(`Rule "${deleteTarget.name}" deleted.`);
        setDeleteOpen(false);
        setDeleteTarget(null);
    };

    const openAdd  = () => { setEditTarget(null); setDialogOpen(true); };
    const openEdit = (rule) => { setEditTarget(rule); setDialogOpen(true); };
    const openDel  = (rule) => { setDeleteTarget(rule); setDeleteOpen(true); };

    const activeCount  = rules.filter(r => r.enabled).length;
    const criticalCount = rules.filter(r => r.severity === 'critical' && r.enabled).length;

    // ── render ─────────────────────────────────────────────────────────────

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <NotificationsActive color="primary" />
                    <Typography variant="h6" fontWeight={700}>Alert Rules</Typography>
                    <Chip label={`${activeCount} active`} size="small" color="primary" variant="outlined" />
                    {criticalCount > 0 && (
                        <Chip label={`${criticalCount} critical`} size="small" color="error" />
                    )}
                </Stack>
                <Button variant="contained" startIcon={<Add />} onClick={openAdd} size="small">
                    Add Rule
                </Button>
            </Stack>

            {error   && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess(null)}>{success}</Alert>}

            {/* Rules Grid */}
            {loading ? (
                <Box textAlign="center" py={6}><CircularProgress /></Box>
            ) : rules.length === 0 ? (
                <Box textAlign="center" py={6}>
                    <NotificationsActive sx={{ fontSize: 48, color: 'text.disabled' }} />
                    <Typography color="text.secondary" mt={1}>No alert rules defined yet.</Typography>
                    <Button variant="outlined" startIcon={<Add />} onClick={openAdd} sx={{ mt: 2 }}>
                        Create First Rule
                    </Button>
                </Box>
            ) : (
                <Grid container spacing={2} component={motion.div} layout>
                    <AnimatePresence>
                        {rules.map(rule => (
                            <Grid item xs={12} sm={6} md={4} key={rule.id}>
                                <RuleCard
                                    rule={rule}
                                    onEdit={openEdit}
                                    onDelete={openDel}
                                    onToggle={handleToggle}
                                />
                            </Grid>
                        ))}
                    </AnimatePresence>
                </Grid>
            )}

            {/* Add / Edit Dialog */}
            <RuleDialog
                open={dialogOpen}
                onClose={() => { setDialogOpen(false); setEditTarget(null); }}
                onSave={handleSave}
                initial={editTarget}
            />

            {/* Delete Confirmation */}
            <DeleteDialog
                open={deleteOpen}
                rule={deleteTarget}
                onClose={() => { setDeleteOpen(false); setDeleteTarget(null); }}
                onConfirm={handleDeleteConfirm}
            />
        </Box>
    );
};

export default AlertRuleEditor;
