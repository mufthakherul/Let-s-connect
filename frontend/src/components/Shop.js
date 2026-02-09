import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Alert,
  Chip,
  Rating,
  Tabs,
  Tab
} from '@mui/material';
import { ShoppingCart, Favorite, FavoriteBorder, Close } from '@mui/icons-material';
import axios from 'axios';
import ProductReview from './ProductReview';

function Shop() {
  const [products, setProducts] = useState([]);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [tabValue, setTabValue] = useState(0);
  const [wishlist, setWishlist] = useState([]);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchProducts();
    if (user.id && token) {
      fetchWishlist();
    }
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/shop/public/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  const fetchWishlist = async () => {
    try {
      const response = await axios.get(`/api/shop/wishlist/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setWishlist(response.data.map(item => item.productId));
    } catch (err) {
      console.error('Failed to fetch wishlist:', err);
    }
  };

  const addToCart = async (productId) => {
    if (!user.id || !token) {
      setError('Please log in to add items to cart');
      return;
    }

    try {
      await axios.post(
        '/api/shop/cart',
        { productId, quantity: 1 },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess('Added to cart!');
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to add to cart:', err);
      setError('Failed to add to cart');
    }
  };

  const toggleWishlist = async (productId) => {
    if (!user.id || !token) {
      setError('Please log in to manage wishlist');
      return;
    }

    try {
      if (wishlist.includes(productId)) {
        // Find wishlist item and remove it
        const response = await axios.get(`/api/shop/wishlist/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const item = response.data.find(w => w.productId === productId);
        if (item) {
          await axios.delete(`/api/shop/wishlist/${item.id}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          setWishlist(wishlist.filter(id => id !== productId));
          setSuccess('Removed from wishlist');
        }
      } else {
        // Add to wishlist
        await axios.post(
          '/api/shop/wishlist',
          { userId: user.id, productId },
          { headers: { Authorization: `Bearer ${token}` } }
        );
        setWishlist([...wishlist, productId]);
        setSuccess('Added to wishlist');
      }
      setTimeout(() => setSuccess(''), 2000);
    } catch (err) {
      console.error('Failed to update wishlist:', err);
      setError('Failed to update wishlist');
    }
  };

  const openProductDialog = (product) => {
    setSelectedProduct(product);
    setDialogOpen(true);
    setTabValue(0);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setSelectedProduct(null);
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Shop
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Browse products without signing up
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

      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card sx={{ position: 'relative' }}>
              <IconButton
                sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}
                onClick={() => toggleWishlist(product.id)}
                color={wishlist.includes(product.id) ? 'error' : 'default'}
              >
                {wishlist.includes(product.id) ? <Favorite /> : <FavoriteBorder />}
              </IconButton>

              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {product.description?.substring(0, 100)}
                  {product.description?.length > 100 ? '...' : ''}
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="h5" color="primary">
                    ${product.price}
                  </Typography>
                  {product.category && (
                    <Chip label={product.category} size="small" />
                  )}
                </Box>
                <Typography variant="caption" display="block" gutterBottom>
                  Stock: {product.stock}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
                  <Button
                    variant="contained"
                    fullWidth
                    startIcon={<ShoppingCart />}
                    onClick={() => addToCart(product.id)}
                    disabled={product.stock === 0}
                  >
                    Add to Cart
                  </Button>
                  <Button
                    variant="outlined"
                    onClick={() => openProductDialog(product)}
                  >
                    Details
                  </Button>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Product Details Dialog */}
      <Dialog
        open={dialogOpen}
        onClose={closeDialog}
        maxWidth="md"
        fullWidth
      >
        {selectedProduct && (
          <>
            <DialogTitle>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="h5">{selectedProduct.name}</Typography>
                <IconButton onClick={closeDialog}>
                  <Close />
                </IconButton>
              </Box>
            </DialogTitle>
            <DialogContent>
              <Tabs value={tabValue} onChange={(e, val) => setTabValue(val)} sx={{ mb: 2 }}>
                <Tab label="Details" />
                <Tab label="Reviews" />
              </Tabs>

              {tabValue === 0 && (
                <Box>
                  <Typography variant="h4" color="primary" gutterBottom>
                    ${selectedProduct.price}
                  </Typography>
                  <Typography variant="body1" paragraph>
                    {selectedProduct.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Category: {selectedProduct.category || 'Uncategorized'}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" paragraph>
                    Stock Available: {selectedProduct.stock}
                  </Typography>
                  
                  <Box sx={{ display: 'flex', gap: 1, mt: 3 }}>
                    <Button
                      variant="contained"
                      fullWidth
                      startIcon={<ShoppingCart />}
                      onClick={() => {
                        addToCart(selectedProduct.id);
                        closeDialog();
                      }}
                      disabled={selectedProduct.stock === 0}
                    >
                      Add to Cart
                    </Button>
                    <IconButton
                      onClick={() => toggleWishlist(selectedProduct.id)}
                      color={wishlist.includes(selectedProduct.id) ? 'error' : 'default'}
                    >
                      {wishlist.includes(selectedProduct.id) ? <Favorite /> : <FavoriteBorder />}
                    </IconButton>
                  </Box>
                </Box>
              )}

              {tabValue === 1 && (
                <ProductReview productId={selectedProduct.id} />
              )}
            </DialogContent>
          </>
        )}
      </Dialog>
    </Box>
  );
}

export default Shop;
