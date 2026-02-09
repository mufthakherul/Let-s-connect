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
import { Delete, Add, Remove } from '@mui/icons-material';
import axios from 'axios';

function Cart() {
  const [cartItems, setCartItems] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (user.id && token) {
      fetchCart();
    } else {
      setLoading(false);
      setError('Please log in to view your cart');
    }
  }, []);

  const fetchCart = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`/api/shop/cart/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setCartItems(response.data.items || []);
      setTotal(response.data.total || 0);
      setError('');
    } catch (err) {
      console.error('Failed to fetch cart:', err);
      setError('Failed to load cart');
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (itemId, newQuantity) => {
    try {
      if (newQuantity <= 0) {
        await removeItem(itemId);
        return;
      }

      await axios.put(
        `/api/shop/cart/${itemId}`,
        { quantity: newQuantity },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Cart updated');
      setTimeout(() => setSuccess(''), 2000);
      fetchCart();
    } catch (err) {
      console.error('Failed to update quantity:', err);
      setError('Failed to update quantity');
    }
  };

  const removeItem = async (itemId) => {
    try {
      await axios.delete(`/api/shop/cart/${itemId}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Item removed from cart');
      setTimeout(() => setSuccess(''), 2000);
      fetchCart();
    } catch (err) {
      console.error('Failed to remove item:', err);
      setError('Failed to remove item');
    }
  };

  const clearCart = async () => {
    if (!window.confirm('Are you sure you want to clear your cart?')) {
      return;
    }

    try {
      await axios.delete(`/api/shop/cart/user/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      setSuccess('Cart cleared');
      setTimeout(() => setSuccess(''), 2000);
      fetchCart();
    } catch (err) {
      console.error('Failed to clear cart:', err);
      setError('Failed to clear cart');
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography>Loading cart...</Typography>
      </Box>
    );
  }

  if (!user.id || !token) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please log in to view your cart</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Shopping Cart
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
              Your cart is empty
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
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          >
                            <Remove />
                          </IconButton>
                          
                          <TextField
                            size="small"
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val >= 1) {
                                updateQuantity(item.id, val);
                              }
                            }}
                            sx={{ width: '60px' }}
                            inputProps={{ min: 1 }}
                          />
                          
                          <IconButton
                            size="small"
                            onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          >
                            <Add />
                          </IconButton>
                        </Box>
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
                onClick={clearCart}
              >
                Clear Cart
              </Button>
              
              <Box sx={{ textAlign: 'right' }}>
                <Typography variant="h5" gutterBottom>
                  Total: ${parseFloat(total || 0).toFixed(2)}
                </Typography>
                <Button
                  variant="contained"
                  color="primary"
                  size="large"
                >
                  Proceed to Checkout
                </Button>
              </Box>
            </Box>
          </Box>
        </>
      )}
    </Box>
  );
}

export default Cart;
