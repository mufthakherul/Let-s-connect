import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Container, Box, IconButton,
  CssBaseline, ThemeProvider, createTheme, Drawer, List,
  ListItem, ListItemButton, ListItemIcon, ListItemText, useMediaQuery, Divider, Avatar,
  CircularProgress, Menu, MenuItem, Tooltip, Badge,
  Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import { grey } from '@mui/material/colors';
import {
  Brightness4, Brightness7, Menu as MenuIcon,
  ExitToApp, Login as LoginIcon,
  Dashboard as DashboardIcon,
  Settings as SettingsIcon, Close as CloseIcon,
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import NotificationCenter from './components/common/NotificationCenter';
import ErrorBoundary from './components/common/ErrorBoundary';
import Error404 from './components/errors/Error404';
import Error500 from './components/errors/Error500';
import Error503 from './components/errors/Error503';
import Error429 from './components/errors/Error429';
import Error401 from './components/errors/Error401';
import Error403 from './components/errors/Error403';
import BackgroundAnimation from './components/common/BackgroundAnimation';
import { GlobalStyles } from '@mui/material';
import { designTokens, getGlassyStyle } from './theme/designSystem';

// Eager load critical components
import Login from './components/Login';

// Lazy load admin panel
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));

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

  // Reset scroll position whenever the user navigates between routes.
  // Without this the browser will retain the previous scroll offset which
  // can leave the landing page blank if you navigated from a long doc/video
  // page.  The unregistered user was seeing this "empty" view and assuming
  // the app was broken. A global hook handles it for all routes.
  React.useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }, [location.pathname]);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  // Registered navbar specific state
  const [showRegisteredSearch, setShowRegisteredSearch] = useState(false);
  const [registeredAppsAnchor, setRegisteredAppsAnchor] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);
  const { mode, toggleTheme, getAccentColor, initSystemThemeListener, accessibility } = useThemeStore();

  // Brand gradient: modern premium gradients from designTokens
  const brandGradient = useMemo(() =>
    `linear-gradient(135deg, ${designTokens.colors[mode].primary} 0%, ${designTokens.colors[mode].secondary} 100%)`,
    [mode]
  );
  const { user, logout } = useAuthStore();
  const isMobile = useMediaQuery('(max-width:900px)');
  const isTablet = useMediaQuery('(min-width:901px) and (max-width:1200px)');
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
      const { textScale, highContrast, largeText, reducedMotion, colorBlindSupport, magnification, glassmorphism, fontFamily } = accessibility;

      const accentColor = getAccentColor() || {
        primary: designTokens.colors[mode].primary,
        secondary: designTokens.colors[mode].secondary,
      };

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

      const ensurePaletteEntry = (entry, fallbackMain) => {
        if (!entry || typeof entry !== 'object') {
          return { main: fallbackMain };
        }
        if (typeof entry.main !== 'string' || !entry.main.trim()) {
          return { ...entry, main: fallbackMain };
        }
        return entry;
      };

      const defaultMain = mode === 'dark' ? '#9e9e9e' : '#757575';

      const defaultTextPrimary = mode === 'dark' ? '#ffffff' : 'rgba(0, 0, 0, 0.87)';
      const defaultTextSecondary = mode === 'dark' ? 'rgba(255, 255, 255, 0.7)' : 'rgba(0, 0, 0, 0.6)';

      // use a different name than the imported `Palette` icon so that
      // minification doesn't accidentally collide; older builds renamed
      // `palette` to `Palette` and then used it before declaration, causing
      // runtime ReferenceErrors in production.
      const myPalette = {
        mode,
        primary: {
          main: highContrast ? (mode === 'dark' ? '#fff' : '#000') : accentColor.primary,
          light: designTokens.colors[mode].primary + 'cc',
          dark: designTokens.colors[mode].primary,
        },
        secondary: {
          main: highContrast ? (mode === 'dark' ? '#ff0' : '#f00') : accentColor.secondary,
        },
        background: {
          default: highContrast ? (mode === 'dark' ? '#000' : '#fff') : designTokens.colors[mode].background,
          paper: highContrast ? (mode === 'dark' ? '#000' : '#fff') : designTokens.colors[mode].paper,
        },
        text: {
          primary: designTokens.colors[mode].text,
          secondary: designTokens.colors[mode].textSecondary,
        },
        divider: designTokens.colors[mode].border,
        success: { main: '#10b981' },
      };

      return createTheme({
        palette: myPalette,
        typography: {
          fontFamily: designTokens.typography.fontFamily,
          fontSize: 14 * textScale,
          h1: { ...designTokens.typography.h1, fontSize: `${2.2 * textScale}rem` },
          h2: { ...designTokens.typography.h2, fontSize: `${1.8 * textScale}rem` },
          button: designTokens.typography.button,
        },
        shape: { borderRadius: 12 },
        components: {
          MuiCssBaseline: {
            styleOverrides: {
              body: {
                scrollbarWidth: 'thin',
                '&::-webkit-scrollbar': { width: '8px', height: '8px' },
                '&::-webkit-scrollbar-track': { background: 'transparent' },
                '&::-webkit-scrollbar-thumb': {
                  background: mode === 'dark' ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.1)',
                  borderRadius: '10px',
                },
                '&::-webkit-scrollbar-thumb:hover': {
                  background: mode === 'dark' ? 'rgba(255,255,255,0.2)' : 'rgba(0,0,0,0.2)',
                },
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                ...(glassmorphism ? getGlassyStyle(mode) : {}),
                backgroundColor: mode === 'dark' ? '#1e293b' : '#ffffff',
                color: mode === 'dark' ? '#f8fafc' : '#0f172a',
                backgroundImage: 'none',
                boxShadow: 'none',
                borderBottom: `1px solid ${designTokens.colors[mode].border}`,
              },
            },
          },
          MuiDrawer: {
            styleOverrides: {
              paper: {
                ...(glassmorphism ? getGlassyStyle(mode) : {}),
                backgroundImage: 'none',
                borderRight: `1px solid ${designTokens.colors[mode].border}`,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                ...(glassmorphism ? {
                  backgroundColor: mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : 'rgba(255, 255, 255, 0.4)',
                  backdropFilter: 'blur(8px)',
                } : {}),
                borderRadius: 16,
                border: `1px solid ${designTokens.colors[mode].border}`,
                boxShadow: mode === 'dark' ? '0 4px 20px rgba(0,0,0,0.4)' : '0 4px 20px rgba(0,0,0,0.05)',
                transition: 'transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: mode === 'dark' ? '0 12px 30px rgba(0,0,0,0.6)' : '0 12px 30px rgba(0,0,0,0.12)',
                },
              },
            },
          },
          MuiButton: {
            styleOverrides: {
              root: {
                borderRadius: 10,
                textTransform: 'none',
                fontWeight: 600,
                padding: '8px 20px',
              },
            },
          },
        },
      });
    },
    [mode, accessibility, getAccentColor]
  );

  const handleLogout = () => {
    logout();
    setInternalUser(null);
  };

  const navigationItems = [
    { label: 'Admin Dashboard', path: '/admin', icon: <DashboardIcon />, public: false, adminOnly: true },
  ];

  const drawer = (
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
          if (!item.public && !internalUser) return null;
          if (item.adminOnly && (!internalUser || (internalUser.role !== 'admin' && internalUser.role !== 'moderator'))) return null;

          return (
            <ListItem disablePadding key={item.path}>
              <ListItemButton component={Link} to={item.path} onClick={() => setDrawerOpen(false)}>
                <ListItemIcon>{item.icon}</ListItemIcon>
                <ListItemText primary={item.label} />
              </ListItemButton>
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        {internalUser ? (
          <ListItem disablePadding>
            <ListItemButton onClick={() => { handleLogout(); setDrawerOpen(false); }}>
              <ListItemIcon><ExitToApp /></ListItemIcon>
              <ListItemText primary="Logout" />
            </ListItemButton>
          </ListItem>
        ) : (
          <>
            <ListItem disablePadding>
              <ListItemButton component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
                <ListItemIcon><LoginIcon /></ListItemIcon>
                <ListItemText primary="Login" />
              </ListItemButton>
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      {/* Page-aware background animation: choose variant based on route + auth */}
      {
        (() => {
          const path = location.pathname || '/';
          let variant = 'auto';

          if (accessibility.reducedMotion) variant = 'none';
          else if (internalUser) variant = 'loggedIn';
          else if (path === '/' || path === '/unregister') variant = 'landing';
          else if (path.startsWith('/docs') || path.startsWith('/helpcenter') || path.startsWith('/videos')) variant = 'subtle';
          else if (path.startsWith('/login')) variant = 'none';
          else variant = 'auto';

          return <BackgroundAnimation variant={variant} isLoggedIn={!!internalUser} reducedMotion={accessibility.reducedMotion} />;
        })()
      }
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
      <ErrorBoundary level="page" fallback={(err) => <Error500 details={err?.message} />}>
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
                    background: brandGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 800,
                    fontSize: '1.2rem',
                    minWidth: 'fit-content'
                  }}
                >
                  Milonexa
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
                    backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)',
                    borderRadius: '12px',
                    px: 1.5,
                    py: 0.5,
                    minWidth: '260px',
                    ml: 1,
                    transition: 'all 0.2s ease',
                    border: `1px solid ${designTokens.colors[mode].border}`,
                    '&:focus-within': {
                      backgroundColor: mode === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,1)',
                      boxShadow: `0 0 0 2px ${designTokens.colors[mode].primary}44`,
                    }
                  }}>
                    <SearchIcon sx={{ color: 'text.secondary', mr: 1, fontSize: '1.2rem' }} />
                    <input
                      type="text"
                      placeholder="Search people, posts, docs..."
                      aria-label="Search"
                      style={{
                        border: 'none',
                        outline: 'none',
                        backgroundColor: 'transparent',
                        color: 'inherit',
                        fontSize: '0.95rem',
                        width: '100%',
                        fontFamily: 'inherit'
                      }}
                      autoFocus
                    />
                    <Tooltip title="Close search">
                      <IconButton onClick={() => setShowRegisteredSearch(false)} sx={{ ml: 1 }} size="small">
                        <CloseIcon fontSize="small" />
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
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        transform: 'translateY(-2px)'
                      },
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title="Home"
                  >
                    <HomeIcon sx={{ fontSize: '1.6rem' }} />
                    {window.location.pathname === '/' && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: '20%',
                          right: '20%',
                          height: '3px',
                          background: brandGradient,
                          borderRadius: '4px 4px 0 0'
                        }}
                      />
                    )}
                  </IconButton>

                  <IconButton
                    component={Link}
                    to="/friends"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        transform: 'translateY(-2px)'
                      },
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title="Friends"
                  >
                    <PeopleIcon sx={{ fontSize: '1.6rem' }} />
                    {window.location.pathname === '/friends' && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: '20%',
                          right: '20%',
                          height: '3px',
                          background: brandGradient,
                          borderRadius: '4px 4px 0 0'
                        }}
                      />
                    )}
                  </IconButton>

                  <IconButton
                    component={Link}
                    to="/videos"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        transform: 'translateY(-2px)'
                      },
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title="Videos"
                  >
                    <VideoLibrary sx={{ fontSize: '1.6rem' }} />
                    {window.location.pathname === '/videos' && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: '20%',
                          right: '20%',
                          height: '3px',
                          background: brandGradient,
                          borderRadius: '4px 4px 0 0'
                        }}
                      />
                    )}
                  </IconButton>

                  <IconButton
                    component={Link}
                    to="/groups"
                    sx={{
                      color: 'text.secondary',
                      '&:hover': {
                        color: 'primary.main',
                        transform: 'translateY(-2px)'
                      },
                      borderRadius: 2,
                      px: 2,
                      py: 1,
                      position: 'relative',
                      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                    }}
                    title="Groups"
                  >
                    <GroupIcon sx={{ fontSize: '1.6rem' }} />
                    {window.location.pathname === '/groups' && (
                      <motion.div
                        layoutId="nav-underline"
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: '20%',
                          right: '20%',
                          height: '3px',
                          background: brandGradient,
                          borderRadius: '4px 4px 0 0'
                        }}
                      />
                    )}
                  </IconButton>

                  {/* Apps (9-dot) button */}
                  <Tooltip title="Apps">
                    <IconButton
                      aria-label="Open apps menu"
                      aria-controls={registeredAppsAnchor ? 'registered-apps-menu' : undefined}
                      aria-haspopup="true"
                      aria-expanded={Boolean(registeredAppsAnchor)}
                      onClick={(e) => setRegisteredAppsAnchor(e.currentTarget)}
                      sx={{
                        color: 'text.secondary',
                        ml: 1,
                        '&:hover': { color: 'primary.main', backgroundColor: 'action.hover' },
                        transition: 'all 0.2s ease'
                      }}
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
                      <MenuItem component={Link} to="/settings" onClick={() => setProfileMenuAnchor(null)}>
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
          <AppBar
            position="sticky"
            elevation={1}
            sx={{
              backgroundColor: mode === 'light' ? '#ffffff' : 'primary.main',
              color: mode === 'light' ? '#0f172a !important' : '#ffffff !important',
              borderBottom: theme => `1px solid ${theme.palette.divider}`,
              '& .MuiButton-root, & .MuiIconButton-root, & .MuiTypography-root': {
                color: 'inherit !important'
              }
            }}
          >
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
                  //to="/unregister" // Consider directing to a dedicated landing page for unregistered users in the future, but for now let's keep it simple and direct
                  to="/"
                  sx={{
                    textDecoration: 'none',
                    background: brandGradient,
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    fontWeight: 700,
                    mr: 2,
                    // Ensure visibility on different backgrounds
                    filter: mode === 'light' ? 'drop-shadow(0 0 1px rgba(0,0,0,0.1))' : 'none',
                  }}
                >
                  Milonexa
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
                        transition: 'all 0.2s ease-in-out',
                        color: mode === 'light' ? 'rgba(0,0,0,0.8)' : 'inherit'
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
                        transition: 'all 0.2s ease-in-out',
                        color: mode === 'light' ? 'rgba(0,0,0,0.8)' : 'inherit'
                      }}
                    >
                      Videos
                    </Button>
                  </>
                )}
              </Box>

              {/* Spacer */}
              <Box sx={{ flexGrow: 1 }} />

              {/* Right Section: Menu -> Settings (modal) -> Login (rightmost) */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                {!isMobile && (
                  <>
                    {/* Menu icon moved into the first position */}
                    <IconButton
                      color="inherit"
                      onClick={(e) => setMoreMenuAnchor(e.currentTarget)}
                      sx={{ ml: 1 }}
                    >
                      <Box sx={{ position: 'relative', width: 24, height: 24 }}>
                        {/* 3 squares */}
                        <Box sx={{ position: 'absolute', top: 2, left: 2, width: 6, height: 6, backgroundColor: 'currentColor', borderRadius: 0.5 }} />
                        <Box sx={{ position: 'absolute', top: 2, right: 2, width: 6, height: 6, backgroundColor: 'currentColor', borderRadius: 0.5 }} />
                        <Box sx={{ position: 'absolute', bottom: 2, left: 2, width: 6, height: 6, backgroundColor: 'currentColor', borderRadius: 0.5 }} />
                        <Box sx={{ position: 'absolute', bottom: 2, right: 2, width: 6, height: 6, backgroundColor: 'currentColor', borderRadius: '50%' }} />
                      </Box>
                    </IconButton>

                    {/* Settings icon-only opens modal */}
                    <Tooltip title="Settings">
                      <IconButton color="inherit" onClick={() => setSettingsDialogOpen(true)} aria-label="Settings" sx={{ ml: 1 }}>
                        <SettingsIcon />
                      </IconButton>
                    </Tooltip>

                    {/* Login moved to the right corner (last in the row) */}
                    <Button
                      color="inherit"
                      component={Link}
                      to="/login"
                      sx={{
                        '&:hover': { transform: 'scale(1.05)' },
                        transition: 'all 0.2s ease-in-out',
                        ml: 1,
                        color: mode === 'light' ? 'rgba(0,0,0,0.8)' : 'inherit'
                      }}
                    >
                      Login
                    </Button>

                    {/* The Menu (dropdown) remains anchored to the menu icon above */}
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

                {/* Theme toggle removed from navbar — use Theme Settings (Settings → Theme) or Quick Access */}
              </Box>
            </Toolbar>
          </AppBar>
        )}

        <Dialog
          open={settingsDialogOpen}
          onClose={() => setSettingsDialogOpen(false)}
          maxWidth="sm"
          fullWidth
        >
          <DialogTitle>Settings</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, py: 1 }}>
              <Button
                fullWidth
                startIcon={mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                onClick={() => { toggleTheme(); setSettingsDialogOpen(false); }}
              >
                Toggle theme
              </Button>

              <Button fullWidth component={Link} to="/settings" onClick={() => setSettingsDialogOpen(false)}>
                Theme settings
              </Button>

              <Button fullWidth component={Link} to="/settings/accessibility" onClick={() => setSettingsDialogOpen(false)}>
                Accessibility settings
              </Button>
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSettingsDialogOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>

        <Drawer
          anchor="left"
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          keepMounted
          PaperProps={{ sx: { width: isMobile ? '85vw' : isTablet ? 320 : 280, maxWidth: 360 } }}
        >
          {drawer}
        </Drawer>

        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <AnimatePresence mode="wait">
            <motion.div
              key={location.pathname}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <Suspense fallback={<PageLoader />}>
                <Routes location={location}>
                  {/* Root route - redirect to admin */}
                  <Route
                    path="/"
                    element={<Navigate to="/admin" />}
                  />
                  <Route path="/login" element={<Login setUser={setInternalUser} />} />
                  <Route
                    path="/admin"
                    element={internalUser && (internalUser.role === 'admin' || internalUser.role === 'moderator') ? <AdminDashboard /> : <Navigate to="/login" />}
                  />
                  {/* Catch all - redirect to admin */}
                  <Route path="*" element={<Navigate to="/admin" />} />
                </Routes>
              </Suspense>
            </motion.div>
          </AnimatePresence>
        </Container>
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
