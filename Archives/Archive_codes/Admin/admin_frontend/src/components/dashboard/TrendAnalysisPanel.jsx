import React, { useState, useEffect, useCallback } from 'react';
import {
    Box, Typography, Grid, Card, CardContent, CardHeader,
    Chip, Alert, Button, IconButton, CircularProgress,
    FormControl, InputLabel, Select, MenuItem, Table,
    TableBody, TableCell, TableContainer, TableHead, TableRow
} from '@mui/material';
import {
    TrendingUp, TrendingDown, TrendingFlat, Refresh,
    Analytics, ShowChart, BubbleChart, Assessment
} from '@mui/icons-material';
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip, ResponsiveContainer, Legend,
    AreaChart, Area, BarChart, Bar, ReferenceLine, Brush
} from 'recharts';
import api from '../../utils/api';

const COLORS = ['#2196f3', '#4caf50', '#ff9800', '#e91e63', '#9c27b0', '#00bcd4'];

const trendIcon = (trend) => {
    if (trend === 'increasing') return <TrendingUp color="warning" fontSize="small" />;
    if (trend === 'decreasing') return <TrendingDown color="success" fontSize="small" />;
    return <TrendingFlat color="action" fontSize="small" />;
};

/**
 * Trend Analysis & Visualization Panel — Phase E
 * Shows metric trends, forecasts, anomaly detection, and charts.
 */
