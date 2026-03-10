import React, { useState, useEffect, useCallback } from 'react';
import {
  Popover, List, ListItem, ListItemText, ListItemAvatar,
  Avatar, Typography, Box, IconButton, Badge, Divider, Button,
  Dialog, DialogTitle, DialogContent, DialogActions,
  Switch, FormControlLabel, FormGroup, TextField, Chip,
  MenuItem, Select, FormControl, CircularProgress
} from '@mui/material';
import {
  Notifications as NotificationsIcon,
  Settings,
  FavoriteBorder,
  Comment,
  PersonAdd,
  AlternateEmail,
  Message,
  Group,
  Pages,
  Share,
  VideoLibrary,
  ShoppingCart,
  Info,
  Delete,
  Refresh,
  Call
} from '@mui/icons-material';
import io from 'socket.io-client';
import { useNotificationStore } from '../../store/notificationStore';
import { formatRelativeTime } from '../../utils/helpers';
import api from '../../utils/api';
import config from '../../config/api';

// Group notifications by time bucket for better UX
function groupNotifications(notifications) {
  const now = Date.now();
  const oneDayMs = 86400000;
  const oneWeekMs = 7 * oneDayMs;

  const groups = { today: [], thisWeek: [], older: [] };
  for (const n of notifications) {
    const age = now - new Date(n.createdAt).getTime();
    if (age < oneDayMs) groups.today.push(n);
    else if (age < oneWeekMs) groups.thisWeek.push(n);
    else groups.older.push(n);
  }
  return groups;
}

