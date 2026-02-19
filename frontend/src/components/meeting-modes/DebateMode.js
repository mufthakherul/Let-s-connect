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
    LinearProgress,
    MenuItem,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import api from '../../utils/api';

function DebateMode({ meetingId, user }) {
    const [evidence, setEvidence] = useState([]);
    const [debateArguments, setDebateArguments] = useState([]);
    const [votes, setVotes] = useState({ votes: [], results: { pro: 0, con: 0, tie: 0, total: 0 } });
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [evidenceForm, setEvidenceForm] = useState({
        side: 'pro',
        title: '',
        content: '',
        sourceUrl: '',
        sourceType: 'article',
        credibilityScore: 5
    });

    const [argumentForm, setArgumentForm] = useState({
        side: 'pro',
        roundNumber: 1,
        argumentType: 'opening',
        content: '',
        evidenceIds: []
    });

    const [voteForm, setVoteForm] = useState({
        winningSide: 'pro',
        reasoning: ''
    });

    useEffect(() => {
        if (meetingId) {
            loadDebateData();
        }
    }, [meetingId]);

    const loadDebateData = async () => {
        try {
            const [evidenceRes, argumentsRes, votesRes] = await Promise.all([
                api.get(`/collaboration/meetings/${meetingId}/debate/evidence`),
                api.get(`/collaboration/meetings/${meetingId}/debate/arguments`),
                api.get(`/collaboration/meetings/${meetingId}/debate/votes`)
            ]);
            setEvidence(evidenceRes.data || []);
            setDebateArguments(argumentsRes.data || []);
            setVotes(votesRes.data || { votes: [], results: { pro: 0, con: 0, tie: 0, total: 0 } });
        } catch (err) {
            console.error(err);
            setError('Failed to load debate data');
        }
    };

    const submitEvidence = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/debate/evidence`, evidenceForm);
            setSuccess('Evidence submitted');
            setEvidenceForm({
                side: 'pro',
                title: '',
                content: '',
                sourceUrl: '',
                sourceType: 'article',
                credibilityScore: 5
            });
            loadDebateData();
        } catch (err) {
            console.error(err);
            setError('Failed to submit evidence');
        }
    };

    const submitArgument = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/debate/arguments`, argumentForm);
            setSuccess('Argument submitted');
            setArgumentForm({
                side: 'pro',
                roundNumber: 1,
                argumentType: 'opening',
                content: '',
                evidenceIds: []
            });
            loadDebateData();
        } catch (err) {
            console.error(err);
            setError('Failed to submit argument');
        }
    };

    const submitVote = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/debate/vote`, voteForm);
            setSuccess('Vote submitted');
            setVoteForm({ winningSide: 'pro', reasoning: '' });
            loadDebateData();
        } catch (err) {
            console.error(err);
            setError('Failed to submit vote');
        }
    };

    const proEvidence = evidence.filter(e => e.side === 'pro');
    const conEvidence = evidence.filter(e => e.side === 'con');
    const proArguments = debateArguments.filter(a => a.side === 'pro');
    const conArguments = debateArguments.filter(a => a.side === 'con');

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Debate Mode</Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Evidence" />
                <Tab label="Arguments" />
                <Tab label="Voting" />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Submit Evidence</Typography>
                                <form onSubmit={submitEvidence}>
                                    <Stack spacing={2}>
                                        <FormControl fullWidth>
                                            <InputLabel>Side</InputLabel>
                                            <Select
                                                value={evidenceForm.side}
                                                label="Side"
                                                onChange={(e) => setEvidenceForm({ ...evidenceForm, side: e.target.value })}
                                            >
                                                <MenuItem value="pro">Pro</MenuItem>
                                                <MenuItem value="con">Con</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Title"
                                            value={evidenceForm.title}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Content"
                                            multiline
                                            rows={4}
                                            value={evidenceForm.content}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, content: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Source URL"
                                            value={evidenceForm.sourceUrl}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, sourceUrl: e.target.value })}
                                        />
                                        <FormControl fullWidth>
                                            <InputLabel>Source Type</InputLabel>
                                            <Select
                                                value={evidenceForm.sourceType}
                                                label="Source Type"
                                                onChange={(e) => setEvidenceForm({ ...evidenceForm, sourceType: e.target.value })}
                                            >
                                                <MenuItem value="article">Article</MenuItem>
                                                <MenuItem value="study">Study</MenuItem>
                                                <MenuItem value="expert">Expert</MenuItem>
                                                <MenuItem value="data">Data</MenuItem>
                                                <MenuItem value="other">Other</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <Button type="submit" variant="contained">Submit Evidence</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Pro Evidence ({proEvidence.length})</Typography>
                                <Stack spacing={1}>
                                    {proEvidence.map((ev) => (
                                        <Card key={ev.id} variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle2">{ev.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">{ev.content}</Typography>
                                                {ev.sourceUrl && (
                                                    <Typography variant="caption">
                                                        <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
                                                    </Typography>
                                                )}
                                                <Chip label={ev.sourceType} size="small" sx={{ mt: 1 }} />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Con Evidence ({conEvidence.length})</Typography>
                                <Stack spacing={1}>
                                    {conEvidence.map((ev) => (
                                        <Card key={ev.id} variant="outlined">
                                            <CardContent>
                                                <Typography variant="subtitle2">{ev.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">{ev.content}</Typography>
                                                {ev.sourceUrl && (
                                                    <Typography variant="caption">
                                                        <a href={ev.sourceUrl} target="_blank" rel="noopener noreferrer">Source</a>
                                                    </Typography>
                                                )}
                                                <Chip label={ev.sourceType} size="small" sx={{ mt: 1 }} />
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {activeTab === 1 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Submit Argument</Typography>
                                <form onSubmit={submitArgument}>
                                    <Stack spacing={2}>
                                        <FormControl fullWidth>
                                            <InputLabel>Side</InputLabel>
                                            <Select
                                                value={argumentForm.side}
                                                label="Side"
                                                onChange={(e) => setArgumentForm({ ...argumentForm, side: e.target.value })}
                                            >
                                                <MenuItem value="pro">Pro</MenuItem>
                                                <MenuItem value="con">Con</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Round Number"
                                            type="number"
                                            value={argumentForm.roundNumber}
                                            onChange={(e) => setArgumentForm({ ...argumentForm, roundNumber: parseInt(e.target.value) })}
                                            required
                                        />
                                        <FormControl fullWidth>
                                            <InputLabel>Type</InputLabel>
                                            <Select
                                                value={argumentForm.argumentType}
                                                label="Type"
                                                onChange={(e) => setArgumentForm({ ...argumentForm, argumentType: e.target.value })}
                                            >
                                                <MenuItem value="opening">Opening</MenuItem>
                                                <MenuItem value="rebuttal">Rebuttal</MenuItem>
                                                <MenuItem value="closing">Closing</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Argument"
                                            multiline
                                            rows={6}
                                            value={argumentForm.content}
                                            onChange={(e) => setArgumentForm({ ...argumentForm, content: e.target.value })}
                                            required
                                        />
                                        <Button type="submit" variant="contained">Submit Argument</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Pro Arguments ({proArguments.length})</Typography>
                                <Stack spacing={1}>
                                    {proArguments.map((arg) => (
                                        <Card key={arg.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    <Chip label={`Round ${arg.roundNumber}`} size="small" />
                                                    <Chip label={arg.argumentType} size="small" color="primary" />
                                                </Stack>
                                                <Typography variant="body2">{arg.content}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(arg.timestamp).toLocaleString()}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Con Arguments ({conArguments.length})</Typography>
                                <Stack spacing={1}>
                                    {conArguments.map((arg) => (
                                        <Card key={arg.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    <Chip label={`Round ${arg.roundNumber}`} size="small" />
                                                    <Chip label={arg.argumentType} size="small" color="secondary" />
                                                </Stack>
                                                <Typography variant="body2">{arg.content}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(arg.timestamp).toLocaleString()}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}

            {activeTab === 2 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Cast Your Vote</Typography>
                                <form onSubmit={submitVote}>
                                    <Stack spacing={2}>
                                        <FormControl fullWidth>
                                            <InputLabel>Winning Side</InputLabel>
                                            <Select
                                                value={voteForm.winningSide}
                                                label="Winning Side"
                                                onChange={(e) => setVoteForm({ ...voteForm, winningSide: e.target.value })}
                                            >
                                                <MenuItem value="pro">Pro</MenuItem>
                                                <MenuItem value="con">Con</MenuItem>
                                                <MenuItem value="tie">Tie</MenuItem>
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Reasoning"
                                            multiline
                                            rows={4}
                                            value={voteForm.reasoning}
                                            onChange={(e) => setVoteForm({ ...voteForm, reasoning: e.target.value })}
                                            required
                                        />
                                        <Button type="submit" variant="contained">Submit Vote</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Vote Results</Typography>
                                <Stack spacing={2}>
                                    <Box>
                                        <Typography variant="body2">Pro: {votes.results.pro} votes</Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={votes.results.total > 0 ? (votes.results.pro / votes.results.total) * 100 : 0}
                                            color="primary"
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2">Con: {votes.results.con} votes</Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={votes.results.total > 0 ? (votes.results.con / votes.results.total) * 100 : 0}
                                            color="secondary"
                                        />
                                    </Box>
                                    <Box>
                                        <Typography variant="body2">Tie: {votes.results.tie} votes</Typography>
                                        <LinearProgress
                                            variant="determinate"
                                            value={votes.results.total > 0 ? (votes.results.tie / votes.results.total) * 100 : 0}
                                            color="info"
                                        />
                                    </Box>
                                    <Typography variant="h6">Total Votes: {votes.results.total}</Typography>
                                </Stack>
                            </CardContent>
                        </Card>
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Individual Votes</Typography>
                                <Stack spacing={1}>
                                    {votes.votes.map((vote) => (
                                        <Card key={vote.id} variant="outlined">
                                            <CardContent>
                                                <Chip
                                                    label={vote.winningSide === 'pro' ? 'Pro' : vote.winningSide === 'con' ? 'Con' : 'Tie'}
                                                    color={vote.winningSide === 'pro' ? 'primary' : vote.winningSide === 'con' ? 'secondary' : 'default'}
                                                    size="small"
                                                />
                                                <Typography variant="body2" sx={{ mt: 1 }}>{vote.reasoning}</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    {new Date(vote.votedAt).toLocaleString()}
                                                </Typography>
                                            </CardContent>
                                        </Card>
                                    ))}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

export default DebateMode;
