import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Container, Box, IconButton,
  CssBaseline, ThemeProvider, createTheme, Drawer, List,
  ListItem, ListItemIcon, ListItemText, useMediaQuery, Divider, Avatar,
  CircularProgress, Collapse, Menu, MenuItem, Tooltip, ListItemAvatar, Badge
} from '@mui/material';
import {
  Brightness4, Brightness7, Menu as MenuIcon, Home as HomeIcon,
  VideoLibrary, ShoppingCart, Description, Chat as ChatIcon,
  Person, ExitToApp, Login as LoginIcon,
  PersonAdd, Feed as FeedIcon, Group as GroupIcon, Bookmark,
  ShoppingCartOutlined, Article, Pages as PagesIcon, Work as WorkIcon,
  Dashboard as DashboardIcon, Search as SearchIcon, Folder as FolderIcon,
  Phone as PhoneIcon, Storage as DatabaseIcon, CompareArrows as DiffIcon,
  Event as EventIcon,
  Settings as SettingsIcon, MoreHoriz as MoreHorizIcon, Apps as AppsIcon, PeopleAlt as PeopleIcon, SwapHoriz as SwapHorizIcon, Close as CloseIcon,
  AccessibilityNew, ExpandLess, ExpandMore, Radio as RadioIcon, Tv as TvIcon,
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import NotificationCenter from './components/common/NotificationCenter';
import ErrorBoundary from './components/common/ErrorBoundary';
import Breadcrumbs from './components/common/Breadcrumbs';
import QuickAccessMenu from './components/common/QuickAccessMenu';
import Onboarding from './components/common/Onboarding';
import BackgroundAnimation from './components/common/BackgroundAnimation';

// Eager load critical components (needed for initial render)
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';

// Lazy load non-critical components (Phase 4: Performance Optimization)
const Homepage = lazy(() => import('./components/Homepage'));
const Feed = lazy(() => import('./components/Feed'));
const Projects = lazy(() => import('./components/Projects'));
const Videos = lazy(() => import('./components/Videos'));
const Shop = lazy(() => import('./components/Shop'));
const Docs = lazy(() => import('./components/Docs'));
const Chat = lazy(() => import('./components/Chat'));
const Profile = lazy(() => import('./components/Profile'));
const Groups = lazy(() => import('./components/Groups'));
const Bookmarks = lazy(() => import('./components/Bookmarks'));
const Cart = lazy(() => import('./components/Cart'));
const Blog = lazy(() => import('./components/Blog'));
const Pages = lazy(() => import('./components/Pages'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
const ThemeSettings = lazy(() => import('./components/ThemeSettings'));
const AccessibilitySettings = lazy(() => import('./components/AccessibilitySettings'));
const SecuritySettings = lazy(() => import('./components/SecuritySettings'));
const MediaGallery = lazy(() => import('./components/MediaGallery'));
const Analytics = lazy(() => import('./components/Analytics'));
const Search = lazy(() => import('./components/Search'));
const EmailPreferences = lazy(() => import('./components/EmailPreferences'));
const OAuthLogin = lazy(() => import('./components/OAuthLogin'));
const ElasticsearchSearch = lazy(() => import('./components/ElasticsearchSearch'));
const FolderBrowser = lazy(() => import('./components/FolderBrowser'));
const WikiDiffViewer = lazy(() => import('./components/WikiDiffViewer'));
const WebRTCCallWidget = lazy(() => import('./components/WebRTCCallWidget'));
const DatabaseViews = lazy(() => import('./components/DatabaseViews'));
const DiscordAdmin = lazy(() => import('./components/DiscordAdmin'));
const Meetings = lazy(() => import('./components/Meetings'));
const MeetingRoom = lazy(() => import('./components/MeetingRoom'));
const MeetingLobby = lazy(() => import('./components/MeetingLobby'));
const Radio = lazy(() => import('./components/Radio'));
const TV = lazy(() => import('./components/TV'));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

// Loading fallback component for lazy-loaded routes
const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      minHeight: '400px',
      flexDirection: 'column',
      gap: 2
    }}
  >
    <motion.div
      animate={{ rotate: 360 }}
      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
    >
      <CircularProgress size={40} />
    </motion.div>
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.2 }}
    >
      <Typography variant="body2" color="text.secondary">
        Loading...
      </Typography>
    </motion.div>
  </Box>
);

