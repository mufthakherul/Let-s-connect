import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function SearchGuide() {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Search Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Find people, posts, videos, and content quickly.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          1. Basic search
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Use the search bar in the top navigation." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Type keywords, names, or tags." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Use filters for People, Posts, Videos, and Groups." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          2. Save searches
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Save frequent searches for quick access." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Review recent searches from the dropdown." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Clear search history when needed." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. Troubleshooting
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="No results? Try broader keywords." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Wrong results? Add more specific terms." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Search slow? Clear filters and retry." />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} to="/helpcenter/manuals">
            Back to manuals
          </Button>
          <Button variant="contained" component={Link} to="/search">
            Open search
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
