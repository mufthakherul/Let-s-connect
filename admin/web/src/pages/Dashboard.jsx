import React, { useState, useEffect } from 'react';
import {
    Box,
    Container,
    Grid,
    Paper,
    Typography,
    Tabs,
    Tab,
    Alert,
    IconButton,
    Tooltip,
    Breadcrumbs,
    Link
} from '@mui/material';
import {
    Dashboard as DashboardIcon,
    Security,
    Assignment,
    Refresh,
    Home,
    Feedback as FeedbackIcon
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import HealthMetricsPanel from '../components/dashboard/HealthMetricsPanel';
import KeyMetricsPanel from '../components/dashboard/KeyMetricsPanel';
import ModerationQueuePanel from '../components/dashboard/ModerationQueuePanel';
import FeedbackModerationPanel from '../components/dashboard/FeedbackModerationPanel';

/**
 * Dashboard - Composed admin dashboard with tabbed interface
 * Integrates:
 * - HealthMetricsPanel: Real-time system health
 * - KeyMetricsPanel: Executive KPIs
 * - ModerationQueuePanel: Content moderation workflow
 */
const Dashboard = () => {
    const [currentTab, setCurrentTab] = useState(0);
    const [lastRefresh, setLastRefresh] = useState(new Date());

    useEffect(() => {
        document.title = 'Dashboard - Admin Control Center';
    }, []);

    const handleRefresh = () => {
        setLastRefresh(new Date());
        // Trigger refresh on child components via key change
        window.location.reload();
    };

    const tabs = [
        {
            label: 'Overview',
            icon: <DashboardIcon fontSize="small" />,
            component: (
                <Grid container spacing={3}>
                    <Grid item xs={12}>
                        <KeyMetricsPanel key={lastRefresh.getTime()} />
                    </Grid>
                    <Grid item xs={12}>
                        <HealthMetricsPanel key={lastRefresh.getTime()} />
                    </Grid>
                </Grid>
            )
        },
        {
            label: 'Moderation',
            icon: <Assignment fontSize="small" />,
            component: <ModerationQueuePanel key={lastRefresh.getTime()} />
        },
        {
            label: 'Feedback',
            icon: <FeedbackIcon fontSize="small" />,
            component: <FeedbackModerationPanel key={lastRefresh.getTime()} />
        },
        {
            label: 'System Health',
            icon: <Security fontSize="small" />,
            component: <HealthMetricsPanel key={lastRefresh.getTime()} expanded />
        }
    ];

    return (
        <Box sx={{ minHeight: '100vh', bgcolor: 'background.default', py: 3 }}>
            <Container maxWidth="xl">
                {/* Header */}
                <Box mb={3}>
                    <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
                        <Link
                            underline="hover"
                            sx={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            color="inherit"
                            onClick={() => setCurrentTab(0)}
                        >
                            <Home sx={{ mr: 0.5 }} fontSize="small" />
                            Admin
                        </Link>
                        <Typography color="text.primary">{tabs[currentTab].label}</Typography>
                    </Breadcrumbs>

                    <Box display="flex" justifyContent="space-between" alignItems="center">
                        <Box>
                            <Typography variant="h4" fontWeight="700" gutterBottom>
                                Admin Control Center
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                Monitor system health, manage content, and oversee platform operations
                            </Typography>
                        </Box>
                        <Tooltip title="Refresh all data">
                            <IconButton onClick={handleRefresh} color="primary">
                                <Refresh />
                            </IconButton>
                        </Tooltip>
                    </Box>
                </Box>

                {/* Tab Navigation */}
                <Paper sx={{ mb: 3 }}>
                    <Tabs
                        value={currentTab}
                        onChange={(e, newValue) => setCurrentTab(newValue)}
                        variant="fullWidth"
                        sx={{
                            borderBottom: 1,
                            borderColor: 'divider',
                            '& .MuiTab-root': {
                                minHeight: 64,
                                textTransform: 'none',
                                fontSize: '1rem',
                                fontWeight: 500
                            }
                        }}
                    >
                        {tabs.map((tab, index) => (
                            <Tab
                                key={index}
                                icon={tab.icon}
                                iconPosition="start"
                                label={tab.label}
                            />
                        ))}
                    </Tabs>
                </Paper>

                {/* Tab Content */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentTab}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        transition={{ duration: 0.3 }}
                    >
                        {tabs[currentTab].component}
                    </motion.div>
                </AnimatePresence>

                {/* Footer Info */}
                <Box mt={4}>
                    <Alert severity="info" icon={false}>
                        <Typography variant="caption" color="text.secondary">
                            Last refreshed: {lastRefresh.toLocaleString()} • Use keyboard shortcuts: Tab (navigate), Cmd/Ctrl+R (refresh)
                        </Typography>
                    </Alert>
                </Box>
            </Container>
        </Box>
    );
};

export default Dashboard;
