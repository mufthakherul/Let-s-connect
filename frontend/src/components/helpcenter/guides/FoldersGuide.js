import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function FoldersGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Folders Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Organize files and folders, manage permissions, and share content.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Create folders
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Folders and click New Folder." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Name the folder and select location." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Add files by drag and drop." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Share and permissions
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Share links with view or edit access." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Set role-based access for teams." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Revoke access anytime." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Cannot upload? Check file size limits." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Missing files? Refresh and verify permissions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Search not working? Clear filters." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/folders">
                        Open folders
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
