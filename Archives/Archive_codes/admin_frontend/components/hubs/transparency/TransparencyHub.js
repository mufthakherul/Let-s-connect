import React, { useState } from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Table, TableBody, TableCell,
    TableContainer, TableHead, TableRow, Paper, Chip, LinearProgress
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    Gavel as PolicyIcon,
    Assessment as ReportIcon,
    Code as CodeIcon,
    Visibility as VisibilityIcon
} from '@mui/icons-material';

const enforcementData = [
    { policy: 'Spam / Phishing', flagged: 14500, removed: 14200, appeals: 300, reinstated: 12 },
    { policy: 'Hate Speech', flagged: 8200, removed: 7900, appeals: 850, reinstated: 45 },
    { policy: 'Harassment', flagged: 5400, removed: 5100, appeals: 620, reinstated: 88 },
    { policy: 'Graphic Violence', flagged: 1200, removed: 1150, appeals: 20, reinstated: 2 }
];

export default function TransparencyHub() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState('reports');

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

            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <VisibilityIcon sx={{ fontSize: 64, color: '#10b981' }} />
                    </Box>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #10b981, #06b6d4)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Transparency & Trust
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="700px" mx="auto">
                        Open-source means open operations. Explore our moderation policies, algorithm updates, and quarterly enforcement reports.
                    </Typography>
                </motion.div>
            </Box>

            {/* Tabs / Filters */}
            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, mb: 6 }}>
                <Button
                    variant={activeTab === 'reports' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => setActiveTab('reports')}
                    startIcon={<ReportIcon />}
                    sx={{ borderRadius: 8, px: 3 }}
                >
                    Enforcement Reports
                </Button>
                <Button
                    variant={activeTab === 'algorithms' ? 'contained' : 'outlined'}
                    color="success"
                    onClick={() => setActiveTab('algorithms')}
                    startIcon={<CodeIcon />}
                    sx={{ borderRadius: 8, px: 3 }}
                >
                    Algorithm Explainers
                </Button>
            </Box>

            {activeTab === 'reports' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        Q3 2026 Enforcement Report
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Automated takedowns via the `ai-service` vs. human appeals.
                    </Typography>

                    <TableContainer component={Paper} elevation={0} sx={{ border: `1px solid ${theme.palette.divider}`, borderRadius: 4, mb: 6 }}>
                        <Table>
                            <TableHead sx={{ bgcolor: theme.palette.mode === 'dark' ? alpha('#10b981', 0.1) : alpha('#10b981', 0.05) }}>
                                <TableRow>
                                    <TableCell><strong>Policy Area</strong></TableCell>
                                    <TableCell align="right"><strong>Items Flagged</strong></TableCell>
                                    <TableCell align="right"><strong>Actioned (Removed)</strong></TableCell>
                                    <TableCell align="right"><strong>Appeals Filed</strong></TableCell>
                                    <TableCell align="right"><strong>Content Reinstated</strong></TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {enforcementData.map((row) => (
                                    <TableRow key={row.policy}>
                                        <TableCell component="th" scope="row">
                                            <Chip label={row.policy} size="small" variant="outlined" />
                                        </TableCell>
                                        <TableCell align="right">{row.flagged.toLocaleString()}</TableCell>
                                        <TableCell align="right">{row.removed.toLocaleString()}</TableCell>
                                        <TableCell align="right">{row.appeals.toLocaleString()}</TableCell>
                                        <TableCell align="right">{row.reinstated.toLocaleString()}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    <Grid container spacing={4}>
                        <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <PolicyIcon color="primary" /> Current Policies
                                    </Typography>
                                    <Typography variant="body2" color="text.secondary" paragraph>
                                        Read the exact operational definitions our Trust & Safety team uses to evaluate reported content.
                                    </Typography>
                                    <Button variant="outlined" size="small" sx={{ borderRadius: 4 }}>
                                        View Rulebook
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', bgcolor: alpha('#f59e0b', 0.05) }}>
                                <CardContent>
                                    <Typography variant="h6" fontWeight={700} gutterBottom>
                                        Algorithm Transparency
                                    </Typography>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                        <Typography variant="body2">Chronological vs Algo Feed</Typography>
                                        <Typography variant="body2" fontWeight={700} ml="auto">70% Users</Typography>
                                    </Box>
                                    <LinearProgress variant="determinate" value={70} color="warning" sx={{ height: 8, borderRadius: 4, mb: 2 }} />
                                    <Typography variant="body2" color="text.secondary">
                                        70% of active sessions use the Chronological feed. The collaborative filtering engine (`ai-service` v2) weights chronological recency over engagement spikes to reduce addictive scrolling patterns.
                                    </Typography>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </motion.div>
            )}

            {activeTab === 'algorithms' && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        How the Feed Works
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Because we are open-source, we don't hide our algorithms. Here are the core metrics that determine content visibility in the "Top" feed.
                    </Typography>

                    <Grid container spacing={3}>
                        {['Recency Decay (40%)', 'Author Affinity (30%)', 'Topic Relevance (20%)', 'Global Engagement (10%)'].map((factor, i) => (
                            <Grid item xs={12} sm={6} key={factor}>
                                <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                                    <CardContent>
                                        <Typography variant="h6" fontWeight={700} gutterBottom color="success.main">
                                            {factor}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            Metrics pulled directly from the `ai-service/recommendations.js` worker. We prioritize recent content from people you frequently interact with over globally viral posts.
                                        </Typography>
                                        <Box sx={{ mt: 2 }}>
                                            <Button size="small" startIcon={<CodeIcon />} sx={{ textTransform: 'none' }}>
                                                View Source Code on GitHub
                                            </Button>
                                        </Box>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </motion.div>
            )}
        </Container>
    );
}
