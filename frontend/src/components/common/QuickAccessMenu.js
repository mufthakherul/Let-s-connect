import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Dialog,
  DialogContent,
  TextField,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Box,
  Typography,
  Chip,
  InputAdornment,
} from '@mui/material';
import {
  Search as SearchIcon,
  Home as HomeIcon,
  VideoLibrary,
  ShoppingCart,
  Description,
  Chat as ChatIcon,
  Person,
  Feed as FeedIcon,
  Group as GroupIcon,
  Bookmark,
  Article,
  Pages as PagesIcon,
  Work as WorkIcon,
  Dashboard as DashboardIcon,
  Folder as FolderIcon,
  Phone as PhoneIcon,
  Storage as DatabaseIcon,
  Settings as SettingsIcon,
  ShoppingCartOutlined,
  Brightness4,
  Brightness7,
} from '@mui/icons-material';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

// All available commands
const getCommands = (user, toggleTheme, mode) => {
  const commands = [
    // Navigation commands
    { id: 'nav-home', label: 'Go to Home', icon: <HomeIcon />, action: '/', type: 'navigation', keywords: ['home', 'main', 'start'] },
    { id: 'nav-search', label: 'Search', icon: <SearchIcon />, action: '/search', type: 'navigation', keywords: ['search', 'find', 'look'] },
    { id: 'nav-videos', label: 'Go to Videos', icon: <VideoLibrary />, action: '/videos', type: 'navigation', keywords: ['videos', 'watch', 'media'] },
    { id: 'nav-shop', label: 'Go to Shop', icon: <ShoppingCart />, action: '/shop', type: 'navigation', keywords: ['shop', 'store', 'buy', 'purchase'] },
    { id: 'nav-blog', label: 'Go to Blog', icon: <Article />, action: '/blog', type: 'navigation', keywords: ['blog', 'articles', 'posts'] },
    { id: 'nav-docs', label: 'Go to Documentation', icon: <Description />, action: '/docs', type: 'navigation', keywords: ['docs', 'documentation', 'help', 'guide'] },

    // Theme command
    {
      id: 'toggle-theme',
      label: `Switch to ${mode === 'dark' ? 'Light' : 'Dark'} Mode`,
      icon: mode === 'dark' ? <Brightness7 /> : <Brightness4 />,
      action: toggleTheme,
      type: 'action',
      keywords: ['theme', 'dark', 'light', 'mode', 'appearance']
    },
    { id: 'nav-theme-settings', label: 'Theme Settings', icon: <SettingsIcon />, action: '/settings/theme', type: 'navigation', keywords: ['theme', 'settings', 'colors', 'appearance', 'customize'] },
  ];

  // Add authenticated user commands
  if (user) {
    commands.push(
      { id: 'nav-feed', label: 'Go to Feed', icon: <FeedIcon />, action: '/feed', type: 'navigation', keywords: ['feed', 'timeline', 'updates'] },
      { id: 'nav-groups', label: 'Go to Groups', icon: <GroupIcon />, action: '/groups', type: 'navigation', keywords: ['groups', 'communities', 'teams'] },
      { id: 'nav-pages', label: 'Go to Pages', icon: <PagesIcon />, action: '/pages', type: 'navigation', keywords: ['pages', 'content'] },
      { id: 'nav-projects', label: 'Go to Projects', icon: <WorkIcon />, action: '/projects', type: 'navigation', keywords: ['projects', 'work', 'tasks'] },
      { id: 'nav-chat', label: 'Go to Chat', icon: <ChatIcon />, action: '/chat', type: 'navigation', keywords: ['chat', 'messages', 'dm', 'conversation'] },
      { id: 'nav-calls', label: 'Go to Calls', icon: <PhoneIcon />, action: '/calls', type: 'navigation', keywords: ['calls', 'video', 'voice', 'webrtc'] },
      { id: 'nav-bookmarks', label: 'Go to Bookmarks', icon: <Bookmark />, action: '/bookmarks', type: 'navigation', keywords: ['bookmarks', 'saved', 'favorites'] },
      { id: 'nav-cart', label: 'Go to Cart', icon: <ShoppingCartOutlined />, action: '/cart', type: 'navigation', keywords: ['cart', 'shopping', 'checkout'] },
      { id: 'nav-profile', label: 'Go to Profile', icon: <Person />, action: '/profile', type: 'navigation', keywords: ['profile', 'account', 'user'] },
      { id: 'nav-folders', label: 'Go to Folders', icon: <FolderIcon />, action: '/folders', type: 'navigation', keywords: ['folders', 'files', 'browser'] },
      { id: 'nav-databases', label: 'Go to Databases', icon: <DatabaseIcon />, action: '/databases/views', type: 'navigation', keywords: ['databases', 'data', 'sql'] },
      { id: 'nav-email-prefs', label: 'Email Preferences', icon: <SettingsIcon />, action: '/notifications/email', type: 'navigation', keywords: ['email', 'notifications', 'preferences'] },
    );

    // Admin commands
    if (user.role === 'admin' || user.role === 'moderator') {
      commands.push(
        { id: 'nav-admin', label: 'Go to Admin Dashboard', icon: <DashboardIcon />, action: '/admin', type: 'navigation', keywords: ['admin', 'dashboard', 'manage', 'control'] },
        { id: 'nav-discord-admin', label: 'Discord Admin', icon: <SettingsIcon />, action: '/discord/admin', type: 'navigation', keywords: ['discord', 'admin', 'bot', 'manage'] },
        { id: 'nav-analytics', label: 'Analytics', icon: <DashboardIcon />, action: '/analytics', type: 'navigation', keywords: ['analytics', 'stats', 'metrics', 'insights'] },
      );
    }
  }

  return commands;
};

