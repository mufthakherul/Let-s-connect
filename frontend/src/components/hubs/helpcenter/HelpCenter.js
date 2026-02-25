import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent, CardActionArea,
    useTheme, alpha, Button
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    MenuBook as ManualIcon,
    QuestionAnswer as QAIcon,
    Feedback as FeedbackIcon,
    SupportAgent as TicketIcon,
    ArrowBack as ArrowBackIcon
} from '@mui/icons-material';

const sections = [
    {
        title: 'User Manuals',
        description: 'Step-by-step guides for all platform features. Master Let\'s Connect from top to bottom.',
        icon: <ManualIcon sx={{ fontSize: 48 }} />,
        link: '/helpcenter/manuals',
        color: '#3b82f6'
    },
    {
        title: 'Q&A / FAQ',
        description: 'Frequently asked questions and direct answers for quick troubleshooting.',
        icon: <QAIcon sx={{ fontSize: 48 }} />,
        link: '/helpcenter/faq',
        color: '#10b981'
    },
    {
        title: 'Feedback',
        description: 'Share your thoughts and suggestions. Help us shape the future of the platform.',
        icon: <FeedbackIcon sx={{ fontSize: 48 }} />,
        link: '/helpcenter/feedback',
        color: '#f59e0b'
    },
    {
        title: 'Support Ticket',
        description: 'Get direct help from our round-the-clock support engineering team.',
        icon: <TicketIcon sx={{ fontSize: 48 }} />,
        link: '/helpcenter/tickets',
        color: '#ef4444'
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
        opacity: 1, y: 0,
        transition: { type: 'spring', stiffness: 300, damping: 24 }
    }
};

export default function HelpCenter() {
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

            <Box sx={{ textAlign: 'center', mb: 8 }}>
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.5 }}>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #3b82f6, #8b5cf6)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Help Center
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="700px" mx="auto">
                        Your first line of defense for platform issues. Find manuals, read FAQs, and connect with support engineers.
                    </Typography>
                </motion.div>
            </Box>

            <motion.div variants={containerVariants} initial="hidden" animate="visible">
                <Grid container spacing={4}>
                    {sections.map((section, index) => (
                        <Grid item xs={12} sm={6} key={index}>
                            <motion.div variants={itemVariants} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}>
                                <Card
                                    sx={{
                                        height: '100%',
                                        borderRadius: 4,
                                        border: `1px solid ${alpha(section.color, 0.2)}`,
                                        background: theme.palette.mode === 'dark'
                                            ? `linear-gradient(135deg, ${alpha(theme.palette.background.paper, 0.9)}, ${alpha(section.color, 0.05)})`
                                            : `linear-gradient(135deg, #ffffff, ${alpha(section.color, 0.05)})`,
                                        boxShadow: `0 8px 32px ${alpha(section.color, 0.1)}`,
                                        backdropFilter: 'blur(10px)',
                                    }}
                                >
                                    <CardActionArea component={Link} to={section.link} sx={{ height: '100%', p: 4 }}>
                                        <CardContent sx={{ textAlign: 'center', p: 0 }}>
                                            <Box
                                                sx={{
                                                    width: 80,
                                                    height: 80,
                                                    borderRadius: '50%',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    bgcolor: alpha(section.color, 0.1),
                                                    color: section.color,
                                                    mx: 'auto',
                                                    mb: 3
                                                }}
                                            >
                                                {section.icon}
                                            </Box>
                                            <Typography variant="h5" fontWeight={700} gutterBottom>
                                                {section.title}
                                            </Typography>
                                            <Typography variant="body1" color="text.secondary" sx={{ lineHeight: 1.6 }}>
                                                {section.description}
                                            </Typography>
                                        </CardContent>
                                    </CardActionArea>
                                </Card>
                            </motion.div>
                        </Grid>
                    ))}
                </Grid>
            </motion.div>

            <Box sx={{ mt: 8 }}>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
                    <Box
                        sx={{
                            p: 4,
                            borderRadius: 4,
                            bgcolor: theme.palette.mode === 'dark' ? alpha('#3b82f6', 0.1) : alpha('#3b82f6', 0.05),
                            border: `1px solid ${alpha('#3b82f6', 0.2)}`,
                            textAlign: 'center'
                        }}
                    >
                        <Typography variant="h5" fontWeight={700} gutterBottom>
                            Can't find what you're looking for?
                        </Typography>
                        <Typography variant="body1" color="text.secondary" mb={2}>
                            Browse the Community Forum for peer-to-peer resolutions, or email us directly at <strong>support@letsconnect.com</strong>.
                        </Typography>
                        <Button variant="contained" component={Link} to="/hubs/forum" sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                            Visit Community Forum
                        </Button>
                    </Box>
                </motion.div>
            </Box>
        </Container>
    );
}
