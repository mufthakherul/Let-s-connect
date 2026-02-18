import React, { useEffect, useMemo, useState } from 'react';
import {
    Box,
    Button,
    Typography,
    Container,
    Card,
    CardContent,
    TextField,
    InputAdornment,
    IconButton,
    Tooltip,
    Grid,
    Chip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import HomeIcon from '@mui/icons-material/Home';
import RefreshIcon from '@mui/icons-material/Refresh';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import MailOutlineIcon from '@mui/icons-material/MailOutline';
import { motion, useReducedMotion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const defaultMap = {
    400: { title: 'Bad Request', message: "The server couldn't understand your request." },
    401: { title: 'Unauthorized', message: 'You must be signed in to view this resource.' },
    403: { title: 'Forbidden', message: "You don't have permission to view this." },
    404: { title: 'Page not found', message: "We couldn't find the page you're looking for." },
    429: { title: 'Too many requests', message: 'You have sent too many requests. Please try again later.' },
    500: { title: 'Server error', message: 'An unexpected error occurred on the server.' },
    502: { title: 'Bad gateway', message: 'Upstream service returned an invalid response.' },
    503: { title: 'Service unavailable', message: 'Service is temporarily unavailable — try again later.' },
    504: { title: 'Gateway timeout', message: 'Upstream service timed out.' },
};

export default function ErrorPage({ code = 500, title, message, details, actions }) {
    const meta = defaultMap[code] || { title: title || 'Error', message: message || 'Something went wrong.' };
    const showDev = process.env.NODE_ENV === 'development';
    const reduceMotion = useReducedMotion();
    const navigate = useNavigate();

    // Incident ID (helpful for support) — stable per-render
    const incidentId = useMemo(() => `INC-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`, []);
    const [copied, setCopied] = useState(false);

    const copyIncident = async () => {
        try {
            await navigator.clipboard.writeText(incidentId);
            setCopied(true);
            toast.success('Incident ID copied');
            setTimeout(() => setCopied(false), 2500);
        } catch (e) {
            toast.error('Unable to copy');
        }
    };

    // Search input (useful for 404)
    const [query, setQuery] = useState('');
    const handleSearch = () => {
        if (!query || !query.trim()) return;
        navigate(`/search?q=${encodeURIComponent(query.trim())}`);
    };

    // Auto-retry countdown for rate-limit / service errors
    const autoRetryEnabled = code === 429 || code === 503;
    const [countdown, setCountdown] = useState(autoRetryEnabled ? 10 : 0);
    useEffect(() => {
        if (!autoRetryEnabled) return undefined;
        if (reduceMotion) return undefined; // don't auto-decrement when reduced motion requested

        const t = setInterval(() => {
            setCountdown((c) => {
                if (c <= 1) {
                    clearInterval(t);
                    return 0;
                }
                return c - 1;
            });
        }, 1000);
        return () => clearInterval(t);
    }, [autoRetryEnabled, reduceMotion]);

    const handleRetry = () => window.location.reload();
    const handleHome = () => { window.location.href = '/'; };
    const handleContact = () => { window.location.href = '/helpcenter/feedback'; };

    const suggestions = [
        { label: 'Home', to: '/' },
        { label: 'Help Center', to: '/helpcenter' },
        { label: 'Docs', to: '/docs' },
        { label: 'Contact Support', to: '/helpcenter/feedback' },
    ];

    // Motion variants
    const floatVariant = reduceMotion
        ? { initial: { y: 0 }, animate: { y: 0 } }
        : { initial: { y: -6 }, animate: { y: 6, transition: { yoyo: Infinity, duration: 3, ease: 'easeInOut' } } };

    return (
        <Container maxWidth="lg" sx={{ position: 'relative', py: 8 }}>
            {/* Decorative background blobs */}
            <Box sx={{ position: 'absolute', inset: 0, pointerEvents: 'none', zIndex: -1 }} aria-hidden>
                <motion.div
                    style={{
                        position: 'absolute',
                        right: '-10%',
                        top: '-10%',
                        width: 420,
                        height: 420,
                        borderRadius: '50%',
                        background: 'radial-gradient(circle at 30% 30%, rgba(99,102,241,0.18), transparent 30%), radial-gradient(circle at 70% 70%, rgba(6,182,212,0.12), transparent 30%)',
                        filter: 'blur(60px)'
                    }}
                    {...(reduceMotion ? {} : { animate: { rotate: [0, 8, -8, 0] }, transition: { duration: 12, repeat: Infinity } })}
                />
            </Box>

            <Card sx={{ overflow: 'visible', position: 'relative' }} role="alert" aria-live="polite">
                <CardContent sx={{ display: 'flex', gap: 4, alignItems: 'center', p: { xs: 4, md: 6 } }}>
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: reduceMotion ? 0 : 0.45 }}
                        >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <motion.div {...floatVariant} style={{ display: 'inline-block' }}>
                                    <Typography sx={{ fontSize: { xs: 56, md: 96 }, lineHeight: 1, fontWeight: 800, color: 'text.primary' }}>{code}</Typography>
                                </motion.div>
                                <Box>
                                    <Typography variant="h4" sx={{ fontWeight: 700 }}>{meta.title}</Typography>
                                    <Typography variant="body1" color="text.secondary" sx={{ mt: 1, maxWidth: 720 }}>{message || meta.message}</Typography>
                                </Box>
                            </Box>
                        </motion.div>

                        {/* Developer details (dev only) */}
                        {showDev && details && (
                            <Box sx={{ bgcolor: 'grey.100', p: 2, borderRadius: 1, mt: 3, fontFamily: 'monospace', fontSize: '0.85rem', overflow: 'auto' }}>
                                <pre style={{ margin: 0, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{String(details)}</pre>
                            </Box>
                        )}

                        {/* Search (helpful for 404) */}
                        {code === 404 && (
                            <Box sx={{ display: 'flex', gap: 2, mt: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                                <TextField
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search the site — try 'profile', 'videos', 'help'..."
                                    size="small"
                                    sx={{ width: { xs: '100%', sm: 420 } }}
                                    InputProps={{
                                        startAdornment: (
                                            <InputAdornment position="start">
                                                <SearchIcon />
                                            </InputAdornment>
                                        ),
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton aria-label="Search site" onClick={handleSearch} edge="end">
                                                    <SearchIcon />
                                                </IconButton>
                                            </InputAdornment>
                                        )
                                    }}
                                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearch(); }}
                                    aria-label="Search site"
                                />
                                <Button variant="contained" onClick={handleHome} startIcon={<HomeIcon />}>Go home</Button>
                            </Box>
                        )}

                        {/* Actions & contextual CTAs */}
                        <Grid container spacing={2} sx={{ mt: 4 }}>
                            <Grid item>
                                <Button variant="contained" startIcon={<HomeIcon />} onClick={handleHome}>Home</Button>
                            </Grid>

                            <Grid item>
                                {code === 401 ? (
                                    <Button variant="outlined" onClick={() => { window.location.href = '/login'; }} startIcon={<RefreshIcon />}>Sign in</Button>
                                ) : (
                                    <Button variant="outlined" onClick={handleRetry} startIcon={<RefreshIcon />}>Reload</Button>
                                )}
                            </Grid>

                            <Grid item>
                                <Button variant="outlined" startIcon={<SupportAgentIcon />} onClick={handleContact}>Contact support</Button>
                            </Grid>

                            <Grid item sx={{ display: 'flex', alignItems: 'center' }}>
                                <Tooltip title="Copy incident ID">
                                    <Button variant="text" onClick={copyIncident} startIcon={<ContentCopyIcon />} aria-label="Copy incident ID">{incidentId}</Button>
                                </Tooltip>
                            </Grid>

                            {autoRetryEnabled && (
                                <Grid item xs={12} sx={{ mt: 2 }}>
                                    <Typography variant="body2" color="text.secondary">
                                        {countdown > 0 ? `Auto-retry in ${countdown}s — or click "Reload" to retry now.` : 'No auto-retry pending.'}
                                    </Typography>
                                </Grid>
                            )}
                        </Grid>

                        {/* Helpful suggestions */}
                        <Box sx={{ mt: 4 }}>
                            <Typography variant="subtitle2" sx={{ mb: 1 }}>Helpful links</Typography>
                            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                                {suggestions.map((s) => (
                                    <Chip key={s.label} label={s.label} onClick={() => { window.location.href = s.to; }} clickable variant="outlined" />
                                ))}
                            </Box>
                        </Box>

                        {showDev && (
                            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 3 }}>Dev-info: incidentId={incidentId}</Typography>
                        )}

                        {actions}
                    </Box>

                    {/* Right-side illustration */}
                    <Box sx={{ width: { xs: 120, sm: 220 }, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <motion.svg
                            viewBox="0 0 200 200"
                            width="100%"
                            height="100%"
                            role="img"
                            aria-hidden={reduceMotion}
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: reduceMotion ? 0 : 0.6 }}
                        >
                            <defs>
                                <linearGradient id="g1" x1="0" x2="1">
                                    <stop offset="0" stopColor="#7c3aed" stopOpacity="0.9" />
                                    <stop offset="1" stopColor="#06b6d4" stopOpacity="0.9" />
                                </linearGradient>
                            </defs>

                            <motion.g
                                {...(reduceMotion ? {} : { animate: { rotate: [0, 6, -6, 0] }, transition: { repeat: Infinity, duration: 8 } })}
                                transform="translate(100 100)"
                            >
                                <circle cx="0" cy="0" r="64" fill="url(#g1)" opacity="0.12" />
                                <rect x="-36" y="-20" width="72" height="40" rx="8" fill="#fff" stroke="rgba(0,0,0,0.06)" strokeWidth="1" />
                                <path d="M-20 0h40" stroke="#7c3aed" strokeWidth="3" strokeLinecap="round" opacity="0.9" />
                                <circle cx="28" cy="-10" r="6" fill="#06b6d4" />
                                <motion.g {...(reduceMotion ? {} : { animate: { y: [-3, 3, -3] }, transition: { duration: 2.5, repeat: Infinity } })}>
                                    <path d="M-8 18c2 3 6 4 10 4s8-1 10-4" stroke="#374151" strokeWidth="2" fill="none" strokeLinecap="round" opacity="0.6" />
                                </motion.g>
                            </motion.g>
                        </motion.svg>
                    </Box>
                </CardContent>
            </Card>
        </Container>
    );
}
