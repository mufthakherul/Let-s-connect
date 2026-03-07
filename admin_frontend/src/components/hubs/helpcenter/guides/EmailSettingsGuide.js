import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function EmailSettingsGuide() {
  return (
    <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
      <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
        <Typography variant="h4" gutterBottom fontWeight={700}>
          Email Settings Guide
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Control email notifications and frequency preferences.
        </Typography>

        <Divider sx={{ my: 3 }} />

        <Typography variant="h6" gutterBottom>
          1. Open email preferences
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Go to Settings and open Email Notifications." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Review the list of notification types." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          2. Customize notifications
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Toggle updates for messages, mentions, and comments." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Set digest frequency for newsletters." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Save changes after updates." />
          </ListItem>
        </List>

        <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
          3. Troubleshooting
        </Typography>
        <List dense>
          <ListItem>
            <ListItemText primary="Not receiving email? Check spam or allow the sender." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Too many emails? Reduce notification types." />
          </ListItem>
          <ListItem>
            <ListItemText primary="Changes not saving? Refresh and try again." />
          </ListItem>
        </List>

        <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Button variant="outlined" component={Link} to="/helpcenter/manuals">
            Back to manuals
          </Button>
          <Button variant="contained" component={Link} to="/notifications/email">
            Open email settings
          </Button>
        </Box>
      </Paper>
    </Container>
  );
}
