import React, { useState, useEffect, useRef } from 'react';
import {
    Box, Container, Typography, Grid, Card, CardContent, CardMedia, CardActionArea,
    IconButton, TextField, Tabs, Tab, Chip, List, ListItem, ListItemText, ListItemAvatar,
    Avatar, Button, Slider, Dialog, DialogTitle, DialogContent, DialogActions,
    FormControl, InputLabel, Select, MenuItem, CircularProgress, Paper, Tooltip,
    Alert, Menu, Divider
} from '@mui/material';
import {
    PlayArrow, Pause, VolumeUp, VolumeOff, Favorite, FavoriteBorder,
    Search, Radio as RadioIcon, Add, Edit, Delete, History as HistoryIcon,
    Star, Public, Language, Alarm, MusicNote, Schedule
} from '@mui/icons-material';
import { streamingService } from '../utils/streamingService';
import { getApiBaseUrl } from '../utils/api';
import toast from 'react-hot-toast';
import { makePlaceholder } from '../utils/placeholder';

const Radio = () => {
    const [stations, setStations] = useState([]);
    const [favorites, setFavorites] = useState([]);
    const [history, setHistory] = useState([]);
    const [genres, setGenres] = useState([]);

    // default placeholder graphic for stations without a valid logo URL
    const defaultPlaceholder = makePlaceholder('Radio');
    const [loading, setLoading] = useState(true);
    const [currentStation, setCurrentStation] = useState(null);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(70);
    const [isMuted, setIsMuted] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [currentTab, setCurrentTab] = useState(0);
    const [selectedGenre, setSelectedGenre] = useState('');
    const [addStationOpen, setAddStationOpen] = useState(false);
    const audioRef = useRef(null);
    // Track stream attempt index per station (0 = primary, 1..n = alternatives)
    const streamAttemptRef = useRef({});

    // Phase 3: Sleep timer
    const [sleepTimerAnchor, setSleepTimerAnchor] = useState(null);
    const [sleepTimerMinutes, setSleepTimerMinutes] = useState(0);
    const [sleepTimerRemaining, setSleepTimerRemaining] = useState(0);
    const sleepTimerIntervalRef = useRef(null);

    // Phase 3: Station schedule and lyrics
    const [scheduleInfo, setScheduleInfo] = useState(null);
    const [lyricsDialogOpen, setLyricsDialogOpen] = useState(false);

    const getStreamForStation = (station) => {
        if (!station) return null;
        const attempt = streamAttemptRef.current[station.id] || 0;
        const alts = station.metadata?.alternativeUrls || [];
        if (attempt === 0) return safeStreamUrl(station.streamUrl);
        const alt = alts[attempt - 1];
        return alt ? safeStreamUrl(alt) : null;
    };

    // New station form
    const [newStation, setNewStation] = useState({
        name: '',
        description: '',
        streamUrl: '',
        websiteUrl: '',
        genre: '',
        country: '',
        language: '',
        logoUrl: '',
        bitrate: ''
    });

    useEffect(() => {
        loadStations();
        loadGenres();
        loadFavorites();
        loadHistory();
    }, [selectedGenre, searchQuery]);

    useEffect(() => {
        if (audioRef.current) {
            audioRef.current.volume = volume / 100;
        }
    }, [volume]);

    // Phase 3: Cleanup sleep timer on unmount
    useEffect(() => {
        return () => { clearInterval(sleepTimerIntervalRef.current); };
    }, []);

    // Phase 3: Fetch station schedule when current station changes
    useEffect(() => {
        if (!currentStation) { setScheduleInfo(null); return; }
        fetch(`${getApiBaseUrl()}/api/streaming/radio/schedule/${currentStation.id}`)
            .then(r => r.ok ? r.json() : null)
            .then(data => setScheduleInfo(data || null))
            .catch(() => setScheduleInfo(null));
    }, [currentStation]);

    // Phase 3: Format countdown seconds -> mm:ss
    const formatCountdown = (seconds) => {
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    };

    // Phase 3: Activate/deactivate sleep timer
    const handleSleepTimer = (minutes) => {
        setSleepTimerAnchor(null);
        clearInterval(sleepTimerIntervalRef.current);
        if (minutes === 0) {
            setSleepTimerMinutes(0);
            setSleepTimerRemaining(0);
            return;
        }
        setSleepTimerMinutes(minutes);
        setSleepTimerRemaining(minutes * 60);
        sleepTimerIntervalRef.current = setInterval(() => {
            setSleepTimerRemaining(prev => {
                if (prev <= 1) {
                    clearInterval(sleepTimerIntervalRef.current);
                    if (audioRef.current) audioRef.current.pause();
                    setIsPlaying(false);
                    setSleepTimerMinutes(0);
                    toast('Sleep timer ended', { icon: '\u23F0' });
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);
    };

    // Phase 3: Build schedule display string from API data
    const getScheduleDisplay = () => {
        if (!scheduleInfo) return null;
        const now = scheduleInfo.current;
        const next = scheduleInfo.next;
        if (!now && !next) return null;
        let display = '';
        if (now) display += `Now: ${now.title || now.show || 'Unknown'}`;
        if (next) {
            const nextTime = next.startTime ? new Date(next.startTime) : null;
            if (nextTime) {
                const diffMs = nextTime - Date.now();
                if (diffMs > 0) {
                    const diffH = Math.floor(diffMs / 3600000);
                    const diffM = Math.floor((diffMs % 3600000) / 60000);
                    const timeStr = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;
                    display += ` \u00B7 Next: ${next.title || next.show || 'Unknown'} in ${timeStr}`;
                } else {
                    display += ` \u00B7 Next: ${next.title || next.show || 'Unknown'} (starting soon)`;
                }
            } else {
                display += ` \u00B7 Next: ${next.title || next.show || 'Unknown'}`;
            }
        }
        return display;
    };

    const loadStations = async () => {
        try {
            setLoading(true);
            const response = await streamingService.getRadioStations({
                genre: selectedGenre,
                search: searchQuery
            });
            setStations(response.stations || []);
        } catch (error) {
            toast.error('Failed to load radio stations');
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadGenres = async () => {
        try {
            const response = await streamingService.getRadioGenres();
            setGenres(response || []);
        } catch (error) {
            console.error('Failed to load genres:', error);
        }
    };

    const loadFavorites = async () => {
        try {
            const response = await streamingService.getFavorites('radio');
            setFavorites(response || []);
        } catch (error) {
            console.error('Failed to load favorites:', error);
        }
    };

    const loadHistory = async () => {
        try {
            const response = await streamingService.getHistory('radio');
            setHistory(response || []);
        } catch (error) {
            console.error('Failed to load history:', error);
        }
    };

    const isHttpsContext = () => typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isInsecureUrl = (value) => typeof value === 'string' && value.startsWith('http://');
    const proxyUrl = (value) => `${getApiBaseUrl()}/api/streaming/proxy?url=${encodeURIComponent(value)}`;
    const safeStreamUrl = (value) => (isHttpsContext() && isInsecureUrl(value) ? proxyUrl(value) : value);
    const safeImageUrl = (value) => {
        if (!value || typeof value !== 'string') return null;
        const trimmed = value.trim();
        if (/^https?:\/\//i.test(trimmed) || /^\/\//.test(trimmed)) {
            return (isHttpsContext() && isInsecureUrl(trimmed)) ? proxyUrl(trimmed) : trimmed;
        }
        if (/^data:/.test(trimmed)) return trimmed;
        return null;
    };

    const handlePlay = async (station) => {
        if (!station.streamUrl) {
            toast.error('Stream URL is missing for this station.');
            return;
        }
        if (currentStation?.id === station.id && isPlaying) {
            // Pause current station
            if (audioRef.current) {
                audioRef.current.pause();
                setIsPlaying(false);
                await streamingService.stopListening(station.id, 'radio');
            }
        } else {
            // Stop previous station if playing
            if (currentStation && audioRef.current) {
                audioRef.current.pause();
                await streamingService.stopListening(currentStation.id, 'radio');
            }

            // Play new station
            setCurrentStation(station);
            // reset attempt counter for this station
            streamAttemptRef.current[station.id] = 0;

            const tryPlay = () => {
                const streamUrl = getStreamForStation(station);
                if (!streamUrl) {
                    toast.error('No valid stream URL available');
                    setIsPlaying(false);
                    return;
                }

                if (!audioRef.current) return;
                audioRef.current.src = streamUrl;
                audioRef.current.load();

                audioRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        streamingService.startListening(station.id, 'radio');
                    })
                    .catch(async (error) => {
                        console.error('Play failed:', error);
                        const attempt = streamAttemptRef.current[station.id] || 0;
                        const alts = station.metadata?.alternativeUrls || [];

                        if (attempt < alts.length) {
                            streamAttemptRef.current[station.id] = attempt + 1;
                            const nextUrl = getStreamForStation(station);
                            toast(`Primary stream failed — trying fallback ${attempt + 1}/${alts.length}`, { icon: '🔁' });

                            // Report fallback telemetry (best-effort)
                            streamingService.reportFallbackEvent({
                                itemId: station.id,
                                itemType: 'radio',
                                primaryUrl: station.streamUrl,
                                usedUrl: nextUrl,
                                attemptIndex: attempt + 1,
                                error: error?.message || 'Audio play error'
                            }).catch(() => { });

                            // small delay then retry
                            setTimeout(tryPlay, 700);
                            return;
                        }

                        toast.error('Failed to play station');
                        setIsPlaying(false);
                    });
            };

            // attach error handler to audio element to attempt fallbacks
            if (audioRef.current) {
                audioRef.current.onerror = () => {
                    const attempt = streamAttemptRef.current[station.id] || 0;
                    const alts = station.metadata?.alternativeUrls || [];
                    if (attempt < alts.length) {
                        streamAttemptRef.current[station.id] = attempt + 1;
                        const nextUrl = getStreamForStation(station);
                        toast(`Audio error — switching to fallback ${attempt + 1}/${alts.length}`, { icon: '🔁' });

                        // Report fallback telemetry (best-effort)
                        streamingService.reportFallbackEvent({
                            itemId: station.id,
                            itemType: 'radio',
                            primaryUrl: station.streamUrl,
                            usedUrl: nextUrl,
                            attemptIndex: attempt + 1,
                            error: 'HTMLMediaElement error'
                        }).catch(() => { });

                        setTimeout(tryPlay, 700);
                    } else {
                        toast.error('Audio playback error');
                        setIsPlaying(false);
                    }
                };
            }

            tryPlay();
        }
    };

    const toggleMute = () => {
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
            setIsMuted(!isMuted);
        }
    };

    const handleVolumeChange = (event, newValue) => {
        setVolume(newValue);
    };

    const handleToggleFavorite = async (station) => {
        try {
            const isFavorite = favorites.some(f => f.itemId === station.id);

            if (isFavorite) {
                const favorite = favorites.find(f => f.itemId === station.id);
                await streamingService.removeFavorite(favorite.id);
                setFavorites(favorites.filter(f => f.id !== favorite.id));
                toast.success('Removed from favorites');
            } else {
                await streamingService.addFavorite(station.id, 'radio');
                loadFavorites();
                toast.success('Added to favorites');
            }
        } catch (error) {
            toast.error('Failed to update favorites');
            console.error(error);
        }
    };

    const handleAddStation = async () => {
        try {
            await streamingService.addRadioStation(newStation);
            toast.success('Radio station added successfully');
            setAddStationOpen(false);
            setNewStation({
                name: '',
                description: '',
                streamUrl: '',
                websiteUrl: '',
                genre: '',
                country: '',
                language: '',
                logoUrl: '',
                bitrate: ''
            });
            loadStations();
        } catch (error) {
            toast.error('Failed to add radio station');
            console.error(error);
        }
    };

    const isFavorite = (stationId) => {
        return favorites.some(f => f.itemId === stationId);
    };

    const renderStationCard = (station) => (
        <Grid item xs={12} sm={6} md={4} lg={3} key={station.id}>
            <Card
                sx={{
                    height: '100%',
                    position: 'relative',
                    '&:hover': { transform: 'scale(1.02)', transition: 'transform 0.2s' }
                }}
            >
                <CardActionArea onClick={() => handlePlay(station)}>
                    <CardMedia
                        component="img"
                        height="140"
                        image={safeImageUrl(station.logoUrl) || defaultPlaceholder}
                        alt={station.name}
                        sx={{ objectFit: 'cover' }}
                    />
                    <CardContent>
                        <Typography variant="h6" gutterBottom noWrap>
                            {station.name}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" noWrap>
                            {station.description || 'No description'}
                        </Typography>
                        <Box sx={{ mt: 1, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                            {station.genre && (
                                <Chip label={station.genre} size="small" color="primary" />
                            )}
                            {station.country && (
                                <Chip label={station.country} size="small" icon={<Public />} />
                            )}
                            {station.bitrate && (
                                <Chip label={`${station.bitrate}kbps`} size="small" />
                            )}
                        </Box>
                        <Box sx={{ mt: 1, display: 'flex', alignItems: 'center', gap: 1 }}>
                            <RadioIcon fontSize="small" />
                            <Typography variant="caption">
                                {station.listeners || 0} listeners
                            </Typography>
                        </Box>
                    </CardContent>
                </CardActionArea>
                <IconButton
                    sx={{ position: 'absolute', top: 8, right: 8 }}
                    onClick={(e) => {
                        e.stopPropagation();
                        handleToggleFavorite(station);
                    }}
                >
                    {isFavorite(station.id) ? <Favorite color="error" /> : <FavoriteBorder />}
                </IconButton>
            </Card>
        </Grid>
    );

    return (
        <Container maxWidth="xl" sx={{ py: 4 }}>
            {/* Audio element */}
            <audio ref={audioRef} />

            {/* Header */}
            <Box sx={{ mb: 4 }}>
                <Typography variant="h3" gutterBottom>
                    <RadioIcon sx={{ fontSize: 40, mr: 1, verticalAlign: 'bottom' }} />
                    Live Radio (IPFM)
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    Listen to live radio stations from around the world
                </Typography>
            </Box>

            {/* Current Playing Bar */}
            {currentStation && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Grid container alignItems="center" spacing={2}>
                        <Grid item xs={12} sm={4}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Avatar
                                    src={currentStation.logoUrl}
                                    alt={currentStation.name}
                                    sx={{ width: 60, height: 60 }}
                                />
                                <Box>
                                    <Typography variant="h6">{currentStation.name}</Typography>
                                    <Typography variant="caption" color="text.secondary">
                                        {currentStation.genre}
                                    </Typography>
                                    {/* Phase 3: Station schedule */}
                                    {getScheduleDisplay() && (
                                        <Tooltip title="Station schedule">
                                            <Typography variant="caption" color="text.secondary" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.5 }}>
                                                <Schedule sx={{ fontSize: 12 }} />
                                                {getScheduleDisplay()}
                                            </Typography>
                                        </Tooltip>
                                    )}
                                </Box>
                            </Box>
                        </Grid>
                        <Grid item xs={12} sm={8}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                                <IconButton onClick={() => handlePlay(currentStation)}>
                                    {isPlaying ? <Pause /> : <PlayArrow />}
                                </IconButton>
                                <IconButton onClick={toggleMute}>
                                    {isMuted ? <VolumeOff /> : <VolumeUp />}
                                </IconButton>
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', gap: 1, minWidth: 120 }}>
                                    <VolumeUp fontSize="small" />
                                    <Slider
                                        value={volume}
                                        onChange={handleVolumeChange}
                                        aria-labelledby="volume-slider"
                                        sx={{ flex: 1 }}
                                    />
                                    <Typography variant="caption">{volume}%</Typography>
                                </Box>
                                {/* Phase 3: Lyrics button */}
                                <Tooltip title="Lyrics">
                                    <IconButton size="small" onClick={() => setLyricsDialogOpen(true)}>
                                        <MusicNote fontSize="small" />
                                    </IconButton>
                                </Tooltip>
                                {/* Phase 3: Sleep timer button + countdown */}
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                                    <Tooltip title="Sleep Timer">
                                        <IconButton
                                            size="small"
                                            onClick={(e) => setSleepTimerAnchor(e.currentTarget)}
                                        >
                                            <Alarm fontSize="small" color={sleepTimerMinutes > 0 ? 'warning' : 'inherit'} />
                                        </IconButton>
                                    </Tooltip>
                                    {sleepTimerRemaining > 0 && (
                                        <Typography variant="caption" color="warning.main" sx={{ minWidth: 36 }}>
                                            {formatCountdown(sleepTimerRemaining)}
                                        </Typography>
                                    )}
                                </Box>
                            </Box>
                        </Grid>
                    </Grid>
                </Paper>
            )}

            {/* Search and Filters */}
            <Box sx={{ mb: 3 }}>
                <Grid container spacing={2} alignItems="center">
                    <Grid item xs={12} sm={6}>
                        <TextField
                            fullWidth
                            placeholder="Search stations..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            InputProps={{
                                startAdornment: <Search sx={{ mr: 1, color: 'text.secondary' }} />
                            }}
                        />
                    </Grid>
                    <Grid item xs={12} sm={4}>
                        <FormControl fullWidth>
                            <InputLabel>Genre</InputLabel>
                            <Select
                                value={selectedGenre}
                                label="Genre"
                                onChange={(e) => setSelectedGenre(e.target.value)}
                            >
                                <MenuItem value="">All Genres</MenuItem>
                                {genres.map(genre => (
                                    <MenuItem key={genre} value={genre}>{genre}</MenuItem>
                                ))}
                            </Select>
                        </FormControl>
                    </Grid>
                    <Grid item xs={12} sm={2}>
                        <Button
                            fullWidth
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => setAddStationOpen(true)}
                        >
                            Add Station
                        </Button>
                    </Grid>
                </Grid>
            </Box>

            {/* Tabs */}
            <Tabs value={currentTab} onChange={(e, v) => setCurrentTab(v)} sx={{ mb: 3 }}>
                <Tab icon={<RadioIcon />} label="All Stations" />
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
                    {/* All Stations Tab */}
                    {currentTab === 0 && (
                        <Grid container spacing={2}>
                            {stations.length === 0 ? (
                                <Grid item xs={12}>
                                    <Alert severity="info">No radio stations found. Try adjusting your filters.</Alert>
                                </Grid>
                            ) : (
                                stations.map(station => renderStationCard(station))
                            )}
                        </Grid>
                    )}

                    {/* Favorites Tab */}
                    {currentTab === 1 && (
                        <Grid container spacing={2}>
                            {favorites.length === 0 ? (
                                <Grid item xs={12}>
                                    <Alert severity="info">No favorite stations yet. Add some by clicking the heart icon!</Alert>
                                </Grid>
                            ) : (
                                favorites.map(fav => fav.item && renderStationCard(fav.item))
                            )}
                        </Grid>
                    )}

                    {/* History Tab */}
                    {currentTab === 2 && (
                        <List>
                            {history.length === 0 ? (
                                <Alert severity="info">No listening history yet.</Alert>
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

            {/* Add Station Dialog */}
            <Dialog open={addStationOpen} onClose={() => setAddStationOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>Add Radio Station</DialogTitle>
                <DialogContent>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
                        <TextField
                            label="Station Name"
                            value={newStation.name}
                            onChange={(e) => setNewStation({ ...newStation, name: e.target.value })}
                            required
                        />
                        <TextField
                            label="Description"
                            value={newStation.description}
                            onChange={(e) => setNewStation({ ...newStation, description: e.target.value })}
                            multiline
                            rows={2}
                        />
                        <TextField
                            label="Stream URL"
                            value={newStation.streamUrl}
                            onChange={(e) => setNewStation({ ...newStation, streamUrl: e.target.value })}
                            required
                            helperText="Direct stream URL (e.g., http://example.com/stream.mp3)"
                        />
                        <TextField
                            label="Website URL"
                            value={newStation.websiteUrl}
                            onChange={(e) => setNewStation({ ...newStation, websiteUrl: e.target.value })}
                        />
                        <TextField
                            label="Logo URL"
                            value={newStation.logoUrl}
                            onChange={(e) => setNewStation({ ...newStation, logoUrl: e.target.value })}
                        />
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Genre"
                                    value={newStation.genre}
                                    onChange={(e) => setNewStation({ ...newStation, genre: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Country"
                                    value={newStation.country}
                                    onChange={(e) => setNewStation({ ...newStation, country: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                        <Grid container spacing={2}>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Language"
                                    value={newStation.language}
                                    onChange={(e) => setNewStation({ ...newStation, language: e.target.value })}
                                />
                            </Grid>
                            <Grid item xs={6}>
                                <TextField
                                    fullWidth
                                    label="Bitrate (kbps)"
                                    type="number"
                                    value={newStation.bitrate}
                                    onChange={(e) => setNewStation({ ...newStation, bitrate: e.target.value })}
                                />
                            </Grid>
                        </Grid>
                    </Box>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setAddStationOpen(false)}>Cancel</Button>
                    <Button
                        onClick={handleAddStation}
                        variant="contained"
                        disabled={!newStation.name || !newStation.streamUrl}
                    >
                        Add Station
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Phase 3: Sleep Timer Menu */}
            <Menu
                anchorEl={sleepTimerAnchor}
                open={Boolean(sleepTimerAnchor)}
                onClose={() => setSleepTimerAnchor(null)}
            >
                <MenuItem onClick={() => handleSleepTimer(15)}>\u23F0 15 min</MenuItem>
                <MenuItem onClick={() => handleSleepTimer(30)}>\u23F0 30 min</MenuItem>
                <MenuItem onClick={() => handleSleepTimer(60)}>\u23F0 1 hour</MenuItem>
                <Divider />
                <MenuItem onClick={() => handleSleepTimer(0)}>Off</MenuItem>
            </Menu>

            {/* Phase 3: Lyrics Dialog */}
            <Dialog open={lyricsDialogOpen} onClose={() => setLyricsDialogOpen(false)} maxWidth="sm" fullWidth>
                <DialogTitle>\u266B Lyrics</DialogTitle>
                <DialogContent>
                    <Typography variant="body1" color="text.secondary" sx={{ py: 2 }}>
                        Lyrics not available for this station's live stream. Try the Now Playing metadata above.
                    </Typography>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setLyricsDialogOpen(false)}>Close</Button>
                </DialogActions>
            </Dialog>
        </Container>
    );
};

export default Radio;
