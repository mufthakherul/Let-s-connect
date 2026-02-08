import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, Grid, Button } from '@mui/material';
import axios from 'axios';

function Shop() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('/api/shop/public/products');
      setProducts(response.data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Shop
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Browse products without signing up
      </Typography>

      <Grid container spacing={3}>
        {products.map((product) => (
          <Grid item xs={12} sm={6} md={4} key={product.id}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {product.name}
                </Typography>
                <Typography variant="body2" color="text.secondary" paragraph>
                  {product.description}
                </Typography>
                <Typography variant="h5" color="primary" gutterBottom>
                  ${product.price}
                </Typography>
                <Typography variant="caption" display="block" gutterBottom>
                  Stock: {product.stock}
                </Typography>
                <Button variant="contained" fullWidth>
                  Add to Cart
                </Button>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}

export default Shop;
