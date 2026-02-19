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
    Tab,
    Tabs,
    TextField,
    Typography,
} from '@mui/material';
import api from '../../utils/api';

// Court Mode - Full Implementation
export function CourtMode({ meetingId, user }) {
    const [evidence, setEvidence] = useState([]);
    const [motions, setMotions] = useState([]);
    const [verdict, setVerdict] = useState(null);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [evidenceForm, setEvidenceForm] = useState({
        exhibitNumber: '',
        title: '',
        description: '',
        fileUrl: '',
        fileType: ''
    });

    const [motionForm, setMotionForm] = useState({
        motionType: '',
        title: '',
        description: ''
    });

    const [verdictForm, setVerdictForm] = useState({
        decision: '',
        reasoning: '',
        evidenceConsidered: []
    });

    useEffect(() => {
        if (meetingId) {
            loadCourtData();
        }
    }, [meetingId]);

    const loadCourtData = async () => {
        try {
            const [evidenceRes, motionsRes, verdictRes] = await Promise.all([
                api.get(`/collaboration/meetings/${meetingId}/court/evidence`),
                api.get(`/collaboration/meetings/${meetingId}/court/motions`),
                api.get(`/collaboration/meetings/${meetingId}/court/verdict`)
            ]);
            setEvidence(evidenceRes.data || []);
            setMotions(motionsRes.data || []);
            setVerdict(verdictRes.data);
        } catch (err) {
            console.error(err);
        }
    };

    const submitEvidence = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/court/evidence`, evidenceForm);
            setSuccess('Evidence submitted');
            setEvidenceForm({
                exhibitNumber: '',
                title: '',
                description: '',
                fileUrl: '',
                fileType: ''
            });
            loadCourtData();
        } catch (err) {
            console.error(err);
            setError('Failed to submit evidence');
        }
    };

    const ruleOnEvidence = async (evidenceId, status) => {
        setError('');
        try {
            await api.put(`/collaboration/meetings/${meetingId}/court/evidence/${evidenceId}/admissibility`, {
                admissibilityStatus: status
            });
            setSuccess('Ruling recorded');
            loadCourtData();
        } catch (err) {
            console.error(err);
            setError('Failed to rule on evidence');
        }
    };

    const fileMotion = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/court/motions`, motionForm);
            setSuccess('Motion filed');
            setMotionForm({ motionType: '', title: '', description: '' });
            loadCourtData();
        } catch (err) {
            console.error(err);
            setError('Failed to file motion');
        }
    };

    const ruleOnMotion = async (motionId, ruling, reason) => {
        setError('');
        try {
            await api.put(`/collaboration/meetings/${meetingId}/court/motions/${motionId}/ruling`, {
                ruling,
                rulingReason: reason
            });
            setSuccess('Ruling issued');
            loadCourtData();
        } catch (err) {
            console.error(err);
            setError('Failed to issue ruling');
        }
    };

    const renderVerdict = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/court/verdict`, verdictForm);
            setSuccess('Verdict rendered');
            loadCourtData();
        } catch (err) {
            console.error(err);
            setError('Failed to render verdict');
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Virtual Court Mode</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Evidence vault, motions, and verdict system with chain-of-custody
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Evidence Vault" />
                <Tab label="Motions" />
                <Tab label="Verdict" />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Submit Evidence</Typography>
                                <form onSubmit={submitEvidence}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Exhibit Number"
                                            value={evidenceForm.exhibitNumber}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, exhibitNumber: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Title"
                                            value={evidenceForm.title}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, title: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Description"
                                            multiline
                                            rows={3}
                                            value={evidenceForm.description}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, description: e.target.value })}
                                        />
                                        <TextField
                                            label="File URL"
                                            value={evidenceForm.fileUrl}
                                            onChange={(e) => setEvidenceForm({ ...evidenceForm, fileUrl: e.target.value })}
                                        />
                                        <Button type="submit" variant="contained">Submit Evidence</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Evidence Log</Typography>
                                <Stack spacing={1}>
                                    {evidence.map((ev) => (
                                        <Card key={ev.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    <Chip label={`Exhibit ${ev.exhibitNumber}`} size="small" />
                                                    <Chip 
                                                        label={ev.admissibilityStatus}
                                                        size="small"
                                                        color={
                                                            ev.admissibilityStatus === 'admitted' ? 'success' :
                                                            ev.admissibilityStatus === 'excluded' ? 'error' : 'default'
                                                        }
                                                    />
                                                </Stack>
                                                <Typography variant="subtitle2">{ev.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {ev.description}
                                                </Typography>
                                                {ev.admissibilityStatus === 'pending' && (
                                                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                        <Button 
                                                            size="small" 
                                                            color="success"
                                                            onClick={() => ruleOnEvidence(ev.id, 'admitted')}
                                                        >
                                                            Admit
                                                        </Button>
                                                        <Button 
                                                            size="small" 
                                                            color="error"
                                                            onClick={() => ruleOnEvidence(ev.id, 'excluded')}
                                                        >
                                                            Exclude
                                                        </Button>
                                                    </Stack>
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

            {activeTab === 1 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>File Motion</Typography>
                                <form onSubmit={fileMotion}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Motion Type"
                                            value={motionForm.motionType}
                                            onChange={(e) => setMotionForm({ ...motionForm, motionType: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Title"
                                            value={motionForm.title}
                                            onChange={(e) => setMotionForm({ ...motionForm, title: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Description"
                                            multiline
                                            rows={4}
                                            value={motionForm.description}
                                            onChange={(e) => setMotionForm({ ...motionForm, description: e.target.value })}
                                        />
                                        <Button type="submit" variant="contained">File Motion</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={6}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Motions Queue</Typography>
                                <Stack spacing={1}>
                                    {motions.map((motion) => (
                                        <Card key={motion.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    <Chip label={motion.motionType} size="small" variant="outlined" />
                                                    <Chip 
                                                        label={motion.ruling}
                                                        size="small"
                                                        color={
                                                            motion.ruling === 'granted' ? 'success' :
                                                            motion.ruling === 'denied' ? 'error' : 'default'
                                                        }
                                                    />
                                                </Stack>
                                                <Typography variant="subtitle2">{motion.title}</Typography>
                                                <Typography variant="body2" color="text.secondary">
                                                    {motion.description}
                                                </Typography>
                                                {motion.ruling === 'pending' && (
                                                    <Stack spacing={1} sx={{ mt: 2 }}>
                                                        <TextField
                                                            size="small"
                                                            label="Ruling Reason"
                                                            placeholder="Enter reason for ruling"
                                                            fullWidth
                                                            onKeyPress={(e) => {
                                                                if (e.key === 'Enter' && e.ctrlKey && e.target.value) {
                                                                    const action = window.confirm('Grant motion?') ? 'granted' : 'denied';
                                                                    ruleOnMotion(motion.id, action, e.target.value);
                                                                }
                                                            }}
                                                        />
                                                        <Typography variant="caption">Ctrl+Enter to submit ruling</Typography>
                                                    </Stack>
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
                    <Grid item xs={12} md={6}>
                        {!verdict && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom>Render Verdict</Typography>
                                    <form onSubmit={renderVerdict}>
                                        <Stack spacing={2}>
                                            <TextField
                                                label="Decision"
                                                multiline
                                                rows={3}
                                                value={verdictForm.decision}
                                                onChange={(e) => setVerdictForm({ ...verdictForm, decision: e.target.value })}
                                                required
                                            />
                                            <TextField
                                                label="Reasoning"
                                                multiline
                                                rows={5}
                                                value={verdictForm.reasoning}
                                                onChange={(e) => setVerdictForm({ ...verdictForm, reasoning: e.target.value })}
                                                required
                                            />
                                            <Button type="submit" variant="contained" color="primary">
                                                Render Verdict
                                            </Button>
                                        </Stack>
                                    </form>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                    <Grid item xs={12} md={6}>
                        {verdict && (
                            <Card>
                                <CardContent>
                                    <Typography variant="h6" gutterBottom color="primary">Final Verdict</Typography>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1, mb: 2 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                            Decision
                                        </Typography>
                                        <Typography variant="body1">{verdict.decision}</Typography>
                                    </Box>
                                    <Box sx={{ p: 2, bgcolor: 'action.hover', borderRadius: 1 }}>
                                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                                            Reasoning
                                        </Typography>
                                        <Typography variant="body2">{verdict.reasoning}</Typography>
                                    </Box>
                                    <Typography variant="caption" color="text.secondary" sx={{ mt: 2, display: 'block' }}>
                                        Rendered: {new Date(verdict.renderedAt).toLocaleString()}
                                    </Typography>
                                </CardContent>
                            </Card>
                        )}
                    </Grid>
                </Grid>
            )}
        </Box>
    );
}

// Conference Mode - Full Implementation
export function ConferenceMode({ meetingId, user }) {
    const [sessions, setSessions] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [filterTrack, setFilterTrack] = useState('all');

    const [sessionForm, setSessionForm] = useState({
        title: '',
        description: '',
        track: '',
        startTime: '',
        endTime: '',
        roomId: '',
        capacity: 50
    });

    useEffect(() => {
        if (meetingId) {
            loadSessions();
        }
    }, [meetingId]);

    const loadSessions = async () => {
        try {
            const response = await api.get(`/collaboration/meetings/${meetingId}/conference/sessions`);
            setSessions(response.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load sessions');
        }
    };

    const createSession = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/conference/sessions`, sessionForm);
            setSuccess('Session created');
            setSessionForm({
                title: '',
                description: '',
                track: '',
                startTime: '',
                endTime: '',
                roomId: '',
                capacity: 50
            });
            loadSessions();
        } catch (err) {
            console.error(err);
            setError('Failed to create session');
        }
    };

    const tracks = [...new Set(sessions.map(s => s.track).filter(Boolean))];
    const filteredSessions = filterTrack === 'all' 
        ? sessions 
        : sessions.filter(s => s.track === filterTrack);

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Virtual Conference Mode</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Multiple concurrent sessions with tracks and capacity management
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Grid container spacing={2}>
                <Grid item xs={12} md={4}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>Create Session</Typography>
                            <form onSubmit={createSession}>
                                <Stack spacing={2}>
                                    <TextField
                                        label="Session Title"
                                        value={sessionForm.title}
                                        onChange={(e) => setSessionForm({ ...sessionForm, title: e.target.value })}
                                        required
                                    />
                                    <TextField
                                        label="Description"
                                        multiline
                                        rows={2}
                                        value={sessionForm.description}
                                        onChange={(e) => setSessionForm({ ...sessionForm, description: e.target.value })}
                                    />
                                    <TextField
                                        label="Track"
                                        value={sessionForm.track}
                                        onChange={(e) => setSessionForm({ ...sessionForm, track: e.target.value })}
                                    />
                                    <TextField
                                        label="Room ID"
                                        value={sessionForm.roomId}
                                        onChange={(e) => setSessionForm({ ...sessionForm, roomId: e.target.value })}
                                    />
                                    <TextField
                                        label="Capacity"
                                        type="number"
                                        value={sessionForm.capacity}
                                        onChange={(e) => setSessionForm({ ...sessionForm, capacity: parseInt(e.target.value) })}
                                    />
                                    <Button type="submit" variant="contained">Create Session</Button>
                                </Stack>
                            </form>
                        </CardContent>
                    </Card>
                </Grid>

                <Grid item xs={12} md={8}>
                    <Card sx={{ mb: 2 }}>
                        <CardContent>
                            <Stack direction="row" spacing={2} alignItems="center">
                                <Typography variant="h6">Sessions ({sessions.length})</Typography>
                                <FormControl size="small" sx={{ minWidth: 150 }}>
                                    <InputLabel>Track</InputLabel>
                                    <Select
                                        value={filterTrack}
                                        label="Track"
                                        onChange={(e) => setFilterTrack(e.target.value)}
                                    >
                                        <MenuItem value="all">All Tracks</MenuItem>
                                        {tracks.map(track => (
                                            <MenuItem key={track} value={track}>{track}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Stack spacing={2}>
                        {filteredSessions.map((session) => (
                            <Card key={session.id}>
                                <CardContent>
                                    <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                        <Typography variant="h6" sx={{ flex: 1 }}>{session.title}</Typography>
                                        {session.track && (
                                            <Chip label={session.track} color="primary" size="small" />
                                        )}
                                        <Chip 
                                            label={`${session.attendeeCount || 0}/${session.capacity}`}
                                            size="small"
                                            color={session.attendeeCount >= session.capacity ? 'error' : 'default'}
                                        />
                                    </Stack>
                                    {session.description && (
                                        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                                            {session.description}
                                        </Typography>
                                    )}
                                    <Stack direction="row" spacing={1}>
                                        {session.roomId && (
                                            <Chip label={`Room: ${session.roomId}`} size="small" variant="outlined" />
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Grid>
            </Grid>
        </Box>
    );
}

// Quiz Mode - Full Implementation
export function QuizMode({ meetingId, user }) {
    const [questions, setQuestions] = useState([]);
    const [leaderboard, setLeaderboard] = useState([]);
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    const [questionForm, setQuestionForm] = useState({
        question: '',
        options: [{ id: 0, text: '', isCorrect: false }, { id: 1, text: '', isCorrect: false }],
        correctAnswer: '',
        points: 10,
        timeLimit: 30,
        category: ''
    });

    useEffect(() => {
        if (meetingId) {
            loadQuizData();
        }
    }, [meetingId]);

    const loadQuizData = async () => {
        try {
            const [questionsRes, leaderboardRes] = await Promise.all([
                api.get(`/collaboration/meetings/${meetingId}/quiz/questions`),
                api.get(`/collaboration/meetings/${meetingId}/quiz/leaderboard`)
            ]);
            setQuestions(questionsRes.data || []);
            setLeaderboard(leaderboardRes.data || []);
        } catch (err) {
            console.error(err);
            setError('Failed to load quiz data');
        }
    };

    const createQuestion = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/quiz/questions`, questionForm);
            setSuccess('Question created');
            setQuestionForm({
                question: '',
                options: [{ id: 0, text: '', isCorrect: false }, { id: 1, text: '', isCorrect: false }],
                correctAnswer: '',
                points: 10,
                timeLimit: 30,
                category: ''
            });
            loadQuizData();
        } catch (err) {
            console.error(err);
            setError('Failed to create question');
        }
    };

    const submitAnswer = async (questionId, answer) => {
        setError('');
        try {
            await api.post(`/collaboration/meetings/${meetingId}/quiz/responses`, {
                questionId,
                answer,
                timeToAnswer: 1000
            });
            setSuccess('Answer submitted');
            loadQuizData();
        } catch (err) {
            console.error(err);
            setError('Failed to submit answer');
        }
    };

    return (
        <Box>
            <Typography variant="h5" gutterBottom>Quiz Mode</Typography>
            <Typography variant="body2" color="text.secondary" gutterBottom>
                Live quizzes with real-time scoring and leaderboards
            </Typography>

            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }}>
                <Tab label="Questions" />
                <Tab label="Leaderboard" />
            </Tabs>

            {activeTab === 0 && (
                <Grid container spacing={2}>
                    <Grid item xs={12} md={4}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Create Question</Typography>
                                <form onSubmit={createQuestion}>
                                    <Stack spacing={2}>
                                        <TextField
                                            label="Question"
                                            multiline
                                            rows={2}
                                            value={questionForm.question}
                                            onChange={(e) => setQuestionForm({ ...questionForm, question: e.target.value })}
                                            required
                                        />
                                        {questionForm.options.map((opt, idx) => (
                                            <TextField
                                                key={idx}
                                                label={`Option ${idx + 1}`}
                                                value={opt.text}
                                                onChange={(e) => {
                                                    const newOptions = [...questionForm.options];
                                                    newOptions[idx].text = e.target.value;
                                                    setQuestionForm({ ...questionForm, options: newOptions });
                                                }}
                                                required
                                            />
                                        ))}
                                        <TextField
                                            label="Correct Answer"
                                            value={questionForm.correctAnswer}
                                            onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                            required
                                        />
                                        <TextField
                                            label="Points"
                                            type="number"
                                            value={questionForm.points}
                                            onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}
                                        />
                                        <Button type="submit" variant="contained">Create Question</Button>
                                    </Stack>
                                </form>
                            </CardContent>
                        </Card>
                    </Grid>
                    <Grid item xs={12} md={8}>
                        <Card>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>Questions ({questions.length})</Typography>
                                <Stack spacing={2}>
                                    {questions.map((q, index) => (
                                        <Card key={q.id} variant="outlined">
                                            <CardContent>
                                                <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
                                                    <Chip label={`Q${index + 1}`} color="primary" size="small" />
                                                    <Chip label={`${q.points} pts`} size="small" />
                                                </Stack>
                                                <Typography variant="body1" sx={{ mb: 2 }}>{q.question}</Typography>
                                                <Stack spacing={1}>
                                                    {q.options && q.options.map((opt) => (
                                                        <Button
                                                            key={opt.id}
                                                            variant="outlined"
                                                            onClick={() => submitAnswer(q.id, opt.text)}
                                                            fullWidth
                                                        >
                                                            {opt.text}
                                                        </Button>
                                                    ))}
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
                <Card>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>Leaderboard</Typography>
                        <Stack spacing={1}>
                            {leaderboard.map((entry, index) => (
                                <Card key={index} variant="outlined">
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Stack direction="row" spacing={2} alignItems="center">
                                                <Chip 
                                                    label={`#${index + 1}`}
                                                    color={index === 0 ? 'success' : index === 1 ? 'primary' : 'default'}
                                                    size="small"
                                                />
                                                <Typography>Participant {entry.participantId?.substring(0, 8)}</Typography>
                                            </Stack>
                                            <Stack direction="row" spacing={2}>
                                                <Chip label={`${entry.totalPoints} pts`} color="primary" />
                                                <Chip label={`${entry.correctAnswers} correct`} />
                                            </Stack>
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

