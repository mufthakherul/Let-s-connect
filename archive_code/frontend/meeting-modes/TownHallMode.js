import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Grid,
    Stack,
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import ThumbUpIcon from '@mui/icons-material/ThumbUp';
import api from '../../utils/api';

function TownHallMode({ meetingId, user }) {
    const [questions, setQuestions] = useState([]);
    const [polls, setPolls] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [questionForm, setQuestionForm] = useState({ question: '' });
    const [pollForm, setPollForm] = useState({
        question: '',
        options: ['', '']
    });

    useEffect(() => {
        if (meetingId) {
            loadTownHallData();
        }
    }, [meetingId]);

    const loadTownHallData = async () => {
        try {
            const [questionsRes, pollsRes] = await Promise.all([
                api.get(`/collaboration/meetings/${meetingId}/townhall/questions`),
                api.get(`/collaboration/meetings/${meetingId}/townhall/polls`)
            ]);
            setQuestions(questionsRes.data || []);
            setPolls(pollsRes.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load town hall data');
        }
    };

    const submitQuestion = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/townhall/questions`, questionForm);
            setSuccess('Question submitted');
            setQuestionForm({ question: '' });
            loadTownHallData();
        } catch (err) {
            console.error(err);
            setError('Failed to submit question');
        }
    };

    const upvoteQuestion = async (questionId) => {
        setError('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/townhall/questions/${questionId}/upvote`);
            loadTownHallData();
        } catch (err) {
            console.error(err);
            setError('Failed to upvote');
        }
    };

    const answerQuestion = async (questionId, answer) => {
        setError('');
        try {
            await api.put(`/collaboration/meetings/${meetingId}/townhall/questions/${questionId}/answer`, { answer });
            setSuccess('Answer posted');
            loadTownHallData();
        } catch (err) {
            console.error(err);
            setError('Failed to post answer');
        }
    };

    const submitPoll = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            const validOptions = pollForm.options.filter(opt => opt.trim() !== '');
            await api.post(`/collaboration/meetings/${meetingId}/townhall/polls`, {
                question: pollForm.question,
                options: validOptions
            });
            setSuccess('Poll created');
            setPollForm({ question: '', options: ['', ''] });
            loadTownHallData();
        } catch (err) {
            console.error(err);
            setError('Failed to create poll');
        }
    };

    const votePoll = async (pollId, optionId) => {
        setError('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/townhall/polls/${pollId}/vote`, { optionId });
            setSuccess('Vote recorded');
            loadTownHallData();
        } catch (err) {
            console.error(err);
            setError('Failed to vote');
        }
    };

    const answeredQuestions = questions.filter(q => q.answered);
    const unansweredQuestions = questions.filter(q => !q.answered);

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Town Hall Mode</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Audience Q&A with upvoting, live polling, and speaker queue
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label={`Questions (${questions.length})`} />
                <Tab label={`Polls (${polls.length})`} />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Ask a Question</Typography>
                                <form onSubmit={submitQuestion}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Your Question"
                                            multiline
                                            rows={4}
                                            value={questionForm.question}
                                            onChange={(e) => setQuestionForm({ question: e.target.value })}
                                            required
                                            fullWidth
                                        />
                                        <Button type="submit" variant="contained">Submit Question</Button>
                                    </Stack>
                                </form>

                                <Box sx={{ mt: 3 }}>
                                    <Typography variant="h6" gutterBottom>Q&A Stats</Typography>
                                    <Stack spacing={1}>
                                        <Chip 
                                            label={`${unansweredQuestions.length} Unanswered`} 
                                            color="warning" 
                                            size="small"
                                        />
                                        <Chip 
                                            label={`${answeredQuestions.length} Answered`} 
                                            color="success" 
                                            size="small"
                                        />
                                        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                            Total Upvotes: {questions.reduce((sum, q) => sum + q.upvotes, 0)}
                                        </Typography>
                                    </Stack>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        {unansweredQuestions.length > 0 && (
                            <Card sx={{ mb: 2 }}>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom color="warning.main">
                                        Unanswered Questions ({unansweredQuestions.length})
                                    </Typography>
                                    <Stack spacing={2}>
                                        {unansweredQuestions.map((q) => (
                                            <Card key={q.id} variant="outlined" sx={{ bgcolor: 'warning.lighter' }}>
                                                <CardContent>
                                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                                        <Box>
                                                            <Button
                                                                size="small"
                                                                startIcon={<ThumbUpIcon />}
                                                                onClick={() => upvoteQuestion(q.id)}
                                                                variant="outlined"
                                                            >
                                                                {q.upvotes}
                                                            </Button>
                                                        </Box>
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body1">{q.question}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                Submitted: {new Date(q.submittedAt).toLocaleString()}
                                                            </Typography>
                                                            <Box sx={{ mt: 2 }}>
                                                                <TextField
                                                                    size="small"
                                                                    fullWidth
                                                                    multiline
                                                                    rows={2}
                                                                    placeholder="Type your answer..."
                                                                    onKeyPress={(e) => {
                                                                        if (e.key === 'Enter' && e.ctrlKey) {
                                                                            answerQuestion(q.id, e.target.value);
                                                                            e.target.value = '';
                                                                        }
                                                                    }}
                                                                />
                                                                <Typography variant="caption" color="text.secondary">
                                                                    Press Ctrl+Enter to submit answer
                                                                </Typography>
                                                            </Box>
                                                        </Box>
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
                                <Typography variant="h6" gutterBottom color="success.main">
                                    Answered Questions ({answeredQuestions.length})
                                </Typography>
                                <Stack spacing={2}>
                                    {answeredQuestions.map((q) => (
                                        <Card key={q.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={2} alignItems="flex-start">
                                                    <Box>
                                                        <Button
                                                            size="small"
                                                            startIcon={<ThumbUpIcon />}
                                                            onClick={() => upvoteQuestion(q.id)}
                                                            variant="outlined"
                                                        >
                                                            {q.upvotes}
                                                        </Button>
                                                    </Box>
                                                    <Box sx={{ flex: 1 }}>
                                                        <Typography variant="body1" sx={{ fontWeight: 'bold' }}>
                                                            Q: {q.question}
                                                        </Typography>
                                                        <Box sx={{ mt: 1, p: 1, bgcolor: 'action.hover', borderRadius: 1 }}>
                                                            <Typography variant="body2">
                                                                <strong>A:</strong> {q.answer}
                                                            </Typography>
                                                        </Box>
                                                        <Typography variant="caption" color="text.secondary">
                                                            Answered: {new Date(q.answeredAt).toLocaleString()}
                                                        </Typography>
                                                    </Box>
                                                </Stack>
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
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Create Poll</Typography>
                                <form onSubmit={submitPoll}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Poll Question"
                                            value={pollForm.question}
                                            onChange={(e) => setPollForm({ ...pollForm, question: e.target.value })}
                                            required
                                            fullWidth
                                        />
                                        {pollForm.options.map((option, index) => (
                                            <TextField
                                                key={index}
                                                label={`Option ${index + 1}`}
                                                value={option}
                                                onChange={(e) => {
                                                    const newOptions = [...pollForm.options];
                                                    newOptions[index] = e.target.value;
                                                    setPollForm({ ...pollForm, options: newOptions });
                                                }}
                                                required={index < 2}
                                                fullWidth
                                            />
                                        ))}
                                        <Button
                                            variant="outlined"
                                            onClick={() => setPollForm({
                                                ...pollForm,
                                                options: [...pollForm.options, '']
                                            })}
                                        >
                                            Add Option
                                        </Button>
                                        <Button type="submit" variant="contained">Create Poll</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={8}>
                        <Stack spacing={2}>
                            {polls.length === 0 && (
                                <Alert severity="info">No polls created yet</Alert>
                            )}
                            {polls.map((poll) => (
                                <Card key={poll.id}>
                                    <CardContent>
                                        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
                                            <Typography variant="h6" sx={{ flex: 1 }}>{poll.question}</Typography>
                                            <Chip 
                                                label={poll.isActive ? 'Active' : 'Closed'} 
                                                color={poll.isActive ? 'success' : 'default'}
                                                size="small"
                                            />
                                            <Chip 
                                                label={`${poll.totalVotes} votes`}
                                                size="small"
                                            />
                                        </Stack>

                                        <Stack spacing={2}>
                                            {poll.options.map((option) => {
                                                const percentage = poll.totalVotes > 0 
                                                    ? ((option.votes || 0) / poll.totalVotes * 100).toFixed(1)
                                                    : 0;
                                                return (
                                                    <Box key={option.id}>
                                                        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 0.5 }}>
                                                            <Typography variant="body2">{option.text}</Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {option.votes || 0} votes ({percentage}%)
                                                            </Typography>
                                                        </Stack>
                                                        <Box sx={{ position: 'relative', height: 40 }}>
                                                            <Box
                                                                sx={{
                                                                    position: 'absolute',
                                                                    left: 0,
                                                                    top: 0,
                                                                    height: '100%',
                                                                    width: `${percentage}%`,
                                                                    bgcolor: 'primary.main',
                                                                    borderRadius: 1,
                                                                    transition: 'width 0.3s ease'
                                                                }}
                                                            />
                                                            {poll.isActive && (
                                                                <Button
                                                                    variant="outlined"
                                                                    size="small"
                                                                    onClick={() => votePoll(poll.id, option.id)}
                                                                    sx={{ 
                                                                        position: 'absolute', 
                                                                        right: 4, 
                                                                        top: '50%', 
                                                                        transform: 'translateY(-50%)',
                                                                        zIndex: 1
                                                                    }}
                                                                >
                                                                    Vote
                                                                </Button>
                                                            )}
                                                        </Box>
                                                    </Box>
                                                );
                                            })}
                                        </Stack>

                                        <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                            Created: {new Date(poll.createdAt).toLocaleString()}
                                        </Typography>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

export default TownHallMode;
