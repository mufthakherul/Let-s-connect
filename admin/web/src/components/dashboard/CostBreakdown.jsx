import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Chip,
    IconButton,
    Tooltip,
    LinearProgress,
    CircularProgress,
    Alert,
    Stack,
    Divider,
    Paper,
    Table,
    TableBody,
    TableCell,
    TableContainer,
    TableHead,
    TableRow,
    ToggleButton,
    ToggleButtonGroup,
    Button
} from '@mui/material';
import {
    Refresh,
    TrendingUp,
    TrendingDown,
    TrendingFlat,
    AttachMoney,
    Warning,
    Error as ErrorIcon,
    GetApp,
    Lightbulb
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import {
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip as RechartsTooltip,
    Legend,
    ResponsiveContainer
} from 'recharts';
import api from '../../utils/api';

// ---------------------------------------------------------------------------
// Constants & helpers
// ---------------------------------------------------------------------------

const SERVICE_NAMES = [
    'api-gateway',
    'user-service',
    'content-service',
    'messaging-service',
    'media-service',
    'shop-service',
    'collaboration-service',
    'streaming-service',
    'ai-service'
];

const PIE_COLORS = [
    '#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1',
    '#c62828', '#558b2f', '#6a1b9a', '#f57f17'
];

const MONTHS = ['Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const OPTIMIZATION_SUGGESTIONS = [
    { id: 1, service: 'media-service',     severity: 'high',   text: 'Enable CDN caching to reduce egress by ~32%.' },
    { id: 2, service: 'ai-service',        severity: 'high',   text: 'Switch to spot/preemptible instances during off-peak hours.' },
    { id: 3, service: 'streaming-service', severity: 'medium', text: 'Compress stored streams; estimated 18% storage saving.' },
    { id: 4, service: 'shop-service',      severity: 'low',    text: 'Consolidate 3 underutilised read replicas into 1.' },
    { id: 5, service: 'content-service',   severity: 'low',    text: 'Resize compute to match observed 40% avg CPU utilisation.' }
];

const SEVERITY_COLOR = { high: 'error', medium: 'warning', low: 'info' };

const buildMockData = () => {
    const baseCosts = {
        'api-gateway': 120, 'user-service': 95, 'content-service': 210,
        'messaging-service': 145, 'media-service': 380, 'shop-service': 175,
        'collaboration-service': 130, 'streaming-service': 420, 'ai-service': 560
    };
    const budgets = {
        'api-gateway': 150, 'user-service': 120, 'content-service': 250,
        'messaging-service': 180, 'media-service': 400, 'shop-service': 200,
        'collaboration-service': 150, 'streaming-service': 500, 'ai-service': 500
    };

    const services = SERVICE_NAMES.map((name) => {
        const current = +(baseCosts[name] * (0.9 + Math.random() * 0.2)).toFixed(2);
        const budget = budgets[name];
        const prev = +(current * (0.85 + Math.random() * 0.3)).toFixed(2);
        const trend = (((current - prev) / prev) * 100).toFixed(1);
        return { name, current, budget, utilization: +((current / budget) * 100).toFixed(1), trend: +trend, prev };
    });

    const totalCost = +services.reduce((s, x) => s + x.current, 0).toFixed(2);
    const totalBudget = +services.reduce((s, x) => s + x.budget, 0).toFixed(2);
    const projected = +(totalCost * 1.08).toFixed(2);

    const trend = MONTHS.map((month) =>
        SERVICE_NAMES.reduce(
            (acc, name) => {
                acc[name] = +(baseCosts[name] * (0.7 + Math.random() * 0.6)).toFixed(2);
                return acc;
            },
            { month }
        )
    );

    return { services, totalCost, totalBudget, projected, trend };
};

const formatUSD = (n) =>
    n >= 1000
        ? `$${(n / 1000).toFixed(1)}k`
        : `$${Number(n).toFixed(2)}`;

const TrendIcon = ({ value }) => {
    if (value > 1)  return <TrendingUp  sx={{ fontSize: 14, color: '#f44336' }} />;
    if (value < -1) return <TrendingDown sx={{ fontSize: 14, color: '#4caf50' }} />;
    return <TrendingFlat sx={{ fontSize: 14, color: '#9e9e9e' }} />;
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const StatCard = ({ title, value, sub, color, icon: Icon }) => (
    <Card elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
        <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Stack direction="row" alignItems="flex-start" justifyContent="space-between">
                <Box>
                    <Typography variant="caption" color="text.secondary">{title}</Typography>
                    <Typography variant="h5" fontWeight={700} color={color || 'text.primary'} sx={{ mt: 0.3 }}>
                        {value}
                    </Typography>
                    {sub && (
                        <Typography variant="caption" color="text.secondary">{sub}</Typography>
                    )}
                </Box>
                <Box sx={{ p: 1, borderRadius: 1.5, bgcolor: `${color || '#1976d2'}1a` }}>
                    <Icon sx={{ fontSize: 22, color: color || '#1976d2' }} />
                </Box>
            </Stack>
        </CardContent>
    </Card>
);

const CustomPieLabel = ({ cx, cy, midAngle, outerRadius, name, percent }) => {
    if (percent < 0.05) return null;
    const RADIAN = Math.PI / 180;
    const r = outerRadius + 18;
    const x = cx + r * Math.cos(-midAngle * RADIAN);
    const y = cy + r * Math.sin(-midAngle * RADIAN);
    return (
        <text x={x} y={y} fill="#666" textAnchor={x > cx ? 'start' : 'end'} dominantBaseline="central" fontSize={11}>
            {name.replace('-service', '')} ({(percent * 100).toFixed(0)}%)
        </text>
    );
};

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

const CostBreakdown = () => {
    const [data, setData]           = useState(null);
    const [loading, setLoading]     = useState(true);
    const [error, setError]         = useState(null);
    const [period, setPeriod]       = useState('30d');
    const [refreshing, setRefreshing] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);

    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/costs');
            setData(res.data);
        } catch {
            setError('Could not reach cost API. Showing estimated data.');
            setData(buildMockData());
        } finally {
            setLoading(false);
            setRefreshing(false);
            setLastUpdated(new Date());
        }
    }, []);

    useEffect(() => {
        fetchData();
        const id = setInterval(fetchData, 60_000);
        return () => clearInterval(id);
    }, [fetchData]);

    const exportCSV = () => {
        if (!data) return;
        const header = 'Service,Current Cost ($),Budget ($),Utilization (%),Trend (%)';
        const rows = data.services.map(
            (s) => `${s.name},${s.current},${s.budget},${s.utilization},${s.trend}`
        );
        const csv = [header, ...rows].join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = `cost-breakdown-${period}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (loading) {
        return (
            <Box sx={{ py: 8, textAlign: 'center' }}>
                <CircularProgress />
                <Typography variant="body2" color="text.secondary" mt={2}>
                    Loading cost data…
                </Typography>
            </Box>
        );
    }

    const budgetPct = data ? +((data.totalCost / data.totalBudget) * 100).toFixed(1) : 0;
    const budgetAlert = budgetPct > 100 ? 'error' : budgetPct > 80 ? 'warning' : null;

    const pieData = data
        ? data.services.map((s, i) => ({ name: s.name, value: s.current, color: PIE_COLORS[i % PIE_COLORS.length] }))
        : [];

    // Bar chart – current month bars per service (last entry in trend)
    const barData = data ? data.trend : [];

    return (
        <Box>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>Cost Breakdown</Typography>
                        {lastUpdated && (
                            <Typography variant="caption" color="text.secondary">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </Typography>
                        )}
                    </Box>
                    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap">
                        <ToggleButtonGroup
                            value={period}
                            exclusive
                            onChange={(_, v) => v && setPeriod(v)}
                            size="small"
                        >
                            {['7d', '30d', '90d', '12m'].map((p) => (
                                <ToggleButton key={p} value={p} sx={{ fontSize: '0.7rem', px: 1.2 }}>
                                    {p}
                                </ToggleButton>
                            ))}
                        </ToggleButtonGroup>
                        <Button
                            size="small"
                            startIcon={<GetApp fontSize="small" />}
                            variant="outlined"
                            onClick={exportCSV}
                        >
                            CSV
                        </Button>
                        <Tooltip title="Refresh">
                            <span>
                                <IconButton size="small" onClick={() => fetchData(true)} disabled={refreshing}>
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

            <AnimatePresence mode="wait">
                <motion.div
                    key="cost-content"
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Budget alert */}
                    {budgetAlert && (
                        <Alert
                            severity={budgetAlert}
                            icon={budgetAlert === 'error' ? <ErrorIcon /> : <Warning />}
                            sx={{ mb: 2 }}
                        >
                            {budgetAlert === 'error'
                                ? `Budget exceeded! Current spend ($${data.totalCost}) is ${(budgetPct - 100).toFixed(1)}% over budget.`
                                : `Budget warning: ${budgetPct}% of monthly budget consumed.`}
                        </Alert>
                    )}

                    {/* Top stat cards */}
                    <Grid container spacing={2} mb={3}>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}>
                                <StatCard title="Total Monthly Cost" value={formatUSD(data.totalCost)} sub={`of ${formatUSD(data.totalBudget)} budget`} color="#1976d2" icon={AttachMoney} />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                                <StatCard title="Budget Used" value={`${budgetPct}%`} sub={`${formatUSD(data.totalBudget - data.totalCost)} remaining`} color={budgetPct > 100 ? '#f44336' : budgetPct > 80 ? '#ed6c02' : '#2e7d32'} icon={AttachMoney} />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}>
                                <StatCard title="Projected (Month End)" value={formatUSD(data.projected)} sub="based on current pace" color="#9c27b0" icon={TrendingUp} />
                            </motion.div>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                                <StatCard title="Actual vs Projected" value={formatUSD(data.projected - data.totalCost)} sub="projected overage" color={data.projected > data.totalBudget ? '#f44336' : '#2e7d32'} icon={data.projected > data.totalBudget ? TrendingUp : TrendingDown} />
                            </motion.div>
                        </Grid>
                    </Grid>

                    {/* Budget progress bar */}
                    <Paper elevation={0} sx={{ p: 2, mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                        <Stack direction="row" justifyContent="space-between" mb={0.5}>
                            <Typography variant="body2" fontWeight={600}>Monthly Budget Utilisation</Typography>
                            <Typography variant="body2" fontWeight={700} color={budgetPct > 100 ? 'error.main' : budgetPct > 80 ? 'warning.main' : 'success.main'}>
                                {budgetPct}%
                            </Typography>
                        </Stack>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(budgetPct, 100)}
                            color={budgetPct > 100 ? 'error' : budgetPct > 80 ? 'warning' : 'success'}
                            sx={{ height: 10, borderRadius: 5 }}
                        />
                        <Stack direction="row" justifyContent="space-between" mt={0.5}>
                            <Typography variant="caption" color="text.secondary">{formatUSD(data.totalCost)} spent</Typography>
                            <Typography variant="caption" color="text.secondary">Budget: {formatUSD(data.totalBudget)}</Typography>
                        </Stack>
                    </Paper>

                    {/* Charts row */}
                    <Grid container spacing={2} mb={3}>
                        {/* Pie chart */}
                        <Grid item xs={12} md={5}>
                            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" fontWeight={700} mb={1}>Cost by Service</Typography>
                                <ResponsiveContainer width="100%" height={280}>
                                    <PieChart>
                                        <Pie
                                            data={pieData}
                                            cx="50%"
                                            cy="50%"
                                            outerRadius={90}
                                            dataKey="value"
                                            labelLine={false}
                                            label={CustomPieLabel}
                                        >
                                            {pieData.map((entry, i) => (
                                                <Cell key={entry.name} fill={entry.color} />
                                            ))}
                                        </Pie>
                                        <RechartsTooltip formatter={(v) => [`$${v.toFixed(2)}`, 'Cost']} />
                                        <Legend
                                            formatter={(value) => value.replace('-service', '')}
                                            iconSize={10}
                                            wrapperStyle={{ fontSize: 11 }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>

                        {/* Bar chart – 6-month trend */}
                        <Grid item xs={12} md={7}>
                            <Paper elevation={0} sx={{ p: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2, height: '100%' }}>
                                <Typography variant="subtitle2" fontWeight={700} mb={1}>Cost Trend (Last 6 Months)</Typography>
                                <ResponsiveContainer width="100%" height={280}>
                                    <BarChart data={barData} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                                        <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `$${v}`} />
                                        <RechartsTooltip formatter={(v, name) => [`$${Number(v).toFixed(2)}`, name.replace('-service', '')]} />
                                        <Legend formatter={(v) => v.replace('-service', '')} iconSize={10} wrapperStyle={{ fontSize: 11 }} />
                                        {SERVICE_NAMES.map((name, i) => (
                                            <Bar key={name} dataKey={name} stackId="a" fill={PIE_COLORS[i % PIE_COLORS.length]} maxBarSize={40} />
                                        ))}
                                    </BarChart>
                                </ResponsiveContainer>
                            </Paper>
                        </Grid>
                    </Grid>

                    {/* Service breakdown table */}
                    <Paper elevation={0} sx={{ mb: 3, border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Typography variant="subtitle2" fontWeight={700}>Service Cost Breakdown</Typography>
                        </Box>
                        <TableContainer>
                            <Table size="small">
                                <TableHead>
                                    <TableRow sx={{ bgcolor: 'action.hover' }}>
                                        {['Service', 'Current Cost', 'Budget', 'Utilisation', 'Trend'].map((h) => (
                                            <TableCell key={h} sx={{ fontWeight: 700, fontSize: '0.75rem' }}>{h}</TableCell>
                                        ))}
                                    </TableRow>
                                </TableHead>
                                <TableBody>
                                    {data.services.map((svc, i) => (
                                        <motion.tr
                                            key={svc.name}
                                            component="tr"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            transition={{ delay: i * 0.04 }}
                                            style={{ display: 'table-row' }}
                                        >
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={1}>
                                                    <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: PIE_COLORS[i % PIE_COLORS.length], flexShrink: 0 }} />
                                                    <Typography variant="body2" fontWeight={600}>{svc.name}</Typography>
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2" fontWeight={700}>{formatUSD(svc.current)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Typography variant="body2">{formatUSD(svc.budget)}</Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Stack spacing={0.5} sx={{ minWidth: 80 }}>
                                                    <Stack direction="row" justifyContent="space-between">
                                                        <Typography variant="caption"
                                                            color={svc.utilization > 100 ? 'error.main' : svc.utilization > 80 ? 'warning.main' : 'success.main'}
                                                            fontWeight={600}
                                                        >
                                                            {svc.utilization}%
                                                        </Typography>
                                                    </Stack>
                                                    <LinearProgress
                                                        variant="determinate"
                                                        value={Math.min(svc.utilization, 100)}
                                                        color={svc.utilization > 100 ? 'error' : svc.utilization > 80 ? 'warning' : 'success'}
                                                        sx={{ height: 4, borderRadius: 2 }}
                                                    />
                                                </Stack>
                                            </TableCell>
                                            <TableCell>
                                                <Stack direction="row" alignItems="center" spacing={0.3}>
                                                    <TrendIcon value={svc.trend} />
                                                    <Typography
                                                        variant="caption"
                                                        color={svc.trend > 1 ? 'error.main' : svc.trend < -1 ? 'success.main' : 'text.secondary'}
                                                        fontWeight={600}
                                                    >
                                                        {svc.trend > 0 ? '+' : ''}{svc.trend}%
                                                    </Typography>
                                                </Stack>
                                            </TableCell>
                                        </motion.tr>
                                    ))}
                                </TableBody>
                            </Table>
                        </TableContainer>
                    </Paper>

                    {/* Optimisation suggestions */}
                    <Paper elevation={0} sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2, overflow: 'hidden' }}>
                        <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                            <Stack direction="row" alignItems="center" spacing={1}>
                                <Lightbulb sx={{ fontSize: 18, color: '#ed6c02' }} />
                                <Typography variant="subtitle2" fontWeight={700}>Cost Optimisation Suggestions</Typography>
                            </Stack>
                        </Box>
                        <Stack divider={<Divider />}>
                            {OPTIMIZATION_SUGGESTIONS.map((s, i) => (
                                <motion.div
                                    key={s.id}
                                    initial={{ opacity: 0, x: -8 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: 0.1 + i * 0.06 }}
                                >
                                    <Box sx={{ px: 2, py: 1.5 }}>
                                        <Stack direction="row" alignItems="flex-start" spacing={1.5}>
                                            <Chip label={s.severity} color={SEVERITY_COLOR[s.severity]} size="small" sx={{ mt: 0.2, fontSize: '0.65rem', height: 20 }} />
                                            <Box>
                                                <Typography variant="caption" color="text.secondary" fontWeight={600}>{s.service}</Typography>
                                                <Typography variant="body2">{s.text}</Typography>
                                            </Box>
                                        </Stack>
                                    </Box>
                                </motion.div>
                            ))}
                        </Stack>
                    </Paper>
                </motion.div>
            </AnimatePresence>
        </Box>
    );
};

export default CostBreakdown;
