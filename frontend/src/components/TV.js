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
import toast from 'react-hot-toast';

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
    const [selectedCategory, setSelectedCategory] = useState('');
    const [addChannelOpen, setAddChannelOpen] = useState(false);
    const videoRef = useRef(null);

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
    }, [selectedCategory, searchQuery]);

    const loadChannels = async () => {
        try {
            setLoading(true);
            const response = await streamingService.getTVChannels({
                category: selectedCategory,
                search: searchQuery
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
            const response = await streamingService.getTVCategories();
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
        if (currentChannel?.id === channel.id && isPlaying) {
            // Pause current channel
            if (videoRef.current) {
                videoRef.current.pause();
                setIsPlaying(false);
                await streamingService.stopWatching(channel.id, 'tv');
            }
        } else {
            // Stop previous channel if playing
            if (currentChannel && videoRef.current) {
                videoRef.current.pause();
                await streamingService.stopWatching(currentChannel.id, 'tv');
            }

            // Play new channel
            setCurrentChannel(channel);
            if (videoRef.current) {
                videoRef.current.src = channel.streamUrl;
                videoRef.current.load();
                videoRef.current.play()
                    .then(() => {
                        setIsPlaying(true);
                        streamingService.startWatching(channel.id, 'tv');
                    })
                    .catch(error => {
                        toast.error('Failed to play channel');
                        console.error(error);
                    });
            }
        }
    };

    const handleFullscreen = () => {
        if (videoRef.current) {
            if (videoRef.current.requestFullscreen) {
                videoRef.current.requestFullscreen();
            } else if (videoRef.current.webkitRequestFullscreen) {
                videoRef.current.webkitRequestFullscreen();
            } else if (videoRef.current.mozRequestFullScreen) {
                videoRef.current.mozRequestFullScreen();
            }
        }
    };

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
                        image={channel.logoUrl || 'https://via.placeholder.com/300x140?text=TV'}
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

            {/* Video Player */}
            {currentChannel && (
                <Paper sx={{ p: 2, mb: 3 }}>
                    <Box sx={{ position: 'relative', width: '100%', paddingTop: '56.25%', bgcolor: 'black' }}>
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
                    </Box>
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
