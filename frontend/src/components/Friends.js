import React, { useState, useEffect } from 'react';
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
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../utils/api';
import { useNavigate } from 'react-router-dom';

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

  useEffect(() => {
    if (user?.id) {
      loadData();
    }
  }, [user, tabValue]);

  const loadData = async () => {
    setLoading(true);
    try {
      switch (tabValue) {
        case 0: // Friends
          await loadFriends();
          break;
        case 1: // Requests
          await loadFriendRequests();
          break;
        case 2: // Sent
          await loadSentRequests();
          break;
        case 3: // Suggestions
          await loadSuggestions();
          break;
        default:
          break;
      }
    } catch (error) {
      console.error('Failed to load data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadFriends = async () => {
    try {
      const response = await api.get('/friends', {
        params: { search: searchQuery }
      });
      setFriends(response.data.friends || []);
    } catch (error) {
      console.error('Failed to load friends:', error);
      toast.error('Failed to load friends');
    }
  };

  const loadFriendRequests = async () => {
    try {
      const response = await api.get('/friends/requests', {
        params: { type: 'received' }
      });
      setFriendRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load friend requests:', error);
      toast.error('Failed to load friend requests');
    }
  };

  const loadSentRequests = async () => {
    try {
      const response = await api.get('/friends/requests', {
        params: { type: 'sent' }
      });
      setSentRequests(response.data || []);
    } catch (error) {
      console.error('Failed to load sent requests:', error);
      toast.error('Failed to load sent requests');
    }
  };

  const loadSuggestions = async () => {
    try {
      const response = await api.get('/friends/suggestions');
      setSuggestions(response.data || []);
    } catch (error) {
      console.error('Failed to load suggestions:', error);
      toast.error('Failed to load friend suggestions');
    }
  };

  const handleAcceptRequest = async (requestId) => {
    try {
      await api.post(`/friends/request/${requestId}/accept`);
      toast.success('Friend request accepted!');
      loadFriendRequests();
      // Refresh friends count
      if (tabValue === 0) loadFriends();
    } catch (error) {
      console.error('Failed to accept request:', error);
      toast.error('Failed to accept friend request');
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.post(`/friends/request/${requestId}/reject`);
      toast.success('Friend request rejected');
      loadFriendRequests();
    } catch (error) {
      console.error('Failed to reject request:', error);
      toast.error('Failed to reject friend request');
    }
  };

  const handleCancelRequest = async (requestId) => {
    try {
      await api.delete(`/friends/request/${requestId}`);
      toast.success('Friend request cancelled');
      loadSentRequests();
    } catch (error) {
      console.error('Failed to cancel request:', error);
      toast.error('Failed to cancel friend request');
    }
  };

  const handleSendRequest = async (userId) => {
    try {
      const response = await api.post('/friends/request', { receiverId: userId });
      if (response.data.friendship) {
        toast.success('You are now friends!');
      } else {
        toast.success('Friend request sent!');
      }
      loadSuggestions();
    } catch (error) {
      console.error('Failed to send request:', error);
      toast.error(error.response?.data?.error || 'Failed to send friend request');
    }
  };

  const handleUnfriend = async (friendId) => {
    try {
      await api.delete(`/friends/${friendId}`);
      toast.success('Unfriended successfully');
      setConfirmDialog({ open: false, type: '', data: null });
      loadFriends();
    } catch (error) {
      console.error('Failed to unfriend:', error);
      toast.error('Failed to unfriend');
    }
  };

  const handleSearch = (e) => {
    setSearchQuery(e.target.value);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (tabValue === 0) {
      loadFriends();
    }
  };

  const renderFriendsList = () => (
    <Box>
      <Box sx={{ mb: 3 }}>
        <form onSubmit={handleSearchSubmit}>
          <TextField
            fullWidth
            placeholder="Search friends..."
            value={searchQuery}
            onChange={handleSearch}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            }}
          />
        </form>
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
          {friends.map((friend) => (
            <Grid item xs={12} sm={6} md={4} key={friend.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={friend.avatar}
                      sx={{ width: 60, height: 60, mr: 2, cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${friend.id}`)}
                    >
                      {friend.firstName?.[0] || friend.username?.[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/profile/${friend.id}`)}
                      >
                        {friend.firstName && friend.lastName
                          ? `${friend.firstName} ${friend.lastName}`
                          : friend.username}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        @{friend.username}
                      </Typography>
                    </Box>
                  </Box>
                  {friend.bio && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {friend.bio.length > 100 ? `${friend.bio.substring(0, 100)}...` : friend.bio}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="outlined"
                      onClick={() => navigate(`/profile/${friend.id}`)}
                    >
                      View Profile
                    </Button>
                    <IconButton
                      color="error"
                      onClick={() => setConfirmDialog({
                        open: true,
                        type: 'unfriend',
                        data: friend
                      })}
                      size="small"
                    >
                      <PersonRemoveIcon />
                    </IconButton>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
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
          {friendRequests.map((request) => (
            <Card key={request.id} sx={{ mb: 2 }}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar
                    src={request.Sender?.avatar}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${request.Sender?.id}`)}
                  >
                    {request.Sender?.firstName?.[0] || request.Sender?.username?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${request.Sender?.id}`)}
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
                      onClick={() => handleRejectRequest(request.id)}
                    >
                      Reject
                    </Button>
                  </Box>
                </ListItemSecondaryAction>
              </ListItem>
            </Card>
          ))}
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
          {sentRequests.map((request) => (
            <Card key={request.id} sx={{ mb: 2 }}>
              <ListItem>
                <ListItemAvatar>
                  <Avatar
                    src={request.Receiver?.avatar}
                    sx={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/profile/${request.Receiver?.id}`)}
                  >
                    {request.Receiver?.firstName?.[0] || request.Receiver?.username?.[0]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography
                      sx={{ cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${request.Receiver?.id}`)}
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
          ))}
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
          {suggestions.map((suggestion) => (
            <Grid item xs={12} sm={6} md={4} key={suggestion.id}>
              <Card>
                <CardContent>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar
                      src={suggestion.avatar}
                      sx={{ width: 60, height: 60, mr: 2, cursor: 'pointer' }}
                      onClick={() => navigate(`/profile/${suggestion.id}`)}
                    >
                      {suggestion.firstName?.[0] || suggestion.username?.[0]}
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography 
                        variant="h6" 
                        sx={{ cursor: 'pointer' }}
                        onClick={() => navigate(`/profile/${suggestion.id}`)}
                      >
                        {suggestion.firstName && suggestion.lastName
                          ? `${suggestion.firstName} ${suggestion.lastName}`
                          : suggestion.username}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        @{suggestion.username}
                      </Typography>
                    </Box>
                  </Box>
                  {suggestion.bio && (
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                      {suggestion.bio.length > 100 ? `${suggestion.bio.substring(0, 100)}...` : suggestion.bio}
                    </Typography>
                  )}
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    <Button
                      fullWidth
                      variant="contained"
                      startIcon={<PersonAddIcon />}
                      onClick={() => handleSendRequest(suggestion.id)}
                    >
                      Add Friend
                    </Button>
                    <Button
                      variant="outlined"
                      onClick={() => navigate(`/profile/${suggestion.id}`)}
                    >
                      View
                    </Button>
                  </Box>
                </CardContent>
              </Card>
            </Grid>
          ))}
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
