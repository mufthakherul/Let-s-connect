import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Container, Typography, Grid, Card, CardContent, CardMedia, CardActionArea,
    IconButton, TextField, Tabs, Tab, Chip, List, ListItem, ListItemText, ListItemAvatar,
    Avatar, Button, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Paper, Tooltip,
    Alert
} from '@mui/material';
import {
    PlayArrow, Pause, Fullscreen, VolumeUp, VolumeOff, Favorite, FavoriteBorder,
    Search, Tv as TvIcon, Add, ClosedCaption, Settings, History as HistoryIcon,
    Star, Public, Hd
} from '@mui/icons-material';
import { streamingService } from '../utils/streamingService';
import { getApiBaseUrl } from '../utils/api';
import toast from 'react-hot-toast';
import shaka from 'shaka-player/dist/shaka-player.ui';
import 'shaka-player/dist/controls.css';

const TV = () => {
    const [channels, setChannels] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [history, setHistory] = useState([]);
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentChannel, setCurrentChannel] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [sourceTab, setSourceTab] = useState(1);
    const [selectedCategory, setSelectedCategory] = useState('');
    const [addChannelOpen, setAddChannelOpen] = useState(false);
    const [customPlaylistUrl, setCustomPlaylistUrl] = useState('');
    const [importingPlaylist, setImportingPlaylist] = useState(false);
    const [playerError, setPlayerError] = useState('');
    const videoRef = useRef(null);
    const playerRef = useRef(null);
    const shakaPlayerRef = useRef(null);
    const shakaUiRef = useRef(null);
    // Track stream attempt index per channel (0 = primary, 1..n = alternatives)
    const streamAttemptRef = useRef({});
    const [similarChannels, setSimilarChannels] = useState([]);

    const getStreamForChannel = (channel) => {
        if (!channel) return null;
        const attempt = streamAttemptRef.current[channel.id] || 0;
        const alts = channel.metadata?.alternativeUrls || [];
        if (attempt === 0) return safeStreamUrl(channel.streamUrl);
        const alt = alts[attempt - 1];
        return alt ? safeStreamUrl(alt) : null;
    }

    // New channel form
    const [newChannel, setNewChannel] = useState({
        name: '',
        description: '',
        streamUrl: '',
        epgUrl: '',
        category: '',
        country: '',
        language: '',
        logoUrl: '',
        resolution: ''
    });

    useEffect(() => {
        loadChannels();
        loadCategories();
        loadFavorites();
        loadHistory();
    }, [selectedCategory, searchQuery, sourceTab]);

    const sourceFilter = sourceTab === 0 ? 'youtube' : sourceTab === 1 ? 'iptv' : 'custom';

    const isHttpsContext = () => typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isInsecureUrl = (value) => typeof value === 'string' && value.startsWith('http://');
    const proxyUrl = (value) => `${getApiBaseUrl()}/api/streaming/proxy?url=${encodeURIComponent(value)}`;
    const safeStreamUrl = (value) => (isHttpsContext() && isInsecureUrl(value) ? proxyUrl(value) : value);

    // Validate image URLs so malformed values like "300x140?text=TV" don't become broken requests
    const safeImageUrl = (value) => {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        // Accept only absolute URLs (http/https) or protocol-relative //host
        if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) {
            return (isHttpsContext() && isInsecureUrl(trimmed)) ? proxyUrl(trimmed) : trimmed;
        }
        // If it's already an embed/data URI, allow it
        if (/^data:/.test(trimmed)) return trimmed;
        // otherwise treat as invalid so placeholder is used instead
        return null;
    };

    const isYouTubeChannel = (channel) => {
        if (!channel) return false;
        const url = (channel.streamUrl || '').toLowerCase();
        return channel.source === 'youtube' || url.includes('youtube.com') || url.includes('youtu.be');
    };

    const loadChannels = async () => {
        try {
            setLoading(true);
            const response = await streamingService.getTVChannels({
                category: selectedCategory,
                search: searchQuery,
                source: sourceFilter
            });
            setChannels(response.channels || []);
        } catch (error) {
            toast.error('Failed to load TV channels');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadCategories = async () => {
        try {
            const response = await streamingService.getTVCategories({ source: sourceFilter });
            setCategories(response || []);
        } catch (error) {
            console.error('Failed to load categories:', error);
        }
    };

    const loadFavorites = async () => {
        try {
            const response = await streamingService.getFavorites('tv');
            setFavorites(response || []);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    };

    const loadHistory = async () => {
        try {
            const response = await streamingService.getHistory('tv');
            setHistory(response || []);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    };

    const handlePlay = async (channel) => {
        if (!channel.streamUrl) {
            toast.error('Stream URL is missing for this channel.');
            return;
        }
        if (currentChannel?.id === channel.id && isPlaying) {
            // Pause current channel
            if (videoRef.current) {
                videoRef.current.pause();
            }
            setIsPlaying(false);
            await streamingService.stopWatching(channel.id, 'tv');
        } else {
            // Stop previous channel if playing
            if (currentChannel && videoRef.current) {
                videoRef.current.pause();
                await streamingService.stopWatching(currentChannel.id, 'tv');
            }

            // Play new channel
            setCurrentChannel(channel);
            if (isYouTubeChannel(channel)) {
                setIsPlaying(true);
                streamingService.startWatching(channel.id, 'tv');
                return;
            }
            setIsPlaying(false);
        }
    };

    const handleFullscreen = () => {
        if (playerRef.current) {
            if (playerRef.current.requestFullscreen) {
                playerRef.current.requestFullscreen();
            } else if (playerRef.current.webkitRequestFullscreen) {
                playerRef.current.webkitRequestFullscreen();
            } else if (playerRef.current.mozRequestFullScreen) {
                playerRef.current.mozRequestFullScreen();
            }
        }
    };

    const handleImportPlaylist = async () => {
        if (!customPlaylistUrl.trim()) {
            toast.error('Playlist URL is required');
            return;
        }

        try {
            setImportingPlaylist(true);
            const response = await streamingService.importTVPlaylist({
                url: customPlaylistUrl.trim(),
                name: 'Custom Playlist'
            });
            toast.success(`Imported ${response.created} channels`);
            setCustomPlaylistUrl('');
            loadChannels();
            loadCategories();
        } catch (error) {
            toast.error(error.response?.data?.error || 'Failed to import playlist');
            console.error(error);
        } finally {
            setImportingPlaylist(false);
        }
    };

    useEffect(() => {
        let canceled = false;

        const initShakaPlayer = async () => {
            setPlayerError('');

            if (!currentChannel || isYouTubeChannel(currentChannel)) {
                return;
            }

            if (!shaka.Player.isBrowserSupported()) {
                setPlayerError('Shaka Player is not supported in this browser.');
                return;
            }

            shaka.polyfill.installAll();

            if (!videoRef.current || !playerRef.current) {
                return;
            }

            if (shakaUiRef.current) {
                shakaUiRef.current.destroy();
                shakaUiRef.current = null;
            }

            if (shakaPlayerRef.current) {
                await shakaPlayerRef.current.destroy();
                shakaPlayerRef.current = null;
            }

            const player = new shaka.Player(videoRef.current);
            const ui = new shaka.ui.Overlay(player, playerRef.current, videoRef.current);

            shakaPlayerRef.current = player;
            shakaUiRef.current = ui;

            ui.configure({
                controlPanelElements: [
                    'play_pause',
                    'time_and_duration',
                    'spacer',
                    'mute',
                    'volume',
                    'captions',
                    'language',
                    'picture_in_picture',
                    'fullscreen',
                    'overflow_menu'
                ],
                // 'audio_language' is not a valid overflow control in newer Shaka UI versions — use 'language'
                overflowMenuButtons: [
                    'quality',
                    'playback_rate',
                    'language',
                    'captions',
                    'statistics'
                ]
            });

            player.addEventListener('error', (event) => {
                const error = event?.detail || event;
                if (!canceled) {
                    setPlayerError(error?.message || 'Playback error');
                    // Attempt a fallback when Shaka reports an error during playback
                    const attempt = streamAttemptRef.current[currentChannel?.id] || 0;
                    const alts = currentChannel?.metadata?.alternativeUrls || [];
                    if (currentChannel && attempt < alts.length) {
                        streamAttemptRef.current[currentChannel.id] = attempt + 1;
                        const nextUrl = getStreamForChannel(currentChannel);
                        toast(`Playback error — switching to fallback ${attempt + 1}/${alts.length}`, { icon: '🔁' });

                        // Report telemetry about fallback usage (best-effort)
                        streamingService.reportFallbackEvent({
                            itemId: currentChannel.id,
                            itemType: 'tv',
                            primaryUrl: currentChannel.streamUrl,
                            usedUrl: nextUrl,
                            attemptIndex: attempt + 1,
                            error: error?.message || 'Shaka player error'
                        }).catch(() => { });

                        player.load(nextUrl).catch(err => {
                            // will be handled by the player's error event if it fails again
                            console.error('Fallback load failed:', err);
                        });
                    }
                }
            });

            const tryLoad = async () => {
                const streamUrl = getStreamForChannel(currentChannel);
                if (!streamUrl) {
                    setPlayerError('No valid stream URL available');
                    setIsPlaying(false);
                    return;
                }

                try {
                    await player.load(streamUrl);
                    if (!canceled) {
                        setIsPlaying(true);
                        streamingService.startWatching(currentChannel.id, 'tv');
                        // Track view for recommendations (best-effort; server ignores missing userId)
                        streamingService.trackChannelView({ userId: localStorage.getItem('userId') || undefined, channelId: currentChannel.id, watchDurationMs: 0 }).catch(() => { });
                    }
                } catch (error) {
                    const attempt = streamAttemptRef.current[currentChannel.id] || 0;
                    const alts = currentChannel.metadata?.alternativeUrls || [];

                    // If there is an alternative URL available, try next one
                    if (attempt < (alts.length)) {
                        streamAttemptRef.current[currentChannel.id] = attempt + 1;
                        const nextUrl = getStreamForChannel(currentChannel);
                        toast(`Primary stream failed — trying fallback ${attempt + 1}/${alts.length}`, { icon: '🔁' });

                        // Report telemetry about fallback usage (best-effort)
                        streamingService.reportFallbackEvent({
                            itemId: currentChannel.id,
                            itemType: 'tv',
                            primaryUrl: currentChannel.streamUrl,
                            usedUrl: nextUrl,
                            attemptIndex: attempt + 1,
                            error: error?.message || 'Primary load failed'
                        }).catch(() => { });

                        // Small delay before retrying
                        setTimeout(() => {
                            tryLoad();
                        }, 700);
                        return;
                    }

                    if (!canceled) {
                        const msg = error?.message || 'Failed to load stream';
                        setPlayerError(msg);
                        toast.error(`Playback failed: ${msg}`);
                        setIsPlaying(false);
                    }
                }
            };

            // reset attempt counter for this channel and try loading
            streamAttemptRef.current[currentChannel.id] = 0;
            tryLoad();
        };

        initShakaPlayer();

        return () => {
            canceled = true;
        };
    }, [currentChannel]);

    // Fetch similar channels when a channel is selected (UI can render these)
    useEffect(() => {
        if (!currentChannel || !currentChannel.id) {
            setSimilarChannels([]);
            return;
        }

        (async () => {
            try {
                const resp = await streamingService.getSimilarChannels(currentChannel.id, 8);
                setSimilarChannels(resp.similar || []);
            } catch (err) {
                console.error('Failed to load similar channels:', err);
            }
        })();
    }, [currentChannel]);

    const handleToggleFavorite = async (channel) => {
        try {
            const isFavorite = favorites.some(f => f.itemId === channel.id);

            if (isFavorite) {
                const favorite = favorites.find(f => f.itemId === channel.id);
                await streamingService.removeFavorite(favorite.id);
                setFavorites(favorites.filter(f => f.id !== favorite.id));
                toast.success('Removed from favorites');
            } else {
                await streamingService.addFavorite(channel.id, 'tv');
                loadFavorites();
                toast.success('Added to favorites');
            }
        } catch (error) {
            toast.error('Failed to update favorites');
            console.error(error);
        }
    };

    const handleAddChannel = async () => {
        try {
            await streamingService.addTVChannel(newChannel);
            toast.success('TV channel added successfully');
            setAddChannelOpen(false);
            setNewChannel({
                name: '',
                description: '',
                streamUrl: '',
                epgUrl: '',
                category: '',
                country: '',
                language: '',
                logoUrl: '',
                resolution: ''
            });
            loadChannels();
        } catch (error) {
            toast.error('Failed to add TV channel');
            console.error(error);
        }
    };

    const isFavorite = (channelId) => {
        return favorites.some(f => f.itemId === channelId);
    };

    const renderChannelCard = (channel) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={channel.id}>
            <Card
                sx={{
                    height: '100%',
                    position: 'relative',
                    '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                }}
            >
                <CardActionArea onClick={() => handlePlay(channel)}>
                    <CardMedia
                        component="img"
                        height="140"
                        image={safeImageUrl(channel.logoUrl) || 'https://via.placeholder.com/300x140?text=TV'}
                        alt={channel.name}
                        sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                        <Typography variant="h6" gutterBottom noWrap>
                            {channel.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {channel.description || 'No description'}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {channel.category && (
                                <Chip label={channel.category} size="small" color="primary" />
                            )}
                            {channel.country && (
                                <Chip label={channel.country} size="small" icon={<Public />} />
                            )}
                            {channel.resolution && (
                                <Chip label={channel.resolution} size="small" icon={<Hd />} />
                            )}
                        </Box>
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <TvIcon fontSize="small" />
                            <Typography variant="caption">
                                {channel.viewers || 0} viewers
                            </Typography>
                        </Box>
                    </CardContent>
                </CardActionArea>
                <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(channel);
                    }}
                >
                    {isFavorite(channel.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
            </Card>
        </Grid>
    );

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" gutterBottom>
                    <TvIcon sx={{ fontSize: 40, mr: 1, verticalAlign: 'bottom' }} />
                    Live TV (IPTV)
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Watch live TV channels from around the world
                </Typography>
            </Box>

            {/* Source Tabs */}
            <Tabs
                value={sourceTab}
                onChange={(e, v) => setSourceTab(v)}
                sx={{ mb: 2 }}
                variant="scrollable"
                scrollButtons="auto"
            >
                <Tab label="YouTube Live" />
                <Tab label="Open IPTV" />
                <Tab label="My Playlist" />
            </Tabs>

            {sourceTab === 2 && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Typography variant="h6" gutterBottom>
                        Import Your Playlist
                    </Typography>
                    <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                        Paste your M3U/M3U8 playlist URL from your subscription provider.
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, gap: 2 }}>
                        <TextField
                            fullWidth
                            label="Playlist URL"
                            value={customPlaylistUrl}
                            onChange={(e) => setCustomPlaylistUrl(e.target.value)}
                        />
                        <Button
                            variant="contained"
                            onClick={handleImportPlaylist}
                            disabled={importingPlaylist}
                        >
                            {importingPlaylist ? 'Importing...' : 'Import'}
                        </Button>
                    </Box>
                </Paper>
            )}

            {/* Video Player */}
            {currentChannel && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box
                        ref={playerRef}
                        sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', bgcolor: 'black' }}
                    >
                        {isYouTubeChannel(currentChannel) ? (
                            <iframe
                                title={currentChannel.name}
                                src={
                                    currentChannel.metadata?.iframeUrl || (function constructYouTubeEmbed() {
                                        const url = (currentChannel.streamUrl || '').trim();
                                        if (/\/embed\//i.test(url)) return url;
                                        // channel handle e.g. /@Handle/live -> embed URL
                                        const handleMatch = url.match(/youtube\.com\/(?:@[^/]+)\/live/i);
                                        if (handleMatch) {
                                            const parts = url.split('/');
                                            const handle = parts.slice(-2).join('/');
                                            return `https://www.youtube.com/embed/${handle}`;
                                        }
                                        const vidMatch = url.match(/[?&]v=([^&]+)/);
                                        if (vidMatch) return `https://www.youtube.com/embed/${vidMatch[1]}`;
                                        return url; // last resort
                                    })()
                                }
                                allow="autoplay; encrypted-media; picture-in-picture"
                                allowFullScreen
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    border: 0
                                }}
                            />
                        ) : (
                            <video
                                ref={videoRef}
                                controls
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%'
                                }}
                            />
                        )}
                    </Box>
                    {playerError && (
                        <Alert severity="error" sx={{ mt: 2 }}>
                            {playerError}
                        </Alert>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                            <Avatar
                                src={currentChannel.logoUrl}
                                alt={currentChannel.name}
                                sx={{ width: 50, height: 50 }}
                            />
                            <Box>
                                <Typography variant="h6">{currentChannel.name}</Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {currentChannel.category} • {currentChannel.viewers || 0} watching
                                </Typography>

                                {similarChannels && similarChannels.length > 0 && (
                                    <Box sx={{ mt: 1, display: 'flex', gap: 1, alignItems: 'center', overflowX: 'auto' }}>
                                        <Typography variant="caption" sx={{ mr: 1, color: 'text.secondary' }}>Similar:</Typography>
                                        {similarChannels.slice(0, 8).map(sc => (
                                            <Button
                                                key={sc.id || sc.name}
                                                size="small"
                                                onClick={(e) => { e.stopPropagation(); handlePlay(sc); }}
                                                sx={{ textTransform: 'none' }}
                                            >
                                                <Avatar src={safeImageUrl(sc.logoUrl) || undefined} sx={{ width: 28, height: 28, mr: 1 }} />
                                                <Typography variant="caption" noWrap>{sc.name}</Typography>
                                            </Button>
                                        ))}
                                    </Box>
                                )}
                            </Box>
                        </Box>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <Tooltip title="Fullscreen">
                                <IconButton onClick={handleFullscreen}>
                                    <Fullscreen />
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Toggle Favorite">
                                <IconButton onClick={() => handleToggleFavorite(currentChannel)}>
                                    {isFavorite(currentChannel.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                                </IconButton>
                            </Tooltip>
                        </Box>
                    </Box>
                </Paper>
            )}

            {/* Search and Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            placeholder="Search channels..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                            <InputLabel>Category</InputLabel>
                            <Select
                                value={selectedCategory}
                                label="Category"
                                onChange={(e) => setSelectedCategory(e.target.value)}
                            >
                                <MenuItem value="">All Categories</MenuItem>
                                {categories.map(category => (
                                    <MenuItem key={category} value={category}>{category}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setAddChannelOpen(true)}
                        >
                            Add Channel
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            {/* Tabs */}
            <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
                <Tab icon={<TvIcon />} label="All Channels" />
                <Tab icon={<Star />} label={`Favorites (${favorites.length})`} />
                <Tab icon={<HistoryIcon />} label="History" />
            </Tabs>

            {/* Content */}
            {loading ? (
                <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
                    <CircularProgress />
                </Box>
            ) : (
                <>
                    {/* All Channels Tab */}
                    {currentTab === 0 && (
                        <Grid container spacing={2}>
                            {channels.length === 0 ? (
                                <Grid item xs={12}>
                                    <Alert severity="info">No TV channels found. Try adjusting your filters.</Alert>
                                </Grid>
                            ) : (
                                channels.map(channel => renderChannelCard(channel))
                            )}
                        </Grid>
                    )}

                    {/* Favorites Tab */}
                    {currentTab === 1 && (
                        <Grid container spacing={2}>
                            {favorites.length === 0 ? (
                                <Grid item xs={12}>
                                    <Alert severity="info">No favorite channels yet. Add some by clicking the heart icon!</Alert>
                                </Grid>
                            ) : (
                                favorites.map(fav => fav.item && renderChannelCard(fav.item))
                            )}
                        </Grid>
                    )}

                    {/* History Tab */}
                    {currentTab === 2 && (
                        <List>
                            {history.length === 0 ? (
                                <Alert severity="info">No viewing history yet.</Alert>
                            ) : (
                                history.map((item, index) => item.item && (
                                    <ListItem
                                        key={index}
                                        secondaryAction={
                                            <IconButton onClick={() => handlePlay(item.item)}>
                                                <PlayArrow />
                                            </IconButton>
                                        }
                                    >
                                        <ListItemAvatar>
                                            <Avatar src={item.item.logoUrl} />
                                        </ListItemAvatar>
                                        <ListItemText
                                            primary={item.item.name}
                                            secondary={new Date(item.createdAt).toLocaleString()}
                                        />
                                    </ListItem>
                                ))
                            )}
                        </List>
                    )}
                </>
            )}

            {/* Add Channel Dialog */}
            <Dialog open={addChannelOpen} onClose={() => setAddChannelOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add TV Channel</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Channel Name"
                            value={newChannel.name}
                            onChange={(e) => setNewChannel({ ...newChannel, name: e.target.value })}
                            required
                        />
                        <TextField
                            label="Description"
                            value={newChannel.description}
                            onChange={(e) => setNewChannel({ ...newChannel, description: e.target.value })}
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Stream URL"
                            value={newChannel.streamUrl}
                            onChange={(e) => setNewChannel({ ...newChannel, streamUrl: e.target.value })}
                            required
                            helperText="M3U8 or direct stream URL"
                        />
                        <TextField
                            label="EPG URL"
                            value={newChannel.epgUrl}
                            onChange={(e) => setNewChannel({ ...newChannel, epgUrl: e.target.value })}
                            helperText="Electronic Program Guide URL (optional)"
                        />
                        <TextField
                            label="Logo URL"
                            value={newChannel.logoUrl}
                            onChange={(e) => setNewChannel({ ...newChannel, logoUrl: e.target.value })}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Category"
                                    value={newChannel.category}
                                    onChange={(e) => setNewChannel({ ...newChannel, category: e.target.value })}
                                    helperText="e.g., News, Sports"
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={newChannel.country}
                                    onChange={(e) => setNewChannel({ ...newChannel, country: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Language"
                                    value={newChannel.language}
                                    onChange={(e) => setNewChannel({ ...newChannel, language: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <FormControl fullWidth>
                                    <InputLabel>Resolution</InputLabel>
                                    <Select
                                        value={newChannel.resolution}
                                        label="Resolution"
                                        onChange={(e) => setNewChannel({ ...newChannel, resolution: e.target.value })}
                                    >
                                        <MenuItem value="">Unknown</MenuItem>
                                        <MenuItem value="SD">SD</MenuItem>
                                        <MenuItem value="HD">HD</MenuItem>
                                        <MenuItem value="FHD">Full HD</MenuItem>
                                        <MenuItem value="4K">4K</MenuItem>
                                    </Select>
                                </FormControl>
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddChannelOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddChannel}
                        variant="contained"
                        disabled={!newChannel.name || !newChannel.streamUrl}
                    >
                        Add Channel
                    </Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default TV;
