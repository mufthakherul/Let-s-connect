import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function ProjectsGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Projects Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Plan work, track tasks, and coordinate delivery with your team.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Create a project
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Projects and click New Project." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Define goals, timeline, and milestones." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Invite collaborators and assign roles." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Manage tasks
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Create tasks with due dates and owners." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use labels to prioritize work." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Track progress with boards or lists." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. Reporting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Review activity and status updates." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Export reports for stakeholders." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Archive completed projects." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Cannot edit? Check project permissions." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Tasks missing? Reset filters or refresh." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Notifications noisy? Adjust project alerts." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/projects">
                        Open projects
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
