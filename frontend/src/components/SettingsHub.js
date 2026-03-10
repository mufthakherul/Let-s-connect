import React from 'react';
import { Box, Typography, Grid, Paper, Button, Chip, Stack } from '@mui/material';
import { Link } from 'react-router-dom';
import SettingsIcon from '@mui/icons-material/Settings';
import PaletteIcon from '@mui/icons-material/Palette';
import AccessibilityNewIcon from '@mui/icons-material/AccessibilityNew';
import SecurityIcon from '@mui/icons-material/Security';
import HelpCenterIcon from '@mui/icons-material/HelpCenter';
import GavelIcon from '@mui/icons-material/Gavel';
import CookieIcon from '@mui/icons-material/Cookie';
import { useAuthStore } from '../store/authStore';
import PageShell from './common/PageShell';

export default function SettingsHub() {
    const { user } = useAuthStore();

    const primaryCards = [
        {
            title: 'General & Security',
            description: 'Account, privacy, and security controls including login protection and session safety.',
            icon: <SecurityIcon sx={{ fontSize: 28 }} />,
            to: '/security',
            cta: 'Open Security',
            visible: true,
        },
        {
            title: 'Appearance',
            description: 'Theme, accents, layout density, and visual preferences for a personalized experience.',
            icon: <PaletteIcon sx={{ fontSize: 28 }} />,
            to: '/settings/appearance',
            cta: 'Customize',
            visible: !!user,
        },
        {
            title: 'Accessibility',
            description: 'Adjust contrast, text sizing, motion, and readability options for inclusive usage.',
            icon: <AccessibilityNewIcon sx={{ fontSize: 28 }} />,
            to: '/settings/accessibility',
            cta: 'Open Accessibility',
            visible: true,
        },
    ];

    const supportCards = [
        {
            title: 'Help Center',
            description: 'Guides, manuals, and FAQs for core product journeys.',
            icon: <HelpCenterIcon sx={{ fontSize: 24 }} />,
            to: '/helpcenter',
            cta: 'Open Help Center',
        },
        {
            title: 'Privacy Policy',
            description: 'Understand how we process and protect your data.',
            icon: <GavelIcon sx={{ fontSize: 24 }} />,
            to: '/privacy',
            cta: 'Read Privacy',
        },
        {
            title: 'Cookie Policy',
            description: 'Manage tracking and cookie transparency preferences.',
            icon: <CookieIcon sx={{ fontSize: 24 }} />,
            to: '/cookies',
            cta: 'Read Cookies',
        },
    ];

    const summaryActions = (
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
            <Chip label={user ? 'Signed in settings' : 'Public settings'} color="primary" size="small" />
            <Chip label="Unified settings architecture" size="small" variant="outlined" />
            <Chip label="Accessibility-first" size="small" variant="outlined" />
        </Stack>
    );

    return (
        <PageShell
            title="Settings"
            subtitle="Manage security, appearance, and accessibility in one streamlined settings hub."
            icon={<SettingsIcon fontSize="large" />}
            actions={summaryActions}
        >
            <Grid container spacing={2}>
                {primaryCards
                    .filter((card) => card.visible)
                    .map((card) => (
                <Grid item xs={12} sm={6} md={4} key={card.title}>
                    <Paper
                        sx={{
                            p: 2,
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 2,
                            borderRadius: 3,
                            border: (theme) => `1px solid ${theme.palette.divider}`,
                            height: '100%',
                        }}
                        elevation={1}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            {card.icon}
                            <Typography variant="h6">{card.title}</Typography>
                        </Box>
                        <Typography variant="body2" color="text.secondary">{card.description}</Typography>
                        <Button component={Link} to={card.to} variant="outlined">{card.cta}</Button>
                    </Paper>
                </Grid>
                    ))}

                <Grid item xs={12} sm={6} md={4}>
                    <Paper sx={{ p: 2, mt: 1, borderRadius: 3 }} elevation={0}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1 }}>
                            Policies & Support
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                            Quickly access support resources and legal pages from one place.
                        </Typography>
                        <Stack spacing={1.25}>
                            {supportCards.map((card) => (
                                <Button
                                    key={card.title}
                                    component={Link}
                                    to={card.to}
                                    variant="text"
                                    sx={{ justifyContent: 'flex-start', textTransform: 'none', gap: 1 }}
                                    startIcon={card.icon}
                                >
                                    {card.title}
                                </Button>
                            ))}
                        </Stack>
                    </Paper>
                </Grid>

                <Grid item xs={12}>
                    <Paper sx={{ p: 2, mt: 1 }} elevation={0}>
                        <Typography variant="body2" color="text.secondary">
                            Other settings remain available in their feature areas (notifications, email preferences, security). Use global search or quick access (Ctrl/Cmd+K) to jump directly to specific controls.
                        </Typography>
                    </Paper>
                </Grid>
            </Grid>
        </PageShell>
    );
}
