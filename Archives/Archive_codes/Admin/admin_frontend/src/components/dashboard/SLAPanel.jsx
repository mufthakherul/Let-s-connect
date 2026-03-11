import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardHeader,
    Chip, Alert, Button, LinearProgress, Tooltip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
    Paper, IconButton, CircularProgress
} from '@mui/material';
import {
    TrendingUp, TrendingDown, TrendingFlat,
    Warning, CheckCircle, Error as ErrorIcon,
    Refresh, Timeline, Speed, Assessment
} from '@mui/icons-material';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, ReferenceLine, Legend
} from 'recharts';
import api from '../../utils/api';

const statusColor = (status) => {
    const m = { ok: 'success', at_risk: 'warning', breached: 'error', no_data: 'default' };
    return m[status] || 'default';
};

const riskColor = (risk) => {
    const m = { high: '#f44336', medium: '#ff9800', low: '#4caf50', unknown: '#9e9e9e' };
    return m[risk] || '#9e9e9e';
};

const trendIcon = (trend) => {
    if (trend === 'degrading' || trend === 'increasing') return <TrendingDown color="error" fontSize="small" />;
    if (trend === 'improving' || trend === 'decreasing') return <TrendingUp color="success" fontSize="small" />;
    return <TrendingFlat color="disabled" fontSize="small" />;
};

/**
 * SLA Monitoring Panel — Phase E
 * Shows SLO compliance status, breach predictions, and trends.
 */