function AppContent() {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [settingsMenuOpen, setSettingsMenuOpen] = useState(false);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  // Registered navbar specific state
  const [showRegisteredSearch, setShowRegisteredSearch] = useState(false);
  const [registeredAppsAnchor, setRegisteredAppsAnchor] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const { mode, toggleTheme, getAccentColor, initSystemThemeListener, accessibility } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [internalUser, setInternalUser] = useState(user);

  useEffect(() => {
    setInternalUser(user);
  }, [user]);

  // Initialize system theme listener
  useEffect(() => {
    const cleanup = initSystemThemeListener();
    return cleanup;
  }, [initSystemThemeListener]);

  const theme = useMemo(
    () => {
      const accentColor = getAccentColor() || {
        primary: '#1976d2',
        secondary: '#dc004e',
      };
      const { highContrast, largeText, textScale, colorBlindSupport, magnification, reducedMotion, fontFamily } = accessibility;

      const normalizeColor = (value, fallback) => {
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
        if (value && typeof value === 'object' && typeof value.main === 'string' && value.main.trim()) {
          return value.main.trim();
        }
        return fallback;
      };

      // Ensure accent colors are valid strings
      const primaryColor = normalizeColor(
        highContrast ? (mode === 'dark' ? '#ffffff' : '#000000') : accentColor.primary,
        '#1976d2'
      );
      const secondaryColor = normalizeColor(
        highContrast ? (mode === 'dark' ? '#ffff00' : '#ff0000') : accentColor.secondary,
        '#dc004e'
      );

      // Font family mapping
      const fontFamilyMap = {
        default: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        dyslexic: '"OpenDyslexic", "Inter", "Roboto", sans-serif',
        'high-legibility': '"Atkinson Hyperlegible", "Inter", "Roboto", sans-serif',
      };

      // Color blind support filters
      const getColorBlindFilters = (type) => {
        switch (type) {
          case 'deuteranopia':
            return 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'deuteranopia\'%3E%3CfeColorMatrix type=\'matrix\' values=\'0.625 0.375 0 0 0 0.7 0.3 0 0 0 0 0.3 0.7 0 0 0 0 0 1 0\'/%3E%3C/filter%3E%3C/svg%3E#deuteranopia")';
          case 'protanopia':
            return 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'protanopia\'%3E%3CfeColorMatrix type=\'matrix\' values=\'0.567 0.433 0 0 0 0.558 0.442 0 0 0 0 0.242 0.758 0 0 0 0 0 1 0\'/%3E%3C/filter%3E%3C/svg%3E#protanopia")';
          case 'tritanopia':
            return 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'tritanopia\'%3E%3CfeColorMatrix type=\'matrix\' values=\'0.95 0.05 0 0 0 0 0.433 0.567 0 0 0 0.475 0.525 0 0 0 0 0 1 0\'/%3E%3C/filter%3E%3C/svg%3E#tritanopia")';
          default:
            return 'none';
        }
      };

      return createTheme({
        palette: {
          mode,
          primary: {
            main: primaryColor,
            light: mode === 'dark' ? '#ffffff' : '#42a5f5',
            dark: mode === 'dark' ? '#cccccc' : '#1565c0',
            contrastText: highContrast ? (mode === 'dark' ? '#000000' : '#ffffff') : undefined,
          },
          secondary: {
            main: secondaryColor,
            contrastText: highContrast ? '#000000' : undefined,
          },
          success: {
            main: '#2e7d32',
          },
          info: {
            main: '#0288d1',
          },
          warning: {
            main: '#ed6c02',
          },
          error: {
            main: '#d32f2f',
          },
          background: {
            default: highContrast
              ? (mode === 'dark' ? '#000000' : '#ffffff')
              : (mode === 'dark' ? '#121212' : '#fafafa'),
            paper: highContrast
              ? (mode === 'dark' ? '#000000' : '#ffffff')
              : (mode === 'dark' ? '#1e1e1e' : '#ffffff'),
          },
          text: {
            primary: highContrast
              ? (mode === 'dark' ? '#ffffff' : '#000000')
              : undefined,
            secondary: highContrast
              ? (mode === 'dark' ? '#cccccc' : '#333333')
              : undefined,
          },
        },
        typography: {
          fontFamily: fontFamilyMap[fontFamily] || fontFamilyMap.default,
          fontSize: largeText ? 16 * textScale : 14 * textScale,
          h1: { fontSize: largeText ? `${2.5 * textScale}rem` : `${2 * textScale}rem` },
          h2: { fontSize: largeText ? `${2 * textScale}rem` : `${1.75 * textScale}rem` },
          h3: { fontSize: largeText ? `${1.75 * textScale}rem` : `${1.5 * textScale}rem` },
          h4: { fontSize: largeText ? `${1.5 * textScale}rem` : `${1.25 * textScale}rem` },
          h5: { fontSize: largeText ? `${1.25 * textScale}rem` : `${1.125 * textScale}rem` },
          h6: { fontSize: largeText ? `${1.125 * textScale}rem` : `${1 * textScale}rem` },
          body1: { fontSize: largeText ? `${1.125 * textScale}rem` : `${1 * textScale}rem` },
          body2: { fontSize: largeText ? `${1 * textScale}rem` : `${0.875 * textScale}rem` },
          button: { fontSize: largeText ? `${1 * textScale}rem` : `${0.875 * textScale}rem` },
          caption: { fontSize: largeText ? `${0.875 * textScale}rem` : `${0.75 * textScale}rem` },
        },
        shape: {
          borderRadius: 12,
        },
        transitions: {
          duration: reducedMotion ? {
            shortest: 0,
            shorter: 0,
            short: 0,
            standard: 0,
            complex: 0,
            enteringScreen: 0,
            leavingScreen: 0,
          } : {
            shortest: 150,
            shorter: 200,
            short: 250,
            standard: 300,
            complex: 375,
            enteringScreen: 225,
            leavingScreen: 195,
          },
        },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                filter: colorBlindSupport ? getColorBlindFilters(colorBlindSupport) : 'none',
                zoom: magnification !== 1.0 ? magnification : undefined,
                transform: magnification !== 1.0 ? `scale(${magnification})` : undefined,
                transformOrigin: magnification !== 1.0 ? 'top left' : undefined,
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
                minHeight: largeText ? 48 : 36,
                padding: largeText ? '12px 24px' : '6px 16px',
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: highContrast
                  ? '0 0 0 2px ' + (mode === 'dark' ? '#ffffff' : '#000000')
                  : (mode === 'dark'
                    ? '0 2px 8px rgba(0,0,0,0.4)'
                    : '0 2px 8px rgba(0,0,0,0.1)'),
                transition: reducedMotion ? 'none' : 'box-shadow 0.3s ease-in-out, background-color 0.3s ease-in-out',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: reducedMotion ? 'none' : 'background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                transition: reducedMotion ? 'none' : 'background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
              },
            },
          },
          MuiTextField: {
            styleOverrides: {
              root: {
                '& .MuiInputBase-input': {
                  fontSize: largeText ? `${1.125 * textScale}rem` : `${1 * textScale}rem`,
                },
              },
            },
          },
          MuiTypography: {
            styleOverrides: {
              root: {
                lineHeight: largeText ? 1.6 : 1.4,
              },
            },
          },
        },
      });
    },
    [mode, getAccentColor, accessibility]
  );

  const handleLogout = () => {
    logout();
    setInternalUser(null);
  };

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon />, public: true },
    { label: 'Search', path: '/search', icon: <SearchIcon />, public: true },
    { label: 'Advanced Search', path: '/search/advanced', icon: <SearchIcon />, public: false },
    { label: 'Videos', path: '/videos', icon: <VideoLibrary />, public: true },
    { label: 'Shop', path: '/shop', icon: <ShoppingCart />, public: true },
    { label: 'Blog', path: '/blog', icon: <Article />, public: true },
    { label: 'Docs', path: '/docs', icon: <Description />, public: true },
    { label: 'Meetings', path: '/meetings', icon: <EventIcon />, public: true },
    { label: 'Feed', path: '/feed', icon: <FeedIcon />, public: false },
    { label: 'Groups', path: '/groups', icon: <GroupIcon />, public: false },
    { label: 'Pages', path: '/pages', icon: <PagesIcon />, public: false },
    { label: 'Projects', path: '/projects', icon: <WorkIcon />, public: false },
    { label: 'Cart', path: '/cart', icon: <ShoppingCartOutlined />, public: false },
    { label: 'Bookmarks', path: '/bookmarks', icon: <Bookmark />, public: false },
    { label: 'Chat', path: '/chat', icon: <ChatIcon />, public: false },
    { label: 'Discord Admin', path: '/discord/admin', icon: <SettingsIcon />, public: false },
    { label: 'Calls', path: '/calls', icon: <PhoneIcon />, public: false },
    { label: 'Folders', path: '/folders', icon: <FolderIcon />, public: false },
    { label: 'Wiki Diff', path: '/wikis/diff', icon: <DiffIcon />, public: false },
    { label: 'Databases', path: '/databases/views', icon: <DatabaseIcon />, public: false },
    { label: 'Profile', path: '/profile', icon: <Person />, public: false },
    { label: 'Email Settings', path: '/notifications/email', icon: <Article />, public: false },
    {
      label: 'Settings',
      icon: <SettingsIcon />,
      public: true,
      submenu: [
        { label: 'Theme Settings', path: '/settings/theme', icon: <SettingsIcon /> },
        { label: 'Accessibility', path: '/settings/accessibility', icon: <AccessibilityNew /> },
      ]
    },
    { label: 'Admin', path: '/admin', icon: <DashboardIcon />, public: false, adminOnly: true },
  ];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation">
      <Box sx={{ p: 2, textAlign: 'center' }}>
        <Typography variant="h6" color="primary">
          Let's Connect
        </Typography>
      </Box>
      <Divider />
      <List>
        {navigationItems.map((item) => {
          if (!item.public && !internalUser) return null;
          if (item.adminOnly && (!internalUser || (internalUser.role !== 'admin' && internalUser.role !== 'moderator'))) return null;

          if (item.submenu) {
            return (
              <React.Fragment key={item.label}>
                <ListItem
                  button
                  onClick={() => setSettingsMenuOpen(!settingsMenuOpen)}
                  sx={{
                    '&:hover': { backgroundColor: 'action.hover' },
                    backgroundColor: settingsMenuOpen ? 'action.selected' : 'transparent'
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.label} />
                  {settingsMenuOpen ? <ExpandLess /> : <ExpandMore />}
                </ListItem>
                <Collapse in={settingsMenuOpen} timeout="auto" unmountOnExit>
                  <List component="div" disablePadding>
                    {item.submenu.map((subItem) => (
                      <ListItem
                        button
                        component={Link}
                        to={subItem.path}
                        key={subItem.path}
                        sx={{ pl: 4 }}
                        onClick={() => setDrawerOpen(false)}
                      >
                        <ListItemIcon sx={{ minWidth: 40 }}>
                          {subItem.icon}
                        </ListItemIcon>
                        <ListItemText primary={subItem.label} />
                      </ListItem>
                    ))}
                  </List>
                </Collapse>
              </React.Fragment>
            );
          }

          return (
            <ListItem button component={Link} to={item.path} key={item.path} onClick={() => setDrawerOpen(false)}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        {internalUser ? (
          <ListItem button onClick={() => { handleLogout(); setDrawerOpen(false); }}>
            <ListItemIcon><ExitToApp /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        ) : (
          <>
            <ListItem button component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon><LoginIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
            <ListItem button component={Link} to="/register" onClick={() => setDrawerOpen(false)}>
              <ListItemIcon><PersonAdd /></ListItemIcon>
              <ListItemText primary="Register" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BackgroundAnimation isLoggedIn={!!internalUser} />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: theme.palette.background.paper,
            color: theme.palette.text.primary,
          },
        }}
      />
      <ErrorBoundary level="page">
        {/* Conditional Navbar: Different for registered vs unregistered users */}
        {internalUser ? (
          /* Facebook-style Navbar for REGISTERED users */
          <AppBar position="sticky" elevation={1} sx={{ backgroundColor: mode === 'dark' ? '#18191a' : '#fff', borderBottom: `1px solid ${mode === 'dark' ? '#3a3b3c' : '#e5e5e5'}` }}>
            <Toolbar sx={{ py: 0.5, px: 2 }}>
              {/* Left Section: Name + Search Icon */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                {isMobile && (
                  <IconButton
                    edge="start"
                    color="inherit"
                    onClick={() => setDrawerOpen(true)}
                    sx={{ mr: 1 }}
                  >
                    <MenuIcon sx={{ color: mode === 'dark' ? '#e4e6eb' : '#000' }} />
                  </IconButton>
                )}

                {/* Name */}
                <Typography
                  variant="h6"
                  component={Link}
                  to="/"
                  sx={{
                    textDecoration: 'none',
                    color: mode === 'dark' ? '#e4e6eb' : '#000',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    minWidth: 'fit-content'
                  }}
                >
                  Let's Connect
                </Typography>

                {/* Search Icon - toggles inline search */}
                <Tooltip title="Search">
                  <IconButton
                    aria-label="Toggle search"
                    aria-expanded={showRegisteredSearch}
                    aria-controls={showRegisteredSearch ? 'registered-search' : undefined}
                    onClick={() => setShowRegisteredSearch((s) => !s)}
                    onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setShowRegisteredSearch((s) => !s); e.preventDefault(); } }}
                    sx={{ ml: 1, color: mode === 'dark' ? '#a8aaad' : '#65676b', '&:focus-visible': { outline: '2px solid rgba(10,102,194,0.25)', outlineOffset: '2px' } }}
                  >
                    <SearchIcon />
                  </IconButton>
                </Tooltip>

                {!isMobile && showRegisteredSearch && (
                  <Box id="registered-search" sx={{
                    display: 'flex',
                    alignItems: 'center',
                    backgroundColor: mode === 'dark' ? '#3a3b3c' : '#f0f2f5',
                    borderRadius: '20px',
                    px: 1.5,
                    py: 0.5,
                    minWidth: '260px',
                    ml: 1
                  }}>
                    <SearchIcon sx={{ color: mode === 'dark' ? '#a8aaad' : '#65676b', mr: 1, fontSize: '1.2rem' }} />
                    <input
                      type="text"
                      placeholder="Search people, posts, docs..."
                      aria-label="Search"
                      style={{
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: mode === 'dark' ? '#e4e6eb' : '#000',
                        fontSize: '0.95rem',
                        width: '100%',
                        fontFamily: '-apple-system, BlinkMacSystemFont, Segoe UI'
                      }}
                      autoFocus
                    />
                    <Tooltip title="Close search">
                      <IconButton onClick={() => setShowRegisteredSearch(false)} sx={{ ml: 1 }} aria-label="Close search">
                        <CloseIcon />
                      </IconButton>
                    </Tooltip>
                  </Box>
                )}
              </Box>

              {/* Center Navigation: four primary icons */}
              {!isMobile && (
                <Box sx={{ flexGrow: 1, display: 'flex', justifyContent: 'center', gap: 0 }}>
                  <IconButton
                    component={Link}
                    to="/"
                    sx={{
                      color: mode === 'dark' ? '#a8aaad' : '#65676b',
                      '&:hover': {
                        color: '#0a66c2',
                        transform: 'scale(1.1)'
                      },
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      position: 'relative',
                      transition: 'all 0.2s ease-in-out'
                    }}
                    title="Home"
                  >
                    <HomeIcon sx={{ fontSize: '1.5rem' }} />
                    <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: '3px', backgroundColor: '#0a66c2', borderRadius: '2px 2px 0 0', display: window.location.pathname === '/' ? 'block' : 'none' }} />
                  </IconButton>

                  <IconButton
                    component={Link}
                    to="/friends"
                    sx={{
                      color: mode === 'dark' ? '#a8aaad' : '#65676b',
                      '&:hover': {
                        color: '#0a66c2',
                        transform: 'scale(1.1)'
                      },
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      transition: 'all 0.2s ease-in-out'
                    }}
                    title="Friends"
                  >
                    <PeopleIcon sx={{ fontSize: '1.5rem' }} />
                  </IconButton>

                  <IconButton
                    component={Link}
                    to="/videos"
                    sx={{
                      color: mode === 'dark' ? '#a8aaad' : '#65676b',
                      '&:hover': {
                        color: '#0a66c2',
                        transform: 'scale(1.1)'
                      },
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      transition: 'all 0.2s ease-in-out'
                    }}
                    title="Videos"
                  >
                    <VideoLibrary sx={{ fontSize: '1.5rem' }} />
                  </IconButton>

                  <IconButton
                    component={Link}
                    to="/groups"
                    sx={{
                      color: mode === 'dark' ? '#a8aaad' : '#65676b',
                      '&:hover': {
                        color: '#0a66c2',
                        transform: 'scale(1.1)'
                      },
                      borderRadius: 1,
                      px: 2,
                      py: 1,
                      transition: 'all 0.2s ease-in-out'
                    }}
                    title="Groups"
                  >
                    <GroupIcon sx={{ fontSize: '1.5rem' }} />
                  </IconButton>

                  {/* Apps (9-dot) button */}
                  <Tooltip title="Apps">
                    <IconButton
                      aria-label="Open apps menu"
                      aria-controls={registeredAppsAnchor ? 'registered-apps-menu' : undefined}
                      aria-haspopup="true"
                      aria-expanded={Boolean(registeredAppsAnchor)}
                      onClick={(e) => setRegisteredAppsAnchor(e.currentTarget)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { setRegisteredAppsAnchor(e.currentTarget); e.preventDefault(); } }}
                      sx={{ color: mode === 'dark' ? '#a8aaad' : '#65676b', ml: 1, '&:focus-visible': { outline: '2px solid rgba(10,102,194,0.25)', outlineOffset: '2px' } }}
                    >
                      <AppsIcon sx={{ fontSize: '1.4rem' }} />
                    </IconButton>
                  </Tooltip>

                  <Menu id="registered-apps-menu" anchorEl={registeredAppsAnchor} open={Boolean(registeredAppsAnchor)} onClose={() => setRegisteredAppsAnchor(null)} anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }} transformOrigin={{ vertical: 'top', horizontal: 'center' }}>
                    <MenuItem component={Link} to="/docs" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <Description fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Docs</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/projects" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <WorkIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Projects</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/pages" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <PagesIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Pages</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/shop" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <ShoppingCart fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Shop</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/meetings" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <EventIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Meetings</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/blog" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <Article fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Blog</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/radio" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <RadioIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Live Radio</ListItemText>
                    </MenuItem>
                    <MenuItem component={Link} to="/tv" onClick={() => setRegisteredAppsAnchor(null)}>
                      <ListItemIcon>
                        <TvIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText>Live TV</ListItemText>
                    </MenuItem>
                  </Menu>
                </Box>
              )}

              {/* Right Section */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, ml: 'auto' }}>
                <IconButton
                  onClick={toggleTheme}
                  sx={{
                    color: mode === 'dark' ? '#a8aaad' : '#65676b',
                    '&:hover': {
                      backgroundColor: mode === 'dark' ? '#3a3b3c' : '#f0f2f5',
                      transform: 'scale(1.1)'
                    },
                    borderRadius: 1,
                    p: 1,
                    transition: 'all 0.2s ease-in-out'
                  }}
                >
                  {mode === 'dark' ? <Brightness7 sx={{ fontSize: '1.3rem' }} /> : <Brightness4 sx={{ fontSize: '1.3rem' }} />}
                </IconButton>
                <NotificationCenter />

                {!isMobile && (
                  <>
                    <IconButton
                      component={Link}
                      to="/chat"
                      sx={{
                        color: mode === 'dark' ? '#a8aaad' : '#65676b',
                        '&:hover': {
                          backgroundColor: mode === 'dark' ? '#3a3b3c' : '#f0f2f5',
                          transform: 'scale(1.1)'
                        },
                        borderRadius: 1,
                        p: 1,
                        transition: 'all 0.2s ease-in-out'
                      }}
                      title="Chat"
                    >
                      <ChatIcon sx={{ fontSize: '1.3rem' }} />
                    </IconButton>

                    <IconButton
                      onClick={(e) => setProfileMenuAnchor(e.currentTarget)}
                      sx={{
                        color: mode === 'dark' ? '#a8aaad' : '#65676b',
                        '&:hover': {
                          backgroundColor: mode === 'dark' ? '#3a3b3c' : '#f0f2f5',
                          transform: 'scale(1.1)'
                        },
                        borderRadius: 1,
                        p: 0.5,
                        ml: 1,
                        transition: 'all 0.2s ease-in-out'
                      }}
                      title="Profile"
                    >
                      <Avatar sx={{ width: 32, height: 32, backgroundColor: '#0a66c2', fontSize: '0.875rem', fontWeight: 600 }}>
                        {internalUser?.firstName?.[0]?.toUpperCase() || ''}
                      </Avatar>
                    </IconButton>

                    <Menu
                      anchorEl={profileMenuAnchor}
                      open={Boolean(profileMenuAnchor)}
                      onClose={() => setProfileMenuAnchor(null)}
                      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                      transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                    >
                      <MenuItem disabled>
                        <ListItemAvatar>
                          <Avatar sx={{ width: 44, height: 44, backgroundColor: '#0a66c2' }}>{internalUser?.firstName?.[0]?.toUpperCase() || ''}</Avatar>
                        </ListItemAvatar>
                        <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                          <Typography variant="subtitle1">{(internalUser?.firstName || '') + (internalUser?.lastName ? ` ${internalUser.lastName}` : '')}</Typography>
                          <Typography variant="caption" color="text.secondary">{internalUser?.email || ''}</Typography>
                        </Box>
                      </MenuItem>
                      <Divider />
                      <MenuItem component={Link} to="/profile" onClick={() => setProfileMenuAnchor(null)}>
                        <ListItemIcon>
                          <Person fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>View / Switch Profile</ListItemText>
                      </MenuItem>
                      <MenuItem component={Link} to="/settings/theme" onClick={() => setProfileMenuAnchor(null)}>
                        <ListItemIcon>
                          <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Settings</ListItemText>
                      </MenuItem>
                      <MenuItem onClick={() => { setProfileMenuAnchor(null); handleLogout(); }}>
                        <ListItemIcon>
                          <ExitToApp fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Logout</ListItemText>
                      </MenuItem>
                    </Menu>
                  </>
                )}
              </Box>
            </Toolbar>
          </AppBar>
        ) : (
          /* Classic Navbar for UNREGISTERED users */
          <AppBar position="sticky" elevation={1}>
            <Toolbar>
              {isMobile && (
                <IconButton edge="start" color="inherit" onClick={() => setDrawerOpen(true)} sx={{ mr: 2 }}>
                  <MenuIcon />
                </IconButton>
              )}
              {/* Left Section: Name + Docs + Videos */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography
                  variant="h6"
                  component={Link}
                  to="/"
                  sx={{
                    textDecoration: 'none',
                    color: 'inherit',
                    fontWeight: 700,
                    mr: 2
                  }}
                >
                  Let's Connect
                </Typography>

                {!isMobile && (
                  <>
                    <Button
                      color="inherit"
                      component={Link}
                      to="/docs"
                      startIcon={<Description />}
                      sx={{
                        minWidth: 'auto',
                        px: 2,
                        '&:hover': { transform: 'scale(1.05)' },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      Docs
                    </Button>
                    <Button
                      color="inherit"
                      component={Link}
                      to="/videos"
                      startIcon={<VideoLibrary />}
                      sx={{
                        minWidth: 'auto',
                        px: 2,
                        '&:hover': { transform: 'scale(1.05)' },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      Videos
                    </Button>
                  </>
                )}
              </Box>

              {/* Spacer */}
              <Box sx={{ flexGrow: 1 }} />

              {/* Right Section: Settings + Login + More Menu */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {!isMobile && (
                  <>
                    <Button
                      color="inherit"
                      component={Link}
                      to="/settings/theme"
                      startIcon={<SettingsIcon />}
                      sx={{
                        '&:hover': { transform: 'scale(1.05)' },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      Settings
                    </Button>

                    <Button
                      color="inherit"
                      component={Link}
                      to="/login"
                      sx={{
                        '&:hover': { transform: 'scale(1.05)' },
                        transition: 'all 0.2s ease-in-out'
                      }}
                    >
                      Login
                    </Button>

                    <IconButton
                      color="inherit"
                      onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                      sx={{ ml: 1 }}
                    >
                      <Box sx={{ position: 'relative', width: 24, height: 24 }}>
                        {/* 3 squares */}
                        <Box sx={{
                          position: 'absolute',
                          top: 2,
                          left: 2,
                          width: 6,
                          height: 6,
                          backgroundColor: 'currentColor',
                          borderRadius: 0.5
                        }} />
                        <Box sx={{
                          position: 'absolute',
                          top: 2,
                          right: 2,
                          width: 6,
                          height: 6,
                          backgroundColor: 'currentColor',
                          borderRadius: 0.5
                        }} />
                        <Box sx={{
                          position: 'absolute',
                          bottom: 2,
                          left: 2,
                          width: 6,
                          height: 6,
                          backgroundColor: 'currentColor',
                          borderRadius: 0.5
                        }} />
                        {/* 1 circle */}
                        <Box sx={{
                          position: 'absolute',
                          bottom: 2,
                          right: 2,
                          width: 6,
                          height: 6,
                          backgroundColor: 'currentColor',
                          borderRadius: '50%'
                        }} />
                      </Box>
                    </IconButton>

                    <Menu
                      anchorEl={moreMenuAnchor}
                      open={Boolean(moreMenuAnchor)}
                      onClose={() => setMoreMenuAnchor(null)}
                      anchorOrigin={{
                        vertical: 'bottom',
                        horizontal: 'right',
                      }}
                      transformOrigin={{
                        vertical: 'top',
                        horizontal: 'right',
                      }}
                    >
                      <MenuItem component={Link} to="/shop" onClick={() => setMoreMenuAnchor(null)}>
                        <ListItemIcon>
                          <ShoppingCart fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Shop</ListItemText>
                      </MenuItem>
                      <MenuItem component={Link} to="/meetings" onClick={() => setMoreMenuAnchor(null)}>
                        <ListItemIcon>
                          <EventIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Meetings</ListItemText>
                      </MenuItem>
                      <MenuItem component={Link} to="/blog" onClick={() => setMoreMenuAnchor(null)}>
                        <ListItemIcon>
                          <Article fontSize="small" />
                        </ListItemIcon>
                        <ListItemText>Blog</ListItemText>
                      </MenuItem>
                    </Menu>
                  </>
                )}

                <IconButton color="inherit" onClick={toggleTheme}>
                  {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                </IconButton>
              </Box>
            </Toolbar>
          </AppBar>
        )}

        <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
          {drawer}
        </Drawer>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Breadcrumbs />
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  {/* Root route - Homepage for logged-in users showing all public posts */}
                  <Route
                    path="/"
                    element={internalUser ? <Homepage user={internalUser} /> : <Home user={internalUser} />}
                  />
                  {/* Unregister landing page - smart router for unregistered users */}
                  <Route
                    path="/unregister"
                    element={<Home user={internalUser} />}
                  />
                  <Route path="/search" element={<Search />} />
                  <Route path="/login" element={<Login setUser={setInternalUser} />} />
                  <Route path="/register" element={<Register setUser={setInternalUser} />} />
                  <Route path="/videos" element={<Videos user={internalUser} />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/docs" element={<Docs user={internalUser} />} />
                  <Route path="/meetings" element={<Meetings user={internalUser} />} />
                  <Route
                    path="/meetings/:id"
                    element={internalUser ? <MeetingRoom user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route path="/meetings/guest/:id" element={<MeetingLobby />} />
                  <Route path="/media" element={<MediaGallery />} />
                  <Route
                    path="/feed"
                    element={internalUser ? <Feed user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/groups"
                    element={internalUser ? <Groups user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/pages"
                    element={internalUser ? <Pages user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/projects"
                    element={internalUser ? <Projects user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/bookmarks"
                    element={internalUser ? <Bookmarks user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/cart"
                    element={internalUser ? <Cart /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/chat"
                    element={internalUser ? <Chat user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/profile"
                    element={internalUser ? <Profile user={internalUser} /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/admin"
                    element={internalUser && (internalUser.role === 'admin' || internalUser.role === 'moderator') ? <AdminDashboard /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/security"
                    element={internalUser ? <SecuritySettings /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/analytics"
                    element={internalUser ? <Analytics user={internalUser} /> : <Navigate to="/login" />}
                  />
                  {/* Phase 3 Features - Email Notifications */}
                  <Route
                    path="/notifications/email"
                    element={internalUser ? <EmailPreferences /> : <Navigate to="/login" />}
                  />
                  {/* Phase 3 Features - OAuth Login */}
                  <Route path="/login/oauth" element={<OAuthLogin />} />
                  {/* Phase 3 Features - Elasticsearch Search */}
                  <Route
                    path="/search/advanced"
                    element={internalUser ? <ElasticsearchSearch /> : <Navigate to="/login" />}
                  />
                  {/* Phase 3 Features - Drive Folder Hierarchy */}
                  <Route
                    path="/folders"
                    element={internalUser ? <FolderBrowser user={internalUser} /> : <Navigate to="/login" />}
                  />
                  {/* Phase 3 Features - Wiki Diff Viewer */}
                  <Route
                    path="/wikis/diff"
                    element={internalUser ? <WikiDiffViewer /> : <Navigate to="/login" />}
                  />
                  {/* Phase 3 Features - WebRTC Voice/Video */}
                  <Route
                    path="/calls"
                    element={internalUser ? <WebRTCCallWidget /> : <Navigate to="/login" />}
                  />
                  {/* Phase 3 Features - Database Views Builder */}
                  <Route
                    path="/databases/views"
                    element={internalUser ? <DatabaseViews /> : <Navigate to="/login" />}
                  />
                  {/* Discord Admin Panel */}
                  <Route
                    path="/discord/admin"
                    element={internalUser ? <DiscordAdmin user={internalUser} /> : <Navigate to="/login" />}
                  />
                  {/* Phase 5 Features - Theme Settings */}
                  <Route path="/settings/theme" element={<ThemeSettings />} />
                  {/* Phase 5 Features - Accessibility Settings */}
                  <Route path="/settings/accessibility" element={<AccessibilitySettings />} />
                  {/* Streaming Features - Radio & TV */}
                  <Route
                    path="/radio"
                    element={internalUser ? <Radio /> : <Navigate to="/login" />}
                  />
                  <Route
                    path="/tv"
                    element={internalUser ? <TV /> : <Navigate to="/login" />}
                  />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </Container>
        <QuickAccessMenu />
        <Onboarding />
      </ErrorBoundary>
    </ThemeProvider>
  );
}

function App() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        refetchOnWindowFocus: false,
        retry: 1,
        staleTime: 5 * 60 * 1000,
      },
    },
  });

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <AppContent />
      </Router>
    </QueryClientProvider >
  );
}

export default App;
