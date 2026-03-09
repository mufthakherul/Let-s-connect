import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Switch, FormControlLabel, Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    SelfImprovement as WellbeingIcon,
    Timer as TimerIcon,
    NotificationsPaused as QuietIcon,
    Favorite as HealthIcon,
    Shield as ShieldIcon
} from '@mui/icons-material';
import axios from 'axios';

export default function WellbeingCenter() {
    const theme = useTheme();
    const [settings, setSettings] = React.useState(null);
    const [usage, setUsage] = React.useState(0);
    const [loading, setLoading] = React.useState(true);

    const mockUserId = '123e4567-e89b-12d3-a456-426614174000';

    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`http://localhost:8001/users/${mockUserId}/wellbeing/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSettings(response.data.settings);
                setUsage(response.data.currentDailyUsage);
            } catch (error) {
                console.error('Failed to fetch wellbeing settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const handleToggleSetting = async (key, value) => {
        // Optimistic UI update
        const updatedSettings = { ...settings, [key]: value };
        setSettings(updatedSettings);

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:8001/users/${mockUserId}/wellbeing/settings`, { [key]: value }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to update setting:', error);
            // Revert on failure
            setSettings({ ...settings, [key]: !value });
        }
    };

    if (loading || !settings) {
        return (
            <Container maxWidth="lg" sx={{ py: 8, textAlign: 'center' }}>
                <Typography>Loading Wellbeing Center...</Typography>
            </Container>
        );
    }

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

            <Box sx={{ mb: 8, textAlign: 'center' }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <WellbeingIcon sx={{ fontSize: 64, color: '#84cc16' }} />
                    </Box>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #84cc16, #10b981)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Digital Wellbeing
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="800px" mx="auto">
                        Tools to help you maintain a healthy relationship with social media. Take control of your daily habits.
                    </Typography>
                </motion.div>
            </Box>

            <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={6}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                                    <TimerIcon sx={{ fontSize: 40, color: '#84cc16' }} />
                                    <Typography variant="h5" fontWeight={700}>Screen Time Controls</Typography>
                                </Box>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    Set daily limits for your time spent on the platform. We'll send you a gentle reminder when you're close to your goal.
                                </Typography>
                                <Box sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? alpha('#84cc16', 0.1) : alpha('#84cc16', 0.05), borderRadius: 3, mt: 4 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="body2" fontWeight={700}>Daily Limit ({settings.dailyScreenTimeLimit / 60} Hour{settings.dailyScreenTimeLimit >= 120 ? 's' : ''})</Typography>
                                        <FormControlLabel
                                            control={
                                                <Switch
                                                    checked={settings.breakReminders}
                                                    onChange={(e) => handleToggleSetting('breakReminders', e.target.checked)}
                                                    color="success"
                                                />
                                            }
                                            label="Enabled"
                                        />
                                    </Box>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        You have spent <strong>{usage}m</strong> out of {settings.dailyScreenTimeLimit / 60}h today.
                                    </Typography>
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={12} md={6}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                                    <QuietIcon sx={{ fontSize: 40, color: '#8b5cf6' }} />
                                    <Typography variant="h5" fontWeight={700}>Quiet Hours</Typography>
                                </Box>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    Mute all non-critical push notifications during your specified sleep or focus hours. Let your brain rest.
                                </Typography>
                                <Box sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? alpha('#8b5cf6', 0.1) : alpha('#8b5cf6', 0.05), borderRadius: 3, mt: 4 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="body2" fontWeight={700}>
                                            {settings.quietHoursStart} - {settings.quietHoursEnd}
                                        </Typography>
                                        <Button size="small" variant="outlined" color="secondary" sx={{ borderRadius: 4 }}>Edit</Button>
                                    </Box>
                                    <FormControlLabel
                                        control={
                                            <Switch
                                                checked={settings.quietHoursEnabled}
                                                onChange={(e) => handleToggleSetting('quietHoursEnabled', e.target.checked)}
                                                color="secondary"
                                            />
                                        }
                                        label="Mute notifications overnight"
                                    />
                                </Box>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={12} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                                    <ShieldIcon sx={{ fontSize: 40, color: '#f59e0b' }} />
                                    <Typography variant="h5" fontWeight={700}>Content Boundaries</Typography>
                                </Box>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    Tired of doomscrolling? Enable strict algorithm boundaries to filter out stressful news or controversial topics from your Feed.
                                </Typography>
                                <Button variant="outlined" color="warning" sx={{ borderRadius: 8, mt: 2 }}>
                                    Adjust Feed Filters
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={12} md={6}>
                    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', bgcolor: alpha('#ef4444', 0.05) }}>
                            <CardContent sx={{ p: 4 }}>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mb: 3 }}>
                                    <HealthIcon sx={{ fontSize: 40, color: '#ef4444' }} />
                                    <Typography variant="h5" fontWeight={700}>Mental Health Support</Typography>
                                </Box>
                                <Typography variant="body1" color="text.secondary" paragraph>
                                    If you or someone you know is going through a tough time, please don't hesitate to seek professional help.
                                </Typography>
                                <Button variant="contained" color="error" sx={{ borderRadius: 8, mt: 2 }}>
                                    Find Resources (Global Hotlines)
                                </Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>
        </Container>
    );
}
