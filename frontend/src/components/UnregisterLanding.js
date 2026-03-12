import React, { useState, useEffect, useRef } from 'react';
import { motion, useMotionValue, useSpring, useInView } from 'framer-motion';
import ErrorBoundary from './common/ErrorBoundary';
import {
    Typography, Box, Button, Grid, Card, CardContent, Container, useTheme,
    Paper, Chip, Stack, Collapse, useMediaQuery, Avatar
} from '@mui/material';
import {
    Speed, Security, CloudDone, Groups, Chat, VideoLibrary,
    ShoppingCart, Description, VerifiedUser, Event, Lock, Radio, Tv, Pages as PagesIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';
import { designTokens, getGlassyStyle } from '../theme/designSystem';
import { AreaChart, Area, ResponsiveContainer } from 'recharts';
import api from '../utils/api';

function AnimatedCounter({ to, prefix = '', suffix = '' }) {
    const ref = useRef(null);
    const inView = useInView(ref, { once: true, margin: '-40px' });
    const motionVal = useMotionValue(0);
    const spring = useSpring(motionVal, { stiffness: 40, damping: 15 });
    const [display, setDisplay] = React.useState(0);

    useEffect(() => {
        if (inView) motionVal.set(to);
    }, [inView, to, motionVal]);

    useEffect(() => {
        return spring.on('change', (v) => setDisplay(Math.round(v)));
    }, [spring]);

    return <span ref={ref}>{prefix}{display.toLocaleString()}{suffix}</span>;
}

function UnregisterLanding() {
    const theme = useTheme();
    // use the new API (motion.create) so we avoid the deprecated call
    const MotionCard = motion.create ? motion.create(Card) : motion(Card);
    const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
    const [expandedIndex, setExpandedIndex] = useState(null);
    const [userCount, setUserCount] = useState(50000);

    const mode = theme.palette.mode;
    const brandGradient = `linear-gradient(135deg, ${designTokens.colors[mode].primary}, ${designTokens.colors[mode].secondary})`;

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

    // SEO: page title, meta tags, and JSON-LD structured data
    useEffect(() => {
        const setMeta = (type, name, content) => {
            let el = document.querySelector(`meta[${type}="${name}"]`);
            if (!el) { el = document.createElement('meta'); el.setAttribute(type, name); document.head.appendChild(el); }
            el.setAttribute('content', content);
        };

        document.title = 'Milonexa — Next-Generation Social Platform | Connect, Share, Stream';
        setMeta('name', 'description', 'Milonexa is a next-generation social platform combining social networking, real-time chat, video sharing, and e-commerce for modern communities.');
        setMeta('property', 'og:title', 'Milonexa — Next-Generation Social Platform');
        setMeta('property', 'og:description', 'Connect, share, and stream on Milonexa — the platform for modern communities.');
        setMeta('property', 'og:type', 'website');
        setMeta('property', 'og:url', window.location.href);
        setMeta('name', 'twitter:card', 'summary_large_image');
        setMeta('name', 'twitter:title', 'Milonexa — Next-Generation Social Platform');
        setMeta('name', 'twitter:description', 'Connect, share, and stream on Milonexa — the platform for modern communities.');

        if (!document.getElementById('milonexa-jsonld')) {
            const jsonLd = document.createElement('script');
            jsonLd.type = 'application/ld+json';
            jsonLd.id = 'milonexa-jsonld';
            jsonLd.text = JSON.stringify([
                { '@context': 'https://schema.org', '@type': 'WebSite', name: 'Milonexa', url: window.location.origin },
                { '@context': 'https://schema.org', '@type': 'Organization', name: 'Milonexa', url: window.location.origin, description: 'Next-Generation Social Platform' }
            ]);
            document.head.appendChild(jsonLd);
        }
    }, []);

    // Fetch live user count from public stats endpoint
    useEffect(() => {
        api.get('/api/public/stats').then(res => {
            const count = res?.data?.data?.userCount;
            if (typeof count === 'number' && Number.isFinite(count)) setUserCount(count);
        }).catch((err) => {
            console.debug('[UnregisterLanding] Could not fetch public stats:', err?.message);
        });
    }, []);

    const features = [
        {
            title: 'Social Feed',
            description: 'Share posts, images, and videos with your network',
            link: '/feed',
            icon: <Groups sx={{ fontSize: 40, color: 'primary.main' }} />,
            requiresLogin: true,
            sparkData: [{ v: 3 }, { v: 5 }, { v: 4 }, { v: 7 }, { v: 6 }, { v: 9 }, { v: 8 }]
        },
        {
            title: 'Video Platform',
            description: 'Watch and upload videos with channel subscriptions',
            link: '/videos',
            icon: <VideoLibrary sx={{ fontSize: 40, color: 'error.main' }} />,
            requiresLogin: false,
            sparkData: [{ v: 2 }, { v: 5 }, { v: 7 }, { v: 6 }, { v: 8 }, { v: 10 }, { v: 9 }]
        },
        {
            title: 'Real-time Chat',
            description: 'Message friends, groups, and servers instantly',
            link: '/chat',
            icon: <Chat sx={{ fontSize: 40, color: 'success.main' }} />,
            requiresLogin: true,
            sparkData: [{ v: 5 }, { v: 4 }, { v: 8 }, { v: 6 }, { v: 9 }, { v: 7 }, { v: 11 }]
        },
        {
            title: 'Pages',
            description: 'Create and manage professional pages for organizations, communities, or projects',
            link: '/pages',
            icon: <PagesIcon sx={{ fontSize: 40, color: 'secondary.main' }} />,
            requiresLogin: true
        },
        {
            title: 'Collaboration',
            description: 'Create docs, wikis, tasks, and manage projects',
            link: '/docs',
            icon: <Description sx={{ fontSize: 40, color: 'info.main' }} />,
            requiresLogin: false
        },
        {
            title: 'Shop',
            description: 'Browse products, manage cart, and place orders',
            link: '/shop',
            icon: <ShoppingCart sx={{ fontSize: 40, color: 'warning.main' }} />,
            requiresLogin: false
        },
        {
            title: 'Meetings',
            description: 'Schedule and join secure video meetings and webinars with screen sharing',
            link: '/meetings',
            icon: <Event sx={{ fontSize: 40, color: 'primary.main' }} />,
            requiresLogin: false
        },
        {
            title: 'Live TV (IPTV)',
            description: 'Watch live channels and curated streams - essential for independent media access',
            link: '/tv',
            icon: <Tv sx={{ fontSize: 40, color: 'error.main' }} />,
            requiresLogin: true
        },
        {
            title: 'Live Radio (IP)',
            description: 'Stream internet radio stations and podcasts with low-latency audio',
            link: '/radio',
            icon: <Radio sx={{ fontSize: 40, color: 'success.main' }} />,
            requiresLogin: true
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
                <Typography variant="h3" fontWeight="700">Welcome to Milonexa</Typography>
                <Typography variant="body1" color="text.secondary" sx={{ mt: 1 }}>A lightweight landing page is displayed because the interactive content failed to load. Refresh or continue to register.</Typography>
            </Box>
            <Box sx={{ display: 'flex', gap: 2, justifyContent: 'center' }}>
                <Button variant="contained" component={Link} to="/auth?tab=register">Create Account</Button>
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
                sx={{
                    position: 'relative',
                    overflow: 'hidden',
                    zIndex: 1,
                    // Ensure content is always visible regardless of theme
                    isolation: 'isolate',
                    // make sure the landing page always extends at least to the
                    // bottom of the viewport so returning visitors don't see a
                    // blank gap when the scroll position is preserved
                    minHeight: '100vh',
                    pb: 2,
                }}
            >
                {/* Decorative background shapes (animated gradient blobs) */}
                {!prefersReducedMotion && (
                    <>
                        <Box
                            component={motion.div}
                            animate={{ opacity: [0.15, 0.28, 0.15], scale: [1.1, 1.35, 1.1], x: [-30, 20, -30], y: [-20, 15, -20] }}
                            transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
                            sx={{
                                position: 'absolute',
                                width: 380,
                                height: 380,
                                borderRadius: '50%',
                                background: mode === 'dark'
                                    ? 'radial-gradient(circle at 40% 40%, #7c3aed66, #4f46e533, transparent 65%)'
                                    : `radial-gradient(circle at 40% 40%, ${theme.palette.primary.main}33, transparent 65%)`,
                                top: -100,
                                right: -120,
                                pointerEvents: 'none',
                                zIndex: 0,
                                filter: 'blur(28px)',
                            }}
                        />
                        <Box
                            component={motion.div}
                            animate={{ opacity: [0.12, 0.22, 0.12], scale: [1.0, 1.25, 1.0], x: [20, -25, 20], y: [0, 25, 0] }}
                            transition={{ duration: 11, repeat: Infinity, ease: 'easeInOut', delay: 2.5 }}
                            sx={{
                                position: 'absolute',
                                width: 300,
                                height: 300,
                                borderRadius: '50%',
                                background: mode === 'dark'
                                    ? 'radial-gradient(circle at 60% 60%, #6366f166, transparent 65%)'
                                    : `radial-gradient(circle at 60% 60%, ${theme.palette.secondary.main}33, transparent 65%)`,
                                bottom: -70,
                                left: -90,
                                pointerEvents: 'none',
                                zIndex: 0,
                                filter: 'blur(22px)',
                            }}
                        />
                        <Box
                            component={motion.div}
                            animate={{ opacity: [0.08, 0.16, 0.08], scale: [1.0, 1.18, 1.0], x: [-15, 35, -15] }}
                            transition={{ duration: 13, repeat: Infinity, ease: 'easeInOut', delay: 5 }}
                            sx={{
                                position: 'absolute',
                                width: 220,
                                height: 220,
                                borderRadius: '50%',
                                background: mode === 'dark'
                                    ? 'radial-gradient(circle at 50% 50%, #ec489944, transparent 65%)'
                                    : 'radial-gradient(circle at 50% 50%, #f472b633, transparent 65%)',
                                top: '22%',
                                left: '48%',
                                pointerEvents: 'none',
                                zIndex: 0,
                                filter: 'blur(20px)',
                            }}
                        />
                    </>
                )}
                {/* Hero Section */}
                <Box component={motion.div} variants={fadeInUp} sx={{ textAlign: 'center', mb: 8, mt: 4, position: 'relative', zIndex: 2 }}>
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
                            textShadow: supportsTextClip ? 'none' : undefined,
                            // Force visibility in stacking context
                            position: 'relative',
                            zIndex: 2,
                        })}
                    >
                        Welcome to Milonexa
                    </Typography>

                    <Typography component={motion.p} variants={fadeInUp} variant="h5" color="text.secondary" paragraph sx={{ mb: 3 }}>
                        Milonexa — A Next-Generation Platform for Connecting People Virtually
                    </Typography>

                    <Typography component={motion.p} variants={fadeInUp} variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
                        A comprehensive platform bringing together social networking, real-time collaboration, video sharing and e-commerce — simple, secure, and designed for modern communities.
                    </Typography>

                    <Stack
                        component={motion.div}
                        variants={fadeInUp}
                        direction="row"
                        spacing={1.25}
                        justifyContent="center"
                        useFlexGap
                        flexWrap="wrap"
                        sx={{ mb: 4, px: 1 }}
                    >
                        {highlights.map((item, i) => (
                            <Box key={i} component={motion.div} whileHover={!prefersReducedMotion ? { scale: 1.03 } : {}} sx={{ display: 'inline-block' }}>
                                <Chip
                                    icon={item.icon}
                                    label={item.text}
                                    color="primary"
                                    variant="outlined"
                                    sx={{ py: 1.1, px: 1.25, fontWeight: 600 }}
                                />
                            </Box>
                        ))}
                    </Stack>

                    <Box
                        sx={{
                            mt: 4,
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            flexWrap: 'wrap',
                            gap: { xs: 1.5, sm: 2 },
                        }}
                        component={motion.div}
                        variants={fadeInUp}
                    >
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
                                    to="/auth?tab=register"
                                    sx={{ px: 4, py: 1.5, boxShadow: 4, position: 'relative', zIndex: 1 }}
                                >
                                    Get Started Free
                                </Button>
                            </motion.div>
                        </Box>

                        <motion.div whileHover={!prefersReducedMotion ? { scale: 1.02, y: -3 } : {}} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="outlined"
                                size="large"
                                component={Link}
                                to="/helpcenter"
                                sx={{ px: 4, py: 1.5 }}
                            >
                                See Plans
                            </Button>
                        </motion.div>

                        <motion.div whileHover={!prefersReducedMotion ? { scale: 1.02, y: -3 } : {}} whileTap={{ scale: 0.98 }}>
                            <Button
                                variant="outlined"
                                size="large"
                                component={Link}
                                to="/videos"
                                sx={{ px: 4, py: 1.5, borderStyle: 'dashed' }}
                            >
                                Watch Demo
                            </Button>
                        </motion.div>
                    </Box>
                </Box>

                {/* Social Proof Section */}
                <Box sx={{ mb: 8, position: 'relative', zIndex: 2 }} component={motion.div} variants={fadeInUp}>
                    {/* Animated stat cards */}
                    <Grid container spacing={2} sx={{ mb: 6, justifyContent: 'center' }}>
                        {[
                            { label: 'Users', to: userCount >= 1000 ? Math.round(userCount / 1000) : userCount, suffix: userCount >= 1000 ? 'K+' : '+' },
                            { label: 'Posts', to: 1, suffix: 'M+' },
                            { label: 'Uptime', to: null, display: '99.9%' },
                            { label: 'Countries', to: 150, suffix: '+' },
                        ].map((stat, i) => (
                            <Grid item xs={6} sm={3} key={i} component={motion.div} variants={cardVariant}>
                                <Paper elevation={0} sx={{ textAlign: 'center', p: { xs: 2, sm: 3 }, borderRadius: 3, ...getGlassyStyle(mode) }}>
                                    <Typography variant="h4" fontWeight="800" sx={{
                                        background: brandGradient,
                                        WebkitBackgroundClip: 'text',
                                        WebkitTextFillColor: 'transparent',
                                        backgroundClip: 'text',
                                    }}>
                                        {stat.to !== null
                                            ? <AnimatedCounter to={stat.to} suffix={stat.suffix} />
                                            : stat.display}
                                    </Typography>
                                    <Typography variant="caption" color="text.secondary" fontWeight={600}>
                                        {stat.label}
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Testimonials */}
                    <Typography variant="h5" fontWeight="bold" textAlign="center" sx={{ mb: 3 }}>
                        What our users say
                    </Typography>
                    <Grid container spacing={3} sx={{ mb: 5 }}>
                        {[
                            { name: 'Alex Rivera', role: 'Content Creator', text: 'Milonexa replaced 4 apps for me. The seamless feed, chat, and video platform in one place is a game changer.', initials: 'AR', color: 'primary.main' },
                            { name: 'Priya Sharma', role: 'Community Manager', text: 'The real-time collaboration tools and Pages feature helped us grow our community 3× in just two months.', initials: 'PS', color: 'secondary.main' },
                            { name: 'Marcus Chen', role: 'Tech Entrepreneur', text: 'Enterprise-grade security with a consumer-friendly UX. I finally found a platform I trust for both personal and professional use.', initials: 'MC', color: 'success.main' },
                        ].map((t, i) => (
                            <Grid item xs={12} md={4} key={i} component={motion.div} variants={cardVariant}>
                                <Paper elevation={0} sx={{ p: 3, borderRadius: 3, height: '100%', ...getGlassyStyle(mode) }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 2 }}>
                                        <Avatar sx={{ bgcolor: t.color, fontWeight: 700 }}>{t.initials}</Avatar>
                                        <Box>
                                            <Typography variant="subtitle2" fontWeight={700}>{t.name}</Typography>
                                            <Typography variant="caption" color="text.secondary">{t.role}</Typography>
                                        </Box>
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                                        "{t.text}"
                                    </Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>

                    {/* Featured by logos */}
                    <Box sx={{ textAlign: 'center' }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ textTransform: 'uppercase', letterSpacing: 2, display: 'block', mb: 2 }}>
                            Featured by
                        </Typography>
                        <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" useFlexGap>
                            {['TechCrunch', 'Product Hunt', 'GitHub', 'Hacker News', 'Dev.to'].map((logo, i) => (
                                <Box key={i} component={motion.div} whileHover={!prefersReducedMotion ? { scale: 1.08, y: -2 } : {}}
                                    sx={{
                                        px: 2.5, py: 1,
                                        border: `1px solid ${theme.palette.divider}`,
                                        borderRadius: 2,
                                        fontWeight: 700,
                                        fontSize: '0.82rem',
                                        color: 'text.secondary',
                                        letterSpacing: 0.5,
                                        cursor: 'default',
                                        ...getGlassyStyle(mode),
                                    }}>
                                    {logo}
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Box>

                {/* Features Grid */}
                <Box sx={{ mb: 8, position: 'relative', zIndex: 2 }}>
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
                                        minHeight: 250,
                                        cursor: 'pointer',
                                        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
                                        outline: expandedIndex === index ? `2px solid ${theme.palette.primary.light}` : 'none',
                                        ...getGlassyStyle(mode),
                                        borderRadius: 4,
                                        '&:hover': {
                                            transform: 'translateY(-8px)',
                                            boxShadow: designTokens.glassmorphism[mode].boxShadow,
                                            borderColor: designTokens.colors[mode].primary,
                                        }
                                    }}
                                >
                                    <CardContent sx={{ textAlign: 'center', py: 4, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', minHeight: 250 }}>
                                        <Box component={motion.div} variants={floatIcon} animate="animate" whileTap={!prefersReducedMotion ? { scale: 0.98 } : {}} sx={{ mb: 2 }}>
                                            {feature.icon}
                                        </Box>

                                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, mb: 1 }}>
                                            <Typography variant="h6" fontWeight="600">
                                                {feature.title}
                                            </Typography>
                                            {feature.requiresLogin && (
                                                <Chip
                                                    icon={<Lock sx={{ fontSize: 14 }} />}
                                                    label="Login"
                                                    size="small"
                                                    color="primary"
                                                    variant="outlined"
                                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                                />
                                            )}
                                        </Box>

                                        <Typography variant="body2" color="text.secondary" paragraph>
                                            {feature.description}
                                        </Typography>

                                        {feature.sparkData && (
                                            <Box sx={{ width: '100%', height: 30, mb: 1.5, opacity: 0.75 }}>
                                                <ResponsiveContainer width="100%" height={30}>
                                                    <AreaChart data={feature.sparkData}>
                                                        <defs>
                                                            <linearGradient id={`sparkGrad-${feature.title}`} x1="0" y1="0" x2="0" y2="1">
                                                                <stop offset="5%" stopColor={designTokens.colors[mode].primary} stopOpacity={0.6} />
                                                                <stop offset="95%" stopColor={designTokens.colors[mode].secondary} stopOpacity={0.05} />
                                                            </linearGradient>
                                                        </defs>
                                                        <Area type="monotone" dataKey="v" stroke={designTokens.colors[mode].primary} fill={`url(#sparkGrad-${feature.title})`} strokeWidth={1.5} dot={false} isAnimationActive={!prefersReducedMotion} />
                                                    </AreaChart>
                                                </ResponsiveContainer>
                                            </Box>
                                        )}

                                        {feature.requiresLogin ? (
                                            <Stack direction="row" spacing={1} justifyContent="center">
                                                <Button
                                                    size="small"
                                                    component={Link}
                                                    to="/auth"
                                                    variant="outlined"
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    Login
                                                </Button>
                                                <Button
                                                    size="small"
                                                    component={Link}
                                                    to="/auth?tab=register"
                                                    variant="contained"
                                                    sx={{ fontSize: '0.75rem' }}
                                                >
                                                    Sign Up
                                                </Button>
                                            </Stack>
                                        ) : (
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
                                        )}
                                    </CardContent>
                                </MotionCard>
                            </Grid>
                        ))}
                    </Grid>
                </Box>

                {/* Platform Features */}
                <Paper elevation={0} sx={{ p: 4, mb: 8, bgcolor: 'background.default', borderRadius: 3, position: 'relative', zIndex: 2 }} component={motion.div} variants={fadeInUp}>
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
                <Box sx={{ mb: 8, textAlign: 'center', position: 'relative', zIndex: 2 }} component={motion.div} variants={fadeInUp}>
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
                        borderRadius: 3,
                        position: 'relative',
                        zIndex: 2
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
                            to="/auth?tab=register"
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
