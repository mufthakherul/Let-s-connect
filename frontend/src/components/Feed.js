import React, { useMemo, useState, useEffect } from 'react';
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

function Feed({ user }) {
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
  }, [inView, hasMore, loading, page]);

  const userDisplayName = useMemo(() => {
    if (!user) return '';
    return user.name || [user.firstName, user.lastName].filter(Boolean).join(' ') || user.username || 'User';
  }, [user]);

  const fetchPosts = async (pageNum) => {
    try {
      setLoading(true);
      const response = await api.get(`/content/feed/${user.id}?page=${pageNum}&limit=10`);

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

    try {
      const response = await api.post('/content/posts', {
        content: newPost,
        visibility,
        type: 'text'
      });

      setPosts([response.data, ...posts]);
      resetComposer();
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post:', err);
      toast.error(err.response?.data?.error || 'Failed to create post');
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
              reactionCount: summary.data.total
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

  const handleRetweetMenu = (event, post) => {
    setRetweetAnchor(event.currentTarget);
    setRetweetTarget(post);
  };

  const handleRetweet = async () => {
    if (!retweetTarget) return;
    try {
      await api.post(`/content/posts/${retweetTarget.id}/retweet`, {});
      toast.success('Retweeted');
    } catch (err) {
      console.error('Failed to retweet:', err);
      toast.error(err.response?.data?.error || 'Failed to retweet');
    } finally {
      setRetweetAnchor(null);
      setRetweetTarget(null);
    }
  };

  const handleUndoRetweet = async () => {
    if (!retweetTarget) return;
    try {
      await api.delete(`/content/posts/${retweetTarget.id}/retweet`);
      toast.success('Retweet removed');
    } catch (err) {
      console.error('Failed to undo retweet:', err);
      toast.error(err.response?.data?.error || 'Failed to remove retweet');
    } finally {
      setRetweetAnchor(null);
      setRetweetTarget(null);
    }
  };

  const openQuoteDialog = () => {
    setQuoteText('');
    setQuoteDialogOpen(true);
    setRetweetAnchor(null);
  };

  const submitQuote = async () => {
    if (!retweetTarget) return;
    if (!quoteText.trim()) {
      toast.error('Add a comment for your quote');
      return;
    }

    try {
      await api.post(`/content/posts/${retweetTarget.id}/retweet`, { comment: quoteText });
      toast.success('Quote posted');
      setQuoteDialogOpen(false);
      setRetweetTarget(null);
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
        content: replyText
      });
      setThreadView((prev) => ({
        ...prev,
        replies: [...(prev?.replies || []), response.data]
      }));
      setReplyText('');
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
    <Box sx={{ maxWidth: 720, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Feed
      </Typography>

      <Card sx={{ mb: 3, boxShadow: 3 }}>
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
            key={post.id}
            sx={{ mb: 2 }}
            ref={index === posts.length - 5 ? ref : null}
          >
            <CardHeader
              avatar={
                <Avatar sx={{ bgcolor: 'primary.main' }}>
                  {post.userName ? getInitials(post.userName) : 'U'}
                </Avatar>
              }
              action={
                <IconButton>
                  <MoreVert />
                </IconButton>
              }
              title={
                <Typography variant="subtitle1" fontWeight="600">
                  {post.userName || `User ${post.userId.substring(0, 8)}`}
                </Typography>
              }
              subheader={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="text.secondary">
                    {formatRelativeTime(post.createdAt)}
                  </Typography>
                  {getVisibilityIcon(post.visibility)}
                </Box>
              }
            />

            <CardContent>
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 0.5 }}>
                {renderContentWithHashtags(post.content)}
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
              <Button size="small" startIcon={<Repeat />} onClick={(event) => handleRetweetMenu(event, post)}>
                {formatNumber(post.shares || 0)}
              </Button>
              <Button size="small" startIcon={<AutoAwesome />} onClick={() => openAwards(post)}>
                Award
              </Button>
              <IconButton size="small" onClick={() => toggleBookmark(post)}>
                {bookmarks[post.id] ? <Bookmark /> : <BookmarkBorder />}
              </IconButton>
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
        anchorEl={retweetAnchor}
        open={Boolean(retweetAnchor)}
        onClose={() => setRetweetAnchor(null)}
      >
        <MenuItem onClick={handleRetweet}>Retweet</MenuItem>
        <MenuItem onClick={openQuoteDialog}>Quote with comment</MenuItem>
        <MenuItem onClick={handleUndoRetweet}>Undo retweet</MenuItem>
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
                {formatRelativeTime(threadView.post.createdAt)}
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
                    {formatRelativeTime(reply.createdAt)}
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
  );
}

export default Feed;
