import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, Navigate } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Container, Box,
  CssBaseline, ThemeProvider, createTheme
} from '@mui/material';
import Home from './components/Home';
import Login from './components/Login';
import Register from './components/Register';
import Feed from './components/Feed';
import Videos from './components/Videos';
import Shop from './components/Shop';
import Docs from './components/Docs';
import Chat from './components/Chat';
import Profile from './components/Profile';

const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },
    secondary: { main: '#dc004e' }
  }
});

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Router>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component={Link} to="/" sx={{ flexGrow: 1, textDecoration: 'none', color: 'inherit' }}>
              Let's Connect
            </Typography>
            <Button color="inherit" component={Link} to="/videos">Videos</Button>
            <Button color="inherit" component={Link} to="/shop">Shop</Button>
            <Button color="inherit" component={Link} to="/docs">Docs</Button>
            {user ? (
              <>
                <Button color="inherit" component={Link} to="/feed">Feed</Button>
                <Button color="inherit" component={Link} to="/chat">Chat</Button>
                <Button color="inherit" component={Link} to="/profile">Profile</Button>
                <Button color="inherit" onClick={handleLogout}>Logout</Button>
              </>
            ) : (
              <>
                <Button color="inherit" component={Link} to="/login">Login</Button>
                <Button color="inherit" component={Link} to="/register">Register</Button>
              </>
            )}
          </Toolbar>
        </AppBar>

        <Container maxWidth="lg" sx={{ mt: 4 }}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login setUser={setUser} />} />
            <Route path="/register" element={<Register setUser={setUser} />} />
            <Route path="/videos" element={<Videos />} />
            <Route path="/shop" element={<Shop />} />
            <Route path="/docs" element={<Docs />} />
            <Route 
              path="/feed" 
              element={user ? <Feed user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/chat" 
              element={user ? <Chat user={user} /> : <Navigate to="/login" />} 
            />
            <Route 
              path="/profile" 
              element={user ? <Profile user={user} /> : <Navigate to="/login" />} 
            />
          </Routes>
        </Container>
      </Router>
    </ThemeProvider>
  );
}

export default App;
