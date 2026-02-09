import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, Grid, Card, CardContent,
    Select, MenuItem, FormControl, InputLabel, CircularProgress,
    Alert, Divider, Chip
} from '@mui/material';
import {
    TrendingUp, ThumbUp, Comment as CommentIcon, Share,
    Article, VideoLibrary
} from '@mui/icons-material';
import api from '../utils/api';

const Analytics = ({ user }) => {
    const [loading, setLoading] = useState(false);
    const [period, setPeriod] = useState(30);
    const [analytics, setAnalytics] = useState(null);
    const [engagement, setEngagement] = useState(null);
    const [error, setError] = useState('');

    useEffect(() => {
        if (user) {
            fetchAnalytics();
            fetchEngagement();
        }
    }, [user, period]);

    const fetchAnalytics = async () => {
        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/content-service/analytics/user/${user.id}`, {
                params: { period }
            });
            setAnalytics(response.data);
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
            setError('Failed to load analytics data');
        } finally {
            setLoading(false);
        }
    };

    const fetchEngagement = async () => {
        try {
            const response = await api.get('/content-service/analytics/engagement', {
                params: { userId: user.id, period }
            });
            setEngagement(response.data);
        } catch (error) {
            console.error('Failed to fetch engagement:', error);
        }
    };

    const StatCard = ({ title, value, subtitle, icon, color = 'primary' }) => (
        <Card>
            <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Box>
                        <Typography color="textSecondary" gutterBottom>
                            {title}
                        </Typography>
                        <Typography variant="h4" component="div">
                            {value}
                        </Typography>
                        {subtitle && (
                            <Typography variant="body2" color="textSecondary">
                                {subtitle}
                            </Typography>
                        )}
                    </Box>
                    <Box
                        sx={{
                            backgroundColor: `${color}.light`,
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
            </CardContent>
        </Card>
    );

    return (
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
                <Typography variant="h4">
                    <TrendingUp sx={{ mr: 1, verticalAlign: 'middle' }} />
                    Analytics & Insights
                </Typography>
                <FormControl size="small" sx={{ minWidth: 150 }}>
                    <InputLabel>Time Period</InputLabel>
                    <Select value={period} onChange={(e) => setPeriod(e.target.value)} label="Time Period">
                        <MenuItem value={7}>Last 7 days</MenuItem>
                        <MenuItem value={30}>Last 30 days</MenuItem>
                        <MenuItem value={90}>Last 90 days</MenuItem>
                        <MenuItem value={365}>Last year</MenuItem>
                    </Select>
                </FormControl>
            </Box>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }}>
                    {error}
                </Alert>
            )}

            {loading && !analytics ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            ) : analytics ? (
                <>
                    {/* Overview Stats */}
                    <Typography variant="h6" gutterBottom>
                        Overview
                    </Typography>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Posts"
                                value={analytics.posts.total}
                                subtitle={`${analytics.posts.period} in this period`}
                                icon={<Article />}
                                color="primary"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Likes"
                                value={analytics.posts.totalLikes}
                                subtitle={`${analytics.posts.periodLikes} in this period`}
                                icon={<ThumbUp />}
                                color="error"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Comments"
                                value={analytics.comments.total}
                                subtitle={`${analytics.comments.period} in this period`}
                                icon={<CommentIcon />}
                                color="info"
                            />
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                            <StatCard
                                title="Total Shares"
                                value={analytics.posts.totalShares}
                                subtitle={`${analytics.posts.periodShares} in this period`}
                                icon={<Share />}
                                color="success"
                            />
                        </Grid>
                    </Grid>

                    {/* Engagement Stats */}
                    {engagement && (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Engagement Metrics
                            </Typography>
                            <Grid container spacing={3} sx={{ mb: 4 }}>
                                <Grid item xs={12} md={4}>
                                    <Card>
                                        <CardContent>
                                            <Typography color="textSecondary" gutterBottom>
                                                Engagement Rate
                                            </Typography>
                                            <Typography variant="h4">
                                                {engagement.engagementRate}
                                            </Typography>
                                            <Typography variant="caption" color="textSecondary">
                                                Average engagement per post
                                            </Typography>
                                        </CardContent>
                                    </Card>
                                </Grid>
                                <Grid item xs={12} md={8}>
                                    <Card>
                                        <CardContent>
                                            <Typography variant="h6" gutterBottom>
                                                Best Posting Hours
                                            </Typography>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
                                                {engagement.bestPostingHours?.map((hour) => (
                                                    <Chip
                                                        key={hour.hour}
                                                        label={`${hour.hour}:00 (${hour.avgLikes} avg likes)`}
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                ))}
                                            </Box>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            </Grid>
                        </>
                    )}

                    {/* Content Stats */}
                    <Typography variant="h6" gutterBottom>
                        Content Statistics
                    </Typography>
                    <Grid container spacing={3} sx={{ mb: 4 }}>
                        <Grid item xs={12} md={6}>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Post Performance
                                    </Typography>
                                    <Divider sx={{ my: 2 }} />
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>Average Likes per Post</Typography>
                                        <Typography fontWeight="bold">{analytics.posts.avgLikes}</Typography>
                                    </Box>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                        <Typography>Total Engagement</Typography>
                                        <Typography fontWeight="bold">
                                            {analytics.posts.totalLikes + analytics.posts.totalComments + analytics.posts.totalShares}
                                        </Typography>
                                    </Box>
                                </CardContent>
                            </Card>
                        </Grid>

                        {analytics.blogs && analytics.blogs.total > 0 && (
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            Blog Statistics
                                        </Typography>
                                        <Divider sx={{ my: 2 }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography>Total Blogs</Typography>
                                            <Typography fontWeight="bold">{analytics.blogs.total}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography>Blogs This Period</Typography>
                                            <Typography fontWeight="bold">{analytics.blogs.periodBlogs}</Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}

                        {analytics.videos && analytics.videos.total > 0 && (
                            <Grid item xs={12} md={6}>
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom>
                                            <VideoLibrary sx={{ mr: 1, verticalAlign: 'middle' }} />
                                            Video Statistics
                                        </Typography>
                                        <Divider sx={{ my: 2 }} />
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography>Total Videos</Typography>
                                            <Typography fontWeight="bold">{analytics.videos.total}</Typography>
                                        </Box>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography>Total Views</Typography>
                                            <Typography fontWeight="bold">{analytics.videos.totalViews}</Typography>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        )}
                    </Grid>

                    {/* Activity Timeline */}
                    {analytics.timeline && analytics.timeline.length > 0 && (
                        <>
                            <Typography variant="h6" gutterBottom>
                                Activity Timeline
                            </Typography>
                            <Card>
                                <CardContent>
                                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                        {analytics.timeline.map((day, index) => (
                                            <Box
                                                key={index}
                                                sx={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    p: 1,
                                                    borderRadius: 1,
                                                    bgcolor: 'action.hover'
                                                }}
                                            >
                                                <Typography>{new Date(day.date).toLocaleDateString()}</Typography>
                                                <Chip label={`${day.count} posts`} size="small" />
                                            </Box>
                                        ))}
                                    </Box>
                                </CardContent>
                            </Card>
                        </>
                    )}
                </>
            ) : (
                <Alert severity="info">No analytics data available</Alert>
            )}
        </Container>
    );
};

export default Analytics;
