import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box, Typography, Table, TableBody, TableCell, TableContainer,
    TableHead, TableRow, Paper, Chip, TextField, Select, MenuItem,
    FormControl, InputLabel, Button, ButtonGroup, Switch, FormControlLabel,
    Skeleton, Pagination, Collapse, IconButton, Tooltip, Alert, Stack, Divider
} from '@mui/material';
import {
    ExpandMore, ExpandLess, Download, Refresh, FilterList,
    Search, CheckCircle, Error as ErrorIcon, Warning, Info
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ── helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_COLORS = {
    info:     { bg: 'rgba(33,150,243,0.06)',  chip: 'info'    },
    warn:     { bg: 'rgba(255,152,0,0.07)',   chip: 'warning' },
    error:    { bg: 'rgba(244,67,54,0.07)',   chip: 'error'   },
    critical: { bg: 'rgba(156,39,176,0.09)',  chip: 'error'   },
};

const SEVERITY_ICON = {
    info:     <Info     fontSize="small" color="info"    />,
    warn:     <Warning  fontSize="small" color="warning" />,
    error:    <ErrorIcon fontSize="small" color="error"  />,
    critical: <ErrorIcon fontSize="small" sx={{ color: '#9c27b0' }} />,
};

const ACTIONS = ['All', 'LOGIN', 'LOGOUT', 'CREATE', 'UPDATE', 'DELETE', 'EXPORT', 'IMPORT', 'CONFIG_CHANGE', 'PERMISSION_CHANGE'];

const MOCK_ACTORS  = ['admin@example.com', 'ops@example.com', 'dev@example.com', 'system'];
const MOCK_TARGETS = ['user:1042', 'user:2301', 'config:smtp', 'role:moderator', 'service:auth', 'webhook:slack'];
const MOCK_ACTIONS_LIST = ACTIONS.slice(1);
const MOCK_SEVERITIES = ['info', 'info', 'info', 'warn', 'error', 'critical'];

function generateMockLogs(n = 50) {
    const now = Date.now();
    return Array.from({ length: n }, (_, i) => {
        const sev   = MOCK_SEVERITIES[Math.floor(Math.random() * MOCK_SEVERITIES.length)];
        const action = MOCK_ACTIONS_LIST[Math.floor(Math.random() * MOCK_ACTIONS_LIST.length)];
        const result = Math.random() > 0.15 ? 'success' : 'failure';
        return {
            id:        `mock-${i}`,
            timestamp: new Date(now - i * 4 * 60 * 1000).toISOString(),
            actor:     MOCK_ACTORS[Math.floor(Math.random() * MOCK_ACTORS.length)],
            action,
            target:    MOCK_TARGETS[Math.floor(Math.random() * MOCK_TARGETS.length)],
            result,
            severity:  sev,
            details: {
                ip:        `192.168.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 255)}`,
                userAgent: 'Mozilla/5.0 (compatible; AdminPanel/1.0)',
                reason:    result === 'failure' ? 'Insufficient permissions' : undefined,
                changes:   action === 'UPDATE' ? { before: 'enabled', after: 'disabled' } : undefined,
            },
        };
    });
}

function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
}

function exportCSV(rows) {
    const header = 'timestamp,actor,action,target,result,severity\n';
    const body   = rows.map(r =>
        [r.timestamp, r.actor, r.action, r.target, r.result, r.severity]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
    ).join('\n');
    downloadBlob(header + body, `audit-log-${Date.now()}.csv`, 'text/csv');
}

function exportJSON(rows) {
    downloadBlob(JSON.stringify(rows, null, 2), `audit-log-${Date.now()}.json`, 'application/json');
}

// ── component ─────────────────────────────────────────────────────────────────

const PER_PAGE_OPTIONS = [25, 50, 100];

