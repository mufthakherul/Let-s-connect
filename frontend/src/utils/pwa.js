/**
 * PWA Utilities
 * Service worker registration and PWA helpers
 */

// Service Worker Registration
export function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', async () => {
      try {
        const registration = await navigator.serviceWorker.register('/service-worker.js');
        console.log('[PWA] Service Worker registered:', registration);

        // Check for updates when app regains focus
        let isCheckingForUpdate = false;
        document.addEventListener('visibilitychange', () => {
          if (!document.hidden && !isCheckingForUpdate) {
            isCheckingForUpdate = true;
            registration.update().finally(() => {
              isCheckingForUpdate = false;
            });
          }
        });

        // Also check periodically (every 5 minutes) for updates
        setInterval(() => {
          if (!document.hidden) {
            registration.update();
          }
        }, 300000); // 5 minutes

        // Listen for updates
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              if (window.confirm('A new version is available! Reload to update?')) {
                newWorker.postMessage({ type: 'SKIP_WAITING' });
                window.location.reload();
              }
            }
          });
        });
      } catch (error) {
        console.error('[PWA] Service Worker registration failed:', error);
      }
    });

    // Reload when new service worker takes control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }
}

// Check if app is running as PWA
export function isPWA() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true ||
         document.referrer.includes('android-app://');
}

// Check if PWA can be installed
export function canInstallPWA() {
  return 'BeforeInstallPromptEvent' in window;
}

// PWA Install Prompt Handler
let deferredPrompt = null;

export function setupInstallPrompt(onPromptReady) {
  window.addEventListener('beforeinstallprompt', (e) => {
    // Prevent the default mini-infobar
    e.preventDefault();
    // Save the event for later use
    deferredPrompt = e;
    // Notify that install prompt is ready
    if (onPromptReady) {
      onPromptReady();
    }
  });

  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
  });
}

export async function showInstallPrompt() {
  if (!deferredPrompt) {
    return { outcome: 'no-prompt' };
  }

  // Show the install prompt
  deferredPrompt.prompt();
  
  // Wait for the user to respond
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] Install prompt outcome: ${outcome}`);
  
  // Clear the prompt
  deferredPrompt = null;
  
  return { outcome };
}

// Online/Offline Status
export function setupOnlineStatus(onStatusChange) {
  const updateOnlineStatus = () => {
    const isOnline = navigator.onLine;
    console.log(`[PWA] Online status: ${isOnline}`);
    if (onStatusChange) {
      onStatusChange(isOnline);
    }
  };

  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);

  // Return cleanup function
  return () => {
    window.removeEventListener('online', updateOnlineStatus);
    window.removeEventListener('offline', updateOnlineStatus);
  };
}

// Background Sync
export async function registerBackgroundSync(tag) {
  if ('serviceWorker' in navigator && 'sync' in navigator.serviceWorker) {
    try {
      const registration = await navigator.serviceWorker.ready;
      await registration.sync.register(tag);
      console.log(`[PWA] Background sync registered: ${tag}`);
      return true;
    } catch (error) {
      console.error('[PWA] Background sync registration failed:', error);
      return false;
    }
  }
  return false;
}

// Push Notifications
export async function subscribeToPushNotifications() {
  if (!('PushManager' in window)) {
    console.warn('[PWA] Push notifications not supported');
    return null;
  }

  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if already subscribed
    let subscription = await registration.pushManager.getSubscription();
    
    if (!subscription) {
      // Request permission
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        console.warn('[PWA] Push notification permission denied');
        return null;
      }

      // Subscribe to push notifications
      // Note: You need a VAPID public key from your backend
      const vapidPublicKey = process.env.REACT_APP_VAPID_PUBLIC_KEY;
      if (vapidPublicKey) {
        subscription = await registration.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
        console.log('[PWA] Push notification subscription created');
      }
    }

    return subscription;
  } catch (error) {
    console.error('[PWA] Push notification subscription failed:', error);
    return null;
  }
}

export async function unsubscribeFromPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    const subscription = await registration.pushManager.getSubscription();
    
    if (subscription) {
      await subscription.unsubscribe();
      console.log('[PWA] Push notification unsubscribed');
      return true;
    }
    return false;
  } catch (error) {
    console.error('[PWA] Push notification unsubscribe failed:', error);
    return false;
  }
}

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Cache Management
export async function clearCache() {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ type: 'CLEAR_CACHE' });
  }
}

export async function cacheUrls(urls) {
  if ('serviceWorker' in navigator) {
    const registration = await navigator.serviceWorker.ready;
    registration.active?.postMessage({ 
      type: 'CACHE_URLS',
      urls 
    });
  }
}

// Share API
export async function shareContent({ title, text, url, files }) {
  if (!navigator.share) {
    console.warn('[PWA] Web Share API not supported');
    return false;
  }

  try {
    const shareData = { title, text, url };
    
    // Add files if supported and provided
    if (files && navigator.canShare && navigator.canShare({ files })) {
      shareData.files = files;
    }

    await navigator.share(shareData);
    console.log('[PWA] Content shared successfully');
    return true;
  } catch (error) {
    if (error.name !== 'AbortError') {
      console.error('[PWA] Share failed:', error);
    }
    return false;
  }
}

// Check if Web Share API is supported
export function canShare() {
  return 'share' in navigator;
}

// Storage Estimation
export async function getStorageEstimate() {
  if ('storage' in navigator && 'estimate' in navigator.storage) {
    try {
      const estimate = await navigator.storage.estimate();
      return {
        usage: estimate.usage || 0,
        quota: estimate.quota || 0,
        percentage: estimate.quota ? (estimate.usage / estimate.quota * 100).toFixed(2) : 0
      };
    } catch (error) {
      console.error('[PWA] Storage estimate failed:', error);
    }
  }
  return null;
}

// Request persistent storage
export async function requestPersistentStorage() {
  if ('storage' in navigator && 'persist' in navigator.storage) {
    try {
      const isPersisted = await navigator.storage.persist();
      console.log(`[PWA] Persistent storage: ${isPersisted}`);
      return isPersisted;
    } catch (error) {
      console.error('[PWA] Persistent storage request failed:', error);
    }
  }
  return false;
}

// Check if storage is persisted
export async function isStoragePersisted() {
  if ('storage' in navigator && 'persisted' in navigator.storage) {
    return await navigator.storage.persisted();
  }
  return false;
}

export default {
  registerServiceWorker,
  isPWA,
  canInstallPWA,
  setupInstallPrompt,
  showInstallPrompt,
  setupOnlineStatus,
  registerBackgroundSync,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  clearCache,
  cacheUrls,
  shareContent,
  canShare,
  getStorageEstimate,
  requestPersistentStorage,
  isStoragePersisted
};
