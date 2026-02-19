import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function AdvancedSearchGuide() {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Advanced Search Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Use filters and advanced fields to find precise results.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          1. Open advanced search
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Go to Advanced Search from the menu." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Choose a content type to filter." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Set date ranges, tags, or author." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          2. Build queries
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Combine filters for precise results." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Use quotes for exact phrases." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Save common queries for later." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. Troubleshooting
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="No results? Remove one filter and retry." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Too many results? Add more filters." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Fields missing? Ensure the content type is correct." />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} to="/helpcenter/manuals">
            Back to manuals
          </Button>
          <Button variant="contained" component={Link} to="/search/advanced">
            Open advanced search
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
