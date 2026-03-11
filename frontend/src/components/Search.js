import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
    Paper,
    Typography,
    Box,
    TextField,
    Button,
    Tabs,
    Tab,
    List,
    ListItem,
    ListItemText,
    Chip,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Grid,
    CircularProgress,
    Alert,
    Card,
    CardContent,
    Divider,
    Avatar,
    ListItemAvatar,
    Stack,
    Collapse,
    IconButton,
    Tooltip,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Accordion,
    AccordionSummary,
    AccordionDetails,
} from '@mui/material';
import {
    Search as SearchIcon,
    Schedule,
    Person as PersonIcon,
    Group as GroupIcon,
    Pages as PagesIcon,
    Tune,
    TravelExplore,
    Bookmark as BookmarkIcon,
    BookmarkBorder as BookmarkBorderIcon,
    AutoAwesome as AiIcon,
    ExpandMore as ExpandMoreIcon,
    Delete as DeleteIcon,
    FilterList as FilterListIcon,
    SmartToy as SmartToyIcon,
    PlayArrow as RunIcon,
    Close as CloseIcon,
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';
import { buildProfilePath } from '../utils/profileRoutes';
import PageShell from './common/PageShell';
import { EmptySearch } from './common/EmptyState';
import { ContentSkeleton } from './common/EnhancedSkeleton';

const SEARCH_TYPES = [
    { value: 'all', label: 'All' },
    { value: 'posts', label: 'Posts' },
    { value: 'comments', label: 'Comments' },
    { value: 'blogs', label: 'Blogs' },
    { value: 'users', label: 'Users' },
    { value: 'groups', label: 'Groups' },
    { value: 'pages', label: 'Pages' },
];

const SORT_OPTIONS = [
    { value: 'date', label: 'Newest' },
    { value: 'popularity', label: 'Most Popular' },
    { value: 'relevance', label: 'Most Relevant' },
];

const RESULT_CATEGORIES = [
    { key: 'posts', label: 'Posts' },
    { key: 'comments', label: 'Comments' },
    { key: 'blogs', label: 'Blogs' },
    { key: 'users', label: 'Users' },
    { key: 'groups', label: 'Groups' },
    { key: 'pages', label: 'Pages' },
    { key: 'hashtagPosts', label: 'Hashtags' },
];

/**
 * Renders backend snippet text that uses [[term]] highlight markers.
 */
const SnippetHighlight = ({ text, sx }) => {
    if (!text) return null;
    const parts = text.split(/(\[\[.*?\]\])/g);
    return (
        <Typography variant="body2" color="text.secondary" component="span" sx={sx}>
            {parts.map((part, i) => {
                const match = part.match(/^\[\[(.*?)\]\]$/);
                if (match) {
                    return (
                        <Box
                            key={i}
                            component="mark"
                            sx={{
                                bgcolor: 'warning.light',
                                color: 'warning.contrastText',
                                borderRadius: 0.5,
                                px: 0.25,
                                fontWeight: 600,
                            }}
                        >
                            {match[1]}
                        </Box>
                    );
                }
                return <React.Fragment key={i}>{part}</React.Fragment>;
            })}
        </Typography>
    );
};

const Search = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [activeTab, setActiveTab] = useState('posts');
    const [searchType, setSearchType] = useState('all');
    const [sortBy, setSortBy] = useState('date');
    const [searchHistory, setSearchHistory] = useState([]);
    const [error, setError] = useState('');

    // Date range filter
    const [showFilters, setShowFilters] = useState(false);
    const [dateFrom, setDateFrom] = useState('');
    const [dateTo, setDateTo] = useState('');

    // Saved searches
    const [savedSearches, setSavedSearches] = useState([]);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [saveName, setSaveName] = useState('');
    const [savedSearchesOpen, setSavedSearchesOpen] = useState(false);

    // AI features
    const [aiSummary, setAiSummary] = useState(null);
    const [aiSummaryLoading, setAiSummaryLoading] = useState(false);
    const [aiExpanded, setAiExpanded] = useState(null);
    const [aiExpandLoading, setAiExpandLoading] = useState(false);

    useEffect(() => {
        fetchSearchHistory();
        fetchSavedSearches();
    }, []);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const queryParam = params.get('q');
        if (queryParam) {
            setQuery(queryParam);
            handleSearch(queryParam);
        }
    }, [location.search]);

    const normalizedResults = useMemo(() => {
        if (!results) return null;
        return {
            posts: results.posts || { items: [], count: 0 },
            comments: results.comments || { items: [], count: 0 },
            blogs: results.blogs || { items: [], count: 0 },
            users: results.users || { items: [], count: 0 },
            groups: results.groups || { items: [], count: 0 },
            pages: results.pages || { items: [], count: 0 },
            hashtagPosts: results.hashtagPosts || { items: [], count: 0 },
        };
    }, [results]);

    const totalResults = useMemo(() => {
        if (!normalizedResults) return 0;
        return RESULT_CATEGORIES.reduce((sum, category) => {
            return sum + (normalizedResults[category.key]?.count || 0);
        }, 0);
    }, [normalizedResults]);

    const visibleCategories = useMemo(() => {
        if (!normalizedResults) return RESULT_CATEGORIES;
        return RESULT_CATEGORIES.filter((category) => normalizedResults[category.key]);
    }, [normalizedResults]);

    const fetchSearchHistory = async () => {
        try {
            const response = await api.get('/content-service/search/history');
            setSearchHistory(response.data.history || []);
        } catch (error) {
            console.error('Failed to fetch search history:', error);
        }
    };

    const handleSearch = async (searchQuery = query) => {
        if (!searchQuery || searchQuery.trim().length < 2) {
            setError('Please enter at least 2 characters');
            return;
        }

        setAiSummary(null);
        setAiExpanded(null);

        try {
            setLoading(true);
            setError('');

            const contentParams = {
                query: searchQuery,
                type: searchType === 'all' ? 'all' : searchType,
                sortBy,
                ...(dateFrom ? { dateFrom } : {}),
                ...(dateTo ? { dateTo } : {}),
            };

            // Search content-service for posts/comments/blogs/hashtags
            let contentResults = {
                posts: { items: [], count: 0 },
                comments: { items: [], count: 0 },
                blogs: { items: [], count: 0 },
                hashtagPosts: { items: [], count: 0 }
            };

            if (searchType === 'all' || ['posts', 'comments', 'blogs'].includes(searchType)) {
                const contentResponse = await api.get('/content-service/search', {
                    params: contentParams
                });
                contentResults = contentResponse.data.results || contentResults;
            }

            // Search users if type is all or users
            let users = { items: [], count: 0 };
            if (searchType === 'all' || searchType === 'users') {
                try {
                    const userResponse = await api.get('/user-service/search', {
                        params: { query: searchQuery }
                    });
                    users = { items: userResponse.data.users || [], count: userResponse.data.users?.length || 0 };
                } catch (err) {
                    console.error('User search failed:', err);
                }
            }

            // Search groups if type is all or groups
            let groups = { items: [], count: 0 };
            if (searchType === 'all' || searchType === 'groups') {
                try {
                    const groupsResponse = await api.get('/content-service/groups', {
                        params: { search: searchQuery }
                    });
                    groups = { items: groupsResponse.data || [], count: groupsResponse.data?.length || 0 };
                } catch (err) {
                    console.error('Groups search failed:', err);
                }
            }

            // Search pages if type is all or pages
            let pages = { items: [], count: 0 };
            if (searchType === 'all' || searchType === 'pages') {
                try {
                    const pagesResponse = await api.get('/user-service/pages/search', {
                        params: { query: searchQuery }
                    });
                    pages = { items: pagesResponse.data.pages || [], count: pagesResponse.data.pages?.length || 0 };
                } catch (err) {
                    console.error('Pages search failed:', err);
                }
            }

            const resultSet = { ...contentResults, users, groups, pages };
            setResults(resultSet);

            const firstNonEmptyCategory = RESULT_CATEGORIES.find(
                (category) => (resultSet[category.key]?.count || 0) > 0
            )?.key;
            setActiveTab(firstNonEmptyCategory || 'posts');

            // Save to history
            try {
                await api.post('/content-service/search/history', {
                    query: searchQuery,
                    type: searchType
                });
            } catch (saveError) {
                console.warn('Failed to save search history:', saveError);
            }

            fetchSearchHistory();
        } catch (error) {
            console.error('Search failed:', error);
            setError('Search failed. Please try again.');
        } finally {
            setLoading(false);
        }
    };

    const handleHistoryClick = (historyItem) => {
        setQuery(historyItem.query);
        setSearchType(historyItem.type || 'all');
        handleSearch(historyItem.query);
    };

    const fetchSavedSearches = async () => {
        try {
            const response = await api.get('/content-service/search/saved');
            setSavedSearches(response.data.searches || []);
        } catch (err) {
            console.error('Failed to fetch saved searches:', err);
        }
    };

    const handleSaveSearch = async () => {
        if (!saveName.trim() || !query.trim()) return;
        try {
            await api.post('/content-service/search/saved', {
                name: saveName.trim(),
                query: query.trim(),
                type: searchType,
                filters: { sortBy, dateFrom, dateTo },
            });
            setSaveDialogOpen(false);
            setSaveName('');
            fetchSavedSearches();
        } catch (err) {
            console.error('Failed to save search:', err);
        }
    };

    const handleDeleteSavedSearch = async (id) => {
        try {
            await api.delete(`/content-service/search/saved/${id}`);
            fetchSavedSearches();
        } catch (err) {
            console.error('Failed to delete saved search:', err);
        }
    };

    const handleRunSavedSearch = async (saved) => {
        setQuery(saved.query);
        setSearchType(saved.type || 'all');
        if (saved.filters?.sortBy) setSortBy(saved.filters.sortBy);
        if (saved.filters?.dateFrom) setDateFrom(saved.filters.dateFrom);
        if (saved.filters?.dateTo) setDateTo(saved.filters.dateTo);
        setSavedSearchesOpen(false);
        handleSearch(saved.query);
    };

    const handleAiSummary = async () => {
        if (!results || !query) return;
        setAiSummaryLoading(true);
        try {
            const flatResults = RESULT_CATEGORIES.flatMap(
                (cat) => (normalizedResults?.[cat.key]?.items || []).slice(0, 3)
            );
            const response = await api.post('/ai-service/search/summary', {
                query,
                results: flatResults.slice(0, 10),
            });
            setAiSummary(response.data);
        } catch (err) {
            console.error('AI summary failed:', err);
            setAiSummary({ summary: 'AI summary is currently unavailable.', themes: [], nextQueries: [] });
        } finally {
            setAiSummaryLoading(false);
        }
    };

    const handleSemanticExpand = async () => {
        if (!query) return;
        setAiExpandLoading(true);
        try {
            const response = await api.post('/ai-service/search/semantic-expand', {
                query,
                limit: 6,
            });
            setAiExpanded(response.data);
        } catch (err) {
            console.error('Semantic expand failed:', err);
            setAiExpanded(null);
        } finally {
            setAiExpandLoading(false);
        }
    };

    const renderResults = (items, type) => {
        if (!items || items.length === 0) {
            return <EmptySearch searchTerm={query} onReset={() => setQuery('')} />;
        }

        return (
            <List>
                {items.map((item, index) => (
                    <React.Fragment key={item.id || index}>
                        <ListItem
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}
                            onClick={() => {
                                if (type === 'users') navigate(buildProfilePath(item.username, item.id));
                                else if (type === 'groups') navigate(`/groups/${item.id}`);
                                else if (type === 'pages') navigate(`/pages/${item.id}`);
                            }}
                        >
                            {(type === 'users' || type === 'groups' || type === 'pages') && (
                                <Box sx={{ display: 'flex', alignItems: 'center', width: '100%', mb: 1 }}>
                                    <ListItemAvatar>
                                        <Avatar src={item.avatar || item.avatarUrl}>
                                            {type === 'users' && <PersonIcon />}
                                            {type === 'groups' && <GroupIcon />}
                                            {type === 'pages' && <PagesIcon />}
                                        </Avatar>
                                    </ListItemAvatar>
                                    <Box>
                                        <Typography variant="h6">
                                            {item.name || `${item.firstName || ''} ${item.lastName || ''}`.trim() || item.username}
                                        </Typography>
                                        {type === 'users' && (
                                            <Typography variant="body2" color="textSecondary">
                                                @{item.username}
                                            </Typography>
                                        )}
                                        {type === 'groups' && (
                                            <Chip label={item.privacy} size="small" sx={{ mt: 0.5 }} />
                                        )}
                                        {type === 'pages' && item.isVerified && (
                                            <Chip label="Verified" size="small" color="primary" sx={{ mt: 0.5 }} />
                                        )}
                                    </Box>
                                </Box>
                            )}
                            <ListItemText
                                primary={
                                    type !== 'users' && type !== 'groups' && type !== 'pages'
                                        ? (item.title || item.content?.substring(0, 100) + '...')
                                        : (item.description || item.bio)
                                }
                                secondary={
                                    <Box sx={{ mt: 1 }}>
                                        {/* Snippet with highlights */}
                                        {item.snippet && (
                                            <Box sx={{ mb: 1 }}>
                                                <SnippetHighlight text={item.snippet} />
                                            </Box>
                                        )}
                                        <Typography variant="caption" color="text.secondary">
                                            {item.createdAt ? new Date(item.createdAt).toLocaleString() : 'Unknown date'}
                                        </Typography>
                                        {item.likes !== undefined && (
                                            <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
                                                <Chip label={`${item.likes} likes`} size="small" />
                                                {item.comments !== undefined && (
                                                    <Chip label={`${item.comments} comments`} size="small" />
                                                )}
                                                {item.shares !== undefined && (
                                                    <Chip label={`${item.shares} shares`} size="small" />
                                                )}
                                            </Box>
                                        )}
                                        {type === 'groups' && item.memberCount !== undefined && (
                                            <Chip label={`${item.memberCount} members`} size="small" sx={{ mt: 1 }} />
                                        )}
                                        {type === 'pages' && item.followers !== undefined && (
                                            <Chip label={`${item.followers} followers`} size="small" sx={{ mt: 1 }} />
                                        )}
                                    </Box>
                                }
                            />
                        </ListItem>
                        <Divider />
                    </React.Fragment>
                ))}
            </List>
        );
    };

    const handleSubmit = () => {
        handleSearch();
    };

    const filterControls = (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', md: 'center' }}>
            <Chip icon={<Tune />} label={`Type: ${SEARCH_TYPES.find((t) => t.value === searchType)?.label || 'All'}`} size="small" />
            <Chip label={`Sort: ${SORT_OPTIONS.find((s) => s.value === sortBy)?.label || 'Newest'}`} size="small" variant="outlined" />
            {query ? <Chip label={`Query: "${query}"`} size="small" color="primary" /> : null}
        </Stack>
    );

    return (
        <PageShell
            title="Search"
            subtitle="Discover people, posts, groups, pages, and blogs with a consistent, accessible search experience."
            icon={<TravelExplore fontSize="large" />}
            actions={filterControls}
        >
            <Paper sx={{ p: 3, mb: 3, borderRadius: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Search query"
                            aria-label="Search query"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    e.preventDefault();
                                    handleSubmit();
                                }
                            }}
                            placeholder="Search posts, users, groups, pages..."
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                label="Type"
                                aria-label="Search type"
                            >
                                {SEARCH_TYPES.map((type) => (
                                    <MenuItem key={type.value} value={type.value}>{type.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Sort By</InputLabel>
                            <Select
                                value={sortBy}
                                onChange={(e) => setSortBy(e.target.value)}
                                label="Sort By"
                                aria-label="Sort search results"
                            >
                                {SORT_OPTIONS.map((option) => (
                                    <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                {/* Advanced filters toggle */}
                <Box sx={{ mt: 1.5, display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Button
                        size="small"
                        startIcon={<FilterListIcon />}
                        onClick={() => setShowFilters((v) => !v)}
                        variant="text"
                        color="inherit"
                    >
                        {showFilters ? 'Hide Filters' : 'Date Filter'}
                    </Button>
                    {results && query && (
                        <>
                            <Tooltip title="Save this search">
                                <Button
                                    size="small"
                                    startIcon={<BookmarkBorderIcon />}
                                    onClick={() => { setSaveName(query); setSaveDialogOpen(true); }}
                                    variant="text"
                                >
                                    Save Search
                                </Button>
                            </Tooltip>
                            <Tooltip title="AI search summary">
                                <Button
                                    size="small"
                                    startIcon={aiSummaryLoading ? <CircularProgress size={14} /> : <AiIcon />}
                                    onClick={handleAiSummary}
                                    variant="text"
                                    color="secondary"
                                    disabled={aiSummaryLoading}
                                >
                                    AI Summary
                                </Button>
                            </Tooltip>
                        </>
                    )}
                    {savedSearches.length > 0 && (
                        <Button
                            size="small"
                            startIcon={<BookmarkIcon />}
                            onClick={() => setSavedSearchesOpen((v) => !v)}
                            variant="text"
                        >
                            Saved ({savedSearches.length})
                        </Button>
                    )}
                    {query && (
                        <Tooltip title="Expand with semantic terms">
                            <Button
                                size="small"
                                startIcon={aiExpandLoading ? <CircularProgress size={14} /> : <SmartToyIcon />}
                                onClick={handleSemanticExpand}
                                variant="text"
                                color="info"
                                disabled={aiExpandLoading}
                            >
                                Expand
                            </Button>
                        </Tooltip>
                    )}
                </Box>

                {/* Date range filter */}
                <Collapse in={showFilters}>
                    <Grid container spacing={2} sx={{ mt: 1 }}>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="From date"
                                type="date"
                                size="small"
                                value={dateFrom}
                                onChange={(e) => setDateFrom(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        <Grid item xs={12} sm={6}>
                            <TextField
                                fullWidth
                                label="To date"
                                type="date"
                                size="small"
                                value={dateTo}
                                onChange={(e) => setDateTo(e.target.value)}
                                InputLabelProps={{ shrink: true }}
                            />
                        </Grid>
                        {(dateFrom || dateTo) && (
                            <Grid item xs={12}>
                                <Button
                                    size="small"
                                    onClick={() => { setDateFrom(''); setDateTo(''); }}
                                    color="inherit"
                                >
                                    Clear dates
                                </Button>
                            </Grid>
                        )}
                    </Grid>
                </Collapse>

                {/* Saved searches panel */}
                <Collapse in={savedSearchesOpen && savedSearches.length > 0}>
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'action.hover', borderRadius: 2 }}>
                        <Typography variant="subtitle2" gutterBottom>Saved Searches</Typography>
                        <Stack spacing={0.5}>
                            {savedSearches.map((saved) => (
                                <Box key={saved.id} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <Typography variant="body2" sx={{ flex: 1 }}>{saved.name}</Typography>
                                    <Stack direction="row" spacing={0.5}>
                                        <Tooltip title="Run this search">
                                            <IconButton size="small" onClick={() => handleRunSavedSearch(saved)}>
                                                <RunIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                        <Tooltip title="Delete">
                                            <IconButton size="small" onClick={() => handleDeleteSavedSearch(saved.id)}>
                                                <DeleteIcon fontSize="small" />
                                            </IconButton>
                                        </Tooltip>
                                    </Stack>
                                </Box>
                            ))}
                        </Stack>
                    </Box>
                </Collapse>

                {/* Semantic expand suggestions */}
                {aiExpanded && (
                    <Box sx={{ mt: 2, p: 2, bgcolor: 'info.50', border: '1px solid', borderColor: 'info.light', borderRadius: 2 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle2" color="info.main">
                                <SmartToyIcon sx={{ fontSize: 16, mr: 0.5, verticalAlign: 'middle' }} />
                                Related search terms
                            </Typography>
                            <IconButton size="small" onClick={() => setAiExpanded(null)}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        {aiExpanded.intent && (
                            <Typography variant="caption" color="text.secondary" display="block" sx={{ mb: 1 }}>
                                Intent: {aiExpanded.intent}
                            </Typography>
                        )}
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                            {(aiExpanded.relatedTerms || []).map((term, i) => (
                                <Chip
                                    key={i}
                                    label={term}
                                    size="small"
                                    clickable
                                    onClick={() => { setQuery(term); handleSearch(term); setAiExpanded(null); }}
                                    color="info"
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </Box>
                )}

                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleSubmit}
                    startIcon={<SearchIcon />}
                    sx={{ mt: 2 }}
                    disabled={loading}
                >
                    {loading ? <CircularProgress size={24} /> : 'Search'}
                </Button>
            </Paper>

            {/* Save search dialog */}
            <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="xs" fullWidth>
                <DialogTitle>Save Search</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        fullWidth
                        label="Search name"
                        value={saveName}
                        onChange={(e) => setSaveName(e.target.value)}
                        sx={{ mt: 1 }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveSearch(); }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                    <Button onClick={handleSaveSearch} variant="contained" disabled={!saveName.trim()}>
                        Save
                    </Button>
                </DialogActions>
            </Dialog>

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
            )}

            {/* AI Summary Panel */}
            {aiSummary && (
                <Card sx={{ mb: 3, border: '1px solid', borderColor: 'secondary.light', borderRadius: 3 }}>
                    <CardContent>
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                            <Typography variant="subtitle1" fontWeight={600}>
                                <AiIcon sx={{ fontSize: 18, mr: 0.5, verticalAlign: 'middle', color: 'secondary.main' }} />
                                AI Search Summary
                            </Typography>
                            <IconButton size="small" onClick={() => setAiSummary(null)}>
                                <CloseIcon fontSize="small" />
                            </IconButton>
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1.5 }}>{aiSummary.summary}</Typography>
                        {(aiSummary.themes || []).length > 0 && (
                            <Box sx={{ mb: 1 }}>
                                <Typography variant="caption" color="text.secondary">Themes: </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {aiSummary.themes.map((t, i) => (
                                        <Chip key={i} label={t} size="small" variant="outlined" color="secondary" />
                                    ))}
                                </Box>
                            </Box>
                        )}
                        {(aiSummary.nextQueries || []).length > 0 && (
                            <Box>
                                <Typography variant="caption" color="text.secondary">Try also: </Typography>
                                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 0.5 }}>
                                    {aiSummary.nextQueries.map((q, i) => (
                                        <Chip
                                            key={i}
                                            label={q}
                                            size="small"
                                            clickable
                                            onClick={() => { setQuery(q); handleSearch(q); setAiSummary(null); }}
                                            color="secondary"
                                        />
                                    ))}
                                </Box>
                            </Box>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Search History */}
            {!results && searchHistory.length > 0 && (
                <Card sx={{ mb: 3 }}>
                    <CardContent>
                        <Typography variant="h6" gutterBottom>
                            <Schedule sx={{ mr: 1, verticalAlign: 'middle' }} />
                            Recent Searches
                        </Typography>
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 2 }}>
                            {searchHistory.slice(0, 10).map((item, index) => (
                                <Chip
                                    key={index}
                                    label={item.query}
                                    onClick={() => handleHistoryClick(item)}
                                    clickable
                                    variant="outlined"
                                />
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}

            {loading && (
                <Paper sx={{ p: 2, borderRadius: 3 }}>
                    <ContentSkeleton type="list" count={6} />
                </Paper>
            )}

            {/* Results */}
            {normalizedResults && !loading && (
                <Paper sx={{ borderRadius: 3 }}>
                    <Box sx={{ px: 2, pt: 2 }}>
                        <Typography variant="body2" color="text.secondary">
                            {totalResults.toLocaleString()} result{totalResults === 1 ? '' : 's'} found
                        </Typography>
                    </Box>
                    <Tabs
                        value={activeTab}
                        onChange={(e, v) => setActiveTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="Search results categories"
                    >
                        {visibleCategories.map((category) => (
                            <Tab
                                key={category.key}
                                value={category.key}
                                label={`${category.label} (${normalizedResults[category.key]?.count || 0})`}
                            />
                        ))}
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                        {renderResults(normalizedResults[activeTab]?.items || [], activeTab)}
                    </Box>
                </Paper>
            )}

            {normalizedResults && !loading && totalResults === 0 && (
                <Box sx={{ mt: 2 }}>
                    <EmptySearch searchTerm={query} onReset={() => setQuery('')} />
                </Box>
            )}
        </PageShell>
    );
};

export default Search;
