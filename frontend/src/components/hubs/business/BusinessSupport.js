import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Avatar, List, ListItem, ListItemIcon, ListItemText
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    Business as BusinessIcon,
    Campaign as CampaignIcon,
    TrendingUp as TrendingUpIcon,
    Handshake as HandshakeIcon,
    Star as StarIcon
} from '@mui/icons-material';

export default function BusinessSupport() {
    const theme = useTheme();

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
                        <BusinessIcon sx={{ fontSize: 64, color: '#06b6d4' }} />
                    </Box>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #06b6d4, #3b82f6)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Business & Ads
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="800px" mx="auto">
                        Reach millions with privacy-first, contextual advertising. Discover tutorials, API access for agencies, and sponsorship opportunities.
                    </Typography>
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="contained" sx={{ bgcolor: '#06b6d4', '&:hover': { bgcolor: '#0891b2' }, borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                            Launch Ad Campaign
                        </Button>
                        <Button variant="outlined" sx={{ color: '#06b6d4', borderColor: '#06b6d4', '&:hover': { borderColor: '#0891b2' }, borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                            Become a Sponsor
                        </Button>
                    </Box>
                </motion.div>
            </Box>

            {/* Main Sections */}
            <Grid container spacing={4}>
                <Grid item xs={12} md={4}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <CampaignIcon sx={{ fontSize: 48, color: '#06b6d4', mb: 2 }} />
                                <Typography variant="h5" fontWeight={700} gutterBottom>
                                    Campaign Setup
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Step-by-step video tutorials and visual guides to launch your first contextual ad campaign under 5 minutes.
                                </Typography>
                                <Button variant="text" sx={{ color: '#06b6d4', fontWeight: 600 }}>Watch Tutorials</Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={12} md={4}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <TrendingUpIcon sx={{ fontSize: 48, color: '#f59e0b', mb: 2 }} />
                                <Typography variant="h5" fontWeight={700} gutterBottom>
                                    Case Studies
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Learn how Brand X generated 40% more CTR using our reduced-data tracking and hashtag-matching engine.
                                </Typography>
                                <Button variant="text" sx={{ color: '#f59e0b', fontWeight: 600 }}>Read Studies</Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>

                <Grid item xs={12} md={4}>
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.3 }}>
                        <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                            <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                <HandshakeIcon sx={{ fontSize: 48, color: '#10b981', mb: 2 }} />
                                <Typography variant="h5" fontWeight={700} gutterBottom>
                                    Agency API
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    Managing multiple accounts? Integrate our GraphQL API directly into your proprietary reporting dashboards.
                                </Typography>
                                <Button variant="text" sx={{ color: '#10b981', fontWeight: 600 }}>Get API Keys</Button>
                            </CardContent>
                        </Card>
                    </motion.div>
                </Grid>
            </Grid>

            {/* Sustainability Pledges Section */}
            <Box sx={{ mt: 8, p: 6, borderRadius: 6, bgcolor: theme.palette.mode === 'dark' ? alpha('#3b82f6', 0.1) : alpha('#3b82f6', 0.05) }}>
                <Typography variant="h4" fontWeight={800} gutterBottom textAlign="center">
                    Open Source Sustainability Pledges
                </Typography>
                <Typography variant="body1" color="text.secondary" textAlign="center" maxWidth="700px" mx="auto" mb={6}>
                    Align your brand with the future of the open web. Companies that sponsor Let's Connect development receive permanent credits in our repository.
                </Typography>

                <Grid container spacing={4} justifyContent="center">
                    {['Platinum Sponsor ($10k/mo)', 'Gold Sponsor ($5k/mo)', 'Silver Sponsor ($1k/mo)'].map((tier, idx) => (
                        <Grid item xs={12} sm={4} key={tier}>
                            <Card sx={{ borderRadius: 4, textAlign: 'center', boxShadow: 'none', border: `1px solid ${theme.palette.divider}` }}>
                                <CardContent sx={{ py: 4 }}>
                                    <StarIcon sx={{ fontSize: 40, color: idx === 0 ? '#e5e7eb' : idx === 1 ? '#facc15' : '#9ca3af', mb: 2 }} />
                                    <Typography variant="h6" fontWeight={700} mb={1}>{tier}</Typography>
                                    <List dense>
                                        {['Homepage Logo Placement', 'Dedicated Support Rep', 'API Rate Limit Boost'].map((feature, fIdx) => (
                                            <ListItem key={feature} disablePadding sx={{ justifyContent: 'center' }}>
                                                <Typography variant="body2" color="text.secondary" align="center">{feature}</Typography>
                                            </ListItem>
                                        ))}
                                    </List>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

        </Container>
    );
}
