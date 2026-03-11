import React, { useState, useEffect, useCallback } from 'react';
import {
    Container, Paper, Tabs, Tab, Box, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Button, TextField, MenuItem, Select, FormControl, InputLabel,
    Chip, Dialog, DialogTitle, DialogContent, DialogActions,
    Grid, Card, CardContent, IconButton, CircularProgress,
    Alert, Pagination, TablePagination, Switch, FormControlLabel,
    List, ListItem, ListItemText, ListItemIcon, Divider, Badge,
    LinearProgress, Avatar, Tooltip, Fab, AppBar, Toolbar,
    Drawer, List as MuiList, ListItemButton, ListItemIcon as MuiListItemIcon,
    ThemeProvider, createTheme, CssBaseline, useMediaQuery,
    Accordion, AccordionSummary, AccordionDetails, Stepper, Step, StepLabel,
    Breadcrumbs, Link as MuiLink, SpeedDial, SpeedDialAction, SpeedDialIcon,
    Snackbar, AlertTitle, DataGrid, TreeView, TreeItem
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
    FilterList,
    Storage as Database,
    Backup,
    Restore,
    CloudUpload,
    CloudDownload,
    SystemUpdate,
    Memory,
    Speed,
    Assessment,
    Timeline,
    ExpandMore,
    Menu,
    Brightness4,
    Brightness7,
    Language,
    Palette,
    Api,
    Lock,
    Unlock,
    VpnKey,
    Shield,
    Keyboard,
    BugReport,
    Code,
    Build,
    PlayArrow,
    Stop,
    Pause,
    Replay,
    Folder,
    FileCopy,
    Description,
    Image,
    VideoFile,
    AudioFile,
    TableChart,
    ViewList,
    ViewModule,
    Sort,
    ArrowUpward,
    ArrowDownward,
    ExitToApp
} from '@mui/icons-material';
import {
    Webhook,
    NotificationImportant,
    Cloud,
    BarChart as BarChartIcon,
    SmartToy,
    Hub,
    Insights,
    AutoGraph,
    MonitorHeart,
    ManageAccounts,
    Gavel,
    Schedule,
    Rule,
    PieChart as PieChartIcon,
    Approval,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area } from 'recharts';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import api from '../utils/api';
import AdminLogin from './AdminLogin';
import SLAPanel from './dashboard/SLAPanel';
import WebhookPanel from './dashboard/WebhookPanel';
import AIRemediationPanel from './dashboard/AIRemediationPanel';
import AIAgentPanel from './dashboard/AIAgentPanel';
import MultiClusterPanel from './dashboard/MultiClusterPanel';
import TrendAnalysisPanel from './dashboard/TrendAnalysisPanel';
// Q2 2026 components
import ServiceHealthGrid from './dashboard/ServiceHealthGrid';
import UserManagementTable from './dashboard/UserManagementTable';
import AuditLogTable from './dashboard/AuditLogTable';
import SLATimeline from './dashboard/SLATimeline';
import AlertRuleEditor from './dashboard/AlertRuleEditor';
import CostBreakdown from './dashboard/CostBreakdown';
import AIPermissionInbox from './dashboard/AIPermissionInbox';
// Q3 2026 components
import SecurityDashboard from './dashboard/SecurityDashboard';
import ComplianceDashboard from './dashboard/ComplianceDashboard';
import SSHAdminPanel from './dashboard/SSHAdminPanel';
import IncidentTracker from './dashboard/IncidentTracker';
// Q4 2026 components
import ObservabilityDashboard from './dashboard/ObservabilityDashboard';
import TenantManager from './dashboard/TenantManager';
import FeatureFlagToggle from './dashboard/FeatureFlagToggle';
import DeveloperPanel from './dashboard/DeveloperPanel';
import AIIntegrationPanel from './dashboard/AIIntegrationPanel';
import KeyboardShortcutsModal from './common/KeyboardShortcutsModal';
import { useKeyboardShortcuts } from '../hooks/useKeyboardShortcuts';
import { useTranslation, setLanguage, SUPPORTED_LANGUAGES } from '../utils/i18n';
import { useAppearanceStore } from '../store/appearanceStore';

