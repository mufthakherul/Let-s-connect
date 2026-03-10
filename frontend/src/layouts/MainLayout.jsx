import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import { Container, CssBaseline, Box, useMediaQuery } from '@mui/material';
import { Toaster } from 'react-hot-toast';
import NavigationDrawer from '../navigation/NavigationDrawer';
import AppBarRegistered from '../navigation/AppBarRegistered';
import AppBarUnregistered from '../navigation/AppBarUnregistered';
import Breadcrumbs from '../components/common/Breadcrumbs';
import ErrorBoundary from '../components/common/ErrorBoundary';
import BackgroundAnimation from '../components/common/BackgroundAnimation';
import Error500 from '../components/errors/Error500';
import QuickAccessMenu from '../components/common/QuickAccessMenu';
import Onboarding from '../components/common/Onboarding';

/**
 * MainLayout - Main application layout
 * Extracted from App.js (Phase 1 - Workstream B1)
 * Handles: Navigation, Drawer, Breadcrumbs, Background, Error Boundaries
 */
export default function MainLayout({
  theme,
  mode,
  user,
  setUser,
  brandGradient,
  onLogout,
  onToggleTheme,
  accessibility,
  children
}) {
  const location = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const isMobile = useMediaQuery('(max-width:900px)');
  const isTablet = useMediaQuery('(min-width:901px) and (max-width:1200px)');

  // Determine background animation variant based on route and auth status
  const getBackgroundVariant = () => {
    const path = location.pathname || '/';

    if (accessibility.reducedMotion) return 'none';
    if (user) return 'loggedIn';
    if (path === '/' || path === '/unregister') return 'landing';
    if (path.startsWith('/docs') || path.startsWith('/helpcenter') || path.startsWith('/videos')) return 'subtle';
    if (path.startsWith('/login') || path.startsWith('/register')) return 'none';
    return 'auto';
  };

  return (
    <>
      <CssBaseline />

      {/* Page-aware background animation */}
      <BackgroundAnimation
        variant={getBackgroundVariant()}
        isLoggedIn={!!user}
        reducedMotion={accessibility.reducedMotion}
      />

      {/* Toast notifications */}
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
        {user ? (
          <AppBarRegistered
            mode={mode}
            user={user}
            onDrawerOpen={() => setDrawerOpen(true)}
            onLogout={onLogout}
            brandGradient={brandGradient}
          />
        ) : (
          <AppBarUnregistered
            mode={mode}
            onDrawerOpen={() => setDrawerOpen(true)}
            onToggleTheme={onToggleTheme}
            brandGradient={brandGradient}
          />
        )}

        {/* Navigation Drawer */}
        <NavigationDrawer
          open={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          isMobile={isMobile}
          isTablet={isTablet}
          user={user}
          setUser={setUser}
        />

        {/* Main content area */}
        <Container maxWidth="xl" sx={{ mt: 4, mb: 4 }}>
          <Breadcrumbs />
          {children}
        </Container>

        {/* Quick Access Menu & Onboarding */}
        <QuickAccessMenu />
        <Onboarding />
      </ErrorBoundary>
    </>
  );
}