const AuditLogTable = () => {
    const [logs,         setLogs]         = useState([]);
    const [loading,      setLoading]      = useState(false);
    const [error,        setError]        = useState(null);
    const [expandedRow,  setExpandedRow]  = useState(null);
    const [autoRefresh,  setAutoRefresh]  = useState(false);
    const [page,         setPage]         = useState(1);
    const [perPage,      setPerPage]      = useState(25);
    const [search,       setSearch]       = useState('');
    const [severity,     setSeverity]     = useState('all');
    const [actionFilter, setActionFilter] = useState('All');
    const [dateFrom,     setDateFrom]     = useState('');
    const [dateTo,       setDateTo]       = useState('');
    const timerRef    = useRef(null);
    const fetchingRef = useRef(false);

    const fetchLogs = useCallback(async () => {
        if (fetchingRef.current) return;
        fetchingRef.current = true;
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/audit?limit=200');
            setLogs(res.data?.logs || res.data || []);
        } catch {
            setLogs(generateMockLogs(50));
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, []);

    useEffect(() => { fetchLogs(); }, [fetchLogs]);

    useEffect(() => {
        if (autoRefresh) {
            timerRef.current = setInterval(fetchLogs, 30_000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [autoRefresh, fetchLogs]);

    // ── filtering ──────────────────────────────────────────────────────────

    const filtered = logs.filter(log => {
        if (severity !== 'all' && log.severity !== severity) return false;
        if (actionFilter !== 'All' && log.action !== actionFilter) return false;
        if (dateFrom && new Date(log.timestamp) < new Date(dateFrom)) return false;
        if (dateTo   && new Date(log.timestamp) > new Date(new Date(dateTo).setHours(23, 59, 59))) return false;
        if (search) {
            const q = search.toLowerCase();
            return (
                log.actor?.toLowerCase().includes(q)   ||
                log.action?.toLowerCase().includes(q)  ||
                log.target?.toLowerCase().includes(q)  ||
                log.result?.toLowerCase().includes(q)
            );
        }
        return true;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / perPage));
    const safePage   = Math.min(page, totalPages);
    const pageRows   = filtered.slice((safePage - 1) * perPage, safePage * perPage);

    const handlePageChange = (_, val) => setPage(val);

    const resetFilters = () => {
        setSearch(''); setSeverity('all');
        setActionFilter('All'); setDateFrom(''); setDateTo('');
        setPage(1);
    };

    // ── render ─────────────────────────────────────────────────────────────

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Typography variant="h6" fontWeight={700}>Audit Log</Typography>
                <Stack direction="row" spacing={1} alignItems="center">
                    <FormControlLabel
                        control={<Switch size="small" checked={autoRefresh} onChange={e => setAutoRefresh(e.target.checked)} />}
                        label={<Typography variant="caption">Auto-refresh</Typography>}
                    />
                    <Tooltip title="Refresh now">
                        <IconButton size="small" onClick={fetchLogs} disabled={loading}>
                            <Refresh fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <ButtonGroup size="small" variant="outlined">
                        <Tooltip title="Export CSV">
                            <Button startIcon={<Download />} onClick={() => exportCSV(filtered)}>CSV</Button>
                        </Tooltip>
                        <Tooltip title="Export JSON">
                            <Button startIcon={<Download />} onClick={() => exportJSON(filtered)}>JSON</Button>
                        </Tooltip>
                    </ButtonGroup>
                </Stack>
            </Stack>

            {/* Filters */}
            <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
                <Stack direction="row" spacing={1} alignItems="center" mb={1}>
                    <FilterList fontSize="small" color="action" />
                    <Typography variant="subtitle2">Filters</Typography>
                    <Box flex={1} />
                    <Button size="small" onClick={resetFilters}>Clear</Button>
                </Stack>
                <Stack direction="row" spacing={2} flexWrap="wrap" gap={1}>
                    <TextField
                        size="small"
                        placeholder="Search actor, action, target…"
                        value={search}
                        onChange={e => { setSearch(e.target.value); setPage(1); }}
                        InputProps={{ startAdornment: <Search fontSize="small" sx={{ mr: 0.5, color: 'text.disabled' }} /> }}
                        sx={{ minWidth: 220 }}
                    />
                    <FormControl size="small" sx={{ minWidth: 130 }}>
                        <InputLabel>Severity</InputLabel>
                        <Select value={severity} label="Severity" onChange={e => { setSeverity(e.target.value); setPage(1); }}>
                            {['all', 'info', 'warn', 'error', 'critical'].map(s => (
                                <MenuItem key={s} value={s}>{s === 'all' ? 'All' : s}</MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <FormControl size="small" sx={{ minWidth: 160 }}>
                        <InputLabel>Action</InputLabel>
                        <Select value={actionFilter} label="Action" onChange={e => { setActionFilter(e.target.value); setPage(1); }}>
                            {ACTIONS.map(a => <MenuItem key={a} value={a}>{a}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <TextField
                        size="small" type="date" label="From"
                        value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1); }}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                    />
                    <TextField
                        size="small" type="date" label="To"
                        value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1); }}
                        InputLabelProps={{ shrink: true }} sx={{ minWidth: 150 }}
                    />
                </Stack>
            </Paper>

            {error && <Alert severity="warning" sx={{ mb: 2 }}>{error} — showing mock data.</Alert>}

            {/* Per-page + total */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={1}>
                <Typography variant="caption" color="text.secondary">
                    {filtered.length} entries
                </Typography>
                <FormControl size="small" sx={{ minWidth: 90 }}>
                    <InputLabel>Per page</InputLabel>
                    <Select value={perPage} label="Per page" onChange={e => { setPerPage(Number(e.target.value)); setPage(1); }}>
                        {PER_PAGE_OPTIONS.map(n => <MenuItem key={n} value={n}>{n}</MenuItem>)}
                    </Select>
                </FormControl>
            </Stack>

            {/* Table */}
            <TableContainer component={Paper} variant="outlined">
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ '& th': { fontWeight: 700, whiteSpace: 'nowrap' } }}>
                            <TableCell width={28} />
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Actor</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Target</TableCell>
                            <TableCell>Result</TableCell>
                            <TableCell>Severity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {loading
                            ? Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}>
                                    {Array.from({ length: 7 }).map((__, j) => (
                                        <TableCell key={j}><Skeleton /></TableCell>
                                    ))}
                                </TableRow>
                            ))
                            : (
                                <AnimatePresence initial={false}>
                                    {pageRows.map(log => {
                                        const sevConf  = SEVERITY_COLORS[log.severity] || SEVERITY_COLORS.info;
                                        const expanded = expandedRow === log.id;
                                        return (
                                            <React.Fragment key={log.id}>
                                                <TableRow
                                                    component={motion.tr}
                                                    initial={{ opacity: 0, y: -4 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    exit={{ opacity: 0 }}
                                                    transition={{ duration: 0.15 }}
                                                    sx={{
                                                        bgcolor: sevConf.bg,
                                                        cursor: 'pointer',
                                                        '&:hover': { filter: 'brightness(0.97)' },
                                                    }}
                                                    onClick={() => setExpandedRow(expanded ? null : log.id)}
                                                >
                                                    <TableCell padding="checkbox">
                                                        <IconButton size="small">
                                                            {expanded ? <ExpandLess fontSize="small" /> : <ExpandMore fontSize="small" />}
                                                        </IconButton>
                                                    </TableCell>
                                                    <TableCell sx={{ whiteSpace: 'nowrap', fontSize: '0.75rem' }}>
                                                        {new Date(log.timestamp).toLocaleString()}
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem' }}>{log.actor}</TableCell>
                                                    <TableCell>
                                                        <Chip label={log.action} size="small" variant="outlined" />
                                                    </TableCell>
                                                    <TableCell sx={{ fontSize: '0.8rem' }}>{log.target}</TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={log.result === 'success' ? <CheckCircle /> : <ErrorIcon />}
                                                            label={log.result}
                                                            size="small"
                                                            color={log.result === 'success' ? 'success' : 'error'}
                                                        />
                                                    </TableCell>
                                                    <TableCell>
                                                        <Chip
                                                            icon={SEVERITY_ICON[log.severity]}
                                                            label={log.severity}
                                                            size="small"
                                                            color={sevConf.chip}
                                                            variant="outlined"
                                                        />
                                                    </TableCell>
                                                </TableRow>

                                                {/* Expandable details row */}
                                                <TableRow>
                                                    <TableCell colSpan={7} sx={{ p: 0, border: 0 }}>
                                                        <Collapse in={expanded} unmountOnExit>
                                                            <Box sx={{ p: 2, bgcolor: 'action.hover' }}>
                                                                <Typography variant="caption" fontWeight={700} display="block" mb={0.5}>
                                                                    Full Details
                                                                </Typography>
                                                                <Box
                                                                    component="pre"
                                                                    sx={{
                                                                        m: 0, fontSize: '0.72rem',
                                                                        whiteSpace: 'pre-wrap', wordBreak: 'break-all',
                                                                        bgcolor: 'background.paper',
                                                                        p: 1.5, borderRadius: 1,
                                                                        border: '1px solid', borderColor: 'divider',
                                                                        maxHeight: 220, overflowY: 'auto',
                                                                    }}
                                                                >
                                                                    {JSON.stringify(log, null, 2)}
                                                                </Box>
                                                            </Box>
                                                        </Collapse>
                                                    </TableCell>
                                                </TableRow>
                                            </React.Fragment>
                                        );
                                    })}
                                </AnimatePresence>
                            )
                        }
                        {!loading && pageRows.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={7} align="center" sx={{ py: 4 }}>
                                    <Typography color="text.secondary">No entries match the current filters.</Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* Pagination */}
            {totalPages > 1 && (
                <Box mt={2} display="flex" justifyContent="center">
                    <Pagination count={totalPages} page={safePage} onChange={handlePageChange} color="primary" />
                </Box>
            )}
        </Box>
    );
};

export default AuditLogTable;