const AdminDashboard = () => {
    useEffect(() => {
        document.title = 'Admin Control Center – Milonexa';
    }, []);

    // authentication state
    const tokenFromStorage = localStorage.getItem('adminToken');
    const [isAuthenticated, setIsAuthenticated] = useState(!!tokenFromStorage);

    useEffect(() => {
        if (tokenFromStorage) {
            api.defaults.headers.common['Authorization'] = `Bearer ${tokenFromStorage}`;
        }
    }, [tokenFromStorage]);

    const handleLoginSuccess = (token) => {
        setIsAuthenticated(true);
    };

    const [currentTab, setCurrentTab] = useState(0);
    const [loading, setLoading] = useState(false);
    const [stats, setStats] = useState(null);
    const [users, setUsers] = useState([]);
    const [flags, setFlags] = useState([]);
    const [auditLogs, setAuditLogs] = useState([]);
    const [systemHealth, setSystemHealth] = useState(null);
    const [realTimeMetrics, setRealTimeMetrics] = useState([]);
    const [databaseInfo, setDatabaseInfo] = useState(null);
    const [backups, setBackups] = useState([]);
    const [systemLogs, setSystemLogs] = useState([]);
    const [apiEndpoints, setApiEndpoints] = useState([]);
    const [performanceMetrics, setPerformanceMetrics] = useState([]);
    const [securityEvents, setSecurityEvents] = useState([]);
    const [notifications, setNotifications] = useState([]);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const { darkMode: darkModeSetting, updateSetting } = useAppearanceStore();
    const systemPrefersDark = useMediaQuery('(prefers-color-scheme: dark)');
    const isDarkMode = darkModeSetting === 'dark' || (darkModeSetting === 'system' && systemPrefersDark);
    const isMobile = useMediaQuery('(max-width:600px)');
    const [selectedLanguage, setSelectedLanguage] = useState(() => {
        try { return localStorage.getItem('admin-lang') || 'en'; } catch { return 'en'; }
    });
    const [helpOpen, setHelpOpen] = useState(false);
    const { t } = useTranslation();

    const handleLogout = () => {
        localStorage.removeItem('adminToken');
        localStorage.removeItem('token');
        delete api.defaults.headers.common['Authorization'];
        setIsAuthenticated(false);
    };
    const [searchQuery, setSearchQuery] = useState('');
    const [filterOptions, setFilterOptions] = useState({});
    const [exportData, setExportData] = useState(null);
    const [importProgress, setImportProgress] = useState(0);

    // Pagination
    const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

    // Filters
    const [userSearch, setUserSearch] = useState('');
    const [userRole, setUserRole] = useState('');
    const [flagStatus, setFlagStatus] = useState('pending');
    const [logLevel, setLogLevel] = useState('all');
    const [dateRange, setDateRange] = useState([null, null]);

    // Dialogs
    const [editUserDialog, setEditUserDialog] = useState(null);
    const [flagDialog, setFlagDialog] = useState(null);
    const [backupDialog, setBackupDialog] = useState(false);
    const [restoreDialog, setRestoreDialog] = useState(false);
    const [settingsDialog, setSettingsDialog] = useState(false);
    const [exportDialog, setExportDialog] = useState(false);
    const [importDialog, setImportDialog] = useState(false);
    const [resolution, setResolution] = useState('');
    const [systemSettings, setSystemSettings] = useState({
        maintenance: false,
        registration: true,
        debugMode: false,
        cacheEnabled: true,
        notificationsEnabled: true
    });

    // Admin user creation dialog
    const [newAdminDialog, setNewAdminDialog] = useState(false);
    const [newAdminUsername, setNewAdminUsername] = useState('');
    const [newAdminPassword, setNewAdminPassword] = useState('');
    const [newAdminRole, setNewAdminRole] = useState('admin');

    // Real-time data
    useEffect(() => {
        const interval = setInterval(() => {
            fetchRealTimeMetrics();
            fetchSecurityEvents();
        }, 30000); // Update every 30 seconds
        return () => clearInterval(interval);
    }, []);

    // Theme
    const theme = createTheme({
        palette: {
            mode: isDarkMode ? 'dark' : 'light',
            primary: { main: '#1976d2' },
            secondary: { main: '#dc004e' },
        },
    });

    // Keyboard shortcuts wiring
    useKeyboardShortcuts({
        onSearch: useCallback(() => {
            const el = document.querySelector('input[type="search"], input[placeholder*="earch"]');
            if (el) el.focus();
        }, []),
        onRefresh: useCallback(() => {
            switch (currentTab) {
                // Dashboard
                case 0: fetchStats(); fetchSystemHealth(); break;
                // Users (legacy)
                case 1: fetchUsers(); break;
                // Feature Flags (legacy)
                case 2: fetchFlags(); break;
                // Audit Log (legacy)
                case 3: fetchAuditLogs(); break;
                // Service Health Grid (Q2 tab 15)
                case 15: fetchStats(); fetchSystemHealth(); break;
                // User Management Table (Q2 tab 16)
                case 16: fetchUsers(); break;
                // Audit Log Table (Q2 tab 17)
                case 17: fetchAuditLogs(); break;
                // System / DB / Backups
                case 4: case 5: case 6: fetchSystemHealth(); break;
                default: break;
            }
        }, [currentTab]),
        onShowHelp: useCallback(() => setHelpOpen(true), []),
        onClearSelection: useCallback(() => setHelpOpen(false), []),
    });

    // Tab switching via numeric keys (1-9)
    useEffect(() => {
        const handleNumericKey = (e) => {
            const isInputField = ['INPUT', 'TEXTAREA'].includes(e.target.tagName);
            if (isInputField || e.ctrlKey || e.metaKey || e.altKey) return;
            const num = parseInt(e.key, 10);
            if (num >= 1 && num <= 9) {
                // Map keys 1–9 to specific tab indices:
                // 1=Dashboard(0), 2=Service Health(15), 3=Users(16), 4=Audit Log(17),
                // 5=SLA Timeline(18), 6=Alert Rules(19), 7=Cost Breakdown(20),
                // 8=AI Permissions(21), 9=Settings(8)
                const tabMap = { 1: 0, 2: 15, 3: 16, 4: 17, 5: 18, 6: 19, 7: 20, 8: 21, 9: 8 };
                if (tabMap[num] !== undefined) setCurrentTab(tabMap[num]);
            }
        };
        window.addEventListener('keydown', handleNumericKey);
        return () => window.removeEventListener('keydown', handleNumericKey);
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

    // Fetch database information
    const fetchDatabaseInfo = async () => {
        try {
            const response = await api.get('/user-service/admin/database/info');
            setDatabaseInfo(response.data);
        } catch (error) {
            console.error('Failed to fetch database info:', error);
        }
    };

    // Fetch backups
    const fetchBackups = async () => {
        try {
            const response = await api.get('/user-service/admin/backups');
            setBackups(response.data.backups || []);
        } catch (error) {
            console.error('Failed to fetch backups:', error);
        }
    };

    // Fetch system logs
    const fetchSystemLogs = async (page = 1) => {
        try {
            setLoading(true);
            const params = { page, limit: 50 };
            if (logLevel !== 'all') params.level = logLevel;
            if (dateRange[0]) params.startDate = dateRange[0].toISOString();
            if (dateRange[1]) params.endDate = dateRange[1].toISOString();

            const response = await api.get('/user-service/admin/logs', { params });
            setSystemLogs(response.data.logs || []);
            setPagination({
                page: response.data.page,
                totalPages: response.data.totalPages,
                total: response.data.total
            });
        } catch (error) {
            console.error('Failed to fetch system logs:', error);
        } finally {
            setLoading(false);
        }
    };

    // Fetch API endpoints
    const fetchApiEndpoints = async () => {
        try {
            const response = await api.get('/user-service/admin/api/endpoints');
            setApiEndpoints(response.data.endpoints || []);
        } catch (error) {
            console.error('Failed to fetch API endpoints:', error);
        }
    };

    // Fetch performance metrics
    const fetchPerformanceMetrics = async () => {
        try {
            const response = await api.get('/user-service/admin/performance');
            setPerformanceMetrics(response.data.metrics || []);
        } catch (error) {
            console.error('Failed to fetch performance metrics:', error);
        }
    };

    // Fetch security events
    const fetchSecurityEvents = async () => {
        try {
            const response = await api.get('/user-service/admin/security/events');
            setSecurityEvents(response.data.events || []);
        } catch (error) {
            console.error('Failed to fetch security events:', error);
        }
    };

    // Fetch notifications
    const fetchNotifications = async () => {
        try {
            const response = await api.get('/user-service/admin/notifications');
            setNotifications(response.data.notifications || []);
        } catch (error) {
            console.error('Failed to fetch notifications:', error);
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

    // Create backup
    const handleCreateBackup = async () => {
        try {
            setLoading(true);
            await api.post('/user-service/admin/backups/create');
            setBackupDialog(false);
            fetchBackups();
            alert('Backup created successfully');
        } catch (error) {
            console.error('Failed to create backup:', error);
            alert('Failed to create backup');
        } finally {
            setLoading(false);
        }
    };

    // Restore from backup
    const handleRestoreBackup = async (backupId) => {
        try {
            setLoading(true);
            await api.post(`/user-service/admin/backups/${backupId}/restore`);
            setRestoreDialog(false);
            alert('Backup restored successfully');
        } catch (error) {
            console.error('Failed to restore backup:', error);
            alert('Failed to restore backup');
        } finally {
            setLoading(false);
        }
    };

    // Export data
    const handleExportData = async (dataType) => {
        try {
            setLoading(true);
            const response = await api.get(`/user-service/admin/export/${dataType}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${dataType}_export_${new Date().toISOString()}.json`);
            document.body.appendChild(link);
            link.click();
            link.remove();
            setExportDialog(false);
        } catch (error) {
            console.error('Failed to export data:', error);
            alert('Failed to export data');
        } finally {
            setLoading(false);
        }
    };

    // Import data
    const handleImportData = async (file, dataType) => {
        try {
            setLoading(true);
            const formData = new FormData();
            formData.append('file', file);
            formData.append('type', dataType);

            await api.post('/user-service/admin/import', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    setImportProgress(Math.round((progressEvent.loaded * 100) / progressEvent.total));
                }
            });
            setImportDialog(false);
            setImportProgress(0);
            alert('Data imported successfully');
        } catch (error) {
            console.error('Failed to import data:', error);
            alert('Failed to import data');
        } finally {
            setLoading(false);
        }
    };

    // Clear cache
    const handleClearCache = async () => {
        try {
            await api.post('/user-service/admin/cache/clear');
            alert('Cache cleared successfully');
        } catch (error) {
            console.error('Failed to clear cache:', error);
            alert('Failed to clear cache');
        }
    };

    // Update system settings
    const handleUpdateSettings = async () => {
        try {
            await api.put('/user-service/admin/settings', systemSettings);
            setSettingsDialog(false);
            alert('Settings updated successfully');
        } catch (error) {
            console.error('Failed to update settings:', error);
        }
    };

    // Create a new admin user
    const handleCreateAdmin = async () => {
        try {
            setLoading(true);
            await api.post('/admin/users', {
                username: newAdminUsername,
                password: newAdminPassword,
                role: newAdminRole
            });
            setNewAdminDialog(false);
            setNewAdminUsername('');
            setNewAdminPassword('');
            setNewAdminRole('admin');
            alert('Admin user created');
        } catch (error) {
            console.error('Failed to create admin user:', error);
            alert('Failed to create admin user');
        } finally {
            setLoading(false);
        }
    };

    // Load data based on tab
    useEffect(() => {
        switch (currentTab) {
            case 0:
                fetchStats();
                fetchSystemHealth();
                fetchPerformanceMetrics();
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
                fetchDatabaseInfo();
                fetchBackups();
                break;
            case 5:
                fetchSystemLogs();
                break;
            case 6:
                fetchApiEndpoints();
                break;
            case 7:
                fetchSecurityEvents();
                fetchNotifications();
                break;
            case 8:
                // System settings
                break;
            default:
                break;
        }
    }, [currentTab, userSearch, userRole, flagStatus, logLevel, dateRange]);

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
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Debug Mode</Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={systemSettings.debugMode}
                                        onChange={(e) => setSystemSettings(prev => ({ ...prev, debugMode: e.target.checked }))}
                                    />
                                }
                                label="Enable debug logging"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Cache System</Typography>
                            <FormControlLabel
                                control={
                                    <Switch
                                        checked={systemSettings.cacheEnabled}
                                        onChange={(e) => setSystemSettings(prev => ({ ...prev, cacheEnabled: e.target.checked }))}
                                    />
                                }
                                label="Enable caching"
                            />
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Admin Accounts</Typography>
                            <Button variant="contained" onClick={() => setNewAdminDialog(true)}>
                                Create New Admin
                            </Button>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12}>
                    <Button variant="contained" onClick={() => setSettingsDialog(true)}>
                        Advanced Settings
                    </Button>
                    <Button variant="outlined" onClick={handleClearCache} sx={{ ml: 2 }}>
                        Clear Cache
                    </Button>
                </Grid>
            </Grid>
        </Box>
    );

    // Database Management Tab
    const renderDatabaseTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">Database Management</Typography>
                <Box>
                    <Button variant="contained" startIcon={<Backup />} onClick={() => setBackupDialog(true)}>
                        Create Backup
                    </Button>
                    <Button variant="outlined" startIcon={<Restore />} onClick={() => setRestoreDialog(true)} sx={{ ml: 2 }}>
                        Restore
                    </Button>
                </Box>
            </Box>

            {databaseInfo && (
                <Grid container spacing={3} sx={{ mb: 3 }}>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">Database Size</Typography>
                                <Typography variant="h4">{databaseInfo.size || 'N/A'}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">Active Connections</Typography>
                                <Typography variant="h4">{databaseInfo.connections || 0}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">Tables Count</Typography>
                                <Typography variant="h4">{databaseInfo.tables || 0}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6">Uptime</Typography>
                                <Typography variant="h4">{databaseInfo.uptime || 'N/A'}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Recent Backups</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Name</TableCell>
                            <TableCell>Size</TableCell>
                            <TableCell>Created</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {backups.map((backup) => (
                            <TableRow key={backup.id}>
                                <TableCell>{backup.name}</TableCell>
                                <TableCell>{backup.size}</TableCell>
                                <TableCell>{new Date(backup.createdAt).toLocaleString()}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={backup.status}
                                        color={backup.status === 'completed' ? 'success' : 'warning'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Button size="small" onClick={() => handleRestoreBackup(backup.id)}>
                                        Restore
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    // System Logs Tab
    const renderLogsTab = () => (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
                <Typography variant="h5">System Logs</Typography>
                <Box sx={{ display: 'flex', gap: 2 }}>
                    <FormControl size="small" sx={{ minWidth: 120 }}>
                        <InputLabel>Log Level</InputLabel>
                        <Select value={logLevel} onChange={(e) => setLogLevel(e.target.value)}>
                            <MenuItem value="all">All</MenuItem>
                            <MenuItem value="error">Error</MenuItem>
                            <MenuItem value="warning">Warning</MenuItem>
                            <MenuItem value="info">Info</MenuItem>
                            <MenuItem value="debug">Debug</MenuItem>
                        </Select>
                    </FormControl>
                    <LocalizationProvider dateAdapter={AdapterDateFns}>
                        <DatePicker
                            label="Start Date"
                            value={dateRange[0]}
                            onChange={(date) => setDateRange([date, dateRange[1]])}
                            renderInput={(params) => <TextField {...params} size="small" />}
                        />
                        <DatePicker
                            label="End Date"
                            value={dateRange[1]}
                            onChange={(date) => setDateRange([dateRange[0], date])}
                            renderInput={(params) => <TextField {...params} size="small" />}
                        />
                    </LocalizationProvider>
                </Box>
            </Box>

            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Level</TableCell>
                            <TableCell>Service</TableCell>
                            <TableCell>Message</TableCell>
                            <TableCell>Details</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {systemLogs.map((log) => (
                            <TableRow key={log.id}>
                                <TableCell>{new Date(log.timestamp).toLocaleString()}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={log.level}
                                        color={
                                            log.level === 'error' ? 'error' :
                                            log.level === 'warning' ? 'warning' :
                                            log.level === 'info' ? 'info' : 'default'
                                        }
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{log.service}</TableCell>
                                <TableCell>{log.message}</TableCell>
                                <TableCell>
                                    <Tooltip title={JSON.stringify(log.details, null, 2)}>
                                        <IconButton size="small">
                                            <Info />
                                        </IconButton>
                                    </Tooltip>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    // API Management Tab
    const renderApiTab = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>API Management</Typography>
            <Grid container spacing={3}>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>API Endpoints</Typography>
                            <Typography variant="h4">{apiEndpoints.length}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Total registered endpoints
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>API Health</Typography>
                            <Typography variant="h4" color="success.main">Healthy</Typography>
                            <Typography variant="body2" color="text.secondary">
                                All endpoints responding
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Endpoint Details</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Method</TableCell>
                            <TableCell>Path</TableCell>
                            <TableCell>Service</TableCell>
                            <TableCell>Status</TableCell>
                            <TableCell>Rate Limit</TableCell>
                            <TableCell>Actions</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {apiEndpoints.map((endpoint) => (
                            <TableRow key={endpoint.id}>
                                <TableCell>
                                    <Chip
                                        label={endpoint.method}
                                        color={
                                            endpoint.method === 'GET' ? 'primary' :
                                            endpoint.method === 'POST' ? 'success' :
                                            endpoint.method === 'PUT' ? 'warning' :
                                            endpoint.method === 'DELETE' ? 'error' : 'default'
                                        }
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{endpoint.path}</TableCell>
                                <TableCell>{endpoint.service}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={endpoint.status}
                                        color={endpoint.status === 'active' ? 'success' : 'error'}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>{endpoint.rateLimit || 'N/A'}</TableCell>
                                <TableCell>
                                    <IconButton size="small">
                                        <Edit />
                                    </IconButton>
                                    <IconButton size="small">
                                        <Block />
                                    </IconButton>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );

    // Security Tab
    const renderSecurityTab = () => (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>Security Center</Typography>
            <Grid container spacing={3} sx={{ mb: 3 }}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Security Events</Typography>
                            <Typography variant="h4">{securityEvents.length}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Recent security events
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Active Sessions</Typography>
                            <Typography variant="h4">{stats?.sessions?.active || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Current active sessions
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6">Failed Logins</Typography>
                            <Typography variant="h4">{stats?.security?.failedLogins || 0}</Typography>
                            <Typography variant="body2" color="text.secondary">
                                Last 24 hours
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>

            <Typography variant="h6" gutterBottom>Recent Security Events</Typography>
            <TableContainer component={Paper}>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Timestamp</TableCell>
                            <TableCell>Event Type</TableCell>
                            <TableCell>User/IP</TableCell>
                            <TableCell>Description</TableCell>
                            <TableCell>Severity</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {securityEvents.map((event) => (
                            <TableRow key={event.id}>
                                <TableCell>{new Date(event.timestamp).toLocaleString()}</TableCell>
                                <TableCell>{event.type}</TableCell>
                                <TableCell>{event.user || event.ip}</TableCell>
                                <TableCell>{event.description}</TableCell>
                                <TableCell>
                                    <Chip
                                        label={event.severity}
                                        color={
                                            event.severity === 'critical' ? 'error' :
                                            event.severity === 'high' ? 'warning' :
                                            event.severity === 'medium' ? 'info' : 'default'
                                        }
                                        size="small"
                                    />
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </TableContainer>

            <Typography variant="h6" gutterBottom sx={{ mt: 3 }}>Notifications</Typography>
            <List>
                {notifications.map((notification) => (
                    <ListItem key={notification.id} divider>
                        <ListItemIcon>
                            <Badge color="error" variant="dot" invisible={!notification.urgent}>
                                <Notifications />
                            </Badge>
                        </ListItemIcon>
                        <ListItemText
                            primary={notification.title}
                            secondary={notification.message}
                        />
                        <Typography variant="body2" color="text.secondary">
                            {new Date(notification.timestamp).toLocaleString()}
                        </Typography>
                    </ListItem>
                ))}
            </List>
        </Box>
    );

    if (!isAuthenticated) {
        return <AdminLogin onLogin={handleLoginSuccess} />;
    }

    return (
        <ThemeProvider theme={theme}>
            <CssBaseline />
            <Container maxWidth="xl">
                <Box sx={{ mt: 4, mb: 4 }}>
                    <AppBar position="static" sx={{ mb: 3 }}>
                        <Toolbar>
                            <IconButton
                                edge="start"
                                color="inherit"
                                onClick={() => setDrawerOpen(true)}
                                sx={{ mr: 2 }}
                            >
                                <Menu />
                            </IconButton>
                            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                                {t('Admin Control Center')}
                            </Typography>
                            <Tooltip title={t('Keyboard Shortcuts')}>
                                <IconButton color="inherit" onClick={() => setHelpOpen(true)}>
                                    <Keyboard />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title={t('Dark Mode')}>
                                <IconButton color="inherit" onClick={() => updateSetting('darkMode', isDarkMode ? 'light' : 'dark')}>
                                    {isDarkMode ? <Brightness7 /> : <Brightness4 />}
                                </IconButton>
                            </Tooltip>
                            <FormControl size="small" sx={{ ml: 2, minWidth: 100 }}>
                                <Select
                                    value={selectedLanguage}
                                    onChange={(e) => {
                                        setSelectedLanguage(e.target.value);
                                        setLanguage(e.target.value);
                                    }}
                                    sx={{ color: 'white' }}
                                >
                                    {SUPPORTED_LANGUAGES.map((lang) => (
                                        <MenuItem key={lang.code} value={lang.code}>{lang.label}</MenuItem>
                                    ))}
                                </Select>
                            </FormControl>
                            <IconButton color="inherit" onClick={handleLogout} sx={{ ml: 1 }}>
                                <ExitToApp />
                            </IconButton>
                        </Toolbar>
                    </AppBar>

                    <Paper sx={{ mt: 3 }}>
                        <Tabs
                            value={currentTab}
                            onChange={(e, newValue) => setCurrentTab(newValue)}
                            variant="scrollable"
                            scrollButtons="auto"
                        >
                            <Tab icon={<DashboardIcon />} label="Dashboard" />
                            <Tab icon={<People />} label="Users" />
                            <Tab icon={<Flag />} label="Moderation" />
                            <Tab icon={<Assignment />} label="Audit Logs" />
                            <Tab icon={<Database />} label="Database" />
                            <Tab icon={<BugReport />} label="System Logs" />
                            <Tab icon={<Api />} label="API Management" />
                            <Tab icon={<Security />} label="Security" />
                            <Tab icon={<Settings />} label="Settings" />
                            <Tab icon={<Timeline />} label="SLA Monitor" />
                            <Tab icon={<Webhook />} label="Webhooks" />
                            <Tab icon={<SmartToy />} label="AI Remediation" />
                            <Tab icon={<Cloud />} label="Multi-Cluster" />
                            <Tab icon={<AutoGraph />} label="Trend Analysis" />
                            <Tab icon={<SmartToy color="secondary" />} label="AI Agent" />
                            {/* Q2 2026 tabs */}
                            <Tab icon={<MonitorHeart />} label={t('Service Health')} />
                            <Tab icon={<ManageAccounts />} label={t('Users')} />
                            <Tab icon={<Gavel />} label={t('Audit Log')} />
                            <Tab icon={<Schedule />} label={t('SLA Timeline')} />
                            <Tab icon={<Rule />} label={t('Alert Rules')} />
                            <Tab icon={<PieChartIcon />} label={t('Cost Breakdown')} />
                            <Tab icon={<Approval />} label={t('AI Permissions')} />
                            {/* Q3 2026 tabs */}
                            <Tab icon={<Security />} label={t('Security')} />
                            <Tab icon={<Gavel />} label={t('Compliance')} />
                            <Tab icon={<VpnKey />} label={t('SSH Admin')} />
                            <Tab icon={<BugReport />} label={t('Incidents')} />
                            {/* Q4 2026 tabs */}
                            <Tab icon={<Insights />} label={t('Observability')} />
                            <Tab icon={<ManageAccounts />} label={t('Tenants')} />
                            <Tab icon={<Flag />} label={t('Feature Flags')} />
                            <Tab icon={<Code />} label={t('Developer')} />
                            <Tab icon={<Hub />} label={t('AI Integration')} />
                        </Tabs>

                        {currentTab === 0 && renderStatsTab()}
                        {currentTab === 1 && renderUsersTab()}
                        {currentTab === 2 && renderModerationTab()}
                        {currentTab === 3 && renderAuditTab()}
                        {currentTab === 4 && renderDatabaseTab()}
                        {currentTab === 5 && renderLogsTab()}
                        {currentTab === 6 && renderApiTab()}
                        {currentTab === 7 && renderSecurityTab()}
                        {currentTab === 8 && renderSettingsTab()}
                        {currentTab === 9 && <SLAPanel />}
                        {currentTab === 10 && <WebhookPanel />}
                        {currentTab === 11 && <AIRemediationPanel />}
                        {currentTab === 12 && <MultiClusterPanel />}
                        {currentTab === 13 && <TrendAnalysisPanel />}
                        {currentTab === 14 && <AIAgentPanel />}
                        {/* Q2 2026 tab panels */}
                        {currentTab === 15 && <ServiceHealthGrid />}
                        {currentTab === 16 && <UserManagementTable />}
                        {currentTab === 17 && <AuditLogTable />}
                        {currentTab === 18 && <SLATimeline />}
                        {currentTab === 19 && <AlertRuleEditor />}
                        {currentTab === 20 && <CostBreakdown />}
                        {currentTab === 21 && <AIPermissionInbox />}
                        {/* Q3 2026 tab panels */}
                        {currentTab === 22 && <SecurityDashboard />}
                        {currentTab === 23 && <ComplianceDashboard />}
                        {currentTab === 24 && <SSHAdminPanel />}
                        {currentTab === 25 && <IncidentTracker />}
                        {/* Q4 2026 tab panels */}
                        {currentTab === 26 && <ObservabilityDashboard />}
                        {currentTab === 27 && <TenantManager />}
                        {currentTab === 28 && <FeatureFlagToggle />}
                        {currentTab === 29 && <DeveloperPanel />}
                        {currentTab === 30 && <AIIntegrationPanel />}
                    </Paper>

                    {/* Speed Dial for Quick Actions */}
                    <SpeedDial
                        ariaLabel="Quick Actions"
                        sx={{ position: 'fixed', bottom: 16, right: 16 }}
                        icon={<SpeedDialIcon />}
                    >
                        <SpeedDialAction
                            icon={<Refresh />}
                            tooltipTitle="Refresh Data"
                            onClick={fetchStats}
                        />
                        <SpeedDialAction
                            icon={<Backup />}
                            tooltipTitle="Create Backup"
                            onClick={() => setBackupDialog(true)}
                        />
                        <SpeedDialAction
                            icon={<CloudDownload />}
                            tooltipTitle="Export Data"
                            onClick={() => setExportDialog(true)}
                        />
                        <SpeedDialAction
                            icon={<Settings />}
                            tooltipTitle="Settings"
                            onClick={() => setSettingsDialog(true)}
                        />
                    </SpeedDial>
                </Box>

                {/* Navigation Drawer - temporary on mobile, persistent on desktop */}
                <Drawer
                    anchor="left"
                    open={drawerOpen}
                    variant={isMobile ? 'temporary' : 'persistent'}
                    onClose={() => setDrawerOpen(false)}
                    sx={{ '& .MuiDrawer-paper': { width: 250, boxSizing: 'border-box' } }}
                >
                    <Box sx={{ width: 250, p: 2 }}>
                        <Typography variant="h6" gutterBottom>Navigation</Typography>
                        <Divider />
                        <MuiList>
                            <MuiListItemButton onClick={() => { setCurrentTab(0); setDrawerOpen(false); }}>
                                <MuiListItemIcon><DashboardIcon /></MuiListItemIcon>
                                <ListItemText primary="Dashboard" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(1); setDrawerOpen(false); }}>
                                <MuiListItemIcon><People /></MuiListItemIcon>
                                <ListItemText primary="Users" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(2); setDrawerOpen(false); }}>
                                <MuiListItemIcon><Flag /></MuiListItemIcon>
                                <ListItemText primary="Moderation" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(3); setDrawerOpen(false); }}>
                                <MuiListItemIcon><Assignment /></MuiListItemIcon>
                                <ListItemText primary="Audit Logs" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(4); setDrawerOpen(false); }}>
                                <MuiListItemIcon><Database /></MuiListItemIcon>
                                <ListItemText primary="Database" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(5); setDrawerOpen(false); }}>
                                <MuiListItemIcon><BugReport /></MuiListItemIcon>
                                <ListItemText primary="System Logs" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(6); setDrawerOpen(false); }}>
                                <MuiListItemIcon><Api /></MuiListItemIcon>
                                <ListItemText primary="API Management" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(7); setDrawerOpen(false); }}>
                                <MuiListItemIcon><Security /></MuiListItemIcon>
                                <ListItemText primary="Security" />
                            </MuiListItemButton>
                            <MuiListItemButton onClick={() => { setCurrentTab(8); setDrawerOpen(false); }}>
                                <MuiListItemIcon><Settings /></MuiListItemIcon>
                                <ListItemText primary="Settings" />
                            </MuiListItemButton>
                        </MuiList>
                    </Box>
                </Drawer>

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

            {/* New Admin Creation Dialog */}
            <Dialog open={newAdminDialog} onClose={() => setNewAdminDialog(false)}>
                <DialogTitle>Create Admin User</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Username"
                        margin="dense"
                        value={newAdminUsername}
                        onChange={(e) => setNewAdminUsername(e.target.value)}
                    />
                    <TextField
                        fullWidth
                        type="password"
                        label="Password"
                        margin="dense"
                        value={newAdminPassword}
                        onChange={(e) => setNewAdminPassword(e.target.value)}
                    />
                    <FormControl fullWidth sx={{ mt: 1 }}>
                        <InputLabel>Role</InputLabel>
                        <Select
                            value={newAdminRole}
                            onChange={(e) => setNewAdminRole(e.target.value)}
                        >
                            <MenuItem value="admin">Admin</MenuItem>
                            <MenuItem value="superadmin">Super Admin</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setNewAdminDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateAdmin} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Backup Dialog */}
            <Dialog open={backupDialog} onClose={() => setBackupDialog(false)}>
                <DialogTitle>Create Database Backup</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>
                        This will create a full backup of the database. The process may take several minutes.
                    </Typography>
                    <Alert severity="warning" sx={{ mt: 2 }}>
                        Ensure no critical operations are running during backup.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setBackupDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateBackup} variant="contained" disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : 'Create Backup'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Restore Dialog */}
            <Dialog open={restoreDialog} onClose={() => setRestoreDialog(false)}>
                <DialogTitle>Restore from Backup</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Select a backup to restore from:</Typography>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Backup</InputLabel>
                        <Select>
                            {backups.map((backup) => (
                                <MenuItem key={backup.id} value={backup.id}>
                                    {backup.name} - {new Date(backup.createdAt).toLocaleDateString()}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>
                    <Alert severity="error" sx={{ mt: 2 }}>
                        Warning: This will overwrite current data. Ensure you have a recent backup.
                    </Alert>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setRestoreDialog(false)}>Cancel</Button>
                    <Button onClick={() => handleRestoreBackup('selected')} color="error" variant="contained">
                        Restore
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Export Dialog */}
            <Dialog open={exportDialog} onClose={() => setExportDialog(false)}>
                <DialogTitle>Export Data</DialogTitle>
                <DialogContent>
                    <Typography gutterBottom>Select data type to export:</Typography>
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Data Type</InputLabel>
                        <Select>
                            <MenuItem value="users">Users</MenuItem>
                            <MenuItem value="posts">Posts</MenuItem>
                            <MenuItem value="settings">System Settings</MenuItem>
                            <MenuItem value="logs">Audit Logs</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setExportDialog(false)}>Cancel</Button>
                    <Button onClick={() => handleExportData('selected')} variant="contained">
                        Export
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Advanced Settings Dialog */}
            <Dialog open={settingsDialog} onClose={() => setSettingsDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Advanced System Settings</DialogTitle>
                <DialogContent>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Security</Typography>
                            <FormControlLabel
                                control={<Switch checked={systemSettings.notificationsEnabled} onChange={(e) => setSystemSettings(prev => ({ ...prev, notificationsEnabled: e.target.checked }))} />}
                                label="Enable notifications"
                            />
                            <FormControlLabel
                                control={<Switch checked={systemSettings.debugMode} onChange={(e) => setSystemSettings(prev => ({ ...prev, debugMode: e.target.checked }))} />}
                                label="Debug mode"
                            />
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Typography variant="h6" gutterBottom>Performance</Typography>
                            <FormControlLabel
                                control={<Switch checked={systemSettings.cacheEnabled} onChange={(e) => setSystemSettings(prev => ({ ...prev, cacheEnabled: e.target.checked }))} />}
                                label="Enable caching"
                            />
                            <TextField
                                fullWidth
                                label="Cache TTL (seconds)"
                                type="number"
                                defaultValue={3600}
                                sx={{ mt: 2 }}
                            />
                        </Grid>
                        <Grid item xs={12}>
                            <Typography variant="h6" gutterBottom>API Configuration</Typography>
                            <TextField
                                fullWidth
                                label="Rate Limit (requests/minute)"
                                type="number"
                                defaultValue={100}
                                sx={{ mb: 2 }}
                            />
                            <TextField
                                fullWidth
                                label="Timeout (seconds)"
                                type="number"
                                defaultValue={30}
                            />
                        </Grid>
                    </Grid>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSettingsDialog(false)}>Cancel</Button>
                    <Button onClick={handleUpdateSettings} variant="contained">
                        Save Settings
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Keyboard Shortcuts Modal */}
            <KeyboardShortcutsModal open={helpOpen} onClose={() => setHelpOpen(false)} />
        </Container>
        </ThemeProvider>
    );
};

export default AdminDashboard;