const NotificationCenter = ({ user }) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const [prefsOpen, setPrefsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [preferences, setPreferences] = useState(null);
  const [filterType, setFilterType] = useState('all');

  // Real-time socket for live notifications (Phase 14)
  useEffect(() => {
    if (!user?.id) return;
    const socket = io(config.MESSAGING_SERVICE_URL, { transports: ['websocket', 'polling'], withCredentials: true });
    socket.on('connect', () => {
      socket.emit('user-connect', { userId: user.id });
    });
    socket.on('notification', (notification) => {
      setNotifications((prev) => [notification, ...prev]);
      setUnreadCount((c) => c + 1);
    });
    return () => socket.disconnect();
  }, [user?.id]);

  // Fetch notifications
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const params = {};
      if (filterType !== 'all') {
        params.type = filterType;
      }
      const response = await api.get('/messaging/notifications', { params });
      setNotifications(response.data.notifications || []);
      setUnreadCount(response.data.unreadCount || 0);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [filterType]);

  // Fetch preferences
  const fetchPreferences = async () => {
    try {
      const response = await api.get('/messaging/notifications/preferences');
      setPreferences(response.data?.preferences || response.data || null);
    } catch (error) {
      console.error('Failed to fetch preferences:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  const handleClick = (event) => {
    setAnchorEl(event.currentTarget);
    fetchNotifications();
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/messaging/notifications/${id}/read`);
      setNotifications(notifications.map(n =>
        n.id === id ? { ...n, isRead: true } : n
      ));
      setUnreadCount(Math.max(0, unreadCount - 1));
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.put('/messaging/notifications/read-all');
      setNotifications(notifications.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/messaging/notifications/${id}`);
      setNotifications(notifications.filter(n => n.id !== id));
    } catch (error) {
      console.error('Failed to delete notification:', error);
    }
  };

  const handleDeleteAllRead = async () => {
    try {
      await api.delete('/messaging/notifications/clear-read');
      setNotifications(notifications.filter(n => !n.isRead));
    } catch (error) {
      console.error('Failed to delete read notifications:', error);
    }
  };

  const handleOpenPreferences = () => {
    setPrefsOpen(true);
    fetchPreferences();
  };

  const handleSavePreferences = async () => {
    try {
      await api.put('/messaging/notifications/preferences', preferences);
      setPrefsOpen(false);
    } catch (error) {
      console.error('Failed to save preferences:', error);
    }
  };

  const getNotificationIcon = (type) => {
    const iconMap = {
      like: <FavoriteBorder />,
      comment: <Comment />,
      follow: <PersonAdd />,
      mention: <AlternateEmail />,
      message: <Message />,
      friend_request: <PersonAdd />,
      group_invite: <Group />,
      page_invite: <Pages />,
      post_share: <Share />,
      video_upload: <VideoLibrary />,
      order_status: <ShoppingCart />,
      call: <Call />,
      system: <Info />
    };
    return iconMap[type] || <NotificationsIcon />;
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: 'default',
      normal: 'primary',
      high: 'warning',
      urgent: 'error'
    };
    return colors[priority] || 'default';
  };

  const open = Boolean(anchorEl);

  return (
    <>
      <IconButton color="inherit" onClick={handleClick}>
        <Badge badgeContent={unreadCount} color="error">
          <NotificationsIcon />
        </Badge>
      </IconButton>

      <Popover
        open={open}
        anchorEl={anchorEl}
        onClose={handleClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: 'right',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: 'right',
        }}
      >
        <Box sx={{ width: 400, maxHeight: 600 }}>
          {/* Header */}
          <Box sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="h6">Notifications</Typography>
            <Box>
              <IconButton size="small" onClick={fetchNotifications} disabled={loading}>
                <Refresh />
              </IconButton>
              <IconButton size="small" onClick={handleOpenPreferences}>
                <Settings />
              </IconButton>
            </Box>
          </Box>
          <Divider />

          {/* Filter */}
          <Box sx={{ px: 2, py: 1 }}>
            <FormControl fullWidth size="small">
              <Select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
              >
                <MenuItem value="all">All Notifications</MenuItem>
                <MenuItem value="like">Likes</MenuItem>
                <MenuItem value="comment">Comments</MenuItem>
                <MenuItem value="follow">Follows</MenuItem>
                <MenuItem value="mention">Mentions</MenuItem>
                <MenuItem value="message">Messages</MenuItem>
                <MenuItem value="system">System</MenuItem>
              </Select>
            </FormControl>
          </Box>

          {/* Actions */}
          <Box sx={{ px: 2, pb: 1, display: 'flex', gap: 1 }}>
            {unreadCount > 0 && (
              <Button size="small" onClick={handleMarkAllAsRead}>
                Mark all read
              </Button>
            )}
            {notifications.some(n => n.isRead) && (
              <Button size="small" color="error" onClick={handleDeleteAllRead}>
                Clear read
              </Button>
            )}
          </Box>
          <Divider />

          {/* Notifications List — grouped by time (Phase 14) */}
          {loading ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <CircularProgress />
            </Box>
          ) : notifications.length === 0 ? (
            <Box sx={{ p: 4, textAlign: 'center' }}>
              <Typography variant="body2" color="text.secondary">
                No notifications yet
              </Typography>
            </Box>
          ) : (
            <Box sx={{ maxHeight: 400, overflow: 'auto' }}>
              {(() => {
                const groups = groupNotifications(notifications);
                const sections = [
                  { label: 'Today', items: groups.today },
                  { label: 'This Week', items: groups.thisWeek },
                  { label: 'Older', items: groups.older }
                ];
                return sections.map(({ label, items }) => items.length === 0 ? null : (
                  <React.Fragment key={label}>
                    <Box sx={{ px: 2, py: 0.75, bgcolor: 'action.hover' }}>
                      <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                        {label}
                      </Typography>
                    </Box>
                    <List sx={{ p: 0 }}>
                      {items.map((notification) => (
                        <React.Fragment key={notification.id}>
                          <ListItem
                            sx={{
                              bgcolor: notification.isRead ? 'transparent' : 'action.hover',
                              '&:hover': { bgcolor: 'action.selected' },
                              cursor: notification.actionUrl ? 'pointer' : 'default'
                            }}
                            onClick={() => {
                              if (notification.actionUrl) window.location.href = notification.actionUrl;
                              if (!notification.isRead) handleMarkAsRead(notification.id);
                            }}
                          >
                            <ListItemAvatar>
                              <Avatar sx={{ bgcolor: notification.isRead ? 'grey.400' : 'primary.main' }}>
                                {getNotificationIcon(notification.type)}
                              </Avatar>
                            </ListItemAvatar>
                            <ListItemText
                              primary={
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                  <Typography variant="subtitle2">{notification.title}</Typography>
                                  {notification.priority && notification.priority !== 'normal' && (
                                    <Chip label={notification.priority} size="small" color={getPriorityColor(notification.priority)} />
                                  )}
                                </Box>
                              }
                              secondary={
                                <>
                                  <Typography variant="body2" component="span">
                                    {notification.body || notification.message}
                                  </Typography>
                                  <Typography variant="caption" display="block" color="text.secondary">
                                    {formatRelativeTime(notification.createdAt)}
                                  </Typography>
                                </>
                              }
                            />
                            <IconButton
                              edge="end"
                              size="small"
                              onClick={(e) => { e.stopPropagation(); handleDelete(notification.id); }}
                            >
                              <Delete fontSize="small" />
                            </IconButton>
                          </ListItem>
                          <Divider />
                        </React.Fragment>
                      ))}
                    </List>
                  </React.Fragment>
                ));
              })()}
            </Box>
          )}
        </Box>
      </Popover>

      {/* Preferences Dialog — uses correct backend field names (Phase 14) */}
      <Dialog open={prefsOpen} onClose={() => setPrefsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Notification Preferences</DialogTitle>
        <DialogContent>
          {preferences && (
            <Box sx={{ pt: 1 }}>
              <Typography variant="subtitle2" gutterBottom>
                Notification Channels
              </Typography>
              <FormGroup>
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!preferences.enablePushNotifications}
                      onChange={(e) => setPreferences({ ...preferences, enablePushNotifications: e.target.checked })}
                    />
                  }
                  label="Push Notifications"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={!!preferences.enableEmailDigest}
                      onChange={(e) => setPreferences({ ...preferences, enableEmailDigest: e.target.checked })}
                    />
                  }
                  label="Email Digest"
                />
                {preferences.enableEmailDigest && (
                  <FormControl size="small" sx={{ ml: 4, mt: 1, mb: 1, minWidth: 160 }}>
                    <Select
                      value={preferences.digestFrequency || 'daily'}
                      onChange={(e) => setPreferences({ ...preferences, digestFrequency: e.target.value })}
                    >
                      <MenuItem value="daily">Daily</MenuItem>
                      <MenuItem value="weekly">Weekly</MenuItem>
                      <MenuItem value="never">Never</MenuItem>
                    </Select>
                  </FormControl>
                )}
              </FormGroup>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Notification Types
              </Typography>
              <FormGroup>
                {[
                  { field: 'enableMessages', label: 'Messages' },
                  { field: 'enableMentions', label: 'Mentions' },
                  { field: 'enableReplies', label: 'Replies' },
                  { field: 'enableReactions', label: 'Reactions' },
                  { field: 'enableCalls', label: 'Calls' },
                  { field: 'enableFriendRequests', label: 'Friend Requests' },
                  { field: 'enableServerInvites', label: 'Server Invites' },
                  { field: 'enableRoleUpdates', label: 'Role Updates' },
                  { field: 'enableSystem', label: 'System' },
                  { field: 'enableAnnouncements', label: 'Announcements' }
                ].map(({ field, label }) => (
                  <FormControlLabel
                    key={field}
                    control={
                      <Switch
                        checked={preferences[field] !== false}
                        onChange={(e) => setPreferences({ ...preferences, [field]: e.target.checked })}
                      />
                    }
                    label={label}
                  />
                ))}
              </FormGroup>

              <Divider sx={{ my: 2 }} />

              <Typography variant="subtitle2" gutterBottom>
                Quiet Hours
              </Typography>
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField
                  label="Start Time"
                  type="time"
                  value={preferences.quietHoursStart || '22:00'}
                  onChange={(e) => setPreferences({ ...preferences, quietHoursStart: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                  helperText="Leave blank to disable"
                />
                <TextField
                  label="End Time"
                  type="time"
                  value={preferences.quietHoursEnd || '08:00'}
                  onChange={(e) => setPreferences({ ...preferences, quietHoursEnd: e.target.value })}
                  InputLabelProps={{ shrink: true }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrefsOpen(false)}>Cancel</Button>
          <Button onClick={handleSavePreferences} variant="contained">
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default NotificationCenter;

