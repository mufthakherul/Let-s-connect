import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function LiveRadioGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Live Radio Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Discover radio stations, manage favorites, and create playlists.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Find a station
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Live Radio and browse by genre or region." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use search to find specific stations." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Click a station to start listening." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Favorites and playlists
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Save stations to Favorites for quick access." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Create playlists for different moods." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Reorder stations and remove unused items." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Playback tips
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Use background playback while multitasking." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Adjust volume and stream quality as needed." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Switch stations without stopping playback." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Station not loading? Try another station or refresh." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Audio drops? Check network stability." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="No sound? Confirm device output settings." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/radio">
                        Open Live Radio
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
