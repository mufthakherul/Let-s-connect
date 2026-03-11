import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    CircularProgress,
    Chip,
    LinearProgress,
    Tooltip,
    Alert,
    IconButton,
    Collapse
} from '@mui/material';
import {
    CheckCircle,
    Warning,
    Error,
    Refresh,
    Memory,
    Storage,
    Speed,
    NetworkCheck,
    ExpandMore
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import api from '../../utils/api';

/**
 * HealthMetricsPanel - Real-time system health monitoring dashboard
 * Shows:
 * - Service health status
 * - Circuit breaker states
 * - Response time metrics
 * - Error rates
 */
const HealthMetricsPanel = () => {
    const [loading, setLoading] = useState(true);
    const [services, setServices] = useState([]);
    const [circuits, setCircuits] = useState({});
    const [metrics, setMetrics] = useState({});
    const [expanded, setExpanded] = useState(true);
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchHealthData = async () => {
        try {
            // Fetch gateway health
            const healthRes = await api.get('/health');

            // Fetch circuit breaker states
            const circuitRes = await api.get('/health/circuits');

            // Parse service health
            const serviceData = [
                { name: 'API Gateway', status: healthRes.data?.status || 'unknown', uptime: healthRes.data?.uptime },
                { name: 'User Service', status: healthRes.data?.services?.user || 'unknown' },
                { name: 'Content Service', status: healthRes.data?.services?.content || 'unknown' },
                { name: 'Messaging Service', status: healthRes.data?.services?.messaging || 'unknown' },
                { name: 'Media Service', status: healthRes.data?.services?.media || 'unknown' },
                { name: 'Database', status: healthRes.data?.database || 'unknown' },
                { name: 'Redis Cache', status: healthRes.data?.redis || 'unknown' }
            ];

            setServices(serviceData);
            setCircuits(circuitRes.data || {});
            setMetrics(healthRes.data?.metrics || {});
            setLastUpdate(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch health data:', error);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHealthData();
        const interval = setInterval(fetchHealthData, 10000); // Update every 10s
        return () => clearInterval(interval);
    }, []);

    const getStatusColor = (status) => {
        const statusLower = String(status || '').toLowerCase();
        if (statusLower === 'healthy' || statusLower === 'ok' || statusLower === 'up') return 'success';
        if (statusLower === 'degraded' || statusLower === 'slow') return 'warning';
        return 'error';
    };

    const getStatusIcon = (status) => {
        const color = getStatusColor(status);
        if (color === 'success') return <CheckCircle color="success" />;
        if (color === 'warning') return <Warning color="warning" />;
        return <Error color="error" />;
    };

    const getCircuitStateColor = (state) => {
        if (state === 'CLOSED') return 'success';
        if (state === 'HALF_OPEN') return 'warning';
        return 'error';
    };

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={200}>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    const overallHealth = services.every(s => getStatusColor(s.status) === 'success') ? 'success' :
        services.some(s => getStatusColor(s.status) === 'error') ? 'error' : 'warning';

    return (
        <Card component={motion.div} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Box display="flex" alignItems="center" gap={1}>
                        <Typography variant="h6" fontWeight="600">
                            System Health
                        </Typography>
                        <Chip
                            label={overallHealth === 'success' ? 'Healthy' : overallHealth === 'warning' ? 'Degraded' : 'Critical'}
                            color={overallHealth}
                            size="small"
                        />
                    </Box>
                    <Box display="flex" alignItems="center" gap={1}>
                        {lastUpdate && (
                            <Typography variant="caption" color="text.secondary">
                                Updated {lastUpdate.toLocaleTimeString()}
                            </Typography>
                        )}
                        <Tooltip title="Refresh">
                            <IconButton size="small" onClick={fetchHealthData}>
                                <Refresh fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <IconButton
                            size="small"
                            onClick={() => setExpanded(!expanded)}
                            sx={{
                                transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
                                transition: 'transform 0.3s'
                            }}
                        >
                            <ExpandMore />
                        </IconButton>
                    </Box>
                </Box>

                <Collapse in={expanded}>
                    {/* Service Status Grid */}
                    <Grid container spacing={2} mb={3}>
                        {services.map((service, index) => (
                            <Grid item xs={12} sm={6} md={3} key={index}>
                                <Box
                                    sx={{
                                        p: 2,
                                        borderRadius: 2,
                                        border: '1px solid',
                                        borderColor: 'divider',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 1.5,
                                        transition: 'all 0.2s',
                                        '&:hover': {
                                            borderColor: 'primary.main',
                                            bgcolor: 'action.hover'
                                        }
                                    }}
                                >
                                    {getStatusIcon(service.status)}
                                    <Box flex={1}>
                                        <Typography variant="body2" fontWeight="500">
                                            {service.name}
                                        </Typography>
                                        <Typography variant="caption" color="text.secondary">
                                            {String(service.status || 'Unknown').toUpperCase()}
                                        </Typography>
                                        {service.uptime && (
                                            <Typography variant="caption" display="block" color="text.secondary">
                                                Uptime: {Math.floor(service.uptime / 3600)}h
                                            </Typography>
                                        )}
                                    </Box>
                                </Box>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Circuit Breaker States */}
                    {Object.keys(circuits).length > 0 && (
                        <Box mb={3}>
                            <Typography variant="subtitle2" fontWeight="600" mb={1.5} display="flex" alignItems="center" gap={1}>
                                <NetworkCheck fontSize="small" />
                                Circuit Breakers
                            </Typography>
                            <Grid container spacing={2}>
                                {Object.entries(circuits).map(([service, state]) => (
                                    <Grid item xs={12} sm={6} md={4} key={service}>
                                        <Box
                                            sx={{
                                                p: 1.5,
                                                borderRadius: 2,
                                                bgcolor: 'background.default',
                                                display: 'flex',
                                                justifyContent: 'space-between',
                                                alignItems: 'center'
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                {service}
                                            </Typography>
                                            <Chip
                                                label={state.state || 'UNKNOWN'}
                                                size="small"
                                                color={getCircuitStateColor(state.state)}
                                            />
                                        </Box>
                                    </Grid>
                                ))}
                            </Grid>
                        </Box>
                    )}

                    {/* Performance Metrics */}
                    {metrics && Object.keys(metrics).length > 0 && (
                        <Box>
                            <Typography variant="subtitle2" fontWeight="600" mb={1.5} display="flex" alignItems="center" gap={1}>
                                <Speed fontSize="small" />
                                Performance Metrics
                            </Typography>
                            <Grid container spacing={2}>
                                {metrics.avgResponseTime && (
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Avg Response Time
                                            </Typography>
                                            <Typography variant="h6" fontWeight="600">
                                                {metrics.avgResponseTime}ms
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min((metrics.avgResponseTime / 1000) * 100, 100)}
                                                sx={{ mt: 1, height: 4, borderRadius: 2 }}
                                                color={metrics.avgResponseTime < 200 ? 'success' : metrics.avgResponseTime < 500 ? 'warning' : 'error'}
                                            />
                                        </Box>
                                    </Grid>
                                )}
                                {metrics.errorRate !== undefined && (
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Error Rate
                                            </Typography>
                                            <Typography variant="h6" fontWeight="600">
                                                {(metrics.errorRate * 100).toFixed(2)}%
                                            </Typography>
                                            <LinearProgress
                                                variant="determinate"
                                                value={Math.min(metrics.errorRate * 100, 100)}
                                                sx={{ mt: 1, height: 4, borderRadius: 2 }}
                                                color={metrics.errorRate < 0.01 ? 'success' : metrics.errorRate < 0.05 ? 'warning' : 'error'}
                                            />
                                        </Box>
                                    </Grid>
                                )}
                                {metrics.requestsPerMin && (
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Requests/Min
                                            </Typography>
                                            <Typography variant="h6" fontWeight="600">
                                                {metrics.requestsPerMin}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                                {metrics.activeConnections !== undefined && (
                                    <Grid item xs={12} sm={6} md={3}>
                                        <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'background.default' }}>
                                            <Typography variant="caption" color="text.secondary">
                                                Active Connections
                                            </Typography>
                                            <Typography variant="h6" fontWeight="600">
                                                {metrics.activeConnections}
                                            </Typography>
                                        </Box>
                                    </Grid>
                                )}
                            </Grid>
                        </Box>
                    )}

                    {/* Alert if any service is down */}
                    {services.some(s => getStatusColor(s.status) === 'error') && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            <strong>Critical:</strong> One or more services are down. Immediate attention required.
                        </Alert>
                    )}
                    {services.some(s => getStatusColor(s.status) === 'warning') && !services.some(s => getStatusColor(s.status) === 'error') && (
                        <Alert severity="warning" sx={{ mt: 2 }}>
                            <strong>Warning:</strong> Some services are degraded. Monitor closely.
                        </Alert>
                    )}
                </Collapse>
            </CardContent>
        </Card>
    );
};

export default HealthMetricsPanel;
