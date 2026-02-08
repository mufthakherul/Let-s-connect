import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, Avatar } from '@mui/material';
import axios from 'axios';

function Feed({ user }) {
  const [posts, setPosts] = useState([]);
  const [newPost, setNewPost] = useState('');

  useEffect(() => {
    fetchPosts();
  }, []);

  const fetchPosts = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/content/feed/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPosts(response.data);
    } catch (err) {
      console.error('Failed to fetch posts:', err);
    }
  };

  const handleCreatePost = async () => {
    if (!newPost.trim()) return;

    try {
      const token = localStorage.getItem('token');
      await axios.post('/api/content/posts', {
        userId: user.id,
        content: newPost,
        visibility: 'public'
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setNewPost('');
      fetchPosts();
    } catch (err) {
      console.error('Failed to create post:', err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Feed
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <TextField
            fullWidth
            multiline
            rows={3}
            placeholder="What's on your mind?"
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
          />
          <Button 
            variant="contained" 
            sx={{ mt: 2 }}
            onClick={handleCreatePost}
          >
            Post
          </Button>
        </CardContent>
      </Card>

      {posts.map((post) => (
        <Card key={post.id} sx={{ mb: 2 }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
              <Avatar sx={{ mr: 2 }}>U</Avatar>
              <Typography variant="subtitle2">
                User {post.userId}
              </Typography>
            </Box>
            <Typography variant="body1">
              {post.content}
            </Typography>
            <Box sx={{ mt: 2, display: 'flex', gap: 2 }}>
              <Typography variant="caption">
                {post.likes} likes
              </Typography>
              <Typography variant="caption">
                {post.comments} comments
              </Typography>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  );
}

export default Feed;
