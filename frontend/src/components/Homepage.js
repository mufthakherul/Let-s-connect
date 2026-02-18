import React, { useState, useEffect, useRef } from 'react';
import {
    Box,
    Card,
    CardContent,
    CardHeader,
    Typography,
    TextField,
    Button,
    Avatar,
    IconButton,
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
    Link as MuiLink,
    Tooltip,
    Tabs,
    Tab,
    ButtonGroup
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
import { formatRelativeTime, formatApproximateTime, formatNumber, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { motion } from 'framer-motion';

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

const containerVariants = {
    hidden: { opacity: 0, y: 12 },
    visible: {
        opacity: 1,
        y: 0,
        transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.08 }
    }
};

const cardVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

const hoverCardSx = {
    transition: 'transform 0.2s ease, box-shadow 0.2s ease',
    '&:hover': {
        transform: 'translateY(-4px)',
        boxShadow: 6
    }
};

const softActionSx = {
    transition: 'transform 0.15s ease, box-shadow 0.15s ease',
    '&:hover': {
        transform: 'translateY(-1px)',
        boxShadow: 3
    }
};

/**
 * Homepage component - Shows all recent/suggested posts from across the platform
 * This is the homepage for registered users
 */
function Homepage({ user }) {
    const navigate = useNavigate();
    const composerRef = useRef(null);
    const imageInputRef = useRef(null);
    const videoInputRef = useRef(null);
    const [posts, setPosts] = useState([]);
    const [newPost, setNewPost] = useState('');
    const [visibility, setVisibility] = useState('public');
    const [mediaAttachments, setMediaAttachments] = useState([]);
    const [mediaUrlInput, setMediaUrlInput] = useState('');
    const [uploadingMedia, setUploadingMedia] = useState(false);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [hasMore, setHasMore] = useState(true);
    const [threadMode, setThreadMode] = useState(false);
    const [threadTweets, setThreadTweets] = useState(['']);
    const [reactionAnchor, setReactionAnchor] = useState(null);
    const [reactionTarget, setReactionTarget] = useState(null);
    const [postMenuAnchor, setPostMenuAnchor] = useState(null);
    const [postMenuTarget, setPostMenuTarget] = useState(null);
    const [postAnonymous, setPostAnonymous] = useState(false); // composer anonymous toggle
    const [retweetAnchor, setRetweetAnchor] = useState(null);
    const [retweetTarget, setRetweetTarget] = useState(null);
    const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
    const [quoteText, setQuoteText] = useState('');
    const [quoteTarget, setQuoteTarget] = useState(null);
    const [threadDialogOpen, setThreadDialogOpen] = useState(false);
    const [threadView, setThreadView] = useState(null);
    const [replyText, setReplyText] = useState('');
    const [awardDialogPost, setAwardDialogPost] = useState(null);
    const [awards, setAwards] = useState([]);
    const [postAwards, setPostAwards] = useState({});
    const [selectedAwardId, setSelectedAwardId] = useState('');
    const [awardMessage, setAwardMessage] = useState('');
    const [bookmarks, setBookmarks] = useState({});
    const [feedFilter, setFeedFilter] = useState('for_you');
    const [followingIds, setFollowingIds] = useState([]);
    const { ref, inView } = useInView();

    useEffect(() => {
        if (inView && hasMore && !loading) {
            fetchPosts(page + 1, feedFilter);
        }
    }, [inView, feedFilter, hasMore, loading, page]);

    useEffect(() => {
        if (inView && page > 1) {
            window.scrollTo(0, 0);
        }
    }, [page]);

    useEffect(() => {
        setLoading(true);
        setHasMore(true);
        fetchPosts(1, feedFilter);
    }, [feedFilter]);

    useEffect(() => {
        fetchFollowing();
    }, []);

    const fetchPosts = async (pageNum, filter) => {
        try {
            const response = await api.get(`/content/feed/${user.id}?page=${pageNum}&limit=10&filter=${filter}`);
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

    const handleRefresh = () => {
        setLoading(true);
        setHasMore(true);
        fetchPosts(1);
    };

    const handleFocusComposer = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
        setTimeout(() => {
            composerRef.current?.focus();
        }, 200);
    };

    const handleToggleBookmark = (postId) => {
        setBookmarks(prev => {
            const nextValue = !prev[postId];
            toast.success(nextValue ? 'Saved to bookmarks' : 'Removed from bookmarks');
            return { ...prev, [postId]: nextValue };
        });
    };

    const fetchFollowing = async () => {
        try {
            const response = await api.get(`/content/follows/${user.id}`);
            setFollowingIds(response.data?.following || []);
        } catch (error) {
            console.error('Failed to fetch following list:', error);
        }
    };

    const handleToggleFollow = async (authorId) => {
        if (!authorId || authorId === user.id) return;
        const isFollowing = followingIds.includes(authorId);
        try {
            if (isFollowing) {
                await api.delete(`/content/follows/${authorId}`);
                setFollowingIds((prev) => prev.filter((id) => id !== authorId));
                toast.success('Unfollowed');
            } else {
                await api.post('/content/follows', { followedId: authorId });
                setFollowingIds((prev) => [...prev, authorId]);
                toast.success('Now following');
            }
        } catch (error) {
            console.error('Follow toggle failed:', error);
            toast.error('Failed to update following');
        }
    };

    const handleShare = async (postId) => {
        const link = `${window.location.origin}/post/${postId}`;
        try {
            await navigator.clipboard.writeText(link);
            toast.success('Post link copied');
        } catch (error) {
            toast.error('Unable to copy link');
        }
    };

    const handleComingSoon = (label) => {
        toast(`${label} is coming soon`);
    };


    const handleCreatePost = async () => {
        if (!newPost.trim() && mediaAttachments.length === 0) {
            toast.error('Please write something');
            return;
        }

        try {
            const mediaUrls = mediaAttachments.map(item => item.url);
            const postType = mediaAttachments.some(item => item.type === 'video')
                ? 'video'
                : mediaAttachments.some(item => item.type === 'image')
                    ? 'image'
                    : 'text';

            const response = await api.post('/content/posts', {
                content: newPost,
                type: postType,
                mediaUrls,
                visibility,
                userId: user.id,
                anonymous: postAnonymous
            });

            setPosts(prev => [response.data, ...prev]);
            setNewPost('');
            setMediaAttachments([]);
            setMediaUrlInput('');
            toast.success('Post created successfully');
        } catch (error) {
            console.error('Error creating post:', error);
            toast.error('Failed to create post');
        }
    };

    const getMediaTypeFromUrl = (url) => {
        const lower = url.toLowerCase();
        if (lower.match(/\.(mp4|mov|webm|mkv)$/)) return 'video';
        if (lower.match(/\.(png|jpe?g|gif|webp|svg)$/)) return 'image';
        return 'link';
    };

    const handleAddMediaUrl = () => {
        const value = mediaUrlInput.trim();
        if (!value) return;
        const type = getMediaTypeFromUrl(value);
        setMediaAttachments(prev => [...prev, { url: value, type, name: 'External link' }]);
        setMediaUrlInput('');
    };

    const handleRemoveMedia = (index) => {
        setMediaAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleUploadFile = async (file) => {
        if (!file) return;
        setUploadingMedia(true);
        const formData = new FormData();
        formData.append('file', file);
        formData.append('userId', user.id);
        formData.append('visibility', visibility);

        try {
            const response = await api.post('/media/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            const uploaded = response.data;
            setMediaAttachments(prev => [...prev, {
                url: uploaded.url,
                type: uploaded.type,
                name: uploaded.originalName || file.name
            }]);
            toast.success('Upload complete');
        } catch (error) {
            console.error('Upload failed:', error);
            toast.error('Failed to upload media');
        } finally {
            setUploadingMedia(false);
        }
    };

    const handleImageSelect = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        handleUploadFile(file);
    };

    const handleVideoSelect = (event) => {
        const file = event.target.files?.[0];
        event.target.value = '';
        handleUploadFile(file);
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

    const handleOpenPostMenu = (event, postId) => {
        setPostMenuAnchor(event.currentTarget);
        setPostMenuTarget(postId);
    };

    const handleClosePostMenu = () => {
        setPostMenuAnchor(null);
        setPostMenuTarget(null);
    };

    const renderPostCard = (post, index) => {
        const isBookmarked = Boolean(bookmarks[post.id]);
        const isFollowing = followingIds.includes(post.userId);
        const mediaUrls = post.mediaUrls || [];
        const mediaPreview = post.featuredImage || mediaUrls[0];
        const isVideo = post.type === 'video';

        return (
            <Card component={motion.div} variants={cardVariants} key={post.id || index} sx={{ mb: 2, ...hoverCardSx }}>
                <CardHeader
                    avatar={
                        <Tooltip title={post.isAnonymous ? 'Anonymous' : 'View profile'} arrow>
                            <Avatar
                                sx={{ cursor: post.isAnonymous ? 'default' : 'pointer' }}
                                onClick={() => { if (!post.isAnonymous) navigate(`/profile/${post.userId}`); }}
                            >
                                {post.isAnonymous ? (post.anonHandle ? getInitials(post.anonHandle) : 'A') : getInitials(`${post.author?.firstName || ''} ${post.author?.lastName || ''}`)}
                            </Avatar>
                        </Tooltip>
                    }
                    title={
                        post.isAnonymous ? (
                            <Typography component="span" sx={{ fontWeight: 'bold' }}>
                                {post.anonHandle || 'Anonymous'}
                            </Typography>
                        ) : (
                            <MuiLink
                                component="span"
                                onClick={() => navigate(`/profile/${post.userId}`)}
                                sx={{ cursor: 'pointer', fontWeight: 'bold' }}
                            >
                                {post.author?.firstName} {post.author?.lastName}
                            </MuiLink>
                        )
                    }
                    subheader={post.isAnonymous ? formatApproximateTime(post.createdAt) : formatRelativeTime(post.createdAt)}
                    action={
                        <Stack direction="row" spacing={1} alignItems="center">
                            {post.userId !== user.id && (
                                <Tooltip title={isFollowing ? 'Unfollow' : 'Follow'} arrow>
                                    <Button
                                        size="small"
                                        variant={isFollowing ? 'outlined' : 'contained'}
                                        onClick={() => handleToggleFollow(post.userId)}
                                        sx={softActionSx}
                                    >
                                        {isFollowing ? 'Following' : 'Follow'}
                                    </Button>
                                </Tooltip>
                            )}
                            <Tooltip title="Post actions" arrow>
                                <IconButton
                                    size="small"
                                    onClick={(e) => handleOpenPostMenu(e, post.id)}
                                    sx={softActionSx}
                                >
                                    <MoreVert />
                                </IconButton>
                            </Tooltip>
                        </Stack>
                    }
                />
                {mediaPreview && (
                    isVideo ? (
                        <Box
                            component="video"
                            src={mediaPreview}
                            controls
                            sx={{ width: '100%', maxHeight: 320, objectFit: 'cover' }}
                        />
                    ) : (
                        <Box
                            component="img"
                            src={mediaPreview}
                            alt="Post"
                            sx={{ width: '100%', height: 300, objectFit: 'cover' }}
                        />
                    )
                )}
                <CardContent>
                    <Typography variant="body1" paragraph>
                        {post.content}
                    </Typography>
                </CardContent>
                <Divider />
                <CardActions disableSpacing>
                    <Tooltip title="React" arrow>
                        <IconButton
                            size="small"
                            onClick={(e) => {
                                setReactionAnchor(e.currentTarget);
                                setReactionTarget(post.id);
                            }}
                            sx={softActionSx}
                        >
                            <ThumbUpOutlined fontSize="small" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                                {formatNumber(post.reactions?.length || 0)}
                            </Typography>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Reply" arrow>
                        <IconButton
                            size="small"
                            onClick={() => {
                                setThreadView(post);
                                setThreadDialogOpen(true);
                            }}
                            sx={softActionSx}
                        >
                            <Comment fontSize="small" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                                {formatNumber(post.commentCount || 0)}
                            </Typography>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Repost" arrow>
                        <IconButton size="small" onClick={() => handleRetweet(post.id)} sx={softActionSx}>
                            <Repeat fontSize="small" />
                            <Typography variant="caption" sx={{ ml: 0.5 }}>
                                {formatNumber(post.retweets?.length || 0)}
                            </Typography>
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Quote" arrow>
                        <IconButton
                            size="small"
                            onClick={() => {
                                setQuoteTarget(post.id);
                                setQuoteText('');
                                setQuoteDialogOpen(true);
                            }}
                            sx={softActionSx}
                        >
                            <Forum fontSize="small" />
                        </IconButton>
                    </Tooltip>
                    <Tooltip title={isBookmarked ? 'Remove bookmark' : 'Save post'} arrow>
                        <IconButton size="small" onClick={() => handleToggleBookmark(post.id)} sx={softActionSx}>
                            {isBookmarked ? <Bookmark fontSize="small" /> : <BookmarkBorder fontSize="small" />}
                        </IconButton>
                    </Tooltip>
                    <Tooltip title="Share" arrow>
                        <IconButton size="small" onClick={() => handleShare(post.id)} sx={softActionSx}>
                            <Share fontSize="small" />
                        </IconButton>
                    </Tooltip>
                </CardActions>
            </Card>
        );
    };

    return (
        <Box component={motion.div} variants={containerVariants} initial="hidden" animate="visible" sx={{ maxWidth: 700, mx: 'auto', py: 2 }}>
            {/* Quick Actions */}
            <Card component={motion.div} variants={cardVariants} sx={{ mb: 2, p: 2, ...hoverCardSx }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        Your Feed
                    </Typography>
                    <ButtonGroup variant="outlined" size="small">
                        <Tooltip title="Start a new post" arrow>
                            <Button onClick={handleFocusComposer} sx={softActionSx}>New Post</Button>
                        </Tooltip>
                        <Tooltip title="Refresh feed" arrow>
                            <Button onClick={handleRefresh} sx={softActionSx}>Refresh</Button>
                        </Tooltip>
                        <Tooltip title="Saved items" arrow>
                            <Button onClick={() => navigate('/bookmarks')} sx={softActionSx}>Saved</Button>
                        </Tooltip>
                    </ButtonGroup>
                </Stack>
                <Tabs
                    value={feedFilter}
                    onChange={(e, val) => setFeedFilter(val)}
                    sx={{ mt: 2 }}
                    textColor="primary"
                    indicatorColor="primary"
                >
                    <Tab value="for_you" label="For You" />
                    <Tab value="recent" label="Recent" />
                    <Tab value="trending" label="Trending" />
                    <Tab value="following" label="Following" />
                </Tabs>
            </Card>

            {/* Highlights */}
            <Card component={motion.div} variants={cardVariants} sx={{ mb: 2, p: 2, ...hoverCardSx }}>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                    <Box sx={{ flexGrow: 1 }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                            Highlights for you
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                            Follow creators, bookmark ideas, and use quick actions to shape your feed.
                        </Typography>
                    </Box>
                    <Stack direction="row" spacing={1}>
                        <Button size="small" variant="outlined" onClick={() => navigate('/groups')} sx={softActionSx}>Explore Groups</Button>
                        <Button size="small" variant="contained" onClick={() => navigate('/profile')} sx={softActionSx}>Update Profile</Button>
                    </Stack>
                </Stack>
            </Card>

            {/* Create Post Section */}
            <Card component={motion.div} variants={cardVariants} sx={{ mb: 3, p: 2, ...hoverCardSx }}>
                <Box sx={{ display: 'flex', alignItems: 'flex-start', mb: 2 }}>
                    <Avatar sx={{ mr: 2 }}>
                        {getInitials(user.firstName + ' ' + user.lastName)}
                    </Avatar>
                    <Box sx={{ flex: 1 }}>
                        <TextField
                            fullWidth
                            multiline
                            minRows={3}
                            placeholder="Share an update, ask a question, or post a win"
                            value={newPost}
                            onChange={e => setNewPost(e.target.value)}
                            variant="outlined"
                            sx={{ mb: 2 }}
                            inputRef={composerRef}
                        />
                        {mediaAttachments.length > 0 && (
                            <Box sx={{ mb: 2 }}>
                                <Stack direction="row" spacing={1} sx={{ mb: 1, flexWrap: 'wrap' }}>
                                    {mediaAttachments.map((item, index) => (
                                        <Chip
                                            key={`${item.url}-${index}`}
                                            label={`${item.type.toUpperCase()}: ${item.name || item.url}`}
                                            onDelete={() => handleRemoveMedia(index)}
                                            sx={{ maxWidth: 280 }}
                                        />
                                    ))}
                                </Stack>
                                <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
                                    {mediaAttachments.map((item, index) => (
                                        <Box
                                            key={`${item.url}-preview-${index}`}
                                            sx={{
                                                width: 110,
                                                height: 80,
                                                borderRadius: 2,
                                                overflow: 'hidden',
                                                border: '1px solid',
                                                borderColor: 'divider',
                                                backgroundColor: 'background.default'
                                            }}
                                        >
                                            {item.type === 'video' ? (
                                                <Box
                                                    component="video"
                                                    src={item.url}
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            ) : (
                                                <Box
                                                    component="img"
                                                    src={item.url}
                                                    alt={item.name || 'media'}
                                                    sx={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                                />
                                            )}
                                        </Box>
                                    ))}
                                </Stack>
                            </Box>
                        )}
                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ mb: 2 }}>
                            <TextField
                                fullWidth
                                size="small"
                                placeholder="Add image/video URL"
                                value={mediaUrlInput}
                                onChange={(e) => setMediaUrlInput(e.target.value)}
                            />
                            <Button variant="outlined" onClick={handleAddMediaUrl} disabled={!mediaUrlInput.trim()} sx={softActionSx}>
                                Add URL
                            </Button>
                        </Stack>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1, flexWrap: 'wrap', gap: 1 }}>
                            <Box sx={{ display: 'flex', gap: 1 }}>
                                <Tooltip title="Add image" arrow>
                                    <IconButton size="small" onClick={() => imageInputRef.current?.click()} sx={softActionSx}>
                                        <Image fontSize="small" color="primary" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Add video" arrow>
                                    <IconButton size="small" onClick={() => videoInputRef.current?.click()} sx={softActionSx}>
                                        <VideoLibrary fontSize="small" color="primary" />
                                    </IconButton>
                                </Tooltip>
                                <Tooltip title="Add reaction" arrow>
                                    <IconButton size="small" onClick={() => handleComingSoon('Emoji reactions')} sx={softActionSx}>
                                        <EmojiEmotions fontSize="small" color="primary" />
                                    </IconButton>
                                </Tooltip>
                                {uploadingMedia && (
                                    <Chip size="small" label="Uploading..." />
                                )}
                            </Box>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                <FormControl size="small" sx={{ minWidth: 120 }}>
                                    <Select value={visibility} onChange={e => setVisibility(e.target.value)}>
                                        {VISIBILITY_OPTIONS.map(opt => (
                                            <MenuItem key={opt.value} value={opt.value}>
                                                {opt.label}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControlLabel
                                    control={<Switch checked={postAnonymous} onChange={(e) => setPostAnonymous(e.target.checked)} />}
                                    label="Post anonymously"
                                />

                                <Button
                                    variant="contained"
                                    onClick={handleCreatePost}
                                    disabled={!newPost.trim() && mediaAttachments.length === 0}
                                    sx={softActionSx}
                                >
                                    Post
                                </Button>
                            </Box>
                        </Box>
                        <input
                            ref={imageInputRef}
                            type="file"
                            accept="image/*"
                            hidden
                            onChange={handleImageSelect}
                        />
                        <input
                            ref={videoInputRef}
                            type="file"
                            accept="video/*"
                            hidden
                            onChange={handleVideoSelect}
                        />
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
                <Card component={motion.div} variants={cardVariants} sx={{ p: 3, textAlign: 'center', ...hoverCardSx }}>
                    <Typography variant="h6" gutterBottom>
                        No posts yet
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Be the first to share an update with your network.
                    </Typography>
                    <Button variant="contained" onClick={handleFocusComposer} sx={softActionSx}>
                        Create your first post
                    </Button>
                </Card>
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
                        onClick={() => handleQuote(quoteTarget)}
                        disabled={!quoteText.trim()}
                    >
                        Quote
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Reaction Menu */}
            <Menu
                anchorEl={reactionAnchor}
                open={Boolean(reactionAnchor)}
                onClose={() => setReactionAnchor(null)}
            >
                {REACTIONS.map((reaction) => (
                    <MenuItem
                        key={reaction.value}
                        onClick={() => handleReaction(reactionTarget, reaction.value)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <span>{reaction.emoji}</span>
                            <Typography variant="body2">{reaction.label}</Typography>
                        </Box>
                    </MenuItem>
                ))}
            </Menu>

            {/* Post Actions Menu */}
            <Menu
                anchorEl={postMenuAnchor}
                open={Boolean(postMenuAnchor)}
                onClose={handleClosePostMenu}
            >
                {/* Request deletion (prefills Help Center ticket) - only for anonymous posts */}
                {posts.find(p => p.id === postMenuTarget && p.isAnonymous) && (
                    <MenuItem
                        onClick={() => {
                            const post = posts.find(p => p.id === postMenuTarget);
                            const approxCreatedAt = post?.createdAt || '';
                            const device = (typeof navigator !== 'undefined') ? `${navigator.platform || ''} ${navigator.userAgent || ''}` : '';
                            const params = new URLSearchParams({
                                category: 'security',
                                subject: 'Delete anonymous post',
                                postId: String(postMenuTarget),
                                requesterType: 'author',
                                approxCreatedAt,
                                device: device.slice(0, 120) // limit length
                            });
                            navigate(`/helpcenter/tickets?${params.toString()}`);
                            handleClosePostMenu();
                        }}
                    >
                        Request deletion
                    </MenuItem>
                )}

                <MenuItem onClick={() => { handleToggleBookmark(postMenuTarget); handleClosePostMenu(); }}>
                    {bookmarks[postMenuTarget] ? 'Remove Bookmark' : 'Save to Bookmarks'}
                </MenuItem>
                <MenuItem onClick={() => { handleShare(postMenuTarget); handleClosePostMenu(); }}>
                    Copy Link
                </MenuItem>
                <MenuItem onClick={() => { toast('Report submitted'); handleClosePostMenu(); }}>
                    Report
                </MenuItem>
            </Menu>
        </Box>
    );
}

export default Homepage;
