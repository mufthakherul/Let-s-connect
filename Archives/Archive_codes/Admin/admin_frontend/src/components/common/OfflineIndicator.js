import React, { useState, useEffect } from 'react';
import { Snackbar, Alert, Box, Typography } from '@mui/material';
import { WifiOff as OfflineIcon, Wifi as OnlineIcon } from '@mui/icons-material';
import { setupOnlineStatus } from '../../utils/pwa';

function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOnlineNotification, setShowOnlineNotification] = useState(false);

  useEffect(() => {
    const cleanup = setupOnlineStatus((online) => {
      setIsOnline(online);
      
      // Show brief notification when coming back online
      if (online && !isOnline) {
        setShowOnlineNotification(true);
        setTimeout(() => setShowOnlineNotification(false), 3000);
      }
    });

    return cleanup;
  }, [isOnline]);

  return (
    <>
      {/* Persistent offline indicator */}
      {!isOnline && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            bgcolor: 'warning.main',
            color: 'warning.contrastText',
            py: 1,
            px: 2,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 1
          }}
        >
          <OfflineIcon fontSize="small" />
          <Typography variant="body2" fontWeight="medium">
            You're offline - Some features may be limited
          </Typography>
        </Box>
      )}

      {/* Back online notification */}
      <Snackbar
        open={showOnlineNotification}
        autoHideDuration={3000}
        onClose={() => setShowOnlineNotification(false)}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity="success"
          icon={<OnlineIcon />}
          sx={{ width: '100%' }}
        >
          You're back online!
        </Alert>
      </Snackbar>
    </>
  );
}

export default OfflineIndicator;
