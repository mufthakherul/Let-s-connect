import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent, CardActionArea,
    useTheme, Chip, Divider, alpha
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    HelpOutline as HelpIcon,
    Code as CodeIcon,
    Forum as ForumIcon,
    Policy as TrustIcon,
    ColorLens as CreatorIcon,
    BusinessCenter as BusinessIcon,
    AccessibilityNew as A11yIcon,
    SelfImprovement as WellbeingIcon,
    School as EducationIcon,
    Favorite as DonationIcon
} from '@mui/icons-material';

const hubs = [
    {
        category: 'Support & Safety',
        items: [
            {
                title: 'Help Center',
                description: 'FAQs, troubleshooting, and account recovery.',
                icon: <HelpIcon sx={{ fontSize: 40 }} />,
                link: '/helpcenter',
                color: '#3b82f6',
                popular: true
            },
            {
                title: 'Community Forum',
                description: 'Peer-to-peer support, bug reports, and features.',
                icon: <ForumIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/forum',
                color: '#8b5cf6'
            },
            {
                title: 'Transparency & Trust',
                description: 'Moderation policies and algorithm updates.',
                icon: <TrustIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/transparency',
                color: '#10b981'
            }
        ]
    },
    {
        category: 'Growth & Business',
        items: [
            {
                title: 'Creator Hub',
                description: 'Monetization guides and audience growth.',
                icon: <CreatorIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/creator',
                color: '#f59e0b',
                popular: true
            },
            {
                title: 'Business & Ads',
                description: 'Campaign tutorials and sponsorships.',
                icon: <BusinessIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/business',
                color: '#06b6d4'
            }
        ]
    },
    {
        category: 'Developers & Open Source',
        items: [
            {
                title: 'Developer Portal',
                description: 'API docs, SDKs, and contribution guides.',
                icon: <CodeIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/developer',
                color: '#ef4444'
            },
            {
                title: 'Donation & Sustainability',
                description: 'Support open-source development.',
                icon: <DonationIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/donation',
                color: '#ec4899',
                popular: true
            }
        ]
    },
    {
        category: 'Digital Wellbeing & Education',
        items: [
            {
                title: 'Accessibility Resources',
                description: 'Inclusive posting guides and A11y APIs.',
                icon: <A11yIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/accessibility',
                color: '#14b8a6'
            },
            {
                title: 'Wellbeing Center',
                description: 'Tools for healthy social media balance.',
                icon: <WellbeingIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/wellbeing',
                color: '#84cc16'
            },
            {
                title: 'Educational Center',
                description: 'Digital literacy and safe online practices.',
                icon: <EducationIcon sx={{ fontSize: 40 }} />,
                link: '/hubs/education',
                color: '#6366f1'
            }
        ]
    }
];

const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
        opacity: 1,
        transition: { staggerChildren: 0.1 }
    }
};

const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

export default function HubsDirectory() {
    const theme = useTheme();

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Community Hubs
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="800px" mx="auto">
                        Explore our ecosystem of resources designed to support users, empower creators, and foster an open-source collaborative environment.
                    </Typography>
                </motion.div>
            </Box>

            {hubs.map((section, sectionIdx) => (
                <Box key={section.category} sx={{ mb: 6 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {section.category}
                        <Box sx={{ flexGrow: 1, height: 1, bgcolor: 'divider' }} />
                    </Typography>

                    <motion.div
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                    >
                        <Grid container spacing={3} sx={{ mt: 1 }}>
                            {section.items.map((hub) => (
                                <Grid item xs={12} sm={6} md={4} key={hub.title}>
                                    <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                        <Card
                                            sx={{
                                                height: '100%',
                                                borderRadius: 4,
                                                border: `1px solid ${alpha(hub.color, 0.2)}`,
                                                background: theme.palette.mode === 'dark'
                                                    ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(hub.color, 0.05)})`
                                                    : `linear-gradient(135deg, #ffffff, ${alpha(hub.color, 0.05)})`,
                                                boxShadow: `0 8px 32px ${alpha(hub.color, 0.1)}`,
                                                backdropFilter: 'blur(10px)',
                                                overflow: 'visible'
                                            }}
                                        >
                                            <CardActionArea component={Link} to={hub.link} sx={{ height: '100%', p: 3 }}>
                                                {hub.popular && (
                                                    <Chip
                                                        label="Popular"
                                                        size="small"
                                                        sx={{
                                                            position: 'absolute',
                                                            top: -12,
                                                            right: 20,
                                                            bgcolor: hub.color,
                                                            color: '#fff',
                                                            fontWeight: 'bold',
                                                            boxShadow: `0 4px 12px ${alpha(hub.color, 0.4)}`
                                                        }}
                                                    />
                                                )}
                                                <CardContent sx={{ p: 0 }}>
                                                    <Box
                                                        sx={{
                                                            width: 64,
                                                            height: 64,
                                                            borderRadius: 3,
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'center',
                                                            bgcolor: alpha(hub.color, 0.1),
                                                            color: hub.color,
                                                            mb: 3
                                                        }}
                                                    >
                                                        {hub.icon}
                                                    </Box>
                                                    <Typography variant="h6" fontWeight={700} gutterBottom>
                                                        {hub.title}
                                                    </Typography>
                                                    <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                                        {hub.description}
                                                    </Typography>
                                                </CardContent>
                                            </CardActionArea>
                                        </Card>
                                    </motion.div>
                                </Grid>
                            ))}
                        </Grid>
                    </motion.div>
                </Box>
            ))}
        </Container>
    );
}
