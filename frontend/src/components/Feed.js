import React, { useMemo, useState, useEffect, useRef } from 'react';
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
  CircularProgress,
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
  Tooltip,
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
  Tag,
  MailOutline,
  SmartToy as SmartToyIcon,
  Translate as TranslateIcon,
  Psychology as DigestIcon,
  AutoFixHigh as AIFixIcon,
  NotificationsActive as DigestBellIcon,
} from '@mui/icons-material';
import { useInView } from 'react-intersection-observer';
import { useNavigate } from 'react-router-dom';
import { formatRelativeTime, formatApproximateTime, formatNumber, getInitials } from '../utils/helpers';
import { ANONYMOUS_USER_POST_LABEL, getPostAuthorLabel } from '../utils/profileRoutes';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { motion, AnimatePresence } from 'framer-motion';
import { designTokens, getGlassyStyle } from '../theme/designSystem';
import { useTheme } from '@mui/material/styles';
import PullToRefresh from './common/PullToRefresh';
import { triggerHapticFeedback } from '../utils/mobile';

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

const FEED_SWIPE_ROUTES = ['/groups', '/feed', '/chat', '/bookmarks'];

const containerVariants = {
  hidden: { opacity: 0, y: 12 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.4, ease: 'easeOut', staggerChildren: 0.1 }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: 'easeOut' } }
};

const hoverCardSx = (mode) => ({
  ...getGlassyStyle(mode),
  borderRadius: 4,
  transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
  '&:hover': {
    transform: 'translateY(-4px)',
    boxShadow: designTokens.glassmorphism[mode].boxShadow,
    borderColor: designTokens.colors[mode].primary,
  }
});

const softActionSx = {
  borderRadius: 2,
  transition: 'all 0.2s ease',
  '&:hover': {
    backgroundColor: 'rgba(99, 102, 241, 0.1)',
    transform: 'scale(1.05)'
  }
};

