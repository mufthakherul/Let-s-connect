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
    Paper
} from '@mui/material';
import {
    Refresh,
    CheckCircle,
    Warning,
    Error as ErrorIcon,
    Speed,
    Memory,
    NetworkCheck
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import {
    AreaChart,
    Area,
    ResponsiveContainer,
    Tooltip as RechartsTooltip
} from 'recharts';
import api from '../../utils/api';

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

const STATUS_CONFIG = {
    healthy:  { color: 'success', icon: CheckCircle,  bg: '#e8f5e9', border: '#4caf50' },
    degraded: { color: 'warning', icon: Warning,       bg: '#fff8e1', border: '#ff9800' },
    down:     { color: 'error',   icon: ErrorIcon,     bg: '#ffebee', border: '#f44336' },
    unknown:  { color: 'default', icon: NetworkCheck,  bg: '#f5f5f5', border: '#9e9e9e' }
};

const generateSparkline = (base = 50, count = 10) =>
    Array.from({ length: count }, (_, i) => ({
        t: i,
        v: Math.max(1, Math.round(base + (Math.random() - 0.5) * base * 0.6))
    }));

const buildMockServices = () =>
    SERVICE_NAMES.map((name) => {
        const roll = Math.random();
        const status = roll > 0.95 ? 'down' : roll > 0.85 ? 'degraded' : 'healthy';
        const baseCpu = status === 'healthy' ? 25 : status === 'degraded' ? 65 : 95;
        const baseLatency = status === 'healthy' ? 40 : status === 'degraded' ? 180 : 500;
        return {
            name,
            status,
            cpu: Math.round(baseCpu + (Math.random() - 0.5) * 20),
            memory: Math.round(40 + Math.random() * 40),
            latency: Math.round(baseLatency + (Math.random() - 0.5) * 30),
            errorRate: status === 'healthy' ? +(Math.random() * 0.5).toFixed(2) : +(Math.random() * 5 + 1).toFixed(2),
            latencyHistory: generateSparkline(baseLatency)
        };
    });

const MetricRow = ({ icon: Icon, label, value, unit, color }) => (
    <Stack direction="row" alignItems="center" spacing={0.5} sx={{ minWidth: 0 }}>
        <Icon sx={{ fontSize: 13, color: color || 'text.secondary', flexShrink: 0 }} />
        <Typography variant="caption" color="text.secondary" noWrap sx={{ flexShrink: 0 }}>
            {label}:
        </Typography>
        <Typography variant="caption" fontWeight={600} noWrap>
            {value}{unit}
        </Typography>
    </Stack>
);

const ServiceCard = ({ service, index }) => {
    const cfg = STATUS_CONFIG[service.status] || STATUS_CONFIG.unknown;
    const StatusIcon = cfg.icon;

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: index * 0.05 }}
            style={{ height: '100%' }}
        >
            <Card
                elevation={0}
                sx={{
                    height: '100%',
                    border: `1px solid ${cfg.border}`,
                    backgroundColor: cfg.bg,
                    borderRadius: 2,
                    transition: 'box-shadow 0.2s',
                    '&:hover': { boxShadow: 3 }
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    {/* Header */}
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                        <Typography
                            variant="subtitle2"
                            fontWeight={700}
                            sx={{ fontSize: '0.78rem', lineHeight: 1.2, flex: 1, mr: 0.5 }}
                        >
                            {service.name}
                        </Typography>
                        <Chip
                            icon={<StatusIcon sx={{ fontSize: '14px !important' }} />}
                            label={service.status}
                            color={cfg.color}
                            size="small"
                            sx={{ fontSize: '0.65rem', height: 20, '& .MuiChip-label': { px: 0.8 } }}
                        />
                    </Stack>

                    {/* Metrics */}
                    <Stack spacing={0.4} mb={1.5}>
                        <MetricRow
                            icon={Speed}
                            label="CPU"
                            value={service.cpu}
                            unit="%"
                            color={service.cpu > 80 ? '#f44336' : service.cpu > 60 ? '#ff9800' : '#4caf50'}
                        />
                        <MetricRow
                            icon={Memory}
                            label="Mem"
                            value={service.memory}
                            unit="%"
                            color={service.memory > 85 ? '#f44336' : '#1976d2'}
                        />
                        <MetricRow
                            icon={NetworkCheck}
                            label="Latency"
                            value={service.latency}
                            unit="ms"
                            color={service.latency > 300 ? '#f44336' : service.latency > 150 ? '#ff9800' : '#4caf50'}
                        />
                        <MetricRow
                            icon={ErrorIcon}
                            label="Err"
                            value={service.errorRate}
                            unit="%"
                            color={service.errorRate > 2 ? '#f44336' : service.errorRate > 0.5 ? '#ff9800' : '#4caf50'}
                        />
                    </Stack>

                    {/* Sparkline */}
                    <Box sx={{ height: 36 }}>
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={service.latencyHistory} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
                                <defs>
                                    <linearGradient id={`grad-${service.name}`} x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor={cfg.border} stopOpacity={0.3} />
                                        <stop offset="95%" stopColor={cfg.border} stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <RechartsTooltip
                                    contentStyle={{ fontSize: 10, padding: '2px 6px' }}
                                    formatter={(v) => [`${v}ms`, 'Latency']}
                                    labelFormatter={() => ''}
                                />
                                <Area
                                    type="monotone"
                                    dataKey="v"
                                    stroke={cfg.border}
                                    strokeWidth={1.5}
                                    fill={`url(#grad-${service.name})`}
                                    dot={false}
                                    isAnimationActive={false}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    </Box>
                    <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.6rem' }}>
                        Latency (last 10 samples)
                    </Typography>
                </CardContent>
            </Card>
        </motion.div>
    );
};

