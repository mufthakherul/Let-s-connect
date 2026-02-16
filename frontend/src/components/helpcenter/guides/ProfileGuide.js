import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function ProfileGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Profile Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Manage your public profile, skills, and privacy preferences.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Update profile details
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open your profile and click Edit." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Update photo, bio, location, and links." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Save changes and preview your profile." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Skills and highlights
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Add skills relevant to your work." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Pin top projects or posts." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Keep your summary concise and clear." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Privacy
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Control who can view your profile." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Limit who can contact or follow you." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Review visibility for your posts and activity." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/profile">
                        Open profile
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
