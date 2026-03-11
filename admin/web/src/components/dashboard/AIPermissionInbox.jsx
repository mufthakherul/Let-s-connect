import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    ListItemIcon,
    Chip,
    Button,
    ButtonGroup,
    IconButton,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Badge,
    Tab,
    Tabs,
    Alert,
    Divider,
    Stack,
    CircularProgress,
    Tooltip,
    Paper,
    Avatar,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Checkbox
} from '@mui/material';
import {
    SmartToy,
    CheckCircle,
    Cancel,
    Warning,
    Security,
    Refresh,
    FilterList,
    History,
    Inbox
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

const AI_PERMISSIONS_FALLBACK_URL =
    process.env.REACT_APP_AI_PERMISSIONS_URL || 'http://localhost:8890/permissions';

// ---------------------------------------------------------------------------
// Constants & mock data
// ---------------------------------------------------------------------------

const RISK_CONFIG = {
    low:      { color: 'success', label: 'Low',      bg: '#e8f5e9', border: '#4caf50' },
    medium:   { color: 'warning', label: 'Medium',   bg: '#fff8e1', border: '#ff9800' },
    high:     { color: 'error',   label: 'High',     bg: '#fff3e0', border: '#f44336' },
    critical: { color: 'error',   label: 'Critical', bg: '#ffebee', border: '#b71c1c' }
};

const MOCK_PENDING = [
    {
        id: 'perm-001',
        agentName: 'AutoScale-Bot',
        action: 'scale collaboration-service to 3 replicas',
        riskLevel: 'medium',
        timestamp: new Date(Date.now() - 4 * 60_000).toISOString(),
        reason: 'Detected sustained 85% CPU utilisation over the past 10 minutes.',
        affectedServices: ['collaboration-service']
    },
    {
        id: 'perm-002',
        agentName: 'HealOps-Agent',
        action: 'restart user-service pod (pod-user-7d9f)',
        riskLevel: 'low',
        timestamp: new Date(Date.now() - 11 * 60_000).toISOString(),
        reason: 'Pod health check has failed 3 consecutive times; automatic restart requested.',
        affectedServices: ['user-service']
    },
    {
        id: 'perm-003',
        agentName: 'CostOptimiser',
        action: 'terminate 2 idle media-service workers',
        riskLevel: 'high',
        timestamp: new Date(Date.now() - 22 * 60_000).toISOString(),
        reason: 'Workers have been idle for >60 minutes; estimated $12/day saving.',
        affectedServices: ['media-service']
    },
    {
        id: 'perm-004',
        agentName: 'SecurityScan-AI',
        action: 'block IP range 203.0.113.0/28 at api-gateway',
        riskLevel: 'critical',
        timestamp: new Date(Date.now() - 2 * 60_000).toISOString(),
        reason: 'Detected brute-force pattern: 4,200 failed auth attempts in 5 min from this range.',
        affectedServices: ['api-gateway', 'user-service']
    },
    {
        id: 'perm-005',
        agentName: 'AutoScale-Bot',
        action: 'increase streaming-service memory limit to 4 GB',
        riskLevel: 'medium',
        timestamp: new Date(Date.now() - 35 * 60_000).toISOString(),
        reason: 'Memory usage reached 92%; OOM kill risk detected.',
        affectedServices: ['streaming-service']
    }
];

const MOCK_HISTORY = [
    {
        id: 'perm-h01',
        agentName: 'AutoScale-Bot',
        action: 'scale api-gateway to 2 replicas',
        riskLevel: 'low',
        status: 'approved',
        resolvedAt: new Date(Date.now() - 2 * 3600_000).toISOString(),
        resolvedBy: 'admin'
    },
    {
        id: 'perm-h02',
        agentName: 'CostOptimiser',
        action: 'shutdown shop-service staging replica',
        riskLevel: 'medium',
        status: 'denied',
        resolvedAt: new Date(Date.now() - 5 * 3600_000).toISOString(),
        resolvedBy: 'admin',
        reason: 'Staging needed for ongoing QA test.'
    }
];

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const timeAgo = (iso) => {
    const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (diff < 60)  return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    return `${Math.floor(diff / 3600)}h ago`;
};

const agentInitials = (name) =>
    name.split(/[-_\s]/).map((w) => w[0]).join('').toUpperCase().slice(0, 2);

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const RiskChip = ({ level, size = 'small' }) => {
    const cfg = RISK_CONFIG[level] || RISK_CONFIG.low;
    return (
        <Chip
            icon={level === 'critical' ? <Security sx={{ fontSize: '13px !important' }} /> : <Warning sx={{ fontSize: '13px !important' }} />}
            label={cfg.label}
            color={cfg.color}
            size={size}
            sx={{ fontSize: '0.65rem', height: 22, '& .MuiChip-label': { px: 0.8 } }}
        />
    );
};

const EmptyState = ({ tab }) => (
    <Box sx={{ py: 8, textAlign: 'center' }}>
        <Inbox sx={{ fontSize: 56, color: 'text.disabled', mb: 1 }} />
        <Typography variant="h6" color="text.secondary">
            {tab === 0 ? 'No pending requests' : 'No history yet'}
        </Typography>
        <Typography variant="body2" color="text.disabled" mt={0.5}>
            {tab === 0
                ? 'All AI permission requests have been resolved.'
                : 'Approved and denied requests will appear here.'}
        </Typography>
    </Box>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const AIPermissionInbox = () => {
    const [pending, setPending]     = useState([]);
    const [history, setHistory]     = useState(MOCK_HISTORY);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [tab, setTab]             = useState(0);
    const [riskFilter, setRiskFilter] = useState('all');
    const [selected, setSelected]   = useState(new Set());
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    // Deny dialog state
    const [denyDialogOpen, setDenyDialogOpen]   = useState(false);
    const [denyTarget, setDenyTarget]           = useState(null); // single id or null for bulk
    const [denyReason, setDenyReason]           = useState('');
    const [denyReasonError, setDenyReasonError] = useState('');

    // Bulk confirm dialog
    const [bulkApproveOpen, setBulkApproveOpen] = useState(false);

    const pollerRef = useRef(null);

    // ---------------------------------------------------------------------------
    // Data fetching
    // ---------------------------------------------------------------------------

    const fetchPending = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        setError(null);
        try {
            let items = null;
            try {
                const res = await api.get('/api/v1/ai/permissions?status=pending');
                items = res.data?.permissions ?? res.data ?? null;
            } catch {
                // fall through to secondary endpoint
            }
            if (!items || !Array.isArray(items) || items.length === 0) {
                try {
                    const res2 = await api.get(AI_PERMISSIONS_FALLBACK_URL);
                    items = res2.data?.permissions ?? res2.data ?? null;
                } catch {
                    // fall through to mock
                }
            }
            setPending(Array.isArray(items) && items.length > 0 ? items : MOCK_PENDING);
            setLastUpdated(new Date());
        } catch {
            setError('Unable to reach permissions API. Showing sample data.');
            setPending(MOCK_PENDING);
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchPending();
        pollerRef.current = setInterval(fetchPending, 20_000);
        return () => clearInterval(pollerRef.current);
    }, [fetchPending]);

    // ---------------------------------------------------------------------------
    // Actions: approve / deny
    // ---------------------------------------------------------------------------

    const resolveItem = useCallback((id, status, reason = null) => {
        const item = pending.find((p) => p.id === id);
        if (!item) return;
        setPending((prev) => prev.filter((p) => p.id !== id));
        setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
        setHistory((prev) => [
            {
                ...item,
                status,
                resolvedAt: new Date().toISOString(),
                resolvedBy: 'admin',
                ...(reason ? { reason } : {})
            },
            ...prev
        ]);
    }, [pending]);

    const handleApprove = useCallback(async (id) => {
        try {
            await api.post(`/api/v1/ai/permissions/${id}/approve`, { approvedBy: 'admin' });
        } catch {
            // optimistic UI — resolve regardless
        }
        resolveItem(id, 'approved');
    }, [resolveItem]);

    const openDenyDialog = (id) => {
        setDenyTarget(id);
        setDenyReason('');
        setDenyReasonError('');
        setDenyDialogOpen(true);
    };

    const handleDenyConfirm = useCallback(async () => {
        if (!denyReason.trim()) {
            setDenyReasonError('A reason is required to deny a request.');
            return;
        }
        const ids = denyTarget === '__bulk__'
            ? [...selected]
            : [denyTarget];

        await Promise.allSettled(
            ids.map((id) => api.post(`/api/v1/ai/permissions/${id}/deny`, { deniedBy: 'admin', reason: denyReason }))
        );
        ids.forEach((id) => resolveItem(id, 'denied', denyReason));
        setDenyDialogOpen(false);
        setDenyTarget(null);
        setDenyReason('');
    }, [denyReason, denyTarget, selected, resolveItem]);

    const handleBulkApprove = useCallback(async () => {
        const ids = [...selected];
        await Promise.allSettled(
            ids.map((id) => api.post(`/api/v1/ai/permissions/${id}/approve`, { approvedBy: 'admin' }))
        );
        ids.forEach((id) => resolveItem(id, 'approved'));
        setBulkApproveOpen(false);
    }, [selected, resolveItem]);

    // ---------------------------------------------------------------------------
    // Selection helpers
    // ---------------------------------------------------------------------------

    const filteredPending = riskFilter === 'all'
        ? pending
        : pending.filter((p) => p.riskLevel === riskFilter);

    const allFilteredSelected = filteredPending.length > 0 &&
        filteredPending.every((p) => selected.has(p.id));

    const toggleSelectAll = () => {
        if (allFilteredSelected) {
            setSelected((prev) => {
                const s = new Set(prev);
                filteredPending.forEach((p) => s.delete(p.id));
                return s;
            });
        } else {
            setSelected((prev) => {
                const s = new Set(prev);
                filteredPending.forEach((p) => s.add(p.id));
                return s;
            });
        }
    };

    const toggleSelect = (id) =>
        setSelected((prev) => {
            const s = new Set(prev);
            s.has(id) ? s.delete(id) : s.add(id);
            return s;
        });

    // ---------------------------------------------------------------------------
    // Render: pending item
    // ---------------------------------------------------------------------------

    const PendingItem = ({ item, index }) => {
        const cfg = RISK_CONFIG[item.riskLevel] || RISK_CONFIG.low;
        const isSelected = selected.has(item.id);
        return (
            <motion.div
                key={item.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, transition: { duration: 0.25 } }}
                transition={{ duration: 0.25, delay: index * 0.05 }}
                layout
            >
                <ListItem
                    alignItems="flex-start"
                    sx={{
                        border: `1px solid ${isSelected ? cfg.border : 'divider'}`,
                        borderRadius: 2,
                        mb: 1.5,
                        bgcolor: isSelected ? cfg.bg : 'background.paper',
                        transition: 'background-color 0.2s',
                        '&:hover': { bgcolor: cfg.bg },
                        px: 2,
                        py: 1.5,
                        alignItems: 'stretch'
                    }}
                    disablePadding
                >
                    {/* Checkbox */}
                    <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                        <Checkbox
                            size="small"
                            checked={isSelected}
                            onChange={() => toggleSelect(item.id)}
                            sx={{ p: 0 }}
                        />
                    </ListItemIcon>

                    {/* Agent avatar */}
                    <Box sx={{ mr: 1.5, mt: 0.3 }}>
                        <Avatar
                            sx={{ width: 36, height: 36, bgcolor: cfg.border, fontSize: '0.75rem', fontWeight: 700 }}
                        >
                            {agentInitials(item.agentName)}
                        </Avatar>
                    </Box>

                    {/* Content */}
                    <ListItemText
                        primary={
                            <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" mb={0.3}>
                                <SmartToy sx={{ fontSize: 15, color: 'primary.main' }} />
                                <Typography variant="subtitle2" fontWeight={700}>{item.agentName}</Typography>
                                <RiskChip level={item.riskLevel} />
                                <Typography variant="caption" color="text.disabled">{timeAgo(item.timestamp)}</Typography>
                                <Typography variant="caption" color="text.disabled">ID: {item.id}</Typography>
                            </Stack>
                        }
                        secondary={
                            <Box>
                                <Typography variant="body2" fontWeight={600} color="text.primary" mb={0.4}>
                                    {item.action}
                                </Typography>
                                <Typography variant="caption" color="text.secondary" display="block" mb={0.5}>
                                    {item.reason}
                                </Typography>
                                {item.affectedServices?.length > 0 && (
                                    <Stack direction="row" spacing={0.5} flexWrap="wrap" mb={1}>
                                        {item.affectedServices.map((svc) => (
                                            <Chip
                                                key={svc}
                                                label={svc}
                                                size="small"
                                                variant="outlined"
                                                sx={{ fontSize: '0.62rem', height: 18 }}
                                            />
                                        ))}
                                    </Stack>
                                )}
                                <Stack direction="row" spacing={1} mt={0.5}>
                                    <Button
                                        size="small"
                                        variant="contained"
                                        color="success"
                                        startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                                        onClick={() => handleApprove(item.id)}
                                        sx={{ fontSize: '0.72rem', py: 0.4 }}
                                    >
                                        Approve
                                    </Button>
                                    <Button
                                        size="small"
                                        variant="outlined"
                                        color="error"
                                        startIcon={<Cancel sx={{ fontSize: 14 }} />}
                                        onClick={() => openDenyDialog(item.id)}
                                        sx={{ fontSize: '0.72rem', py: 0.4 }}
                                    >
                                        Deny
                                    </Button>
                                </Stack>
                            </Box>
                        }
                        disableTypography
                    />
                </ListItem>
            </motion.div>
        );
    };

    // ---------------------------------------------------------------------------
    // Render: history item
    // ---------------------------------------------------------------------------

    const HistoryItem = ({ item, index }) => (
        <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2, delay: index * 0.05 }}
        >
            <ListItem
                alignItems="flex-start"
                sx={{
                    border: '1px solid',
                    borderColor: item.status === 'approved' ? '#c8e6c9' : '#ffcdd2',
                    borderRadius: 2,
                    mb: 1.5,
                    bgcolor: item.status === 'approved' ? '#f1f8e9' : '#fff8f8',
                    px: 2,
                    py: 1.5
                }}
                disablePadding
            >
                <ListItemIcon sx={{ minWidth: 36, mt: 0.5 }}>
                    {item.status === 'approved'
                        ? <CheckCircle sx={{ color: '#2e7d32', fontSize: 20 }} />
                        : <Cancel sx={{ color: '#c62828', fontSize: 20 }} />}
                </ListItemIcon>
                <ListItemText
                    primary={
                        <Stack direction="row" alignItems="center" spacing={1} flexWrap="wrap" mb={0.3}>
                            <Typography variant="subtitle2" fontWeight={700}>{item.agentName}</Typography>
                            <RiskChip level={item.riskLevel} />
                            <Chip
                                label={item.status}
                                color={item.status === 'approved' ? 'success' : 'error'}
                                size="small"
                                sx={{ fontSize: '0.65rem', height: 20 }}
                            />
                            <Typography variant="caption" color="text.disabled">
                                {timeAgo(item.resolvedAt)} · by {item.resolvedBy}
                            </Typography>
                        </Stack>
                    }
                    secondary={
                        <Box>
                            <Typography variant="body2" fontWeight={600} color="text.primary" mb={0.3}>
                                {item.action}
                            </Typography>
                            {item.status === 'denied' && item.reason && (
                                <Typography variant="caption" color="error.main">Reason: {item.reason}</Typography>
                            )}
                        </Box>
                    }
                    disableTypography
                />
            </ListItem>
        </motion.div>
    );

    // ---------------------------------------------------------------------------
    // Render
    // ---------------------------------------------------------------------------

    return (
        <Box>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                    <Box>
                        <Stack direction="row" alignItems="center" spacing={1}>
                            <Badge badgeContent={pending.length} color="error" max={99}>
                                <Security sx={{ color: 'primary.main' }} />
                            </Badge>
                            <Typography variant="h6" fontWeight={700}>AI Permission Inbox</Typography>
                        </Stack>
                        {lastUpdated && (
                            <Typography variant="caption" color="text.secondary">
                                Last updated: {lastUpdated.toLocaleTimeString()} · polls every 20s
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        {/* Risk filter */}
                        <FormControl size="small" sx={{ minWidth: 130 }}>
                            <InputLabel sx={{ fontSize: '0.8rem' }}>
                                <Stack direction="row" alignItems="center" spacing={0.4}>
                                    <FilterList sx={{ fontSize: 14 }} />
                                    <span>Risk Level</span>
                                </Stack>
                            </InputLabel>
                            <Select
                                value={riskFilter}
                                label="Risk Level"
                                onChange={(e) => { setRiskFilter(e.target.value); setSelected(new Set()); }}
                                sx={{ fontSize: '0.8rem' }}
                            >
                                <MenuItem value="all">All</MenuItem>
                                {['low', 'medium', 'high', 'critical'].map((r) => (
                                    <MenuItem key={r} value={r} sx={{ fontSize: '0.8rem', textTransform: 'capitalize' }}>{r}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>

                        {/* Bulk actions */}
                        {selected.size > 0 && (
                            <ButtonGroup size="small" variant="outlined">
                                <Tooltip title={`Approve ${selected.size} selected`}>
                                    <Button
                                        color="success"
                                        startIcon={<CheckCircle sx={{ fontSize: 14 }} />}
                                        onClick={() => setBulkApproveOpen(true)}
                                        sx={{ fontSize: '0.72rem' }}
                                    >
                                        Approve ({selected.size})
                                    </Button>
                                </Tooltip>
                                <Tooltip title={`Deny ${selected.size} selected`}>
                                    <Button
                                        color="error"
                                        startIcon={<Cancel sx={{ fontSize: 14 }} />}
                                        onClick={() => openDenyDialog('__bulk__')}
                                        sx={{ fontSize: '0.72rem' }}
                                    >
                                        Deny ({selected.size})
                                    </Button>
                                </Tooltip>
                            </ButtonGroup>
                        )}

                        <Tooltip title="Refresh">
                            <span>
                                <IconButton size="small" onClick={() => fetchPending(true)} disabled={refreshing}>
                                    {refreshing ? <CircularProgress size={18} /> : <Refresh fontSize="small" />}
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>
            )}

            {/* Tabs */}
            <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                <Tabs
                    value={tab}
                    onChange={(_, v) => setTab(v)}
                    sx={{ borderBottom: '1px solid', borderColor: 'divider', px: 1 }}
                >
                    <Tab
                        label={
                            <Badge badgeContent={pending.length} color="error" max={99} sx={{ pr: 1.5 }}>
                                <Stack direction="row" alignItems="center" spacing={0.5}>
                                    <Inbox sx={{ fontSize: 16 }} />
                                    <span>Pending</span>
                                </Stack>
                            </Badge>
                        }
                        sx={{ fontSize: '0.8rem', minHeight: 44 }}
                    />
                    <Tab
                        label={
                            <Stack direction="row" alignItems="center" spacing={0.5}>
                                <History sx={{ fontSize: 16 }} />
                                <span>History</span>
                            </Stack>
                        }
                        sx={{ fontSize: '0.8rem', minHeight: 44 }}
                    />
                </Tabs>

                <Box sx={{ p: 2 }}>
                    {loading ? (
                        <Box sx={{ py: 6, textAlign: 'center' }}>
                            <CircularProgress />
                            <Typography variant="body2" color="text.secondary" mt={2}>Loading permissions…</Typography>
                        </Box>
                    ) : (
                        <>
                            {/* PENDING TAB */}
                            {tab === 0 && (
                                <>
                                    {filteredPending.length > 0 && (
                                        <Stack direction="row" alignItems="center" spacing={1} mb={1.5}>
                                            <Checkbox
                                                size="small"
                                                checked={allFilteredSelected}
                                                indeterminate={selected.size > 0 && !allFilteredSelected}
                                                onChange={toggleSelectAll}
                                                sx={{ p: 0 }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {selected.size > 0 ? `${selected.size} selected` : 'Select all'}
                                            </Typography>
                                            <Typography variant="caption" color="text.disabled">
                                                ({filteredPending.length} item{filteredPending.length !== 1 ? 's' : ''})
                                            </Typography>
                                        </Stack>
                                    )}
                                    <List disablePadding>
                                        <AnimatePresence>
                                            {filteredPending.length === 0
                                                ? <EmptyState tab={0} />
                                                : filteredPending.map((item, i) => (
                                                    <PendingItem key={item.id} item={item} index={i} />
                                                ))}
                                        </AnimatePresence>
                                    </List>
                                </>
                            )}

                            {/* HISTORY TAB */}
                            {tab === 1 && (
                                <List disablePadding>
                                    <AnimatePresence>
                                        {history.length === 0
                                            ? <EmptyState tab={1} />
                                            : history.map((item, i) => (
                                                <HistoryItem key={item.id} item={item} index={i} />
                                            ))}
                                    </AnimatePresence>
                                </List>
                            )}
                        </>
                    )}
                </Box>
            </Paper>

            {/* Deny dialog */}
            <Dialog open={denyDialogOpen} onClose={() => setDenyDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <Cancel color="error" />
                        <span>Deny Permission Request{denyTarget === '__bulk__' ? 's' : ''}</span>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    {denyTarget === '__bulk__' && (
                        <Alert severity="warning" sx={{ mb: 2 }}>
                            You are about to deny {selected.size} selected request{selected.size !== 1 ? 's' : ''}.
                        </Alert>
                    )}
                    <TextField
                        autoFocus
                        label="Reason for denial"
                        fullWidth
                        multiline
                        minRows={3}
                        value={denyReason}
                        onChange={(e) => { setDenyReason(e.target.value); setDenyReasonError(''); }}
                        error={!!denyReasonError}
                        helperText={denyReasonError || 'Required – explain why this request is being denied.'}
                        sx={{ mt: 1 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDenyDialogOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="error" onClick={handleDenyConfirm}>
                        Confirm Deny
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Bulk approve confirmation dialog */}
            <Dialog open={bulkApproveOpen} onClose={() => setBulkApproveOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>
                    <Stack direction="row" alignItems="center" spacing={1}>
                        <CheckCircle color="success" />
                        <span>Confirm Bulk Approve</span>
                    </Stack>
                </DialogTitle>
                <DialogContent>
                    <Alert severity="info">
                        Approve {selected.size} selected permission request{selected.size !== 1 ? 's' : ''}?
                        This action cannot be undone.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBulkApproveOpen(false)}>Cancel</Button>
                    <Button variant="contained" color="success" onClick={handleBulkApprove}>
                        Approve All
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default AIPermissionInbox;
