import React, { useState, useEffect } from 'react';
import {
    Container, Typography, Box, Grid, Card, CardContent,
    useTheme, alpha, Button, Avatar, Chip, TextField,
    InputAdornment, IconButton, List, ListItem, Divider,
    CircularProgress, Dialog, DialogTitle, DialogContent,
    DialogActions, Select, MenuItem, FormControl, InputLabel
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
import axios from 'axios';

export default function CommunityForum() {
    const theme = useTheme();
    const [searchTerm, setSearchTerm] = useState('');
    const [posts, setPosts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dialogOpen, setDialogOpen] = useState(false);

    // New Post State
    const [newTitle, setNewTitle] = useState('');
    const [newContent, setNewContent] = useState('');
    const [newCategory, setNewCategory] = useState('Discussion');

    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const token = localStorage.getItem('token');

    useEffect(() => {
        fetchPosts();
    }, []);

    const fetchPosts = async () => {
        try {
            setLoading(true);
            const response = await axios.get('/api/content/forum/posts');
            setPosts(response.data);
        } catch (err) {
            console.error('Error fetching forum posts:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleUpvote = async (postId) => {
        if (!user.id) return; // Need login
        try {
            await axios.post(`/api/content/forum/posts/${postId}/vote`,
                { value: 1 },
                { headers: { 'x-user-id': user.id } }
            );
            // Optimistic update
            setPosts(posts.map(p => p.id === postId ? { ...p, votes: (p.votes || 0) + 1 } : p));
        } catch (err) {
            console.error('Failed to upvote:', err);
        }
    };

    const handleCreatePost = async () => {
        if (!user.id || !newTitle || !newContent) return;
        try {
            await axios.post('/api/content/forum/posts',
                { title: newTitle, content: newContent, category: newCategory },
                { headers: { 'x-user-id': user.id } }
            );
            setDialogOpen(false);
            setNewTitle('');
            setNewContent('');
            fetchPosts();
        } catch (err) {
            console.error('Failed to create post:', err);
        }
    };

    const getIconForCategory = (category) => {
        switch (category) {
            case 'Bug Report': return <BugIcon sx={{ color: '#ef4444' }} />;
            case 'Feature Request': return <FeatureIcon sx={{ color: '#f59e0b' }} />;
            default: return <DiscussionIcon sx={{ color: '#8b5cf6' }} />;
        }
    };

    const filteredPosts = posts.filter(post =>
        post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        post.content?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <>
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
                    <Button
                        variant="contained"
                        color="secondary"
                        sx={{ borderRadius: 8, fontWeight: 600 }}
                        onClick={() => setDialogOpen(true)}
                    >
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
                                {loading ? (
                                    <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                                        <CircularProgress />
                                    </Box>
                                ) : filteredPosts.length === 0 ? (
                                    <Typography color="text.secondary" sx={{ textAlign: 'center', py: 4 }}>
                                        No discussions found. Be the first to start one!
                                    </Typography>
                                ) : filteredPosts.map((post) => (
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
                                                <IconButton size="small" sx={{ mb: 1 }} onClick={() => handleUpvote(post.id)}>
                                                    <ThumbUpIcon fontSize="small" />
                                                </IconButton>
                                                <Typography variant="body1" fontWeight={700}>{post.votes || 0}</Typography>
                                            </Box>

                                            <Box sx={{ flexGrow: 1 }}>
                                                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                                                    <Chip
                                                        icon={getIconForCategory(post.category)}
                                                        label={post.category}
                                                        size="small"
                                                        sx={{
                                                            fontWeight: 600,
                                                            bgcolor: alpha(theme.palette.background.default, 0.5),
                                                            borderColor: 'transparent'
                                                        }}
                                                    />
                                                    {post.isSolved && (
                                                        <Chip
                                                            icon={<CheckCircleIcon />}
                                                            label="Solved"
                                                            size="small"
                                                            color="success"
                                                            variant="outlined"
                                                        />
                                                    )}
                                                    <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto' }}>
                                                        {new Date(post.createdAt).toLocaleDateString()}
                                                    </Typography>
                                                </Box>

                                                <Typography variant="h6" fontWeight={700} gutterBottom sx={{ cursor: 'pointer', '&:hover': { color: 'primary.main' } }}>
                                                    {post.title}
                                                </Typography>

                                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'center', mt: 2 }}>
                                                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                        <Avatar sx={{ width: 24, height: 24, fontSize: '0.8rem', bgcolor: 'primary.main' }}>
                                                            U
                                                        </Avatar>
                                                        <Typography variant="body2" color="text.secondary">
                                                            User
                                                        </Typography>
                                                    </Box>
                                                    <Box sx={{ flexGrow: 1, height: 4, bgcolor: 'divider', borderRadius: 2 }} />
                                                    <Typography variant="body2" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                                        <DiscussionIcon fontSize="small" /> {post.replies || 0} replies
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

            {/* Create Post Dialog */}
            <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Start a New Discussion</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, mt: 1 }}>
                        <TextField
                            label="Title"
                            fullWidth
                            value={newTitle}
                            onChange={(e) => setNewTitle(e.target.value)}
                        />
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={newCategory}
                                label="Category"
                                onChange={(e) => setNewCategory(e.target.value)}
                            >
                                <MenuItem value="Discussion">Discussion</MenuItem>
                                <MenuItem value="Bug Report">Bug Report</MenuItem>
                                <MenuItem value="Feature Request">Feature Request</MenuItem>
                                <MenuItem value="General">General</MenuItem>
                            </Select>
                        </FormControl>
                        <TextField
                            label="Content Details"
                            multiline
                            rows={4}
                            fullWidth
                            value={newContent}
                            onChange={(e) => setNewContent(e.target.value)}
                        />
                    </Box>
                </DialogContent>
                <DialogActions sx={{ p: 2 }}>
                    <Button onClick={() => setDialogOpen(false)} color="inherit">Cancel</Button>
                    <Button onClick={handleCreatePost} variant="contained" disabled={!newTitle || !newContent}>
                        Post Discussion
                    </Button>
                </DialogActions>
            </Dialog>
        </>
    );
}
