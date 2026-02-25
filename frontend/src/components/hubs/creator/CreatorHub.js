import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Avatar, LinearProgress
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    TrendingUp as TrendingUpIcon,
    MonetizationOn as MonetizationOnIcon,
    GroupAdd as GroupAddIcon,
    AutoGraph as GraphIcon
} from '@mui/icons-material';
import axios from 'axios';

export default function CreatorHub() {
    const theme = useTheme();
    const [analytics, setAnalytics] = React.useState({
        profileViews: 0,
        newFollowers: 0,
        directTips: 0,
        currentFollowers: 0,
        followerGoal: 10000
    });
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        const fetchAnalytics = async () => {
            try {
                // In a real app we'd use the logged in user's ID
                const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
                const token = localStorage.getItem('token');

                const response = await axios.get(`http://localhost:8001/users/${mockUserId}/creator-analytics`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setAnalytics(response.data);
            } catch (error) {
                console.error('Failed to fetch creator analytics:', error);
                // Fallback implemented in backend already provides random generic data 
                // but just in case of complete network failure:
                setAnalytics({
                    profileViews: 45200,
                    newFollowers: 1240,
                    directTips: 840,
                    currentFollowers: 8420,
                    followerGoal: 10000
                });
            } finally {
                setLoading(false);
            }
        };

        fetchAnalytics();
    }, []);

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ mb: 4 }}>
                <Button
                    component={Link}
                    to="/hubs"
                    startIcon={<ArrowBackIcon />}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                    Back to Hubs
                </Button>
            </Box>

            <Box sx={{ mb: 8, display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 4, alignItems: 'center' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <Typography
                            variant="h2"
                            fontWeight={800}
                            gutterBottom
                            sx={{
                                background: `linear-gradient(45deg, #f59e0b, #ef4444)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Creator Hub
                        </Typography>
                        <Typography variant="h6" color="text.secondary" maxWidth="600px">
                            Turn your passion into a profession. Access tools to grow your audience, track analytics, and monetize your content with 0% platform fees.
                        </Typography>
                        <Box sx={{ mt: 4, display: 'flex', gap: 2 }}>
                            <Button variant="contained" color="warning" sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                                Open Analytics Dashboard
                            </Button>
                            <Button variant="outlined" color="warning" sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                                Monetization Settings
                            </Button>
                        </Box>
                    </motion.div>
                </Box>
                <Box>
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Box
                            sx={{
                                width: 300,
                                height: 300,
                                borderRadius: '50%',
                                background: `radial-gradient(circle, ${alpha('#f59e0b', 0.2)} 0%, transparent 70%)`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}
                        >
                            <TrendingUpIcon sx={{ fontSize: 120, color: '#f59e0b' }} />
                        </Box>
                    </motion.div>
                </Box>
            </Box>

            {/* Stats Cards Preview */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom>
                    Your Performance (Last 30 Days)
                </Typography>
                <Grid container spacing={3}>
                    {[
                        { label: 'Profile Views', value: loading ? '...' : analytics.profileViews.toLocaleString(), raw: analytics.profileViews, icon: <GraphIcon color="info" /> },
                        { label: 'New Followers', value: loading ? '...' : `+${analytics.newFollowers.toLocaleString()}`, raw: analytics.newFollowers, icon: <GroupAddIcon color="success" /> },
                        { label: 'Direct Tips (USD)', value: loading ? '...' : `$${analytics.directTips.toLocaleString()}`, raw: analytics.directTips, icon: <MonetizationOnIcon color="warning" /> }
                    ].map((stat, i) => (
                        <Grid item xs={12} sm={4} key={stat.label}>
                            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * i }}>
                                <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                                    <CardContent sx={{ p: 4 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                            <Typography variant="body2" color="text.secondary" fontWeight={600}>
                                                {stat.label}
                                            </Typography>
                                            {stat.icon}
                                        </Box>
                                        <Typography variant="h3" fontWeight={800}>
                                            {stat.value}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Progression Section */}
            <Box sx={{ p: 5, borderRadius: 6, bgcolor: theme.palette.mode === 'dark' ? alpha('#f59e0b', 0.1) : alpha('#f59e0b', 0.05), border: `1px solid ${alpha('#f59e0b', 0.2)}` }}>
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Path to Verified Creator
                        </Typography>
                        <Typography variant="body1" color="text.secondary" paragraph>
                            You're currently in the top 5% of emerging creators. Hit 10,000 authentic followers to unlock the verified badge and premium placement in algorithmic streams.
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="body2" fontWeight={700}>{analytics.currentFollowers.toLocaleString()} Followers</Typography>
                            <Typography variant="body2" color="text.secondary">{analytics.followerGoal.toLocaleString()} Goal</Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={Math.min(100, (analytics.currentFollowers / analytics.followerGoal) * 100)}
                            color="warning"
                            sx={{ height: 12, borderRadius: 6 }}
                        />
                    </Grid>
                    <Grid item xs={12} md={4} sx={{ textAlign: 'center' }}>
                        <Avatar sx={{ width: 100, height: 100, mx: 'auto', bgcolor: theme.palette.background.paper, border: `4px solid #f59e0b` }}>
                            <Typography variant="h4">🏅</Typography>
                        </Avatar>
                        <Typography variant="subtitle2" mt={2} fontWeight={700} color="warning.main">
                            Unlock Verified Badge
                        </Typography>
                    </Grid>
                </Grid>
            </Box>

        </Container>
    );
}