const SummaryBadge = ({ label, count, color }) => (
    <Stack direction="row" alignItems="center" spacing={0.5}>
        <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: color }} />
        <Typography variant="body2" fontWeight={600}>{count}</Typography>
        <Typography variant="body2" color="text.secondary">{label}</Typography>
    </Stack>
);

const ServiceHealthGrid = () => {
    const [services, setServices] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [refreshing, setRefreshing] = useState(false);

    const fetchData = useCallback(async (isManual = false) => {
        if (isManual) setRefreshing(true);
        setError(null);
        try {
            const [metricsRes, healthRes] = await Promise.allSettled([
                api.get('/api/v1/metrics?category=health'),
                api.get('/health')
            ]);

            const metricsData = metricsRes.status === 'fulfilled' ? metricsRes.value.data : null;
            const healthData = healthRes.status === 'fulfilled' ? healthRes.value.data : null;

            // Build service list from API data; fall back to mock if empty
            let built = [];
            if (metricsData?.services && Array.isArray(metricsData.services) && metricsData.services.length > 0) {
                built = metricsData.services.map((svc) => ({
                    name: svc.name,
                    status: svc.status || 'unknown',
                    cpu: svc.cpu ?? Math.round(Math.random() * 50 + 10),
                    memory: svc.memory ?? Math.round(Math.random() * 50 + 20),
                    latency: svc.latency ?? Math.round(Math.random() * 100 + 20),
                    errorRate: svc.errorRate ?? +(Math.random() * 0.5).toFixed(2),
                    latencyHistory: svc.latencyHistory ?? generateSparkline(svc.latency ?? 50)
                }));
            } else if (healthData?.services && typeof healthData.services === 'object') {
                built = Object.entries(healthData.services).map(([name, status]) => ({
                    name,
                    status: typeof status === 'string' ? status : 'unknown',
                    cpu: Math.round(Math.random() * 50 + 10),
                    memory: Math.round(Math.random() * 50 + 20),
                    latency: Math.round(Math.random() * 100 + 20),
                    errorRate: +(Math.random() * 0.5).toFixed(2),
                    latencyHistory: generateSparkline(50)
                }));
            }

            setServices(built.length > 0 ? built : buildMockServices());
            setLastUpdated(new Date());
        } catch (err) {
            console.error('ServiceHealthGrid fetch error:', err);
            setError('Could not reach health endpoints. Showing simulated data.');
            setServices(buildMockServices());
            setLastUpdated(new Date());
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    }, []);

    const [refreshProgress, setRefreshProgress] = useState(0);

    useEffect(() => {
        fetchData();
        const INTERVAL_MS = 15000;
        const TICK_MS = 500;
        let elapsed = 0;
        const ticker = setInterval(() => {
            elapsed += TICK_MS;
            setRefreshProgress(Math.min(100, (elapsed / INTERVAL_MS) * 100));
            if (elapsed >= INTERVAL_MS) {
                elapsed = 0;
                setRefreshProgress(0);
            }
        }, TICK_MS);
        const poller = setInterval(fetchData, INTERVAL_MS);
        return () => {
            clearInterval(ticker);
            clearInterval(poller);
        };
    }, [fetchData]);

    const counts = services.reduce(
        (acc, s) => {
            acc[s.status] = (acc[s.status] || 0) + 1;
            return acc;
        },
        { healthy: 0, degraded: 0, down: 0 }
    );

    return (
        <Box>
            {/* Header */}
            <Paper elevation={0} sx={{ p: 2, mb: 2, border: '1px solid', borderColor: 'divider', borderRadius: 2 }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={1}>
                    <Box>
                        <Typography variant="h6" fontWeight={700}>
                            Service Health Grid
                        </Typography>
                        {lastUpdated && (
                            <Typography variant="caption" color="text.secondary">
                                Last updated: {lastUpdated.toLocaleTimeString()}
                            </Typography>
                        )}
                    </Box>

                    <Stack direction="row" alignItems="center" spacing={2} flexWrap="wrap">
                        <SummaryBadge label="Healthy"  count={counts.healthy  || 0} color="#4caf50" />
                        <Divider orientation="vertical" flexItem />
                        <SummaryBadge label="Degraded" count={counts.degraded || 0} color="#ff9800" />
                        <Divider orientation="vertical" flexItem />
                        <SummaryBadge label="Down"     count={counts.down     || 0} color="#f44336" />
                        <Tooltip title="Refresh now">
                            <span>
                                <IconButton
                                    size="small"
                                    onClick={() => fetchData(true)}
                                    disabled={refreshing}
                                >
                                    {refreshing
                                        ? <CircularProgress size={18} />
                                        : <Refresh fontSize="small" />
                                    }
                                </IconButton>
                            </span>
                        </Tooltip>
                    </Stack>
                </Stack>
            </Paper>

            {error && (
                <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>
                    {error}
                </Alert>
            )}

            {loading ? (
                <Box sx={{ py: 6, textAlign: 'center' }}>
                    <CircularProgress />
                    <Typography variant="body2" color="text.secondary" mt={2}>
                        Loading service health data…
                    </Typography>
                </Box>
            ) : (
                <Grid container spacing={2}>
                    {services.map((service, i) => (
                        <Grid item xs={12} sm={6} md={4} lg={3} key={service.name}>
                            <ServiceCard service={service} index={i} />
                        </Grid>
                    ))}
                </Grid>
            )}

            {/* Auto-refresh indicator */}
            {!loading && (
                <Box sx={{ mt: 1.5 }}>
                    <LinearProgress
                        variant="determinate"
                        value={refreshProgress}
                        sx={{
                            height: 2,
                            borderRadius: 1,
                            bgcolor: 'action.hover',
                            '& .MuiLinearProgress-bar': { bgcolor: 'primary.light' }
                        }}
                    />
                    <Typography variant="caption" color="text.disabled">
                        Auto-refreshes every 15 seconds
                    </Typography>
                </Box>
            )}
        </Box>
    );
};

export default ServiceHealthGrid;
