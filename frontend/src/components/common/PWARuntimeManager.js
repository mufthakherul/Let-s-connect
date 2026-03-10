import React, { useEffect, useMemo, useState } from 'react';
import { Snackbar, Alert, Button } from '@mui/material';
import toast from 'react-hot-toast';
import { webSharedApiClient } from '../../shared/apiClient';
import {
  registerBackgroundSync,
  subscribeToPushNotifications
} from '../../utils/pwa';
import { triggerHapticFeedback } from '../../utils/mobile';

const PUSH_DISMISS_KEY = 'pwa-push-dismissed';
const PUSH_ENABLED_KEY = 'pwa-push-enabled';

function PWARuntimeManager({ user }) {
  const [showPushPrompt, setShowPushPrompt] = useState(false);
  const [working, setWorking] = useState(false);

  const canUsePush = useMemo(() => {
    return typeof window !== 'undefined' && 'PushManager' in window && 'serviceWorker' in navigator;
  }, []);

  useEffect(() => {
    // Best-effort background sync registration for offline queues.
    registerBackgroundSync('sync-posts');
    registerBackgroundSync('sync-messages');
  }, []);

  useEffect(() => {
    if (!user || !canUsePush) {
      return;
    }

    const permission = Notification.permission;
    const dismissed = localStorage.getItem(PUSH_DISMISS_KEY);
    const isEnabled = localStorage.getItem(PUSH_ENABLED_KEY) === 'true';

    if (permission === 'granted' && isEnabled) {
      enablePushForUser(user.id, false);
      return;
    }

    if (permission === 'default' && !dismissed) {
      setShowPushPrompt(true);
    }
  }, [user, canUsePush]);

  const enablePushForUser = async (userId, showFeedback = true) => {
    if (!userId) {
      return;
    }

    try {
      setWorking(true);
      const subscription = await subscribeToPushNotifications();

      if (!subscription) {
        if (showFeedback) {
          toast.error('Push notifications were not enabled.');
        }
        return;
      }

      await webSharedApiClient.post('/api/messaging/push/subscribe', {
        userId,
        subscription
      });

      localStorage.setItem(PUSH_ENABLED_KEY, 'true');
      localStorage.removeItem(PUSH_DISMISS_KEY);
      setShowPushPrompt(false);
      triggerHapticFeedback('success');

      if (showFeedback) {
        toast.success('Push notifications enabled');
      }
    } catch (error) {
      console.error('[PWA] Failed to enable push notifications:', error);
      if (showFeedback) {
        toast.error(error.data?.error || error.message || 'Unable to enable push notifications');
      }
    } finally {
      setWorking(false);
    }
  };

  const handleEnable = async () => {
    await enablePushForUser(user?.id, true);
  };

  const handleLater = () => {
    localStorage.setItem(PUSH_DISMISS_KEY, Date.now().toString());
    setShowPushPrompt(false);
    triggerHapticFeedback('light');
  };

  if (!user || !canUsePush) {
    return null;
  }

  return (
    <Snackbar
      open={showPushPrompt}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      sx={{ bottom: { xs: 142, sm: 24 } }}
    >
      <Alert
        severity="info"
        action={(
          <>
            <Button
              color="inherit"
              size="small"
              disabled={working}
              onClick={handleEnable}
            >
              Enable
            </Button>
            <Button
              color="inherit"
              size="small"
              disabled={working}
              onClick={handleLater}
            >
              Later
            </Button>
          </>
        )}
        sx={{ width: '100%' }}
      >
        Enable push notifications so you don't miss messages while away.
      </Alert>
    </Snackbar>
  );
}

export default PWARuntimeManager;
