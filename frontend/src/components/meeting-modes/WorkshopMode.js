import React, { useEffect, useState } from 'react';
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
    TextField,
    Typography,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import api from '../../utils/api';

function WorkshopMode({ meetingId, user }) {
    const [ideas, setIdeas] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    const [ideaForm, setIdeaForm] = useState({
        title: '',
        description: '',
        category: ''
    });

    useEffect(() => {
        if (meetingId) {
            loadIdeas();
        }
    }, [meetingId]);

    const loadIdeas = async () => {
        try {
            const response = await api.get(`/collaboration/meetings/${meetingId}/workshop/ideas`);
            setIdeas(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load ideas');
        }
    };

    const submitIdea = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/workshop/ideas`, ideaForm);
            setSuccess('Idea submitted');
            setIdeaForm({ title: '', description: '', category: '' });
            loadIdeas();
        } catch (err) {
            console.error(err);
            setError('Failed to submit idea');
        }
    };

    const voteIdea = async (ideaId) => {
        setError('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/workshop/ideas/${ideaId}/vote`);
            setSuccess('Vote recorded');
            loadIdeas();
        } catch (err) {
            console.error(err);
            setError('Failed to vote');
        }
    };

    const updateIdea = async (ideaId, status, priorityScore) => {
        setError('');
        try {
            await api.put(`/collaboration/meetings/${meetingId}/workshop/ideas/${ideaId}`, {
                status,
                priorityScore
            });
            setSuccess('Idea updated');
            loadIdeas();
        } catch (err) {
            console.error(err);
            setError('Failed to update idea');
        }
    };

    const filteredIdeas = filterStatus === 'all' 
        ? ideas 
        : ideas.filter(idea => idea.status === filterStatus);

    const categories = [...new Set(ideas.map(i => i.category).filter(Boolean))];
    const proposedIdeas = ideas.filter(i => i.status === 'proposed');
    const discussingIdeas = ideas.filter(i => i.status === 'discussing');
    const acceptedIdeas = ideas.filter(i => i.status === 'accepted');
    const rejectedIdeas = ideas.filter(i => i.status === 'rejected');

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Workshop Mode</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Collaborative brainstorming with idea boards, voting, and prioritization
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Submit New Idea</Typography>
                            <form onSubmit={submitIdea}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Idea Title"
                                        value={ideaForm.title}
                                        onChange={(e) => setIdeaForm({ ...ideaForm, title: e.target.value })}
                                        required
                                        fullWidth
                                    />
                                    <TextField
                                        label="Description"
                                        multiline
                                        rows={4}
                                        value={ideaForm.description}
                                        onChange={(e) => setIdeaForm({ ...ideaForm, description: e.target.value })}
                                        required
                                        fullWidth
                                    />
                                    <FormControl fullWidth>
                                        <InputLabel>Category</InputLabel>
                                        <Select
                                            value={ideaForm.category}
                                            label="Category"
                                            onChange={(e) => setIdeaForm({ ...ideaForm, category: e.target.value })}
                                        >
                                            <MenuItem value="">None</MenuItem>
                                            <MenuItem value="feature">Feature</MenuItem>
                                            <MenuItem value="improvement">Improvement</MenuItem>
                                            <MenuItem value="process">Process</MenuItem>
                                            <MenuItem value="innovation">Innovation</MenuItem>
                                            <MenuItem value="cost-saving">Cost Saving</MenuItem>
                                            <MenuItem value="other">Other</MenuItem>
                                            {categories.map(cat => (
                                                <MenuItem key={cat} value={cat}>{cat}</MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                    <Button type="submit" variant="contained">Submit Idea</Button>
                                </Stack>
                            </form>

                            <Box sx={{ mt: 3 }}>
                                <Typography variant="h6" gutterBottom>Workshop Statistics</Typography>
                                <Stack spacing={1}>
                                    <Box>
                                        <Chip label={`${proposedIdeas.length} Proposed`} color="default" size="small" />
                                        <Chip label={`${discussingIdeas.length} Discussing`} color="primary" size="small" sx={{ ml: 1 }} />
                                    </Box>
                                    <Box>
                                        <Chip label={`${acceptedIdeas.length} Accepted`} color="success" size="small" />
                                        <Chip label={`${rejectedIdeas.length} Rejected`} color="error" size="small" sx={{ ml: 1 }} />
                                    </Box>
                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                        Total Ideas: {ideas.length}
                                    </Typography>
                                </Stack>
                            </Box>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Stack direction="row" spacing={1} alignItems="center">
                                <Typography variant="h6">Idea Board</Typography>
                                <FormControl size="small" sx={{ minWidth: 150, ml: 'auto' }}>
                                    <InputLabel>Filter by Status</InputLabel>
                                    <Select
                                        value={filterStatus}
                                        label="Filter by Status"
                                        onChange={(e) => setFilterStatus(e.target.value)}
                                    >
                                        <MenuItem value="all">All Ideas</MenuItem>
                                        <MenuItem value="proposed">Proposed</MenuItem>
                                        <MenuItem value="discussing">Discussing</MenuItem>
                                        <MenuItem value="accepted">Accepted</MenuItem>
                                        <MenuItem value="rejected">Rejected</MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Stack spacing={2}>
                        {filteredIdeas.length === 0 && (
                            <Alert severity="info">No ideas yet. Submit the first one!</Alert>
                        )}
                        {filteredIdeas.map((idea) => (
                            <Card key={idea.id} variant="outlined">
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                                                <Typography variant="h6">{idea.title}</Typography>
                                                {idea.category && (
                                                    <Chip label={idea.category} size="small" variant="outlined" />
                                                )}
                                            </Stack>
                                            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                                                {idea.description}
                                            </Typography>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Button
                                                    size="small"
                                                    startIcon={<ThumbUpIcon />}
                                                    onClick={() => voteIdea(idea.id)}
                                                    variant="outlined"
                                                >
                                                    Vote ({idea.votes})
                                                </Button>
                                                <Chip 
                                                    label={`Priority: ${idea.priorityScore?.toFixed(1) || 0}`}
                                                    size="small"
                                                    color={idea.priorityScore > 5 ? 'success' : 'default'}
                                                />
                                                <Chip
                                                    label={idea.status}
                                                    size="small"
                                                    color={
                                                        idea.status === 'accepted' ? 'success' :
                                                        idea.status === 'rejected' ? 'error' :
                                                        idea.status === 'discussing' ? 'primary' : 'default'
                                                    }
                                                />
                                            </Stack>
                                        </Box>
                                        <Box sx={{ ml: 2 }}>
                                            <Stack spacing={1}>
                                                {idea.status === 'proposed' && (
                                                    <Button
                                                        size="small"
                                                        variant="contained"
                                                        onClick={() => updateIdea(idea.id, 'discussing', idea.priorityScore)}
                                                    >
                                                        Discuss
                                                    </Button>
                                                )}
                                                {idea.status === 'discussing' && (
                                                    <>
                                                        <Button
                                                            size="small"
                                                            variant="contained"
                                                            color="success"
                                                            onClick={() => updateIdea(idea.id, 'accepted', idea.priorityScore)}
                                                        >
                                                            Accept
                                                        </Button>
                                                        <Button
                                                            size="small"
                                                            variant="outlined"
                                                            color="error"
                                                            onClick={() => updateIdea(idea.id, 'rejected', idea.priorityScore)}
                                                        >
                                                            Reject
                                                        </Button>
                                                    </>
                                                )}
                                                {(idea.status === 'discussing' || idea.status === 'proposed') && (
                                                    <TextField
                                                        size="small"
                                                        type="number"
                                                        label="Priority"
                                                        inputProps={{ min: 0, max: 10, step: 0.5 }}
                                                        sx={{ width: 100 }}
                                                        defaultValue={idea.priorityScore || 0}
                                                        onBlur={(e) => {
                                                            const val = parseFloat(e.target.value);
                                                            if (val >= 0 && val <= 10) {
                                                                updateIdea(idea.id, idea.status, val);
                                                            }
                                                        }}
                                                    />
                                                )}
                                            </Stack>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Grid>
            </Grid>

            <Card sx={{ mt: 3 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>Top Voted Ideas</Typography>
                    <Grid container spacing={2}>
                        {ideas
                            .sort((a, b) => b.votes - a.votes)
                            .slice(0, 5)
                            .map((idea, index) => (
                                <Grid item xs={12} md={6} key={idea.id}>
                                    <Card variant="outlined">
                                        <CardContent>
                                            <Stack direction="row" spacing={1} alignItems="center">
                                                <Chip 
                                                    label={`#${index + 1}`} 
                                                    color="primary" 
                                                    size="small"
                                                />
                                                <Typography variant="subtitle1">{idea.title}</Typography>
                                            </Stack>
                                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                <Chip label={`${idea.votes} votes`} size="small" />
                                                <Chip label={idea.status} size="small" variant="outlined" />
                                                {idea.category && (
                                                    <Chip label={idea.category} size="small" variant="outlined" />
                                                )}
                                            </Stack>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                    </Grid>
                </CardContent>
            </Card>
        </Box>
    );
}

export default WorkshopMode;
