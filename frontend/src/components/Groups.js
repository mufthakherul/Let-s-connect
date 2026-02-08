import React, { useState, useEffect } from 'react';
import {
  Container, Grid, Card, CardContent, CardActions, Typography,
  Button, TextField, Dialog, DialogTitle, DialogContent, DialogActions,
  Select, MenuItem, FormControl, InputLabel, Chip, Box, Avatar,
  Skeleton
} from '@mui/material';
import { Add, Group as GroupIcon, Public, Lock, VpnLock } from '@mui/icons-material';
import { formatRelativeTime, formatNumber } from '../utils/helpers';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

const Groups = ({ user }) => {
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [newGroup, setNewGroup] = useState({
    name: '',
    description: '',
    privacy: 'public',
    category: 'general'
  });

  useEffect(() => {
    fetchGroups();
  }, []);

  const fetchGroups = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/api/content/groups`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGroups(response.data);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast.error('Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateGroup = async () => {
    if (!newGroup.name.trim()) {
      toast.error('Group name is required');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        `${API_URL}/api/content/groups`,
        newGroup,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGroups([response.data, ...groups]);
      setOpenDialog(false);
      setNewGroup({ name: '', description: '', privacy: 'public', category: 'general' });
      toast.success('Group created successfully!');
    } catch (error) {
      console.error('Error creating group:', error);
      toast.error('Failed to create group');
    }
  };

  const handleJoinGroup = async (groupId) => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API_URL}/api/content/groups/${groupId}/join`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setGroups(groups.map(g => 
        g.id === groupId 
          ? { ...g, isMember: true, memberCount: g.memberCount + 1 }
          : g
      ));
      toast.success('Joined group successfully!');
    } catch (error) {
      console.error('Error joining group:', error);
      toast.error(error.response?.data?.error || 'Failed to join group');
    }
  };

  const getPrivacyIcon = (privacy) => {
    switch (privacy) {
      case 'public': return <Public fontSize="small" />;
      case 'private': return <Lock fontSize="small" />;
      case 'secret': return <VpnLock fontSize="small" />;
      default: return <Public fontSize="small" />;
    }
  };

  if (loading) {
    return (
      <Container maxWidth="lg">
        <Grid container spacing={3}>
          {[1, 2, 3, 4].map((n) => (
            <Grid item xs={12} sm={6} md={4} key={n}>
              <Card>
                <CardContent>
                  <Skeleton variant="text" width="60%" height={30} />
                  <Skeleton variant="text" width="100%" />
                  <Skeleton variant="text" width="100%" />
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>
    );
  }

  return (
    <Container maxWidth="lg">
      <Box sx={{ mb: 4, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" fontWeight="bold">
          Groups
        </Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={() => setOpenDialog(true)}
        >
          Create Group
        </Button>
      </Box>

      <Grid container spacing={3}>
        {groups.length === 0 ? (
          <Grid item xs={12}>
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <GroupIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
              <Typography variant="h6" color="text.secondary">
                No groups found
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                Create your first group to get started
              </Typography>
            </Box>
          </Grid>
        ) : (
          groups.map((group) => (
            <Grid item xs={12} sm={6} md={4} key={group.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                    <Avatar sx={{ mr: 2, bgcolor: 'primary.main' }}>
                      <GroupIcon />
                    </Avatar>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" component="div" noWrap>
                        {group.name}
                      </Typography>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        {getPrivacyIcon(group.privacy)}
                        <Typography variant="caption" color="text.secondary">
                          {group.privacy}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                  
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {group.description || 'No description'}
                  </Typography>

                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                    <Chip label={group.category} size="small" variant="outlined" />
                    <Chip 
                      label={`${formatNumber(group.memberCount)} members`} 
                      size="small" 
                      color="primary" 
                      variant="outlined"
                    />
                  </Box>

                  <Typography variant="caption" color="text.secondary">
                    Created {formatRelativeTime(group.createdAt)}
                  </Typography>
                </CardContent>

                <CardActions>
                  {group.isMember ? (
                    <Button size="small" variant="outlined" fullWidth disabled>
                      Member
                    </Button>
                  ) : (
                    <Button 
                      size="small" 
                      variant="contained" 
                      fullWidth
                      onClick={() => handleJoinGroup(group.id)}
                    >
                      Join Group
                    </Button>
                  )}
                </CardActions>
              </Card>
            </Grid>
          ))
        )}
      </Grid>

      <Dialog open={openDialog} onClose={() => setOpenDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Group</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label="Group Name"
            fullWidth
            value={newGroup.name}
            onChange={(e) => setNewGroup({ ...newGroup, name: e.target.value })}
            sx={{ mb: 2 }}
          />
          
          <TextField
            margin="dense"
            label="Description"
            fullWidth
            multiline
            rows={3}
            value={newGroup.description}
            onChange={(e) => setNewGroup({ ...newGroup, description: e.target.value })}
            sx={{ mb: 2 }}
          />

          <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
            <InputLabel>Privacy</InputLabel>
            <Select
              value={newGroup.privacy}
              label="Privacy"
              onChange={(e) => setNewGroup({ ...newGroup, privacy: e.target.value })}
            >
              <MenuItem value="public">Public - Anyone can join</MenuItem>
              <MenuItem value="private">Private - Approval required</MenuItem>
              <MenuItem value="secret">Secret - Invite only</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth margin="dense">
            <InputLabel>Category</InputLabel>
            <Select
              value={newGroup.category}
              label="Category"
              onChange={(e) => setNewGroup({ ...newGroup, category: e.target.value })}
            >
              <MenuItem value="general">General</MenuItem>
              <MenuItem value="technology">Technology</MenuItem>
              <MenuItem value="business">Business</MenuItem>
              <MenuItem value="education">Education</MenuItem>
              <MenuItem value="entertainment">Entertainment</MenuItem>
              <MenuItem value="other">Other</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancel</Button>
          <Button onClick={handleCreateGroup} variant="contained">
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Container>
  );
};

export default Groups;
