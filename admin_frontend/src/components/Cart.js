import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Grid,
  Divider,
  Alert,
  TextField
} from '@mui/material';
import { Delete, ChatBubbleOutline } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import axios from 'axios';

function Cart() {
  const navigate = useNavigate();
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (user.id && token) {
      fetchSavedItems();
    } else {
      setLoading(false);
      setError('Please log in to view your saved items');
    }
  }, []);

  const fetchSavedItems = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/shop/cart/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems(response.data.items || []);
      setError('');
    } catch (err) {
      console.error('Failed to fetch saved items:', err);
      setError('Failed to load saved items');
    } finally {
      setLoading(false);
    }
  };

  const handleChatToBuy = (product) => {
    const sellerId = product.sellerId || 'system';
    const encodedMessage = encodeURIComponent(`Hi! I'm interested in buying "${product.name}" from my saved items. Is this currently available?`);
    navigate(`/chat?recipient=${sellerId}&message=${encodedMessage}`);
  };

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/api/shop/cart/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Item removed from saved list');
      setTimeout(() => setSuccess(''), 2000);
      fetchSavedItems();
    } catch (err) {
      console.error('Failed to remove item:', err);
      setError('Failed to remove item');
    }
  };

  const clearSavedItems = async () => {
    if (!window.confirm('Are you sure you want to clear your saved items?')) {
      return;
    }

    try {
      await axios.delete(`/api/shop/cart/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSuccess('Saved items cleared');
      setTimeout(() => setSuccess(''), 2000);
      fetchSavedItems();
    } catch (err) {
      console.error('Failed to clear saved items:', err);
      setError('Failed to clear saved items');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading saved items...</Typography>
      </Box>
    );
  }

  if (!user.id || !token) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please log in to view your saved items</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Saved Items
      </Typography>

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

      {cartItems.length === 0 ? (
        <Card>
          <CardContent>
            <Typography variant="body1" color="text.secondary">
              Your saved items list is empty
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          <Grid container spacing={2}>
            {cartItems.map((item) => (
              <Grid item xs={12} key={item.id}>
                <Card>
                  <CardContent>
                    <Grid container spacing={2} alignItems="center">
                      <Grid item xs={12} md={6}>
                        <Typography variant="h6">
                          {item.Product?.name || 'Unknown Product'}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          {item.Product?.description || ''}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={2}>
                        <Typography variant="h6" color="primary">
                          ${parseFloat(item.Product?.price || 0).toFixed(2)}
                        </Typography>
                      </Grid>

                      <Grid item xs={12} md={3}>
                        <motion.div whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}>
                          <Button
                            variant="contained"
                            fullWidth
                            startIcon={<ChatBubbleOutline />}
                            onClick={() => handleChatToBuy(item.Product)}
                            sx={{
                              background: 'linear-gradient(45deg, #10b981, #059669)',
                              color: 'white',
                              fontWeight: 600,
                              textTransform: 'none',
                              boxShadow: '0 4px 14px 0 rgba(16, 185, 129, 0.39)',
                              '&:hover': {
                                background: 'linear-gradient(45deg, #059669, #047857)',
                              }
                            }}
                          >
                            Chat to Buy
                          </Button>
                        </motion.div>
                      </Grid>

                      <Grid item xs={12} md={1}>
                        <IconButton
                          color="error"
                          onClick={() => removeItem(item.id)}
                        >
                          <Delete />
                        </IconButton>
                      </Grid>
                    </Grid>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          <Box sx={{ mt: 3 }}>
            <Divider sx={{ mb: 2 }} />
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                variant="outlined"
                color="error"
                onClick={clearSavedItems}
              >
                Clear Saved Items
              </Button>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export default Cart;
