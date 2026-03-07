import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function DocsGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Docs and Wiki Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Create documents, build wikis, and collaborate in real time.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Create a document
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Docs and click New Document." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add a title and start writing." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use headings, lists, and embeds." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Build a wiki
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Create a parent page and add child pages." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use templates to keep consistency." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Publish and share with your team." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Collaboration
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Invite collaborators and set permissions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use comments to request changes." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Track versions and revert if needed." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Cannot edit? Check permissions or lock status." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Missing content? Use version history to restore." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Slow sync? Refresh and check network." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/docs">
                        Open docs
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
