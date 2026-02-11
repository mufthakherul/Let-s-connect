import React, { useMemo, useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
    CardHeader,
    CardActions,
    Divider,
    Skeleton,
    MenuItem,
    Select,
    FormControl,
    Menu,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Chip,
    Stack,
    Switch,
    FormControlLabel,
    Link as MuiLink
} from '@mui/material';
import {
    ThumbUpOutlined,
    Comment,
    Share,
    MoreVert,
    Public,
    Lock,
    Group,
    BookmarkBorder,
    Bookmark,
    EmojiEmotions,
    Image,
    VideoLibrary,
    Repeat,
    AutoAwesome,
    Forum,
    Tag
} from '@mui/icons-material';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, formatNumber, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';
import api from '../utils/api';

const VISIBILITY_OPTIONS = [
    { value: 'public', label: 'Public', icon: <Public fontSize="small" /> },
    { value: 'friends', label: 'Friends', icon: <Group fontSize="small" /> },
    { value: 'private', label: 'Only Me', icon: <Lock fontSize="small" /> }
];

const REACTIONS = [
    { value: 'like', label: 'Like', emoji: '👍' },
    { value: 'love', label: 'Love', emoji: '❤️' },
    { value: 'haha', label: 'Haha', emoji: '😄' },
    { value: 'wow', label: 'Wow', emoji: '😮' },
    { value: 'sad', label: 'Sad', emoji: '😢' },
    { value: 'angry', label: 'Angry', emoji: '😡' }
];

/**
 * Homepage component - Shows all recent/suggested posts from across the platform
 * This is the homepage for registered users
 */
