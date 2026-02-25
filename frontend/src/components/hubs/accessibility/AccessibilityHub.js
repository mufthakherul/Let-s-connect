import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    AccessibilityNew as A11yIcon,
    Visibility as VisibilityIcon,
    Hearing as HearingIcon,
    Keyboard as KeyboardIcon,
    ExpandMore as ExpandMoreIcon,
    SettingsSuggest as SettingsIcon
} from '@mui/icons-material';
import axios from 'axios';

export default function AccessibilityHub() {
    React.useEffect(() => {
        const fetchSettings = async () => {
            try {
                const token = localStorage.getItem('token');
                const response = await axios.get(`http://localhost:8001/users/${mockUserId}/accessibility/settings`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setSettings(response.data);
            } catch (error) {
                console.error('Failed to fetch accessibility settings:', error);
            } finally {
                setLoading(false);
            }
        };

        fetchSettings();
    }, []);

    const toggleSetting = async (key, value) => {
        const updatedSettings = { ...settings, [key]: value };
        setSettings(updatedSettings);

        try {
            const token = localStorage.getItem('token');
            await axios.put(`http://localhost:8001/users/${mockUserId}/accessibility/settings`, { [key]: value }, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        } catch (error) {
            console.error('Failed to update setting:', error);
            setSettings({ ...settings, [key]: !value }); // Revert
        }
    };

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
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <A11yIcon sx={{ fontSize: 64, color: '#14b8a6' }} />
                    </Box>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #14b8a6, #3b82f6)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Accessibility Resources
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="750px" mx="auto">
                        Ensuring Let's Connect works for everyone. Explore user guides, the robust A11y Developer API, and provide direct feedback.
                    </Typography>
                    <Box sx={{ mt: 4 }}>
                        <Button variant="contained" component={Link} to="/settings/accessibility" sx={{ bgcolor: '#14b8a6', '&:hover': { bgcolor: '#0f766e' }, borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                            Device Settings
                        </Button>
                    </Box>
                </motion.div>
            </Box>

            {/* Feature Grid */}
            {loading ? (
                <Box textAlign="center" py={4}>
                    <Typography>Loading preferences...</Typography>
                </Box>
            ) : settings && (
                <Grid container spacing={4} sx={{ mb: 8 }}>
                    <Grid item xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
                            <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${settings.highContrast ? theme.palette.success.main : theme.palette.divider}`, boxShadow: 'none' }}>
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    <VisibilityIcon sx={{ fontSize: 40, color: '#14b8a6', mb: 2 }} />
                                    <Typography variant="h5" fontWeight={700} gutterBottom>
                                        Visual Adjustments
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Guides on enabling high contrast modes, large text scaling, and optimized color palettes for color blindness.
                                    </Typography>
                                    <Button
                                        variant={settings.highContrast ? "contained" : "outlined"}
                                        color={settings.highContrast ? "success" : "inherit"}
                                        onClick={() => toggleSetting('highContrast', !settings.highContrast)}
                                        sx={{ mt: 2, borderRadius: 8 }}
                                    >
                                        {settings.highContrast ? 'High Contrast: ON' : 'Enable High Contrast'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
                            <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${settings.autoCaptions ? theme.palette.success.main : theme.palette.divider}`, boxShadow: 'none' }}>
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    <HearingIcon sx={{ fontSize: 40, color: '#8b5cf6', mb: 2 }} />
                                    <Typography variant="h5" fontWeight={700} gutterBottom>
                                        Audio & Captions
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Learn how to enforce auto-captions on Live TV/Video streams and enable screen-reader optimized elements.
                                    </Typography>
                                    <Button
                                        variant={settings.autoCaptions ? "contained" : "outlined"}
                                        color={settings.autoCaptions ? "success" : "inherit"}
                                        onClick={() => toggleSetting('autoCaptions', !settings.autoCaptions)}
                                        sx={{ mt: 2, borderRadius: 8 }}
                                    >
                                        {settings.autoCaptions ? 'Auto-Captions: ON' : 'Enable Auto-Captions'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>

                    <Grid item xs={12} md={4}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
                            <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${settings.reduceMotion ? theme.palette.success.main : theme.palette.divider}`, boxShadow: 'none' }}>
                                <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                    <KeyboardIcon sx={{ fontSize: 40, color: '#ef4444', mb: 2 }} />
                                    <Typography variant="h5" fontWeight={700} gutterBottom>
                                        Motion & Layout
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Reduce animations to prevent motion sickness and switch to list layouts instead of grid views for easier navigation.
                                    </Typography>
                                    <Button
                                        variant={settings.reduceMotion ? "contained" : "outlined"}
                                        color={settings.reduceMotion ? "success" : "inherit"}
                                        onClick={() => toggleSetting('reduceMotion', !settings.reduceMotion)}
                                        sx={{ mt: 2, borderRadius: 8 }}
                                    >
                                        {settings.reduceMotion ? 'Reduced Motion: ON' : 'Enable Reduced Motion'}
                                    </Button>
                                </CardContent>
                            </Card>
                        </motion.div>
                    </Grid>
                </Grid>
            )}

            {/* Developer API & Inclusive Posting Guidelines inside Accordions */}
            <Box sx={{ maxWidth: '800px', mx: 'auto' }}>
                <Typography variant="h5" fontWeight={700} gutterBottom textAlign="center">
                    Inclusion Resources
                </Typography>

                <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' }, mb: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>How to Write Inclusive Alt Text for Images</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            When uploading via the Media Gallery, always use the 'Alt Text' button. Describe the image literally so visually impaired users can experience your post via their screen reader.
                        </Typography>
                        <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                            <Typography variant="body2" fontWeight={700}>Good Example:</Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                "A golden retriever dog catching a red frisbee mid-air in a sunny park."
                            </Typography>
                            <Typography variant="body2" fontWeight={700}>Bad Example:</Typography>
                            <Typography variant="body2" color="text.secondary">
                                "Dog." or "Screenshot 2026-08-12."
                            </Typography>
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' }, mb: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>A11y API for Developers</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Building a third-party application or bot? You must adhere to the WAI-ARIA standards. Our React component library exposes 'aria-label', 'role', and 'tabIndex' props natively.
                        </Typography>
                        <Button variant="outlined" sx={{ borderRadius: 4 }} startIcon={<KeyboardIcon />}>
                            Read Developer Specs
                        </Button>
                    </AccordionDetails>
                </Accordion>

                <Accordion sx={{ borderRadius: 2, '&:before': { display: 'none' }, mb: 2, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', bgcolor: alpha('#f59e0b', 0.05) }} disableGutters>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600} color="warning.main">Submit Accessibility Feedback</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography variant="body2" color="text.secondary" paragraph>
                            Found a UI blocker or element that doesn't respect your screen reader?
                            This portal goes directly to our core Frontend Engineering team, bypassing standard support queues to ensure an inclusive web experience.
                        </Typography>
                        <Button variant="contained" color="warning" sx={{ borderRadius: 4 }}>
                            Report A11y Blocker
                        </Button>
                    </AccordionDetails>
                </Accordion>

            </Box>
        </Container>
    );
}
