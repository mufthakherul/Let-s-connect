import React, { useMemo, useState, useEffect } from 'react';
import {
    Box,
    Card,
    CardContent,
    Typography,
    Grid,
    Button,
    TextField,
    Stack,
    Tabs,
    Tab,
    FormControl,
    Select,
    MenuItem,
    Chip
} from '@mui/material';
import toast from 'react-hot-toast';
import api from '../utils/api';

const TASK_STATUSES = ['todo', 'in_progress', 'review', 'done'];

function Projects({ user }) {
    const [tab, setTab] = useState(0);
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [projectForm, setProjectForm] = useState({ name: '', description: '', visibility: 'private' });
    const [taskForm, setTaskForm] = useState({ title: '', description: '', status: 'todo' });
    const [issueForm, setIssueForm] = useState({ title: '', description: '', labels: '' });
    const [milestoneForm, setMilestoneForm] = useState({ title: '', description: '', dueDate: '' });
    const [milestones, setMilestones] = useState([]);

    useEffect(() => {
        if (user?.id) {
            fetchProjects();
        }
    }, [user?.id]);

    useEffect(() => {
        if (selectedProject?.id) {
            fetchProjectDetails(selectedProject.id);
            fetchMilestones(selectedProject.id);
        }
    }, [selectedProject?.id]);

    const fetchProjects = async () => {
        try {
            const response = await api.get('/collaboration/projects', {
                params: { ownerId: user.id }
            });
            setProjects(response.data);
            if (!selectedProject && response.data.length) {
                setSelectedProject(response.data[0]);
            }
        } catch (err) {
            console.error('Failed to fetch projects:', err);
            toast.error('Failed to load projects');
        }
    };

    const fetchProjectDetails = async (projectId) => {
        try {
            const response = await api.get(`/collaboration/projects/${projectId}`);
            setSelectedProject(response.data);
        } catch (err) {
            console.error('Failed to fetch project:', err);
            toast.error('Failed to load project');
        }
    };

    const fetchMilestones = async (projectId) => {
        try {
            const response = await api.get(`/collaboration/projects/${projectId}/milestones`);
            setMilestones(response.data);
        } catch (err) {
            console.error('Failed to fetch milestones:', err);
            toast.error('Failed to load milestones');
        }
    };

    const handleCreateProject = async () => {
        if (!projectForm.name.trim()) {
            toast.error('Project name required');
            return;
        }

        try {
            const response = await api.post('/collaboration/projects', {
                ...projectForm,
                ownerId: user.id
            });
            setProjects([response.data, ...projects]);
            setProjectForm({ name: '', description: '', visibility: 'private' });
            setSelectedProject(response.data);
            toast.success('Project created');
        } catch (err) {
            console.error('Failed to create project:', err);
            toast.error(err.response?.data?.error || 'Failed to create project');
        }
    };

    const handleCreateTask = async () => {
        if (!selectedProject?.id || !taskForm.title.trim()) {
            toast.error('Task title required');
            return;
        }

        try {
            await api.post('/collaboration/tasks', {
                ...taskForm,
                projectId: selectedProject.id
            });
            await fetchProjectDetails(selectedProject.id);
            setTaskForm({ title: '', description: '', status: 'todo' });
            toast.success('Task added');
        } catch (err) {
            console.error('Failed to create task:', err);
            toast.error(err.response?.data?.error || 'Failed to create task');
        }
    };

    const handleMoveTask = async (taskId, status) => {
        try {
            await api.put(`/collaboration/tasks/${taskId}`, { status });
            await fetchProjectDetails(selectedProject.id);
        } catch (err) {
            console.error('Failed to move task:', err);
            toast.error(err.response?.data?.error || 'Failed to update task');
        }
    };

    const handleCreateIssue = async () => {
        if (!selectedProject?.id || !issueForm.title.trim()) {
            toast.error('Issue title required');
            return;
        }

        try {
            await api.post('/collaboration/issues', {
                projectId: selectedProject.id,
                title: issueForm.title,
                description: issueForm.description,
                labels: issueForm.labels
                    .split(',')
                    .map((label) => label.trim())
                    .filter(Boolean)
            });
            await fetchProjectDetails(selectedProject.id);
            setIssueForm({ title: '', description: '', labels: '' });
            toast.success('Issue created');
        } catch (err) {
            console.error('Failed to create issue:', err);
            toast.error(err.response?.data?.error || 'Failed to create issue');
        }
    };

    const handleCreateMilestone = async () => {
        if (!selectedProject?.id || !milestoneForm.title.trim()) {
            toast.error('Milestone title required');
            return;
        }

        try {
            await api.post('/collaboration/milestones', {
                projectId: selectedProject.id,
                title: milestoneForm.title,
                description: milestoneForm.description,
                dueDate: milestoneForm.dueDate || null
            });
            await fetchMilestones(selectedProject.id);
            setMilestoneForm({ title: '', description: '', dueDate: '' });
            toast.success('Milestone created');
        } catch (err) {
            console.error('Failed to create milestone:', err);
            toast.error(err.response?.data?.error || 'Failed to create milestone');
        }
    };

    const handleAssignMilestone = async (issueId, milestoneId) => {
        try {
            await api.post(`/collaboration/issues/${issueId}/milestone`, { milestoneId });
            await fetchMilestones(selectedProject.id);
            await fetchProjectDetails(selectedProject.id);
            toast.success('Milestone assigned');
        } catch (err) {
            console.error('Failed to assign milestone:', err);
            toast.error(err.response?.data?.error || 'Failed to assign milestone');
        }
    };

    const handleCloseMilestone = async (milestoneId) => {
        try {
            await api.put(`/collaboration/milestones/${milestoneId}`, { status: 'closed' });
            await fetchMilestones(selectedProject.id);
            toast.success('Milestone closed');
        } catch (err) {
            console.error('Failed to close milestone:', err);
            toast.error(err.response?.data?.error || 'Failed to close milestone');
        }
    };

    const tasksByStatus = useMemo(() => {
        const grouped = {};
        TASK_STATUSES.forEach((status) => {
            grouped[status] = [];
        });
        (selectedProject?.Tasks || []).forEach((task) => {
            grouped[task.status]?.push(task);
        });
        return grouped;
    }, [selectedProject]);

    return (
        <Box>
            <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
                <Tab label="Projects" />
                <Tab label="Board" />
                <Tab label="Issues" />
                <Tab label="Milestones" />
            </Tabs>

            {tab === 0 && (
                <Stack spacing={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Create Project
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="Project Name"
                                    value={projectForm.name}
                                    onChange={(e) => setProjectForm((prev) => ({ ...prev, name: e.target.value }))}
                                />
                                <TextField
                                    label="Description"
                                    value={projectForm.description}
                                    onChange={(e) => setProjectForm((prev) => ({ ...prev, description: e.target.value }))}
                                    multiline
                                    minRows={2}
                                />
                                <FormControl>
                                    <Select
                                        value={projectForm.visibility}
                                        onChange={(e) => setProjectForm((prev) => ({ ...prev, visibility: e.target.value }))}
                                    >
                                        <MenuItem value="private">Private</MenuItem>
                                        <MenuItem value="public">Public</MenuItem>
                                    </Select>
                                </FormControl>
                                <Button variant="contained" onClick={handleCreateProject}>
                                    Create Project
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Grid container spacing={2}>
                        {projects.map((project) => (
                            <Grid item xs={12} md={6} key={project.id}>
                                <Card
                                    variant={selectedProject?.id === project.id ? 'elevation' : 'outlined'}
                                    onClick={() => setSelectedProject(project)}
                                    sx={{ cursor: 'pointer' }}
                                >
                                    <CardContent>
                                        <Typography variant="h6">{project.name}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {project.description || 'No description'}
                                        </Typography>
                                        <Chip size="small" label={project.visibility} sx={{ mt: 1 }} />
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Stack>
            )}

            {tab === 1 && (
                <Stack spacing={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Add Task
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="Task Title"
                                    value={taskForm.title}
                                    onChange={(e) => setTaskForm((prev) => ({ ...prev, title: e.target.value }))}
                                />
                                <TextField
                                    label="Description"
                                    value={taskForm.description}
                                    onChange={(e) => setTaskForm((prev) => ({ ...prev, description: e.target.value }))}
                                    multiline
                                    minRows={2}
                                />
                                <FormControl>
                                    <Select
                                        value={taskForm.status}
                                        onChange={(e) => setTaskForm((prev) => ({ ...prev, status: e.target.value }))}
                                    >
                                        {TASK_STATUSES.map((status) => (
                                            <MenuItem key={status} value={status}>
                                                {status.replace('_', ' ')}
                                            </MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                                <Button variant="contained" onClick={handleCreateTask}>
                                    Add Task
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Grid container spacing={2}>
                        {TASK_STATUSES.map((status) => (
                            <Grid item xs={12} md={3} key={status}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1" gutterBottom>
                                            {status.replace('_', ' ').toUpperCase()}
                                        </Typography>
                                        <Stack spacing={1}>
                                            {(tasksByStatus[status] || []).map((task) => (
                                                <Card key={task.id} variant="outlined">
                                                    <CardContent>
                                                        <Typography variant="subtitle2">{task.title}</Typography>
                                                        <Typography variant="body2" color="text.secondary">
                                                            {task.description || 'No description'}
                                                        </Typography>
                                                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                                            {TASK_STATUSES.filter((s) => s !== task.status).map((next) => (
                                                                <Button
                                                                    key={next}
                                                                    size="small"
                                                                    onClick={() => handleMoveTask(task.id, next)}
                                                                >
                                                                    Move to {next.replace('_', ' ')}
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
                        ))}
                    </Grid>
                </Stack>
            )}

            {tab === 2 && (
                <Stack spacing={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Create Issue
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="Issue Title"
                                    value={issueForm.title}
                                    onChange={(e) => setIssueForm((prev) => ({ ...prev, title: e.target.value }))}
                                />
                                <TextField
                                    label="Description"
                                    value={issueForm.description}
                                    onChange={(e) => setIssueForm((prev) => ({ ...prev, description: e.target.value }))}
                                    multiline
                                    minRows={2}
                                />
                                <TextField
                                    label="Labels (comma separated)"
                                    value={issueForm.labels}
                                    onChange={(e) => setIssueForm((prev) => ({ ...prev, labels: e.target.value }))}
                                />
                                <Button variant="contained" onClick={handleCreateIssue}>
                                    Create Issue
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Grid container spacing={2}>
                        {(selectedProject?.Issues || []).map((issue) => (
                            <Grid item xs={12} md={6} key={issue.id}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1">{issue.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {issue.description || 'No description'}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                            {(issue.labels || []).map((label) => (
                                                <Chip key={label} size="small" label={label} />
                                            ))}
                                        </Stack>
                                        <FormControl fullWidth sx={{ mt: 2 }}>
                                            <Select
                                                value={issue.milestoneId || ''}
                                                displayEmpty
                                                onChange={(e) => handleAssignMilestone(issue.id, e.target.value || null)}
                                            >
                                                <MenuItem value="">No milestone</MenuItem>
                                                {milestones.map((milestone) => (
                                                    <MenuItem key={milestone.id} value={milestone.id}>
                                                        {milestone.title}
                                                    </MenuItem>
                                                ))}
                                            </Select>
                                        </FormControl>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Stack>
            )}

            {tab === 3 && (
                <Stack spacing={3}>
                    <Card>
                        <CardContent>
                            <Typography variant="h6" gutterBottom>
                                Create Milestone
                            </Typography>
                            <Stack spacing={2}>
                                <TextField
                                    label="Title"
                                    value={milestoneForm.title}
                                    onChange={(e) => setMilestoneForm((prev) => ({ ...prev, title: e.target.value }))}
                                />
                                <TextField
                                    label="Description"
                                    value={milestoneForm.description}
                                    onChange={(e) => setMilestoneForm((prev) => ({ ...prev, description: e.target.value }))}
                                    multiline
                                    minRows={2}
                                />
                                <TextField
                                    label="Due Date"
                                    type="date"
                                    InputLabelProps={{ shrink: true }}
                                    value={milestoneForm.dueDate}
                                    onChange={(e) => setMilestoneForm((prev) => ({ ...prev, dueDate: e.target.value }))}
                                />
                                <Button variant="contained" onClick={handleCreateMilestone}>
                                    Create Milestone
                                </Button>
                            </Stack>
                        </CardContent>
                    </Card>

                    <Grid container spacing={2}>
                        {milestones.map((milestone) => (
                            <Grid item xs={12} md={6} key={milestone.id}>
                                <Card variant="outlined">
                                    <CardContent>
                                        <Typography variant="subtitle1">{milestone.title}</Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {milestone.description || 'No description'}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1, flexWrap: 'wrap' }}>
                                            <Chip size="small" label={`Status: ${milestone.status}`} />
                                            <Chip size="small" label={`Issues: ${milestone.totalIssues || 0}`} />
                                            <Chip size="small" label={`Done: ${milestone.completedIssues || 0}`} />
                                        </Stack>
                                        {milestone.status !== 'closed' && (
                                            <Button size="small" sx={{ mt: 2 }} onClick={() => handleCloseMilestone(milestone.id)}>
                                                Close Milestone
                                            </Button>
                                        )}
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Stack>
            )}
        </Box>
    );
}

export default Projects;
