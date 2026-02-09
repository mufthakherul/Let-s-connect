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
  Skeleton,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  Divider
} from '@mui/material';
import { 
  ContentCopy, 
  ThumbUp, 
  Favorite, 
  EmojiEmotions, 
  Reply, 
  Forward, 
  MoreVert 
} from '@mui/icons-material';
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
  
  // Phase 2: Message reactions, reply, forward
  const [replyingTo, setReplyingTo] = useState(null);
  const [messageMenuAnchor, setMessageMenuAnchor] = useState(null);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [reactionPickerAnchor, setReactionPickerAnchor] = useState(null);
  const [forwardDialogOpen, setForwardDialogOpen] = useState(false);

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
      type: 'text',
      // Phase 2: Include reply if replying
      replyToId: replyingTo?.id || null
    });

    setNewMessage('');
    setReplyingTo(null);
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

  // ========== PHASE 2: Message Reactions, Reply, Forward ==========
  
  const handleAddReaction = async (messageId, reactionType) => {
    try {
      await api.post(`/messaging/messages/${messageId}/reactions`, { reactionType });
      // Update message reactions locally
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = msg.reactions || [];
          const existingReaction = reactions.find(r => r.userId === user.id);
          if (existingReaction) {
            existingReaction.reactionType = reactionType;
          } else {
            reactions.push({ userId: user.id, reactionType });
          }
          return { ...msg, reactions, reactionCount: reactions.length };
        }
        return msg;
      }));
      toast.success('Reaction added');
      setReactionPickerAnchor(null);
    } catch (err) {
      console.error('Failed to add reaction:', err);
      toast.error('Failed to add reaction');
    }
  };

  const handleRemoveReaction = async (messageId) => {
    try {
      await api.delete(`/messaging/messages/${messageId}/reactions`);
      // Update message reactions locally
      setMessages(prev => prev.map(msg => {
        if (msg.id === messageId) {
          const reactions = (msg.reactions || []).filter(r => r.userId !== user.id);
          return { ...msg, reactions, reactionCount: reactions.length };
        }
        return msg;
      }));
      toast.success('Reaction removed');
    } catch (err) {
      console.error('Failed to remove reaction:', err);
      toast.error('Failed to remove reaction');
    }
  };

  const handleReplyToMessage = (message) => {
    setReplyingTo(message);
    setMessageMenuAnchor(null);
  };

  const handleForwardMessage = async (message, targetConversationId) => {
    try {
      await api.post(`/messaging/messages/${message.id}/forward`, {
        conversationId: targetConversationId
      });
      toast.success('Message forwarded');
      setForwardDialogOpen(false);
      setMessageMenuAnchor(null);
    } catch (err) {
      console.error('Failed to forward message:', err);
      toast.error('Failed to forward message');
    }
  };

  const handleMessageMenuOpen = (event, message) => {
    setMessageMenuAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleMessageMenuClose = () => {
    setMessageMenuAnchor(null);
    setSelectedMessage(null);
  };

  const handleReactionPickerOpen = (event, message) => {
    setReactionPickerAnchor(event.currentTarget);
    setSelectedMessage(message);
  };

  const handleReactionPickerClose = () => {
    setReactionPickerAnchor(null);
    setSelectedMessage(null);
  };

  const hasUserReacted = (message) => {
    return (message.reactions || []).some(r => r.userId === user.id);
  };

  const getUserReaction = (message) => {
    return (message.reactions || []).find(r => r.userId === user.id)?.reactionType;
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
                    bgcolor: message.senderId === user.id ? 'primary.light' : 'grey.200',
                    position: 'relative'
                  }}
                >
                  <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                    {/* Phase 2: Show reply context */}
                    {message.replyTo && (
                      <Box 
                        sx={{ 
                          mb: 1, 
                          p: 0.5, 
                          bgcolor: 'action.hover', 
                          borderRadius: 1,
                          borderLeft: 3,
                          borderColor: 'primary.main'
                        }}
                      >
                        <Typography variant="caption" color="text.secondary">
                          Replying to:
                        </Typography>
                        <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                          {message.replyTo.content?.substring(0, 50)}...
                        </Typography>
                      </Box>
                    )}
                    
                    {/* Phase 2: Show forwarded context */}
                    {message.forwardedFrom && (
                      <Chip 
                        label="Forwarded" 
                        size="small" 
                        sx={{ mb: 0.5 }}
                        icon={<Forward fontSize="small" />}
                      />
                    )}

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                      <Typography variant="body2">{message.content}</Typography>
                      <IconButton 
                        size="small" 
                        onClick={(e) => handleMessageMenuOpen(e, message)}
                        sx={{ ml: 1 }}
                      >
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Box>

                    {/* Phase 2: Show reactions */}
                    {message.reactions && message.reactions.length > 0 && (
                      <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                        {Object.entries(
                          message.reactions.reduce((acc, r) => {
                            acc[r.reactionType] = (acc[r.reactionType] || 0) + 1;
                            return acc;
                          }, {})
                        ).map(([type, count]) => (
                          <Chip
                            key={type}
                            label={`${type} ${count}`}
                            size="small"
                            onClick={() => {
                              const userReaction = getUserReaction(message);
                              if (userReaction === type) {
                                handleRemoveReaction(message.id);
                              } else {
                                handleAddReaction(message.id, type);
                              }
                            }}
                            variant={getUserReaction(message) === type ? 'filled' : 'outlined'}
                            sx={{ cursor: 'pointer' }}
                          />
                        ))}
                      </Box>
                    )}

                    {/* Phase 2: Quick reaction button */}
                    <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
                      <Tooltip title="Add reaction">
                        <IconButton 
                          size="small" 
                          onClick={(e) => handleReactionPickerOpen(e, message)}
                        >
                          <EmojiEmotions fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Reply">
                        <IconButton 
                          size="small" 
                          onClick={() => handleReplyToMessage(message)}
                        >
                          <Reply fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>

            <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
              {/* Phase 2: Show replying indicator */}
              {replyingTo && (
                <Box 
                  sx={{ 
                    mb: 1, 
                    p: 1, 
                    bgcolor: 'action.hover', 
                    borderRadius: 1,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <Box>
                    <Typography variant="caption" color="primary">
                      Replying to:
                    </Typography>
                    <Typography variant="body2">
                      {replyingTo.content?.substring(0, 50)}...
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <Typography variant="caption">✕</Typography>
                  </IconButton>
                </Box>
              )}
              
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

      {/* Phase 2: Message Action Menu */}
      <Menu
        anchorEl={messageMenuAnchor}
        open={Boolean(messageMenuAnchor)}
        onClose={handleMessageMenuClose}
      >
        <MenuItem onClick={() => {
          handleReplyToMessage(selectedMessage);
          handleMessageMenuClose();
        }}>
          <Reply fontSize="small" sx={{ mr: 1 }} />
          Reply
        </MenuItem>
        <MenuItem onClick={() => {
          setForwardDialogOpen(true);
          handleMessageMenuClose();
        }}>
          <Forward fontSize="small" sx={{ mr: 1 }} />
          Forward
        </MenuItem>
      </Menu>

      {/* Phase 2: Reaction Picker Menu */}
      <Menu
        anchorEl={reactionPickerAnchor}
        open={Boolean(reactionPickerAnchor)}
        onClose={handleReactionPickerClose}
      >
        {['👍', '❤️', '😂', '😮', '😢', '😡', '🎉', '🔥'].map((emoji) => (
          <MenuItem 
            key={emoji}
            onClick={() => {
              handleAddReaction(selectedMessage?.id, emoji);
              handleReactionPickerClose();
            }}
          >
            <Typography variant="h6">{emoji}</Typography>
          </MenuItem>
        ))}
        <Divider />
        <MenuItem 
          onClick={() => {
            handleRemoveReaction(selectedMessage?.id);
            handleReactionPickerClose();
          }}
          disabled={!hasUserReacted(selectedMessage)}
        >
          Remove Reaction
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Chat;