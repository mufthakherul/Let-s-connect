import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AppBar, Toolbar, Typography, Button, Box, IconButton, Menu, MenuItem,
  ListItemIcon, ListItemText, Tooltip, Dialog, DialogTitle, DialogContent,
  DialogActions, useMediaQuery
} from '@mui/material';
import {
  Menu as MenuIcon, Description, VideoLibrary, ShoppingCart, Event as EventIcon,
  Article, Settings as SettingsIcon, Brightness4, Brightness7
} from '@mui/icons-material';

/**
 * AppBarUnregistered - Navigation bar for guest/unauthenticated users
 * Extracted from App.js (Phase 1 - Workstream B1)
 */
export default function AppBarUnregistered({
  mode,
  onDrawerOpen,
  onToggleTheme,
  brandGradient
}) {
  const isMobile = useMediaQuery('(max-width:900px)');
  const [moreMenuAnchor, setMoreMenuAnchor] = useState(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);

  return (
    <>
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
            <IconButton edge="start" color="inherit" onClick={onDrawerOpen} sx={{ mr: 2 }}>
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
          </Box>
        </Toolbar>
      </AppBar>

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
              onClick={() => { onToggleTheme(); setSettingsDialogOpen(false); }}
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
    </>
  );
}
