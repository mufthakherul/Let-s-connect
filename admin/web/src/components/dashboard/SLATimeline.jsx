import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, Chip, Button,
    FormControl, InputLabel, Select, MenuItem, Alert, Stack,
    CircularProgress, Tooltip, Divider, Paper, LinearProgress
} from '@mui/material';
import {
    CheckCircle, Warning, Error as ErrorIcon, Download, Refresh,
    Timeline as TimelineIcon, Speed, CloudDone, AccessTime
} from '@mui/icons-material';
import {
    ComposedChart, Scatter, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceArea, Legend,
    ReferenceLine
} from 'recharts';
import { motion } from 'framer-motion';
import api from '../../utils/api';

// ── mock data ─────────────────────────────────────────────────────────────────

const SERVICES = ['auth-service', 'user-service', 'messaging-service', 'api-gateway', 'notification-service'];

function generateMockSLA() {
    const now = Date.now();
    const breaches = [];
    SERVICES.forEach(svc => {
        const count = Math.floor(Math.random() * 4);
        for (let i = 0; i < count; i++) {
            const daysAgo = Math.floor(Math.random() * 30);
            const start   = new Date(now - daysAgo * 86_400_000 - Math.random() * 3_600_000);
            const durationMin = Math.floor(Math.random() * 45) + 2;
            breaches.push({
                id:         `breach-${svc}-${i}`,
                service:    svc,
                start:      start.toISOString(),
                end:        new Date(start.getTime() + durationMin * 60_000).toISOString(),
                durationMin,
                severity:   Math.random() > 0.6 ? 'critical' : 'warning',
                resolved:   Math.random() > 0.2,
                metric:     Math.random() > 0.5 ? 'latency' : 'error_rate',
                value:      Math.random() > 0.5 ? (Math.random() * 2000 + 500).toFixed(0) + 'ms' : (Math.random() * 5 + 1).toFixed(2) + '%',
            });
        }
    });

    const overview = SERVICES.map(svc => ({
        service:      svc,
        availability: (99 + Math.random() * 0.99).toFixed(3),
        responseTime: Math.floor(Math.random() * 300 + 80),
        errorRate:    (Math.random() * 1.5).toFixed(2),
        uptime:       (99 + Math.random() * 0.98).toFixed(3),
    }));

    return { breaches, overview };
}

// ── helpers ───────────────────────────────────────────────────────────────────

const BREACH_COLOR = { critical: '#f44336', warning: '#ff9800', resolved: '#4caf50' };

function breachColor(b) {
    if (b.resolved) return BREACH_COLOR.resolved;
    return BREACH_COLOR[b.severity] || '#ff9800';
}

