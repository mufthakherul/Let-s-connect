import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function WikiDiffGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Wiki Diff Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Compare changes between versions and review edits.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Open a diff
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Go to Wiki Diff from the menu." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Select the wiki page and two versions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="View changes side by side." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Review changes
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Added text is highlighted in green." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Removed text is highlighted in red." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Scroll to compare large changes." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="No versions? Check wiki history." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Diff not loading? Refresh the page." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Incorrect comparison? Select different versions." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/wikis/diff">
                        Open wiki diff
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
