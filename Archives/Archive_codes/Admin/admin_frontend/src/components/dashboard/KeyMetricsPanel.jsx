import React, { useState, useEffect } from 'react';
import {
    Card,
    CardContent,
    Typography,
    Grid,
    Box,
    CircularProgress,
    Chip,
    IconButton,
    Tooltip
} from '@mui/material';
import {
    TrendingUp,
    TrendingDown,
    People,
    Description,
    Forum,
    ShoppingCart,
    Visibility,
    AttachMoney,
    Refresh
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import { LineChart, Line, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import api from '../../utils/api';

/**
 * KeyMetricsPanel - High-level KPI dashboard for admin
 * Shows:
 * - Total users, growth rate
 * - Content statistics (posts, comments, media uploads)
 * - Revenue metrics
 * - Engagement metrics
 */
const KeyMetricsPanel = () => {
    const [loading, setLoading] = useState(true);
    const [metrics, setMetrics] = useState({
        users: { total: 0, growth: 0, trend: [] },
        content: { posts: 0, comments: 0, growth: 0 },
        media: { uploads: 0, storage: 0 },
        engagement: { dailyActive: 0, weeklyActive: 0, retention: 0 },
        revenue: { total: 0, growth: 0, orders: 0 }
    });
    const [lastUpdate, setLastUpdate] = useState(null);

    const fetchMetrics = async () => {
        try {
            // Fetch admin stats from user-service
            const statsRes = await api.get('/user/admin/stats');
            const stats = statsRes.data;

            // Mock trend data (in production, fetch real time-series data)
            const generateTrend = (base, variance) => {
                return Array.from({ length: 7 }, (_, i) => ({
                    day: i,
                    value: Math.floor(base + (Math.random() - 0.5) * variance)
                }));
            };

            setMetrics({
                users: {
                    total: stats.totalUsers || 0,
                    growth: stats.userGrowthPercentage || 0,
                    trend: generateTrend(stats.totalUsers || 100, 20)
                },
                content: {
                    posts: stats.totalPosts || 0,
                    comments: stats.totalComments || 0,
                    growth: stats.contentGrowthPercentage || 0
                },
                media: {
                    uploads: stats.mediaUploads || 0,
                    storage: stats.storageUsedGB || 0
                },
                engagement: {
                    dailyActive: stats.dailyActiveUsers || 0,
                    weeklyActive: stats.weeklyActiveUsers || 0,
                    retention: stats.retentionRate || 0
                },
                revenue: {
                    total: stats.totalRevenue || 0,
                    growth: stats.revenueGrowth || 0,
                    orders: stats.totalOrders || 0
                }
            });

            setLastUpdate(new Date());
            setLoading(false);
        } catch (error) {
            console.error('Failed to fetch metrics:', error);
            // Set default values on error
            setMetrics({
                users: { total: 0, growth: 0, trend: [] },
                content: { posts: 0, comments: 0, growth: 0 },
                media: { uploads: 0, storage: 0 },
                engagement: { dailyActive: 0, weeklyActive: 0, retention: 0 },
                revenue: { total: 0, growth: 0, orders: 0 }
            });
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchMetrics();
        const interval = setInterval(fetchMetrics, 60000); // Update every minute
        return () => clearInterval(interval);
    }, []);

    const MetricCard = ({ title, value, subtitle, icon, growth, trend, color = 'primary' }) => (
        <Card
            component={motion.div}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            whileHover={{ y: -4 }}
            sx={{
                height: '100%',
                background: `linear-gradient(135deg, ${color === 'primary' ? 'rgba(25, 118, 210, 0.05)' :
                    color === 'secondary' ? 'rgba(220, 0, 78, 0.05)' :
                        color === 'success' ? 'rgba(46, 125, 50, 0.05)' :
                            'rgba(237, 108, 2, 0.05)'} 0%, transparent 100%)`,
                borderLeft: `4px solid`,
                borderColor: `${color}.main`,
                transition: 'all 0.3s'
            }}
        >
            <CardContent>
                <Box display="flex" justifyContent="space-between" alignItems="flex-start" mb={2}>
                    <Box>
                        <Typography variant="body2" color="text.secondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" fontWeight="700">
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="caption" color="text.secondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        sx={{
                            bgcolor: `${color}.main`,
                            color: 'white',
                            borderRadius: 2,
                            p: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {icon}
                    </Box>
                </Box>

                {growth !== undefined && (
                    <Box display="flex" alignItems="center" gap={0.5} mb={1}>
                        {growth >= 0 ? (
                            <TrendingUp color="success" fontSize="small" />
                        ) : (
                            <TrendingDown color="error" fontSize="small" />
                        )}
                        <Typography
                            variant="body2"
                            color={growth >= 0 ? 'success.main' : 'error.main'}
                            fontWeight="600"
                        >
                            {growth >= 0 ? '+' : ''}{growth.toFixed(1)}%
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                            vs last period
                        </Typography>
                    </Box>
                )}

                {trend && trend.length > 0 && (
                    <ResponsiveContainer width="100%" height={60}>
                        <LineChart data={trend}>
                            <Line
                                type="monotone"
                                dataKey="value"
                                stroke={color === 'primary' ? '#1976d2' :
                                    color === 'secondary' ? '#dc004e' :
                                        color === 'success' ? '#2e7d32' : '#ed6c02'}
                                strokeWidth={2}
                                dot={false}
                            />
                            <RechartsTooltip />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </CardContent>
        </Card>
    );

    if (loading) {
        return (
            <Card>
                <CardContent>
                    <Box display="flex" justifyContent="center" alignItems="center" minHeight={300}>
                        <CircularProgress />
                    </Box>
                </CardContent>
            </Card>
        );
    }

    return (
        <Box>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6" fontWeight="600">
                    Key Performance Indicators
                </Typography>
                <Box display="flex" alignItems="center" gap={1}>
                    {lastUpdate && (
                        <Typography variant="caption" color="text.secondary">
                            Updated {lastUpdate.toLocaleTimeString()}
                        </Typography>
                    )}
                    <Tooltip title="Refresh">
                        <IconButton size="small" onClick={fetchMetrics}>
                            <Refresh fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </Box>
            </Box>

            <Grid container spacing={3}>
                {/* User Metrics */}
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Total Users"
                        value={metrics.users.total.toLocaleString()}
                        icon={<People />}
                        growth={metrics.users.growth}
                        trend={metrics.users.trend}
                        color="primary"
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Daily Active Users"
                        value={metrics.engagement.dailyActive.toLocaleString()}
                        subtitle={`${metrics.engagement.weeklyActive.toLocaleString()} weekly`}
                        icon={<Visibility />}
                        color="success"
                    />
                </Grid>

                {/* Content Metrics */}
                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Total Posts"
                        value={metrics.content.posts.toLocaleString()}
                        subtitle={`${metrics.content.comments.toLocaleString()} comments`}
                        icon={<Description />}
                        growth={metrics.content.growth}
                        color="secondary"
                    />
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                    <MetricCard
                        title="Media Uploads"
                        value={metrics.media.uploads.toLocaleString()}
                        subtitle={`${metrics.media.storage.toFixed(2)} GB storage`}
                        icon={<Forum />}
                        color="warning"
                    />
                </Grid>

                {/* Revenue Metrics (if applicable) */}
                {metrics.revenue.total > 0 && (
                    <>
                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Total Revenue"
                                value={`$${metrics.revenue.total.toLocaleString()}`}
                                icon={<AttachMoney />}
                                growth={metrics.revenue.growth}
                                color="success"
                            />
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                            <MetricCard
                                title="Total Orders"
                                value={metrics.revenue.orders.toLocaleString()}
                                icon={<ShoppingCart />}
                                color="primary"
                            />
                        </Grid>
                    </>
                )}

                {/* Retention Metric */}
                <Grid item xs={12} sm={6} md={3}>
                    <Card
                        component={motion.div}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        sx={{ height: '100%' }}
                    >
                        <CardContent>
                            <Typography variant="body2" color="text.secondary" gutterBottom>
                                User Retention
                            </Typography>
                            <Box display="flex" alignItems="center" justifyContent="center" position="relative" mt={2}>
                                <CircularProgress
                                    variant="determinate"
                                    value={metrics.engagement.retention}
                                    size={120}
                                    thickness={4}
                                    color={metrics.engagement.retention > 70 ? 'success' :
                                        metrics.engagement.retention > 50 ? 'warning' : 'error'}
                                />
                                <Box
                                    position="absolute"
                                    display="flex"
                                    alignItems="center"
                                    justifyContent="center"
                                >
                                    <Typography variant="h4" fontWeight="700">
                                        {metrics.engagement.retention}%
                                    </Typography>
                                </Box>
                            </Box>
                            <Typography variant="caption" color="text.secondary" textAlign="center" display="block" mt={1}>
                                30-day retention rate
                            </Typography>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Box>
    );
};

export default KeyMetricsPanel;
