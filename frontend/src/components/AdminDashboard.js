import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Tabs, Tab, Box, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, TextField, MenuItem, Select, FormControl, InputLabel,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Card, CardContent, IconButton, CircularProgress,
    Alert, Pagination, TablePagination
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People,
    Flag,
    Assignment,
    Edit,
    Block,
    CheckCircle,
    Refresh
} from '@mui/icons-material';
import api from '../utils/api';

const AdminDashboard = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [flags, setFlags] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    // Filters
    const [userSearch, setUserSearch] = useState('');
    const [userRole, setUserRole] = useState('');
    const [flagStatus, setFlagStatus] = useState('pending');

    // Dialogs
    const [editUserDialog, setEditUserDialog] = useState(null);
    const [flagDialog, setFlagDialog] = useState(null);
    const [resolution, setResolution] = useState('');

    // Fetch system stats
    const fetchStats = async () => {
        try {
            setLoading(true);
            const response = await api.get('/user-service/admin/stats');
            setStats(response.data);
        } catch (error) {
            console.error('Failed to fetch stats:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch users
    const fetchUsers = async (page = 1) => {
        try {
            setLoading(true);
            const params = { page, limit: 20 };
            if (userSearch) params.search = userSearch;
            if (userRole) params.role = userRole;

            const response = await api.get('/user-service/admin/users', { params });
            setUsers(response.data.users || []);
            setPagination({
                page: response.data.page,
                totalPages: response.data.totalPages,
                total: response.data.total
            });
        } catch (error) {
            console.error('Failed to fetch users:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch content flags
    const fetchFlags = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/user-service/admin/flags', {
                params: { page, limit: 20, status: flagStatus }
            });
            setFlags(response.data.flags || []);
            setPagination({
                page: response.data.page,
                totalPages: response.data.totalPages,
                total: response.data.total
            });
        } catch (error) {
            console.error('Failed to fetch flags:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch audit logs
    const fetchAuditLogs = async (page = 1) => {
        try {
            setLoading(true);
            const response = await api.get('/user-service/admin/audit-logs', {
                params: { page, limit: 50 }
            });
            setAuditLogs(response.data.logs || []);
            setPagination({
                page: response.data.page,
                totalPages: response.data.totalPages,
                total: response.data.total
            });
        } catch (error) {
            console.error('Failed to fetch audit logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Update user role
    const handleUpdateUserRole = async (userId, newRole) => {
        try {
            await api.put(`/user-service/admin/users/${userId}/role`, { role: newRole });
            setEditUserDialog(null);
            fetchUsers(pagination.page);
        } catch (error) {
            console.error('Failed to update user role:', error);
        }
    };

    // Ban/Unban user
    const handleToggleUserActive = async (userId, isActive) => {
        try {
            await api.put(`/user-service/admin/users/${userId}/active`, { isActive });
            fetchUsers(pagination.page);
        } catch (error) {
            console.error('Failed to update user status:', error);
        }
    };

    // Resolve flag
    const handleResolveFlag = async (flagId, status) => {
        try {
            await api.put(`/user-service/admin/flags/${flagId}`, {
                status,
                resolution
            });
            setFlagDialog(null);
            setResolution('');
            fetchFlags(pagination.page);
        } catch (error) {
            console.error('Failed to resolve flag:', error);
        }
    };

    // Load data based on tab
    useEffect(() => {
        switch (currentTab) {
            case 0:
                fetchStats();
                break;
            case 1:
                fetchUsers();
                break;
            case 2:
                fetchFlags();
                break;
            case 3:
                fetchAuditLogs();
                break;
            default:
                break;
        }
    }, [currentTab, userSearch, userRole, flagStatus]);

    // Stats Dashboard Tab
    const renderStatsTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">System Overview</Typography>
                <IconButton onClick={fetchStats}>
                    <Refresh />
                </IconButton>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            ) : stats ? (
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Users
                                </Typography>
                                <Typography variant="h4">{stats.users?.total || 0}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    {stats.users?.active || 0} active
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Recent Signups
                                </Typography>
                                <Typography variant="h4">{stats.users?.recentSignups || 0}</Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Last 7 days
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Total Pages
                                </Typography>
                                <Typography variant="h4">{stats.pages?.total || 0}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6} lg={3}>
                        <Card>
                            <CardContent>
                                <Typography color="textSecondary" gutterBottom>
                                    Pending Flags
                                </Typography>
                                <Typography variant="h4" color="error">
                                    {stats.moderation?.pendingFlags || 0}
                                </Typography>
                                <Typography variant="body2" color="textSecondary">
                                    Require review
                                </Typography>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Users by Role
                                </Typography>
                                {stats.users?.byRole && Object.entries(stats.users.byRole).map(([role, count]) => (
                                    <Box key={role} sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>{role}</Typography>
                                        <Chip label={count} size="small" />
                                    </Box>
                                ))}
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Notifications
                                </Typography>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography>Total</Typography>
                                    <Chip label={stats.notifications?.total || 0} size="small" />
                                </Box>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                    <Typography>Unread</Typography>
                                    <Chip label={stats.notifications?.unread || 0} size="small" color="primary" />
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            ) : (
                <Alert severity="info">No stats available</Alert>
            )}
        </Box>
    );

    // Users Management Tab
    const renderUsersTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3, display: 'flex', gap: 2 }}>
                <TextField
                    label="Search users"
                    value={userSearch}
                    onChange={(e) => setUserSearch(e.target.value)}
                    size="small"
                    sx={{ flexGrow: 1 }}
                />
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Role</InputLabel>
                    <Select value={userRole} onChange={(e) => setUserRole(e.target.value)} label="Role">
                        <MenuItem value="">All</MenuItem>
                        <MenuItem value="user">User</MenuItem>
                        <MenuItem value="moderator">Moderator</MenuItem>
                        <MenuItem value="admin">Admin</MenuItem>
                    </Select>
                </FormControl>
                <Button variant="contained" onClick={() => fetchUsers(1)}>
                    Search
                </Button>
            </Box>

            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Username</TableCell>
                                    <TableCell>Email</TableCell>
                                    <TableCell>Role</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell>{user.username}</TableCell>
                                        <TableCell>{user.email}</TableCell>
                                        <TableCell>
                                            <Chip label={user.role} size="small" color="primary" />
                                        </TableCell>
                                        <TableCell>
                                            <Chip
                                                label={user.isActive ? 'Active' : 'Banned'}
                                                size="small"
                                                color={user.isActive ? 'success' : 'error'}
                                            />
                                        </TableCell>
                                        <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <IconButton size="small" onClick={() => setEditUserDialog(user)}>
                                                <Edit />
                                            </IconButton>
                                            <IconButton
                                                size="small"
                                                onClick={() => handleToggleUserActive(user.id, !user.isActive)}
                                            >
                                                {user.isActive ? <Block /> : <CheckCircle />}
                                            </IconButton>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={pagination.totalPages}
                            page={pagination.page}
                            onChange={(e, page) => fetchUsers(page)}
                        />
                    </Box>
                </>
            )}
        </Box>
    );

    // Content Flags Tab
    const renderFlagsTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ mb: 3 }}>
                <FormControl size="small" sx={{ minWidth: 200 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={flagStatus} onChange={(e) => setFlagStatus(e.target.value)} label="Status">
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="under_review">Under Review</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                        <MenuItem value="dismissed">Dismissed</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Type</TableCell>
                                    <TableCell>Content ID</TableCell>
                                    <TableCell>Reason</TableCell>
                                    <TableCell>Reporter</TableCell>
                                    <TableCell>Status</TableCell>
                                    <TableCell>Created</TableCell>
                                    <TableCell>Actions</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {flags.map((flag) => (
                                    <TableRow key={flag.id}>
                                        <TableCell>{flag.contentType}</TableCell>
                                        <TableCell>{flag.contentId.substring(0, 8)}...</TableCell>
                                        <TableCell>
                                            <Chip label={flag.reason} size="small" />
                                        </TableCell>
                                        <TableCell>{flag.reporterId.substring(0, 8)}...</TableCell>
                                        <TableCell>
                                            <Chip label={flag.status} size="small" color="warning" />
                                        </TableCell>
                                        <TableCell>{new Date(flag.createdAt).toLocaleDateString()}</TableCell>
                                        <TableCell>
                                            <Button
                                                size="small"
                                                onClick={() => setFlagDialog(flag)}
                                            >
                                                Review
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={pagination.totalPages}
                            page={pagination.page}
                            onChange={(e, page) => fetchFlags(page)}
                        />
                    </Box>
                </>
            )}
        </Box>
    );

    // Audit Logs Tab
    const renderAuditLogsTab = () => (
        <Box sx={{ p: 3 }}>
            {loading ? (
                <CircularProgress />
            ) : (
                <>
                    <TableContainer component={Paper}>
                        <Table>
                            <TableHead>
                                <TableRow>
                                    <TableCell>Admin</TableCell>
                                    <TableCell>Action</TableCell>
                                    <TableCell>Target</TableCell>
                                    <TableCell>Details</TableCell>
                                    <TableCell>Timestamp</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {auditLogs.map((log) => (
                                    <TableRow key={log.id}>
                                        <TableCell>{log.Admin?.username || 'Unknown'}</TableCell>
                                        <TableCell>
                                            <Chip label={log.action} size="small" />
                                        </TableCell>
                                        <TableCell>{log.targetType || 'N/A'}</TableCell>
                                        <TableCell>
                                            <Typography variant="caption">
                                                {JSON.stringify(log.details).substring(0, 50)}...
                                            </Typography>
                                        </TableCell>
                                        <TableCell>{new Date(log.createdAt).toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
                        <Pagination
                            count={pagination.totalPages}
                            page={pagination.page}
                            onChange={(e, page) => fetchAuditLogs(page)}
                        />
                    </Box>
                </>
            )}
        </Box>
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 4 }}>
            <Typography variant="h4" gutterBottom>
                Admin Dashboard
            </Typography>

            <Paper>
                <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)}>
                    <Tab icon={<DashboardIcon />} label="Overview" />
                    <Tab icon={<People />} label="Users" />
                    <Tab icon={<Flag />} label="Content Flags" />
                    <Tab icon={<Assignment />} label="Audit Logs" />
                </Tabs>

                {currentTab === 0 && renderStatsTab()}
                {currentTab === 1 && renderUsersTab()}
                {currentTab === 2 && renderFlagsTab()}
                {currentTab === 3 && renderAuditLogsTab()}
            </Paper>

            {/* Edit User Dialog */}
            <Dialog open={Boolean(editUserDialog)} onClose={() => setEditUserDialog(null)}>
                <DialogTitle>Edit User</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={editUserDialog?.role || 'user'}
                            onChange={(e) => setEditUserDialog({ ...editUserDialog, role: e.target.value })}
                            label="Role"
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="moderator">Moderator</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditUserDialog(null)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => handleUpdateUserRole(editUserDialog.id, editUserDialog.role)}
                    >
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Flag Review Dialog */}
            <Dialog open={Boolean(flagDialog)} onClose={() => setFlagDialog(null)} maxWidth="sm" fullWidth>
                <DialogTitle>Review Content Flag</DialogTitle>
                <DialogContent>
                    {flagDialog && (
                        <Box sx={{ pt: 2 }}>
                            <Typography><strong>Content Type:</strong> {flagDialog.contentType}</Typography>
                            <Typography><strong>Reason:</strong> {flagDialog.reason}</Typography>
                            <Typography><strong>Description:</strong> {flagDialog.description || 'N/A'}</Typography>
                            <TextField
                                fullWidth
                                multiline
                                rows={3}
                                label="Resolution Notes"
                                value={resolution}
                                onChange={(e) => setResolution(e.target.value)}
                                sx={{ mt: 2 }}
                            />
                        </Box>
                    )}
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setFlagDialog(null)}>Cancel</Button>
                    <Button
                        color="error"
                        onClick={() => handleResolveFlag(flagDialog.id, 'dismissed')}
                    >
                        Dismiss
                    </Button>
                    <Button
                        variant="contained"
                        onClick={() => handleResolveFlag(flagDialog.id, 'resolved')}
                    >
                        Resolve
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default AdminDashboard;
