import React, { useEffect, useState } from 'react';
import {
    Alert,
    Box,
    Button,
    Card,
    CardContent,
    Chip,
    Dialog,
    DialogActions,
    DialogContent,
    DialogTitle,
    Divider,
    FormControl,
    Grid,
    IconButton,
    InputLabel,
    LinearProgress,
    MenuItem,
    Paper,
    Select,
    Stack,
    Tab,
    Tabs,
    TextField,
    Tooltip,
    Typography,
} from '@mui/material';
import {
    Add as AddIcon,
    TrendingUp as TrendingUpIcon,
    Psychology as PsychologyIcon,
    AccountTree as GraphIcon,
    Lightbulb as IdeaIcon,
    CheckCircle as CheckIcon,
    Timeline as TimelineIcon,
    Description as DescriptionIcon,
    Search as SearchIcon,
} from '@mui/icons-material';
import api from '../../utils/api';

function KnowledgeIntelligence({ meetingId, user }) {
    const [activeTab, setActiveTab] = useState(0);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [loading, setLoading] = useState(false);

    // State for each section
    const [decisionLogs, setDecisionLogs] = useState([]);
    const [followUpTasks, setFollowUpTasks] = useState([]);
    const [outcomes, setOutcomes] = useState([]);
    const [topics, setTopics] = useState([]);
    const [highlights, setHighlights] = useState([]);
    const [aiSummaries, setAISummaries] = useState([]);
    const [aiActionItems, setAIActionItems] = useState([]);
    const [meetingBrief, setMeetingBrief] = useState(null);

    // Dialog states
    const [decisionDialog, setDecisionDialog] = useState(false);
    const [taskDialog, setTaskDialog] = useState(false);
    const [outcomeDialog, setOutcomeDialog] = useState(false);
    const [topicDialog, setTopicDialog] = useState(false);
    const [highlightDialog, setHighlightDialog] = useState(false);

    // Form states
    const [decisionForm, setDecisionForm] = useState({
        title: '',
        description: '',
        rationale: '',
        decision: '',
        alternatives: [],
        evidenceLinks: [],
        impactAssessment: {},
        tags: []
    });

    const [taskForm, setTaskForm] = useState({
        title: '',
        description: '',
        assignedTo: '',
        dueDate: '',
        priority: 'medium',
        decisionLogId: ''
    });

    const [outcomeForm, setOutcomeForm] = useState({
        decisionLogId: '',
        metric: '',
        targetValue: 0,
        actualValue: 0,
        unit: '',
        measurementDate: '',
        notes: ''
    });

    const [topicForm, setTopicForm] = useState({
        topic: '',
        description: '',
        keywords: []
    });

    const [highlightForm, setHighlightForm] = useState({
        content: '',
        highlightType: 'key_point',
        timestamp: new Date().toISOString()
    });

    useEffect(() => {
        if (meetingId) {
            loadData();
        }
    }, [meetingId, activeTab]);

    const loadData = async () => {
        try {
            setLoading(true);
            setError('');

            switch (activeTab) {
                case 0: // Decision Intelligence
                    const decisionsRes = await api.get(`/collaboration/meetings/${meetingId}/decision-log`);
                    setDecisionLogs(decisionsRes.data);
                    const tasksRes = await api.get(`/collaboration/meetings/${meetingId}/follow-up-tasks`);
                    setFollowUpTasks(tasksRes.data);
                    const outcomesRes = await api.get(`/collaboration/meetings/${meetingId}/outcomes`);
                    setOutcomes(outcomesRes.data);
                    break;
                case 1: // Knowledge Graph
                    const topicsRes = await api.get(`/collaboration/meetings/${meetingId}/topics`);
                    setTopics(topicsRes.data);
                    break;
                case 2: // Transcript Highlights
                    const highlightsRes = await api.get(`/collaboration/meetings/${meetingId}/highlights`);
                    setHighlights(highlightsRes.data);
                    break;
                case 3: // AI Summaries
                    const summariesRes = await api.get(`/collaboration/meetings/${meetingId}/ai-summary`);
                    setAISummaries(summariesRes.data);
                    break;
                case 4: // AI Action Items
                    const aiActionsRes = await api.get(`/collaboration/meetings/${meetingId}/ai-action-items`);
                    setAIActionItems(aiActionsRes.data);
                    break;
                case 5: // Meeting Brief
                    try {
                        const briefRes = await api.get(`/collaboration/meetings/${meetingId}/brief`);
                        setMeetingBrief(briefRes.data);
                    } catch (err) {
                        if (err.response?.status !== 404) {
                            throw err;
                        }
                    }
                    break;
                default:
                    break;
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to load data');
        } finally {
            setLoading(false);
        }
    };

    const handleCreateDecision = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/decision-log`, decisionForm);
            setSuccess('Decision log created successfully');
            setDecisionDialog(false);
            setDecisionForm({
                title: '',
                description: '',
                rationale: '',
                decision: '',
                alternatives: [],
                evidenceLinks: [],
                impactAssessment: {},
                tags: []
            });
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create decision log');
        }
    };

    const handleCreateTask = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/follow-up-tasks`, taskForm);
            setSuccess('Follow-up task created successfully');
            setTaskDialog(false);
            setTaskForm({
                title: '',
                description: '',
                assignedTo: '',
                dueDate: '',
                priority: 'medium',
                decisionLogId: ''
            });
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create task');
        }
    };

    const handleCreateOutcome = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/outcomes`, outcomeForm);
            setSuccess('Outcome tracker created successfully');
            setOutcomeDialog(false);
            setOutcomeForm({
                decisionLogId: '',
                metric: '',
                targetValue: 0,
                actualValue: 0,
                unit: '',
                measurementDate: '',
                notes: ''
            });
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create outcome');
        }
    };

    const handleCreateTopic = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/topics`, topicForm);
            setSuccess('Topic created successfully');
            setTopicDialog(false);
            setTopicForm({
                topic: '',
                description: '',
                keywords: []
            });
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create topic');
        }
    };

    const handleCreateHighlight = async () => {
        try {
            setError('');
            await api.post(`/collaboration/meetings/${meetingId}/highlights`, highlightForm);
            setSuccess('Highlight created successfully');
            setHighlightDialog(false);
            setHighlightForm({
                content: '',
                highlightType: 'key_point',
                timestamp: new Date().toISOString()
            });
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to create highlight');
        }
    };

    const handleGenerateAISummary = async () => {
        try {
            setError('');
            setLoading(true);
            await api.post(`/collaboration/meetings/${meetingId}/ai-summary`, { summaryType: 'full_meeting' });
            setSuccess('AI summary generated successfully');
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate AI summary');
        } finally {
            setLoading(false);
        }
    };

    const handleExtractAIActions = async () => {
        try {
            setError('');
            setLoading(true);
            await api.post(`/collaboration/meetings/${meetingId}/ai-extract-actions`, { extractedFrom: 'Meeting transcript' });
            setSuccess('AI action items extracted successfully');
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to extract action items');
        } finally {
            setLoading(false);
        }
    };

    const handleGenerateBrief = async () => {
        try {
            setError('');
            setLoading(true);
            await api.post(`/collaboration/meetings/${meetingId}/brief`, {});
            setSuccess('Meeting brief generated successfully');
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to generate brief');
        } finally {
            setLoading(false);
        }
    };

    const handleVerifyAIAction = async (itemId, status) => {
        try {
            setError('');
            await api.put(`/collaboration/meetings/${meetingId}/ai-action-items/${itemId}`, {
                verificationStatus: status,
                convertToTask: status === 'verified'
            });
            setSuccess('Action item verified');
            loadData();
        } catch (err) {
            setError(err.response?.data?.error || 'Failed to verify action item');
        }
    };

    return (
        <Box sx={{ p: 2 }}>
            <Typography variant="h5" gutterBottom>
                <PsychologyIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Knowledge & Intelligence
            </Typography>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}
            {success && (
                <Alert severity="success" sx={{ mb: 2 }} onClose={() => setSuccess('')}>
                    {success}
                </Alert>
            )}

            <Tabs value={activeTab} onChange={(e, v) => setActiveTab(v)} sx={{ mb: 2 }} variant="scrollable">
                <Tab label="Decision Intelligence" />
                <Tab label="Knowledge Graph" />
                <Tab label="Transcript Highlights" />
                <Tab label="AI Summaries" />
                <Tab label="AI Action Items" />
                <Tab label="Meeting Brief" />
            </Tabs>

            {loading && <LinearProgress sx={{ mb: 2 }} />}

            {/* Decision Intelligence Tab */}
            {activeTab === 0 && (
                <Box>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6">Decision Logs</Typography>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => setDecisionDialog(true)}
                                        >
                                            Add
                                        </Button>
                                    </Stack>
                                    <Stack spacing={1}>
                                        {decisionLogs.map((decision) => (
                                            <Paper key={decision.id} sx={{ p: 2 }}>
                                                <Typography variant="subtitle2">{decision.title}</Typography>
                                                <Chip label={decision.status} size="small" sx={{ mt: 1 }} />
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                                    {decision.decision?.substring(0, 100)}...
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6">Follow-Up Tasks</Typography>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => setTaskDialog(true)}
                                        >
                                            Add
                                        </Button>
                                    </Stack>
                                    <Stack spacing={1}>
                                        {followUpTasks.map((task) => (
                                            <Paper key={task.id} sx={{ p: 2 }}>
                                                <Typography variant="subtitle2">{task.title}</Typography>
                                                <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                                    <Chip label={task.status} size="small" />
                                                    <Chip label={task.priority} size="small" color="warning" />
                                                </Stack>
                                                <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
                                                    Due: {task.dueDate ? new Date(task.dueDate).toLocaleDateString() : 'N/A'}
                                                </Typography>
                                            </Paper>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>

                        <Grid item xs={12} md={4}>
                            <Card>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Typography variant="h6">Outcome Tracking</Typography>
                                        <Button
                                            size="small"
                                            startIcon={<AddIcon />}
                                            onClick={() => setOutcomeDialog(true)}
                                        >
                                            Add
                                        </Button>
                                    </Stack>
                                    <Stack spacing={1}>
                                        {outcomes.map((outcome) => (
                                            <Paper key={outcome.id} sx={{ p: 2 }}>
                                                <Typography variant="subtitle2">{outcome.metric}</Typography>
                                                <Box sx={{ mt: 1 }}>
                                                    <Typography variant="caption" color="text.secondary">
                                                        Target: {outcome.targetValue} {outcome.unit}
                                                    </Typography>
                                                    <LinearProgress 
                                                        variant="determinate" 
                                                        value={(outcome.actualValue / outcome.targetValue) * 100} 
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                    <Typography variant="caption" color="text.secondary">
                                                        Actual: {outcome.actualValue} {outcome.unit}
                                                    </Typography>
                                                </Box>
                                                <Chip label={outcome.status} size="small" sx={{ mt: 1 }} />
                                            </Paper>
                                        ))}
                                    </Stack>
                                </CardContent>
                            </Card>
                        </Grid>
                    </Grid>
                </Box>
            )}

            {/* Knowledge Graph Tab */}
            {activeTab === 1 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setTopicDialog(true)}
                        sx={{ mb: 2 }}
                    >
                        Add Topic
                    </Button>
                    <Grid container spacing={2}>
                        {topics.map((topic) => (
                            <Grid item xs={12} md={6} key={topic.id}>
                                <Card>
                                    <CardContent>
                                        <Stack direction="row" justifyContent="space-between" alignItems="center">
                                            <Box sx={{ flex: 1 }}>
                                                <Typography variant="h6">{topic.topic}</Typography>
                                                <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                    {topic.description}
                                                </Typography>
                                                <Stack direction="row" spacing={1} sx={{ mt: 2, flexWrap: 'wrap' }}>
                                                    {topic.keywords && topic.keywords.map((kw, idx) => (
                                                        <Chip key={idx} label={kw} size="small" />
                                                    ))}
                                                </Stack>
                                            </Box>
                                            <Box sx={{ textAlign: 'center', ml: 2 }}>
                                                <Typography variant="h4">{topic.discussionTime || 0}m</Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    Discussion Time
                                                </Typography>
                                            </Box>
                                        </Stack>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            )}

            {/* Transcript Highlights Tab */}
            {activeTab === 2 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<AddIcon />}
                        onClick={() => setHighlightDialog(true)}
                        sx={{ mb: 2 }}
                    >
                        Add Highlight
                    </Button>
                    <Stack spacing={2}>
                        {highlights.map((highlight) => (
                            <Card key={highlight.id}>
                                <CardContent>
                                    <Stack direction="row" spacing={2} alignItems="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Chip label={highlight.highlightType} size="small" sx={{ mb: 1 }} />
                                            <Typography variant="body1">{highlight.content}</Typography>
                                            <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                                                {new Date(highlight.timestamp).toLocaleString()}
                                            </Typography>
                                        </Box>
                                        <Box>
                                            <Typography variant="h6" color="primary">
                                                {Math.round(highlight.importance * 100)}%
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary">
                                                Importance
                                            </Typography>
                                        </Box>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* AI Summaries Tab */}
            {activeTab === 3 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<PsychologyIcon />}
                        onClick={handleGenerateAISummary}
                        sx={{ mb: 2 }}
                        disabled={loading}
                    >
                        Generate AI Summary
                    </Button>
                    <Stack spacing={2}>
                        {aiSummaries.map((summary) => (
                            <Card key={summary.id}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
                                        <Chip label={summary.summaryType} />
                                        <Chip 
                                            label={summary.reviewStatus} 
                                            color={summary.reviewStatus === 'approved' ? 'success' : 'default'}
                                        />
                                    </Stack>
                                    <Typography variant="body1" paragraph>
                                        {summary.summary}
                                    </Typography>
                                    <Divider sx={{ my: 2 }} />
                                    <Typography variant="subtitle2">Key Points:</Typography>
                                    <ul>
                                        {summary.keyPoints && summary.keyPoints.map((point, idx) => (
                                            <li key={idx}>
                                                <Typography variant="body2">{point}</Typography>
                                            </li>
                                        ))}
                                    </ul>
                                    <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
                                        <Tooltip title="Neutrality Score">
                                            <Chip 
                                                label={`Neutrality: ${Math.round((summary.neutralityScore || 0) * 100)}%`}
                                                size="small"
                                            />
                                        </Tooltip>
                                        <Tooltip title="Confidence">
                                            <Chip 
                                                label={`Confidence: ${Math.round((summary.confidence || 0) * 100)}%`}
                                                size="small"
                                            />
                                        </Tooltip>
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* AI Action Items Tab */}
            {activeTab === 4 && (
                <Box>
                    <Button
                        variant="contained"
                        startIcon={<IdeaIcon />}
                        onClick={handleExtractAIActions}
                        sx={{ mb: 2 }}
                        disabled={loading}
                    >
                        Extract Action Items with AI
                    </Button>
                    <Stack spacing={2}>
                        {aiActionItems.map((item) => (
                            <Card key={item.id}>
                                <CardContent>
                                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start">
                                        <Box sx={{ flex: 1 }}>
                                            <Typography variant="h6">{item.title}</Typography>
                                            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                                                {item.description}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 2 }}>
                                                Confidence: {Math.round((item.confidence || 0) * 100)}%
                                            </Typography>
                                            <Chip 
                                                label={item.verificationStatus} 
                                                size="small"
                                                sx={{ mt: 1 }}
                                                color={item.verificationStatus === 'verified' ? 'success' : 'default'}
                                            />
                                        </Box>
                                        {item.verificationStatus === 'pending' && (
                                            <Stack direction="row" spacing={1}>
                                                <Button 
                                                    size="small" 
                                                    color="success"
                                                    onClick={() => handleVerifyAIAction(item.id, 'verified')}
                                                >
                                                    Verify
                                                </Button>
                                                <Button 
                                                    size="small" 
                                                    color="error"
                                                    onClick={() => handleVerifyAIAction(item.id, 'rejected')}
                                                >
                                                    Reject
                                                </Button>
                                            </Stack>
                                        )}
                                    </Stack>
                                </CardContent>
                            </Card>
                        ))}
                    </Stack>
                </Box>
            )}

            {/* Meeting Brief Tab */}
            {activeTab === 5 && (
                <Box>
                    {!meetingBrief && (
                        <Button
                            variant="contained"
                            startIcon={<DescriptionIcon />}
                            onClick={handleGenerateBrief}
                            sx={{ mb: 2 }}
                            disabled={loading}
                        >
                            Generate Meeting Brief
                        </Button>
                    )}
                    {meetingBrief && (
                        <Card>
                            <CardContent>
                                <Typography variant="h5" gutterBottom>Meeting Brief</Typography>
                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="h6" gutterBottom>Context Summary</Typography>
                                <Typography variant="body1" paragraph>
                                    {meetingBrief.contextSummary}
                                </Typography>

                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="h6" gutterBottom>Suggested Preparation</Typography>
                                <ul>
                                    {meetingBrief.suggestedPreparation && meetingBrief.suggestedPreparation.map((prep, idx) => (
                                        <li key={idx}>
                                            <Typography variant="body1">{prep}</Typography>
                                        </li>
                                    ))}
                                </ul>

                                <Divider sx={{ my: 2 }} />
                                
                                <Typography variant="caption" color="text.secondary">
                                    Generated: {new Date(meetingBrief.generatedAt).toLocaleString()}
                                </Typography>
                            </CardContent>
                        </Card>
                    )}
                </Box>
            )}

            {/* Dialogs */}

            {/* Decision Log Dialog */}
            <Dialog open={decisionDialog} onClose={() => setDecisionDialog(false)} maxWidth="md" fullWidth>
                <DialogTitle>Create Decision Log</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Title"
                        value={decisionForm.title}
                        onChange={(e) => setDecisionForm({ ...decisionForm, title: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={decisionForm.description}
                        onChange={(e) => setDecisionForm({ ...decisionForm, description: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={2}
                    />
                    <TextField
                        fullWidth
                        label="Rationale"
                        value={decisionForm.rationale}
                        onChange={(e) => setDecisionForm({ ...decisionForm, rationale: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={3}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Decision"
                        value={decisionForm.decision}
                        onChange={(e) => setDecisionForm({ ...decisionForm, decision: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={3}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Tags (comma-separated)"
                        value={decisionForm.tags.join(', ')}
                        onChange={(e) => setDecisionForm({
                            ...decisionForm,
                            tags: e.target.value.split(',').map(t => t.trim()).filter(t => t)
                        })}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setDecisionDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateDecision} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Follow-Up Task Dialog */}
            <Dialog open={taskDialog} onClose={() => setTaskDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Follow-Up Task</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Title"
                        value={taskForm.title}
                        onChange={(e) => setTaskForm({ ...taskForm, title: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={taskForm.description}
                        onChange={(e) => setTaskForm({ ...taskForm, description: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={2}
                    />
                    <TextField
                        fullWidth
                        label="Assigned To (User ID)"
                        value={taskForm.assignedTo}
                        onChange={(e) => setTaskForm({ ...taskForm, assignedTo: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Due Date"
                        type="datetime-local"
                        value={taskForm.dueDate}
                        onChange={(e) => setTaskForm({ ...taskForm, dueDate: e.target.value })}
                        sx={{ mt: 2 }}
                        InputLabelProps={{ shrink: true }}
                        required
                    />
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Priority</InputLabel>
                        <Select
                            value={taskForm.priority}
                            onChange={(e) => setTaskForm({ ...taskForm, priority: e.target.value })}
                        >
                            <MenuItem value="low">Low</MenuItem>
                            <MenuItem value="medium">Medium</MenuItem>
                            <MenuItem value="high">High</MenuItem>
                            <MenuItem value="critical">Critical</MenuItem>
                        </Select>
                    </FormControl>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTaskDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateTask} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Outcome Tracker Dialog */}
            <Dialog open={outcomeDialog} onClose={() => setOutcomeDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Create Outcome Tracker</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Metric"
                        value={outcomeForm.metric}
                        onChange={(e) => setOutcomeForm({ ...outcomeForm, metric: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                label="Target Value"
                                type="number"
                                value={outcomeForm.targetValue}
                                onChange={(e) => setOutcomeForm({ ...outcomeForm, targetValue: parseFloat(e.target.value) })}
                                required
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                label="Actual Value"
                                type="number"
                                value={outcomeForm.actualValue}
                                onChange={(e) => setOutcomeForm({ ...outcomeForm, actualValue: parseFloat(e.target.value) })}
                            />
                        </Grid>
                        <Grid item xs={4}>
                            <TextField
                                fullWidth
                                label="Unit"
                                value={outcomeForm.unit}
                                onChange={(e) => setOutcomeForm({ ...outcomeForm, unit: e.target.value })}
                                required
                            />
                        </Grid>
                    </Grid>
                    <TextField
                        fullWidth
                        label="Measurement Date"
                        type="date"
                        value={outcomeForm.measurementDate}
                        onChange={(e) => setOutcomeForm({ ...outcomeForm, measurementDate: e.target.value })}
                        sx={{ mt: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                    <TextField
                        fullWidth
                        label="Notes"
                        value={outcomeForm.notes}
                        onChange={(e) => setOutcomeForm({ ...outcomeForm, notes: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={2}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOutcomeDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateOutcome} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Topic Dialog */}
            <Dialog open={topicDialog} onClose={() => setTopicDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Meeting Topic</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Topic"
                        value={topicForm.topic}
                        onChange={(e) => setTopicForm({ ...topicForm, topic: e.target.value })}
                        sx={{ mt: 2 }}
                        required
                    />
                    <TextField
                        fullWidth
                        label="Description"
                        value={topicForm.description}
                        onChange={(e) => setTopicForm({ ...topicForm, description: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={2}
                    />
                    <TextField
                        fullWidth
                        label="Keywords (comma-separated)"
                        value={topicForm.keywords.join(', ')}
                        onChange={(e) => setTopicForm({
                            ...topicForm,
                            keywords: e.target.value.split(',').map(k => k.trim()).filter(k => k)
                        })}
                        sx={{ mt: 2 }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTopicDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateTopic} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>

            {/* Highlight Dialog */}
            <Dialog open={highlightDialog} onClose={() => setHighlightDialog(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Transcript Highlight</DialogTitle>
                <DialogContent>
                    <TextField
                        fullWidth
                        label="Content"
                        value={highlightForm.content}
                        onChange={(e) => setHighlightForm({ ...highlightForm, content: e.target.value })}
                        sx={{ mt: 2 }}
                        multiline
                        rows={3}
                        required
                    />
                    <FormControl fullWidth sx={{ mt: 2 }}>
                        <InputLabel>Highlight Type</InputLabel>
                        <Select
                            value={highlightForm.highlightType}
                            onChange={(e) => setHighlightForm({ ...highlightForm, highlightType: e.target.value })}
                        >
                            <MenuItem value="decision">Decision</MenuItem>
                            <MenuItem value="action_item">Action Item</MenuItem>
                            <MenuItem value="key_point">Key Point</MenuItem>
                            <MenuItem value="question">Question</MenuItem>
                            <MenuItem value="agreement">Agreement</MenuItem>
                            <MenuItem value="disagreement">Disagreement</MenuItem>
                        </Select>
                    </FormControl>
                    <TextField
                        fullWidth
                        label="Timestamp"
                        type="datetime-local"
                        value={highlightForm.timestamp}
                        onChange={(e) => setHighlightForm({ ...highlightForm, timestamp: e.target.value })}
                        sx={{ mt: 2 }}
                        InputLabelProps={{ shrink: true }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setHighlightDialog(false)}>Cancel</Button>
                    <Button onClick={handleCreateHighlight} variant="contained">Create</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default KnowledgeIntelligence;
