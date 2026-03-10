import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Box, IconButton, Tooltip, Menu, MenuItem,
  ListItemIcon, ListItemText, Avatar, ListItemAvatar, Divider, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon, Home as HomeIcon, VideoLibrary, Group as GroupIcon, Close as CloseIcon,
  Search as SearchIcon, Apps as AppsIcon, PeopleAlt as PeopleIcon, Chat as ChatIcon,
  Person, Settings as SettingsIcon, ExitToApp, Description, Pages as PagesIcon,
  ShoppingCart, Event as EventIcon, Article, Radio as RadioIcon, Tv as TvIcon
} from '@mui/icons-material';
import { motion } from 'framer-motion';
import NotificationCenter from '../components/common/NotificationCenter';
import { designTokens } from '../theme/designSystem';

/**
 * AppBarRegistered - Navigation bar for authenticated users
 * Extracted from App.js (Phase 1 - Workstream B1)
 */
export default function AppBarRegistered({ mode, user, onDrawerOpen, onLogout, brandGradient }) {
  const location = useLocation();
  const isMobile = useMediaQuery('(max-width:900px)');
  const [showRegisteredSearch, setShowRegisteredSearch] = useState(false);
  const [registeredAppsAnchor, setRegisteredAppsAnchor] = useState(null);
  const [profileMenuAnchor, setProfileMenuAnchor] = useState(null);

  return (
    <AppBar position="sticky" elevation={1} sx={{ backgroundColor: mode === 'dark' ? '#18191a' : '#fff', borderBottom: `1px solid ${mode === 'dark' ? '#3a3b3c' : '#e5e5e5'}` }}>
      <Toolbar sx={{ py: 0.5, px: 2 }}>
        {/* Left Section: Name + Search Icon */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
          {isMobile && (
            <IconButton
              edge="start"
              color="inherit"
              onClick={onDrawerOpen}
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
              {location.pathname === '/' && (
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
              {location.pathname === '/friends' && (
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
              {location.pathname === '/videos' && (
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
              {location.pathname === '/groups' && (
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
                  {user?.firstName?.[0]?.toUpperCase() || ''}
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
                    <Avatar sx={{ width: 44, height: 44, backgroundColor: '#0a66c2' }}>{user?.firstName?.[0]?.toUpperCase() || ''}</Avatar>
                  </ListItemAvatar>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                    <Typography variant="subtitle1">{(user?.firstName || '') + (user?.lastName ? ` ${user.lastName}` : '')}</Typography>
                    <Typography variant="caption" color="text.secondary">{user?.email || ''}</Typography>
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
                <MenuItem onClick={() => { setProfileMenuAnchor(null); onLogout(); }}>
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
  );
}
