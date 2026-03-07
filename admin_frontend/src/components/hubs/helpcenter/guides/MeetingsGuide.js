import React from 'react';
import { Container, Typography, Paper, Box, Divider, List, ListItem, ListItemText, Button } from '@mui/material';
import { Link } from 'react-router-dom';

export default function MeetingsGuide() {
    return (
        <Container maxWidth="md" sx={{ mt: 6, mb: 6 }}>
            <Paper sx={{ p: { xs: 3, md: 6 } }} elevation={0}>
                <Typography variant="h4" gutterBottom fontWeight={700}>
                    Meetings and Collaboration Guide
                </Typography>
                <Typography variant="body1" color="text.secondary" paragraph>
                    Schedule meetings, join calls, and collaborate with screen sharing, chat, and notes.
                </Typography>

                <Divider sx={{ my: 3 }} />

                <Typography variant="h6" gutterBottom>
                    1. Schedule a meeting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Open Meetings and click Create." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Set title, date, time, and time zone." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Invite participants and add an agenda." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Choose settings like waiting room and recording." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    2. Join a meeting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Click Join from the meeting list or open the invite link." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Test your camera and microphone before entering." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use chat, reactions, and raise hand to participate." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    3. In-meeting controls
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Mute or unmute and toggle camera." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Open chat to share links and messages." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use the participants panel to invite or remove people." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    4. Screen sharing and collaboration
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Click Share Screen and choose a window or full screen." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Use whiteboard or notes for real-time collaboration." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Save notes and action items after the meeting." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    5. Recording and follow-ups
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="Start or stop recording if enabled by the host." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Share the recording link with participants." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Store summaries in Docs or Projects." />
                    </ListItem>
                </List>

                <Typography variant="h6" gutterBottom sx={{ mt: 2 }}>
                    6. Troubleshooting
                </Typography>
                <List dense>
                    <ListItem>
                        <ListItemText primary="No audio? Check input device in settings." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Poor video? Reduce quality or close other apps." />
                    </ListItem>
                    <ListItem>
                        <ListItemText primary="Cannot join? Verify link and meeting time." />
                    </ListItem>
                </List>

                <Box sx={{ mt: 4, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                    <Button variant="outlined" component={Link} to="/helpcenter/manuals">
                        Back to manuals
                    </Button>
                    <Button variant="contained" component={Link} to="/meetings">
                        Open meetings
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
}
