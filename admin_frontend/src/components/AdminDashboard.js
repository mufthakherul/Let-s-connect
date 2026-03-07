import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Tabs, Tab, Box, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, TextField, MenuItem, Select, FormControl, InputLabel,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Card, CardContent, IconButton, CircularProgress,
    Alert, Pagination, TablePagination, Switch, FormControlLabel,
    List, ListItem, ListItemText, ListItemIcon, Divider, Badge,
    LinearProgress, Avatar, Tooltip, Fab
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    People,
    Flag,
    Assignment,
    Edit,
    Block,
    CheckCircle,
    Refresh,
    Security,
    Analytics,
    Settings,
    Notifications,
    Storage,
    NetworkCheck,
    TrendingUp,
    Warning,
    Error,
    Info,
    Add,
    Delete,
    Search,
    FilterList
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';
import api from '../utils/api';

const AdminDashboard = () => {
    useEffect(() => {
        document.title = 'Advanced Admin Control Center – Milonexa';
    }, []);

    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [flags, setFlags] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [systemHealth, setSystemHealth] = useState(null);
    const [realTimeMetrics, setRealTimeMetrics] = useState([]);
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    // Filters
    const [userSearch, setUserSearch] = useState('');
    const [userRole, setUserRole] = useState('');
    const [flagStatus, setFlagStatus] = useState('pending');

    // Dialogs
    const [editUserDialog, setEditUserDialog] = useState(null);
    const [flagDialog, setFlagDialog] = useState(null);
    const [resolution, setResolution] = useState('');
    const [systemSettings, setSystemSettings] = useState({ maintenance: false, registration: true });

    // Real-time data
    useEffect(() => {
        const interval = setInterval(() => {
            fetchRealTimeMetrics();
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

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

    // Fetch system health
    const fetchSystemHealth = async () => {
        try {
            const response = await api.get('/user-service/admin/health');
            setSystemHealth(response.data);
        } catch (error) {
            console.error('Failed to fetch system health:', error);
        }
    };

    // Fetch real-time metrics
    const fetchRealTimeMetrics = async () => {
        try {
            const response = await api.get('/user-service/admin/metrics');
            setRealTimeMetrics(prev => [...prev.slice(-19), response.data]); // Keep last 20 points
        } catch (error) {
            console.error('Failed to fetch real-time metrics:', error);
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

    // Update system settings
    const handleUpdateSettings = async () => {
        try {
            await api.put('/user-service/admin/settings', systemSettings);
            alert('Settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    };

    // Load data based on tab
    useEffect(() => {
        switch (currentTab) {
            case 0:
                fetchStats();
                fetchSystemHealth();
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
            case 4:
                // System settings
                break;
            default:
                break;
        }
    }, [currentTab, userSearch, userRole, flagStatus]);

    // Stats Dashboard Tab
    const renderStatsTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">System Overview & Analytics</Typography>
                <Box>
                    <IconButton onClick={fetchStats}>
                        <Refresh />
                    </IconButton>
                    <IconButton onClick={fetchSystemHealth}>
                        <NetworkCheck />
                    </IconButton>
                </Box>
            </Box>

            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* System Health */}
                    {systemHealth && (
                        <Grid container spacing={2} sx={{ mb: 3 }}>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ bgcolor: systemHealth.cpu < 80 ? 'success.light' : 'warning.light' }}>
                                    <CardContent>
                                        <Typography variant="h6">CPU Usage</Typography>
                                        <Typography variant="h4">{systemHealth.cpu}%</Typography>
                                        <LinearProgress variant="determinate" value={systemHealth.cpu} />
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ bgcolor: systemHealth.memory < 80 ? 'success.light' : 'warning.light' }}>
                                    <CardContent>
                                        <Typography variant="h6">Memory Usage</Typography>
                                        <Typography variant="h4">{systemHealth.memory}%</Typography>
                                        <LinearProgress variant="determinate" value={systemHealth.memory} />
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card sx={{ bgcolor: systemHealth.disk < 80 ? 'success.light' : 'warning.light' }}>
                                    <CardContent>
                                        <Typography variant="h6">Disk Usage</Typography>
                                        <Typography variant="h4">{systemHealth.disk}%</Typography>
                                        <LinearProgress variant="determinate" value={systemHealth.disk} />
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={3}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6">Active Connections</Typography>
                                        <Typography variant="h4">{systemHealth.connections}</Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}

                    {/* Real-time Metrics Chart */}
                    {realTimeMetrics.length > 0 && (
                        <Card sx={{ mb: 3 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Real-time User Activity</Typography>
                                <ResponsiveContainer width="100%" height={300}>
                                    <LineChart data={realTimeMetrics}>
                                        <CartesianGrid strokeDasharray="3 3" />
                                        <XAxis dataKey="timestamp" />
                                        <YAxis />
                                        <RechartsTooltip />
                                        <Legend />
                                        <Line type="monotone" dataKey="activeUsers" stroke="#8884d8" name="Active Users" />
                                        <Line type="monotone" dataKey="requests" stroke="#82ca9d" name="Requests/min" />
                                    </LineChart>
                                </ResponsiveContainer>
                            </CardContent>
                        </Card>
                    )}

                    {/* Stats Cards */}
                    {stats && (
                        <Grid container spacing={3}>
                            <Grid item xs={12} md={6} lg={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Total Users
                                        </Typography>
                                        <Typography variant="h4">{stats.users?.total || 0}</Typography>
                                        <Typography variant="body2" color="success.main">
                                            +{stats.users?.recentSignups || 0} today
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6} lg={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Active Posts
                                        </Typography>
                                        <Typography variant="h4">{stats.posts?.total || 0}</Typography>
                                        <Typography variant="body2" color="info.main">
                                            {stats.posts?.today || 0} today
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6} lg={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            Content Flags
                                        </Typography>
                                        <Typography variant="h4">{stats.flags?.total || 0}</Typography>
                                        <Typography variant="body2" color="warning.main">
                                            {stats.flags?.pending || 0} pending
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                            <Grid item xs={12} md={6} lg={3}>
                                <Card>
                                    <CardContent>
                                        <Typography color="textSecondary" gutterBottom>
                                            System Uptime
                                        </Typography>
                                        <Typography variant="h4">{stats.uptime || '99.9%'}</Typography>
                                        <Typography variant="body2" color="success.main">
                                            Excellent
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </Grid>
                        </Grid>
                    )}
                </>
            )}
        </Box>
    );

    // Users Management Tab
    const renderUsersTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">User Management</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <TextField
                        size="small"
                        placeholder="Search users..."
                        value={userSearch}
                        onChange={(e) => setUserSearch(e.target.value)}
                        InputProps={{
                            startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                        }}
                    />
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Role</InputLabel>
                        <Select value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                            <MenuItem value="">All</MenuItem>
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="moderator">Moderator</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>User</TableCell>
                            <TableCell>Role</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Joined</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {users.map((user) => (
                            <TableRow key={user.id}>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                        <Avatar src={user.avatar} />
                                        <Box>
                                            <Typography variant="body1">{user.username}</Typography>
                                            <Typography variant="body2" color="text.secondary">{user.email}</Typography>
                                        </Box>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.role}
                                        color={user.role === 'admin' ? 'error' : user.role === 'moderator' ? 'warning' : 'default'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Chip
                                        label={user.isActive ? 'Active' : 'Banned'}
                                        color={user.isActive ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
                                <TableCell>
                                    <IconButton onClick={() => setEditUserDialog(user)}>
                                        <Edit />
                                    </IconButton>
                                    <IconButton onClick={() => handleToggleUserActive(user.id, !user.isActive)}>
                                        {user.isActive ? <Block /> : <CheckCircle />}
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 3 }}>
                <Pagination
                    count={pagination.totalPages}
                    page={pagination.page}
                    onChange={(e, page) => fetchUsers(page)}
                />
            </Box>
        </Box>
    );

    // Content Moderation Tab
    const renderModerationTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">Content Moderation</Typography>
                <FormControl size="small" sx={{ minWidth: 120 }}>
                    <InputLabel>Status</InputLabel>
                    <Select value={flagStatus} onChange={(e) => setFlagStatus(e.target.value)}>
                        <MenuItem value="pending">Pending</MenuItem>
                        <MenuItem value="resolved">Resolved</MenuItem>
                        <MenuItem value="dismissed">Dismissed</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            <List>
                {flags.map((flag) => (
                    <ListItem key={flag.id} divider>
                        <ListItemIcon>
                            <Flag color="warning" />
                        </ListItemIcon>
                        <ListItemText
                            primary={`Content flagged by ${flag.reporter}`}
                            secondary={`Reason: ${flag.reason} | Status: ${flag.status}`}
                        />
                        <Button onClick={() => setFlagDialog(flag)}>Review</Button>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    // Audit Logs Tab
    const renderAuditTab = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Audit Logs</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>User</TableCell>
                            <TableCell>Action</TableCell>
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {auditLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{log.user}</TableCell>
                                <TableCell>{log.action}</TableCell>
                                <TableCell>{log.details}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    // System Settings Tab
    const renderSettingsTab = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>System Settings</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Maintenance Mode</Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={systemSettings.maintenance}
                                        onChange={(e) => setSystemSettings(prev => ({ ...prev, maintenance: e.target.checked }))}
                                    />
                                }
                                label="Enable maintenance mode"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>User Registration</Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={systemSettings.registration}
                                        onChange={(e) => setSystemSettings(prev => ({ ...prev, registration: e.target.checked }))}
                                    />
                                }
                                label="Allow new registrations"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Button variant="contained" onClick={handleUpdateSettings}>
                        Save Settings
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );

    return (
        <Container maxWidth="xl">
            <Box sx={{ mt: 4, mb: 4 }}>
                <Typography variant="h4" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <DashboardIcon />
                    Advanced Admin Control Center
                </Typography>

                <Paper sx={{ mt: 3 }}>
                    <Tabs value={currentTab} onChange={(e, newValue) => setCurrentTab(newValue)}>
                        <Tab icon={<DashboardIcon />} label="Dashboard" />
                        <Tab icon={<People />} label="Users" />
                        <Tab icon={<Flag />} label="Moderation" />
                        <Tab icon={<Assignment />} label="Audit Logs" />
                        <Tab icon={<Settings />} label="Settings" />
                    </Tabs>

                    {currentTab === 0 && renderStatsTab()}
                    {currentTab === 1 && renderUsersTab()}
                    {currentTab === 2 && renderModerationTab()}
                    {currentTab === 3 && renderAuditTab()}
                    {currentTab === 4 && renderSettingsTab()}
                </Paper>
            </Box>

            {/* Edit User Dialog */}
            <Dialog open={!!editUserDialog} onClose={() => setEditUserDialog(null)}>
                <DialogTitle>Edit User Role</DialogTitle>
                <DialogContent>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={editUserDialog?.role || ''}
                            onChange={(e) => setEditUserDialog(prev => ({ ...prev, role: e.target.value }))}
                        >
                            <MenuItem value="user">User</MenuItem>
                            <MenuItem value="moderator">Moderator</MenuItem>
                            <MenuItem value="admin">Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setEditUserDialog(null)}>Cancel</Button>
                    <Button onClick={() => handleUpdateUserRole(editUserDialog.id, editUserDialog.role)}>Save</Button>
                </DialogActions>
            </Dialog>

            {/* Flag Resolution Dialog */}
            <Dialog open={!!flagDialog} onClose={() => setFlagDialog(null)}>
                <DialogTitle>Review Content Flag</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Reason: {flagDialog?.reason}</Typography>
                    <TextField
                        fullWidth
                        multiline
                        rows={4}
                        label="Resolution Notes"
                        value={resolution}
                        onChange={(e) => setResolution(e.target.value)}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => handleResolveFlag(flagDialog?.id, 'dismissed')}>Dismiss</Button>
                    <Button onClick={() => handleResolveFlag(flagDialog?.id, 'resolved')} color="primary">Resolve</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default AdminDashboard;
