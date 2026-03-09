import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function BookmarksGuide() {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Bookmarks Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Save posts, organize collections, and access items later.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          1. Save a post
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Click the bookmark icon on a post." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Choose a collection or create a new one." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Access saved items from Bookmarks." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          2. Organize collections
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Create collections by topic or project." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Move items between collections." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Remove items or delete collections." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. Troubleshooting
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Missing bookmark? Refresh or check filters." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Cannot save? Try again or check permissions." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Too many items? Archive older collections." />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} to="/helpcenter/manuals">
            Back to manuals
          </Button>
          <Button variant="contained" component={Link} to="/bookmarks">
            Open bookmarks
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
