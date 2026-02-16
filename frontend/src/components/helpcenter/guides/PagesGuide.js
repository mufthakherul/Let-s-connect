import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function PagesGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Pages Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Create pages for brands or communities and manage followers.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Create a page
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Pages and click Create Page." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Choose a category and add a description." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Upload a logo and cover image." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Publish content
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Write posts and share updates." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Schedule posts for future release." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Reply to comments and messages." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Manage roles
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Assign page admins or editors." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Limit access to sensitive settings." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Review insights and page analytics." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Cannot publish? Check role permissions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Page not visible? Verify privacy settings." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Missing followers? Use invites or share link." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/pages">
                        Open pages
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
