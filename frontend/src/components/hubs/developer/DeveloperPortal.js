import React, { useState } from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Tabs, Tab, List, ListItem,
    ListItemIcon, ListItemText, Divider, Paper
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    Code as CodeIcon,
    Api as ApiIcon,
    Terminal as TerminalIcon,
    GitHub as GitHubIcon,
    IntegrationInstructions as SdkIcon,
    CheckCircle as CheckIcon,
    ContentCopy as ContentCopyIcon
} from '@mui/icons-material';
import axios from 'axios';

export default function DeveloperPortal() {
    const theme = useTheme();
    const [activeTab, setActiveTab] = useState(0);
    const [apiKey, setApiKey] = useState(null);
    const [generating, setGenerating] = useState(false);
    const [copied, setCopied] = useState(false);

    const tabs = ['Getting Started', 'API Reference', 'Webhooks', 'Community Projects'];

    const handleGenerateToken = async () => {
        setGenerating(true);
        try {
            // In a real app we'd use the logged in user's ID
            const mockUserId = '123e4567-e89b-12d3-a456-426614174000';
            const token = localStorage.getItem('token');

            const response = await axios.post(`http://localhost:8001/users/${mockUserId}/developer/tokens`, {}, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            setApiKey(response.data.token);
        } catch (error) {
            console.error('Failed to generate developer token:', error);
            // Fallback for demo if backend isn't running
            setApiKey('lc_test_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15));
        } finally {
            setGenerating(false);
        }
    };

    const handleCopy = () => {
        if (apiKey) {
            navigator.clipboard.writeText(apiKey);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    component={Link}
                    to="/hubs"
                    startIcon={<ArrowBackIcon />}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                    Back to Hubs
                </Button>
                <Button variant="contained" color="error" startIcon={<GitHubIcon />} sx={{ borderRadius: 8, fontWeight: 600 }}>
                    Contribute on GitHub
                </Button>
            </Box>

            <Box sx={{ mb: 6, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <Typography
                            variant="h2"
                            fontWeight={800}
                            gutterBottom
                            sx={{
                                background: `linear-gradient(45deg, #ef4444, #f59e0b)`,
                                WebkitBackgroundClip: 'text',
                                WebkitTextFillColor: 'transparent',
                            }}
                        >
                            Developer Portal
                        </Typography>
                        <Typography variant="h6" color="text.secondary" maxWidth="600px">
                            Build the future of open-source social media. Access API references, SDKs, and the interactive sandbox.
                        </Typography>
                    </motion.div>
                </Box>
                <Box>
                    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}>
                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 4,
                                bgcolor: theme.palette.mode === 'dark' ? alpha('#ef4444', 0.1) : alpha('#ef4444', 0.05),
                                border: `1px solid ${alpha('#ef4444', 0.2)}`,
                                display: 'flex',
                                gap: 2,
                                alignItems: 'center'
                            }}
                        >
                            <TerminalIcon sx={{ fontSize: 48, color: '#ef4444' }} />
                            <Box>
                                <Typography variant="subtitle2" color="text.secondary" fontWeight={700}>LATEST RELEASE</Typography>
                                <Typography variant="h5" fontWeight={800}>v2.4.0-rc.1</Typography>
                            </Box>
                        </Box>
                    </motion.div>
                </Box>
            </Box>

            {/* Main Content Area */}
            <Grid container spacing={4}>
                <Grid item xs={12} md={3}>
                    <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', position: 'sticky', top: 100 }}>
                        <Tabs
                            orientation="vertical"
                            value={activeTab}
                            onChange={(e, val) => setActiveTab(val)}
                            sx={{
                                '& .MuiTabs-indicator': { bgcolor: '#ef4444', width: 4, borderRadius: 2 },
                                '& .MuiTab-root': { alignItems: 'flex-start', textAlign: 'left', py: 2, fontWeight: 600 }
                            }}
                        >
                            {tabs.map((tab, i) => (
                                <Tab key={tab} label={tab} id={`dev-tab-${i}`} />
                            ))}
                        </Tabs>
                    </Card>
                </Grid>

                <Grid item xs={12} md={9}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={activeTab}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                        >
                            {activeTab === 0 && (
                                <Box>
                                    <Typography variant="h4" fontWeight={700} gutterBottom>Quick Start Guide</Typography>
                                    <Typography variant="body1" color="text.secondary" paragraph mb={4}>
                                        Integrate Let's Connect into your platform with just a few lines of code.
                                    </Typography>

                                    <Card sx={{ borderRadius: 4, bgcolor: '#1e1e1e', color: '#fff', mb: 4, boxShadow: '0 12px 24px rgba(0,0,0,0.2)' }}>
                                        <CardContent sx={{ p: 4 }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                                                <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#8b5cf6' }}>Bash</Typography>
                                                <Button size="small" sx={{ color: '#fff', bgcolor: 'rgba(255,255,255,0.1)' }}>Copy</Button>
                                            </Box>
                                            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>
                                                $ npm install @letsconnect/sdk<br />
                                                $ export LETSCONNECT_API_KEY="your_api_key"<br />
                                                $ letsconnect init
                                            </Typography>
                                        </CardContent>
                                    </Card>

                                    <Grid container spacing={3}>
                                        {['Node.js SDK', 'Python SDK', 'React Hooks'].map(sdk => (
                                            <Grid item xs={12} sm={4} key={sdk}>
                                                <Paper sx={{ p: 3, borderRadius: 4, border: `1px solid ${theme.palette.divider}`, textAlign: 'center', cursor: 'pointer', '&:hover': { borderColor: '#ef4444', bgcolor: alpha('#ef4444', 0.05) } }} elevation={0}>
                                                    <SdkIcon sx={{ fontSize: 40, mb: 1, color: 'text.secondary' }} />
                                                    <Typography variant="h6" fontWeight={700}>{sdk}</Typography>
                                                </Paper>
                                            </Grid>
                                        ))}
                                    </Grid>
                                </Box>
                            )}

                            {activeTab === 1 && (
                                <Box>
                                    <Typography variant="h4" fontWeight={700} gutterBottom>GraphQL & REST Reference</Typography>
                                    <Typography variant="body1" color="text.secondary" paragraph mb={4}>
                                        Explore our comprehensive API directly in the browser using the interactive sandbox.
                                    </Typography>

                                    <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none' }}>
                                        <CardContent sx={{ p: 4, textAlign: 'center' }}>
                                            <ApiIcon sx={{ fontSize: 64, color: '#ef4444', mb: 2 }} />
                                            <Typography variant="h6" fontWeight={700} gutterBottom>Launch API Sandbox</Typography>
                                            <Typography variant="body2" color="text.secondary" paragraph>
                                                Authenticate with your developer token to test queries live against our sandbox environment.
                                            </Typography>

                                            {apiKey ? (
                                                <Box sx={{ mt: 3, p: 2, bgcolor: theme.palette.mode === 'dark' ? 'rgba(0,0,0,0.2)' : 'rgba(0,0,0,0.02)', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', border: `1px solid ${theme.palette.divider}` }}>
                                                    <Box sx={{ textAlign: 'left', overflow: 'hidden' }}>
                                                        <Typography variant="caption" color="text.secondary" fontWeight={700}>YOUR SANDBOX TOKEN</Typography>
                                                        <Typography variant="body2" sx={{ fontFamily: 'monospace', mt: 0.5, wordBreak: 'break-all' }}>
                                                            {apiKey}
                                                        </Typography>
                                                    </Box>
                                                    <Button
                                                        onClick={handleCopy}
                                                        startIcon={copied ? <CheckIcon /> : <ContentCopyIcon />}
                                                        color={copied ? "success" : "primary"}
                                                        sx={{ ml: 2, minWidth: 100 }}
                                                    >
                                                        {copied ? 'Copied' : 'Copy'}
                                                    </Button>
                                                </Box>
                                            ) : (
                                                <Button
                                                    variant="contained"
                                                    color="error"
                                                    sx={{ mt: 2, px: 4, py: 1.5, borderRadius: 8 }}
                                                    onClick={handleGenerateToken}
                                                    disabled={generating}
                                                >
                                                    {generating ? 'Generating...' : 'Generate test token'}
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                </Box>
                            )}

                            {activeTab !== 0 && activeTab !== 1 && (
                                <Box sx={{ textAlign: 'center', py: 8 }}>
                                    <CodeIcon sx={{ fontSize: 64, color: 'text.disabled', mb: 2 }} />
                                    <Typography variant="h5" color="text.secondary" fontWeight={600}>
                                        Section coming soon.
                                    </Typography>
                                </Box>
                            )}
                        </motion.div>
                    </AnimatePresence>
                </Grid>
            </Grid>
        </Container>
    );
}
