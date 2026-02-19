import React, { useState, useEffect } from 'react';
import {
    Container, Paper, Typography, Box, TextField, Button,
    Tabs, Tab, List, ListItem, ListItemText, Chip,
    FormControl, InputLabel, Select, MenuItem, Grid,
    CircularProgress, Alert, Card, CardContent, Divider,
    Avatar, ListItemAvatar
} from '@mui/material';
import { 
    Search as SearchIcon, 
    Schedule,
    Person as PersonIcon,
    Group as GroupIcon,
    Pages as PagesIcon
} from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../utils/api';

const Search = () => {
    const location = useLocation();
    const navigate = useNavigate();
    const [query, setQuery] = useState('');
    const [loading, setLoading] = useState(false);
    const [results, setResults] = useState(null);
    const [currentTab, setCurrentTab] = useState(0);
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

            // Search content-service
            const contentResponse = await api.get('/content-service/search', {
                params: {
                    query: searchQuery,
                    type: searchType === 'all' || ['posts', 'comments', 'blogs'].includes(searchType) ? searchType : 'all',
                    sortBy
                }
            });

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
                ...contentResponse.data.results,
                users,
                groups,
                pages
            });

            // Save to history
            await api.post('/content-service/search/history', {
                query: searchQuery,
                type: searchType
            });

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
            return (
                <Alert severity="info">No {type} found</Alert>
            );
        }

        return (
            <List>
                {items.map((item, index) => (
                    <React.Fragment key={item.id || index}>
                        <ListItem 
                            sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', cursor: 'pointer' }}
                            onClick={() => {
                                if (type === 'users') navigate(`/profile/${item.id}`);
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
                                            {new Date(item.createdAt).toLocaleString()}
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

    return (
        <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
            <Typography variant="h4" gutterBottom>
                <SearchIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
                Search
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} md={6}>
                        <TextField
                            fullWidth
                            label="Search"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                            placeholder="Search posts, users, groups, pages..."
                        />
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Type</InputLabel>
                            <Select value={searchType} onChange={(e) => setSearchType(e.target.value)} label="Type">
                                <MenuItem value="all">All</MenuItem>
                                <MenuItem value="posts">Posts</MenuItem>
                                <MenuItem value="comments">Comments</MenuItem>
                                <MenuItem value="blogs">Blogs</MenuItem>
                                <MenuItem value="users">Users</MenuItem>
                                <MenuItem value="groups">Groups</MenuItem>
                                <MenuItem value="pages">Pages</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} md={3}>
                        <FormControl fullWidth>
                            <InputLabel>Sort By</InputLabel>
                            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} label="Sort By">
                                <MenuItem value="date">Date</MenuItem>
                                <MenuItem value="popularity">Popularity</MenuItem>
                                <MenuItem value="relevance">Relevance</MenuItem>
                            </Select>
                        </FormControl>
                    </Grid>
                </Grid>

                <Button
                    fullWidth
                    variant="contained"
                    onClick={() => handleSearch()}
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
                                />
                            ))}
                        </Box>
                    </CardContent>
                </Card>
            )}

            {/* Results */}
            {results && (
                <Paper>
                    <Tabs
                        value={currentTab}
                        onChange={(e, v) => setCurrentTab(v)}
                        variant="scrollable"
                        scrollButtons="auto"
                    >
                        {results.posts && <Tab label={`Posts (${results.posts.count})`} />}
                        {results.comments && <Tab label={`Comments (${results.comments.count})`} />}
                        {results.blogs && <Tab label={`Blogs (${results.blogs.count})`} />}
                        {results.users && <Tab label={`Users (${results.users.count})`} />}
                        {results.groups && <Tab label={`Groups (${results.groups.count})`} />}
                        {results.pages && <Tab label={`Pages (${results.pages.count})`} />}
                        {results.hashtagPosts && <Tab label={`Hashtag Posts (${results.hashtagPosts.count})`} />}
                    </Tabs>

                    <Box sx={{ p: 2 }}>
                        {currentTab === 0 && results.posts && renderResults(results.posts.items, 'posts')}
                        {currentTab === 1 && results.comments && renderResults(results.comments.items, 'comments')}
                        {currentTab === 2 && results.blogs && renderResults(results.blogs.items, 'blogs')}
                        {currentTab === 3 && results.users && renderResults(results.users.items, 'users')}
                        {currentTab === 4 && results.groups && renderResults(results.groups.items, 'groups')}
                        {currentTab === 5 && results.pages && renderResults(results.pages.items, 'pages')}
                        {currentTab === 6 && results.hashtagPosts && renderResults(results.hashtagPosts.items, 'hashtag posts')}
                    </Box>
                </Paper>
            )}

            {loading && (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
                    <CircularProgress />
                </Box>
            )}
        </Container>
    );
};

export default Search;