function Feed({ user }) {
  const theme = useTheme();
  const mode = theme.palette.mode;
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
  const [repostAnchor, setRepostAnchor] = useState(null);
  const [repostTarget, setRepostTarget] = useState(null);
  const [quoteDialogOpen, setQuoteDialogOpen] = useState(false);
  const [quoteText, setQuoteText] = useState('');
  const [threadDialogOpen, setThreadDialogOpen] = useState(false);
  const [threadView, setThreadView] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [replyAnonymous, setReplyAnonymous] = useState(false);
  const [awardDialogPost, setAwardDialogPost] = useState(null);
  const [awards, setAwards] = useState([]);
  const [postAwards, setPostAwards] = useState({});
  const [selectedAwardId, setSelectedAwardId] = useState('');
  const [awardMessage, setAwardMessage] = useState('');
  const [bookmarks, setBookmarks] = useState({});
  const [postAnonymous, setPostAnonymous] = useState(false); // new toggle for anonymous posting
  const swipeStartRef = useRef({ x: 0, y: 0, interactive: false });
  const swipeDeltaRef = useRef({ x: 0, y: 0 });
  const { ref, inView } = useInView();

  // AI features state
  const [aiWriting, setAiWriting] = useState(false);
  const [aiTags, setAiTags] = useState([]);
  const [aiTagsLoading, setAiTagsLoading] = useState(false);
  const [digestOpen, setDigestOpen] = useState(false);
  const [digest, setDigest] = useState([]);
  const [digestLoading, setDigestLoading] = useState(false);
  const [translateTarget, setTranslateTarget] = useState(null); // { postId, text }
  const [translateResult, setTranslateResult] = useState({}); // { [postId]: translatedText }
  const [translateLoading, setTranslateLoading] = useState({});

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      fetchPosts(page + 1);
    }
  }, [inView, hasMore, loading, page]);

  const userDisplayName = useMemo(() => {
    if (!user) return '';
    return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User';
  }, [user]);

  const fetchPosts = async (pageNum) => {
    try {
      setLoading(true);
      const response = await api.get(`/content/posts/feed/${user.id}?page=${pageNum}&limit=10`);

      if (response.data.length < 10) {
        setHasMore(false);
      }

      if (pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts((prev) => [...prev, ...response.data]);
      }
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const resetComposer = () => {
    setNewPost('');
    setThreadTweets(['']);
    setVisibility('public');
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      toast.error('Post cannot be empty');
      return;
    }

    // Spam/moderation check before submitting
    try {
      const modRes = await api.post('/ai-service/moderate', { text: newPost });
      if (modRes.data?.flagged) {
        toast.error('Your post was flagged for potentially harmful content. Please review it before posting.');
        return;
      }
    } catch (_e) {
      // Non-blocking: if moderation fails, proceed
    }

    try {
      const response = await api.post('/content/posts', {
        content: newPost,
        visibility,
        type: 'text',
        anonymous: postAnonymous,
        tags: aiTags.length > 0 ? aiTags : undefined,
      });

      if (response.data?.queued) {
        resetComposer();
        setAiTags([]);
        triggerHapticFeedback('light');
        toast.success('You are offline. Post queued and will sync automatically.');
        return;
      }

      setPosts((prev) => [response.data, ...prev]);
      resetComposer();
      setAiTags([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
      triggerHapticFeedback('success');
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post:', err);
      toast.error(err.response?.data?.error || 'Failed to create post');
    }
  };

  // AI: Improve post text with writing assistant
  const handleAiImprove = async () => {
    if (!newPost.trim()) return;
    setAiWriting(true);
    try {
      const res = await api.post('/ai-service/writing/assist', { text: newPost, action: 'improve' });
      if (res.data?.result) {
        setNewPost(res.data.result);
        toast.success('AI improved your post!');
      }
    } catch (_e) {
      toast.error('AI writing assist unavailable');
    } finally {
      setAiWriting(false);
    }
  };

  // AI: Auto-tag post content
  const handleAutoTag = async () => {
    if (!newPost.trim()) return;
    setAiTagsLoading(true);
    try {
      const res = await api.post('/ai-service/tag', { text: newPost });
      if (res.data?.tags?.length > 0) {
        setAiTags(res.data.tags);
        toast.success(`${res.data.tags.length} tags suggested`);
      }
    } catch (_e) {
      toast.error('Auto-tagging unavailable');
    } finally {
      setAiTagsLoading(false);
    }
  };

  // AI: Translate a post
  const handleTranslate = async (postId, text) => {
    setTranslateLoading((prev) => ({ ...prev, [postId]: true }));
    try {
      const res = await api.post('/ai-service/translate', { text, targetLanguage: 'English' });
      setTranslateResult((prev) => ({ ...prev, [postId]: res.data?.translation || text }));
    } catch (_e) {
      toast.error('Translation unavailable');
    } finally {
      setTranslateLoading((prev) => ({ ...prev, [postId]: false }));
    }
  };

  // AI: Smart digest
  const handleOpenDigest = async () => {
    setDigestOpen(true);
    if (digest.length > 0) return; // cached
    setDigestLoading(true);
    try {
      const recentPosts = posts.slice(0, 20).map((p) => ({
        id: p.id,
        type: 'post',
        content: p.content,
        likes: p.likes || 0,
        comments: p.comments || 0,
      }));
      const res = await api.post('/ai-service/digest', {
        userId: user?.id,
        recentPosts,
        userInterests: [],
        limit: 8,
      });
      setDigest(res.data?.digest || []);
    } catch (_e) {
      setDigest([]);
    } finally {
      setDigestLoading(false);
    }
  };

  const handleCreateThread = async () => {
    const tweets = threadTweets.map((tweet) => tweet.trim()).filter(Boolean);
    if (!tweets.length) {
      toast.error('Add at least one tweet');
      return;
    }

    try {
      const response = await api.post('/content/threads', { tweets });
      const created = response.data?.thread || [];
      if (created.length) {
        setPosts([created[0], ...posts]);
      }
      resetComposer();
      triggerHapticFeedback('success');
      toast.success('Thread created successfully!');
    } catch (err) {
      console.error('Failed to create thread:', err);
      toast.error(err.response?.data?.error || 'Failed to create thread');
    }
  };

  const handleReactionClick = (event, post) => {
    setReactionAnchor(event.currentTarget);
    setReactionTarget(post);
  };

  const handleReactionSelect = async (reactionType) => {
    if (!reactionTarget) return;
    try {
      await api.post(`/content/posts/${reactionTarget.id}/reactions`, { type: reactionType });
      const summary = await api.get(`/content/posts/${reactionTarget.id}/reactions`);
      setPosts((prev) =>
        prev.map((p) =>
          p.id === reactionTarget.id
            ? {
              ...p,
              reactionSummary: summary.data.summary,
              reactionCount: summary.data.total,
              likes: summary.data.total // keep likes in sync for fallback
            }
            : p
        )
      );
    } catch (err) {
      console.error('Failed to react:', err);
      toast.error(err.response?.data?.error || 'Failed to react');
    } finally {
      setReactionAnchor(null);
      setReactionTarget(null);
    }
  };

  const handleRepostMenu = (event, post) => {
    setRepostAnchor(event.currentTarget);
    setRepostTarget(post);
  };

  const handleRepost = async () => {
    if (!repostTarget) return;
    try {
      await api.post(`/content/posts/${repostTarget.id}/retweet`, {});
      toast.success('Reposted');
    } catch (err) {
      console.error('Failed to repost:', err);
      toast.error(err.response?.data?.error || 'Failed to repost');
    } finally {
      setRepostAnchor(null);
      setRepostTarget(null);
    }
  };

  const handleUndoRepost = async () => {
    if (!repostTarget) return;
    try {
      await api.delete(`/content/posts/${repostTarget.id}/retweet`);
      toast.success('Repost removed');
    } catch (err) {
      console.error('Failed to undo repost:', err);
      toast.error(err.response?.data?.error || 'Failed to remove repost');
    } finally {
      setRepostAnchor(null);
      setRepostTarget(null);
    }
  };

  const openQuoteDialog = () => {
    setQuoteText('');
    setQuoteDialogOpen(true);
    setRepostAnchor(null);
  };

  const submitQuote = async () => {
    if (!repostTarget) return;
    if (!quoteText.trim()) {
      toast.error('Add a comment for your quote');
      return;
    }

    try {
      await api.post(`/content/posts/${repostTarget.id}/retweet`, { comment: quoteText });
      toast.success('Quote posted');
      setQuoteDialogOpen(false);
      setRepostTarget(null);
      setQuoteText('');
    } catch (err) {
      console.error('Failed to quote post:', err);
      toast.error(err.response?.data?.error || 'Failed to quote post');
    }
  };

  const handleViewThread = async (postId) => {
    try {
      const response = await api.get(`/content/threads/${postId}`);
      setThreadView(response.data);
      setThreadDialogOpen(true);
    } catch (err) {
      console.error('Failed to load thread:', err);
      toast.error('Failed to load thread');
    }
  };

  const handleReply = async () => {
    if (!replyText.trim() || !threadView?.post?.id) return;
    try {
      const response = await api.post(`/content/posts/${threadView.post.id}/reply`, {
        content: replyText,
        anonymous: replyAnonymous
      });
      setThreadView((prev) => ({
        ...prev,
        replies: [...(prev?.replies || []), response.data]
      }));
      setReplyText('');
      triggerHapticFeedback('light');
    } catch (err) {
      console.error('Failed to reply:', err);
      toast.error(err.response?.data?.error || 'Failed to reply');
    }
  };

  const openAwards = async (post) => {
    setAwardDialogPost(post);
    setSelectedAwardId('');
    setAwardMessage('');
    try {
      const [awardsResponse, postAwardsResponse] = await Promise.all([
        api.get('/content/awards'),
        api.get(`/content/posts/${post.id}/awards`)
      ]);
      setAwards(awardsResponse.data);
      setPostAwards((prev) => ({ ...prev, [post.id]: postAwardsResponse.data }));
    } catch (err) {
      console.error('Failed to load awards:', err);
      toast.error('Failed to load awards');
    }
  };

  const submitAward = async () => {
    if (!awardDialogPost || !selectedAwardId) {
      toast.error('Select an award');
      return;
    }
    try {
      await api.post(`/content/posts/${awardDialogPost.id}/awards`, {
        awardId: selectedAwardId,
        message: awardMessage
      });
      const updatedAwards = await api.get(`/content/posts/${awardDialogPost.id}/awards`);
      setPostAwards((prev) => ({ ...prev, [awardDialogPost.id]: updatedAwards.data }));
      toast.success('Award sent');
      setAwardMessage('');
      setSelectedAwardId('');
    } catch (err) {
      console.error('Failed to send award:', err);
      toast.error(err.response?.data?.error || 'Failed to send award');
    }
  };

  const toggleBookmark = async (post) => {
    try {
      const check = await api.get('/content/bookmarks/check', {
        params: { itemType: 'post', itemId: post.id }
      });

      if (check.data.bookmarked && check.data.bookmark?.id) {
        await api.delete(`/content/bookmarks/${check.data.bookmark.id}`);
        setBookmarks((prev) => ({ ...prev, [post.id]: false }));
        toast.success('Bookmark removed');
        return;
      }

      await api.post('/content/bookmarks', {
        itemType: 'post',
        itemId: post.id,
        title: post.content?.slice(0, 80) || 'Post',
        content: post.content
      });
      setBookmarks((prev) => ({ ...prev, [post.id]: true }));
      toast.success('Bookmarked');
    } catch (err) {
      console.error('Failed to toggle bookmark:', err);
      toast.error(err.response?.data?.error || 'Failed to update bookmark');
    }
  };

  const renderContentWithHashtags = (content) => {
    if (!content) return null;

    // Regular expression to match hashtags (# followed by word characters)
    const hashtagRegex = /#(\w+)/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = hashtagRegex.exec(content)) !== null) {
      // Add text before the hashtag
      if (match.index > lastIndex) {
        parts.push(content.substring(lastIndex, match.index));
      }

      // Add the hashtag as a clickable chip
      const hashtag = match[1];
      parts.push(
        <Chip
          key={match.index}
          label={`#${hashtag}`}
          size="small"
          icon={<Tag fontSize="small" />}
          onClick={() => handleHashtagClick(hashtag)}
          sx={{
            mx: 0.5,
            cursor: 'pointer',
            '&:hover': { bgcolor: 'primary.light' }
          }}
        />
      );

      lastIndex = match.index + match[0].length;
    }

    // Add remaining text after the last hashtag
    if (lastIndex < content.length) {
      parts.push(content.substring(lastIndex));
    }

    return parts.length > 0 ? parts : content;
  };

  const handleHashtagClick = (hashtag) => {
    const searchQuery = `#${hashtag}`;
    toast.success(`Searching for ${searchQuery}`);
    navigate(`/search?q=${encodeURIComponent(searchQuery)}`);
  };

  const getVisibilityIcon = (vis) => {
    const option = VISIBILITY_OPTIONS.find((o) => o.value === vis);
    return option?.icon || <Public fontSize="small" />;
  };

  const refreshFeed = async () => {
    setHasMore(true);
    await fetchPosts(1);
    triggerHapticFeedback('selection');
  };

  const resetSwipe = () => {
    swipeStartRef.current = { x: 0, y: 0, interactive: false };
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleFeedTouchStart = (event) => {
    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    const target = event.target;
    const interactive = Boolean(
      target?.closest?.('input, textarea, button, a, [role="button"], [role="menuitem"], [contenteditable="true"]')
    );

    swipeStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      interactive
    };
    swipeDeltaRef.current = { x: 0, y: 0 };
  };

  const handleFeedTouchMove = (event) => {
    if (swipeStartRef.current.interactive) {
      return;
    }

    const touch = event.touches?.[0];
    if (!touch) {
      return;
    }

    swipeDeltaRef.current = {
      x: touch.clientX - swipeStartRef.current.x,
      y: touch.clientY - swipeStartRef.current.y
    };
  };

  const handleFeedTouchEnd = () => {
    if (swipeStartRef.current.interactive) {
      resetSwipe();
      return;
    }

    const { x, y } = swipeDeltaRef.current;
    const absX = Math.abs(x);
    const absY = Math.abs(y);

    if (absX < 70 || absX < absY * 1.2) {
      resetSwipe();
      return;
    }

    const currentIndex = FEED_SWIPE_ROUTES.indexOf('/feed');
    const nextIndex = x < 0
      ? Math.min(currentIndex + 1, FEED_SWIPE_ROUTES.length - 1)
      : Math.max(currentIndex - 1, 0);

    if (nextIndex !== currentIndex) {
      triggerHapticFeedback('selection');
      navigate(FEED_SWIPE_ROUTES[nextIndex]);
    }

    resetSwipe();
  };

  const renderAwardsSummary = (postId) => {
    const awardsForPost = postAwards[postId] || [];
    if (!awardsForPost.length) return null;
    return (
      <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
        {awardsForPost.slice(0, 4).map((award) => (
          <Chip
            key={award.id}
            size="small"
            label={`${award.Award?.icon || '🏅'} ${award.Award?.name || 'Award'}`}
          />
        ))}
        {awardsForPost.length > 4 && (
          <Chip size="small" label={`+${awardsForPost.length - 4} more`} />
        )}
      </Stack>
    );
  };

  return (
    <PullToRefresh onRefresh={refreshFeed} disabled={loading} useWindowScroll>
      <Box
        component={motion.div}
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        onTouchStart={handleFeedTouchStart}
        onTouchMove={handleFeedTouchMove}
        onTouchEnd={handleFeedTouchEnd}
        sx={{ maxWidth: 720, mx: 'auto', py: 2 }}
      >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4" fontWeight="bold">
          Feed
        </Typography>
        <Tooltip title="Smart Digest — top content while you were away">
          <Button
            size="small"
            startIcon={<DigestBellIcon />}
            onClick={handleOpenDigest}
            variant="outlined"
            color="secondary"
          >
            Smart Digest
          </Button>
        </Tooltip>
      </Box>

      <Card component={motion.div} variants={cardVariants} sx={{ mb: 3, ...hoverCardSx(mode) }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getInitials(userDisplayName)}
            </Avatar>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              placeholder={threadMode ? 'Start your thread...' : "What's on your mind?"}
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              variant="outlined"
              disabled={threadMode}
            />
          </Box>

          {threadMode && (
            <Stack spacing={2} sx={{ mb: 2 }}>
              {threadTweets.map((tweet, index) => (
                <TextField
                  key={index}
                  label={`Tweet ${index + 1}`}
                  fullWidth
                  multiline
                  minRows={2}
                  value={tweet}
                  onChange={(e) =>
                    setThreadTweets((prev) =>
                      prev.map((t, i) => (i === index ? e.target.value : t))
                    )
                  }
                />
              ))}
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => setThreadTweets((prev) => [...prev, ''])}
                >
                  Add Tweet
                </Button>
                {threadTweets.length > 1 && (
                  <Button
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => setThreadTweets((prev) => prev.slice(0, -1))}
                  >
                    Remove Last
                  </Button>
                )}
              </Box>
            </Stack>
          )}

          <Divider sx={{ my: 2 }} />

          {/* AI Tags preview */}
          {aiTags.length > 0 && (
            <Box sx={{ mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
              <Typography variant="caption" color="text.secondary" sx={{ mr: 1, alignSelf: 'center' }}>
                Tags:
              </Typography>
              {aiTags.map((tag, i) => (
                <Chip
                  key={i}
                  label={`#${tag}`}
                  size="small"
                  onDelete={() => setAiTags((prev) => prev.filter((_, idx) => idx !== i))}
                  color="primary"
                  variant="outlined"
                />
              ))}
            </Box>
          )}

          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <IconButton size="small" color="primary" title="Add emoji">
                <EmojiEmotions />
              </IconButton>
              <IconButton size="small" color="primary" title="Add image">
                <Image />
              </IconButton>
              <IconButton size="small" color="primary" title="Add video">
                <VideoLibrary />
              </IconButton>
              <Tooltip title="AI: Improve writing">
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={handleAiImprove}
                  disabled={aiWriting || !newPost.trim()}
                  aria-label="AI writing assistant"
                >
                  {aiWriting ? <CircularProgress size={16} /> : <AIFixIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Tooltip title="AI: Auto-tag">
                <IconButton
                  size="small"
                  color="secondary"
                  onClick={handleAutoTag}
                  disabled={aiTagsLoading || !newPost.trim()}
                  aria-label="Auto-tag post"
                >
                  {aiTagsLoading ? <CircularProgress size={16} /> : <SmartToyIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
            </Box>

            <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
              <FormControl size="small" sx={{ minWidth: 120 }}>
                <Select
                  value={visibility}
                  onChange={(e) => setVisibility(e.target.value)}
                  startAdornment={getVisibilityIcon(visibility)}
                >
                  {VISIBILITY_OPTIONS.map((opt) => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {opt.icon}
                        {opt.label}
                      </Box>
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>

              <FormControlLabel
                control={<Switch checked={threadMode} onChange={() => setThreadMode(!threadMode)} />}
                label="Thread"
              />

              <FormControlLabel
                control={<Switch checked={postAnonymous} onChange={(e) => setPostAnonymous(e.target.checked)} />}
                label="Post anonymously"
              />

              <Button
                variant="contained"
                onClick={threadMode ? handleCreateThread : handleCreatePost}
                disabled={threadMode ? !threadTweets.some((t) => t.trim()) : !newPost.trim()}
              >
                {threadMode ? 'Post Thread' : 'Post'}
              </Button>
            </Box>
          </Box>
        </CardContent>
      </Card>

      {/* Smart Digest Dialog */}
      <Dialog open={digestOpen} onClose={() => setDigestOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <DigestBellIcon color="primary" />
          Your Smart Digest
        </DialogTitle>
        <DialogContent>
          {digestLoading ? (
            <Stack spacing={1}>
              {[...Array(4)].map((_, i) => <Skeleton key={i} variant="rounded" height={60} />)}
            </Stack>
          ) : digest.length === 0 ? (
            <Typography color="text.secondary">No digest available. Check back after more activity.</Typography>
          ) : (
            <Stack spacing={1.5}>
              {digest.map((item, i) => (
                <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                  <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                    <Typography variant="body2" sx={{ display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3, overflow: 'hidden' }}>
                      {item.content || item.title || '(no content)'}
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                      <Chip label={item.priority || 'medium'} size="small" color={item.priority === 'high' ? 'error' : 'default'} />
                      <Typography variant="caption" color="primary">{item.reason}</Typography>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDigestOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {loading && posts.length === 0 ? (
        [...Array(3)].map((_, i) => (
          <Card key={i} sx={{ mb: 2 }}>
            <CardHeader
              avatar={<Skeleton variant="circular" width={40} height={40} />}
              title={<Skeleton width="40%" />}
              subheader={<Skeleton width="20%" />}
            />
            <CardContent>
              <Skeleton variant="text" />
              <Skeleton variant="text" />
              <Skeleton variant="text" width="80%" />
            </CardContent>
          </Card>
        ))
      ) : posts.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <Typography variant="h6" color="text.secondary">
            No posts yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Be the first to share something!
          </Typography>
        </Box>
      ) : (
        posts.map((post, index) => (
          <Card
            component={motion.div}
            variants={cardVariants}
            key={post.id}
            sx={{ mb: 2, ...hoverCardSx(mode) }}
            ref={index === posts.length - 5 ? ref : null}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {post.isAnonymous ? 'A' : getInitials(getPostAuthorLabel(post))}
                </Avatar>
              }
              action={
                <IconButton>
                  <MoreVert />
                </IconButton>
              }
              title={
                <Typography variant="subtitle1" fontWeight="600">
                  {post.isAnonymous ? ANONYMOUS_USER_POST_LABEL : getPostAuthorLabel(post)}
                </Typography>
              }
              subheader={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {post.isAnonymous ? formatApproximateTime(post.createdAt) : formatRelativeTime(post.createdAt)}
                  </Typography>
                  {getVisibilityIcon(post.visibility)}
                </Box>
              }
            />

            <CardContent>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                {translateResult[post.id]
                  ? translateResult[post.id]
                  : renderContentWithHashtags(post.content)}
              </Typography>

              {post.mediaUrls && post.mediaUrls.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {post.mediaUrls.map((url, idx) => (
                    <img
                      key={idx}
                      src={url}
                      alt="post media"
                      style={{ width: '100%', borderRadius: 8 }}
                    />
                  ))}
                </Box>
              )}

              {renderAwardsSummary(post.id)}
            </CardContent>

            <Divider />

            <CardActions sx={{ justifyContent: 'space-between', px: 2, flexWrap: 'wrap' }}>
              <Button
                size="small"
                startIcon={<ThumbUpOutlined />}
                onClick={(event) => handleReactionClick(event, post)}
              >
                {formatNumber(post.reactionCount || post.likes || 0)}
              </Button>
              <Button size="small" startIcon={<Comment />} onClick={() => handleViewThread(post.id)}>
                {formatNumber(post.comments || 0)}
              </Button>
              <Button size="small" startIcon={<Forum />} onClick={() => handleViewThread(post.id)}>
                Thread
              </Button>
              <Button size="small" startIcon={<Repeat />} onClick={(event) => handleRepostMenu(event, post)}>
                {formatNumber(post.shares || 0)}
              </Button>
              <Button size="small" startIcon={<AutoAwesome />} onClick={() => openAwards(post)}>
                Award
              </Button>
              <IconButton size="small" onClick={() => toggleBookmark(post)}>
                {bookmarks[post.id] ? <Bookmark /> : <BookmarkBorder />}
              </IconButton>
              <Tooltip title={translateResult[post.id] ? 'Show original' : 'Translate to English'}>
                <IconButton
                  size="small"
                  onClick={() => {
                    if (translateResult[post.id]) {
                      setTranslateResult((prev) => { const n = { ...prev }; delete n[post.id]; return n; });
                    } else {
                      handleTranslate(post.id, post.content || '');
                    }
                  }}
                  color={translateResult[post.id] ? 'primary' : 'default'}
                  disabled={translateLoading[post.id]}
                >
                  {translateLoading[post.id] ? <CircularProgress size={16} /> : <TranslateIcon fontSize="small" />}
                </IconButton>
              </Tooltip>
              <Button size="small" startIcon={<Share />}>
                Share
              </Button>
            </CardActions>
          </Card>
        ))
      )}

      {loading && posts.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 2 }}>
          <Skeleton variant="rectangular" height={200} />
        </Box>
      )}

      {!hasMore && posts.length > 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body2" color="text.secondary">
            You've reached the end
          </Typography>
        </Box>
      )}

      <Menu
        anchorEl={reactionAnchor}
        open={Boolean(reactionAnchor)}
        onClose={() => setReactionAnchor(null)}
      >
        {REACTIONS.map((reaction) => (
          <MenuItem key={reaction.value} onClick={() => handleReactionSelect(reaction.value)}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <span>{reaction.emoji}</span>
              <Typography variant="body2">{reaction.label}</Typography>
            </Box>
          </MenuItem>
        ))}
      </Menu>

      <Menu
        anchorEl={repostAnchor}
        open={Boolean(repostAnchor)}
        onClose={() => setRepostAnchor(null)}
      >
        <MenuItem onClick={handleRepost}>Repost</MenuItem>
        <MenuItem onClick={openQuoteDialog}>Quote with comment</MenuItem>
        <MenuItem onClick={handleUndoRepost}>Undo repost</MenuItem>
      </Menu>

      <Dialog open={quoteDialogOpen} onClose={() => setQuoteDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Quote Post</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            multiline
            minRows={3}
            placeholder="Add your comment"
            value={quoteText}
            onChange={(e) => setQuoteText(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setQuoteDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={submitQuote}>
            Post Quote
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={threadDialogOpen} onClose={() => setThreadDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Thread</DialogTitle>
        <DialogContent>
          {threadView?.post && (
            <Box sx={{ mb: 2 }}>
              <Typography variant="subtitle2" color="text.secondary">
                {threadView.post?.isAnonymous ? formatApproximateTime(threadView.post.createdAt) : formatRelativeTime(threadView.post.createdAt)}
              </Typography>
              <Typography variant="body1" sx={{ mb: 2 }}>
                {threadView.post.content}
              </Typography>
            </Box>
          )}
          <Stack spacing={2}>
            {(threadView?.replies || []).map((reply) => (
              <Card key={reply.id} variant="outlined">
                <CardContent>
                  <Typography variant="caption" color="text.secondary">
                    {reply.isAnonymous ? formatApproximateTime(reply.createdAt) : formatRelativeTime(reply.createdAt)}
                  </Typography>
                  <Typography variant="body2">{reply.content}</Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
          <TextField
            fullWidth
            multiline
            minRows={2}
            placeholder="Write a reply"
            value={replyText}
            onChange={(e) => setReplyText(e.target.value)}
            sx={{ mt: 2 }}
          />
          <FormControlLabel
            control={<Switch checked={replyAnonymous} onChange={(e) => setReplyAnonymous(e.target.checked)} />}
            label="Post anonymously"
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setThreadDialogOpen(false)}>Close</Button>
          <Button variant="contained" onClick={handleReply}>
            Reply
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={Boolean(awardDialogPost)}
        onClose={() => setAwardDialogPost(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Give an Award</DialogTitle>
        <DialogContent>
          <Stack spacing={2}>
            <FormControl fullWidth>
              <Select
                displayEmpty
                value={selectedAwardId}
                onChange={(e) => setSelectedAwardId(e.target.value)}
              >
                <MenuItem value="" disabled>
                  Select an award
                </MenuItem>
                {awards.map((award) => (
                  <MenuItem key={award.id} value={award.id}>
                    {award.icon ? `${award.icon} ` : ''}{award.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              fullWidth
              label="Message (optional)"
              value={awardMessage}
              onChange={(e) => setAwardMessage(e.target.value)}
            />
            {awardDialogPost && renderAwardsSummary(awardDialogPost.id)}
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setAwardDialogPost(null)}>Close</Button>
          <Button variant="contained" onClick={submitAward}>
            Send Award
          </Button>
        </DialogActions>
      </Dialog>
      </Box>
    </PullToRefresh>
  );
}

export default Feed;
