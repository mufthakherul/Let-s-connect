import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function VideosGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Videos Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Upload, manage, and watch videos. This guide covers creation, playback, and discovery.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Upload a video
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Videos and click Upload." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add a title, description, and tags." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Choose visibility (Public, Unlisted, Private)." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add a thumbnail and publish." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Manage your videos
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Edit metadata from your video library." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Update thumbnails and visibility anytime." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Delete or archive outdated videos." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Watch and engage
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Use the player controls for quality and speed." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Like, comment, and share videos." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Save videos to playlists or Watch Later." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Tips for better quality
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Use clear audio and stable lighting." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Keep file sizes reasonable for faster processing." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add accurate tags to improve discovery." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    5. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Upload stuck? Refresh and try a smaller file." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Playback issues? Lower quality or check connection." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="No audio? Verify source audio track." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/videos">
                        Open videos
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
