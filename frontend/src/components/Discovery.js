import React, { useState, useEffect, useCallback } from 'react';
import {
    Box,
    Grid,
    Paper,
    Typography,
    Card,
    CardContent,
    CardActionArea,
    Avatar,
    Chip,
    Button,
    Skeleton,
    Alert,
    Stack,
    Divider,
    IconButton,
    Tooltip,
    Badge,
} from '@mui/material';
import {
    TrendingUp as TrendingIcon,
    PersonAdd as PersonAddIcon,
    Group as GroupIcon,
    AutoAwesome as RecommendIcon,
    Refresh as RefreshIcon,
    Explore as ExploreIcon,
    Tag as TagIcon,
    People as PeopleIcon,
    ArrowForward as ArrowForwardIcon,
} from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import api from '../utils/api';
import PageShell from './common/PageShell';
import { buildProfilePath } from '../utils/profileRoutes';

const SectionHeader = ({ icon, title, onRefresh, loading }) => (
    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {icon}
            <Typography variant="h6" fontWeight={600}>
                {title}
            </Typography>
        </Box>
        {onRefresh && (
            <Tooltip title="Refresh">
                <span>
                    <IconButton size="small" onClick={onRefresh} disabled={loading}>
                        <RefreshIcon fontSize="small" />
                    </IconButton>
                </span>
            </Tooltip>
        )}
    </Box>
);

const TrendingSection = ({ items, loading, onRefresh, onTagClick }) => (
    <Paper sx={{ p: 3, borderRadius: 3, height: '100%' }}>
        <SectionHeader
            icon={<TrendingIcon color="error" />}
            title="Trending Topics"
            onRefresh={onRefresh}
            loading={loading}
        />
        {loading ? (
            <Stack spacing={1}>
                {[...Array(6)].map((_, i) => (
                    <Skeleton key={i} variant="rounded" height={36} />
                ))}
            </Stack>
        ) : items.length === 0 ? (
            <Typography color="text.secondary" variant="body2">
                No trending topics right now.
            </Typography>
        ) : (
            <Stack spacing={1}>
                {items.map((item, idx) => (
                    <Box
                        key={idx}
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            p: 1,
                            borderRadius: 2,
                            cursor: 'pointer',
                            '&:hover': { bgcolor: 'action.hover' },
                        }}
                        onClick={() => onTagClick(item.query)}
                    >
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ width: 20, textAlign: 'right' }}
                            >
                                {idx + 1}
                            </Typography>
                            {item.type === 'hashtag' ? (
                                <TagIcon fontSize="small" color="primary" />
                            ) : (
                                <TrendingIcon fontSize="small" color="error" />
                            )}
                            <Typography variant="body2" fontWeight={500} noWrap sx={{ maxWidth: 160 }}>
                                {item.query}
                            </Typography>
                        </Box>
                        {item.count > 0 && (
                            <Chip
                                label={item.count >= 1000 ? `${(item.count / 1000).toFixed(1)}k` : item.count}
                                size="small"
                                variant="outlined"
                                sx={{ fontSize: '0.7rem', height: 20 }}
                            />
                        )}
                    </Box>
                ))}
            </Stack>
        )}
    </Paper>
);

