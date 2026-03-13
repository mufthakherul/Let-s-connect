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

    return <div>Legacy archived landing code backup</div>;
}

export default UnregisterLanding;
