import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Rating,
  Grid,
  Chip,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Divider
} from '@mui/material';
import { ThumbUp } from '@mui/icons-material';
import axios from 'axios';

function ProductReview({ productId }) {
  const [reviews, setReviews] = useState([]);
  const [stats, setStats] = useState({ averageRating: 0, totalReviews: 0 });
  const [showForm, setShowForm] = useState(false);
  const [sortBy, setSortBy] = useState('recent');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Form state
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (productId) {
      fetchReviews();
    }
  }, [productId, sortBy]);

  const fetchReviews = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/shop/products/${productId}/reviews`, {
        params: { sort: sortBy }
      });
      setReviews(response.data.reviews || []);
      setStats(response.data.stats || { averageRating: 0, totalReviews: 0 });
      setError('');
    } catch (err) {
      console.error('Failed to fetch reviews:', err);
      setError('Failed to load reviews');
    } finally {
      setLoading(false);
    }
  };

  const submitReview = async (e) => {
    e.preventDefault();

    if (!user.id || !token) {
      setError('Please log in to submit a review');
      return;
    }

    if (!title.trim() || !reviewText.trim()) {
      setError('Please fill in all fields');
      return;
    }

    try {
      await axios.post(
        `/api/shop/products/${productId}/reviews`,
        {
          userId: user.id,
          rating,
          title: title.trim(),
          reviewText: reviewText.trim(),
          verifiedPurchase: false
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setSuccess('Review submitted successfully!');
      setTitle('');
      setReviewText('');
      setRating(5);
      setShowForm(false);
      setTimeout(() => setSuccess(''), 3000);
      fetchReviews();
    } catch (err) {
      console.error('Failed to submit review:', err);
      if (err.response?.data?.error) {
        setError(err.response.data.error);
      } else {
        setError('Failed to submit review');
      }
    }
  };

  const markHelpful = async (reviewId) => {
    if (!user.id || !token) {
      setError('Please log in to mark reviews as helpful');
      return;
    }

    try {
      await axios.post(
        `/api/shop/reviews/${reviewId}/helpful`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Thank you for your feedback!');
      setTimeout(() => setSuccess(''), 2000);
      fetchReviews();
    } catch (err) {
      console.error('Failed to mark review as helpful:', err);
      setError('Failed to mark review as helpful');
    }
  };

  if (loading && reviews.length === 0) {
    return (
      <Box sx={{ p: 2 }}>
        <Typography>Loading reviews...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
          {error}
        </Alert>
      )}

      {success && (
        <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
          {success}
        </Alert>
      )}

      {/* Rating Summary */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={6}>
              <Typography variant="h5" gutterBottom>
                Customer Reviews
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Typography variant="h3">
                  {parseFloat(stats.averageRating).toFixed(1)}
                </Typography>
                <Box>
                  <Rating value={parseFloat(stats.averageRating)} readOnly precision={0.1} />
                  <Typography variant="body2" color="text.secondary">
                    Based on {stats.totalReviews} review{stats.totalReviews !== 1 ? 's' : ''}
                  </Typography>
                </Box>
              </Box>
            </Grid>

            <Grid item xs={12} md={6} sx={{ textAlign: { xs: 'left', md: 'right' } }}>
              {!showForm ? (
                <Button
                  variant="contained"
                  onClick={() => setShowForm(true)}
                  disabled={!user.id || !token}
                >
                  Write a Review
                </Button>
              ) : (
                <Button
                  variant="outlined"
                  onClick={() => setShowForm(false)}
                >
                  Cancel
                </Button>
              )}
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Review Form */}
      {showForm && (
        <Card sx={{ mb: 3 }}>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Write Your Review
            </Typography>
            <form onSubmit={submitReview}>
              <Box sx={{ mb: 2 }}>
                <Typography component="legend">Your Rating</Typography>
                <Rating
                  value={rating}
                  onChange={(event, newValue) => setRating(newValue || 5)}
                  size="large"
                />
              </Box>

              <TextField
                fullWidth
                label="Review Title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                sx={{ mb: 2 }}
                required
              />

              <TextField
                fullWidth
                label="Your Review"
                value={reviewText}
                onChange={(e) => setReviewText(e.target.value)}
                multiline
                rows={4}
                sx={{ mb: 2 }}
                required
              />

              <Button type="submit" variant="contained">
                Submit Review
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Sort and Filter */}
      <Box sx={{ mb: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h6">
          {stats.totalReviews} Review{stats.totalReviews !== 1 ? 's' : ''}
        </Typography>
        
        <FormControl size="small" sx={{ minWidth: 150 }}>
          <InputLabel>Sort By</InputLabel>
          <Select
            value={sortBy}
            label="Sort By"
            onChange={(e) => setSortBy(e.target.value)}
          >
            <MenuItem value="recent">Most Recent</MenuItem>
            <MenuItem value="helpful">Most Helpful</MenuItem>
            <MenuItem value="rating">Highest Rating</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Reviews List */}
      {reviews.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              No reviews yet. Be the first to review this product!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          {reviews.map((review) => (
            <Grid item xs={12} key={review.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                    <Box>
                      <Rating value={review.rating} readOnly size="small" />
                      <Typography variant="h6" sx={{ mt: 1 }}>
                        {review.title}
                      </Typography>
                    </Box>
                    {review.verifiedPurchase && (
                      <Chip
                        label="Verified Purchase"
                        color="success"
                        size="small"
                      />
                    )}
                  </Box>

                  <Typography variant="body2" color="text.secondary" paragraph>
                    {review.reviewText}
                  </Typography>

                  <Divider sx={{ my: 1 }} />

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </Typography>

                    <Button
                      size="small"
                      startIcon={<ThumbUp />}
                      onClick={() => markHelpful(review.id)}
                    >
                      Helpful ({review.helpfulCount})
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}

export default ProductReview;
