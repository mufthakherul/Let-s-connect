import React from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent, CardActionArea,
    useTheme, alpha, Button, Chip, LinearProgress
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    School as EducationIcon,
    Security as SecurityIcon,
    Search as ResearchIcon,
    MenuBook as TutorialIcon,
    PlayCircleFilled as PlayIcon
} from '@mui/icons-material';

const courses = [
    {
        title: 'Spotting Phishing Attempts',
        category: 'Security Basics',
        duration: '10 mins',
        progress: 100,
        icon: <SecurityIcon sx={{ fontSize: 40, color: '#ef4444' }} />
    },
    {
        title: 'Fact vs. Fiction Online',
        category: 'Digital Literacy',
        duration: '15 mins',
        progress: 30,
        icon: <ResearchIcon sx={{ fontSize: 40, color: '#3b82f6' }} />
    },
    {
        title: 'Intro to Open Source Philosophy',
        category: 'Community Contribution',
        duration: '25 mins',
        progress: 0,
        icon: <TutorialIcon sx={{ fontSize: 40, color: '#10b981' }} />
    }
];

export default function EducationalResourceCenter() {
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

            <Box sx={{ mb: 8, textAlign: 'center' }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Box sx={{ display: 'flex', justifyContent: 'center', mb: 2 }}>
                        <EducationIcon sx={{ fontSize: 64, color: '#6366f1' }} />
                    </Box>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #6366f1, #8b5cf6)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Educational Resources
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="800px" mx="auto">
                        Bridge the digital literacy gap. Learn how to stay safe, identify misinformation, and contribute effectively to online communities.
                    </Typography>
                </motion.div>
            </Box>

            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 4 }}>
                Featured Mini-Courses
            </Typography>

            <Grid container spacing={4}>
                {courses.map((course, i) => (
                    <Grid item xs={12} md={4} key={i}>
                        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                            <Card
                                sx={{
                                    height: '100%',
                                    borderRadius: 4,
                                    border: `1px solid ${theme.palette.divider}`,
                                    boxShadow: 'none',
                                    '&:hover': { boxShadow: `0 8px 32px ${alpha('#6366f1', 0.15)}`, transform: 'translateY(-4px)' },
                                    transition: 'all 0.3s'
                                }}
                            >
                                <CardActionArea sx={{ height: '100%', p: 3, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                                    <Box sx={{ mb: 3 }}>{course.icon}</Box>
                                    <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                                        <Chip label={course.category} size="small" sx={{ fontWeight: 600 }} />
                                        <Chip label={course.duration} size="small" variant="outlined" />
                                    </Box>
                                    <Typography variant="h6" fontWeight={700} gutterBottom sx={{ mt: 1 }}>
                                        {course.title}
                                    </Typography>

                                    <Box sx={{ mt: 'auto', width: '100%', pt: 4 }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Typography variant="caption" fontWeight={600}>
                                                {course.progress === 100 ? 'Completed 🎉' : 'Progress'}
                                            </Typography>
                                            <Typography variant="caption">{course.progress}%</Typography>
                                        </Box>
                                        <LinearProgress
                                            variant="determinate"
                                            value={course.progress}
                                            color={course.progress === 100 ? 'success' : 'primary'}
                                            sx={{ height: 6, borderRadius: 3 }}
                                        />
                                    </Box>
                                </CardActionArea>
                            </Card>
                        </motion.div>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 8, p: 4, borderRadius: 6, bgcolor: theme.palette.mode === 'dark' ? alpha('#10b981', 0.1) : alpha('#10b981', 0.05), border: `1px solid ${alpha('#10b981', 0.2)}`, display: 'flex', gap: 4, alignItems: 'center', flexWrap: 'wrap' }}>
                <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h5" fontWeight={700} gutterBottom>
                        Earn the "Digitally Literate" Profile Badge
                    </Typography>
                    <Typography variant="body1" color="text.secondary">
                        Pass the interactive safety quiz with a score of 90% or higher to permanently display the verified knowledge badge on your profile.
                    </Typography>
                </Box>
                <Button variant="contained" color="success" startIcon={<PlayIcon />} sx={{ borderRadius: 8, px: 4, py: 1.5, fontWeight: 600 }}>
                    Take the Final Quiz
                </Button>
            </Box>
        </Container>
    );
}
