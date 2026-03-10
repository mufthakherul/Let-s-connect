import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Box, Typography, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Divider, Collapse, Drawer
} from '@mui/material';
import {
  Home as HomeIcon, VideoLibrary, ShoppingCart, Description,
  Chat as ChatIcon, Person, ExitToApp, Login as LoginIcon,
  PersonAdd, Feed as FeedIcon, Group as GroupIcon, Bookmark,
  ShoppingCartOutlined, Article, Pages as PagesIcon,
  Search as SearchIcon, Event as EventIcon,
  Settings as SettingsIcon, Apps as AppsIcon, PeopleAlt as PeopleIcon,
  AccessibilityNew, ExpandLess, ExpandMore, Radio as RadioIcon,
  Tv as TvIcon, Security, VerifiedUser, Palette as PaletteIcon,
} from '@mui/icons-material';
import { useAuthStore } from '../store/authStore';
import { useThemeStore } from '../store/themeStore';
import { designTokens } from '../theme/designSystem';

/**
 * NavigationDrawer component - Extracted from App.js
 * Phase 1 - Workstream B1: App shell modularization
 */
export default function NavigationDrawer({ open, onClose, isMobile, isTablet, user, setUser }) {
  const { mode } = useThemeStore();
  const { logout } = useAuthStore();
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);

  // Brand gradient for the logo
  const brandGradient = `linear-gradient(135deg, ${designTokens.colors[mode].primary} 0%, ${designTokens.colors[mode].secondary} 100%)`;

  const handleLogout = () => {
    logout();
    setUser(null);
  };

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon />, public: true },
    { label: 'Search', path: '/search', icon: <SearchIcon />, public: true },
    { label: 'Community Hubs', path: '/hubs', icon: <AppsIcon />, public: true },
    { label: 'Videos', path: '/videos', icon: <VideoLibrary />, public: true },
    { label: 'Shop', path: '/shop', icon: <ShoppingCart />, public: true },
    { label: 'Blog', path: '/blog', icon: <Article />, public: true },
    { label: 'Docs', path: '/docs', icon: <Description />, public: true },
    { label: 'Privacy', path: '/privacy', icon: <Security />, public: true },
    { label: 'Terms', path: '/terms', icon: <Article />, public: true },
    { label: 'Cookies', path: '/cookies', icon: <VerifiedUser sx={{ fontSize: 20 }} />, public: true },
    { label: 'Meetings', path: '/meetings', icon: <EventIcon />, public: true },
    { label: 'Feed', path: '/feed', icon: <FeedIcon />, public: false },
    { label: 'Friends', path: '/friends', icon: <PeopleIcon />, public: false },
    { label: 'Groups', path: '/groups', icon: <GroupIcon />, public: false },
    { label: 'Pages', path: '/pages', icon: <PagesIcon />, public: false },
    { label: 'Radio', path: '/radio', icon: <RadioIcon />, public: false },
    { label: 'TV', path: '/tv', icon: <TvIcon />, public: false },
    { label: 'Cart', path: '/cart', icon: <ShoppingCartOutlined />, public: false },
    { label: 'Bookmarks', path: '/bookmarks', icon: <Bookmark />, public: false },
    { label: 'Chat', path: '/chat', icon: <ChatIcon />, public: false },
    { label: 'Profile', path: '/profile', icon: <Person />, public: false },
    { label: 'Email Settings', path: '/notifications/email', icon: <Article />, public: false },
    {
      label: 'Settings',
      icon: <SettingsIcon />,
      public: true,
      submenu: [
        { label: 'Theme', path: '/settings/theme', icon: <SettingsIcon />, public: true },
        { label: 'Accessibility', path: '/settings/accessibility', icon: <AccessibilityNew /> },
        { label: 'Appearance', path: '/settings/appearance', icon: <PaletteIcon />, public: false },
      ]
    },
  ];

  const drawerContent = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography
          variant="h6"
          sx={{
            background: brandGradient,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            fontWeight: 800
          }}
        >
          Milonexa
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => {
          if (!item.public && !user) return null;
          if (item.adminOnly && (!user || (user.role !== 'admin' && user.role !== 'moderator'))) return null;

          if (item.submenu) {
            return (
              <React.Fragment key={item.label}>
                <ListItem disablePadding>
                  <ListItemButton
                    onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                    sx={{
                      '&:hover': { backgroundColor: 'action.hover' },
                      backgroundColor: settingsMenuOpen ? 'action.selected' : 'transparent'
                    }}
                  >
                    <ListItemIcon>{item.icon}</ListItemIcon>
                    <ListItemText primary={item.label} />
                    {settingsMenuOpen ? <ExpandLess /> : <ExpandMore />}
                  </ListItemButton>
                </ListItem>
                <Collapse in={settingsMenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu
                      .filter(subItem => subItem.public || user)
                      .map((subItem) => (
                        <ListItem disablePadding key={subItem.path} sx={{ pl: 4 }}>
                          <ListItemButton
                            component={Link}
                            to={subItem.path}
                            onClick={onClose}
                          >
                            <ListItemIcon sx={{ minWidth: 40 }}>
                              {subItem.icon}
                            </ListItemIcon>
                            <ListItemText primary={subItem.label} />
                          </ListItemButton>
                        </ListItem>
                      ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem disablePadding key={item.path}>
              <ListItemButton component={Link} to={item.path} onClick={onClose}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        {user ? (
          <ListItem disablePadding>
            <ListItemButton onClick={() => { handleLogout(); onClose(); }}>
              <ListItemIcon><ExitToApp /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/login" onClick={onClose}>
                <ListItemIcon><LoginIcon /></ListItemIcon>
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/register" onClick={onClose}>
                <ListItemIcon><PersonAdd /></ListItemIcon>
                <ListItemText primary="Register" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <Drawer
      anchor="left"
      open={open}
      onClose={onClose}
      keepMounted
      PaperProps={{ sx: { width: isMobile ? '85vw' : isTablet ? 320 : 280, maxWidth: 360 } }}
    >
      {drawerContent}
    </Drawer>
  );
}
