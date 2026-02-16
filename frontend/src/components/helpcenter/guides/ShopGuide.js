import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function ShopGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Shop and E-commerce Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Browse products, manage your cart, place orders, and track deliveries.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Browse and search
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Shop to see featured products and categories." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use filters for price, rating, and availability." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Open a product page to view details and reviews." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Cart and checkout
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Add items to your cart from the product page." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Adjust quantities and apply discount codes." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Confirm shipping details and payment method." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Orders and tracking
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="View orders from your profile or order history." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Track shipment status and delivery updates." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Download receipts and invoices as needed." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Returns and support
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Request returns within the listed policy window." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Contact support for damaged or missing items." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use the Help Center for common questions." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/shop">
                        Open shop
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
