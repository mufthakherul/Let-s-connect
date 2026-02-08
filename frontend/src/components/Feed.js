import React, { useState, useEffect, useCallback } from 'react';
import {
  Box, Card, CardContent, Typography, TextField, Button, Avatar,
  IconButton, CardHeader, CardActions, Chip, Divider, Skeleton,
  Menu, MenuItem, Select, FormControl, InputLabel, Collapse
} from '@mui/material';
import {
  ThumbUp, ThumbUpOutlined, Comment, Share, MoreVert,
  Public, Lock, Group, BookmarkBorder, Bookmark,
  EmojiEmotions, Image, VideoLibrary
} from '@mui/icons-material';
import { useInView } from 'react-intersection-observer';
import { formatRelativeTime, formatNumber, getInitials } from '../utils/helpers';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Public', icon: <Public fontSize="small" /> },
  { value: 'friends', label: 'Friends', icon: <Group fontSize="small" /> },
  { value: 'private', label: 'Only Me', icon: <Lock fontSize="small" /> }
];

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');
  const [visibility, setVisibility] = useState('public');
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const { ref, inView } = useInView();

  useEffect(() => {
    fetchPosts(1);
  }, []);

  useEffect(() => {
    if (inView && hasMore && !loading) {
      fetchPosts(page + 1);
    }
  }, [inView]);

  const fetchPosts = async (pageNum) => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/content/feed/${user.id}?page=${pageNum}&limit=10`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.length < 10) {
        setHasMore(false);
      }
      
      if (pageNum === 1) {
        setPosts(response.data);
      } else {
        setPosts(prev => [...prev, ...response.data]);
      }
      setPage(pageNum);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
      toast.error('Failed to load posts');
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) {
      toast.error('Post cannot be empty');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(`${API_URL}/content/posts`, {
        userId: user.id,
        content: newPost,
        visibility,
        type: 'text'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPosts([response.data, ...posts]);
      setNewPost('');
      setVisibility('public');
      toast.success('Post created successfully!');
    } catch (err) {
      console.error('Failed to create post:', err);
      toast.error('Failed to create post');
    }
  };

  const handleLikePost = async (postId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(`${API_URL}/content/posts/${postId}/like`, {
        userId: user.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setPosts(posts.map(p => 
        p.id === postId ? { ...p, likes: p.likes + 1, liked: true } : p
      ));
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  const getVisibilityIcon = (vis) => {
    const option = VISIBILITY_OPTIONS.find(o => o.value === vis);
    return option?.icon || <Public fontSize="small" />;
  };

  return (
    <Box sx={{ maxWidth: 680, mx: 'auto' }}>
      <Typography variant="h4" fontWeight="bold" sx={{ mb: 3 }}>
        Feed
      </Typography>

      {/* Create Post Card */}
      <Card sx={{ mb: 3, boxShadow: 3 }}>
        <CardContent>
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <Avatar sx={{ bgcolor: 'primary.main' }}>
              {getInitials(user.name)}
            </Avatar>
            <TextField
              fullWidth
              multiline
              minRows={3}
              maxRows={6}
              placeholder="What's on your mind?"
              value={newPost}
              onChange={(e) => setNewPost(e.target.value)}
              variant="outlined"
            />
          </Box>

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
                  {VISIBILITY_OPTIONS.map(opt => (
                    <MenuItem key={opt.value} value={opt.value}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {opt.icon}
                        {opt.label}
                      </Box>
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
        </CardContent>
      </Card>

      {/* Posts */}
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
              <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap' }}>
                {post.content}
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
            </CardContent>

            <Divider />

            <CardActions sx={{ justifyContent: 'space-between', px: 2 }}>
              <Button
                size="small"
                startIcon={post.liked ? <ThumbUp /> : <ThumbUpOutlined />}
                color={post.liked ? 'primary' : 'inherit'}
                onClick={() => handleLikePost(post.id)}
              >
                {formatNumber(post.likes || 0)}
              </Button>
              <Button
                size="small"
                startIcon={<Comment />}
              >
                {formatNumber(post.comments || 0)}
              </Button>
              <Button
                size="small"
                startIcon={<Share />}
              >
                Share
              </Button>
              <IconButton size="small">
                <BookmarkBorder />
              </IconButton>
            </CardActions>
          </Card>
        ))
      )}

      {/* Loading More */}
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
    </Box>
  );
}

export default Feed;
