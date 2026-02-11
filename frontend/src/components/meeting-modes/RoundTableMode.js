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

function RoundTableMode({ meetingId, user }) {
    const [topics, setTopics] = useState([]);
    const [turns, setTurns] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [topicForm, setTopicForm] = useState({
        title: '',
        description: '',
        orderIndex: 0
    });

    const [turnForm, setTurnForm] = useState({
        participantId: user?.id || '',
        roundNumber: 1,
        orderIndex: 0,
        topicId: '',
        allocatedSeconds: 120,
        content: ''
    });

    useEffect(() => {
        if (meetingId) {
            loadRoundTableData();
        }
    }, [meetingId]);

    const loadRoundTableData = async () => {
        try {
            const [topicsRes, turnsRes] = await Promise.all([
                api.get(`/collaboration/meetings/${meetingId}/roundtable/topics`),
                api.get(`/collaboration/meetings/${meetingId}/roundtable/turns`)
            ]);
            setTopics(topicsRes.data || []);
            setTurns(turnsRes.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load round table data');
        }
    };

    const submitTopic = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/roundtable/topics`, topicForm);
            setSuccess('Topic added');
            setTopicForm({ title: '', description: '', orderIndex: topics.length });
            loadRoundTableData();
        } catch (err) {
            console.error(err);
            setError('Failed to add topic');
        }
    };

    const updateTopicStatus = async (topicId, status, consensusLevel) => {
        setError('');
        try {
            await api.put(`/collaboration/meetings/${meetingId}/roundtable/topics/${topicId}`, {
                status,
                consensusLevel
            });
            setSuccess('Topic updated');
            loadRoundTableData();
        } catch (err) {
            console.error(err);
            setError('Failed to update topic');
        }
    };

    const startTurn = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/roundtable/turns`, {
                ...turnForm,
                participantId: user.id
            });
            setSuccess('Turn started');
            setTurnForm({
                participantId: user?.id || '',
                roundNumber: 1,
                orderIndex: turns.length,
                topicId: '',
                allocatedSeconds: 120,
                content: ''
            });
            loadRoundTableData();
        } catch (err) {
            console.error(err);
            setError('Failed to start turn');
        }
    };

    const endTurn = async (turnId, usedSeconds, content) => {
        setError('');
        try {
            await api.put(`/collaboration/meetings/${meetingId}/roundtable/turns/${turnId}`, {
                endedAt: new Date().toISOString(),
                usedSeconds,
                content
            });
            setSuccess('Turn ended');
            loadRoundTableData();
        } catch (err) {
            console.error(err);
            setError('Failed to end turn');
        }
    };

    const calculateTimeStats = () => {
        const participantTime = {};
        turns.forEach(turn => {
            if (!participantTime[turn.participantId]) {
                participantTime[turn.participantId] = { 
                    allocated: 0, 
                    used: 0, 
                    turns: 0 
                };
            }
            participantTime[turn.participantId].allocated += turn.allocatedSeconds || 0;
            participantTime[turn.participantId].used += turn.usedSeconds || 0;
            participantTime[turn.participantId].turns += 1;
        });
        return participantTime;
    };

    const timeStats = calculateTimeStats();
    const pendingTopics = topics.filter(t => t.status === 'pending');
    const activeTopics = topics.filter(t => t.status === 'active');
    const completedTopics = topics.filter(t => t.status === 'completed');

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Round Table Mode</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Equal time allocation with speaking order and consensus tracking
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Topics" />
                <Tab label="Speaking Turns" />
                <Tab label="Time Fairness" />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Add Topic</Typography>
                                <form onSubmit={submitTopic}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Topic Title"
                                            value={topicForm.title}
                                            onChange={(e) => setTopicForm({ ...topicForm, title: e.target.value })}
                                            required
                                            fullWidth
                                        />
                                        <TextField
                                            label="Description"
                                            multiline
                                            rows={3}
                                            value={topicForm.description}
                                            onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                                            fullWidth
                                        />
                                        <TextField
                                            label="Order"
                                            type="number"
                                            value={topicForm.orderIndex}
                                            onChange={(e) => setTopicForm({ ...topicForm, orderIndex: parseInt(e.target.value) })}
                                            fullWidth
                                        />
                                        <Button type="submit" variant="contained">Add Topic</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Stack spacing={2}>
                            {activeTopics.length > 0 && (
                                <Card>
                                    <CardContent>
                                        <Typography variant="h6" gutterBottom color="primary">
                                            Active Topics ({activeTopics.length})
                                        </Typography>
                                        <Stack spacing={1}>
                                            {activeTopics.map((topic) => (
                                                <Card key={topic.id} variant="outlined" sx={{ bgcolor: 'action.hover' }}>
                                                    <CardContent>
                                                        <Typography variant="subtitle1">{topic.title}</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {topic.description}
                                                        </Typography>
                                                        <Box sx={{ mt: 1 }}>
                                                            <Typography variant="caption">
                                                                Consensus: {((topic.consensusLevel || 0) * 100).toFixed(0)}%
                                                            </Typography>
                                                            <LinearProgress 
                                                                variant="determinate" 
                                                                value={(topic.consensusLevel || 0) * 100}
                                                                color="success"
                                                                sx={{ mt: 0.5 }}
                                                            />
                                                        </Box>
                                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                            <Button 
                                                                size="small" 
                                                                onClick={() => updateTopicStatus(topic.id, 'completed', topic.consensusLevel)}
                                                            >
                                                                Mark Complete
                                                            </Button>
                                                            <TextField
                                                                size="small"
                                                                type="number"
                                                                label="Consensus %"
                                                                inputProps={{ min: 0, max: 100, step: 10 }}
                                                                sx={{ width: 150 }}
                                                                onChange={(e) => {
                                                                    const val = parseInt(e.target.value) / 100;
                                                                    if (val >= 0 && val <= 1) {
                                                                        updateTopicStatus(topic.id, topic.status, val);
                                                                    }
                                                                }}
                                                            />
                                                        </Stack>
                                                    </CardContent>
                                                </Card>
                                            ))}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            )}
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>
                                        Pending Topics ({pendingTopics.length})
                                    </Typography>
                                    <Stack spacing={1}>
                                        {pendingTopics.map((topic) => (
                                            <Card key={topic.id} variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle1">{topic.title}</Typography>
                                                    <Typography variant="body2" color="text.secondary">
                                                        {topic.description}
                                                    </Typography>
                                                    <Button 
                                                        size="small" 
                                                        variant="contained"
                                                        sx={{ mt: 1 }}
                                                        onClick={() => updateTopicStatus(topic.id, 'active', 0)}
                                                    >
                                                        Start Discussion
                                                    </Button>
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom color="success.main">
                                        Completed Topics ({completedTopics.length})
                                    </Typography>
                                    <Stack spacing={1}>
                                        {completedTopics.map((topic) => (
                                            <Card key={topic.id} variant="outlined">
                                                <CardContent>
                                                    <Typography variant="subtitle1">{topic.title}</Typography>
                                                    <Chip 
                                                        label={`Consensus: ${((topic.consensusLevel || 0) * 100).toFixed(0)}%`}
                                                        color="success"
                                                        size="small"
                                                        sx={{ mt: 1 }}
                                                    />
                                                </CardContent>
                                            </Card>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Stack>
                    </Grid>
                </Grid>
            )}

            {activeTab === 1 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Start Speaking Turn</Typography>
                                <form onSubmit={startTurn}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Round Number"
                                            type="number"
                                            value={turnForm.roundNumber}
                                            onChange={(e) => setTurnForm({ ...turnForm, roundNumber: parseInt(e.target.value) })}
                                            required
                                            fullWidth
                                        />
                                        <FormControl fullWidth>
                                            <InputLabel>Topic</InputLabel>
                                            <Select
                                                value={turnForm.topicId}
                                                label="Topic"
                                                onChange={(e) => setTurnForm({ ...turnForm, topicId: e.target.value })}
                                            >
                                                <MenuItem value="">None</MenuItem>
                                                {topics.map(topic => (
                                                    <MenuItem key={topic.id} value={topic.id}>{topic.title}</MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                        <TextField
                                            label="Allocated Time (seconds)"
                                            type="number"
                                            value={turnForm.allocatedSeconds}
                                            onChange={(e) => setTurnForm({ ...turnForm, allocatedSeconds: parseInt(e.target.value) })}
                                            required
                                            fullWidth
                                        />
                                        <TextField
                                            label="Notes/Content"
                                            multiline
                                            rows={4}
                                            value={turnForm.content}
                                            onChange={(e) => setTurnForm({ ...turnForm, content: e.target.value })}
                                            fullWidth
                                        />
                                        <Button type="submit" variant="contained">Start Turn</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Speaking Turns History</Typography>
                                <Stack spacing={1}>
                                    {turns.map((turn) => (
                                        <Card key={turn.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    <Chip label={`Round ${turn.roundNumber}`} size="small" />
                                                    <Chip label={`Order: ${turn.orderIndex}`} size="small" />
                                                    {turn.endedAt && (
                                                        <Chip 
                                                            label={`Used: ${turn.usedSeconds}s / ${turn.allocatedSeconds}s`}
                                                            color={turn.usedSeconds <= turn.allocatedSeconds ? 'success' : 'warning'}
                                                            size="small"
                                                        />
                                                    )}
                                                </Stack>
                                                {turn.content && (
                                                    <Typography variant="body2">{turn.content}</Typography>
                                                )}
                                                {!turn.endedAt && (
                                                    <Button 
                                                        size="small" 
                                                        variant="outlined"
                                                        sx={{ mt: 1 }}
                                                        onClick={() => {
                                                            const used = Math.floor((new Date() - new Date(turn.startedAt)) / 1000);
                                                            endTurn(turn.id, used, turn.content);
                                                        }}
                                                    >
                                                        End Turn
                                                    </Button>
                                                )}
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
                    <Grid item xs={12}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Time Fairness Meter</Typography>
                                <Typography variant="body2" color="text.secondary" gutterBottom>
                                    Track how speaking time is distributed among participants
                                </Typography>
                                <Stack spacing={2} sx={{ mt: 2 }}>
                                    {Object.entries(timeStats).map(([participantId, stats]) => (
                                        <Box key={participantId}>
                                            <Stack direction="row" justifyContent="space-between" alignItems="center">
                                                <Typography variant="subtitle2">
                                                    Participant {participantId.substring(0, 8)}
                                                </Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {stats.turns} turns • {stats.used}s used / {stats.allocated}s allocated
                                                </Typography>
                                            </Stack>
                                            <LinearProgress
                                                variant="determinate"
                                                value={stats.allocated > 0 ? (stats.used / stats.allocated) * 100 : 0}
                                                color={stats.used <= stats.allocated ? 'primary' : 'warning'}
                                                sx={{ mt: 0.5 }}
                                            />
                                            <Typography variant="caption" color="text.secondary">
                                                {stats.allocated > 0 ? ((stats.used / stats.allocated) * 100).toFixed(1) : 0}% of allocated time used
                                            </Typography>
                                        </Box>
                                    ))}
                                    {Object.keys(timeStats).length === 0 && (
                                        <Alert severity="info">No speaking turns recorded yet</Alert>
                                    )}
                                </Stack>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

export default RoundTableMode;
