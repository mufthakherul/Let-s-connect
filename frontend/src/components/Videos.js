import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardMedia,
  CardContent,
  Typography,
  Grid,
  Tabs,
  Tab,
  Button,
  TextField,
  Stack,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  Select,
  MenuItem,
  Skeleton
} from '@mui/material';
import { ContentCopy, PlaylistAdd, Share, Subscriptions } from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../utils/api';

function Videos({ user }) {
  const [tab, setTab] = useState(0);
  const [videos, setVideos] = useState([]);
  const [videosLoading, setVideosLoading] = useState(true);
  const [channels, setChannels] = useState([]);
  const [channelsLoading, setChannelsLoading] = useState(false);
  const [channelForm, setChannelForm] = useState({ name: '', description: '', avatarUrl: '', bannerUrl: '' });
  const [channelIdInput, setChannelIdInput] = useState('');
  const [channelData, setChannelData] = useState(null);
  const [playlists, setPlaylists] = useState([]);
  const [playlistForm, setPlaylistForm] = useState({ name: '', description: '', visibility: 'public' });
  const [selectedPlaylist, setSelectedPlaylist] = useState(null);
  const [playlistDialogOpen, setPlaylistDialogOpen] = useState(false);
  const [playlistVideoId, setPlaylistVideoId] = useState('');

  useEffect(() => {
    fetchVideos();
  }, []);

  useEffect(() => {
    if (user?.id && tab === 2) {
      fetchPlaylists();
    }
  }, [user?.id, tab]);

  useEffect(() => {
    if (tab === 1) {
      fetchChannels();
    }
  }, [tab]);

  const fetchChannels = async () => {
    try {
      setChannelsLoading(true);
      const response = await api.get('/content/channels');
      setChannels(response.data);
    } catch (err) {
      console.error('Failed to fetch channels:', err);
      toast.error('Failed to load channels');
    } finally {
      setChannelsLoading(false);
    }
  };

  const fetchVideos = async () => {
    try {
      setVideosLoading(true);
      const response = await api.get('/content/public/videos');
      setVideos(response.data);
    } catch (err) {
      console.error('Failed to fetch videos:', err);
      toast.error('Failed to load videos');
    } finally {
      setVideosLoading(false);
    }
  };

  const handleShareVideo = async (videoId) => {
    const shareUrl = `${window.location.origin}/videos?watch=${videoId}`;
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success('Share link copied');
    } catch (err) {
      console.error('Failed to copy link:', err);
      toast.error('Copy failed, link printed in console');
      console.log('Share link:', shareUrl);
    }
  };

  const handleCreateChannel = async () => {
    if (!user?.id) {
      toast.error('Login required');
      return;
    }
    if (!channelForm.name.trim()) {
      toast.error('Channel name is required');
      return;
    }

    try {
      const response = await api.post('/content/channels', {
        userId: user.id,
        ...channelForm
      });
      setChannelData(response.data);
      setChannelForm({ name: '', description: '', avatarUrl: '', bannerUrl: '' });
      toast.success('Channel created');
    } catch (err) {
      console.error('Failed to create channel:', err);
      toast.error(err.response?.data?.error || 'Failed to create channel');
    }
  };

  const fetchChannel = async () => {
    if (!channelIdInput.trim()) {
      toast.error('Enter a channel ID');
      return;
    }

    try {
      const response = await api.get(`/content/channels/${channelIdInput.trim()}`);
      setChannelData(response.data);
    } catch (err) {
      console.error('Failed to fetch channel:', err);
      toast.error(err.response?.data?.error || 'Channel not found');
    }
  };

  const handleSubscribe = async () => {
    if (!user?.id || !channelData?.id) return;
    try {
      await api.post(`/content/channels/${channelData.id}/subscribe`, { userId: user.id });
      toast.success('Subscribed');
      fetchChannel();
    } catch (err) {
      console.error('Failed to subscribe:', err);
      toast.error(err.response?.data?.error || 'Failed to subscribe');
    }
  };

  const handleUnsubscribe = async () => {
    if (!user?.id || !channelData?.id) return;
    try {
      await api.delete(`/content/channels/${channelData.id}/subscribe`, { data: { userId: user.id } });
      toast.success('Unsubscribed');
      fetchChannel();
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
      toast.error(err.response?.data?.error || 'Failed to unsubscribe');
    }
  };

  const fetchPlaylists = async () => {
    try {
      const response = await api.get(`/content/playlists/user/${user.id}`);
      setPlaylists(response.data);
    } catch (err) {
      console.error('Failed to fetch playlists:', err);
      toast.error('Failed to load playlists');
    }
  };

  const handleCreatePlaylist = async () => {
    if (!playlistForm.name.trim()) {
      toast.error('Playlist name required');
      return;
    }

    try {
      const response = await api.post('/content/playlists', playlistForm);
      setPlaylists([response.data, ...playlists]);
      setPlaylistForm({ name: '', description: '', visibility: 'public' });
      toast.success('Playlist created');
    } catch (err) {
      console.error('Failed to create playlist:', err);
      toast.error(err.response?.data?.error || 'Failed to create playlist');
    }
  };

  const fetchPlaylistDetails = async (playlistId) => {
    try {
      const response = await api.get(`/content/playlists/${playlistId}`);
      setSelectedPlaylist(response.data);
    } catch (err) {
      console.error('Failed to fetch playlist:', err);
      toast.error(err.response?.data?.error || 'Failed to load playlist');
    }
  };

  const handleAddVideoToPlaylist = async () => {
    if (!selectedPlaylist?.id) return;
    if (!playlistVideoId.trim()) {
      toast.error('Video ID is required');
      return;
    }

    try {
      await api.post(`/content/playlists/${selectedPlaylist.id}/videos`, {
        videoId: playlistVideoId.trim()
      });
      await fetchPlaylistDetails(selectedPlaylist.id);
      setPlaylistVideoId('');
      setPlaylistDialogOpen(false);
      toast.success('Video added');
    } catch (err) {
      console.error('Failed to add video:', err);
      toast.error(err.response?.data?.error || 'Failed to add video');
    }
  };

  const handleRemoveVideoFromPlaylist = async (videoId) => {
    if (!selectedPlaylist?.id) return;
    try {
      await api.delete(`/content/playlists/${selectedPlaylist.id}/videos/${videoId}`);
      await fetchPlaylistDetails(selectedPlaylist.id);
      toast.success('Removed from playlist');
    } catch (err) {
      console.error('Failed to remove video:', err);
      toast.error(err.response?.data?.error || 'Failed to remove video');
    }
  };

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Videos
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        Watch videos without signing up, manage channels, and build playlists
      </Typography>

      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        <Tab label="Explore" />
        <Tab label="Channels" />
        <Tab label="Playlists" />
      </Tabs>

      {tab === 0 && (
        <Grid container spacing={3}>
          {videosLoading
            ? [...Array(6)].map((_, index) => (
              <Grid item xs={12} sm={6} md={4} key={index}>
                <Card>
                  <Skeleton variant="rectangular" height={200} />
                  <CardContent>
                    <Skeleton width="70%" />
                    <Skeleton width="90%" />
                  </CardContent>
                </Card>
              </Grid>
            ))
            : videos.map((video) => (
              <Grid item xs={12} sm={6} md={4} key={video.id}>
                <Card>
                  <CardMedia
                    component="div"
                    sx={{ height: 200, bgcolor: 'grey.300' }}
                    title={video.title}
                  />
                  <CardContent>
                    <Typography variant="h6" gutterBottom>
                      {video.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {video.description}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1, alignItems: 'center' }}>
                      <Chip size="small" label={`${video.views || 0} views`} />
                      {video.category && <Chip size="small" label={video.category} />}
                    </Stack>
                    <Button
                      startIcon={<Share />}
                      size="small"
                      sx={{ mt: 2 }}
                      onClick={() => handleShareVideo(video.id)}
                    >
                      Share
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
        </Grid>
      )}

      {tab === 1 && (
        <Stack spacing={3}>
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Browse Channels
              </Typography>
              <Grid container spacing={2} sx={{ mt: 1 }}>
                {channelsLoading
                  ? [...Array(3)].map((_, index) => (
                    <Grid item xs={12} sm={6} md={4} key={index}>
                      <Card variant="outlined">
                        <CardContent>
                          <Skeleton width="70%" />
                          <Skeleton width="90%" />
                          <Skeleton width="40%" />
                        </CardContent>
                      </Card>
                    </Grid>
                  ))
                  : channels.map((channel) => (
                    <Grid item xs={12} sm={6} md={4} key={channel.id}>
                      <Card
                        variant="outlined"
                        sx={{ cursor: 'pointer' }}
                        onClick={() => {
                          setChannelIdInput(channel.id);
                          setChannelData(channel);
                        }}
                      >
                        <CardContent>
                          <Typography variant="h6">{channel.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {channel.description || 'No description'}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip size="small" label={`${channel.subscribers || 0} subscribers`} />
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
              </Grid>
            </CardContent>
          </Card>

          {!user?.id && (
            <Card>
              <CardContent>
                <Typography variant="h6">Login to manage channels</Typography>
                <Typography variant="body2" color="text.secondary">
                  Channels require authentication to create or subscribe.
                </Typography>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Channel
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Channel Name"
                  value={channelForm.name}
                  onChange={(e) => setChannelForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <TextField
                  label="Description"
                  value={channelForm.description}
                  onChange={(e) => setChannelForm((prev) => ({ ...prev, description: e.target.value }))}
                  multiline
                  minRows={2}
                />
                <TextField
                  label="Avatar URL"
                  value={channelForm.avatarUrl}
                  onChange={(e) => setChannelForm((prev) => ({ ...prev, avatarUrl: e.target.value }))}
                />
                <TextField
                  label="Banner URL"
                  value={channelForm.bannerUrl}
                  onChange={(e) => setChannelForm((prev) => ({ ...prev, bannerUrl: e.target.value }))}
                />
                <Button variant="contained" onClick={handleCreateChannel} disabled={!user?.id}>
                  Create Channel
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Find Channel by ID
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField
                  label="Channel ID"
                  value={channelIdInput}
                  onChange={(e) => setChannelIdInput(e.target.value)}
                  fullWidth
                />
                <Button variant="outlined" onClick={fetchChannel}>
                  Load
                </Button>
              </Stack>
            </CardContent>
          </Card>

          {channelData && (
            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems="center">
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6">{channelData.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {channelData.description || 'No description'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip size="small" label={`${channelData.subscribers || 0} subscribers`} />
                      <Chip size="small" label={`${channelData.videoCount || 0} videos`} />
                    </Stack>
                  </Box>
                  {user?.id && (
                    <Stack direction="row" spacing={1}>
                      <Button startIcon={<Subscriptions />} variant="contained" onClick={handleSubscribe}>
                        Subscribe
                      </Button>
                      <Button variant="outlined" onClick={handleUnsubscribe}>
                        Unsubscribe
                      </Button>
                    </Stack>
                  )}
                </Stack>
                <Typography variant="subtitle2" sx={{ mt: 3 }}>
                  Channel Videos
                </Typography>
                <Grid container spacing={2} sx={{ mt: 1 }}>
                  {(channelData.Videos || []).map((video) => (
                    <Grid item xs={12} sm={6} md={4} key={video.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{video.title}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {video.description || 'No description'}
                          </Typography>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      {tab === 2 && (
        <Stack spacing={3}>
          {!user?.id && (
            <Card>
              <CardContent>
                <Typography variant="h6">Login to manage playlists</Typography>
                <Typography variant="body2" color="text.secondary">
                  Playlists require authentication to create and edit.
                </Typography>
              </CardContent>
            </Card>
          )}
          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Create Playlist
              </Typography>
              <Stack spacing={2}>
                <TextField
                  label="Playlist Name"
                  value={playlistForm.name}
                  onChange={(e) => setPlaylistForm((prev) => ({ ...prev, name: e.target.value }))}
                />
                <TextField
                  label="Description"
                  value={playlistForm.description}
                  onChange={(e) => setPlaylistForm((prev) => ({ ...prev, description: e.target.value }))}
                  multiline
                  minRows={2}
                />
                <FormControl>
                  <Select
                    value={playlistForm.visibility}
                    onChange={(e) => setPlaylistForm((prev) => ({ ...prev, visibility: e.target.value }))}
                  >
                    <MenuItem value="public">Public</MenuItem>
                    <MenuItem value="unlisted">Unlisted</MenuItem>
                    <MenuItem value="private">Private</MenuItem>
                  </Select>
                </FormControl>
                <Button variant="contained" onClick={handleCreatePlaylist} disabled={!user?.id}>
                  Create Playlist
                </Button>
              </Stack>
            </CardContent>
          </Card>

          <Grid container spacing={2}>
            {playlists.map((playlist) => (
              <Grid item xs={12} md={6} key={playlist.id}>
                <Card variant="outlined">
                  <CardContent>
                    <Typography variant="h6">{playlist.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {playlist.description || 'No description'}
                    </Typography>
                    <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                      <Chip size="small" label={playlist.visibility} />
                      <Chip size="small" label={`${playlist.videoCount || 0} videos`} />
                    </Stack>
                    <Button size="small" sx={{ mt: 2 }} onClick={() => fetchPlaylistDetails(playlist.id)}>
                      View
                    </Button>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>

          {selectedPlaylist && (
            <Card>
              <CardContent>
                <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
                  <Box>
                    <Typography variant="h6">{selectedPlaylist.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {selectedPlaylist.description || 'No description'}
                    </Typography>
                  </Box>
                  <Button
                    startIcon={<PlaylistAdd />}
                    variant="contained"
                    onClick={() => setPlaylistDialogOpen(true)}
                  >
                    Add Video
                  </Button>
                </Stack>
                <Stack spacing={1} sx={{ mt: 2 }}>
                  {(selectedPlaylist.PlaylistItems || []).map((item) => (
                    <Card key={item.id} variant="outlined">
                      <CardContent sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Box>
                          <Typography variant="subtitle1">{item.Video?.title || 'Video'}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {item.Video?.description || 'No description'}
                          </Typography>
                        </Box>
                        <Button size="small" color="error" onClick={() => handleRemoveVideoFromPlaylist(item.videoId)}>
                          Remove
                        </Button>
                      </CardContent>
                    </Card>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          )}
        </Stack>
      )}

      <Dialog open={playlistDialogOpen} onClose={() => setPlaylistDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Add Video to Playlist</DialogTitle>
        <DialogContent>
          <TextField
            label="Video ID"
            fullWidth
            value={playlistVideoId}
            onChange={(e) => setPlaylistVideoId(e.target.value)}
            sx={{ mt: 1 }}
          />
          <Button
            startIcon={<ContentCopy />}
            size="small"
            sx={{ mt: 2 }}
            onClick={() => handleShareVideo(playlistVideoId)}
            disabled={!playlistVideoId}
          >
            Copy Share Link
          </Button>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPlaylistDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleAddVideoToPlaylist}>
            Add
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Videos;
