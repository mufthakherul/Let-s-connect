'use strict';

/**
 * Configures all Socket.IO event handlers.
 * Called from server.js with the io instance and runtime dependencies.
 */
module.exports = function setupSocketHandlers({
  io, redisSub, redis,
  Message, Conversation, Subscription,
  setUserPresence, clearUserPresence, publishEvent,
  webpush, pushNotificationsEnabled
}) {
  io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user-connect', async (data) => {
      const { userId } = data || {};
      if (!userId) return;
      socket.userId = userId;
      socket.join(`user-${userId}`);
      await setUserPresence(userId, 'online');
      socket.broadcast.emit('user-online', { userId, status: 'online' });
      console.log(`[Presence] User ${userId} online`);
    });

    socket.on('set-status', async (data) => {
      const { userId, status, customStatus } = data || {};
      if (!userId) return;
      await setUserPresence(userId, status || 'online', customStatus || '');
      socket.broadcast.emit('user-status-changed', { userId, status, customStatus });
    });

    socket.on('join-conversation', (conversationId) => {
      socket.join(conversationId);
      console.log(`User ${socket.id} joined conversation ${conversationId}`);
    });

    socket.on('send-message', async (data) => {
      try {
        const message = await Message.create({
          conversationId: data.conversationId,
          senderId: data.senderId,
          content: data.content,
          type: data.type,
          attachments: data.attachments,
          replyToId: data.replyToId || null,
          forwardedFromId: data.forwardedFromId || null
        });

        await Conversation.update(
          { lastMessage: data.content, lastMessageAt: new Date() },
          { where: { id: data.conversationId } }
        );

        const messageWithRelations = await Message.findByPk(message.id, {
          include: [
            { model: Message, as: 'replyTo', attributes: ['id', 'senderId', 'content', 'createdAt'] },
            { model: Message, as: 'forwardedFrom', attributes: ['id', 'senderId', 'content', 'createdAt'] }
          ]
        });

        io.to(data.conversationId).emit('new-message', messageWithRelations);
        redis.publish('messages', JSON.stringify(messageWithRelations));

        publishEvent('message.created', {
          messageId: message.id,
          conversationId: data.conversationId,
          senderId: data.senderId
        });

        socket.emit('message-delivered', { messageId: message.id, conversationId: data.conversationId });

        // Push notifications for offline recipients
        const conversation = await Conversation.findByPk(data.conversationId);
        if (conversation && pushNotificationsEnabled) {
          const recipients = conversation.participants.filter(p => p !== data.senderId);
          for (const recipientId of recipients) {
            const subscriptions = await Subscription.findAll({ where: { userId: recipientId } });
            for (const sub of subscriptions) {
              try {
                const payload = JSON.stringify({
                  title: `New message from ${data.senderId}`,
                  body: data.content,
                  url: `/chat/${data.conversationId}`
                });
                await webpush.sendNotification(
                  { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                  payload
                );
              } catch (err) {
                console.error('Failed to send push notification:', err);
                if (err.statusCode === 410) await sub.destroy();
              }
            }
          }
        }
      } catch (error) {
        console.error('Error sending message:', error);
      }
    });

    socket.on('typing', (data) => {
      socket.to(data.conversationId).emit('user-typing', {
        userId: data.userId,
        conversationId: data.conversationId
      });
    });

    socket.on('stop-typing', (data) => {
      socket.to(data.conversationId).emit('user-stopped-typing', {
        userId: data.userId,
        conversationId: data.conversationId
      });
    });

    socket.on('message-read', async (data) => {
      const { messageId, conversationId, readerId } = data || {};
      if (!messageId) return;
      try {
        await Message.update({ isRead: true }, { where: { id: messageId } });
        io.to(conversationId).emit('message-read-receipt', { messageId, readerId });
      } catch { /* non-critical */ }
    });

    socket.on('presence-heartbeat', async (data) => {
      const { userId } = data || {};
      if (!userId) return;
      await setUserPresence(userId, 'online');
    });

    socket.on('join-stream', (channelId) => {
      if (channelId) socket.join(`stream-${channelId}`);
    });

    socket.on('leave-stream', (channelId) => {
      if (channelId) socket.leave(`stream-${channelId}`);
    });

    socket.on('stream-reaction', (data) => {
      const { channelId, emoji } = data || {};
      if (!channelId || !emoji) return;
      const payload = { emoji, userId: socket.userId || null, id: Date.now() + Math.random() };
      io.to(`stream-${channelId}`).emit('stream-reaction', payload);
      publishEvent('stream.reaction', { channelId, emoji, userId: socket.userId });
    });

    socket.on('disconnect', () => {
      console.log('User disconnected:', socket.id);
      if (socket.userId) {
        clearUserPresence(socket.userId).then(() => {
          socket.broadcast.emit('user-offline', { userId: socket.userId });
          console.log(`[Presence] User ${socket.userId} offline`);
        });
      }
    });
  });

  // Subscribe to Redis messages for horizontal scaling
  redisSub.subscribe('messages');
  redisSub.on('message', (channel, message) => {
    if (channel === 'messages') {
      const msg = JSON.parse(message);
      io.to(msg.conversationId).emit('new-message', msg);
    }
  });
};
