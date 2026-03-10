import React, { useMemo, useState, useEffect } from 'react';
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
} from '@mui/material';
import {
    Search as SearchIcon,
    Schedule,
    Person as PersonIcon,
    Group as GroupIcon,
    Pages as PagesIcon,
    Tune,
    TravelExplore,
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

    useEffect(() => {
        fetchSearchHistory();
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

        try {
            setLoading(true);
            setError('');

            // Search content-service for posts/comments/blogs/hashtags
            let contentResults = {
                posts: { items: [], count: 0 },
                comments: { items: [], count: 0 },
                blogs: { items: [], count: 0 },
                hashtagPosts: { items: [], count: 0 }
            };

            if (searchType === 'all' || ['posts', 'comments', 'blogs'].includes(searchType)) {
                const contentResponse = await api.get('/content-service/search', {
                    params: {
                        query: searchQuery,
                        type: searchType === 'all' ? 'all' : searchType,
                        sortBy
                    }
                });
                contentResults = contentResponse.data.results || contentResults;
            }

            // Search users (friends) if type is all or users
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

            setResults({
                ...contentResults,
                users,
                groups,
                pages
            });

            const resultSet = {
                ...contentResults,
                users,
                groups,
                pages,
            };

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

            {error && (
                <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError('')}>
                    {error}
                </Alert>
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
