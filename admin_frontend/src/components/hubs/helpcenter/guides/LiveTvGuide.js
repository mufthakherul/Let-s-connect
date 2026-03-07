import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function LiveTvGuide() {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Live TV (IPTV) Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Browse channels, watch live TV, and manage your favorites.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          1. Open Live TV
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Go to Live TV from the navigation or menu." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Browse channels by category or search." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Click a channel to start watching." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          2. Player controls
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Pause, mute, and switch to full screen." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Adjust quality if your connection is slow." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Use picture-in-picture to keep watching while browsing." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. Favorites and recent channels
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Click the star icon to save favorites." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Access recent channels from your TV library." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Create lists for news, sports, and entertainment." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          4. Troubleshooting
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Buffering? Lower the quality or refresh the stream." />
          </ListItem>
          <ListItem>
            <ListItemText primary="No playback? Check connection or try another channel." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Audio lag? Pause for a few seconds, then resume." />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} to="/helpcenter/manuals">
            Back to manuals
          </Button>
          <Button variant="contained" component={Link} to="/tv">
            Open Live TV
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
