import React, { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Container, Box, IconButton,
  CssBaseline, ThemeProvider, createTheme, Drawer, List,
  ListItem, ListItemIcon, ListItemText, useMediaQuery, Divider, Avatar,
  CircularProgress
} from '@mui/material';
import {
  Brightness4, Brightness7, Menu as MenuIcon, Home as HomeIcon,
  VideoLibrary, ShoppingCart, Description, Chat as ChatIcon,
  Person, ExitToApp, Login as LoginIcon,
  PersonAdd, Feed as FeedIcon, Group as GroupIcon, Bookmark,
  ShoppingCartOutlined, Article, Pages as PagesIcon, Work as WorkIcon,
  Dashboard as DashboardIcon, Search as SearchIcon, Folder as FolderIcon,
  Phone as PhoneIcon, Storage as DatabaseIcon, CompareArrows as DiffIcon,
  Settings as SettingsIcon
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import NotificationCenter from './components/common/NotificationCenter';
import ErrorBoundary from './components/common/ErrorBoundary';
import Breadcrumbs from './components/common/Breadcrumbs';
import QuickAccessMenu from './components/common/QuickAccessMenu';
import Onboarding from './components/common/Onboarding';

// Eager load critical components (needed for initial render)
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';

// Lazy load non-critical components (Phase 4: Performance Optimization)
const Feed = lazy(() => import('./components/Feed'));
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
const Projects = lazy(() => import('./components/Projects'));
const AdminDashboard = lazy(() => import('./components/AdminDashboard'));
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
const ThemeSettings = lazy(() => import('./components/ThemeSettings'));

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
    <CircularProgress size={40} />
    <Typography variant="body2" color="text.secondary">
      Loading...
    </Typography>
  </Box>
);

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mode, toggleTheme, getAccentColor, initSystemThemeListener } = useThemeStore();
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
      const accentColor = getAccentColor();
      return createTheme({
        palette: {
          mode,
          primary: {
            main: accentColor.primary,
            light: mode === 'dark' ? '#bbdefb' : '#42a5f5',
            dark: mode === 'dark' ? '#648dae' : '#1565c0',
          },
          secondary: {
            main: accentColor.secondary,
          },
          background: {
            default: mode === 'dark' ? '#121212' : '#fafafa',
            paper: mode === 'dark' ? '#1e1e1e' : '#ffffff',
          },
        },
        typography: {
          fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
        },
        shape: {
          borderRadius: 12,
        },
        transitions: {
          duration: {
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
          MuiButton: {
            styleOverrides: {
              root: {
                textTransform: 'none',
                fontWeight: 600,
              },
            },
          },
          MuiCard: {
            styleOverrides: {
              root: {
                boxShadow: mode === 'dark'
                  ? '0 2px 8px rgba(0,0,0,0.4)'
                  : '0 2px 8px rgba(0,0,0,0.1)',
                transition: 'box-shadow 0.3s ease-in-out, background-color 0.3s ease-in-out',
              },
            },
          },
          MuiPaper: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
              },
            },
          },
          MuiAppBar: {
            styleOverrides: {
              root: {
                transition: 'background-color 0.3s ease-in-out, box-shadow 0.3s ease-in-out',
              },
            },
          },
        },
      });
    },
    [mode, getAccentColor]
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
    { label: 'Theme Settings', path: '/settings/theme', icon: <SettingsIcon />, public: true },
    { label: 'Admin', path: '/admin', icon: <DashboardIcon />, public: false, adminOnly: true },
  ];

  const drawer = (
    <Box sx={{ width: 250 }} role="presentation" onClick={() => setDrawerOpen(false)}>
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
          return (
            <ListItem button component={Link} to={item.path} key={item.path}>
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItem>
          );
        })}
      </List>
      <Divider />
      <List>
        {internalUser ? (
          <ListItem button onClick={handleLogout}>
            <ListItemIcon><ExitToApp /></ListItemIcon>
            <ListItemText primary="Logout" />
          </ListItem>
        ) : (
          <>
            <ListItem button component={Link} to="/login">
              <ListItemIcon><LoginIcon /></ListItemIcon>
              <ListItemText primary="Login" />
            </ListItem>
            <ListItem button component={Link} to="/register">
              <ListItemIcon><PersonAdd /></ListItemIcon>
              <ListItemText primary="Register" />
            </ListItem>
          </>
        )}
      </List>
    </Box>
  );

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
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
          <Router>
            <AppBar position="sticky" elevation={1}>
              <Toolbar>
                {isMobile && (
                  <IconButton
                    edge="start"
                    color="inherit"
                    onClick={() => setDrawerOpen(true)}
                    sx={{ mr: 2 }}
                  >
                    <MenuIcon />
                  </IconButton>
                )}
                <Typography
                  variant="h6"
                  component={Link}
                  to="/"
                  sx={{
                    flexGrow: isMobile ? 1 : 0,
                    mr: isMobile ? 0 : 4,
                    textDecoration: 'none',
                    color: 'inherit',
                    fontWeight: 700,
                  }}
                >
                  Let's Connect
                </Typography>

                {!isMobile && (
                  <Box sx={{ flexGrow: 1, display: 'flex', gap: 1 }}>
                    <Button color="inherit" component={Link} to="/videos" startIcon={<VideoLibrary />}>
                      Videos
                    </Button>
                    <Button color="inherit" component={Link} to="/shop" startIcon={<ShoppingCart />}>
                      Shop
                    </Button>
                    <Button color="inherit" component={Link} to="/docs" startIcon={<Description />}>
                      Docs
                    </Button>
                    {internalUser && (
                      <>
                        <Button color="inherit" component={Link} to="/feed" startIcon={<FeedIcon />}>
                          Feed
                        </Button>
                        <Button color="inherit" component={Link} to="/groups" startIcon={<GroupIcon />}>
                          Groups
                        </Button>
                        <Button color="inherit" component={Link} to="/chat" startIcon={<ChatIcon />}>
                          Chat
                        </Button>
                      </>
                    )}
                  </Box>
                )}

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <IconButton color="inherit" onClick={toggleTheme}>
                    {mode === 'dark' ? <Brightness7 /> : <Brightness4 />}
                  </IconButton>

                  {internalUser && (
                    <>
                      <NotificationCenter />
                      {!isMobile && (
                        <>
                          <Button
                            color="inherit"
                            component={Link}
                            to="/profile"
                            startIcon={<Avatar sx={{ width: 28, height: 28 }}>{internalUser.name?.[0]}</Avatar>}
                          >
                            {internalUser.name}
                          </Button>
                          <Button color="inherit" onClick={handleLogout} startIcon={<ExitToApp />}>
                            Logout
                          </Button>
                        </>
                      )}
                    </>
                  )}

                  {!internalUser && !isMobile && (
                    <>
                      <Button color="inherit" component={Link} to="/login">Login</Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        component={Link}
                        to="/register"
                        sx={{ ml: 1 }}
                      >
                        Sign Up
                      </Button>
                    </>
                  )}
                </Box>
              </Toolbar>
            </AppBar>

            <Drawer anchor="left" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
              {drawer}
            </Drawer>

            <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
              <Breadcrumbs />
              <Suspense fallback={<PageLoader />}>
                <Routes>
                  <Route
                    path="/"
                    element={internalUser ? <Feed user={internalUser} /> : <Home />}
                  />
                  <Route path="/search" element={<Search />} />
                  <Route path="/login" element={<Login setUser={setInternalUser} />} />
                  <Route path="/register" element={<Register setUser={setInternalUser} />} />
                  <Route path="/videos" element={<Videos user={internalUser} />} />
                  <Route path="/shop" element={<Shop />} />
                  <Route path="/blog" element={<Blog />} />
                  <Route path="/docs" element={<Docs user={internalUser} />} />
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
                </Routes>
              </Suspense>
            </Container>
            <QuickAccessMenu />
            <Onboarding />
          </Router>
        </ErrorBoundary>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
