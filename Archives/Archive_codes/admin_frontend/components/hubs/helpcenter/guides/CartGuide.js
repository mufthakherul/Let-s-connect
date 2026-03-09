import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function CartGuide() {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Cart Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Manage items in your cart, apply discounts, and proceed to checkout.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          1. Add items
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Add products from the Shop or product page." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Review item details and quantities." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Remove items you no longer want." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          2. Discounts and checkout
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Apply discount codes if available." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Review shipping and taxes." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Proceed to checkout to complete payment." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. Troubleshooting
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Coupon invalid? Check expiration date." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Total changed? Verify taxes and shipping." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Cannot checkout? Confirm stock availability." />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} to="/helpcenter/manuals">
            Back to manuals
          </Button>
          <Button variant="contained" component={Link} to="/cart">
            Open cart
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
