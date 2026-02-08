import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, Typography, Box,
  IconButton, Chip, Skeleton, CardHeader, Avatar, CardActions
} from '@mui/material';
import {
  Bookmark as BookmarkIcon,
  BookmarkBorder,
  Delete,
  OpenInNew
} from '@mui/icons-material';
import { formatRelativeTime } from '../utils/helpers';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Bookmarks = ({ user }) => {
  const [bookmarks, setBookmarks] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBookmarks();
  }, []);

  const fetchBookmarks = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/content/bookmarks`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBookmarks(response.data);
    } catch (error) {
      console.error('Error fetching bookmarks:', error);
      toast.error('Failed to load bookmarks');
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveBookmark = async (bookmarkId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${API_URL}/content/bookmarks/${bookmarkId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setBookmarks(bookmarks.filter(b => b.id !== bookmarkId));
      toast.success('Bookmark removed');
    } catch (error) {
      console.error('Error removing bookmark:', error);
      toast.error('Failed to remove bookmark');
    }
  };

  if (loading) {
    return (
      <Container maxWidth="md">
        <Typography variant="h4" fontWeight="bold" sx={{ mb: 4 }}>
          My Bookmarks
        </Typography>
        <Grid container spacing={2}>
          {[1, 2, 3].map((n) => (
            <Grid item xs={12} key={n}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={30} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="80%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="md">
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" fontWeight="bold">
          My Bookmarks
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {bookmarks.length} saved items
        </Typography>
      </Box>

      {bookmarks.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <BookmarkIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            No bookmarks yet
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            Save posts, videos, and articles to find them later
          </Typography>
        </Box>
      ) : (
        <Grid container spacing={2}>
          {bookmarks.map((bookmark) => (
            <Grid item xs={12} key={bookmark.id}>
              <Card>
                <CardHeader
                  avatar={
                    <Avatar sx={{ bgcolor: 'primary.main' }}>
                      {bookmark.type === 'post' ? 'P' : bookmark.type === 'video' ? 'V' : 'A'}
                    </Avatar>
                  }
                  action={
                    <IconButton onClick={() => handleRemoveBookmark(bookmark.id)}>
                      <Delete />
                    </IconButton>
                  }
                  title={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography variant="subtitle1" fontWeight="600">
                        {bookmark.title || 'Untitled'}
                      </Typography>
                      <Chip label={bookmark.type} size="small" />
                    </Box>
                  }
                  subheader={`Saved ${formatRelativeTime(bookmark.createdAt)}`}
                />
                <CardContent>
                  <Typography variant="body2" color="text.secondary">
                    {bookmark.content || bookmark.description || 'No description'}
                  </Typography>
                </CardContent>
                <CardActions>
                  <IconButton size="small" color="primary">
                    <OpenInNew fontSize="small" />
                  </IconButton>
                </CardActions>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Container>
  );
};

export default Bookmarks;
