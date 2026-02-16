import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function GroupsGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Groups Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Join communities, create groups, and manage moderation.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Join a group
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Groups and browse suggested communities." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Request to join private groups if required." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Read group rules before posting." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Create a group
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Click Create Group and set a name and description." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Choose visibility: Public, Private, or Secret." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Invite members and assign moderators." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Moderation
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Pin important posts and announcements." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Remove posts that break rules." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Review reports and manage member roles." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Cannot post? Check group permissions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Missing posts? Check filters or pinned content." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Invite failed? Verify member email or username." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/groups">
                        Open groups
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