function Homepage({ user }) {
    const navigate = useNavigate();
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [threadMode, setThreadMode] = useState(false);
    const [threadTweets, setThreadTweets] = useState(['']);
    const [reactionAnchor, setReactionAnchor] = useState(null);
    const [reactionTarget, setReactionTarget] = useState(null);
    const [retweetAnchor, setRetweetAnchor] = useState(null);
    const [retweetTarget, setRetweetTarget] = useState(null);
    const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
    const [quoteText, setQuoteText] = useState('');
    const [threadDialogOpen, setThreadDialogOpen] = useState(false);
    const [threadView, setThreadView] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [awardDialogPost, setAwardDialogPost] = useState(null);
    const [awards, setAwards] = useState([]);
    const [postAwards, setPostAwards] = useState({});
    const [selectedAwardId, setSelectedAwardId] = useState('');
    const [awardMessage, setAwardMessage] = useState('');
    const [bookmarks, setBookmarks] = useState({});
    const { ref, inView } = useInView();

    useEffect(() => {
        fetchPosts(1);
    }, []);

    useEffect(() => {
        if (inView && hasMore && !loading) {
            fetchPosts(page + 1);
        }
    }, [inView]);

    useEffect(() => {
        if (inView && page > 1) {
            window.scrollTo(0, 0);
        }
    }, [page]);

    const fetchPosts = async (pageNum) => {
        try {
            // Fetch all public posts from across the platform
            const response = await api.get(`/content/public/posts?page=${pageNum}&limit=10`);
            if (response.data && response.data.length > 0) {
                if (pageNum === 1) {
                    setPosts(response.data);
                } else {
                    setPosts(prev => [...prev, ...response.data]);
                }
                setPage(pageNum);
            } else {
                setHasMore(false);
            }
        } catch (error) {
            console.error('Failed to fetch posts:', error);
            toast.error('Failed to load posts');
            setHasMore(false);
        } finally {
            setLoading(false);
        }
    };

    const handleCreatePost = async () => {
        if (!newPost.trim()) {
            toast.error('Please write something');
            return;
        }

        try {
            const response = await api.post('/content/posts', {
                content: newPost,
                visibility,
                userId: user.id
            });

            setPosts(prev => [response.data, ...prev]);
            setNewPost('');
            toast.success('Post created successfully');
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post');
        }
    };

    const handleAddThreadTweet = () => {
        setThreadTweets(prev => [...prev, '']);
    };

    const handleThreadTweetChange = (index, value) => {
        const newTweets = [...threadTweets];
        newTweets[index] = value;
        setThreadTweets(newTweets);
    };

    const handleCreateThread = async () => {
        const validTweets = threadTweets.filter(t => t.trim());
        if (validTweets.length === 0) {
            toast.error('Please write at least one tweet');
            return;
        }

        try {
            const response = await api.post('/content/threads', {
                tweets: validTweets,
                userId: user.id,
                visibility
            });

            setPosts(prev => [response.data, ...prev]);
            setThreadTweets(['']);
            setThreadMode(false);
            toast.success('Thread created successfully');
        } catch (error) {
            console.error('Error creating thread:', error);
            toast.error('Failed to create thread');
        }
    };

    const handleReaction = async (postId, reaction) => {
        try {
            await api.post(`/content/posts/${postId}/reactions`, {
                reaction,
                userId: user.id
            });

            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        reactions: [...(post.reactions || []), { userId: user.id, reaction }]
                    };
                }
                return post;
            }));

            setReactionAnchor(null);
            toast.success(`Reacted with ${reaction}`);
        } catch (error) {
            console.error('Error adding reaction:', error);
            toast.error('Failed to add reaction');
        }
    };

    const handleRetweet = async (postId) => {
        try {
            await api.post(`/content/posts/${postId}/retweet`, {
                userId: user.id
            });

            setPosts(prev => prev.map(post => {
                if (post.id === postId) {
                    return {
                        ...post,
                        retweets: [...(post.retweets || []), { userId: user.id }]
                    };
                }
                return post;
            }));

            setRetweetAnchor(null);
            toast.success('Retweeted!');
        } catch (error) {
            console.error('Error retweeting:', error);
            toast.error('Failed to retweet');
        }
    };

    const handleQuote = async (postId) => {
        if (!quoteText.trim()) {
            toast.error('Please write something');
            return;
        }

        try {
            const response = await api.post(`/content/posts/${postId}/quote`, {
                content: quoteText,
                userId: user.id,
                visibility
            });

            setPosts(prev => [response.data, ...prev]);
            setQuoteText('');
            setQuoteDialogOpen(false);
            toast.success('Quote tweet created');
        } catch (error) {
            console.error('Error quote tweeting:', error);
            toast.error('Failed to create quote tweet');
        }
    };

    const handleReply = async (postId) => {
        if (!replyText.trim()) {
            toast.error('Please write something');
            return;
        }

        try {
            await api.post(`/content/posts/${postId}/comments`, {
                content: replyText,
                userId: user.id
            });

            setReplyText('');
            setThreadDialogOpen(false);
            toast.success('Reply posted');
        } catch (error) {
            console.error('Error posting reply:', error);
            toast.error('Failed to post reply');
        }
    };

    const renderPostCard = (post, index) => {
        return (
            <Card key={post.id || index} sx={{ mb: 2 }}>
                <CardHeader
                    avatar={
                        <Avatar
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/profile/${post.userId}`)}
                        >
                            {getInitials(post.author?.firstName + ' ' + post.author?.lastName)}
                        </Avatar>
                    }
                    title={
                        <MuiLink
                            component="span"
                            onClick={() => navigate(`/profile/${post.userId}`)}
                            sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                        >
                            {post.author?.firstName} {post.author?.lastName}
                        </MuiLink>
                    }
                    subheader={formatRelativeTime(post.createdAt)}
                    action={
                        <IconButton
                            size="small"
                            onClick={e => setReactionAnchor(e.currentTarget) || setReactionTarget(post.id)}
                        >
                            <MoreVert />
                        </IconButton>
                    }
                />
                {post.featuredImage && (
                    <Box
                        component="img"
                        src={post.featuredImage}
                        alt="Post"
                        sx={{ width: '100%', height: 300, objectFit: 'cover' }}
                    />
                )}
                <CardContent>
                    <Typography variant="body1" paragraph>
                        {post.content}
                    </Typography>
                </CardContent>
                <Divider />
                <CardActions disableSpacing>
                    <IconButton
                        size="small"
                        onClick={e => setReactionAnchor(e.currentTarget) || setReactionTarget(post.id)}
                    >
                        <ThumbUpOutlined fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {formatNumber(post.reactions?.length || 0)}
                        </Typography>
                    </IconButton>
                    <IconButton
                        size="small"
                        onClick={() => {
                            setThreadView(post);
                            setThreadDialogOpen(true);
                        }}
                    >
                        <Comment fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {formatNumber(post.commentCount || 0)}
                        </Typography>
                    </IconButton>
                    <IconButton size="small" onClick={() => handleRetweet(post.id)}>
                        <Repeat fontSize="small" />
                        <Typography variant="caption" sx={{ ml: 0.5 }}>
                            {formatNumber(post.retweets?.length || 0)}
                        </Typography>
                    </IconButton>
                    <IconButton size="small" onClick={() => setQuoteDialogOpen(true) || setQuoteText('')}>
                        <Forum fontSize="small" />
                    </IconButton>
                    <IconButton size="small">
                        <Share fontSize="small" />
                    </IconButton>
                </CardActions>
            </Card>
        );
    };

    return (
        <Box sx={{ maxWidth: 600, mx: 'auto', py: 2 }}>
            {/* Create Post Section */}
            <Card sx={{ mb: 3, p: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ mr: 2 }}>
                        {getInitials(user.firstName + ' ' + user.lastName)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="What's happening?!"
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 2 }}
                        />
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <IconButton size="small">
                                    <Image fontSize="small" color="primary" />
                                </IconButton>
                                <IconButton size="small">
                                    <VideoLibrary fontSize="small" color="primary" />
                                </IconButton>
                                <IconButton size="small">
                                    <EmojiEmotions fontSize="small" color="primary" />
                                </IconButton>
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <FormControl size="small" sx={{ minWidth: 100 }}>
                                    <Select value={visibility} onChange={e => setVisibility(e.target.value)}>
                                        {VISIBILITY_OPTIONS.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button
                                    variant="contained"
                                    onClick={handleCreatePost}
                                    disabled={!newPost.trim()}
                                >
                                    Post
                                </Button>
                            </Box>
                        </Box>
                    </Box>
                </Box>
            </Card>

            {/* Posts Feed */}
            {loading && page === 1 ? (
                <Box sx={{ mb: 2 }}>
                    {[...Array(3)].map((_, i) => (
                        <Card key={i} sx={{ mb: 2 }}>
                            <CardHeader
                                avatar={<Skeleton variant="circular" width={40} height={40} />}
                                title={<Skeleton width="60%" />}
                                subheader={<Skeleton width="40%" />}
                            />
                            <CardContent>
                                <Skeleton variant="rectangular" height={100} />
                            </CardContent>
                        </Card>
                    ))}
                </Box>
            ) : posts.length > 0 ? (
                <Box>
                    {posts.map((post, index) => renderPostCard(post, index))}
                    <Box ref={ref} sx={{ py: 4, textAlign: 'center' }}>
                        {loading ? <Skeleton /> : hasMore ? 'Loading more...' : 'No more posts'}
                    </Box>
                </Box>
            ) : (
                <Typography textAlign="center" color="textSecondary">
                    No posts available
                </Typography>
            )}

            {/* Reply Dialog */}
            <Dialog open={threadDialogOpen} onClose={() => setThreadDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Reply to Post</DialogTitle>
                <DialogContent>
                    {threadView && renderPostCard(threadView, 0)}
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="What do you think?"
                        value={replyText}
                        onChange={e => setReplyText(e.target.value)}
                        variant="outlined"
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setThreadDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => handleReply(threadView?.id)}
                        disabled={!replyText.trim()}
                    >
                        Reply
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Quote Dialog */}
            <Dialog open={quoteDialogOpen} onClose={() => setQuoteDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Quote Post</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        multiline
                        minRows={3}
                        placeholder="What's your take?"
                        value={quoteText}
                        onChange={e => setQuoteText(e.target.value)}
                        variant="outlined"
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setQuoteDialogOpen(false)}>Cancel</Button>
                    <Button
                        variant="contained"
                        onClick={() => handleQuote(reactionTarget)}
                        disabled={!quoteText.trim()}
                    >
                        Quote
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Homepage;