const SLAPanel = () => {
    const [slaData, setSlaData] = useState(null);
    const [predictions, setPredictions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [simulating, setSimulating] = useState(false);

    const fetchSLA = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [slaRes, predRes] = await Promise.all([
                api.get('/api/admin/sla').catch(() => ({ data: null })),
                api.get('/api/admin/sla/predict').catch(() => ({ data: { predictions: [] } })),
            ]);
            setSlaData(slaRes.data);
            setPredictions(predRes.data?.predictions || []);
        } catch (err) {
            setError(err.message);
            // Use mock data for demo
            setSlaData({
                summary: { total: 4, ok: 2, atRisk: 1, breached: 0, noData: 1, highRisk: 0 },
                statuses: [],
            });
        } finally {
            setLoading(false);
        }
    }, []);

    const simulateMeasurements = async () => {
        setSimulating(true);
        try {
            await api.post('/api/admin/sla/simulate', { count: 5 });
            await fetchSLA();
        } catch (_) { /* ignore */ }
        setSimulating(false);
    };

    useEffect(() => { fetchSLA(); }, [fetchSLA]);

    const summary = slaData?.summary || { total: 0, ok: 0, atRisk: 0, breached: 0, noData: 0 };
    const statuses = slaData?.statuses || [];

    const summaryCards = [
        { label: 'Total SLOs', value: summary.total, color: 'primary' },
        { label: 'OK', value: summary.ok, color: 'success' },
        { label: 'At Risk', value: summary.atRisk, color: 'warning' },
        { label: 'Breached', value: summary.breached, color: 'error' },
    ];

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Typography variant="h5" fontWeight="bold">
                    📋 SLA Monitoring & Breach Prediction
                </Typography>
                <Box>
                    <Tooltip title="Simulate measurements (demo)">
                        <Button
                            variant="outlined"
                            size="small"
                            onClick={simulateMeasurements}
                            disabled={simulating}
                            sx={{ mr: 1 }}
                        >
                            {simulating ? <CircularProgress size={16} sx={{ mr: 1 }} /> : null}
                            Simulate Data
                        </Button>
                    </Tooltip>
                    <IconButton onClick={fetchSLA} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : <Refresh />}
                    </IconButton>
                </Box>
            </Box>

            {error && <Alert severity="warning" sx={{ mb: 2 }}>{error} — showing mock data</Alert>}

            {/* Summary Cards */}
            <Grid container spacing={2} mb={3}>
                {summaryCards.map(card => (
                    <Grid item xs={6} sm={3} key={card.label}>
                        <Card elevation={2}>
                            <CardContent sx={{ textAlign: 'center', py: 2 }}>
                                <Typography variant="h3" fontWeight="bold" color={`${card.color}.main`}>
                                    {card.value}
                                </Typography>
                                <Typography variant="body2" color="text.secondary">{card.label}</Typography>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            {/* SLO Status Table */}
            <Card sx={{ mb: 3 }}>
                <CardHeader title="SLO Compliance Status" />
                <TableContainer>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>SLO</TableCell>
                                <TableCell>Service</TableCell>
                                <TableCell align="right">Target</TableCell>
                                <TableCell align="right">Current</TableCell>
                                <TableCell align="right">Avg</TableCell>
                                <TableCell>Status</TableCell>
                                <TableCell>Breach Risk</TableCell>
                                <TableCell>Trend</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {statuses.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={8} align="center">
                                        <Typography variant="body2" color="text.secondary">
                                            No SLO data. Click "Simulate Data" to generate sample measurements.
                                        </Typography>
                                    </TableCell>
                                </TableRow>
                            ) : statuses.map((s) => (
                                <TableRow key={s.slo?.id} hover>
                                    <TableCell>
                                        <Typography variant="body2" fontWeight="medium">{s.slo?.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">{s.slo?.description}</Typography>
                                    </TableCell>
                                    <TableCell>
                                        <Chip label={s.slo?.service} size="small" variant="outlined" />
                                    </TableCell>
                                    <TableCell align="right">
                                        {s.slo?.target}{s.slo?.unit === 'percent' ? '%' : ` ${s.slo?.unit}`}
                                    </TableCell>
                                    <TableCell align="right">
                                        {s.current !== null ? `${s.current}` : 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">
                                        {s.avg !== null ? `${s.avg}` : 'N/A'}
                                    </TableCell>
                                    <TableCell>
                                        <Chip
                                            label={s.status}
                                            color={statusColor(s.status)}
                                            size="small"
                                            icon={s.status === 'ok' ? <CheckCircle /> : s.status === 'breached' ? <ErrorIcon /> : <Warning />}
                                        />
                                    </TableCell>
                                    <TableCell>
                                        {s.breachRisk && (
                                            <Tooltip title={s.breachRisk.hoursUntilBreach ? `Breach in ~${s.breachRisk.hoursUntilBreach}h` : 'No imminent breach'}>
                                                <Chip
                                                    label={s.breachRisk.risk}
                                                    size="small"
                                                    sx={{ bgcolor: riskColor(s.breachRisk.risk), color: 'white' }}
                                                />
                                            </Tooltip>
                                        )}
                                    </TableCell>
                                    <TableCell>
                                        {s.breachRisk && (
                                            <Box display="flex" alignItems="center" gap={0.5}>
                                                {trendIcon(s.breachRisk.trend)}
                                                <Typography variant="caption">{s.breachRisk.trend}</Typography>
                                            </Box>
                                        )}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Card>

            {/* Predictions */}
            {predictions.length > 0 && (
                <Card>
                    <CardHeader
                        title="⚠ Breach Predictions"
                        subheader="SLOs at risk of violating their targets"
                    />
                    <CardContent>
                        {predictions.map((p, i) => (
                            <Alert
                                key={i}
                                severity={p.breachRisk?.risk === 'high' ? 'error' : 'warning'}
                                sx={{ mb: 1 }}
                                icon={<Warning />}
                            >
                                <strong>{p.slo?.name}</strong> ({p.slo?.service}) —{' '}
                                {p.breachRisk?.hoursUntilBreach
                                    ? `predicted breach in ~${p.breachRisk.hoursUntilBreach} hours`
                                    : 'degrading trend detected'
                                }
                                {' '}| Trend: {p.breachRisk?.trend} | Slope: {p.breachRisk?.slope}
                            </Alert>
                        ))}
                    </CardContent>
                </Card>
            )}
        </Box>
    );
};

export default SLAPanel;
