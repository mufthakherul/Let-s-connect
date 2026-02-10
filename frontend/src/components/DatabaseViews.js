import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    Button,
    Box,
    Typography,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    CircularProgress,
    Tabs,
    Tab,
    IconButton,
    Menu,
    Grid,
    Card,
    CardContent,
    CardMedia,
    Chip
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import TableChartIcon from '@mui/icons-material/TableChart';
import { getApiUrl } from '../utils/api';
import ViewWeekIcon from '@mui/icons-material/ViewWeek';
import ViewAgendaIcon from '@mui/icons-material/ViewAgenda';
import DashboardIcon from '@mui/icons-material/Dashboard';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import DeleteIcon from '@mui/icons-material/Delete';

const DatabaseViews = () => {
    const [databaseId, setDatabaseId] = useState('');
    const [views, setViews] = useState([]);
    const [properties, setProperties] = useState([]);
    const [selectedView, setSelectedView] = useState(null);
    const [loading, setLoading] = useState(false);
    const [openViewDialog, setOpenViewDialog] = useState(false);
    const [openPropertyDialog, setOpenPropertyDialog] = useState(false);
    const [viewName, setViewName] = useState('');
    const [viewType, setViewType] = useState('table');
    const [propertyName, setPropertyName] = useState('');
    const [propertyType, setPropertyType] = useState('text');
    const [propertyOptions, setPropertyOptions] = useState('');
    const [anchorEl, setAnchorEl] = useState(null);

    useEffect(() => {
        if (databaseId) {
            fetchViews();
            fetchProperties();
        }
    }, [databaseId]);

    const fetchViews = async () => {
        setLoading(true);
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(getApiUrl(`/databases/${databaseId}/views`), {
                headers: { 'x-user-id': userId }
            });

            if (response.ok) {
                const data = await response.json();
                setViews(data.views || []);
            }
        } catch (error) {
            console.error('Failed to fetch views:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchProperties = async () => {
        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(getApiUrl(`/databases/${databaseId}/properties`), {
                headers: { 'x-user-id': userId }
            });

            if (response.ok) {
                const data = await response.json();
                setProperties(data.properties || []);
            }
        } catch (error) {
            console.error('Failed to fetch properties:', error);
        }
    };

    const handleCreateView = async () => {
        if (!viewName.trim()) return;

        try {
            const userId = localStorage.getItem('userId');
            const response = await fetch(getApiUrl(`/databases/${databaseId}/views`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify({
                    name: viewName,
                    viewType: viewType,
                    config: {
                        filters: [],
                        sorts: [],
                        properties: properties.map(p => p.id),
                        groupBy: null
                    }
                })
            });

            if (response.ok) {
                setOpenViewDialog(false);
                setViewName('');
                setViewType('table');
                fetchViews();
            }
        } catch (error) {
            console.error('Failed to create view:', error);
        }
    };

    const handleCreateProperty = async () => {
        if (!propertyName.trim()) return;

        try {
            const userId = localStorage.getItem('userId');
            const body = {
                name: propertyName,
                type: propertyType
            };

            if (propertyType === 'select' || propertyType === 'multiselect') {
                body.options = propertyOptions
                    .split(',')
                    .map(opt => ({ name: opt.trim(), color: 'blue' }));
            }

            const response = await fetch(getApiUrl(`/databases/${databaseId}/properties`), {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': userId
                },
                body: JSON.stringify(body)
            });

            if (response.ok) {
                setOpenPropertyDialog(false);
                setPropertyName('');
                setPropertyType('text');
                setPropertyOptions('');
                fetchProperties();
                fetchViews(); // Refresh views to include new property
            }
        } catch (error) {
            console.error('Failed to create property:', error);
        }
    };

    const handleDeleteView = async (viewId) => {
        try {
            const userId = localStorage.getItem('userId');
            await fetch(getApiUrl(`/databases/views/${viewId}`), {
                method: 'DELETE',
                headers: { 'x-user-id': userId }
            });
            fetchViews();
            setSelectedView(null);
        } catch (error) {
            console.error('Failed to delete view:', error);
        }
    };

    const getViewIcon = (type) => {
        const icons = {
            table: <TableChartIcon />,
            gallery: <ViewWeekIcon />,
            list: <ViewAgendaIcon />,
            board: <DashboardIcon />
        };
        return icons[type] || <TableChartIcon />;
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Database Views Builder
            </Typography>

            {/* Database Selection */}
            <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                <Stack spacing={2}>
                    <TextField
                        fullWidth
                        label="Database ID"
                        value={databaseId}
                        onChange={(e) => setDatabaseId(e.target.value)}
                        placeholder="Enter database ID"
                    />
                </Stack>
            </Paper>

            {databaseId && (
                <>
                    {/* Tabs for Views & Properties */}
                    <Tabs value={selectedView ? 0 : 1} sx={{ mb: 3 }}>
                        <Tab label={`Views (${views.length})`} />
                        <Tab label={`Properties (${properties.length})`} />
                    </Tabs>

                    {/* Views Section */}
                    <Box sx={{ display: selectedView ? 'block' : 'none' }}>
                        <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Database Views</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenViewDialog(true)}
                                >
                                    New View
                                </Button>
                            </Box>

                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
                                    <CircularProgress />
                                </Box>
                            ) : views.length > 0 ? (
                                <Grid container spacing={2}>
                                    {views.map(view => (
                                        <Grid item xs={12} sm={6} md={4} key={view.id}>
                                            <Card
                                                sx={{
                                                    cursor: 'pointer',
                                                    '&:hover': { boxShadow: 4 },
                                                    position: 'relative'
                                                }}
                                                onClick={() => setSelectedView(view)}
                                            >
                                                <CardContent>
                                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', mb: 1 }}>
                                                        <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                            {getViewIcon(view.viewType)}
                                                            <Typography variant="h6">{view.name}</Typography>
                                                        </Box>
                                                        <IconButton
                                                            size="small"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setAnchorEl(e.currentTarget);
                                                            }}
                                                        >
                                                            <MoreVertIcon fontSize="small" />
                                                        </IconButton>
                                                    </Box>
                                                    <Chip
                                                        label={view.viewType.toUpperCase()}
                                                        size="small"
                                                        color="primary"
                                                        variant="outlined"
                                                    />
                                                </CardContent>
                                            </Card>
                                        </Grid>
                                    ))}
                                </Grid>
                            ) : (
                                <Typography color="textSecondary">No views created yet</Typography>
                            )}
                        </Paper>
                    </Box>

                    {/* Properties Section */}
                    <Box sx={{ display: selectedView ? 'none' : 'block' }}>
                        <Paper elevation={2} sx={{ p: 3 }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                <Typography variant="h6">Database Properties</Typography>
                                <Button
                                    variant="contained"
                                    startIcon={<AddIcon />}
                                    onClick={() => setOpenPropertyDialog(true)}
                                >
                                    New Property
                                </Button>
                            </Box>

                            {properties.length > 0 ? (
                                <Stack spacing={1}>
                                    {properties.map(prop => (
                                        <Paper key={prop.id} sx={{ p: 2, backgroundColor: '#f5f5f5' }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                                <Box>
                                                    <Typography variant="subtitle2">{prop.name}</Typography>
                                                    <Chip
                                                        label={prop.type}
                                                        size="small"
                                                        variant="outlined"
                                                        sx={{ mt: 0.5 }}
                                                    />
                                                    {prop.options && (
                                                        <Box sx={{ mt: 1 }}>
                                                            {prop.options.map((opt, idx) => (
                                                                <Chip
                                                                    key={idx}
                                                                    label={opt.name}
                                                                    size="small"
                                                                    sx={{ mr: 0.5, mb: 0.5 }}
                                                                />
                                                            ))}
                                                        </Box>
                                                    )}
                                                </Box>
                                                <IconButton size="small" color="error">
                                                    <DeleteIcon fontSize="small" />
                                                </IconButton>
                                            </Box>
                                        </Paper>
                                    ))}
                                </Stack>
                            ) : (
                                <Typography color="textSecondary">No properties defined yet</Typography>
                            )}
                        </Paper>
                    </Box>

                    {/* Create View Dialog */}
                    <Dialog open={openViewDialog} onClose={() => setOpenViewDialog(false)}>
                        <DialogTitle>Create New View</DialogTitle>
                        <DialogContent sx={{ pt: 2 }}>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="View Name"
                                    value={viewName}
                                    onChange={(e) => setViewName(e.target.value)}
                                    placeholder="e.g., All Posts, Draft Posts"
                                />
                                <FormControl fullWidth>
                                    <InputLabel>View Type</InputLabel>
                                    <Select
                                        value={viewType}
                                        label="View Type"
                                        onChange={(e) => setViewType(e.target.value)}
                                    >
                                        <MenuItem value="table">
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <TableChartIcon fontSize="small" />
                                                Table
                                            </Box>
                                        </MenuItem>
                                        <MenuItem value="gallery">
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <ViewWeekIcon fontSize="small" />
                                                Gallery
                                            </Box>
                                        </MenuItem>
                                        <MenuItem value="list">
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <ViewAgendaIcon fontSize="small" />
                                                List
                                            </Box>
                                        </MenuItem>
                                        <MenuItem value="board">
                                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                                                <DashboardIcon fontSize="small" />
                                                Board
                                            </Box>
                                        </MenuItem>
                                    </Select>
                                </FormControl>
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenViewDialog(false)}>Cancel</Button>
                            <Button
                                onClick={handleCreateView}
                                variant="contained"
                                disabled={!viewName.trim()}
                            >
                                Create
                            </Button>
                        </DialogActions>
                    </Dialog>

                    {/* Create Property Dialog */}
                    <Dialog open={openPropertyDialog} onClose={() => setOpenPropertyDialog(false)}>
                        <DialogTitle>Create New Property</DialogTitle>
                        <DialogContent sx={{ pt: 2 }}>
                            <Stack spacing={2}>
                                <TextField
                                    fullWidth
                                    label="Property Name"
                                    value={propertyName}
                                    onChange={(e) => setPropertyName(e.target.value)}
                                    placeholder="e.g., Title, Status, Priority"
                                />
                                <FormControl fullWidth>
                                    <InputLabel>Type</InputLabel>
                                    <Select
                                        value={propertyType}
                                        label="Type"
                                        onChange={(e) => setPropertyType(e.target.value)}
                                    >
                                        <MenuItem value="text">Text</MenuItem>
                                        <MenuItem value="number">Number</MenuItem>
                                        <MenuItem value="select">Select</MenuItem>
                                        <MenuItem value="multiselect">Multi-select</MenuItem>
                                        <MenuItem value="date">Date</MenuItem>
                                        <MenuItem value="checkbox">Checkbox</MenuItem>
                                        <MenuItem value="url">URL</MenuItem>
                                        <MenuItem value="email">Email</MenuItem>
                                    </Select>
                                </FormControl>

                                {(propertyType === 'select' || propertyType === 'multiselect') && (
                                    <TextField
                                        fullWidth
                                        label="Options (comma-separated)"
                                        value={propertyOptions}
                                        onChange={(e) => setPropertyOptions(e.target.value)}
                                        placeholder="e.g., High, Medium, Low"
                                        multiline
                                        rows={3}
                                    />
                                )}
                            </Stack>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={() => setOpenPropertyDialog(false)}>Cancel</Button>
                            <Button
                                onClick={handleCreateProperty}
                                variant="contained"
                                disabled={!propertyName.trim()}
                            >
                                Create
                            </Button>
                        </DialogActions>
                    </Dialog>
                </>
            )}
        </Container>
    );
};

export default DatabaseViews;
