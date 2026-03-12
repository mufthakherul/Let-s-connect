import React, { useState, useEffect, useRef, useCallback } from 'react';
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
  Divider,
  CircularProgress,
  FormControlLabel,
  Switch,
  ToggleButtonGroup,
  ToggleButton,
  Badge
} from '@mui/material';
import {
  ContentCopy,
  ThumbUp,
  Favorite,
  EmojiEmotions,
  Reply,
  Forward,
  MoreVert,
  Person,
  Groups,
  DoneAll,
  Done,
  AutoAwesome as SmartToyIcon,
  LockOutlined,
  Phone,
  Videocam,
  DeleteOutline,
  Timer
} from '@mui/icons-material';
import { VariableSizeList } from 'react-window';
import io from 'socket.io-client';
import toast from 'react-hot-toast';
import api from '../utils/api';
import config from '../config/api';

const extractApiData = (response) => {
  const body = response?.data;
  if (body && typeof body === 'object' && Object.prototype.hasOwnProperty.call(body, 'data')) {
    return body.data;
  }
  return body;
};

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
  const [chatMode, setChatMode] = useState('all');

  // Phase 14: Typing indicators, presence, delivery receipts
  const [typingUsers, setTypingUsers] = useState({}); // { conversationId: { userId: timeout } }
  const [onlineUsers, setOnlineUsers] = useState(new Set()); // set of online userIds
  const [deliveredMessages, setDeliveredMessages] = useState(new Set()); // messageIds known delivered
  const [readMessages, setReadMessages] = useState(new Set());
  const typingTimerRef = useRef(null);
  const presenceHeartbeatRef = useRef(null);

  // Phase 18: AI chat suggestions
  const [aiSuggestEnabled, setAiSuggestEnabled] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState([]);
  const [aiSuggestLoading, setAiSuggestLoading] = useState(false);
  const aiDebounceRef = useRef(null);

  // Phase 3: Unread count, ephemeral messages, call buttons, virtualized list
  const [unreadCount, setUnreadCount] = useState(0);
  const [ephemeralEnabled, setEphemeralEnabled] = useState(false);
  const [conversationSettingsAnchor, setConversationSettingsAnchor] = useState(null);
  const [listHeight, setListHeight] = useState(500);
  const listRef = useRef(null);
  const listContainerRef = useRef(null);

  useEffect(() => {
    fetchConversations();
    // Phase 3: Fetch unread message count on mount
    api.get('/messaging/messages/unread-count')
      .then((res) => { const d = extractApiData(res); setUnreadCount(d?.unreadCount || 0); })
      .catch(() => {});
    const newSocket = io(config.MESSAGING_SERVICE_URL, {
      transports: ['websocket', 'polling'],
      withCredentials: true,
    });
    setSocket(newSocket);

    // Phase 14: Register user presence on connect
    newSocket.on('connect', () => {
      if (user?.id) {
        newSocket.emit('user-connect', { userId: user.id });
        // Heartbeat every 60s to keep presence alive
        presenceHeartbeatRef.current = setInterval(() => {
          newSocket.emit('presence-heartbeat', { userId: user.id });
        }, 60000);
      }
    });

    // Phase 14: Presence events
    newSocket.on('user-online', ({ userId }) => {
      setOnlineUsers((prev) => new Set([...prev, userId]));
    });
    newSocket.on('user-offline', ({ userId }) => {
      setOnlineUsers((prev) => { const next = new Set(prev); next.delete(userId); return next; });
    });

    // Phase 14: Delivery receipts
    newSocket.on('message-delivered', ({ messageId }) => {
      setDeliveredMessages((prev) => new Set([...prev, messageId]));
    });
    newSocket.on('message-read-receipt', ({ messageId }) => {
      setReadMessages((prev) => new Set([...prev, messageId]));
    });

    return () => {
      newSocket.close();
      clearInterval(presenceHeartbeatRef.current);
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Phase 3: Measure list container height for VariableSizeList
  useEffect(() => {
    const el = listContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setListHeight(entry.contentRect.height || 500);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Phase 3: Auto-scroll to bottom and reset item sizes on new messages
  useEffect(() => {
    if (listRef.current && messages.length > 0) {
      listRef.current.resetAfterIndex(0, true);
      listRef.current.scrollToItem(messages.length - 1, 'end');
    }
  }, [messages.length]);
  const emitTyping = useCallback(() => {
    if (!socket || !selectedConversation || !user?.id) return;
    socket.emit('typing', { conversationId: selectedConversation.id, userId: user.id });
    clearTimeout(typingTimerRef.current);
    typingTimerRef.current = setTimeout(() => {
      socket.emit('stop-typing', { conversationId: selectedConversation.id, userId: user.id });
    }, 2000);
  }, [socket, selectedConversation, user]);

  const fetchConversations = async () => {
    try {
      const response = await api.get(`/messaging/conversations/${user.id}`);
      const data = extractApiData(response);
      setConversations(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
      toast.error('Failed to load conversations');
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const response = await api.get(`/messaging/conversations/${conversationId}/messages`);
      const data = extractApiData(response);
      setMessages(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      toast.error('Failed to load messages');
    }
  };

  const handleSelectConversation = (conversation) => {
    setSelectedConversation(conversation);
    fetchMessages(conversation.id);
  };

  const getConversationType = (conv) => {
    if (conv?.type === 'group' || conv?.type === 'channel') return 'u2g';
    return 'u2u';
  };

  const visibleConversations = conversations.filter((conv) => {
    if (chatMode === 'all') return true;
    return getConversationType(conv) === chatMode;
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    if (ephemeralEnabled) {
      // Phase 3: Send ephemeral message via REST with 1h TTL
      try {
        const res = await api.post(`/messaging/conversations/${selectedConversation.id}/messages`, {
          senderId: user.id,
          content: newMessage,
          type: 'text',
          replyToId: replyingTo?.id || null,
          ephemeralTtl: 3600
        });
        const msg = extractApiData(res);
        if (msg) setMessages((prev) => [...prev, msg]);
      } catch (err) {
        console.error('Failed to send ephemeral message:', err);
        toast.error('Failed to send message');
        return;
      }
    } else if (socket) {
      socket.emit('send-message', {
        conversationId: selectedConversation.id,
        senderId: user.id,
        content: newMessage,
        type: 'text',
        // Phase 2: Include reply if replying
        replyToId: replyingTo?.id || null
      });
    }

    setNewMessage('');
    setReplyingTo(null);
    setAiSuggestions([]);
  };

  // Phase 18: debounce AI suggestion fetch when user is typing
  const handleMessageChange = (e) => {
    const value = e.target.value;
    setNewMessage(value);
    emitTyping();
    if (!aiSuggestEnabled || !value.trim() || value.length < 5) {
      setAiSuggestions([]);
      return;
    }
    clearTimeout(aiDebounceRef.current);
    aiDebounceRef.current = setTimeout(async () => {
      try {
        setAiSuggestLoading(true);
        const history = messages.slice(-10).map((m) => ({
          role: m.senderId === user?.id ? 'user' : 'assistant',
          content: m.content
        }));
        const res = await api.post('/ai-service/suggest/chat', { history, partialInput: value });
        setAiSuggestions(res.data?.suggestions || []);
      } catch (_e) {
        setAiSuggestions([]);
      } finally {
        setAiSuggestLoading(false);
      }
    }, 700);
  };

  const fetchDiscovery = async () => {
    try {
      setDiscoverLoading(true);
      const [discover, popular, cats] = await Promise.all([
        api.get('/messaging/servers/discover'),
        api.get('/messaging/servers/popular'),
        api.get('/messaging/servers/categories')
      ]);
      setDiscoverServers(Array.isArray(extractApiData(discover)) ? extractApiData(discover) : []);
      setPopularServers(Array.isArray(extractApiData(popular)) ? extractApiData(popular) : []);
      setCategories(Array.isArray(extractApiData(cats)) ? extractApiData(cats) : []);
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
      const data = extractApiData(response);
      setSearchResults(Array.isArray(data) ? data : []);
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

  // Phase 3: Delete message with optimistic removal, restore on failure
  const handleDeleteMessage = async (messageId) => {
    const backup = [...messages];
    setMessages((prev) => prev.filter((m) => m.id !== messageId));
    handleMessageMenuClose();
    try {
      await api.delete(`/messaging/messages/${messageId}`);
      toast.success('Message deleted');
    } catch (err) {
      console.error('Failed to delete message:', err);
      setMessages(backup);
      toast.error('Failed to delete message');
    }
  };

  // Phase 3: Initiate voice or video call
  const handleInitiateCall = async (type) => {
    if (!selectedConversation) return;
    toast('Calling\u2026', { icon: type === 'video' ? '\uD83D\uDCF9' : '\uD83D\uDCDE' });
    try {
      await api.post('/messaging/calls/initiate', {
        conversationId: selectedConversation.id,
        type
      });
      toast.success(`${type === 'video' ? 'Video' : 'Voice'} call started`);
    } catch (err) {
      console.error('Call initiation failed:', err);
      toast.error('Call failed to connect');
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

      const handleNewMessage = (message) => {
        setMessages((prev) => [...prev, message]);
        // Phase 14: Emit read receipt for received messages
        if (message.senderId !== user?.id) {
          socket.emit('message-read', {
            messageId: message.id,
            conversationId: selectedConversation.id,
            readerId: user?.id
          });
        }
      };

      // Phase 14: Typing indicators
      const handleUserTyping = ({ userId, conversationId }) => {
        if (userId === user?.id) return;
        setTypingUsers((prev) => ({
          ...prev,
          [conversationId]: { ...(prev[conversationId] || {}), [userId]: Date.now() }
        }));
      };
      const handleUserStoppedTyping = ({ userId, conversationId }) => {
        setTypingUsers((prev) => {
          const updated = { ...prev };
          if (updated[conversationId]) {
            delete updated[conversationId][userId];
          }
          return updated;
        });
      };

      socket.on('new-message', handleNewMessage);
      socket.on('user-typing', handleUserTyping);
      socket.on('user-stopped-typing', handleUserStoppedTyping);

      return () => {
        socket.off('new-message', handleNewMessage);
        socket.off('user-typing', handleUserTyping);
        socket.off('user-stopped-typing', handleUserStoppedTyping);
      };
    }
  }, [socket, selectedConversation, user]);

  useEffect(() => {
    if (tab === 1) {
      fetchDiscovery();
    }
  }, [tab]);

  // Phase 3: Estimate row height for VariableSizeList based on content
  const getItemSize = (index) => {
    const message = messages[index];
    if (!message) return 100;
    const contentLen = (message.content || '').length;
    const lines = Math.max(1, Math.ceil(contentLen / 45));
    const base = 72;
    const reactionH = (message.reactions?.length > 0) ? 32 : 0;
    const replyH = message.replyTo ? 44 : 0;
    const ephemeralH = message.ephemeralTtl ? 28 : 0;
    return base + lines * 20 + reactionH + replyH + ephemeralH;
  };

  // Phase 3: Row renderer for VariableSizeList (no hooks — uses closures)
  const renderMessageRow = ({ index, style }) => {
    const message = messages[index];
    if (!message) return null;
    return (
      <Box style={style} sx={{ px: 2, py: 0.5 }}>
        <Card
          sx={{
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
                  mb: 1, p: 0.5, bgcolor: 'action.hover',
                  borderRadius: 1, borderLeft: 3, borderColor: 'primary.main'
                }}
              >
                <Typography variant="caption" color="text.secondary">Replying to:</Typography>
                <Typography variant="caption" display="block" sx={{ fontStyle: 'italic' }}>
                  {message.replyTo.content?.substring(0, 50)}{message.replyTo.content?.length > 50 ? '...' : ''}
                </Typography>
              </Box>
            )}

            {/* Phase 2: Forwarded badge */}
            {message.forwardedFrom && (
              <Chip label="Forwarded" size="small" sx={{ mb: 0.5 }} icon={<Forward fontSize="small" />} />
            )}

            {/* Phase 3: Ephemeral indicator */}
            {message.ephemeralTtl && (
              <Chip
                icon={<Timer fontSize="small" />}
                label="Disappears in 1h"
                size="small"
                color="warning"
                variant="outlined"
                sx={{ mb: 0.5 }}
              />
            )}

            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <Typography variant="body2">{message.content}</Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', ml: 1, gap: 0.5 }}>
                {/* Phase 14: Delivery / read receipt for own messages */}
                {message.senderId === user?.id && (
                  <Tooltip title={readMessages.has(message.id) ? 'Read' : deliveredMessages.has(message.id) ? 'Delivered' : 'Sent'}>
                    {readMessages.has(message.id)
                      ? <DoneAll fontSize="inherit" sx={{ color: 'primary.main', fontSize: 14 }} />
                      : <Done fontSize="inherit" sx={{ color: 'text.disabled', fontSize: 14 }} />}
                  </Tooltip>
                )}
                <IconButton size="small" onClick={(e) => handleMessageMenuOpen(e, message)}>
                  <MoreVert fontSize="small" />
                </IconButton>
              </Box>
            </Box>

            {/* Phase 2: Reaction chips */}
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

            {/* Phase 2: Quick reaction + reply buttons */}
            <Box sx={{ mt: 0.5, display: 'flex', gap: 0.5 }}>
              <Tooltip title="Add reaction">
                <IconButton size="small" onClick={(e) => handleReactionPickerOpen(e, message)}>
                  <EmojiEmotions fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Reply">
                <IconButton size="small" onClick={() => handleReplyToMessage(message)}>
                  <Reply fontSize="small" />
                </IconButton>
              </Tooltip>
            </Box>
          </CardContent>
        </Card>
      </Box>
    );
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(_, value) => setTab(value)} sx={{ mb: 3 }}>
        {/* Phase 3: Unread count badge on Messages tab */}
        <Tab label={
          <Badge badgeContent={unreadCount || 0} color="error" max={99}>
            Messages
          </Badge>
        } />
        <Tab label="Server Discovery" />
      </Tabs>

      {tab === 0 && (
        <Box sx={{ display: 'flex', height: '70vh', flexDirection: { xs: 'column', md: 'row' } }}>
          <Box sx={{ width: { xs: '100%', md: '34%' }, borderRight: { xs: 0, md: 1 }, borderBottom: { xs: 1, md: 0 }, borderColor: 'divider', overflowY: 'auto' }}>
            <Box sx={{ p: 2 }}>
              <Typography variant="h6">Conversations</Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                Switch between direct (U2U) and group/channel (U2G) flows.
              </Typography>
              <ToggleButtonGroup
                color="primary"
                value={chatMode}
                exclusive
                onChange={(_, next) => { if (next) setChatMode(next); }}
                size="small"
                sx={{ mt: 1.5, flexWrap: 'wrap' }}
              >
                <ToggleButton value="all">All</ToggleButton>
                <ToggleButton value="u2u"><Person sx={{ mr: 0.5, fontSize: 16 }} />U2U</ToggleButton>
                <ToggleButton value="u2g"><Groups sx={{ mr: 0.5, fontSize: 16 }} />U2G</ToggleButton>
              </ToggleButtonGroup>
            </Box>
            <List>
              {visibleConversations.map((conv) => (
                <ListItem
                  button
                  key={conv.id}
                  selected={selectedConversation?.id === conv.id}
                  onClick={() => handleSelectConversation(conv)}
                >
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>{conv.name || 'Chat'}</Typography>
                        <Chip
                          size="small"
                          variant="outlined"
                          icon={getConversationType(conv) === 'u2g' ? <Groups fontSize="small" /> : <Person fontSize="small" />}
                          label={getConversationType(conv) === 'u2g' ? 'U2G' : 'U2U'}
                        />
                        {/* Phase 14: Online presence indicator for DM conversations */}
                        {getConversationType(conv) === 'u2u' &&
                          conv.participants?.some(pid => pid !== user?.id && onlineUsers.has(pid)) && (
                            <Box
                              component="span"
                              sx={{ width: 8, height: 8, borderRadius: '50%', bgcolor: 'success.main', flexShrink: 0 }}
                              title="Online"
                            />
                          )}
                      </Box>
                    }
                    secondary={conv.lastMessage}
                  />
                </ListItem>
              ))}
              {!visibleConversations.length && (
                <ListItem>
                  <ListItemText primary="No conversations in this mode" secondary="Try another mode or start a new chat." />
                </ListItem>
              )}
            </List>
          </Box>

          <Box sx={{ width: { xs: '100%', md: '66%' }, display: 'flex', flexDirection: 'column' }}>
            <Box sx={{ px: 2, py: 1.25, borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" spacing={1}>
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
                    {selectedConversation?.name || 'Select a conversation'}
                  </Typography>
                  {/* Phase 3: E2E encryption visual badge */}
                  {selectedConversation && (
                    <Tooltip title="End-to-end encrypted">
                      <LockOutlined sx={{ fontSize: 16, color: 'success.main' }} />
                    </Tooltip>
                  )}
                  {selectedConversation && (
                    <Chip
                      size="small"
                      color="primary"
                      variant="outlined"
                      icon={getConversationType(selectedConversation) === 'u2g' ? <Groups fontSize="small" /> : <Person fontSize="small" />}
                      label={getConversationType(selectedConversation) === 'u2g' ? 'Group / Channel' : 'Direct chat'}
                    />
                  )}
                </Stack>
                {selectedConversation && (
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {/* Phase 3: Voice call */}
                    <Tooltip title="Voice call">
                      <IconButton size="small" onClick={() => handleInitiateCall('audio')}>
                        <Phone fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {/* Phase 3: Video call */}
                    <Tooltip title="Video call">
                      <IconButton size="small" onClick={() => handleInitiateCall('video')}>
                        <Videocam fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {/* Phase 3: Conversation settings (ephemeral toggle) */}
                    <Tooltip title="Conversation settings">
                      <IconButton size="small" onClick={(e) => setConversationSettingsAnchor(e.currentTarget)}>
                        <MoreVert fontSize="small" />
                      </IconButton>
                    </Tooltip>
                  </Stack>
                )}
              </Stack>
            </Box>
            {/* Phase 3: Virtualized message list with react-window */}
            <Box ref={listContainerRef} sx={{ flexGrow: 1, overflow: 'hidden' }}>
              {messages.length === 0 ? (
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                  <Typography variant="body2" color="text.secondary">
                    {selectedConversation ? 'No messages yet. Say hello!' : 'Select a conversation to start chatting.'}
                  </Typography>
                </Box>
              ) : (
                <VariableSizeList
                  ref={listRef}
                  height={listHeight}
                  width="100%"
                  itemCount={messages.length}
                  itemSize={getItemSize}
                  overscanCount={5}
                >
                  {renderMessageRow}
                </VariableSizeList>
              )}
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
                      {replyingTo.content?.substring(0, 50)}{replyingTo.content?.length > 50 ? '...' : ''}
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => setReplyingTo(null)}>
                    <Typography variant="caption">✕</Typography>
                  </IconButton>
                </Box>
              )}

              {/* Phase 14: Typing indicator */}
              {selectedConversation && Object.keys(typingUsers[selectedConversation.id] || {}).length > 0 && (
                <Box sx={{ mb: 0.5, px: 1 }}>
                  <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                    {Object.keys(typingUsers[selectedConversation.id]).length === 1
                      ? 'Someone is typing…'
                      : `${Object.keys(typingUsers[selectedConversation.id]).length} people are typing…`}
                  </Typography>
                </Box>
              )}

              {/* Phase 18: AI suggestion chips */}
              {aiSuggestEnabled && (
                <Box sx={{ mb: 0.5, px: 0.5, display: 'flex', gap: 0.5, flexWrap: 'wrap', alignItems: 'center' }}>
                  {aiSuggestLoading && <CircularProgress size={14} />}
                  {aiSuggestions.map((s, i) => (
                    <Chip
                      key={i}
                      label={s}
                      size="small"
                      icon={<SmartToyIcon fontSize="small" />}
                      onClick={() => { setNewMessage(s); setAiSuggestions([]); }}
                      variant="outlined"
                      color="secondary"
                      sx={{ cursor: 'pointer' }}
                    />
                  ))}
                </Box>
              )}

              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <Tooltip title="Toggle AI suggestions">
                  <FormControlLabel
                    control={
                      <Switch
                        size="small"
                        checked={aiSuggestEnabled}
                        onChange={(e) => { setAiSuggestEnabled(e.target.checked); setAiSuggestions([]); }}
                        color="secondary"
                      />
                    }
                    label={<SmartToyIcon fontSize="small" color={aiSuggestEnabled ? 'secondary' : 'disabled'} />}
                    sx={{ mr: 0 }}
                  />
                </Tooltip>
                {/* Phase 3: Ephemeral icon shown when disappearing messages are active */}
                {ephemeralEnabled && (
                  <Tooltip title="Disappearing messages enabled (1h)">
                    <Timer fontSize="small" color="warning" />
                  </Tooltip>
                )}
                <TextField
                  fullWidth
                  size="small"
                  placeholder={selectedConversation ? `Message in ${getConversationType(selectedConversation) === 'u2g' ? 'group/channel' : 'direct chat'}...` : 'Select a conversation first...'}
                  value={newMessage}
                  onChange={handleMessageChange}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  disabled={!selectedConversation}
                />
                <Button variant="contained" onClick={handleSendMessage} disabled={!selectedConversation}>
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
        {/* Phase 3: Delete own messages only */}
        {selectedMessage?.senderId === user?.id && (
          <MenuItem onClick={() => handleDeleteMessage(selectedMessage?.id)} sx={{ color: 'error.main' }}>
            <DeleteOutline fontSize="small" sx={{ mr: 1 }} />
            Delete
          </MenuItem>
        )}
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

      {/* Phase 3: Conversation settings menu — ephemeral message toggle */}
      <Menu
        anchorEl={conversationSettingsAnchor}
        open={Boolean(conversationSettingsAnchor)}
        onClose={() => setConversationSettingsAnchor(null)}
      >
        <MenuItem disableRipple>
          <FormControlLabel
            control={
              <Switch
                size="small"
                checked={ephemeralEnabled}
                onChange={(e) => setEphemeralEnabled(e.target.checked)}
                color="warning"
              />
            }
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                <Timer fontSize="small" />
                <Typography variant="body2">Disappearing messages</Typography>
              </Box>
            }
          />
        </MenuItem>
      </Menu>
    </Box>
  );
}

export default Chat;