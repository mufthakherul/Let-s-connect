import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  TextField,
  Button,
  List,
  ListItem,
  ListItemText,
  Tabs,
  Tab,
  Grid,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Chip,
  Switch,
  FormControlLabel,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Divider,
  Stack,
  Alert
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Settings,
  ContentCopy,
  VolumeUp,
  Forum,
  Security,
  Webhook as WebhookIcon
} from '@mui/icons-material';
import toast from 'react-hot-toast';
import api from '../utils/api';

function DiscordAdmin({ user }) {
  const [tab, setTab] = useState(0);
  const [myServers, setMyServers] = useState([]);
  const [selectedServer, setSelectedServer] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Server Management
  const [serverDialogOpen, setServerDialogOpen] = useState(false);
  const [serverEditMode, setServerEditMode] = useState(false);
  const [serverForm, setServerForm] = useState({
    name: '',
    description: '',
    category: 'general',
    isPublic: false
  });

  // Role Management
  const [roles, setRoles] = useState([]);
  const [roleDialogOpen, setRoleDialogOpen] = useState(false);
  const [roleEditMode, setRoleEditMode] = useState(false);
  const [roleForm, setRoleForm] = useState({
    name: '',
    color: '#3498db',
    position: 0,
    permissions: []
  });

  // Channel Management
  const [textChannels, setTextChannels] = useState([]);
  const [voiceChannels, setVoiceChannels] = useState([]);
  const [categories, setCategories] = useState([]);
  const [channelDialogOpen, setChannelDialogOpen] = useState(false);
  const [channelType, setChannelType] = useState('text');
  const [channelForm, setChannelForm] = useState({
    name: '',
    topic: '',
    categoryId: '',
    isPrivate: false,
    slowModeSeconds: 0,
    userLimit: 0,
    bitrate: 64000
  });
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [categoryForm, setCategoryForm] = useState({ name: '', position: 0 });

  // Webhook Management
  const [webhooks, setWebhooks] = useState([]);
  const [webhookDialogOpen, setWebhookDialogOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({
    name: '',
    channelId: '',
    avatarUrl: ''
  });

  // Available permissions
  const availablePermissions = [
    'ADMINISTRATOR',
    'MANAGE_SERVER',
    'MANAGE_ROLES',
    'MANAGE_CHANNELS',
    'KICK_MEMBERS',
    'BAN_MEMBERS',
    'CREATE_INVITE',
    'MANAGE_WEBHOOKS',
    'SEND_MESSAGES',
    'MANAGE_MESSAGES',
    'MENTION_EVERYONE',
    'VIEW_CHANNEL'
  ];

  useEffect(() => {
    if (user) {
      fetchMyServers();
    }
  }, [user]);

  useEffect(() => {
    if (selectedServer) {
      fetchServerData();
    }
  }, [selectedServer]);

  const fetchMyServers = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/messaging/users/${user.id}/servers`);
      setMyServers(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedServer(response.data[0]);
      }
    } catch (err) {
      console.error('Failed to fetch servers:', err);
      toast.error('Failed to load servers');
    } finally {
      setLoading(false);
    }
  };

  const fetchServerData = async () => {
    if (!selectedServer) return;
    
    try {
      // Fetch roles
      const rolesResponse = await api.get(`/messaging/servers/${selectedServer.id}/roles`);
      setRoles(rolesResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch roles:', err);
    }

    try {
      // Fetch text channels
      const textChannelsResponse = await api.get(`/messaging/servers/${selectedServer.id}/channels/text`);
      setTextChannels(textChannelsResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch text channels:', err);
    }

    try {
      // Fetch voice channels
      const voiceChannelsResponse = await api.get(`/messaging/servers/${selectedServer.id}/channels/voice`);
      setVoiceChannels(voiceChannelsResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch voice channels:', err);
    }

    try {
      // Fetch categories
      const categoriesResponse = await api.get(`/messaging/servers/${selectedServer.id}/categories`);
      setCategories(categoriesResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch categories:', err);
    }

    try {
      // Fetch webhooks
      const webhooksResponse = await api.get(`/messaging/servers/${selectedServer.id}/webhooks`);
      setWebhooks(webhooksResponse.data || []);
    } catch (err) {
      console.error('Failed to fetch webhooks:', err);
    }
  };

  // Server Management Functions
  const handleCreateServer = async () => {
    try {
      const response = await api.post('/messaging/servers', {
        ...serverForm,
        ownerId: user.id
      });
      toast.success('Server created successfully');
      setServerDialogOpen(false);
      setServerForm({ name: '', description: '', category: 'general', isPublic: false });
      fetchMyServers();
    } catch (err) {
      console.error('Failed to create server:', err);
      toast.error('Failed to create server');
    }
  };

  const handleUpdateServer = async () => {
    if (!selectedServer) return;
    
    try {
      await api.put(`/messaging/servers/${selectedServer.id}`, serverForm);
      toast.success('Server updated successfully');
      setServerDialogOpen(false);
      setServerEditMode(false);
      fetchMyServers();
    } catch (err) {
      console.error('Failed to update server:', err);
      toast.error('Failed to update server');
    }
  };

  const handleDeleteServer = async (serverId) => {
    if (!window.confirm('Are you sure you want to delete this server?')) return;
    
    try {
      await api.delete(`/messaging/servers/${serverId}`);
      toast.success('Server deleted successfully');
      fetchMyServers();
    } catch (err) {
      console.error('Failed to delete server:', err);
      toast.error('Failed to delete server');
    }
  };

  const handleCopyInviteCode = (code) => {
    navigator.clipboard.writeText(code);
    toast.success('Invite code copied to clipboard');
  };

  // Role Management Functions
  const handleCreateRole = async () => {
    if (!selectedServer) return;
    
    try {
      await api.post(`/messaging/servers/${selectedServer.id}/roles`, roleForm);
      toast.success('Role created successfully');
      setRoleDialogOpen(false);
      setRoleForm({ name: '', color: '#3498db', position: 0, permissions: [] });
      fetchServerData();
    } catch (err) {
      console.error('Failed to create role:', err);
      toast.error('Failed to create role');
    }
  };

  const handleUpdateRole = async (roleId) => {
    try {
      await api.put(`/messaging/roles/${roleId}`, roleForm);
      toast.success('Role updated successfully');
      setRoleDialogOpen(false);
      setRoleEditMode(false);
      fetchServerData();
    } catch (err) {
      console.error('Failed to update role:', err);
      toast.error('Failed to update role');
    }
  };

  const handleDeleteRole = async (roleId) => {
    if (!window.confirm('Are you sure you want to delete this role?')) return;
    
    try {
      await api.delete(`/messaging/roles/${roleId}`);
      toast.success('Role deleted successfully');
      fetchServerData();
    } catch (err) {
      console.error('Failed to delete role:', err);
      toast.error('Failed to delete role');
    }
  };

  // Channel Management Functions
  const handleCreateChannel = async () => {
    if (!selectedServer) return;
    
    try {
      const endpoint = channelType === 'text' 
        ? `/messaging/servers/${selectedServer.id}/channels/text`
        : `/messaging/servers/${selectedServer.id}/channels/voice`;
      
      await api.post(endpoint, channelForm);
      toast.success(`${channelType === 'text' ? 'Text' : 'Voice'} channel created successfully`);
      setChannelDialogOpen(false);
      setChannelForm({
        name: '',
        topic: '',
        categoryId: '',
        isPrivate: false,
        slowModeSeconds: 0,
        userLimit: 0,
        bitrate: 64000
      });
      fetchServerData();
    } catch (err) {
      console.error('Failed to create channel:', err);
      toast.error('Failed to create channel');
    }
  };

  const handleUpdateChannel = async (channelId) => {
    try {
      const endpoint = channelType === 'text'
        ? `/messaging/channels/text/${channelId}`
        : `/messaging/channels/voice/${channelId}`;
      
      await api.put(endpoint, channelForm);
      toast.success('Channel updated successfully');
      setChannelDialogOpen(false);
      fetchServerData();
    } catch (err) {
      console.error('Failed to update channel:', err);
      toast.error('Failed to update channel');
    }
  };

  const handleDeleteChannel = async (channelId, type) => {
    if (!window.confirm('Are you sure you want to delete this channel?')) return;
    
    try {
      const endpoint = type === 'text'
        ? `/messaging/channels/text/${channelId}`
        : `/messaging/channels/voice/${channelId}`;
      
      await api.delete(endpoint);
      toast.success('Channel deleted successfully');
      fetchServerData();
    } catch (err) {
      console.error('Failed to delete channel:', err);
      toast.error('Failed to delete channel');
    }
  };

  const handleCreateCategory = async () => {
    if (!selectedServer) return;
    
    try {
      await api.post(`/messaging/servers/${selectedServer.id}/categories`, categoryForm);
      toast.success('Category created successfully');
      setCategoryDialogOpen(false);
      setCategoryForm({ name: '', position: 0 });
      fetchServerData();
    } catch (err) {
      console.error('Failed to create category:', err);
      toast.error('Failed to create category');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    
    try {
      await api.delete(`/messaging/categories/${categoryId}`);
      toast.success('Category deleted successfully');
      fetchServerData();
    } catch (err) {
      console.error('Failed to delete category:', err);
      toast.error('Failed to delete category');
    }
  };

  // Webhook Management Functions
  const handleCreateWebhook = async () => {
    if (!selectedServer) return;
    
    try {
      await api.post(`/messaging/servers/${selectedServer.id}/webhooks`, {
        ...webhookForm,
        createdBy: user.id
      });
      toast.success('Webhook created successfully');
      setWebhookDialogOpen(false);
      setWebhookForm({ name: '', channelId: '', avatarUrl: '' });
      fetchServerData();
    } catch (err) {
      console.error('Failed to create webhook:', err);
      toast.error('Failed to create webhook');
    }
  };

  const handleDeleteWebhook = async (webhookId) => {
    if (!window.confirm('Are you sure you want to delete this webhook?')) return;
    
    try {
      await api.delete(`/messaging/webhooks/${webhookId}`);
      toast.success('Webhook deleted successfully');
      fetchServerData();
    } catch (err) {
      console.error('Failed to delete webhook:', err);
      toast.error('Failed to delete webhook');
    }
  };

  const openServerEditDialog = (server) => {
    setServerForm({
      name: server.name || '',
      description: server.description || '',
      category: server.category || 'general',
      isPublic: server.isPublic || false
    });
    setServerEditMode(true);
    setServerDialogOpen(true);
  };

  const openRoleEditDialog = (role) => {
    setRoleForm({
      name: role.name || '',
      color: role.color || '#3498db',
      position: role.position || 0,
      permissions: role.permissions || []
    });
    setRoleEditMode(true);
    setRoleDialogOpen(true);
  };

  const openChannelEditDialog = (channel, type) => {
    setChannelType(type);
    setChannelForm({
      name: channel.name || '',
      topic: channel.topic || '',
      categoryId: channel.categoryId || '',
      isPrivate: channel.isPrivate || false,
      slowModeSeconds: channel.slowModeSeconds || 0,
      userLimit: channel.userLimit || 0,
      bitrate: channel.bitrate || 64000
    });
    setChannelDialogOpen(true);
  };

  if (!user) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="warning">Please log in to manage Discord servers</Alert>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom>
        Discord Server Management
      </Typography>
      
      <Grid container spacing={3}>
        {/* Server Selection Sidebar */}
        <Grid item xs={12} md={3}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                <Typography variant="h6">My Servers</Typography>
                <IconButton
                  size="small"
                  onClick={() => {
                    setServerEditMode(false);
                    setServerForm({ name: '', description: '', category: 'general', isPublic: false });
                    setServerDialogOpen(true);
                  }}
                >
                  <Add />
                </IconButton>
              </Stack>
              
              <List>
                {myServers.map((server) => (
                  <ListItem
                    key={server.id}
                    button
                    selected={selectedServer?.id === server.id}
                    onClick={() => setSelectedServer(server)}
                  >
                    <ListItemText
                      primary={server.name}
                      secondary={`${server.members || 0} members`}
                    />
                  </ListItem>
                ))}
                {myServers.length === 0 && (
                  <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                    No servers yet. Create one to get started!
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content Area */}
        <Grid item xs={12} md={9}>
          {selectedServer ? (
            <>
              {/* Server Header */}
              <Card sx={{ mb: 3 }}>
                <CardContent>
                  <Stack direction="row" justifyContent="space-between" alignItems="center">
                    <Box>
                      <Typography variant="h5">{selectedServer.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {selectedServer.description || 'No description'}
                      </Typography>
                      <Stack direction="row" spacing={1} mt={1}>
                        <Chip size="small" label={selectedServer.category} />
                        <Chip size="small" label={selectedServer.isPublic ? 'Public' : 'Private'} />
                        {selectedServer.inviteCode && (
                          <Chip
                            size="small"
                            label={`Invite: ${selectedServer.inviteCode}`}
                            icon={<ContentCopy fontSize="small" />}
                            onClick={() => handleCopyInviteCode(selectedServer.inviteCode)}
                          />
                        )}
                      </Stack>
                    </Box>
                    <Stack direction="row" spacing={1}>
                      <IconButton onClick={() => openServerEditDialog(selectedServer)}>
                        <Settings />
                      </IconButton>
                      <IconButton
                        color="error"
                        onClick={() => handleDeleteServer(selectedServer.id)}
                      >
                        <Delete />
                      </IconButton>
                    </Stack>
                  </Stack>
                </CardContent>
              </Card>

              {/* Management Tabs */}
              <Card>
                <Tabs value={tab} onChange={(e, val) => setTab(val)}>
                  <Tab label="Roles" icon={<Security />} iconPosition="start" />
                  <Tab label="Channels" icon={<Forum />} iconPosition="start" />
                  <Tab label="Webhooks" icon={<WebhookIcon />} iconPosition="start" />
                </Tabs>

                <CardContent>
                  {/* Roles Tab */}
                  {tab === 0 && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Roles</Typography>
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={() => {
                            setRoleEditMode(false);
                            setRoleForm({ name: '', color: '#3498db', position: 0, permissions: [] });
                            setRoleDialogOpen(true);
                          }}
                        >
                          Create Role
                        </Button>
                      </Stack>

                      <List>
                        {roles.map((role) => (
                          <ListItem
                            key={role.id}
                            secondaryAction={
                              <Stack direction="row" spacing={1}>
                                <IconButton edge="end" onClick={() => openRoleEditDialog(role)}>
                                  <Edit />
                                </IconButton>
                                <IconButton edge="end" color="error" onClick={() => handleDeleteRole(role.id)}>
                                  <Delete />
                                </IconButton>
                              </Stack>
                            }
                          >
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <Box
                                    sx={{
                                      width: 16,
                                      height: 16,
                                      borderRadius: '50%',
                                      bgcolor: role.color
                                    }}
                                  />
                                  <Typography>{role.name}</Typography>
                                </Stack>
                              }
                              secondary={`Position: ${role.position} | ${(role.permissions || []).length} permissions`}
                            />
                          </ListItem>
                        ))}
                        {roles.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No roles yet. Create one to get started!
                          </Typography>
                        )}
                      </List>
                    </Box>
                  )}

                  {/* Channels Tab */}
                  {tab === 1 && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Channels</Typography>
                        <Stack direction="row" spacing={1}>
                          <Button
                            variant="outlined"
                            size="small"
                            onClick={() => {
                              setCategoryForm({ name: '', position: 0 });
                              setCategoryDialogOpen(true);
                            }}
                          >
                            Add Category
                          </Button>
                          <Button
                            variant="contained"
                            startIcon={<Add />}
                            onClick={() => {
                              setChannelType('text');
                              setChannelForm({
                                name: '',
                                topic: '',
                                categoryId: '',
                                isPrivate: false,
                                slowModeSeconds: 0,
                                userLimit: 0,
                                bitrate: 64000
                              });
                              setChannelDialogOpen(true);
                            }}
                          >
                            Create Channel
                          </Button>
                        </Stack>
                      </Stack>

                      {/* Categories */}
                      {categories.map((category) => (
                        <Box key={category.id} mb={3}>
                          <Stack direction="row" justifyContent="space-between" alignItems="center" mb={1}>
                            <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
                              {category.name}
                            </Typography>
                            <IconButton size="small" color="error" onClick={() => handleDeleteCategory(category.id)}>
                              <Delete />
                            </IconButton>
                          </Stack>
                          <Divider sx={{ mb: 1 }} />
                          
                          {/* Text channels in this category */}
                          {textChannels
                            .filter(ch => ch.categoryId === category.id)
                            .map((channel) => (
                              <ListItem
                                key={channel.id}
                                secondaryAction={
                                  <Stack direction="row" spacing={1}>
                                    <IconButton edge="end" onClick={() => openChannelEditDialog(channel, 'text')}>
                                      <Edit />
                                    </IconButton>
                                    <IconButton edge="end" color="error" onClick={() => handleDeleteChannel(channel.id, 'text')}>
                                      <Delete />
                                    </IconButton>
                                  </Stack>
                                }
                              >
                                <ListItemText
                                  primary={`# ${channel.name}`}
                                  secondary={channel.topic || 'No topic'}
                                />
                              </ListItem>
                            ))}
                          
                          {/* Voice channels in this category */}
                          {voiceChannels
                            .filter(ch => ch.categoryId === category.id)
                            .map((channel) => (
                              <ListItem
                                key={channel.id}
                                secondaryAction={
                                  <Stack direction="row" spacing={1}>
                                    <IconButton edge="end" onClick={() => openChannelEditDialog(channel, 'voice')}>
                                      <Edit />
                                    </IconButton>
                                    <IconButton edge="end" color="error" onClick={() => handleDeleteChannel(channel.id, 'voice')}>
                                      <Delete />
                                    </IconButton>
                                  </Stack>
                                }
                              >
                                <ListItemText
                                  primary={
                                    <Stack direction="row" spacing={1} alignItems="center">
                                      <VolumeUp fontSize="small" />
                                      <Typography>{channel.name}</Typography>
                                    </Stack>
                                  }
                                  secondary={`User limit: ${channel.userLimit || 'Unlimited'}`}
                                />
                              </ListItem>
                            ))}
                        </Box>
                      ))}

                      {/* Uncategorized channels */}
                      <Box>
                        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }} mb={1}>
                          Uncategorized
                        </Typography>
                        <Divider sx={{ mb: 1 }} />
                        
                        {textChannels.filter(ch => !ch.categoryId).map((channel) => (
                          <ListItem
                            key={channel.id}
                            secondaryAction={
                              <Stack direction="row" spacing={1}>
                                <IconButton edge="end" onClick={() => openChannelEditDialog(channel, 'text')}>
                                  <Edit />
                                </IconButton>
                                <IconButton edge="end" color="error" onClick={() => handleDeleteChannel(channel.id, 'text')}>
                                  <Delete />
                                </IconButton>
                              </Stack>
                            }
                          >
                            <ListItemText
                              primary={`# ${channel.name}`}
                              secondary={channel.topic || 'No topic'}
                            />
                          </ListItem>
                        ))}
                        
                        {voiceChannels.filter(ch => !ch.categoryId).map((channel) => (
                          <ListItem
                            key={channel.id}
                            secondaryAction={
                              <Stack direction="row" spacing={1}>
                                <IconButton edge="end" onClick={() => openChannelEditDialog(channel, 'voice')}>
                                  <Edit />
                                </IconButton>
                                <IconButton edge="end" color="error" onClick={() => handleDeleteChannel(channel.id, 'voice')}>
                                  <Delete />
                                </IconButton>
                              </Stack>
                            }
                          >
                            <ListItemText
                              primary={
                                <Stack direction="row" spacing={1} alignItems="center">
                                  <VolumeUp fontSize="small" />
                                  <Typography>{channel.name}</Typography>
                                </Stack>
                              }
                              secondary={`User limit: ${channel.userLimit || 'Unlimited'}`}
                            />
                          </ListItem>
                        ))}
                      </Box>
                    </Box>
                  )}

                  {/* Webhooks Tab */}
                  {tab === 2 && (
                    <Box>
                      <Stack direction="row" justifyContent="space-between" alignItems="center" mb={2}>
                        <Typography variant="h6">Webhooks</Typography>
                        <Button
                          variant="contained"
                          startIcon={<Add />}
                          onClick={() => {
                            setWebhookForm({ name: '', channelId: '', avatarUrl: '' });
                            setWebhookDialogOpen(true);
                          }}
                        >
                          Create Webhook
                        </Button>
                      </Stack>

                      <List>
                        {webhooks.map((webhook) => (
                          <ListItem
                            key={webhook.id}
                            secondaryAction={
                              <IconButton edge="end" color="error" onClick={() => handleDeleteWebhook(webhook.id)}>
                                <Delete />
                              </IconButton>
                            }
                          >
                            <ListItemText
                              primary={webhook.name}
                              secondary={`Token: ${webhook.token?.substring(0, 20)}...`}
                            />
                          </ListItem>
                        ))}
                        {webhooks.length === 0 && (
                          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                            No webhooks yet. Create one to get started!
                          </Typography>
                        )}
                      </List>
                    </Box>
                  )}
                </CardContent>
              </Card>
            </>
          ) : (
            <Card>
              <CardContent>
                <Typography variant="body1" color="text.secondary" align="center">
                  Select a server to manage or create a new one
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>
      </Grid>

      {/* Server Dialog */}
      <Dialog open={serverDialogOpen} onClose={() => setServerDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{serverEditMode ? 'Edit Server' : 'Create Server'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Server Name"
              fullWidth
              value={serverForm.name}
              onChange={(e) => setServerForm({ ...serverForm, name: e.target.value })}
            />
            <TextField
              label="Description"
              fullWidth
              multiline
              rows={3}
              value={serverForm.description}
              onChange={(e) => setServerForm({ ...serverForm, description: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={serverForm.category}
                onChange={(e) => setServerForm({ ...serverForm, category: e.target.value })}
              >
                <MenuItem value="general">General</MenuItem>
                <MenuItem value="gaming">Gaming</MenuItem>
                <MenuItem value="technology">Technology</MenuItem>
                <MenuItem value="education">Education</MenuItem>
                <MenuItem value="entertainment">Entertainment</MenuItem>
                <MenuItem value="community">Community</MenuItem>
              </Select>
            </FormControl>
            <FormControlLabel
              control={
                <Switch
                  checked={serverForm.isPublic}
                  onChange={(e) => setServerForm({ ...serverForm, isPublic: e.target.checked })}
                />
              }
              label="Make server public"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setServerDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={serverEditMode ? handleUpdateServer : handleCreateServer}
          >
            {serverEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Role Dialog */}
      <Dialog open={roleDialogOpen} onClose={() => setRoleDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{roleEditMode ? 'Edit Role' : 'Create Role'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Role Name"
              fullWidth
              value={roleForm.name}
              onChange={(e) => setRoleForm({ ...roleForm, name: e.target.value })}
            />
            <TextField
              label="Color"
              type="color"
              fullWidth
              value={roleForm.color}
              onChange={(e) => setRoleForm({ ...roleForm, color: e.target.value })}
            />
            <TextField
              label="Position"
              type="number"
              fullWidth
              value={roleForm.position}
              onChange={(e) => setRoleForm({ ...roleForm, position: parseInt(e.target.value) })}
            />
            <FormControl fullWidth>
              <InputLabel>Permissions</InputLabel>
              <Select
                multiple
                value={roleForm.permissions}
                onChange={(e) => setRoleForm({ ...roleForm, permissions: e.target.value })}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((value) => (
                      <Chip key={value} label={value} size="small" />
                    ))}
                  </Box>
                )}
              >
                {availablePermissions.map((permission) => (
                  <MenuItem key={permission} value={permission}>
                    {permission}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRoleDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={roleEditMode ? () => handleUpdateRole(roleForm.id) : handleCreateRole}
          >
            {roleEditMode ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Channel Dialog */}
      <Dialog open={channelDialogOpen} onClose={() => setChannelDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create {channelType === 'text' ? 'Text' : 'Voice'} Channel</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Channel Type</InputLabel>
              <Select
                value={channelType}
                onChange={(e) => setChannelType(e.target.value)}
              >
                <MenuItem value="text">Text Channel</MenuItem>
                <MenuItem value="voice">Voice Channel</MenuItem>
              </Select>
            </FormControl>
            
            <TextField
              label="Channel Name"
              fullWidth
              value={channelForm.name}
              onChange={(e) => setChannelForm({ ...channelForm, name: e.target.value })}
            />
            
            {channelType === 'text' && (
              <>
                <TextField
                  label="Topic"
                  fullWidth
                  multiline
                  rows={2}
                  value={channelForm.topic}
                  onChange={(e) => setChannelForm({ ...channelForm, topic: e.target.value })}
                />
                <TextField
                  label="Slow Mode (seconds)"
                  type="number"
                  fullWidth
                  value={channelForm.slowModeSeconds}
                  onChange={(e) => setChannelForm({ ...channelForm, slowModeSeconds: parseInt(e.target.value) })}
                />
              </>
            )}
            
            {channelType === 'voice' && (
              <>
                <TextField
                  label="User Limit (0 for unlimited)"
                  type="number"
                  fullWidth
                  value={channelForm.userLimit}
                  onChange={(e) => setChannelForm({ ...channelForm, userLimit: parseInt(e.target.value) })}
                />
                <TextField
                  label="Bitrate (bps)"
                  type="number"
                  fullWidth
                  value={channelForm.bitrate}
                  onChange={(e) => setChannelForm({ ...channelForm, bitrate: parseInt(e.target.value) })}
                />
              </>
            )}
            
            <FormControl fullWidth>
              <InputLabel>Category</InputLabel>
              <Select
                value={channelForm.categoryId}
                onChange={(e) => setChannelForm({ ...channelForm, categoryId: e.target.value })}
              >
                <MenuItem value="">None</MenuItem>
                {categories.map((cat) => (
                  <MenuItem key={cat.id} value={cat.id}>{cat.name}</MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControlLabel
              control={
                <Switch
                  checked={channelForm.isPrivate}
                  onChange={(e) => setChannelForm({ ...channelForm, isPrivate: e.target.checked })}
                />
              }
              label="Private channel"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setChannelDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateChannel}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialogOpen} onClose={() => setCategoryDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Category</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Category Name"
              fullWidth
              value={categoryForm.name}
              onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
            />
            <TextField
              label="Position"
              type="number"
              fullWidth
              value={categoryForm.position}
              onChange={(e) => setCategoryForm({ ...categoryForm, position: parseInt(e.target.value) })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCategoryDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateCategory}>
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Webhook Dialog */}
      <Dialog open={webhookDialogOpen} onClose={() => setWebhookDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create Webhook</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Webhook Name"
              fullWidth
              value={webhookForm.name}
              onChange={(e) => setWebhookForm({ ...webhookForm, name: e.target.value })}
            />
            <FormControl fullWidth>
              <InputLabel>Channel</InputLabel>
              <Select
                value={webhookForm.channelId}
                onChange={(e) => setWebhookForm({ ...webhookForm, channelId: e.target.value })}
              >
                {textChannels.map((channel) => (
                  <MenuItem key={channel.id} value={channel.id}>
                    {channel.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Avatar URL (optional)"
              fullWidth
              value={webhookForm.avatarUrl}
              onChange={(e) => setWebhookForm({ ...webhookForm, avatarUrl: e.target.value })}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setWebhookDialogOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleCreateWebhook}>
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default DiscordAdmin;
