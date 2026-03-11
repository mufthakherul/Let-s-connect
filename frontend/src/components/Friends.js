import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  Avatar,
  IconButton,
  Tab,
  Tabs,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  ListItemSecondaryAction,
  Chip,
  Badge,
  InputAdornment,
  CircularProgress,
  Tooltip,
} from '@mui/material';
import {
  PersonAdd as PersonAddIcon,
  Check as CheckIcon,
  Close as CloseIcon,
  Search as SearchIcon,
  PersonRemove as PersonRemoveIcon,
  Group as GroupIcon,
  People as PeopleIcon,
  HowToReg as HowToRegIcon,
  Chat as ChatIcon,
  PersonAddAlt1 as FollowIcon,
} from '@mui/icons-material';
import { motion, AnimatePresence } from 'framer-motion';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';
import { buildProfilePath } from '../utils/profileRoutes';

const cardVariants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: (i) => ({
    opacity: 1,
    scale: 1,
    y: 0,
    transition: { delay: i * 0.07, duration: 0.35, ease: 'easeOut' },
  }),
  exit: { opacity: 0, x: -60, transition: { duration: 0.25 } },
};

function Friends({ user }) {
  const navigate = useNavigate();
  const [tabValue, setTabValue] = useState(0);
  const [friends, setFriends] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmDialog, setConfirmDialog] = useState({ open: false, type: '', data: null });
  const debounceTimer = useRef(null);

  useEffect(() => {
    if (user?.id) loadData();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (tabValue) {
        case 0: await loadFriends(); break;
        case 1: await loadFriendRequests(); break;
        case 2: await loadSentRequests(); break;
        case 3: await loadSuggestions(); break;
        default: break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async (query = searchQuery) => {
    try {
      const response = await api.get('/user/social/friends', {
        params: query ? { search: query } : undefined,
      });
      setFriends(response.data.friends || response.data || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
      toast.error('Failed to load friends');
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await api.get('/user/social/friends/requests', {
        params: { type: 'incoming' },
      });
      setFriendRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      toast.error('Failed to load friend requests');
    }
  };

  const loadSentRequests = async () => {
    try {
      const response = await api.get('/user/social/friends/requests', {
        params: { type: 'outgoing' },
      });
      setSentRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load sent requests:', error);
      toast.error('Failed to load sent requests');
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/user/social/friends/suggestions');
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      toast.error('Failed to load friend suggestions');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/user/social/friends/request/${requestId}/accept`);
      toast.success('Friend request accepted!');
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleDeclineRequest = async (requestId, requestData) => {
    try {
      await api.post(`/user/social/friends/request/${requestId}/decline`);
      setFriendRequests((prev) => prev.filter((r) => r.id !== requestId));
      toast(
        (t) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2">Request declined</Typography>
            <Button
              size="small"
              variant="outlined"
              onClick={() => {
                toast.dismiss(t.id);
                setFriendRequests((prev) => [requestData, ...prev]);
              }}
            >
              Undo
            </Button>
          </Box>
        ),
        { duration: 5000 }
      );
    } catch (error) {
      console.error('Failed to decline request:', error);
      toast.error('Failed to decline friend request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.delete(`/user/social/friends/request/${requestId}`);
      toast.success('Friend request cancelled');
      setSentRequests((prev) => prev.filter((r) => r.id !== requestId));
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast.error('Failed to cancel friend request');
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const response = await api.post('/user/social/friends/request', { receiverId: userId });
      if (response.data.friendship) {
        toast.success('You are now friends!');
      } else {
        toast.success('Friend request sent!');
      }
      setSuggestions((prev) => prev.filter((s) => s.id !== userId));
    } catch (error) {
      console.error('Failed to send request:', error);
      toast.error(error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const handleFollowUser = async (userId) => {
    try {
      await api.post(`/user/social/friends/${userId}/follow`);
      toast.success('Now following!');
    } catch (error) {
      console.error('Failed to follow:', error);
      toast.error(error.response?.data?.error || 'Failed to follow user');
    }
  };

  const handleUnfriend = async (friendId) => {
    try {
      await api.delete(`/user/social/friends/${friendId}`);
      toast.success('Unfriended successfully');
      setConfirmDialog({ open: false, type: '', data: null });
      setFriends((prev) => prev.filter((f) => f.id !== friendId));
    } catch (error) {
      console.error('Failed to unfriend:', error);
      toast.error('Failed to unfriend');
    }
  };

  const handleSearchChange = useCallback(
    (e) => {
      const value = e.target.value;
      setSearchQuery(value);
      if (debounceTimer.current) clearTimeout(debounceTimer.current);
      debounceTimer.current = setTimeout(() => {
        if (tabValue === 0) loadFriends(value);
      }, 400);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tabValue]
  );

  const renderFriendsList = () => (
    <Box>
      <Box sx={{ mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search friends..."
          value={searchQuery}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
          }}
        />
      </Box>

      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : friends.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No friends yet. Check out friend suggestions!
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          <AnimatePresence>
            {friends.map((friend, i) => (
              <Grid item xs={12} sm={6} md={4} key={friend.id}>
                <motion.div
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={friend.avatar}
                          sx={{ width: 60, height: 60, mr: 2, cursor: 'pointer' }}
                          onClick={() => navigate(buildProfilePath(friend.username, friend.id))}
                        >
                          {friend.firstName?.[0] || friend.username?.[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{ cursor: 'pointer' }}
                            onClick={() => navigate(buildProfilePath(friend.username, friend.id))}
                          >
                            {friend.firstName && friend.lastName
                              ? `${friend.firstName} ${friend.lastName}`
                              : friend.username}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            @{friend.username}
                          </Typography>
                          {friend.mutualFriendsCount > 0 && (
                            <Chip
                              label={`${friend.mutualFriendsCount} mutual`}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </Box>
                      {friend.bio && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {friend.bio.length > 100
                            ? `${friend.bio.substring(0, 100)}...`
                            : friend.bio}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="outlined"
                          startIcon={<ChatIcon />}
                          onClick={() => navigate(`/chat?user=${friend.id}`)}
                          sx={{ flex: 1 }}
                        >
                          Message
                        </Button>
                        <Button
                          variant="outlined"
                          onClick={() => navigate(buildProfilePath(friend.username, friend.id))}
                        >
                          Profile
                        </Button>
                        <Tooltip title="Unfriend">
                          <IconButton
                            color="error"
                            onClick={() =>
                              setConfirmDialog({ open: true, type: 'unfriend', data: friend })
                            }
                            size="small"
                          >
                            <PersonRemoveIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}
    </Box>
  );

  const renderRequestsList = () => (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : friendRequests.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No pending friend requests
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          <AnimatePresence>
            {friendRequests.map((request) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, x: -30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        src={request.Sender?.avatar}
                        sx={{ cursor: 'pointer' }}
                        onClick={() =>
                          navigate(buildProfilePath(request.Sender?.username, request.Sender?.id))
                        }
                      >
                        {request.Sender?.firstName?.[0] || request.Sender?.username?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{ cursor: 'pointer' }}
                          onClick={() =>
                            navigate(
                              buildProfilePath(request.Sender?.username, request.Sender?.id)
                            )
                          }
                        >
                          {request.Sender?.firstName && request.Sender?.lastName
                            ? `${request.Sender.firstName} ${request.Sender.lastName}`
                            : request.Sender?.username}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            @{request.Sender?.username}
                          </Typography>
                          {request.message && (
                            <Typography variant="body2" sx={{ mt: 1 }}>
                              "{request.message}"
                            </Typography>
                          )}
                          <Typography variant="caption" color="textSecondary">
                            {new Date(request.createdAt).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          color="primary"
                          size="small"
                          startIcon={<CheckIcon />}
                          onClick={() => handleAcceptRequest(request.id)}
                        >
                          Accept
                        </Button>
                        <Button
                          variant="outlined"
                          color="error"
                          size="small"
                          startIcon={<CloseIcon />}
                          onClick={() => handleDeclineRequest(request.id, request)}
                        >
                          Decline
                        </Button>
                      </Box>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      )}
    </Box>
  );

  const renderSentRequestsList = () => (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : sentRequests.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No sent friend requests
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <List>
          <AnimatePresence>
            {sentRequests.map((request) => (
              <motion.div
                key={request.id}
                layout
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 60, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card sx={{ mb: 2 }}>
                  <ListItem>
                    <ListItemAvatar>
                      <Avatar
                        src={request.Receiver?.avatar}
                        sx={{ cursor: 'pointer' }}
                        onClick={() =>
                          navigate(
                            buildProfilePath(request.Receiver?.username, request.Receiver?.id)
                          )
                        }
                      >
                        {request.Receiver?.firstName?.[0] || request.Receiver?.username?.[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography
                          sx={{ cursor: 'pointer' }}
                          onClick={() =>
                            navigate(
                              buildProfilePath(request.Receiver?.username, request.Receiver?.id)
                            )
                          }
                        >
                          {request.Receiver?.firstName && request.Receiver?.lastName
                            ? `${request.Receiver.firstName} ${request.Receiver.lastName}`
                            : request.Receiver?.username}
                        </Typography>
                      }
                      secondary={
                        <>
                          <Typography variant="body2" color="textSecondary">
                            @{request.Receiver?.username}
                          </Typography>
                          <Chip
                            label="Pending"
                            size="small"
                            color="warning"
                            sx={{ mt: 1 }}
                          />
                          <Typography variant="caption" color="textSecondary" sx={{ display: 'block', mt: 1 }}>
                            Sent {new Date(request.createdAt).toLocaleDateString()}
                          </Typography>
                        </>
                      }
                    />
                    <ListItemSecondaryAction>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        onClick={() => handleCancelRequest(request.id)}
                      >
                        Cancel
                      </Button>
                    </ListItemSecondaryAction>
                  </ListItem>
                </Card>
              </motion.div>
            ))}
          </AnimatePresence>
        </List>
      )}
    </Box>
  );

  const renderSuggestions = () => (
    <Box>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 3 }}>
          <CircularProgress />
        </Box>
      ) : suggestions.length === 0 ? (
        <Card>
          <CardContent>
            <Typography color="textSecondary" align="center">
              No friend suggestions available
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <Grid container spacing={2}>
          <AnimatePresence>
            {suggestions.map((suggestion, i) => (
              <Grid item xs={12} sm={6} md={4} key={suggestion.id}>
                <motion.div
                  custom={i}
                  variants={cardVariants}
                  initial="hidden"
                  animate="visible"
                  exit="exit"
                  layout
                >
                  <Card>
                    <CardContent>
                      <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                        <Avatar
                          src={suggestion.avatar}
                          sx={{ width: 60, height: 60, mr: 2, cursor: 'pointer' }}
                          onClick={() =>
                            navigate(buildProfilePath(suggestion.username, suggestion.id))
                          }
                        >
                          {suggestion.firstName?.[0] || suggestion.username?.[0]}
                        </Avatar>
                        <Box sx={{ flexGrow: 1 }}>
                          <Typography
                            variant="h6"
                            sx={{ cursor: 'pointer' }}
                            onClick={() =>
                              navigate(buildProfilePath(suggestion.username, suggestion.id))
                            }
                          >
                            {suggestion.firstName && suggestion.lastName
                              ? `${suggestion.firstName} ${suggestion.lastName}`
                              : suggestion.username}
                          </Typography>
                          <Typography variant="body2" color="textSecondary">
                            @{suggestion.username}
                          </Typography>
                          {suggestion.mutualFriendsCount > 0 && (
                            <Chip
                              label={`${suggestion.mutualFriendsCount} mutual friends`}
                              size="small"
                              sx={{ mt: 0.5 }}
                            />
                          )}
                        </Box>
                      </Box>
                      {suggestion.bio && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          {suggestion.bio.length > 100
                            ? `${suggestion.bio.substring(0, 100)}...`
                            : suggestion.bio}
                        </Typography>
                      )}
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          variant="contained"
                          startIcon={<PersonAddIcon />}
                          onClick={() => handleSendRequest(suggestion.id)}
                          sx={{ flex: 1 }}
                        >
                          Connect
                        </Button>
                        <Button
                          variant="outlined"
                          startIcon={<FollowIcon />}
                          onClick={() => handleFollowUser(suggestion.id)}
                        >
                          Follow
                        </Button>
                        <Button
                          variant="text"
                          size="small"
                          onClick={() =>
                            navigate(buildProfilePath(suggestion.username, suggestion.id))
                          }
                        >
                          View
                        </Button>
                      </Box>
                    </CardContent>
                  </Card>
                </motion.div>
              </Grid>
            ))}
          </AnimatePresence>
        </Grid>
      )}
    </Box>
  );

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <GroupIcon sx={{ fontSize: 40, mr: 2, color: 'primary.main' }} />
          <Typography variant="h4">Friends</Typography>
        </Box>
      </Box>

      <Card sx={{ mb: 3 }}>
        <Tabs
          value={tabValue}
          onChange={(e, newValue) => setTabValue(newValue)}
          variant="fullWidth"
          indicatorColor="primary"
          textColor="primary"
        >
          <Tab
            icon={<PeopleIcon />}
            label={`Friends (${friends.length})`}
            iconPosition="start"
          />
          <Tab
            icon={
              <Badge badgeContent={friendRequests.length} color="error">
                <HowToRegIcon />
              </Badge>
            }
            label="Requests"
            iconPosition="start"
          />
          <Tab
            icon={<PersonAddIcon />}
            label={`Sent (${sentRequests.length})`}
            iconPosition="start"
          />
          <Tab
            icon={<SearchIcon />}
            label="Suggestions"
            iconPosition="start"
          />
        </Tabs>
      </Card>

      {tabValue === 0 && renderFriendsList()}
      {tabValue === 1 && renderRequestsList()}
      {tabValue === 2 && renderSentRequestsList()}
      {tabValue === 3 && renderSuggestions()}

      {/* Confirm Unfriend Dialog */}
      <Dialog
        open={confirmDialog.open}
        onClose={() => setConfirmDialog({ open: false, type: '', data: null })}
      >
        <DialogTitle>Confirm Unfriend</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to unfriend {
              confirmDialog.data?.firstName && confirmDialog.data?.lastName
                ? `${confirmDialog.data.firstName} ${confirmDialog.data.lastName}`
                : (confirmDialog.data?.firstName || confirmDialog.data?.username || 'this user')
            }?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmDialog({ open: false, type: '', data: null })}>
            Cancel
          </Button>
          <Button
            onClick={() => handleUnfriend(confirmDialog.data?.id)}
            color="error"
            variant="contained"
          >
            Unfriend
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default Friends;
