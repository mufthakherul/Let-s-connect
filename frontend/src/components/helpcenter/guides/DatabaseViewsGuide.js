import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function DatabaseViewsGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Database Views Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Build views, filters, and schemas for structured data.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Create a view
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Database Views and click New View." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Choose a template or start blank." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add properties and field types." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Filter and sort
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Use filters to show only relevant rows." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Sort by priority or due date." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Save views for quick access." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Fields missing? Refresh and check permissions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Cannot edit schema? Verify role access." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="View slow? Reduce filters or columns." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/databases/views">
                        Open database views
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
