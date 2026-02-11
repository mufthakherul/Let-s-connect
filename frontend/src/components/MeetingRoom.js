import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    FormControl,
    Grid,
    InputLabel,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import api from '../utils/api';
import DebateMode from './meeting-modes/DebateMode';
import RoundTableMode from './meeting-modes/RoundTableMode';
import WorkshopMode from './meeting-modes/WorkshopMode';
import TownHallMode from './meeting-modes/TownHallMode';
import { CourtMode, ConferenceMode, QuizMode } from './meeting-modes/OtherModes';

const AGENDA_STATUS_OPTIONS = ['planned', 'in_progress', 'completed'];
const ACTION_STATUS_OPTIONS = ['open', 'in_progress', 'blocked', 'done'];

const toDateTimeLocal = (value) => {
    if (!value) return '';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '';
    const pad = (num) => String(num).padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

function MeetingRoom({ user }) {
    const { id } = useParams();
    const [meeting, setMeeting] = useState(null);
    const [agenda, setAgenda] = useState([]);
    const [notes, setNotes] = useState([]);
    const [actions, setActions] = useState([]);
    const [decisions, setDecisions] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    const [agendaForm, setAgendaForm] = useState({
        title: '',
        description: '',
        orderIndex: 0,
        status: 'planned',
    });
    const [editingAgendaId, setEditingAgendaId] = useState(null);

    const [noteForm, setNoteForm] = useState({
        content: '',
        isPublic: true,
        pinned: false,
    });
    const [editingNoteId, setEditingNoteId] = useState(null);

    const [actionForm, setActionForm] = useState({
        title: '',
        description: '',
        assigneeId: '',
        dueDate: '',
        status: 'open',
    });
    const [editingActionId, setEditingActionId] = useState(null);

    const [decisionForm, setDecisionForm] = useState({
        title: '',
        summary: '',
        decidedAt: '',
    });

    useEffect(() => {
        if (user && id) {
            loadMeetingData();
        }
    }, [user, id]);

    const loadMeetingData = async () => {
        try {
            setLoading(true);
            setError('');
            const [meetingResponse, agendaResponse, notesResponse, actionsResponse, decisionsResponse] = await Promise.all([
                api.get(`/collaboration/meetings/${id}`),
                api.get(`/collaboration/meetings/${id}/agenda`),
                api.get(`/collaboration/meetings/${id}/notes`),
                api.get(`/collaboration/meetings/${id}/actions`),
                api.get(`/collaboration/meetings/${id}/decisions`),
            ]);

            setMeeting(meetingResponse.data);
            setAgenda(agendaResponse.data || []);
            setNotes(notesResponse.data || []);
            setActions(actionsResponse.data || []);
            setDecisions(decisionsResponse.data || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to load meeting');
        } finally {
            setLoading(false);
        }
    };

    const handleTabChange = (_, value) => setActiveTab(value);

    const handleAgendaSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (editingAgendaId) {
                await api.put(`/collaboration/meetings/${id}/agenda/${editingAgendaId}`, agendaForm);
                setSuccess('Agenda item updated');
            } else {
                await api.post(`/collaboration/meetings/${id}/agenda`, agendaForm);
                setSuccess('Agenda item added');
            }
            setAgendaForm({ title: '', description: '', orderIndex: 0, status: 'planned' });
            setEditingAgendaId(null);
            const response = await api.get(`/collaboration/meetings/${id}/agenda`);
            setAgenda(response.data || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to save agenda item');
        }
    };

    const handleAgendaEdit = (item) => {
        setAgendaForm({
            title: item.title,
            description: item.description || '',
            orderIndex: item.orderIndex || 0,
            status: item.status || 'planned',
        });
        setEditingAgendaId(item.id);
    };

    const handleAgendaDelete = async (itemId) => {
        try {
            await api.delete(`/collaboration/meetings/${id}/agenda/${itemId}`);
            setAgenda((prev) => prev.filter((item) => item.id !== itemId));
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to delete agenda item');
        }
    };

    const handleNoteSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        try {
            if (editingNoteId) {
                await api.put(`/collaboration/meetings/${id}/notes/${editingNoteId}`, noteForm);
                setSuccess('Note updated');
            } else {
                await api.post(`/collaboration/meetings/${id}/notes`, noteForm);
                setSuccess('Note added');
            }
            setNoteForm({ content: '', isPublic: true, pinned: false });
            setEditingNoteId(null);
            const response = await api.get(`/collaboration/meetings/${id}/notes`);
            setNotes(response.data || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to save note');
        }
    };

    const handleNoteEdit = (note) => {
        setNoteForm({
            content: note.content || '',
            isPublic: note.isPublic !== false,
            pinned: note.pinned === true,
        });
        setEditingNoteId(note.id);
    };

    const handleNoteDelete = async (noteId) => {
        try {
            await api.delete(`/collaboration/meetings/${id}/notes/${noteId}`);
            setNotes((prev) => prev.filter((note) => note.id !== noteId));
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to delete note');
        }
    };

    const handleActionSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        try {
            const payload = {
                ...actionForm,
                assigneeId: actionForm.assigneeId || null,
                dueDate: actionForm.dueDate ? new Date(actionForm.dueDate).toISOString() : null,
            };

            if (editingActionId) {
                await api.put(`/collaboration/meetings/${id}/actions/${editingActionId}`, payload);
                setSuccess('Action item updated');
            } else {
                await api.post(`/collaboration/meetings/${id}/actions`, payload);
                setSuccess('Action item added');
            }

            setActionForm({ title: '', description: '', assigneeId: '', dueDate: '', status: 'open' });
            setEditingActionId(null);
            const response = await api.get(`/collaboration/meetings/${id}/actions`);
            setActions(response.data || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to save action item');
        }
    };

    const handleActionEdit = (action) => {
        setActionForm({
            title: action.title || '',
            description: action.description || '',
            assigneeId: action.assigneeId || '',
            dueDate: toDateTimeLocal(action.dueDate),
            status: action.status || 'open',
        });
        setEditingActionId(action.id);
    };

    const handleActionDelete = async (actionId) => {
        try {
            await api.delete(`/collaboration/meetings/${id}/actions/${actionId}`);
            setActions((prev) => prev.filter((item) => item.id !== actionId));
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to delete action item');
        }
    };

    const handleDecisionSubmit = async (event) => {
        event.preventDefault();
        setError('');
        setSuccess('');

        try {
            const payload = {
                ...decisionForm,
                decidedAt: decisionForm.decidedAt ? new Date(decisionForm.decidedAt).toISOString() : null,
            };
            await api.post(`/collaboration/meetings/${id}/decisions`, payload);
            setSuccess('Decision added');
            setDecisionForm({ title: '', summary: '', decidedAt: '' });
            const response = await api.get(`/collaboration/meetings/${id}/decisions`);
            setDecisions(response.data || []);
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to save decision');
        }
    };

    const handleDecisionDelete = async (decisionId) => {
        try {
            await api.delete(`/collaboration/meetings/${id}/decisions/${decisionId}`);
            setDecisions((prev) => prev.filter((item) => item.id !== decisionId));
        } catch (err) {
            console.error(err);
            setError(err.response?.data?.error || 'Failed to delete decision');
        }
    };

    if (!user) {
        return (
            <Alert severity="warning">
                Please sign in to access meeting details.
            </Alert>
        );
    }

    return (
        <Box sx={{ maxWidth: 1100, mx: 'auto' }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 3 }}>
                <Box>
                    <Typography variant="h4" gutterBottom>
                        Meeting Room
                    </Typography>
                    <Typography color="text.secondary">
                        Manage standard meeting artifacts in one place.
                    </Typography>
                </Box>
                <Button component={Link} to="/meetings" variant="outlined">
                    Back to Meetings
                </Button>
            </Stack>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    {loading && <Typography>Loading...</Typography>}
                    {!loading && meeting && (
                        <Stack spacing={1}>
                            <Typography variant="h5">{meeting.title}</Typography>
                            <Typography color="text.secondary">{meeting.description || 'No description provided.'}</Typography>
                            <Stack direction="row" spacing={1} flexWrap="wrap">
                                <Chip label={`Mode: ${meeting.mode}`} />
                                <Chip label={`Status: ${meeting.status}`} />
                                {meeting.scheduledAt && (
                                    <Chip label={`Scheduled: ${new Date(meeting.scheduledAt).toLocaleString()}`} />
                                )}
                                {meeting.durationMinutes && (
                                    <Chip label={`Duration: ${meeting.durationMinutes} mins`} />
                                )}
                            </Stack>
                        </Stack>
                    )}
                </CardContent>
            </Card>

            <Card sx={{ mb: 3 }}>
                <CardContent>
                    <Tabs value={activeTab} onChange={handleTabChange} variant="scrollable" scrollButtons="auto">
                        <Tab label="Agenda" />
                        <Tab label="Notes" />
                        <Tab label="Action Items" />
                        <Tab label="Decisions" />
                        {meeting && meeting.mode !== 'standard' && <Tab label={`${meeting.mode.replace('_', ' ')} Mode`} />}
                    </Tabs>
                </CardContent>
            </Card>

            {meeting && meeting.mode === 'debate' && activeTab === 4 && (
                <DebateMode meetingId={id} user={user} />
            )}

            {meeting && meeting.mode === 'round_table' && activeTab === 4 && (
                <RoundTableMode meetingId={id} user={user} />
            )}

            {meeting && meeting.mode === 'court' && activeTab === 4 && (
                <CourtMode meetingId={id} user={user} />
            )}

            {meeting && meeting.mode === 'workshop' && activeTab === 4 && (
                <WorkshopMode meetingId={id} user={user} />
            )}

            {meeting && meeting.mode === 'town_hall' && activeTab === 4 && (
                <TownHallMode meetingId={id} user={user} />
            )}

            {meeting && meeting.mode === 'conference' && activeTab === 4 && (
                <ConferenceMode meetingId={id} user={user} />
            )}

            {meeting && meeting.mode === 'quiz' && activeTab === 4 && (
                <QuizMode meetingId={id} user={user} />
            )}

            {activeTab === 0 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Agenda Items
                        </Typography>
                        <Box component="form" onSubmit={handleAgendaSubmit} sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={5}>
                                    <TextField
                                        fullWidth
                                        label="Title"
                                        value={agendaForm.title}
                                        onChange={(event) => setAgendaForm({ ...agendaForm, title: event.target.value })}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={3}>
                                    <TextField
                                        fullWidth
                                        label="Order"
                                        type="number"
                                        inputProps={{ min: 0 }}
                                        value={agendaForm.orderIndex}
                                        onChange={(event) => setAgendaForm({ ...agendaForm, orderIndex: Number(event.target.value) })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            label="Status"
                                            value={agendaForm.status}
                                            onChange={(event) => setAgendaForm({ ...agendaForm, status: event.target.value })}
                                        >
                                            {AGENDA_STATUS_OPTIONS.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Description"
                                        multiline
                                        rows={2}
                                        value={agendaForm.description}
                                        onChange={(event) => setAgendaForm({ ...agendaForm, description: event.target.value })}
                                    />
                                </Grid>
                            </Grid>
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button type="submit" variant="contained">
                                    {editingAgendaId ? 'Update Item' : 'Add Item'}
                                </Button>
                                {editingAgendaId && (
                                    <Button
                                        variant="text"
                                        onClick={() => {
                                            setEditingAgendaId(null);
                                            setAgendaForm({ title: '', description: '', orderIndex: 0, status: 'planned' });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </Stack>
                        </Box>

                        {agenda.length === 0 && (
                            <Typography color="text.secondary">No agenda items yet.</Typography>
                        )}
                        <Stack spacing={2}>
                            {agenda.map((item) => (
                                <Card key={item.id} variant="outlined">
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" spacing={2}>
                                            <Box>
                                                <Typography variant="subtitle1">{item.title}</Typography>
                                                {item.description && (
                                                    <Typography color="text.secondary" variant="body2">
                                                        {item.description}
                                                    </Typography>
                                                )}
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                    <Chip label={`Order: ${item.orderIndex}`} size="small" />
                                                    <Chip label={`Status: ${item.status}`} size="small" />
                                                </Stack>
                                            </Box>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" onClick={() => handleAgendaEdit(item)}>Edit</Button>
                                                <Button size="small" color="error" onClick={() => handleAgendaDelete(item.id)}>Delete</Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {activeTab === 1 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Notes
                        </Typography>
                        <Box component="form" onSubmit={handleNoteSubmit} sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Note"
                                        multiline
                                        rows={3}
                                        value={noteForm.content}
                                        onChange={(event) => setNoteForm({ ...noteForm, content: event.target.value })}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Visibility</InputLabel>
                                        <Select
                                            label="Visibility"
                                            value={noteForm.isPublic ? 'public' : 'private'}
                                            onChange={(event) => setNoteForm({ ...noteForm, isPublic: event.target.value === 'public' })}
                                        >
                                            <MenuItem value="public">Public</MenuItem>
                                            <MenuItem value="private">Private</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={4}>
                                    <FormControl fullWidth>
                                        <InputLabel>Pinned</InputLabel>
                                        <Select
                                            label="Pinned"
                                            value={noteForm.pinned ? 'yes' : 'no'}
                                            onChange={(event) => setNoteForm({ ...noteForm, pinned: event.target.value === 'yes' })}
                                        >
                                            <MenuItem value="yes">Pinned</MenuItem>
                                            <MenuItem value="no">Not pinned</MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button type="submit" variant="contained">
                                    {editingNoteId ? 'Update Note' : 'Add Note'}
                                </Button>
                                {editingNoteId && (
                                    <Button
                                        variant="text"
                                        onClick={() => {
                                            setEditingNoteId(null);
                                            setNoteForm({ content: '', isPublic: true, pinned: false });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </Stack>
                        </Box>

                        {notes.length === 0 && (
                            <Typography color="text.secondary">No notes yet.</Typography>
                        )}
                        <Stack spacing={2}>
                            {notes.map((note) => (
                                <Card key={note.id} variant="outlined">
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography variant="subtitle1">{note.content}</Typography>
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                    <Chip label={note.isPublic ? 'Public' : 'Private'} size="small" />
                                                    {note.pinned && <Chip label="Pinned" size="small" color="primary" />}
                                                </Stack>
                                            </Box>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" onClick={() => handleNoteEdit(note)}>Edit</Button>
                                                <Button size="small" color="error" onClick={() => handleNoteDelete(note.id)}>Delete</Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {activeTab === 2 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Action Items
                        </Typography>
                        <Box component="form" onSubmit={handleActionSubmit} sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Title"
                                        value={actionForm.title}
                                        onChange={(event) => setActionForm({ ...actionForm, title: event.target.value })}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <FormControl fullWidth>
                                        <InputLabel>Status</InputLabel>
                                        <Select
                                            label="Status"
                                            value={actionForm.status}
                                            onChange={(event) => setActionForm({ ...actionForm, status: event.target.value })}
                                        >
                                            {ACTION_STATUS_OPTIONS.map((option) => (
                                                <MenuItem key={option} value={option}>{option}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Assignee ID"
                                        value={actionForm.assigneeId}
                                        onChange={(event) => setActionForm({ ...actionForm, assigneeId: event.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        label="Due Date"
                                        InputLabelProps={{ shrink: true }}
                                        value={actionForm.dueDate}
                                        onChange={(event) => setActionForm({ ...actionForm, dueDate: event.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Description"
                                        multiline
                                        rows={2}
                                        value={actionForm.description}
                                        onChange={(event) => setActionForm({ ...actionForm, description: event.target.value })}
                                    />
                                </Grid>
                            </Grid>
                            <Stack direction="row" spacing={1} sx={{ mt: 2 }}>
                                <Button type="submit" variant="contained">
                                    {editingActionId ? 'Update Action' : 'Add Action'}
                                </Button>
                                {editingActionId && (
                                    <Button
                                        variant="text"
                                        onClick={() => {
                                            setEditingActionId(null);
                                            setActionForm({ title: '', description: '', assigneeId: '', dueDate: '', status: 'open' });
                                        }}
                                    >
                                        Cancel
                                    </Button>
                                )}
                            </Stack>
                        </Box>

                        {actions.length === 0 && (
                            <Typography color="text.secondary">No action items yet.</Typography>
                        )}
                        <Stack spacing={2}>
                            {actions.map((item) => (
                                <Card key={item.id} variant="outlined">
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography variant="subtitle1">{item.title}</Typography>
                                                {item.description && (
                                                    <Typography color="text.secondary" variant="body2">
                                                        {item.description}
                                                    </Typography>
                                                )}
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                    <Chip label={`Status: ${item.status}`} size="small" />
                                                    {item.assigneeId && <Chip label={`Assignee: ${item.assigneeId}`} size="small" />}
                                                    {item.dueDate && (
                                                        <Chip label={`Due: ${new Date(item.dueDate).toLocaleString()}`} size="small" />
                                                    )}
                                                </Stack>
                                            </Box>
                                            <Stack direction="row" spacing={1}>
                                                <Button size="small" onClick={() => handleActionEdit(item)}>Edit</Button>
                                                <Button size="small" color="error" onClick={() => handleActionDelete(item.id)}>Delete</Button>
                                            </Stack>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </CardContent>
                </Card>
            )}

            {activeTab === 3 && (
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            Decisions
                        </Typography>
                        <Box component="form" onSubmit={handleDecisionSubmit} sx={{ mb: 3 }}>
                            <Grid container spacing={2}>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        label="Title"
                                        value={decisionForm.title}
                                        onChange={(event) => setDecisionForm({ ...decisionForm, title: event.target.value })}
                                        required
                                    />
                                </Grid>
                                <Grid item xs={12} md={6}>
                                    <TextField
                                        fullWidth
                                        type="datetime-local"
                                        label="Decided At"
                                        InputLabelProps={{ shrink: true }}
                                        value={decisionForm.decidedAt}
                                        onChange={(event) => setDecisionForm({ ...decisionForm, decidedAt: event.target.value })}
                                    />
                                </Grid>
                                <Grid item xs={12}>
                                    <TextField
                                        fullWidth
                                        label="Summary"
                                        multiline
                                        rows={3}
                                        value={decisionForm.summary}
                                        onChange={(event) => setDecisionForm({ ...decisionForm, summary: event.target.value })}
                                    />
                                </Grid>
                            </Grid>
                            <Button type="submit" variant="contained" sx={{ mt: 2 }}>
                                Add Decision
                            </Button>
                        </Box>

                        {decisions.length === 0 && (
                            <Typography color="text.secondary">No decisions yet.</Typography>
                        )}
                        <Stack spacing={2}>
                            {decisions.map((item) => (
                                <Card key={item.id} variant="outlined">
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" spacing={2}>
                                            <Box>
                                                <Typography variant="subtitle1">{item.title}</Typography>
                                                {item.summary && (
                                                    <Typography color="text.secondary" variant="body2">
                                                        {item.summary}
                                                    </Typography>
                                                )}
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                    {item.decidedAt && (
                                                        <Chip label={`Decided: ${new Date(item.decidedAt).toLocaleString()}`} size="small" />
                                                    )}
                                                    {item.decidedBy && <Chip label={`Decided by: ${item.decidedBy}`} size="small" />}
                                                </Stack>
                                            </Box>
                                            <Button size="small" color="error" onClick={() => handleDecisionDelete(item.id)}>
                                                Delete
                                            </Button>
                                        </Stack>
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

export default MeetingRoom;
