import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, LinearProgress, Avatar, AvatarGroup
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    Favorite as FavoriteIcon,
    Public as GlobalIcon,
    AccountBalance as FinanceIcon,
    EmojiEvents as TrophyIcon
} from '@mui/icons-material';

export default function DonationHub() {
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
                        <FavoriteIcon sx={{ fontSize: 64, color: '#ec4899' }} />
                    </Box>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #ec4899, #f43f5e)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Donation & Sustainability
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="800px" mx="auto">
                        Let's Connect is powered by community, not invasive ads or data harvesting. Help us keep the servers running and the open-source development thriving.
                    </Typography>
                    <Box sx={{ mt: 4, display: 'flex', justifyContent: 'center', gap: 2 }}>
                        <Button variant="contained" color="error" size="large" sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                            Donate Now via Stripe
                        </Button>
                        <Button variant="outlined" color="secondary" size="large" sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                            GitHub Sponsors
                        </Button>
                    </Box>
                </motion.div>
            </Box>

            {/* Financial Transparency Progress */}
            <Box sx={{ mb: 8, p: { xs: 4, md: 6 }, borderRadius: 6, bgcolor: theme.palette.mode === 'dark' ? alpha('#ec4899', 0.1) : alpha('#ec4899', 0.05), border: `1px solid ${alpha('#ec4899', 0.2)}` }}>
                <Grid container spacing={4} alignItems="center">
                    <Grid item xs={12} md={8}>
                        <Typography variant="h5" fontWeight={700} gutterBottom display="flex" alignItems="center" gap={1}>
                            <FinanceIcon /> Monthly Server Costs (August 2026)
                        </Typography>
                        <Typography variant="body1" color="text.secondary" paragraph>
                            We believe in total financial transparency. Your donations directly fund our AWS/Kubernetes infrastructure and bug-bounty programs.
                        </Typography>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, alignItems: 'flex-end' }}>
                            <Typography variant="h4" fontWeight={800} color="error.main">$4,200</Typography>
                            <Typography variant="body1" color="text.secondary">Goal: $3,450</Typography>
                        </Box>
                        <LinearProgress
                            variant="determinate"
                            value={100} // Math.min((4200 / 3450) * 100, 100);
                            color="secondary"
                            sx={{ height: 16, borderRadius: 8, bgcolor: alpha('#ec4899', 0.2) }}
                        />
                        <Typography variant="body2" fontWeight={600} mt={1} color="success.main">
                            🎉 121% Funded! The $750 surplus is allocated to the Q4 Security Audit Bounty.
                        </Typography>
                    </Grid>
                    <Grid item xs={12} md={4} textAlign="center">
                        <Typography variant="subtitle1" fontWeight={700} gutterBottom>
                            Supported by people like you
                        </Typography>
                        <AvatarGroup max={6} sx={{ justifyContent: 'center', mb: 2 }}>
                            <Avatar alt="User 1" sx={{ bgcolor: '#3b82f6' }}>A</Avatar>
                            <Avatar alt="User 2" sx={{ bgcolor: '#10b981' }}>B</Avatar>
                            <Avatar alt="User 3" sx={{ bgcolor: '#f59e0b' }}>J</Avatar>
                            <Avatar alt="User 4" sx={{ bgcolor: '#ef4444' }}>D</Avatar>
                            <Avatar alt="User 5" sx={{ bgcolor: '#ec4899' }}>M</Avatar>
                            <Avatar alt="User 6" sx={{ bgcolor: '#8b5cf6' }}>K</Avatar>
                            <Avatar alt="User 7" sx={{ bgcolor: '#14b8a6' }}>L</Avatar>
                        </AvatarGroup>
                        <Typography variant="body2" color="text.secondary">
                            + 1,204 active monthly backers
                        </Typography>
                    </Grid>
                </Grid>
            </Box>

            <Typography variant="h5" fontWeight={700} textAlign="center" mb={4}>
                Ways to Contribute
            </Typography>

            <Grid container spacing={4} sx={{ mb: 6 }}>
                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <FavoriteIcon sx={{ fontSize: 40, color: '#ec4899', mb: 2 }} />
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Patreon / Fiat Connect
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Set up a $5 monthly recurring donation to automatically receive the "Supporter" badge.
                            </Typography>
                            <Button variant="outlined" color="error" sx={{ borderRadius: 4 }}>Donate via Stripe</Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <GlobalIcon sx={{ fontSize: 40, color: '#3b82f6', mb: 2 }} />
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Cryptocurrency
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                We accept Bitcoin, Ethereum, and stablecoins. Completely borderless and permissionless giving.
                            </Typography>
                            <Button variant="outlined" color="primary" sx={{ borderRadius: 4 }}>View Wallet Addresses</Button>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={4}>
                    <Card sx={{ height: '100%', borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                            <TrophyIcon sx={{ fontSize: 40, color: '#f59e0b', mb: 2 }} />
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Corporate Match
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Does your employer match open-source donations? Submit through Benevity or OpenCollective.
                            </Typography>
                            <Button variant="outlined" color="warning" sx={{ borderRadius: 4 }}>Find Employer</Button>
                        </CardContent>
                    </Card>
                </Grid>
            </Grid>
        </Container>
    );
}
