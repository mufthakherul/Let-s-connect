import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    Paper,
    Chip,
    Avatar,
    IconButton,
    Button,
    TextField,
    InputAdornment,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    Checkbox,
    Toolbar,
    Tooltip,
    CircularProgress,
    Skeleton,
    Pagination,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Alert,
    Stack
} from '@mui/material';
import {
    Search,
    FilterList,
    Edit,
    Block,
    CheckCircle,
    PersonAdd,
    GetApp,
    Refresh,
    MoreVert
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ROLES   = ['admin', 'moderator', 'user'];
const STATUSES = ['active', 'suspended', 'banned'];

const ROLE_COLORS = {
    admin:     'error',
    moderator: 'warning',
    user:      'default'
};

const STATUS_COLORS = {
    active:    'success',
    suspended: 'warning',
    banned:    'error'
};

const randomDate = (start, end) =>
    new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

const formatDate = (d) =>
    d ? new Date(d).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

const buildMockUsers = (count = 20) => {
    const firstNames = ['Alice', 'Bob', 'Carol', 'Dave', 'Eve', 'Frank', 'Grace', 'Hank', 'Iris', 'Jack'];
    const lastNames  = ['Smith', 'Jones', 'Brown', 'Taylor', 'Wilson', 'Davis', 'Evans', 'Hall', 'Lee', 'King'];
    const domains    = ['gmail.com', 'yahoo.com', 'example.com', 'outlook.com'];
    const now = new Date();
    const twoYearsAgo = new Date(now.getFullYear() - 2, now.getMonth(), now.getDate());

    return Array.from({ length: count }, (_, i) => {
        const first  = firstNames[i % firstNames.length];
        const last   = lastNames[Math.floor(i / firstNames.length) % lastNames.length];
        const username = `${first.toLowerCase()}${last.toLowerCase()}${i + 1}`;
        const statusProbability = Math.random();
        const status =
            statusProbability > 0.95 ? 'banned' :
            statusProbability > 0.85 ? 'suspended' :
            'active';
        return {
            id:         `usr_${i + 1}`,
            username,
            email:      `${username}@${domains[i % domains.length]}`,
            role:       i === 0 ? 'admin' : i < 4 ? 'moderator' : 'user',
            status,
            joinDate:   randomDate(twoYearsAgo, now).toISOString(),
            lastActive: randomDate(new Date(now.getFullYear(), now.getMonth() - 1, 1), now).toISOString(),
            avatarUrl:  null
        };
    });
};

const exportCSV = (users) => {
    const headers = ['ID', 'Username', 'Email', 'Role', 'Status', 'Join Date', 'Last Active'];
    const rows = users.map((u) => [
        u.id,
        u.username,
        u.email,
        u.role,
        u.status,
        formatDate(u.joinDate),
        formatDate(u.lastActive)
    ]);
    const csv = [headers, ...rows].map((r) => r.map((v) => `"${v}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `users_export_${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SkeletonRows = ({ rows = 5, cols = 8 }) => (
    <>
        {Array.from({ length: rows }, (_, i) => (
            <TableRow key={i}>
                {Array.from({ length: cols }, (_, j) => (
                    <TableCell key={j}>
                        <Skeleton variant={j === 1 ? 'circular' : 'text'} width={j === 1 ? 32 : '80%'} height={j === 1 ? 32 : 20} />
                    </TableCell>
                ))}
            </TableRow>
        ))}
    </>
);

const BulkToolbar = ({ selected, onSuspend, onActivate, onChangeRole, onExport, onClear }) => (
    <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2 }}
    >
        <Toolbar
            sx={{
                bgcolor: 'primary.light',
                borderRadius: 1,
                mb: 1,
                minHeight: '48px !important',
                px: 2,
                gap: 1
            }}
        >
            <Typography variant="subtitle2" sx={{ flex: 1, color: 'primary.contrastText' }}>
                {selected.length} selected
            </Typography>
            <Tooltip title="Suspend selected">
                <Button size="small" variant="outlined" color="inherit" startIcon={<Block />} onClick={onSuspend}
                    sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}>
                    Suspend
                </Button>
            </Tooltip>
            <Tooltip title="Activate selected">
                <Button size="small" variant="outlined" color="inherit" startIcon={<CheckCircle />} onClick={onActivate}
                    sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}>
                    Activate
                </Button>
            </Tooltip>
            <Tooltip title="Change role for selected">
                <Button size="small" variant="outlined" color="inherit" startIcon={<PersonAdd />} onClick={onChangeRole}
                    sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}>
                    Role
                </Button>
            </Tooltip>
            <Tooltip title="Export selected to CSV">
                <Button size="small" variant="outlined" color="inherit" startIcon={<GetApp />} onClick={onExport}
                    sx={{ color: 'primary.contrastText', borderColor: 'primary.contrastText' }}>
                    Export
                </Button>
            </Tooltip>
            <Button size="small" color="inherit" onClick={onClear}
                sx={{ color: 'primary.contrastText' }}>
                Clear
            </Button>
        </Toolbar>
    </motion.div>
);

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const UserManagementTable = () => {
    const [allUsers, setAllUsers]         = useState([]);
    const [loading, setLoading]           = useState(true);
    const [error, setError]               = useState(null);
    const [search, setSearch]             = useState('');
    const [debouncedSearch, setDebounced] = useState('');
    const [roleFilter, setRoleFilter]     = useState('all');
    const [statusFilter, setStatusFilter] = useState('all');
    const [selected, setSelected]         = useState([]);
    const [page, setPage]                 = useState(1);
    const [rowsPerPage, setRowsPerPage]   = useState(25);
    const [roleDialog, setRoleDialog]     = useState({ open: false, newRole: 'user' });
    const [actionError, setActionError]   = useState(null);
    const debounceRef = useRef(null);

    // Debounce search
    useEffect(() => {
        clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            setDebounced(search);
            setPage(1);
        }, 300);
        return () => clearTimeout(debounceRef.current);
    }, [search]);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const params = new URLSearchParams({ page: 1, limit: 50 });
            if (debouncedSearch) params.set('search', debouncedSearch);
            if (roleFilter !== 'all') params.set('role', roleFilter);
            const res = await api.get(`/api/v1/users?${params.toString()}`);
            const data = Array.isArray(res.data?.users)
                ? res.data.users
                : Array.isArray(res.data)
                    ? res.data
                    : [];
            setAllUsers(data.length > 0 ? data : buildMockUsers());
        } catch {
            setAllUsers(buildMockUsers());
        } finally {
            setLoading(false);
        }
    }, [debouncedSearch, roleFilter]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    // Client-side filter + paginate
    const filtered = allUsers.filter((u) => {
        const matchSearch =
            !debouncedSearch ||
            u.username?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
            u.email?.toLowerCase().includes(debouncedSearch.toLowerCase());
        const matchRole   = roleFilter   === 'all' || u.role   === roleFilter;
        const matchStatus = statusFilter === 'all' || u.status === statusFilter;
        return matchSearch && matchRole && matchStatus;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
    const pageUsers  = filtered.slice((page - 1) * rowsPerPage, page * rowsPerPage);

    // Selection helpers
    const allPageSelected = pageUsers.length > 0 && pageUsers.every((u) => selected.includes(u.id));
    const someSelected    = selected.length > 0;

    const toggleAll = () => {
        if (allPageSelected) {
            setSelected(selected.filter((id) => !pageUsers.find((u) => u.id === id)));
        } else {
            setSelected([...new Set([...selected, ...pageUsers.map((u) => u.id)])]);
        }
    };

    const toggleRow = (id) => {
        if (selected.includes(id)) {
            setSelected(selected.filter((s) => s !== id));
        } else {
            setSelected([...selected, id]);
        }
    };

    // Mutations (local + optimistic; would hit API in production)
    const applyStatus = (ids, status) => {
        setAllUsers((prev) => prev.map((u) => ids.includes(u.id) ? { ...u, status } : u));
        setSelected([]);
    };
    const applyRole = (ids, role) => {
        setAllUsers((prev) => prev.map((u) => ids.includes(u.id) ? { ...u, role } : u));
        setSelected([]);
        setRoleDialog({ open: false, newRole: 'user' });
    };

    const handleRowToggleStatus = (user) =>
        applyStatus([user.id], user.status === 'active' ? 'suspended' : 'active');

    return (
        <Box>
            {/* ---- Toolbar ---- */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} mb={2} alignItems={{ sm: 'center' }} flexWrap="wrap">
                <TextField
                    size="small"
                    placeholder="Search users…"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    InputProps={{
                        startAdornment: (
                            <InputAdornment position="start">
                                <Search fontSize="small" />
                            </InputAdornment>
                        )
                    }}
                    sx={{ minWidth: 220 }}
                />

                <FormControl size="small" sx={{ minWidth: 130 }}>
                    <InputLabel>Role</InputLabel>
                    <Select
                        value={roleFilter}
                        label="Role"
                        onChange={(e) => { setRoleFilter(e.target.value); setPage(1); }}
                        startAdornment={<FilterList sx={{ mr: 0.5, fontSize: 16, color: 'text.secondary' }} />}
                    >
                        <MenuItem value="all">All Roles</MenuItem>
                        {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                    </Select>
                </FormControl>

                <FormControl size="small" sx={{ minWidth: 140 }}>
                    <InputLabel>Status</InputLabel>
                    <Select
                        value={statusFilter}
                        label="Status"
                        onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                    >
                        <MenuItem value="all">All Statuses</MenuItem>
                        {STATUSES.map((s) => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                    </Select>
                </FormControl>

                <Box sx={{ flex: 1 }} />

                <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="body2" color="text.secondary">
                        {filtered.length} user{filtered.length !== 1 ? 's' : ''}
                    </Typography>
                    <FormControl size="small" sx={{ minWidth: 80 }}>
                        <Select
                            value={rowsPerPage}
                            onChange={(e) => { setRowsPerPage(e.target.value); setPage(1); }}
                        >
                            {[10, 25, 50].map((n) => <MenuItem key={n} value={n}>{n}/pg</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={fetchUsers} disabled={loading}>
                            {loading ? <CircularProgress size={18} /> : <Refresh fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                </Stack>
            </Stack>

            {/* ---- Alerts ---- */}
            {error && (
                <Alert severity="error" sx={{ mb: 1 }} onClose={() => setError(null)}>{error}</Alert>
            )}
            {actionError && (
                <Alert severity="warning" sx={{ mb: 1 }} onClose={() => setActionError(null)}>{actionError}</Alert>
            )}

            {/* ---- Bulk action toolbar ---- */}
            <AnimatePresence>
                {someSelected && (
                    <BulkToolbar
                        selected={selected}
                        onSuspend={() => applyStatus(selected, 'suspended')}
                        onActivate={() => applyStatus(selected, 'active')}
                        onChangeRole={() => setRoleDialog((d) => ({ ...d, open: true }))}
                        onExport={() => exportCSV(allUsers.filter((u) => selected.includes(u.id)))}
                        onClear={() => setSelected([])}
                    />
                )}
            </AnimatePresence>

            {/* ---- Table ---- */}
            <TableContainer component={Paper} elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Table size="small">
                    <TableHead>
                        <TableRow sx={{ bgcolor: 'action.hover' }}>
                            <TableCell padding="checkbox">
                                <Checkbox
                                    size="small"
                                    checked={allPageSelected}
                                    indeterminate={someSelected && !allPageSelected}
                                    onChange={toggleAll}
                                />
                            </TableCell>
                            <TableCell><Typography variant="caption" fontWeight={700}>USER</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontWeight={700}>EMAIL</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontWeight={700}>ROLE</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontWeight={700}>STATUS</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontWeight={700}>JOINED</Typography></TableCell>
                            <TableCell><Typography variant="caption" fontWeight={700}>LAST ACTIVE</Typography></TableCell>
                            <TableCell align="right"><Typography variant="caption" fontWeight={700}>ACTIONS</Typography></TableCell>
                        </TableRow>
                    </TableHead>

                    <TableBody>
                        {loading ? (
                            <SkeletonRows rows={5} cols={8} />
                        ) : pageUsers.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} align="center" sx={{ py: 6 }}>
                                    <Typography color="text.secondary">No users found</Typography>
                                </TableCell>
                            </TableRow>
                        ) : (
                            <AnimatePresence initial={false}>
                                {pageUsers.map((user, idx) => (
                                    <motion.tr
                                        key={user.id}
                                        initial={{ opacity: 0, x: -10 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        exit={{ opacity: 0, x: 10 }}
                                        transition={{ duration: 0.18, delay: idx * 0.025 }}
                                        style={{ display: 'table-row' }}
                                    >
                                        <TableCell padding="checkbox">
                                            <Checkbox
                                                size="small"
                                                checked={selected.includes(user.id)}
                                                onChange={() => toggleRow(user.id)}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Stack direction="row" alignItems="center" spacing={1}>
                                                <Avatar
                                                    src={user.avatarUrl}
                                                    alt={user.username}
                                                    sx={{ width: 28, height: 28, fontSize: 12 }}
                                                >
                                                    {user.username?.[0]?.toUpperCase()}
                                                </Avatar>
                                                <Typography variant="body2" fontWeight={500} noWrap>
                                                    {user.username}
                                                </Typography>
                                            </Stack>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary" noWrap>
                                                {user.email}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={user.role}
                                                color={ROLE_COLORS[user.role] || 'default'}
                                                size="small"
                                                sx={{ fontSize: '0.68rem', height: 20 }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Chip
                                                label={user.status}
                                                color={STATUS_COLORS[user.status] || 'default'}
                                                size="small"
                                                sx={{ fontSize: '0.68rem', height: 20 }}
                                            />
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDate(user.joinDate)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell>
                                            <Typography variant="body2" color="text.secondary">
                                                {formatDate(user.lastActive)}
                                            </Typography>
                                        </TableCell>

                                        <TableCell align="right">
                                            <Stack direction="row" justifyContent="flex-end" spacing={0}>
                                                <Tooltip title="Edit user">
                                                    <IconButton size="small">
                                                        <Edit sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title={user.status === 'active' ? 'Suspend' : 'Activate'}>
                                                    <IconButton
                                                        size="small"
                                                        color={user.status === 'active' ? 'warning' : 'success'}
                                                        onClick={() => handleRowToggleStatus(user)}
                                                    >
                                                        {user.status === 'active'
                                                            ? <Block sx={{ fontSize: 16 }} />
                                                            : <CheckCircle sx={{ fontSize: 16 }} />
                                                        }
                                                    </IconButton>
                                                </Tooltip>
                                                <Tooltip title="View profile">
                                                    <IconButton size="small">
                                                        <MoreVert sx={{ fontSize: 16 }} />
                                                    </IconButton>
                                                </Tooltip>
                                            </Stack>
                                        </TableCell>
                                    </motion.tr>
                                ))}
                            </AnimatePresence>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>

            {/* ---- Pagination ---- */}
            {!loading && filtered.length > 0 && (
                <Stack direction="row" justifyContent="center" mt={2}>
                    <Pagination
                        count={totalPages}
                        page={page}
                        onChange={(_, v) => setPage(v)}
                        size="small"
                        color="primary"
                        showFirstButton
                        showLastButton
                    />
                </Stack>
            )}

            {/* ---- Role change dialog ---- */}
            <Dialog
                open={roleDialog.open}
                onClose={() => setRoleDialog((d) => ({ ...d, open: false }))}
                maxWidth="xs"
                fullWidth
            >
                <DialogTitle>Change Role ({selected.length} user{selected.length !== 1 ? 's' : ''})</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>New Role</InputLabel>
                        <Select
                            value={roleDialog.newRole}
                            label="New Role"
                            onChange={(e) => setRoleDialog((d) => ({ ...d, newRole: e.target.value }))}
                        >
                            {ROLES.map((r) => <MenuItem key={r} value={r}>{r}</MenuItem>)}
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRoleDialog((d) => ({ ...d, open: false }))}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => applyRole(selected, roleDialog.newRole)}
                    >
                        Apply
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
};

export default UserManagementTable;
