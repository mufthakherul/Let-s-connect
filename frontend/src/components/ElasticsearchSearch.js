import React, { useState, useEffect } from 'react';
import {
    Container,
    Paper,
    TextField,
    Button,
    Box,
    Typography,
    List,
    ListItem,
    ListItemText,
    Chip,
    Stack,
    CircularProgress,
    Card,
    CardContent,
    Grid,
    Autocomplete,
    Slider,
    FormControlLabel,
    Checkbox
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import HistoryIcon from '@mui/icons-material/History';

const ElasticsearchSearch = () => {
    const [query, setQuery] = useState('');
    const [searchType, setSearchType] = useState('all');
    const [results, setResults] = useState([]);
    const [trending, setTrending] = useState([]);
    const [suggestions, setSuggestions] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        visibility: 'public',
        minLikes: 0,
        fromDate: null
    });
    const [analytics, setAnalytics] = useState(null);
    const [showFilters, setShowFilters] = useState(false);

    // Fetch trending on component load
    useEffect(() => {
        fetchTrending();
        fetchAnalytics();
    }, []);

    // Fetch suggestions as user types
    useEffect(() => {
        if (query.trim().length > 1) {
            fetchSuggestions();
        } else {
            setSuggestions([]);
        }
    }, [query]);

    const fetchTrending = async () => {
        try {
            const response = await fetch(
                'http://localhost:8000/search/trending?type=posts&days=7&limit=10',
                {
                    headers: { 'x-user-id': localStorage.getItem('userId') }
                }
            );
            if (response.ok) {
                const data = await response.json();
                setTrending(data.trending);
            }
        } catch (error) {
            console.error('Failed to fetch trending:', error);
        }
    };

    const fetchSuggestions = async () => {
        try {
            const response = await fetch(
                `http://localhost:8000/search/suggest?query=${encodeURIComponent(query)}&type=${searchType}&limit=8`,
                {
                    headers: { 'x-user-id': localStorage.getItem('userId') }
                }
            );
            if (response.ok) {
                const data = await response.json();
                setSuggestions(data.suggestions);
            }
        } catch (error) {
            console.error('Failed to fetch suggestions:', error);
        }
    };

    const fetchAnalytics = async () => {
        try {
            const response = await fetch(
                'http://localhost:8000/search/analytics?type=posts&days=30',
                {
                    headers: { 'x-user-id': localStorage.getItem('userId') }
                }
            );
            if (response.ok) {
                const data = await response.json();
                setAnalytics(data);
            }
        } catch (error) {
            console.error('Failed to fetch analytics:', error);
        }
    };

    const handleSearch = async (e) => {
        e.preventDefault();
        if (!query.trim()) return;

        setLoading(true);
        try {
            const response = await fetch('http://localhost:8000/search/elasticsearch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'x-user-id': localStorage.getItem('userId')
                },
                body: JSON.stringify({
                    query: query,
                    type: searchType,
                    limit: 20,
                    offset: 0,
                    filters: filters
                })
            });

            if (response.ok) {
                const data = await response.json();
                setResults(data.results);
            }
        } catch (error) {
            console.error('Search failed:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSuggestionClick = (suggestion) => {
        setQuery(suggestion);
    };

    const getResultTypeColor = (type) => {
        const colors = { posts: 'primary', comments: 'secondary', videos: 'success' };
        return colors[type] || 'default';
    };

    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Typography variant="h4" gutterBottom sx={{ mb: 3 }}>
                Advanced Search
            </Typography>

            {/* Search Box */}
            <Paper elevation={3} sx={{ p: 3, mb: 4 }}>
                <form onSubmit={handleSearch}>
                    <Stack spacing={2}>
                        <Autocomplete
                            freeSolo
                            options={suggestions}
                            value={query}
                            onChange={(event, newValue) => {
                                setQuery(newValue || '');
                            }}
                            onInputChange={(event, newInputValue) => {
                                setQuery(newInputValue);
                            }}
                            renderInput={(params) => (
                                <TextField
                                    {...params}
                                    label="Search content..."
                                    placeholder="Search posts, comments, videos..."
                                    InputProps={{
                                        ...params.InputProps,
                                        startAdornment: <SearchIcon sx={{ mr: 1 }} />
                                    }}
                                />
                            )}
                        />

                        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                            <TextField
                                select
                                label="Content Type"
                                value={searchType}
                                onChange={(e) => setSearchType(e.target.value)}
                                SelectProps={{
                                    native: true
                                }}
                                sx={{ minWidth: 150 }}
                            >
                                <option value="all">All Types</option>
                                <option value="posts">Posts</option>
                                <option value="comments">Comments</option>
                                <option value="videos">Videos</option>
                            </TextField>

                            <Button
                                variant="outlined"
                                onClick={() => setShowFilters(!showFilters)}
                            >
                                {showFilters ? 'Hide Filters' : 'Show Filters'}
                            </Button>

                            <Button
                                type="submit"
                                variant="contained"
                                disabled={loading || !query.trim()}
                                startIcon={loading ? <CircularProgress size={20} /> : <SearchIcon />}
                            >
                                Search
                            </Button>
                        </Stack>

                        {/* Advanced Filters */}
                        {showFilters && (
                            <Stack spacing={2} sx={{ pt: 2, borderTop: '1px solid #eee' }}>
                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Visibility
                                    </Typography>
                                    <TextField
                                        select
                                        fullWidth
                                        value={filters.visibility}
                                        onChange={(e) => setFilters({ ...filters, visibility: e.target.value })}
                                        SelectProps={{ native: true }}
                                    >
                                        <option value="public">Public</option>
                                        <option value="friends">Friends Only</option>
                                        <option value="private">Private</option>
                                    </TextField>
                                </Box>

                                <Box>
                                    <Typography variant="subtitle2" gutterBottom>
                                        Minimum Likes: {filters.minLikes}
                                    </Typography>
                                    <Slider
                                        value={filters.minLikes}
                                        onChange={(e, val) => setFilters({ ...filters, minLikes: val })}
                                        min={0}
                                        max={1000}
                                        step={10}
                                    />
                                </Box>

                                <TextField
                                    type="date"
                                    label="From Date"
                                    value={filters.fromDate || ''}
                                    onChange={(e) => setFilters({ ...filters, fromDate: e.target.value })}
                                    InputLabelProps={{ shrink: true }}
                                    fullWidth
                                />
                            </Stack>
                        )}
                    </Stack>
                </form>
            </Paper>

            <Grid container spacing={3}>
                {/* Trending Section */}
                <Grid item xs={12} md={4}>
                    <Paper elevation={2} sx={{ p: 2 }}>
                        <Stack direction="row" alignItems="center" sx={{ mb: 2 }}>
                            <TrendingUpIcon sx={{ mr: 1 }} />
                            <Typography variant="h6">Trending Now</Typography>
                        </Stack>
                        <Stack spacing={1}>
                            {trending.map((item, idx) => (
                                <Chip
                                    key={idx}
                                    label={`${item.value} (${item.count})`}
                                    onClick={() => {
                                        setQuery(item.value);
                                    }}
                                    variant="outlined"
                                    sx={{ justifyContent: 'flex-start' }}
                                />
                            ))}
                        </Stack>
                    </Paper>

                    {/* Analytics */}
                    {analytics && (
                        <Card sx={{ mt: 2 }}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Statistics
                                </Typography>
                                <Stack spacing={1}>
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">
                                            Total Content
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {analytics.totalDocuments.toLocaleString()}
                                        </Typography>
                                    </Box>
                                    <Box>
                                        <Typography variant="caption" color="textSecondary">
                                            Avg Engagement
                                        </Typography>
                                        <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                                            {analytics.avgEngagement?.toFixed(2)} likes
                                        </Typography>
                                    </Box>
                                </Stack>
                            </CardContent>
                        </Card>
                    )}
                </Grid>

                {/* Search Results */}
                <Grid item xs={12} md={8}>
                    {loading ? (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                            <CircularProgress />
                        </Box>
                    ) : results.length > 0 ? (
                        <Stack spacing={2}>
                            <Typography variant="subtitle2">
                                Found {results.length} results
                            </Typography>
                            {results.map((result) => (
                                <Card key={result.id}>
                                    <CardContent>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                                            <Chip
                                                label={result.index}
                                                color={getResultTypeColor(result.index)}
                                                size="small"
                                                variant="outlined"
                                            />
                                            <Typography variant="caption" color="textSecondary">
                                                Relevance: {result.score.toFixed(2)}
                                            </Typography>
                                        </Box>
                                        <Typography variant="body2" paragraph>
                                            {result.highlight?.content?.[0] || result.content || result.title || '...'}
                                        </Typography>
                                        <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                                            <Chip label={`${result.likes || 0} likes`} size="small" />
                                            {result.comments && <Chip label={`${result.comments} comments`} size="small" />}
                                            {result.views && <Chip label={`${result.views} views`} size="small" />}
                                        </Stack>
                                    </CardContent>
                                </Card>
                            ))}
                        </Stack>
                    ) : query && !loading ? (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <Typography color="textSecondary">
                                No results found for "{query}"
                            </Typography>
                        </Paper>
                    ) : (
                        <Paper sx={{ p: 3, textAlign: 'center' }}>
                            <SearchIcon sx={{ fontSize: 40, color: 'textSecondary', mb: 1 }} />
                            <Typography color="textSecondary">
                                Start searching to see results
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Container>
    );
};

export default ElasticsearchSearch;
