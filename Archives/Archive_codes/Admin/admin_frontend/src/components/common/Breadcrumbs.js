import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Breadcrumbs as MuiBreadcrumbs, Link as MuiLink, Typography, Box } from '@mui/material';
import { NavigateNext, Home as HomeIcon } from '@mui/icons-material';

// Route name mappings for better display
const routeNames = {
  '': 'Home',
  'feed': 'Feed',
  'videos': 'Videos',
  'shop': 'Shop',
  'blog': 'Blog',
  'docs': 'Documentation',
  'chat': 'Chat',
  'groups': 'Groups',
  'profile': 'Profile',
  'cart': 'Shopping Cart',
  'bookmarks': 'Bookmarks',
  'pages': 'Pages',
  'projects': 'Projects',
  'search': 'Search',
  'advanced': 'Advanced Search',
  'admin': 'Admin Dashboard',
  'login': 'Login',
  'register': 'Register',
  'settings': 'Settings',
  'theme': 'Theme Settings',
  'notifications': 'Notifications',
  'email': 'Email Preferences',
  'security': 'Security Settings',
  'calls': 'Calls',
  'folders': 'Folders',
  'wikis': 'Wikis',
  'diff': 'Diff Viewer',
  'databases': 'Databases',
  'views': 'Database Views',
  'discord': 'Discord',
  'media': 'Media Gallery',
  'analytics': 'Analytics',
  'oauth': 'OAuth',
  'elasticsearch': 'Search'
};

const Breadcrumbs = ({ sx = {} }) => {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);

  // Don't show breadcrumbs on home page
  if (location.pathname === '/') {
    return null;
  }

  return (
    <Box sx={{ mb: 2, ...sx }}>
      <MuiBreadcrumbs
        separator={<NavigateNext fontSize="small" />}
        aria-label="breadcrumb"
        sx={{
          '& .MuiBreadcrumbs-separator': {
            mx: 1,
          },
        }}
      >
        {/* Home link */}
        <MuiLink
          component={Link}
          to="/"
          underline="hover"
          color="inherit"
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            '&:hover': {
              color: 'primary.main',
            },
          }}
        >
          <HomeIcon fontSize="small" />
          Home
        </MuiLink>

        {/* Dynamic path segments */}
        {pathnames.map((value, index) => {
          const last = index === pathnames.length - 1;
          const to = `/${pathnames.slice(0, index + 1).join('/')}`;
          const displayName = routeNames[value] || value.charAt(0).toUpperCase() + value.slice(1);

          return last ? (
            <Typography
              key={to}
              color="text.primary"
              sx={{ fontWeight: 600 }}
            >
              {displayName}
            </Typography>
          ) : (
            <MuiLink
              component={Link}
              to={to}
              key={to}
              underline="hover"
              color="inherit"
              sx={{
                '&:hover': {
                  color: 'primary.main',
                },
              }}
            >
              {displayName}
            </MuiLink>
          );
        })}
      </MuiBreadcrumbs>
    </Box>
  );
};

export default Breadcrumbs;
