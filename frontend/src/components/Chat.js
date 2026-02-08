import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, List, ListItem, ListItemText } from '@mui/material';
import axios from 'axios';
import io from 'socket.io-client';

function Chat({ user }) {
  const [conversations, setConversations] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [socket, setSocket] = useState(null);

  useEffect(() => {
    fetchConversations();
    const newSocket = io('http://localhost:8003');
    setSocket(newSocket);

    return () => newSocket.close();
  }, []);

  useEffect(() => {
    if (socket && selectedConversation) {
      socket.emit('join-conversation', selectedConversation.id);
      
      socket.on('new-message', (message) => {
        setMessages((prev) => [...prev, message]);
      });
    }
  }, [socket, selectedConversation]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/messaging/conversations/${user.id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setConversations(response.data);
    } catch (err) {
      console.error('Failed to fetch conversations:', err);
    }
  };

  const fetchMessages = async (conversationId) => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`/api/messaging/conversations/${conversationId}/messages`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMessages(response.data);
    } catch (err) {
      console.error('Failed to fetch messages:', err);
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

  return (
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
              <ListItemText
                primary={conv.name || 'Chat'}
                secondary={conv.lastMessage}
              />
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
                <Typography variant="body2">
                  {message.content}
                </Typography>
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
  );
}

export default Chat;