const PeopleSection = ({ items, loading, onRefresh }) => {
    const navigate = useNavigate();

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <SectionHeader
                icon={<PeopleIcon color="primary" />}
                title="People You May Know"
                onRefresh={onRefresh}
                loading={loading}
            />
            {loading ? (
                <Grid container spacing={2}>
                    {[...Array(6)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                            <Skeleton variant="rounded" height={110} />
                        </Grid>
                    ))}
                </Grid>
            ) : items.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                    No suggestions available right now.
                </Typography>
            ) : (
                <Grid container spacing={2}>
                    {items.map((person) => (
                        <Grid item xs={12} sm={6} md={4} key={person.id}>
                            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                                <CardActionArea
                                    sx={{ p: 2 }}
                                    onClick={() => navigate(buildProfilePath(person.username, person.id))}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar src={person.avatar} sx={{ width: 44, height: 44 }}>
                                            {(person.firstName?.[0] || person.username?.[0] || '?').toUpperCase()}
                                        </Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                {person.firstName && person.lastName
                                                    ? `${person.firstName} ${person.lastName}`
                                                    : person.username}
                                            </Typography>
                                            <Typography variant="caption" color="text.secondary" noWrap>
                                                @{person.username}
                                            </Typography>
                                        </Box>
                                    </Box>
                                    {person.Profile?.headline && (
                                        <Typography variant="caption" color="text.secondary" noWrap display="block">
                                            {person.Profile.headline}
                                        </Typography>
                                    )}
                                    <Typography variant="caption" color="primary" sx={{ mt: 0.5 }} display="block">
                                        {person.reason || 'Active member'}
                                    </Typography>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
            {!loading && items.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                    <Button
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/friends')}
                    >
                        Find more people
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

const GroupsSection = ({ items, loading, onRefresh }) => {
    const navigate = useNavigate();

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <SectionHeader
                icon={<GroupIcon color="success" />}
                title="Groups to Join"
                onRefresh={onRefresh}
                loading={loading}
            />
            {loading ? (
                <Grid container spacing={2}>
                    {[...Array(6)].map((_, i) => (
                        <Grid item xs={12} sm={6} md={4} key={i}>
                            <Skeleton variant="rounded" height={110} />
                        </Grid>
                    ))}
                </Grid>
            ) : items.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                    No group suggestions available.
                </Typography>
            ) : (
                <Grid container spacing={2}>
                    {items.map((group) => (
                        <Grid item xs={12} sm={6} md={4} key={group.id}>
                            <Card variant="outlined" sx={{ borderRadius: 2, height: '100%' }}>
                                <CardActionArea
                                    sx={{ p: 2 }}
                                    onClick={() => navigate(`/groups/${group.id}`)}
                                >
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
                                        <Avatar
                                            src={group.avatar}
                                            sx={{ width: 44, height: 44, bgcolor: 'success.light' }}
                                        >
                                            <GroupIcon />
                                        </Avatar>
                                        <Box sx={{ minWidth: 0 }}>
                                            <Typography variant="body2" fontWeight={600} noWrap>
                                                {group.name}
                                            </Typography>
                                            <Chip
                                                label={group.privacy || 'public'}
                                                size="small"
                                                sx={{ height: 18, fontSize: '0.65rem' }}
                                            />
                                        </Box>
                                    </Box>
                                    {group.snippet && (
                                        <Typography variant="caption" color="text.secondary" sx={{
                                            display: '-webkit-box',
                                            WebkitBoxOrient: 'vertical',
                                            WebkitLineClamp: 2,
                                            overflow: 'hidden',
                                        }}>
                                            {group.snippet}
                                        </Typography>
                                    )}
                                    {group.memberCount !== undefined && (
                                        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                                            {group.memberCount.toLocaleString()} members
                                        </Typography>
                                    )}
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            )}
            {!loading && items.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                    <Button
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/groups')}
                    >
                        Browse all groups
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

const ContentRecsSection = ({ items, loading, onRefresh }) => {
    const navigate = useNavigate();

    return (
        <Paper sx={{ p: 3, borderRadius: 3 }}>
            <SectionHeader
                icon={<RecommendIcon color="warning" />}
                title="Recommended For You"
                onRefresh={onRefresh}
                loading={loading}
            />
            {loading ? (
                <Stack spacing={1.5}>
                    {[...Array(4)].map((_, i) => (
                        <Skeleton key={i} variant="rounded" height={72} />
                    ))}
                </Stack>
            ) : items.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                    No recommendations right now. Try following more topics!
                </Typography>
            ) : (
                <Stack spacing={1.5} divider={<Divider />}>
                    {items.map((item, idx) => (
                        <Box
                            key={item.id || idx}
                            sx={{ cursor: 'pointer', '&:hover': { bgcolor: 'action.hover' }, p: 1, borderRadius: 1 }}
                            onClick={() => navigate('/feed')}
                        >
                            <Typography variant="body2" fontWeight={500} sx={{
                                display: '-webkit-box',
                                WebkitBoxOrient: 'vertical',
                                WebkitLineClamp: 2,
                                overflow: 'hidden',
                            }}>
                                {item.snippet || item.content?.substring(0, 120)}
                            </Typography>
                            {item.reason && (
                                <Typography variant="caption" color="primary" display="block" sx={{ mt: 0.5 }}>
                                    {item.reason}
                                </Typography>
                            )}
                        </Box>
                    ))}
                </Stack>
            )}
            {!loading && items.length > 0 && (
                <Box sx={{ mt: 2, textAlign: 'right' }}>
                    <Button
                        size="small"
                        endIcon={<ArrowForwardIcon />}
                        onClick={() => navigate('/feed')}
                    >
                        View your feed
                    </Button>
                </Box>
            )}
        </Paper>
    );
};

const Discovery = () => {
    const navigate = useNavigate();
    const [trending, setTrending] = useState([]);
    const [people, setPeople] = useState([]);
    const [groups, setGroups] = useState([]);
    const [contentRecs, setContentRecs] = useState([]);
    const [loadingStates, setLoadingStates] = useState({
        trending: true,
        people: true,
        groups: true,
        content: true,
    });
    const [errors, setErrors] = useState({});

    const setLoading = (key, value) =>
        setLoadingStates((prev) => ({ ...prev, [key]: value }));

    const fetchTrending = useCallback(async () => {
        setLoading('trending', true);
        try {
            const response = await api.get('/content-service/search/trending', {
                params: { limit: 10 },
            });
            setTrending(response.data.trending || []);
            setErrors((prev) => ({ ...prev, trending: null }));
        } catch (err) {
            console.error('[Discovery] trending failed:', err);
            setErrors((prev) => ({ ...prev, trending: 'Failed to load trending topics.' }));
        } finally {
            setLoading('trending', false);
        }
    }, []);

    const fetchPeople = useCallback(async () => {
        setLoading('people', true);
        try {
            const response = await api.get('/user-service/discover/people', {
                params: { limit: 6 },
            });
            setPeople(response.data.people || []);
            setErrors((prev) => ({ ...prev, people: null }));
        } catch (err) {
            console.error('[Discovery] people failed:', err);
            setErrors((prev) => ({ ...prev, people: 'Failed to load people suggestions.' }));
        } finally {
            setLoading('people', false);
        }
    }, []);

    const fetchGroups = useCallback(async () => {
        setLoading('groups', true);
        try {
            const response = await api.get('/content-service/discover/groups', {
                params: { limit: 6 },
            });
            setGroups(response.data.groups || []);
            setErrors((prev) => ({ ...prev, groups: null }));
        } catch (err) {
            console.error('[Discovery] groups failed:', err);
            setErrors((prev) => ({ ...prev, groups: 'Failed to load group suggestions.' }));
        } finally {
            setLoading('groups', false);
        }
    }, []);

    const fetchContentRecs = useCallback(async () => {
        setLoading('content', true);
        try {
            const response = await api.get('/content-service/discover/content', {
                params: { limit: 6 },
            });
            setContentRecs(response.data.recommendations || []);
            setErrors((prev) => ({ ...prev, content: null }));
        } catch (err) {
            console.error('[Discovery] content recs failed:', err);
            setErrors((prev) => ({ ...prev, content: 'Failed to load content recommendations.' }));
        } finally {
            setLoading('content', false);
        }
    }, []);

    useEffect(() => {
        fetchTrending();
        fetchPeople();
        fetchGroups();
        fetchContentRecs();
    }, [fetchTrending, fetchPeople, fetchGroups, fetchContentRecs]);

    const handleTagClick = (query) => {
        navigate(`/search?q=${encodeURIComponent(query)}`);
    };

    const anyError = Object.values(errors).some(Boolean);

    return (
        <PageShell
            title="Discover"
            subtitle="Explore trending topics, find new people and groups, and get personalized content recommendations."
            icon={<ExploreIcon fontSize="large" />}
        >
            {anyError && (
                <Alert severity="warning" sx={{ mb: 2 }}>
                    Some sections failed to load. Refresh to retry.
                </Alert>
            )}

            <Grid container spacing={3}>
                {/* Trending - sidebar */}
                <Grid item xs={12} md={4}>
                    <TrendingSection
                        items={trending}
                        loading={loadingStates.trending}
                        onRefresh={fetchTrending}
                        onTagClick={handleTagClick}
                    />
                </Grid>

                {/* People You May Know */}
                <Grid item xs={12} md={8}>
                    <PeopleSection
                        items={people}
                        loading={loadingStates.people}
                        onRefresh={fetchPeople}
                    />
                </Grid>

                {/* Groups */}
                <Grid item xs={12}>
                    <GroupsSection
                        items={groups}
                        loading={loadingStates.groups}
                        onRefresh={fetchGroups}
                    />
                </Grid>

                {/* Content Recommendations */}
                <Grid item xs={12}>
                    <ContentRecsSection
                        items={contentRecs}
                        loading={loadingStates.content}
                        onRefresh={fetchContentRecs}
                    />
                </Grid>
            </Grid>
        </PageShell>
    );
};

export default Discovery;