const TrendAnalysisPanel = () => {
    const [reports, setReports] = useState([]);
    const [anomalies, setAnomalies] = useState({});
    const [selectedCategory, setSelectedCategory] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);

    const fetchTrends = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const [trendsRes, anomalyRes] = await Promise.all([
                api.get('/api/admin/trends').catch(() => ({ data: { reports: [] } })),
                api.get('/api/admin/trends/anomalies').catch(() => ({ data: { anomalies: {} } })),
            ]);
            const fetchedReports = trendsRes.data?.reports || [];
            setReports(fetchedReports);
            setAnomalies(anomalyRes.data?.anomalies || {});
            if (fetchedReports.length > 0 && !selectedCategory) {
                setSelectedCategory(fetchedReports[0].name);
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }, [selectedCategory]);

    useEffect(() => { fetchTrends(); }, []);

    const selectedReport = reports.find(r => r.name === selectedCategory);
    const categories = reports.map(r => r.name).filter(Boolean);

    // Build chart data from reports
    const buildForecastData = (report) => {
        if (!report || !report.forecast) return [];
        return report.forecast.map((val, i) => ({
            step: `+${i + 1}`,
            value: val,
            type: 'forecast',
        }));
    };

    const buildSparklineData = (sparkStr) => {
        if (!sparkStr) return [];
        // Parse sparkline string to numeric values (approx)
        const blocks = ['▁', '▂', '▃', '▄', '▅', '▆', '▇', '█'];
        return sparkStr.split('').map((c, i) => {
            const level = blocks.indexOf(c);
            return { x: i, value: level >= 0 ? (level + 1) * 12.5 : 0 };
        });
    };

    return (
        <Box sx={{ p: 3 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
                <Box display="flex" alignItems="center" gap={1}>
                    <Analytics color="primary" />
                    <Typography variant="h5" fontWeight="bold">
                        Trend Analysis & Visualization
                    </Typography>
                </Box>
                <Box display="flex" gap={1}>
                    {categories.length > 0 && (
                        <FormControl size="small" sx={{ minWidth: 150 }}>
                            <InputLabel>Category</InputLabel>
                            <Select value={selectedCategory} onChange={e => setSelectedCategory(e.target.value)} label="Category">
                                {categories.map(c => <MenuItem key={c} value={c}>{c}</MenuItem>)}
                            </Select>
                        </FormControl>
                    )}
                    <IconButton onClick={fetchTrends} disabled={loading}>
                        {loading ? <CircularProgress size={20} /> : <Refresh />}
                    </IconButton>
                </Box>
            </Box>

            {error && <Alert severity="warning" sx={{ mb: 2 }} onClose={() => setError(null)}>{error}</Alert>}

            {reports.length === 0 ? (
                <Alert severity="info" icon={<Analytics />}>
                    No metric data available. Record metrics via CLI:
                    <Typography variant="caption" display="block" sx={{ mt: 0.5, fontFamily: 'monospace' }}>
                        node admin-cli/index.js metrics record --category cpu --value 45 --service api-gateway
                    </Typography>
                </Alert>
            ) : (
                <>
                    {/* Summary Cards */}
                    <Grid container spacing={2} mb={3}>
                        {reports.slice(0, 4).map((r, i) => (
                            <Grid item xs={6} sm={3} key={r.name}>
                                <Card
                                    elevation={2}
                                    sx={{ cursor: 'pointer', border: selectedCategory === r.name ? '2px solid' : 'none', borderColor: 'primary.main' }}
                                    onClick={() => setSelectedCategory(r.name)}
                                >
                                    <CardContent sx={{ py: 2 }}>
                                        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
                                            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
                                                {r.name}
                                            </Typography>
                                            {trendIcon(r.regression?.trend)}
                                        </Box>
                                        <Typography variant="h4" fontWeight="bold" sx={{ color: COLORS[i % COLORS.length] }}>
                                            {r.current}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {r.count} samples | avg: {r.mean}
                                        </Typography>
                                        {r.anomalies > 0 && (
                                            <Chip label={`${r.anomalies} anomaly`} size="small" color="warning" sx={{ mt: 0.5 }} />
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Detailed Chart for Selected Category */}
                    {selectedReport && (
                        <Card sx={{ mb: 3 }}>
                            <CardHeader
                                title={
                                    <Box display="flex" alignItems="center" gap={1}>
                                        <ShowChart />
                                        <span>{selectedReport.name} — Trend & Forecast</span>
                                        {trendIcon(selectedReport.regression?.trend)}
                                    </Box>
                                }
                                subheader={`n=${selectedReport.count} | slope=${selectedReport.regression?.slope} | R²=${selectedReport.regression?.r2} | anomalies: ${selectedReport.anomalies}`}
                            />
                            <CardContent>
                                <Grid container spacing={3}>
                                    {/* Sparkline as approximate chart */}
                                    <Grid item xs={12} md={8}>
                                        <Typography variant="subtitle2" gutterBottom>Historical Trend (sparkline)</Typography>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <AreaChart data={buildSparklineData(selectedReport.sparkline)}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="x" hide />
                                                <YAxis domain={[0, 100]} hide />
                                                <RechartsTooltip formatter={(val) => [`${val.toFixed(1)}%`, 'Level']} />
                                                <Area type="monotone" dataKey="value" stroke={COLORS[0]} fill={`${COLORS[0]}40`} strokeWidth={2} dot={false} />
                                            </AreaChart>
                                        </ResponsiveContainer>
                                    </Grid>

                                    {/* Forecast */}
                                    <Grid item xs={12} md={4}>
                                        <Typography variant="subtitle2" gutterBottom>Forecast (next {selectedReport.forecast?.length} steps)</Typography>
                                        <ResponsiveContainer width="100%" height={160}>
                                            <BarChart data={buildForecastData(selectedReport)}>
                                                <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                                                <XAxis dataKey="step" />
                                                <YAxis />
                                                <RechartsTooltip />
                                                <Bar dataKey="value" fill={COLORS[1]} name="Forecast" />
                                            </BarChart>
                                        </ResponsiveContainer>
                                    </Grid>
                                </Grid>

                                {/* Stats */}
                                <Grid container spacing={2} mt={1}>
                                    {[
                                        { label: 'Min', value: selectedReport.min },
                                        { label: 'Mean', value: selectedReport.mean },
                                        { label: 'Max', value: selectedReport.max },
                                        { label: 'p50', value: selectedReport.percentiles?.p50 },
                                        { label: 'p95', value: selectedReport.percentiles?.p95 },
                                        { label: 'p99', value: selectedReport.percentiles?.p99 },
                                    ].map(stat => (
                                        <Grid item xs={4} sm={2} key={stat.label}>
                                            <Box textAlign="center">
                                                <Typography variant="caption" color="text.secondary">{stat.label}</Typography>
                                                <Typography variant="body2" fontWeight="bold">{stat.value ?? 'N/A'}</Typography>
                                            </Box>
                                        </Grid>
                                    ))}
                                </Grid>
                            </CardContent>
                        </Card>
                    )}

                    {/* Anomaly Summary */}
                    {Object.keys(anomalies).length > 0 && (
                        <Card>
                            <CardHeader title="🔍 Anomaly Detection" subheader="Z-score based outlier detection" />
                            <TableContainer>
                                <Table size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Category</TableCell>
                                            <TableCell align="right">Anomalies</TableCell>
                                            <TableCell>Top Anomaly (Z-score)</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {Object.entries(anomalies).map(([cat, anomalyList]) => {
                                            const topAnomaly = anomalyList?.[0];
                                            return (
                                                <TableRow key={cat} hover>
                                                    <TableCell>
                                                        <Chip label={cat} size="small" sx={{ textTransform: 'capitalize' }} />
                                                    </TableCell>
                                                    <TableCell align="right">
                                                        {anomalyList.length > 0
                                                            ? <Chip label={anomalyList.length} size="small" color="warning" />
                                                            : <Chip label="0" size="small" color="success" />
                                                        }
                                                    </TableCell>
                                                    <TableCell>
                                                        {topAnomaly
                                                            ? `value=${topAnomaly.value}, z=${topAnomaly.zscore?.toFixed(2)}`
                                                            : '✓ None'
                                                        }
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        </Card>
                    )}
                </>
            )}
        </Box>
    );
};

export default TrendAnalysisPanel;
