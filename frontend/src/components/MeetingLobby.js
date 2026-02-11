import React, { useEffect, useState } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Grid,
    Stack,
    TextField,
    Typography,
} from '@mui/material';
import api from '../utils/api';

const useQuery = () => new URLSearchParams(useLocation().search);

function MeetingLobby() {
    const { id } = useParams();
    const query = useQuery();
    const [meetingId, setMeetingId] = useState(id || '');
    const [accessCode, setAccessCode] = useState(query.get('accessCode') || '');
    const [meeting, setMeeting] = useState(null);
    const [notes, setNotes] = useState([]);
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const loadLobby = async (targetId = meetingId, targetCode = accessCode) => {
        if (!targetId || !targetCode) {
            setError('Meeting ID and access code are required.');
            return;
        }

        try {
            setLoading(true);
            setError('');
            const response = await api.get(`/collaboration/meetings/public/${targetId}/lobby`, {
                params: { accessCode: targetCode },
            });
            setMeeting(response.data.meeting || null);
            setNotes(response.data.notes || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to load lobby');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (id && accessCode) {
            loadLobby(id, accessCode);
        }
    }, [id, accessCode]);

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Guest Lobby
            </Typography>
            <Typography color="text.secondary" sx={{ mb: 3 }}>
                Enter your meeting access code to view shared notes.
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Box
                        component="form"
                        onSubmit={(event) => {
                            event.preventDefault();
                            loadLobby();
                        }}
                    >
                        <Grid container spacing={2}>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Meeting ID"
                                    value={meetingId}
                                    onChange={(event) => setMeetingId(event.target.value)}
                                    required
                                />
                            </Grid>
                            <Grid item xs={12} sm={6}>
                                <TextField
                                    fullWidth
                                    label="Access Code"
                                    value={accessCode}
                                    onChange={(event) => setAccessCode(event.target.value)}
                                    required
                                />
                            </Grid>
                        </Grid>
                        <Button type="submit" variant="contained" sx={{ mt: 2 }}>
                            Load Lobby
                        </Button>
                    </Box>
                </CardContent>
            </Card>

            {loading && <Typography>Loading...</Typography>}

            {!loading && meeting && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h5">{meeting.title}</Typography>
                        <Typography color="text.secondary" sx={{ mt: 1 }}>
                            {meeting.description || 'No description available.'}
                        </Typography>
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                            {meeting.scheduledAt && (
                                <Typography variant="body2">
                                    Scheduled: {new Date(meeting.scheduledAt).toLocaleString()}
                                </Typography>
                            )}
                            {meeting.status && (
                                <Typography variant="body2">
                                    Status: {meeting.status}
                                </Typography>
                            )}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {!loading && meeting && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Shared Notes
                        </Typography>
                        {notes.length === 0 && (
                            <Typography color="text.secondary">No shared notes yet.</Typography>
                        )}
                        <Stack spacing={2}>
                            {notes.map((note) => (
                                <Card key={note.id} variant="outlined">
                                    <CardContent>
                                        <Typography>{note.content}</Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}
        </Box>
    );
}

export default MeetingLobby;
