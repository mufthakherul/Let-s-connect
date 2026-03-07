import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function BlogGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Blog Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Read articles, publish posts, and engage with writers.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Browse and read
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Blog to see featured and recent posts." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Filter by category or tag." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Save posts to read later." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Write and publish
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Click Create Post and add a title and content." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add cover image and tags." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Preview and publish." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Comments and moderation
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Like or comment on posts you enjoy." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Edit or delete your comments from the menu." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Report abusive content if needed." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Cannot publish? Check required fields." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Missing image? Use JPG or PNG format." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Slow editor? Try refreshing or clearing cache." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/blog">
                        Open blog
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
