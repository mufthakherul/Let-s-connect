import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function CallsGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Calls Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Start voice or video calls and manage device settings.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Start a call
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Calls and choose voice or video." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Select participants and click Start." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Allow mic and camera permissions." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. In-call controls
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Mute, unmute, and toggle video." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Switch camera or microphone device." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Share your screen when needed." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="No mic? Check input device settings." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="No camera? Verify permission in browser." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Call drops? Check network stability." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/calls">
                        Open calls
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
