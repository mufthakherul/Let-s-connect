import React, { useState, useEffect } from 'react';
import {
  Snackbar,
  Button,
  IconButton,
  Box,
  Typography,
  Paper,
  Slide
} from '@mui/material';
import {
  Close as CloseIcon,
  GetApp as InstallIcon,
  PhoneIphone as PhoneIcon
} from '@mui/icons-material';
import { setupInstallPrompt, showInstallPrompt, isPWA } from '../../utils/pwa';

function PWAInstallBanner() {
  const [showBanner, setShowBanner] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  useEffect(() => {
    // Don't show if already running as PWA
    if (isPWA()) {
      return;
    }

    // Check if user has dismissed the banner before
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    const dismissedTime = dismissed ? parseInt(dismissed, 10) : 0;
    const oneDayMs = 24 * 60 * 60 * 1000;

    // Show banner if not dismissed in the last 24 hours
    if (!dismissed || Date.now() - dismissedTime > oneDayMs) {
      setupInstallPrompt(() => {
        setShowBanner(true);
      });
    }
  }, []);

  const handleInstall = async () => {
    setIsInstalling(true);
    try {
      const { outcome } = await showInstallPrompt();
      
      if (outcome === 'accepted') {
        console.log('User accepted the install prompt');
        setShowBanner(false);
      } else if (outcome === 'dismissed') {
        console.log('User dismissed the install prompt');
        handleDismiss();
      }
    } catch (error) {
      console.error('Install error:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
    localStorage.setItem('pwa-install-dismissed', Date.now().toString());
  };

  if (!showBanner) {
    return null;
  }

  return (
    <Snackbar
      open={showBanner}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      TransitionComponent={Slide}
      sx={{ bottom: { xs: 80, sm: 24 } }}
    >
      <Paper
        elevation={6}
        sx={{
          p: 2,
          maxWidth: 400,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
          color: 'white'
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2 }}>
          <PhoneIcon sx={{ fontSize: 40, mt: 0.5 }} />
          <Box sx={{ flex: 1 }}>
            <Typography variant="h6" gutterBottom>
              Install Let's Connect
            </Typography>
            <Typography variant="body2" sx={{ mb: 2, opacity: 0.9 }}>
              Add to your home screen for a better experience with offline support and faster loading.
            </Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Button
                variant="contained"
                size="small"
                startIcon={<InstallIcon />}
                onClick={handleInstall}
                disabled={isInstalling}
                sx={{
                  bgcolor: 'white',
                  color: '#667eea',
                  '&:hover': {
                    bgcolor: 'rgba(255, 255, 255, 0.9)'
                  }
                }}
              >
                {isInstalling ? 'Installing...' : 'Install'}
              </Button>
              <Button
                variant="text"
                size="small"
                onClick={handleDismiss}
                sx={{ color: 'white' }}
              >
                Not Now
              </Button>
            </Box>
          </Box>
          <IconButton
            size="small"
            onClick={handleDismiss}
            sx={{ color: 'white', mt: -1, mr: -1 }}
          >
            <CloseIcon />
          </IconButton>
        </Box>
      </Paper>
    </Snackbar>
  );
}

export default PWAInstallBanner;
