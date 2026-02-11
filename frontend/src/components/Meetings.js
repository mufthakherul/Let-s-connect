import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
    Box,
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Grid,
    MenuItem,
    FormControl,
    InputLabel,
    Select,
    Alert,
    Chip,
    Stack
} from '@mui/material';
import api from '../utils/api';

const MODE_OPTIONS = [
    { value: 'standard', label: 'Standard' },
    { value: 'debate', label: 'Debate' },
    { value: 'round_table', label: 'Round Table' },
    { value: 'court', label: 'Virtual Court' },
    { value: 'workshop', label: 'Workshop' },
    { value: 'town_hall', label: 'Town Hall' },
    { value: 'conference', label: 'Conference' },
    { value: 'quiz', label: 'Quiz' },
    { value: 'custom', label: 'Custom' }
];

function Meetings({ user }) {
    const navigate = useNavigate();
    const [meetings, setMeetings] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [form, setForm] = useState({
        title: '',
        description: '',
        mode: 'standard',
        scheduledAt: '',
        durationMinutes: 30,
        allowGuests: true
    });
    const [guestForm, setGuestForm] = useState({
        meetingId: '',
        accessCode: '',
        name: '',
        email: ''
    });

    useEffect(() => {
        if (user) {
            loadMeetings();
        }
    }, [user]);

    const loadMeetings = async () => {
        try {
            setLoading(true);
            const response = await api.get('/collaboration/meetings');
            setMeetings(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load meetings');
        } finally {
            setLoading(false);
        }
    };

    const handleFormChange = (e) => {
        setForm({ ...form, [e.target.name]: e.target.value });
    };

    const handleGuestChange = (e) => {
        setGuestForm({ ...guestForm, [e.target.name]: e.target.value });
    };

    const createMeeting = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const payload = {
                ...form,
                scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null,
                durationMinutes: Number(form.durationMinutes)
            };
            await api.post('/collaboration/meetings', payload);
            setSuccess('Meeting created');
            setForm({
                title: '',
                description: '',
                mode: 'standard',
                scheduledAt: '',
                durationMinutes: 30,
                allowGuests: true
            });
            loadMeetings();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to create meeting');
        }
    };

    const joinMeeting = async (meetingId) => {
        setError('');
        setSuccess('');

        try {
            await api.post(`/collaboration/meetings/${meetingId}/join`);
            setSuccess('Joined meeting');
            loadMeetings();
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to join meeting');
        }
    };

    const joinAsGuest = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');

        try {
            const response = await api.post('/collaboration/meetings/public/join', {
                meetingId: guestForm.meetingId,
                accessCode: guestForm.accessCode,
                name: guestForm.name,
                email: guestForm.email
            });

            setSuccess(`Joined ${response.data.meeting?.title || 'meeting'} as guest`);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to join meeting');
        }
    };

    const openGuestLobby = () => {
        if (!guestForm.meetingId || !guestForm.accessCode) {
            setError('Meeting ID and access code are required to view the lobby');
            return;
        }

        const code = encodeURIComponent(guestForm.accessCode);
        navigate(`/meetings/guest/${guestForm.meetingId}?accessCode=${code}`);
    };

    return (
        <Box sx={{ maxWidth: 900, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                Meetings
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            {!user && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Join as Guest
                        </Typography>
                        <Box component="form" onSubmit={joinAsGuest}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Meeting ID"
                                        name="meetingId"
                                        value={guestForm.meetingId}
                                        onChange={handleGuestChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Access Code"
                                        name="accessCode"
                                        value={guestForm.accessCode}
                                        onChange={handleGuestChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Your Name"
                                        name="name"
                                        value={guestForm.name}
                                        onChange={handleGuestChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Email"
                                        name="email"
                                        type="email"
                                        value={guestForm.email}
                                        onChange={handleGuestChange}
                                        required
                                    />
                                </Grid>
                            </Grid>
                            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
                                Join Meeting
                            </Button>
                            <Button
                                type="button"
                                variant="outlined"
                                sx={{ mt: 2, ml: 2 }}
                                onClick={openGuestLobby}
                            >
                                View Lobby
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {user && (
                <Card sx={{ mb: 4 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Schedule a Meeting
                        </Typography>
                        <Box component="form" onSubmit={createMeeting}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        label="Title"
                                        name="title"
                                        value={form.title}
                                        onChange={handleFormChange}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Mode</InputLabel>
                                        <Select
                                            name="mode"
                                            label="Mode"
                                            value={form.mode}
                                            onChange={handleFormChange}
                                        >
                                            {MODE_OPTIONS.map((option) => (
                                                <MenuItem key={option.value} value={option.value}>
                                                    {option.label}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        label="Scheduled At"
                                        name="scheduledAt"
                                        value={form.scheduledAt}
                                        onChange={handleFormChange}
                                        InputLabelProps={{ shrink: true }}
                                    />
                                </Grid>
                                <Grid item xs={12} sm={6}>
                                    <TextField
                                        fullWidth
                                        type="number"
                                        label="Duration (minutes)"
                                        name="durationMinutes"
                                        value={form.durationMinutes}
                                        onChange={handleFormChange}
                                        inputProps={{ min: 15, max: 240 }}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Description"
                                        name="description"
                                        value={form.description}
                                        onChange={handleFormChange}
                                        multiline
                                        rows={3}
                                    />
                                </Grid>
                            </Grid>
                            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
                                Create Meeting
                            </Button>
                        </Box>
                    </CardContent>
                </Card>
            )}

            {user && (
                <Box>
                    <Typography variant="h6" gutterBottom>
                        Your Meetings
                    </Typography>
                    {loading && <Typography>Loading...</Typography>}
                    {!loading && meetings.length === 0 && (
                        <Typography color="text.secondary">No meetings yet.</Typography>
                    )}
                    <Grid container spacing={2}>
                        {meetings.map((meeting) => (
                            <Grid item xs={12} key={meeting.id}>
                                <Card>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={2}>
                                            <Box>
                                                <Typography variant="h6">{meeting.title}</Typography>
                                                <Typography color="text.secondary" variant="body2">
                                                    Mode: {meeting.mode} | Status: {meeting.status}
                                                </Typography>
                                                {meeting.scheduledAt && (
                                                    <Typography color="text.secondary" variant="body2">
                                                        Scheduled: {new Date(meeting.scheduledAt).toLocaleString()}
                                                    </Typography>
                                                )}
                                            </Box>
                                            <Stack direction="row" spacing={1}>
                                                <Button variant="outlined" onClick={() => joinMeeting(meeting.id)}>
                                                    Join
                                                </Button>
                                                <Button
                                                    variant="contained"
                                                    component={Link}
                                                    to={`/meetings/${meeting.id}`}
                                                >
                                                    Open
                                                </Button>
                                            </Stack>
                                        </Stack>
                                        <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                                            <Chip label={`Meeting ID: ${meeting.id}`} />
                                            <Chip label={`Access Code: ${meeting.accessCode}`} />
                                            <Chip label={`Guests: ${meeting.allowGuests ? 'Allowed' : 'No'}`} />
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}
        </Box>
    );
}

export default Meetings;
