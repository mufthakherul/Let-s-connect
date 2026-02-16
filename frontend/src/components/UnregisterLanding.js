import React, { useState } from 'react';
import { motion } from 'framer-motion';
import ErrorBoundary from './common/ErrorBoundary';
import {
    Typography, Box, Button, Grid, Card, CardContent, Container, useTheme,
    Paper, Chip, Stack, Collapse, useMediaQuery
} from '@mui/material';
import {
    Speed, Security, CloudDone, Groups, Chat, VideoLibrary,
    ShoppingCart, Description, SmartToy, VerifiedUser, Event, Tv, Radio
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

function UnregisterLanding() {
    const theme = useTheme();
    const MotionCard = motion(Card);
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const [expandedIndex, setExpandedIndex] = useState(null);

    // Diagnostic mount log (helps investigate intermittent render failures)
    React.useEffect(() => {
        try {
            // keep a lightweight counter useful during debugging
            window.__unregisterLandingMounts = (window.__unregisterLandingMounts || 0) + 1;
            // show a debug message in the browser console (won't crash the UI)
            // eslint-disable-next-line no-console
            console.debug('[UnregisterLanding] mounted', { count: window.__unregisterLandingMounts });
        } catch (e) {
            // swallow errors from instrumentation
        }
        return () => {
            try { window.__unregisterLandingMounts = Math.max((window.__unregisterLandingMounts || 1) - 1, 0); } catch (e) { }
        };
    }, []);

    // Brand gradient: purple in dark mode, indigo/cyan in light mode
    const brandGradient = theme?.palette?.mode === 'dark'
        ? 'linear-gradient(45deg, #b388ff, #7c3aed)'
        : 'linear-gradient(45deg, #4f46e5, #06b6d4)';

    // Feature-detect whether the browser supports text background-clip
    const [supportsTextClip, setSupportsTextClip] = React.useState(true);
    React.useEffect(() => {
        try {
            const supports = (window.CSS && (CSS.supports('background-clip', 'text') || CSS.supports('-webkit-background-clip', 'text')));
            setSupportsTextClip(Boolean(supports));
        } catch (e) {
            setSupportsTextClip(false);
        }
    }, []);

    const features = [
        {
            title: 'Social Feed',
            description: 'Share posts, images, and videos with your network',
            link: '/feed',
            icon: <Groups sx={{ fontSize: 40, color: 'primary.main' }} />
        },
        {
            title: 'Video Platform',
            description: 'Watch and upload videos with channel subscriptions',
            link: '/videos',
            icon: <VideoLibrary sx={{ fontSize: 40, color: 'error.main' }} />
        },
        {
            title: 'Real-time Chat',
            description: 'Message friends, groups, and servers instantly',
            link: '/chat',
            icon: <Chat sx={{ fontSize: 40, color: 'success.main' }} />
        },
        {
            title: 'Collaboration',
            description: 'Create docs, wikis, tasks, and manage projects',
            link: '/docs',
            icon: <Description sx={{ fontSize: 40, color: 'info.main' }} />
        },
        {
            title: 'Shop',
            description: 'Browse products, manage cart, and place orders',
            link: '/shop',
            icon: <ShoppingCart sx={{ fontSize: 40, color: 'warning.main' }} />
        },
        {
            title: 'Smart Assistant',
            description: 'Context-aware assistant that helps you get more done, faster',
            link: '/chat',
            icon: <SmartToy sx={{ fontSize: 40, color: 'secondary.main' }} />
        },
        {
            title: 'Meetings',
            description: 'Schedule and join secure video meetings and webinars with screen sharing',
            link: '/meetings',
            icon: <Event sx={{ fontSize: 40, color: 'primary.main' }} />
        },
        {
            title: 'Live TV (IPTV)',
            description: 'Watch live channels and curated streams in a modern player',
            link: '/tv',
            icon: <Tv sx={{ fontSize: 40, color: 'error.main' }} />
        },
        {
            title: 'Live Radio (IP)',
            description: 'Stream internet radio stations and low-latency audio channels (RTC)',
            link: '/radio',
            icon: <Radio sx={{ fontSize: 40, color: 'success.main' }} />
        }
    ];

    const highlights = [
        { icon: <Speed />, text: 'Fast & Responsive' },
        { icon: <Security />, text: 'Privacy-first' },
        { icon: <CloudDone />, text: 'Reliable & Scalable' },
        { icon: <VerifiedUser sx={{ color: 'secondary.main' }} />, text: 'Enterprise-ready' },
    ];

    // Motion variants
    const container = {
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { staggerChildren: 0.12, when: 'beforeChildren' } }
    };

    const fadeInUp = {
        hidden: { opacity: 0, y: 10 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.48, ease: 'easeOut' } }
    };

    const cardVariant = {
        hidden: { opacity: 0, y: 8, scale: 0.98 },
        visible: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: 'easeOut' } },
        hover: { y: -8, scale: 1.02, boxShadow: '0 10px 30px rgba(2,6,23,0.12)' }
    };

    const floatIcon = prefersReducedMotion
        ? { animate: {} }
        : { animate: { y: [0, -6, 0], transition: { duration: 4, repeat: Infinity, ease: 'easeInOut' } } };

    // Local fallback for when the rich landing UI fails to render
    const Fallback = (error, reset) => (
        <Container maxWidth="md" sx={{ py: 8, textAlign: 'center' }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" fontWeight="700">Welcome to Let's Connect</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>A lightweight landing page is displayed because the interactive content failed to load. Refresh or continue to register.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" component={Link} to="/register">Create Account</Button>
                <Button variant="outlined" onClick={() => { reset(); window.location.reload(); }}>Reload</Button>
            </Box>
            {process.env.NODE_ENV === 'development' && error && (
                <Box sx={{ mt: 3, fontFamily: 'monospace', whiteSpace: 'pre-wrap', color: 'error.main' }}>{String(error?.toString())}</Box>
            )}
        </Container>
    );

    return (
        <ErrorBoundary level="component" fallback={Fallback}>
            <Container
                maxWidth="lg"
                component={motion.div}
                variants={container}
                initial="hidden"
                animate="visible"
                exit={{ opacity: 0, y: -10 }}
                sx={{ position: 'relative', overflow: 'visible', zIndex: 1 }}
            >
                {/* Decorative background shapes (subtle, non-distracting) */}
                {!prefersReducedMotion && (
                    <>
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.8 }}
                            animate={{ opacity: 0.12, scale: 1.25, x: -40, y: -20 }}
                            transition={{ duration: 1.8, ease: 'easeOut' }}
                            sx={{
                                position: 'absolute',
                                width: 220,
                                height: 220,
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 30% 30%, ${theme.palette.primary.main}33, transparent 40%)`,
                                top: -40,
                                right: -60,
                                pointerEvents: 'none',
                                zIndex: 0
                            }}
                        />
                        <Box
                            component={motion.div}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 0.08, scale: 1.1, x: 30, y: 10 }}
                            transition={{ duration: 2.2, ease: 'easeOut' }}
                            sx={{
                                position: 'absolute',
                                width: 160,
                                height: 160,
                                borderRadius: '50%',
                                background: `radial-gradient(circle at 70% 70%, ${theme.palette.secondary.main}33, transparent 40%)`,
                                bottom: -40,
                                left: -40,
                                pointerEvents: 'none',
                                zIndex: 0
                            }}
                        />
                    </>
                )}
                {/* Hero Section */}
                <Box component={motion.div} variants={fadeInUp} sx={{ textAlign: 'center', mb: 8, mt: 4 }}>
                    <Typography
                        component={motion.h1}
                        variants={fadeInUp}
                        variant="h2"
                        gutterBottom
                        fontWeight="bold"
                        sx={theme => ({
                            // Apply gradient text only when supported; otherwise keep visible fallback color
                            background: supportsTextClip ? brandGradient : 'none',
                            WebkitBackgroundClip: supportsTextClip ? 'text' : 'unset',
                            WebkitTextFillColor: supportsTextClip ? 'transparent' : theme.palette.text.primary,
                            backgroundClip: supportsTextClip ? 'text' : 'unset',
                            // Explicit fallback color to ensure visibility
                            color: supportsTextClip ? 'transparent' : theme.palette.text.primary,
                            // keep a solid-color fallback for high-contrast / older browsers
                            textShadow: supportsTextClip ? 'none' : undefined
                        })}
                    >
                        Welcome to Let's Connect
                    </Typography>

                    <Typography component={motion.p} variants={fadeInUp} variant="h5" color="text.secondary" paragraph sx={{ mb: 3 }}>
                        The All-in-One Social Collaboration Platform
                    </Typography>

                    <Typography component={motion.p} variants={fadeInUp} variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
                        A comprehensive platform bringing together social networking, real-time collaboration, video sharing and e-commerce — simple, secure, and designed for modern communities.
                    </Typography>

                    <Stack component={motion.div} variants={fadeInUp} direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                        {highlights.map((item, i) => (
                            <Box key={i} component={motion.div} whileHover={!prefersReducedMotion ? { scale: 1.03 } : {}} sx={{ display: 'inline-block' }}>
                                <Chip
                                    icon={item.icon}
                                    label={item.text}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ py: 1.1, px: 1.5, fontWeight: 600 }}
                                />
                            </Box>
                        ))}
                    </Stack>

                    <Box sx={{ mt: 4, display: 'inline-flex', gap: 12 }} component={motion.div} variants={fadeInUp}>
                        <Box sx={{ position: 'relative', display: 'inline-flex' }}>
                            {!prefersReducedMotion && (
                                <Box
                                    component={motion.div}
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: [0, 0.12, 0] }}
                                    transition={{ repeat: Infinity, duration: 2.8 }}
                                    sx={{
                                        position: 'absolute',
                                        top: -8,
                                        left: -12,
                                        right: -12,
                                        bottom: -8,
                                        borderRadius: 3,
                                        background: `radial-gradient(80% 40% at 10% 20%, ${theme.palette.primary.main}22, transparent 40%)`,
                                        zIndex: 0,
                                        pointerEvents: 'none'
                                    }}
                                />
                            )}

                            <motion.div whileHover={!prefersReducedMotion ? { scale: 1.04, y: -4 } : {}} whileTap={{ scale: 0.98 }}>
                                <Button
                                    variant="contained"
                                    size="large"
                                    component={Link}
                                    to="/register"
                                    sx={{ mr: 2, px: 4, py: 1.5, boxShadow: 4, position: 'relative', zIndex: 1 }}
                                >
                                    Get Started Free
                                </Button>
                            </motion.div>
                        </Box>

                        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="outlined"
                                size="large"
                                component={Link}
                                to="/videos"
                                sx={{ px: 4, py: 1.5 }}
                            >
                                Explore Content
                            </Button>
                        </motion.div>
                    </Box>
                </Box>

                {/* Features Grid */}
                <Box sx={{ mb: 8 }}>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, alignItems: 'center', justifyContent: 'space-between', mb: 3 }} component={motion.div} variants={fadeInUp}>
                        <Typography component={motion.h2} variant="h4" fontWeight="bold" sx={{ mb: { xs: 1, md: 0 } }}>
                            Features
                        </Typography>

                        <Typography variant="caption" color="text.secondary" sx={{ textAlign: { xs: 'center', md: 'right' }, fontStyle: 'italic' }}>
                            Tap or click a card to reveal more details
                        </Typography>
                    </Box>

                    <Grid container spacing={3}>
                        {features.map((feature, index) => (
                            <Grid key={index} item xs={12} sm={6} md={4} component={motion.div} variants={cardVariant}>
                                <MotionCard
                                    variants={cardVariant}
                                    initial="hidden"
                                    onClick={() => setExpandedIndex(expandedIndex === index ? null : index)}
                                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedIndex(expandedIndex === index ? null : index); } }}
                                    role="button"
                                    tabIndex={0}
                                    aria-expanded={expandedIndex === index}
                                    sx={{
                                        height: '100%',
                                        cursor: 'pointer',
                                        transition: 'transform 0.2s, box-shadow 0.2s',
                                        outline: expandedIndex === index ? `2px solid ${theme.palette.primary.light}` : 'none'
                                    }}
                                >
                                    <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                        <Box component={motion.div} variants={floatIcon} animate="animate" whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}} sx={{ mb: 2 }}>
                                            {feature.icon}
                                        </Box>

                                        <Typography variant="h6" gutterBottom fontWeight="600">
                                            {feature.title}
                                        </Typography>

                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            {feature.description}
                                        </Typography>

                                        <Button
                                            size="small"
                                            component={Link}
                                            to={feature.link}
                                            variant="text"
                                            sx={{
                                                '&:hover': { transform: 'translateX(6px)' },
                                                transition: 'all 0.25s ease'
                                            }}
                                        >
                                            <Box component={motion.span} whileHover={{ x: 6 }} sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                                Learn More →
                                            </Box>
                                        </Button>
                                    </CardContent>
                                </MotionCard>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Platform Features */}
                <Paper elevation={0} sx={{ p: 4, mb: 8, bgcolor: 'background.default', borderRadius: 3 }} component={motion.div} variants={fadeInUp}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                        What's Included
                    </Typography>
                    <Grid container spacing={3}>
                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom color="primary">
                                📱 Social & Communication
                            </Typography>
                            <ul style={{ lineHeight: 2 }}>
                                <li>Engaging social feed with posts, reactions, and groups</li>
                                <li>Real-time conversations and community forums</li>
                                <li>Robust moderation and access controls</li>
                            </ul>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom color="primary">
                                💼 Professional & Productivity
                            </Typography>
                            <ul style={{ lineHeight: 2 }}>
                                <li>Professional profiles and portfolio tools</li>
                                <li>Project and content collaboration</li>
                                <li>Integrated marketplace and creator tools</li>
                            </ul>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Typography variant="h6" gutterBottom color="primary">
                                📡 Streaming & Live Events
                            </Typography>
                            <ul style={{ lineHeight: 2 }}>
                                <li>High-quality meetings, webinars and events</li>
                                <li>Live TV channels and on-demand streams (IPTV)</li>
                                <li>Internet radio & low-latency audio (RTC)</li>
                                <li>Channel/station browser and curated playlists</li>
                            </ul>
                        </Grid>
                    </Grid>
                </Paper>

                {/* Security & Trust */}
                <Box sx={{ mb: 8, textAlign: 'center' }} component={motion.div} variants={fadeInUp}>
                    <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                        Security & Trust
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph>
                        Built with privacy and reliability in mind — continuous security reviews and enterprise-grade controls keep your data protected.
                    </Typography>

                    <Box sx={{ mt: 1, display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
                        <Button size="small" component={Link} to="/privacy">Privacy Policy</Button>
                        <Button size="small" component={Link} to="/terms">Terms of Service</Button>
                        <Button size="small" component={Link} to="/cookies">Cookie Policy</Button>
                        <Button size="small" component={Link} to="/helpcenter" variant="outlined">Help Center</Button>
                    </Box>

                    <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mt: 3 }}>
                        {['Privacy-first', 'Encryption in transit', 'Role-based access', 'Regular audits', 'High availability'].map((label, i) => (
                            <Box key={i} component={motion.div} whileHover={!prefersReducedMotion ? { scale: 1.05 } : {}} sx={{ display: 'inline-block' }}>
                                <Chip label={label} variant="outlined" sx={{ m: 0.5 }} />
                            </Box>
                        ))}
                    </Stack>
                </Box>

                {/* CTA Section */}
                <Paper
                    elevation={0}
                    sx={{
                        p: 6,
                        mb: 4,
                        textAlign: 'center',
                        background: `linear-gradient(135deg, ${theme.palette.primary.main}15, ${theme.palette.secondary.main}15)`,
                        borderRadius: 3
                    }}
                    component={motion.div}
                    variants={fadeInUp}
                >
                    <Typography variant="h4" fontWeight="bold" gutterBottom>
                        Ready to Get Started?
                    </Typography>
                    <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
                        Join our growing community and experience the future of connected collaboration
                    </Typography>

                    <motion.div whileHover={{ scale: 1.03, y: -4 }} whileTap={{ scale: 0.98 }}>
                        <Button
                            variant="contained"
                            size="large"
                            component={Link}
                            to="/register"
                            sx={{ px: 5, py: 1.5, boxShadow: 6 }}
                        >
                            Create Free Account
                        </Button>
                    </motion.div>
                </Paper>
            </Container>
        </ErrorBoundary>
    );
}

export default UnregisterLanding;
