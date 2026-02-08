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
  Chip,
  Stack,
  Skeleton
} from '@mui/material';
import { ContentCopy } from '@mui/icons-material';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../utils/api';

function Chat({ user }) {
  const [tab, setTab] = useState(0);
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);
  const [discoverLoading, setDiscoverLoading] = useState(true);
  const [discoverServers, setDiscoverServers] = useState([]);
  const [popularServers, setPopularServers] = useState([]);
  const [categories, setCategories] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [inviteCode, setInviteCode] = useState('');

  useEffect(() => {
    fetchConversations();
    const newSocket = io('http://localhost:8003');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  const fetchConversations = async () => {
    try {
      const response = await api.get(`/messaging/conversations/${user.id}`);
      setConversations(response.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      toast.error('Failed to load conversations');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/messaging/conversations/${conversationId}/messages`);
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const handleSendMessage = () => {
    if (!newMessage.trim() || !selectedConversation || !socket) return;

    socket.emit('send-message', {
      conversationId: selectedConversation.id,
      senderId: user.id,
      content: newMessage,
      type: 'text'
    });

    setNewMessage('');
  };

  const fetchDiscovery = async () => {
    try {
      setDiscoverLoading(true);
      const [discover, popular, cats] = await Promise.all([
        api.get('/messaging/servers/discover'),
        api.get('/messaging/servers/popular'),
        api.get('/messaging/servers/categories')
      ]);
      setDiscoverServers(discover.data);
      setPopularServers(popular.data);
      setCategories(cats.data);
    } catch (err) {
      console.error('Failed to fetch server discovery:', err);
      toast.error('Failed to load discovery');
    } finally {
      setDiscoverLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    try {
      const response = await api.get('/messaging/servers/search', {
        params: { q: searchQuery.trim() }
      });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Failed to search servers:', err);
      toast.error('Search failed');
    }
  };

  const handleCopyInviteCode = async (inviteCode) => {
    try {
      await navigator.clipboard.writeText(inviteCode);
      toast.success('Invite code copied');
    } catch (err) {
      console.error('Failed to copy invite code:', err);
      toast.error('Copy failed');
    }
  };

  const handleJoinByInvite = async () => {
    if (!inviteCode.trim()) {
      toast.error('Invite code required');
      return;
    }
    try {
      await api.post('/messaging/servers/join', { userId: user.id, inviteCode: inviteCode.trim() });
      toast.success('Joined server');
      setInviteCode('');
      fetchConversations();
    } catch (err) {
      console.error('Failed to join server:', err);
      toast.error(err.response?.data?.error || 'Join failed');
    }
  };

  useEffect(() => {
    if (socket && selectedConversation) {
      socket.emit('join-conversation', selectedConversation.id);

      socket.on('new-message', (message) => {
        setMessages((prev) => [...prev, message]);
      });
    }
  }, [socket, selectedConversation]);

  useEffect(() => {
    if (tab === 1) {
      fetchDiscovery();
    }
  }, [tab]);

  return (
      <Box>
        <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
          <Tab label="Messages" />
          <Tab label="Server Discovery" />
        </Tabs>

        {tab === 0 && (
          <Box sx={{ display: 'flex', height: '70vh' }}>
            <Box sx={{ width: '30%', borderRight: 1, borderColor: 'divider', overflowY: 'auto' }}>
              <Typography variant="h6" sx={{ p: 2 }}>
                Conversations
              </Typography>
              <List>
                {conversations.map((conv) => (
                  <ListItem
                    button
                    key={conv.id}
                    selected={selectedConversation?.id === conv.id}
                    onClick={() => handleSelectConversation(conv)}
                  >
                    <ListItemText primary={conv.name || 'Chat'} secondary={conv.lastMessage} />
                  </ListItem>
                ))}
              </List>
            </Box>

            <Box sx={{ width: '70%', display: 'flex', flexDirection: 'column' }}>
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 2 }}>
                {messages.map((message) => (
                  <Card
                    key={message.id}
                    sx={{
                      mb: 1,
                      maxWidth: '70%',
                      ml: message.senderId === user.id ? 'auto' : 0,
                      bgcolor: message.senderId === user.id ? 'primary.light' : 'grey.200'
                    }}
                  >
                    <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                      <Typography variant="body2">{message.content}</Typography>
                    </CardContent>
                  </Card>
                ))}
              </Box>

              <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Type a message..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  />
                  <Button variant="contained" onClick={handleSendMessage}>
                    Send
                  </Button>
                </Box>
              </Box>
            </Box>
          </Box>
        )}

        {tab === 1 && (
          <Stack spacing={3}>
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Join by Invite Code
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Invite code"
                    value={inviteCode}
                    onChange={(e) => setInviteCode(e.target.value)}
                    fullWidth
                  />
                  <Button variant="contained" onClick={handleJoinByInvite}>
                    Join
                  </Button>
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Search Servers
                </Typography>
                <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                  <TextField
                    label="Search servers"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    fullWidth
                  />
                  <Button variant="outlined" onClick={handleSearch}>
                    Search
                  </Button>
                </Stack>
                <Grid container spacing={2} sx={{ mt: 2 }}>
                  {searchResults.map((server) => (
                    <Grid item xs={12} md={6} key={server.id}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="subtitle1">{server.name}</Typography>
                          <Typography variant="body2" color="text.secondary">
                            {server.description || 'No description'}
                          </Typography>
                          <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                            <Chip size="small" label={`${server.members || 0} members`} />
                            {server.inviteCode && (
                              <Chip
                                size="small"
                                icon={<ContentCopy />}
                                label={server.inviteCode}
                                onClick={() => handleCopyInviteCode(server.inviteCode)}
                                clickable
                              />
                            )}
                          </Stack>
                        </CardContent>
                      </Card>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Popular Servers
                </Typography>
                {discoverLoading ? (
                  <Grid container spacing={2}>
                    {[1, 2, 3].map((n) => (
                      <Grid item xs={12} md={4} key={n}>
                        <Skeleton variant="rectangular" height={100} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    {popularServers.map((server) => (
                      <Grid item xs={12} md={4} key={server.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1">{server.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {server.description || 'No description'}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Chip size="small" label={`${server.members || 0} members`} />
                              {server.inviteCode && (
                                <Chip
                                  size="small"
                                  icon={<ContentCopy />}
                                  label={server.inviteCode}
                                  onClick={() => handleCopyInviteCode(server.inviteCode)}
                                  clickable
                                />
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Categories
                </Typography>
                <Stack direction="row" spacing={1} flexWrap="wrap">
                  {categories.map((category) => (
                    <Chip key={category.name} label={`${category.name} (${category.count})`} />
                  ))}
                </Stack>
              </CardContent>
            </Card>

            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  All Discoverable Servers
                </Typography>
                {discoverLoading ? (
                  <Grid container spacing={2}>
                    {[1, 2, 3, 4].map((n) => (
                      <Grid item xs={12} md={6} key={n}>
                        <Skeleton variant="rectangular" height={120} />
                      </Grid>
                    ))}
                  </Grid>
                ) : (
                  <Grid container spacing={2}>
                    {discoverServers.map((server) => (
                      <Grid item xs={12} md={6} key={server.id}>
                        <Card variant="outlined">
                          <CardContent>
                            <Typography variant="subtitle1">{server.name}</Typography>
                            <Typography variant="body2" color="text.secondary">
                              {server.description || 'No description'}
                            </Typography>
                            <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                              <Chip size="small" label={`${server.members || 0} members`} />
                              {server.inviteCode && (
                                <Chip
                                  size="small"
                                  icon={<ContentCopy />}
                                  label={server.inviteCode}
                                  onClick={() => handleCopyInviteCode(server.inviteCode)}
                                  clickable
                                />
                              )}
                            </Stack>
                          </CardContent>
                        </Card>
                      </Grid>
                    ))}
                  </Grid>
                )}
              </CardContent>
            </Card>
          </Stack>
        )}
      </Box>
    );
  }

export default Chat;
