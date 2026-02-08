import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Container, Box, IconButton,
  CssBaseline, ThemeProvider, createTheme, Drawer, List,
  ListItem, ListItemIcon, ListItemText, useMediaQuery, Divider, Avatar
} from '@mui/material';
import {
  Brightness4, Brightness7, Menu as MenuIcon, Home as HomeIcon,
  VideoLibrary, ShoppingCart, Description, Chat as ChatIcon,
  Person, ExitToApp, Login as LoginIcon,
  PersonAdd, Feed as FeedIcon, Group as GroupIcon, Bookmark
} from '@mui/icons-material';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useThemeStore } from './store/themeStore';
import { useAuthStore } from './store/authStore';
import NotificationCenter from './components/common/NotificationCenter';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import Videos from './components/Videos';
import Shop from './components/Shop';
import Docs from './components/Docs';
import Chat from './components/Chat';
import Profile from './components/Profile';
import Groups from './components/Groups';
import Bookmarks from './components/Bookmarks';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
      staleTime: 5 * 60 * 1000,
    },
  },
});

function App() {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const { mode, toggleTheme } = useThemeStore();
  const { user, logout } = useAuthStore();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [internalUser, setInternalUser] = useState(user);

  useEffect(() => {
    setInternalUser(user);
  }, [user]);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: {
            main: mode === 'dark' ? '#90caf9' : '#1976d2',
            light: mode === 'dark' ? '#bbdefb' : '#42a5f5',
            dark: mode === 'dark' ? '#648dae' : '#1565c0',
          },
          secondary: {
            main: mode === 'dark' ? '#f48fb1' : '#dc004e',
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
              },
            },
          },
        },
      }),
    [mode]
  );

  const handleLogout = () => {
    logout();
    setInternalUser(null);
  };

  const navigationItems = [
    { label: 'Home', path: '/', icon: <HomeIcon />, public: true },
    { label: 'Videos', path: '/videos', icon: <VideoLibrary />, public: true },
    { label: 'Shop', path: '/shop', icon: <ShoppingCart />, public: true },
    { label: 'Docs', path: '/docs', icon: <Description />, public: true },
    { label: 'Feed', path: '/feed', icon: <FeedIcon />, public: false },
    { label: 'Groups', path: '/groups', icon: <GroupIcon />, public: false },
    { label: 'Bookmarks', path: '/bookmarks', icon: <Bookmark />, public: false },
    { label: 'Chat', path: '/chat', icon: <ChatIcon />, public: false },
    { label: 'Profile', path: '/profile', icon: <Person />, public: false },
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
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/login" element={<Login setUser={setInternalUser} />} />
              <Route path="/register" element={<Register setUser={setInternalUser} />} />
              <Route path="/videos" element={<Videos />} />
              <Route path="/shop" element={<Shop />} />
              <Route path="/docs" element={<Docs />} />
              <Route 
                path="/feed" 
                element={internalUser ? <Feed user={internalUser} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/groups" 
                element={internalUser ? <Groups user={internalUser} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/bookmarks" 
                element={internalUser ? <Bookmarks user={internalUser} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/chat" 
                element={internalUser ? <Chat user={internalUser} /> : <Navigate to="/login" />} 
              />
              <Route 
                path="/profile" 
                element={internalUser ? <Profile user={internalUser} /> : <Navigate to="/login" />} 
              />
            </Routes>
          </Container>
        </Router>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