function downloadCSV(data) {
    const header = 'service,start,end,durationMin,severity,resolved,metric,value\n';
    const body   = data.map(b =>
        [b.service, b.start, b.end, b.durationMin, b.severity, b.resolved, b.metric, b.value]
            .map(v => `"${String(v).replace(/"/g, '""')}"`)
            .join(',')
    ).join('\n');
    const blob = new Blob([header + body], { type: 'text/csv' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `sla-report-${Date.now()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

// ── circular SLA gauge ────────────────────────────────────────────────────────

const SLAGauge = ({ label, value, unit = '%', icon, color }) => {
    const pct = Math.min(100, Math.max(0, parseFloat(value)));
    return (
        <Card variant="outlined" component={motion.div} whileHover={{ y: -2 }} sx={{ height: '100%' }}>
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box position="relative" display="inline-flex" mb={1}>
                    <CircularProgress
                        variant="determinate"
                        value={100}
                        size={72}
                        thickness={4}
                        sx={{ color: 'action.hover', position: 'absolute' }}
                    />
                    <CircularProgress
                        variant="determinate"
                        value={pct}
                        size={72}
                        thickness={4}
                        sx={{ color }}
                    />
                    <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        {icon}
                    </Box>
                </Box>
                <Typography variant="h6" fontWeight={700}>{value}{unit}</Typography>
                <Typography variant="caption" color="text.secondary">{label}</Typography>
            </CardContent>
        </Card>
    );
};

// ── custom scatter dot ────────────────────────────────────────────────────────

const BreachDot = (props) => {
    const { cx, cy, payload } = props;
    const color = breachColor(payload);
    return (
        <circle cx={cx} cy={cy} r={payload.severity === 'critical' ? 7 : 5}
            fill={color} stroke="#fff" strokeWidth={1.5} opacity={0.85} />
    );
};

// ── custom tooltip ────────────────────────────────────────────────────────────

const BreachTooltip = ({ active, payload }) => {
    if (!active || !payload?.length) return null;
    const b = payload[0].payload;
    return (
        <Paper sx={{ p: 1.5, maxWidth: 240 }} elevation={3}>
            <Typography variant="caption" fontWeight={700}>{b.service}</Typography>
            <Typography variant="caption" display="block">
                {new Date(b.start).toLocaleString()}
            </Typography>
            <Stack direction="row" spacing={0.5} mt={0.5} alignItems="center">
                <Chip size="small" label={b.severity} color={b.severity === 'critical' ? 'error' : 'warning'} />
                {b.resolved && <Chip size="small" label="resolved" color="success" />}
            </Stack>
            <Typography variant="caption" display="block" mt={0.5}>
                Duration: {b.durationMin} min | {b.metric}: {b.value}
            </Typography>
        </Paper>
    );
};

// ── main component ────────────────────────────────────────────────────────────

const SLATimeline = () => {
    const [slaData,  setSlaData]  = useState(null);
    const [loading,  setLoading]  = useState(false);
    const [error,    setError]    = useState(null);
    const [service,  setService]  = useState('all');

    const fetchSLA = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await api.get('/api/v1/sla');
            setSlaData(res.data);
        } catch {
            setSlaData(generateMockSLA());
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchSLA(); }, [fetchSLA]);

    if (loading && !slaData) {
        return (
            <Box>
                <Typography variant="h6" fontWeight={700} mb={2}>SLA Timeline</Typography>
                <LinearProgress />
            </Box>
        );
    }

    const breaches = slaData?.breaches || [];
    const overview = slaData?.overview || [];

    const filteredBreaches = service === 'all'
        ? breaches
        : breaches.filter(b => b.service === service);

    // Build scatter data: x = day-of-year (0..29), y = service index
    const serviceList = [...new Set(breaches.map(b => b.service))].sort();
    const now = Date.now();

    const scatterData = filteredBreaches.map(b => {
        const daysAgo = (now - new Date(b.start).getTime()) / 86_400_000;
        return {
            ...b,
            x: Math.min(30, Math.max(0, 30 - daysAgo)),
            y: serviceList.indexOf(b.service),
        };
    });

    // Summary stats
    const totalBreaches = filteredBreaches.length;
    const resolved      = filteredBreaches.filter(b => b.resolved).length;
    const mttr          = filteredBreaches.length
        ? Math.round(filteredBreaches.reduce((s, b) => s + b.durationMin, 0) / filteredBreaches.length)
        : 0;
    const compliancePct = totalBreaches === 0 ? 100 : Math.max(0, 100 - totalBreaches * 2).toFixed(1);

    // Aggregate overview for selected service
    const overviewData = service === 'all'
        ? {
            availability: overview.length ? (overview.reduce((s, o) => s + parseFloat(o.availability), 0) / overview.length).toFixed(3) : '—',
            responseTime: overview.length ? Math.round(overview.reduce((s, o) => s + o.responseTime, 0) / overview.length) : '—',
            errorRate:    overview.length ? (overview.reduce((s, o) => s + parseFloat(o.errorRate), 0) / overview.length).toFixed(2) : '—',
            uptime:       overview.length ? (overview.reduce((s, o) => s + parseFloat(o.uptime), 0) / overview.length).toFixed(3) : '—',
          }
        : (overview.find(o => o.service === service) || {});

    const allGreen = totalBreaches === 0;

    return (
        <Box>
            {/* Header */}
            <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
                <Stack direction="row" spacing={1} alignItems="center">
                    <TimelineIcon color="primary" />
                    <Typography variant="h6" fontWeight={700}>SLA Timeline</Typography>
                    <Chip
                        icon={allGreen ? <CheckCircle /> : <Warning />}
                        label={allGreen ? 'All Services Compliant' : `${totalBreaches} Breach${totalBreaches !== 1 ? 'es' : ''}`}
                        color={allGreen ? 'success' : 'warning'}
                        size="small"
                    />
                </Stack>
                <Stack direction="row" spacing={1}>
                    <FormControl size="small" sx={{ minWidth: 180 }}>
                        <InputLabel>Service</InputLabel>
                        <Select value={service} label="Service" onChange={e => setService(e.target.value)}>
                            <MenuItem value="all">All Services</MenuItem>
                            {serviceList.map(s => <MenuItem key={s} value={s}>{s}</MenuItem>)}
                        </Select>
                    </FormControl>
                    <Tooltip title="Refresh">
                        <Button size="small" variant="outlined" onClick={fetchSLA} disabled={loading} startIcon={<Refresh />}>
                            Refresh
                        </Button>
                    </Tooltip>
                    <Button size="small" variant="outlined" startIcon={<Download />}
                        onClick={() => downloadCSV(filteredBreaches)}>
                        Export CSV
                    </Button>
                </Stack>
            </Stack>

            {error && <Alert severity="warning" sx={{ mb: 2 }}>API unavailable — showing mock data.</Alert>}

            {/* SLA Overview Gauges */}
            <Grid container spacing={2} mb={3}>
                {[
                    { label: 'Availability', value: overviewData.availability, unit: '%', icon: <CloudDone fontSize="small" sx={{ color: '#4caf50' }} />, color: '#4caf50' },
                    { label: 'Avg Response', value: overviewData.responseTime, unit: 'ms', icon: <Speed fontSize="small" sx={{ color: '#2196f3' }} />, color: '#2196f3' },
                    { label: 'Error Rate',   value: overviewData.errorRate,    unit: '%', icon: <ErrorIcon fontSize="small" sx={{ color: '#f44336' }} />, color: '#f44336' },
                    { label: 'Uptime',       value: overviewData.uptime,       unit: '%', icon: <AccessTime fontSize="small" sx={{ color: '#9c27b0' }} />, color: '#9c27b0' },
                ].map(g => (
                    <Grid item xs={6} sm={3} key={g.label}>
                        <SLAGauge {...g} />
                    </Grid>
                ))}
            </Grid>

            {/* Summary Stats */}
            <Stack direction="row" spacing={3} mb={2} flexWrap="wrap">
                <Box>
                    <Typography variant="caption" color="text.secondary">Total Breaches</Typography>
                    <Typography variant="h5" fontWeight={700} color={totalBreaches > 0 ? 'error.main' : 'success.main'}>
                        {totalBreaches}
                    </Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                    <Typography variant="caption" color="text.secondary">Resolved</Typography>
                    <Typography variant="h5" fontWeight={700}>{resolved}</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                    <Typography variant="caption" color="text.secondary">MTTR</Typography>
                    <Typography variant="h5" fontWeight={700}>{mttr} min</Typography>
                </Box>
                <Divider orientation="vertical" flexItem />
                <Box>
                    <Typography variant="caption" color="text.secondary">Compliance</Typography>
                    <Typography variant="h5" fontWeight={700} color={compliancePct >= 99 ? 'success.main' : 'warning.main'}>
                        {compliancePct}%
                    </Typography>
                </Box>
            </Stack>

            {/* Breach Timeline Chart */}
            <Paper variant="outlined" sx={{ p: 2 }}>
                <Typography variant="subtitle2" mb={2}>Breach Events — Last 30 Days</Typography>
                {scatterData.length === 0 ? (
                    <Box textAlign="center" py={4}>
                        <CheckCircle color="success" sx={{ fontSize: 40 }} />
                        <Typography color="text.secondary" mt={1}>No breaches in the selected period.</Typography>
                    </Box>
                ) : (
                    <ResponsiveContainer width="100%" height={Math.max(180, serviceList.length * 50 + 60)}>
                        <ComposedChart data={scatterData} margin={{ top: 10, right: 20, left: 10, bottom: 10 }}>
                            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                            <XAxis
                                dataKey="x"
                                type="number"
                                domain={[0, 30]}
                                tickFormatter={v => `D-${Math.round(30 - v)}`}
                                label={{ value: 'Days ago', position: 'insideBottom', offset: -4, fontSize: 11 }}
                                tick={{ fontSize: 10 }}
                            />
                            <YAxis
                                dataKey="y"
                                type="number"
                                domain={[-0.5, serviceList.length - 0.5]}
                                tickFormatter={v => serviceList[Math.round(v)] || ''}
                                tick={{ fontSize: 10 }}
                                width={130}
                            />
                            <RechartsTooltip content={<BreachTooltip />} />
                            {/* SLA boundary */}
                            <ReferenceArea x1={0} x2={30} y1={-0.5} y2={serviceList.length - 0.5}
                                fill="rgba(76,175,80,0.03)" />
                            <ReferenceLine x={0} stroke="#e0e0e0" strokeDasharray="4 2" />
                            <Scatter
                                data={scatterData}
                                shape={<BreachDot />}
                                isAnimationActive
                            />
                        </ComposedChart>
                    </ResponsiveContainer>
                )}

                {/* Legend */}
                <Stack direction="row" spacing={2} mt={1} justifyContent="center">
                    {[
                        { color: BREACH_COLOR.critical, label: 'Critical' },
                        { color: BREACH_COLOR.warning,  label: 'Warning'  },
                        { color: BREACH_COLOR.resolved, label: 'Resolved' },
                    ].map(l => (
                        <Stack key={l.label} direction="row" spacing={0.5} alignItems="center">
                            <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: l.color }} />
                            <Typography variant="caption">{l.label}</Typography>
                        </Stack>
                    ))}
                </Stack>
            </Paper>
        </Box>
    );
};

export default SLATimeline;
