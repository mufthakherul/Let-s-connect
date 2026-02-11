import React from 'react';
import {
    Typography, Box, Button, Grid, Card, CardContent, Container, useTheme,
    Paper, Chip, Stack
} from '@mui/material';
import {
    Speed, Security, CloudDone, Groups, Chat, VideoLibrary,
    ShoppingCart, Description, SmartToy, Verified
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

function UnregisterLanding() {
    const theme = useTheme();

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
            title: 'AI Assistant',
            description: 'Get help from Gemini-powered intelligent assistant',
            link: '/chat',
            icon: <SmartToy sx={{ fontSize: 40, color: 'secondary.main' }} />
        }
    ];

    const highlights = [
        { icon: <Speed />, text: 'High Performance' },
        { icon: <Security />, text: 'Secure & Private' },
        { icon: <CloudDone />, text: 'Self-Hosted' },
        { icon: <Verified />, text: 'Production Ready' },
    ];

    return (
        <Container maxWidth="lg">
            {/* Hero Section */}
            <Box sx={{ textAlign: 'center', mb: 8, mt: 4 }}>
                <Typography
                    variant="h2"
                    gutterBottom
                    fontWeight="bold"
                    sx={{
                        background: `linear-gradient(45deg, ${theme.palette.primary.main}, ${theme.palette.secondary.main})`,
                        WebkitBackgroundClip: 'text',
                        WebkitTextFillColor: 'transparent',
                    }}
                >
                    Welcome to Let's Connect
                </Typography>
                <Typography variant="h5" color="text.secondary" paragraph sx={{ mb: 3 }}>
                    The All-in-One Social Collaboration Platform
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ maxWidth: 800, mx: 'auto', mb: 4 }}>
                    A comprehensive platform bringing together social networking, real-time messaging,
                    video sharing, team collaboration, and e-commerce in a unified,
                    secure, self-hosted solution designed for modern communities.
                </Typography>

                <Stack direction="row" spacing={2} justifyContent="center" sx={{ mb: 4 }}>
                    {highlights.map((item, i) => (
                        <Chip
                            key={i}
                            icon={item.icon}
                            label={item.text}
                            color="primary"
                            variant="outlined"
                        />
                    ))}
                </Stack>

                <Box sx={{ mt: 4 }}>
                    <Button
                        variant="contained"
                        size="large"
                        component={Link}
                        to="/register"
                        sx={{ mr: 2, px: 4, py: 1.5 }}
                    >
                        Get Started Free
                    </Button>
                    <Button
                        variant="outlined"
                        size="large"
                        component={Link}
                        to="/videos"
                        sx={{ px: 4, py: 1.5 }}
                    >
                        Explore Content
                    </Button>
                </Box>
            </Box>

            {/* Features Grid */}
            <Box sx={{ mb: 8 }}>
                <Typography variant="h4" fontWeight="bold" sx={{ mb: 4, textAlign: 'center' }}>
                    Powerful Features
                </Typography>
                <Grid container spacing={3}>
                    {features.map((feature, index) => (
                        <Grid item xs={12} sm={6} md={4} key={index}>
                            <Card
                                sx={{
                                    height: '100%',
                                    transition: 'transform 0.2s, box-shadow 0.2s',
                                    '&:hover': {
                                        transform: 'translateY(-4px)',
                                        boxShadow: 6,
                                    }
                                }}
                            >
                                <CardContent sx={{ textAlign: 'center', py: 4 }}>
                                    <Box sx={{ mb: 2 }}>
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
                                    >
                                        Learn More →
                                    </Button>
                                </CardContent>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>

            {/* Platform Features */}
            <Paper elevation={0} sx={{ p: 4, mb: 8, bgcolor: 'background.default', borderRadius: 3 }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                    What's Included
                </Typography>
                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom color="primary">
                            📱 Social & Communication
                        </Typography>
                        <ul style={{ lineHeight: 2 }}>
                            <li>Dynamic feed with reactions, comments, and groups</li>
                            <li>Hashtag system with trending topics and bookmarks</li>
                            <li>Organized servers with role-based permissions</li>
                            <li>Real-time messaging with multimedia support</li>
                            <li>Community forums with upvoting and moderation</li>
                        </ul>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Typography variant="h6" gutterBottom color="primary">
                            💼 Professional & Productivity
                        </Typography>
                        <ul style={{ lineHeight: 2 }}>
                            <li>Professional profiles with skills and endorsements</li>
                            <li>Project management with issues and milestones</li>
                            <li>Collaborative documents and knowledge wikis</li>
                            <li>Video platform with channels and subscriptions</li>
                            <li>Full-featured e-commerce with shopping cart</li>
                        </ul>
                    </Grid>
                </Grid>
            </Paper>

            {/* Tech Stack */}
            <Box sx={{ mb: 8, textAlign: 'center' }}>
                <Typography variant="h4" fontWeight="bold" gutterBottom sx={{ mb: 3 }}>
                    Built with Modern Technology
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    React 18.3 • Material-UI v5 • Node.js • PostgreSQL • Redis • Docker • Socket.IO
                </Typography>
                <Stack direction="row" spacing={2} justifyContent="center" flexWrap="wrap" sx={{ mt: 3 }}>
                    <Chip label="Microservices" variant="outlined" />
                    <Chip label="Real-time" variant="outlined" />
                    <Chip label="Dark Mode" variant="outlined" />
                    <Chip label="Responsive" variant="outlined" />
                    <Chip label="Secure" variant="outlined" />
                    <Chip label="Scalable" variant="outlined" />
                    <Chip label="Open Source" variant="outlined" />
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
            >
                <Typography variant="h4" fontWeight="bold" gutterBottom>
                    Ready to Get Started?
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph sx={{ mb: 3 }}>
                    Join our growing community and experience the future of connected collaboration
                </Typography>
                <Button
                    variant="contained"
                    size="large"
                    component={Link}
                    to="/register"
                    sx={{ px: 5, py: 1.5 }}
                >
                    Create Free Account
                </Button>
            </Paper>
        </Container>
    );
}

export default UnregisterLanding;