const QuickAccessMenu = () => {
  const [open, setOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { toggleTheme, mode } = useThemeStore();

  const commands = useMemo(() => getCommands(user, toggleTheme, mode), [user, toggleTheme, mode]);

  // Filter commands based on search query
  const filteredCommands = useMemo(() => {
    if (!searchQuery.trim()) {
      return commands;
    }

    const query = searchQuery.toLowerCase();
    return commands.filter(cmd => {
      const labelMatch = cmd.label.toLowerCase().includes(query);
      const keywordsMatch = cmd.keywords.some(kw => kw.includes(query));
      return labelMatch || keywordsMatch;
    });
  }, [searchQuery, commands]);

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback((event) => {
    // Cmd+K (Mac) or Ctrl+K (Windows/Linux)
    if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
      event.preventDefault();
      setOpen(prev => !prev);
      setSearchQuery('');
      setSelectedIndex(0);
    }
  }, []);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  // Handle dialog keyboard navigation
  const handleDialogKeyDown = (event) => {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setSelectedIndex(prev => Math.min(prev + 1, filteredCommands.length - 1));
    } else if (event.key === 'ArrowUp') {
      event.preventDefault();
      setSelectedIndex(prev => Math.max(prev - 1, 0));
    } else if (event.key === 'Enter' && filteredCommands[selectedIndex]) {
      event.preventDefault();
      executeCommand(filteredCommands[selectedIndex]);
    } else if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const executeCommand = (command) => {
    if (command.type === 'navigation') {
      navigate(command.action);
    } else if (command.type === 'action' && typeof command.action === 'function') {
      command.action();
    }
    setOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
  };

  const handleClose = () => {
    setOpen(false);
    setSearchQuery('');
    setSelectedIndex(0);
  };

  // Reset selected index when search changes
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          position: 'fixed',
          top: 100,
          m: 0,
          borderRadius: 2,
          maxHeight: '70vh',
        },
      }}
    >
      <DialogContent sx={{ p: 0 }}>
        <Box sx={{ p: 2, borderBottom: 1, borderColor: 'divider' }}>
          <TextField
            fullWidth
            autoFocus
            placeholder="Type a command or search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={handleDialogKeyDown}
            variant="outlined"
            size="small"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
              endAdornment: (
                <InputAdornment position="end">
                  <Chip
                    label={navigator.platform.includes('Mac') ? '⌘K' : 'Ctrl+K'}
                    size="small"
                    sx={{ height: 20 }}
                  />
                </InputAdornment>
              ),
            }}
          />
        </Box>

        <List sx={{ maxHeight: 'calc(70vh - 80px)', overflow: 'auto', py: 1 }}>
          {filteredCommands.length === 0 ? (
            <Box sx={{ p: 3, textAlign: 'center' }}>
              <Typography color="text.secondary">
                No commands found
              </Typography>
            </Box>
          ) : (
            filteredCommands.map((command, index) => (
              <ListItem
                key={command.id}
                button
                selected={index === selectedIndex}
                onClick={() => executeCommand(command)}
                onMouseEnter={() => setSelectedIndex(index)}
                sx={{
                  px: 2,
                  py: 1.5,
                  borderRadius: 1,
                  mx: 1,
                  '&.Mui-selected': {
                    backgroundColor: 'action.selected',
                  },
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <ListItemIcon sx={{ minWidth: 40 }}>
                  {command.icon}
                </ListItemIcon>
                <ListItemText
                  primary={command.label}
                  secondary={command.type === 'navigation' ? command.action : 'Action'}
                  secondaryTypographyProps={{
                    variant: 'caption',
                    color: 'text.secondary',
                  }}
                />
                {index === selectedIndex && (
                  <Chip
                    label="↵"
                    size="small"
                    sx={{ height: 20, minWidth: 20 }}
                  />
                )}
              </ListItem>
            ))
          )}
        </List>

        <Box
          sx={{
            p: 1.5,
            borderTop: 1,
            borderColor: 'divider',
            display: 'flex',
            gap: 2,
            justifyContent: 'center',
          }}
        >
          <Typography variant="caption" color="text.secondary">
            <Chip label="↑↓" size="small" sx={{ height: 18, fontSize: '0.7rem' }} /> Navigate
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Chip label="↵" size="small" sx={{ height: 18, fontSize: '0.7rem' }} /> Select
          </Typography>
          <Typography variant="caption" color="text.secondary">
            <Chip label="ESC" size="small" sx={{ height: 18, fontSize: '0.7rem' }} /> Close
          </Typography>
        </Box>
      </DialogContent>
    </Dialog>
  );
};

export default QuickAccessMenu;
