import React, { useState } from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Avatar, Chip, TextField,
    InputAdornment, IconButton, List, ListItem, Divider
} from '@mui/material';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
    ArrowBack as ArrowBackIcon,
    Search as SearchIcon,
    FilterList as FilterIcon,
    ThumbUp as ThumbUpIcon,
    CheckCircle as CheckCircleIcon,
    BugReport as BugIcon,
    Lightbulb as FeatureIcon,
    ChatBubble as DiscussionIcon
} from '@mui/icons-material';

const forumPosts = [
    {
        id: 1,
        title: 'How do I customize the new profile badges?',
        category: 'Discussion',
        author: 'Alyssa Chen',
        avatar: 'A',
        votes: 45,
        replies: 12,
        solved: true,
        time: '2 hours ago',
        icon: <DiscussionIcon sx={{ color: '#8b5cf6' }} />
    },
    {
        id: 2,
        title: '[Bug] Video streaming buffers endlessly on Firefox mobile',
        category: 'Bug Report',
        author: 'Max Mustermann',
        avatar: 'M',
        votes: 120,
        replies: 45,
        solved: false,
        time: '4 hours ago',
        icon: <BugIcon sx={{ color: '#ef4444' }} />
    },
    {
        id: 3,
        title: 'Feature Request: Native calendar integration for Meetings',
        category: 'Feature Request',
        author: 'Sarah Jenkins',
        avatar: 'S',
        votes: 350,
        replies: 89,
        solved: false,
        time: '1 day ago',
        icon: <FeatureIcon sx={{ color: '#f59e0b' }} />
    }
];

export default function CommunityForum() {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button
                    component={Link}
                    to="/hubs"
                    startIcon={<ArrowBackIcon />}
                    sx={{ color: 'text.secondary', '&:hover': { color: 'primary.main' } }}
                >
                    Back to Hubs
                </Button>
                <Button variant="contained" color="secondary" sx={{ borderRadius: 8, fontWeight: 600 }}>
                    New Discussion
                </Button>
            </Box>

            <Box sx={{ mb: 6 }}>
                <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
                    <Typography
                        variant="h2"
                        fontWeight={800}
                        gutterBottom
                        sx={{
                            background: `linear-gradient(45deg, #8b5cf6, #ec4899)`,
                            WebkitBackgroundClip: 'text',
                            WebkitTextFillColor: 'transparent',
                        }}
                    >
                        Community Forum
                    </Typography>
                    <Typography variant="h6" color="text.secondary" maxWidth="800px">
                        Peer-to-peer support, bug reporting, and feature ideation. Help shape the future of Let's Connect.
                    </Typography>
                </motion.div>
            </Box>

            <Grid container spacing={4}>
                {/* Main Content */}
                <Grid item xs={12} md={8}>
                    <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}>
                        <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
                            <TextField
                                fullWidth
                                variant="outlined"
                                placeholder="Search discussions, bugs, features..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                InputProps={{
                                    startAdornment: (
                                        <InputAdornment position="start">
                                            <SearchIcon color="action" />
                                        </InputAdornment>
                                    ),
                                    sx: { borderRadius: 8, bgcolor: 'background.paper' }
                                }}
                            />
                            <Button variant="outlined" sx={{ borderRadius: 8, px: 3 }} startIcon={<FilterIcon />}>
                                Filter
                            </Button>
                        </Box>

                        <List sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                            {forumPosts.map((post) => (
                                <Card
                                    key={post.id}
                                    sx={{
                                        borderRadius: 4,
                                        border: `1px solid ${theme.palette.divider}`,
                                        boxShadow: 'none',
                                        '&:hover': {
                                            boxShadow: `0 8px 24px ${alpha(theme.palette.primary.main, 0.1)}`,
                                            borderColor: 'primary.main',
                                            transform: 'translateY(-2px)'
                                        },
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    <CardContent sx={{ display: 'flex', gap: 3, alignItems: 'flex-start', p: 3 }}>
                                        <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 60 }}>
                                            <IconButton size="small" sx={{ mb: 1 }}>
                                                <ThumbUpIcon fontSize="small" />
                                            </IconButton>
                                            <Typography variant="body1" fontWeight={700}>{post.votes}</Typography>
                                        </Box>

                                        <Box sx={{ flexGrow: 1 }}>
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                <Chip
                                                    icon={post.icon}
                                                    label={post.category}
                                                    size="small"
                                                    sx={{
                                                        fontWeight: 600,
                                                        bgcolor: alpha(theme.palette.background.default, 0.5),
                                                        borderColor: 'transparent'
                                                    }}
                                                />
                                                {post.solved && (
                                                    <Chip
                                                        icon={<CheckCircleIcon />}
                                                        label="Solved"
                                                        size="small"
                                                        color="success"
                                                        variant="outlined"
                                                    />
                                                )}
                                                <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                    {post.time}
                                                </Typography>
                                            </Box>

                                            <Typography variant="h6" fontWeight={700} gutterBottom sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                                                {post.title}
                                            </Typography>

                                            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                    <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                                                        {post.avatar}
                                                    </Avatar>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {post.author}
                                                    </Typography>
                                                </Box>
                                                <Box sx={{ flexGrow: 1, height: 4, bgcolor: 'divider', borderRadius: 2 }} />
                                                <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                    <ChatBubbleIcon fontSize="small" /> {post.replies} replies
                                                </Typography>
                                            </Box>
                                        </Box>
                                    </CardContent>
                                </Card>
                            ))}
                        </List>
                    </motion.div>
                </Grid>

                {/* Sidebar */}
                <Grid item xs={12} md={4}>
                    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }}>
                        <Card sx={{ borderRadius: 4, border: `1px solid ${theme.palette.divider}`, boxShadow: 'none', mb: 4 }}>
                            <CardContent sx={{ p: 3 }}>
                                <Typography variant="h6" fontWeight={700} gutterBottom>
                                    Top Contributors
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <List disablePadding>
                                    {['Sarah Jenkins', 'Alyssa Chen', 'Max Mustermann'].map((name, i) => (
                                        <ListItem disablePadding sx={{ py: 1.5 }} key={name}>
                                            <Avatar sx={{ width: 32, height: 32, mr: 2, bgcolor: i === 0 ? '#f59e0b' : i === 1 ? '#94a3b8' : '#b45309' }}>
                                                {name.charAt(0)}
                                            </Avatar>
                                            <Box sx={{ flexGrow: 1 }}>
                                                <Typography variant="body2" fontWeight={600}>{name}</Typography>
                                                <Typography variant="caption" color="text.secondary">{150 - i * 30} helpful posts</Typography>
                                            </Box>
                                            <Chip label={`Rank ${i + 1}`} size="small" />
                                        </ListItem>
                                    ))}
                                </List>
                            </CardContent>
                        </Card>

                        <Box
                            sx={{
                                p: 3,
                                borderRadius: 4,
                                bgcolor: theme.palette.mode === 'dark' ? alpha('#8b5cf6', 0.1) : alpha('#8b5cf6', 0.05),
                                border: `1px solid ${alpha('#8b5cf6', 0.2)}`
                            }}
                        >
                            <Typography variant="h6" fontWeight={700} gutterBottom>
                                Moderation Guidelines
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                Be helpful, be kind. Solutions marked as 'Accepted' award the author a 'Helper' badge.
                            </Typography>
                            <Button size="small" variant="outlined" sx={{ borderRadius: 4 }}>
                                Read Full Rules
                            </Button>
                        </Box>
                    </motion.div>
                </Grid>
            </Grid>
        </Container>
    );
}
