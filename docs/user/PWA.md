# Progressive Web App (PWA) Guide

Milonexa is a Progressive Web App, which means you can install it on your device and use it like a native app, even when you're offline. This guide explains how to install and use Milonexa as a PWA.

## Table of Contents

1. [What is a PWA?](#what-is-a-pwa)
2. [Installing on Desktop](#installing-on-desktop)
3. [Installing on Android](#installing-on-android)
4. [Installing on iOS](#installing-on-ios)
5. [Offline Support](#offline-support)
6. [Push Notifications](#push-notifications)
7. [Service Worker](#service-worker)
8. [App Manifest](#app-manifest)
9. [Background Sync](#background-sync)
10. [Updating the PWA](#updating-the-pwa)
11. [Storage](#storage)
12. [Troubleshooting](#troubleshooting)

---

## What is a PWA?

### Progressive Web App Definition

A Progressive Web App is a web application that uses modern web capabilities to provide a user experience similar to native apps.

### Key Characteristics

**Installable**
- Install from browser, no app store needed
- Appears on your home screen or app drawer
- Launches in full-screen app window
- Can be uninstalled like any app

**Offline-Ready**
- Works without internet connection
- Uses service worker caching
- Graceful degradation when offline
- Syncs when connection returns

**Native-like**
- Looks and feels like a mobile app
- Smooth transitions and animations
- Home screen icon
- Splash screen on launch
- Full screen experience

**Progressive**
- Works on all browsers
- Enhanced features on capable devices
- Degrades gracefully on older browsers
- No forced updates

### Benefits

✓ **Fast**: Cached content loads instantly
✓ **Reliable**: Works offline
✓ **Engaging**: Install prompt and push notifications
✓ **Space-efficient**: No app store, uses minimal storage
✓ **Always updated**: Service worker updates in background
✓ **Secure**: Served over HTTPS

---

## Installing on Desktop

### Chrome / Edge / Brave

#### Method 1: Address Bar Prompt

When you visit Milonexa in supported browsers:

```
Address bar shows: [🔒 https://milonexa.app]
                   [Install ▼]
```

Click the **Install** button:

1. Click icon in address bar
2. Click **"Install"** in the popup
3. Choose installation location
4. Milonexa appears in your applications

#### Method 2: Browser Menu

If the address bar button doesn't appear:

1. Click the **browser menu** (three dots):
   - Chrome: Menu (⋮) → "More tools" → "Create shortcut"
   - Edge: Menu (⋯) → "Apps and more" → "Install this site as an app"
   - Brave: Menu (≡) → "Install Milonexa"

2. Click **"Install"**
3. Confirm installation location
4. Milonexa is installed

#### Method 3: Right-Click

1. Right-click in Milonexa's page
2. Select **"Install Milonexa"** or **"Create shortcut"**
3. Follow prompts

### What Gets Installed

When you install Milonexa:

```
Start Menu (Windows) or Applications (macOS/Linux)
├─ Milonexa
   ├─ Launch shortcut
   ├─ Cached app shell
   └─ Local data

Desktop:
├─ Milonexa icon (if selected during installation)
```

### Launching Installed App

After installation:

**Windows:**
- Click Milonexa in Start Menu
- Or double-click desktop shortcut

**macOS:**
- Click Milonexa in Applications folder
- Or use Spotlight search

**Linux:**
- Click Milonexa in application menu
- Or launch from terminal

### Uninstalling

**Remove from Desktop:**
1. Right-click app icon
2. Select **"Uninstall"** or **"Remove"**

**Remove from OS:**
- Windows: Settings → Apps → Remove app
- macOS: Drag app to Trash
- Linux: Application menu → Uninstall

---

## Installing on Android

### Method 1: Install Banner

When you visit Milonexa on Android:

```
Browser shows prompt:
┌─────────────────────────────┐
│ "Add Milonexa to Home      │
│  Screen"                    │
│                             │
│ [Cancel]  [Install]        │
└─────────────────────────────┘
```

Click **Install** to add to home screen.

### Method 2: Browser Menu

If the banner doesn't appear:

1. Tap the **browser menu** (three dots)
2. Select **"Add to Home Screen"** or **"Install app"**
3. Confirm the app name
4. Tap **"Add"** or **"Install"**

### Method 3: Chrome's Install Prompt

In Chrome for Android:

1. Visit Milonexa
2. Tap **"Install"** button that appears (if eligible)
3. Confirm installation
4. App is added to home screen

### What Gets Created

On your home screen:

```
[Milonexa] [Calendar] [Settings]
[Phone]    [Maps]     [Camera]
```

Tapping the Milonexa icon:

1. Launches the app
2. Shows splash screen (optional)
3. Loads Milonexa in full-screen mode
4. No browser chrome visible

### Uninstalling on Android

**From Home Screen:**
1. Long-press the Milonexa icon
2. Tap **"Uninstall"** or **"Remove"**

**From Settings:**
1. Settings → Apps → Installed apps
2. Find "Milonexa"
3. Tap **"Uninstall"**

---

## Installing on iOS

### Important Note

iOS doesn't support installing PWAs in the traditional sense (no app store icon), but you can add Milonexa to your home screen via Safari.

### Installation Steps

1. **Open Milonexa in Safari**
   - Visit https://milonexa.app in Safari

2. **Tap Share Button**
   - Bottom of screen: [↑ arrow] icon
   - Swipe left if you don't see it

3. **Select "Add to Home Screen"**
   - Scroll through options
   - Tap **"Add to Home Screen"**

4. **Confirm Details**
   ```
   Name: Milonexa (can edit)
   
   [Cancel]  [Add]
   ```

5. **Tap "Add"**
   - Icon added to home screen
   - App is ready to use

### What Gets Created

Home screen shows:

```
[Milonexa app icon]
(looks like an app)

When tapped:
- Fullscreen mode (no browser chrome)
- Splash screen while loading
- Works offline if cached
```

### iOS Limitations

- **No installation prompt**: Manual process required
- **Limited offline**: Some features may not work
- **Browser limitations**: Some PWA features restricted by iOS Safari
- **No background sync**: Limited background capability

### Removing from iOS

1. Long-press the Milonexa icon
2. Tap **"Remove App"**
3. Select **"Remove from Home Screen"**

---

## Offline Support

### How Offline Works

Milonexa uses service workers to cache content:

1. **App Shell**: UI structure cached on first visit
2. **Content Cache**: Recent data cached as you use the app
3. **Network-First**: Try network first, fall back to cache
4. **Graceful Degradation**: Limited but functional offline

### Service Worker Caching

```
User's Device:
┌─────────────────────────────────┐
│ Service Worker                  │
│ ├─ Static Assets (cached)       │
│ │  └─ HTML, CSS, JS             │
│ ├─ API Responses (cached)       │
│ │  └─ Recent data               │
│ └─ Images (cached)              │
│    └─ User avatars, thumbnails  │
└─────────────────────────────────┘
```

### What Works Offline

✓ **View cached content:**
- Your feed (if you viewed it while online)
- Your messages (recently cached)
- Your profile
- Previously visited documents
- Saved articles and bookmarks

✓ **Basic navigation:**
- Switch between sections
- Scroll through cached content
- View your profile
- Access settings

### What Requires Internet

✗ **Won't work offline:**
- Posting or sending messages
- Creating new documents
- Real-time notifications
- Video streaming
- Full-text search
- Loading new content
- Live collaboration
- Uploading files

### Using Offline Mode

1. **Normal usage online:**
   - Milonexa caches content automatically
   - You don't need to do anything

2. **Go offline:**
   - Turn off WiFi or lose connection
   - App continues to work with cached content

3. **Reconnect:**
   - Content syncs in background
   - Queued actions are sent

### Offline Indicator

When you're offline:

```
Top of page:
┌────────────────────────────────┐
│ ⚠️ You're offline - Limited    │
│ functionality available       │
│ [Dismiss]                      │
└────────────────────────────────┘
```

Some features show as unavailable:

```
[Post] button → Grayed out with tooltip:
"You're offline. This will be sent when
you're back online."
```

---

## Push Notifications

### Overview

Push notifications alert you to important events even when you're not actively using Milonexa.

### Notification Types

**Messages:**
- New direct messages
- New group chat messages
- Mentions from other users

**Social:**
- Friend requests
- Profile updates from followed users
- Comments on your content

**Orders & Commerce:**
- Order updates (shipped, delivered)
- Price drops on wishlisted items
- New messages from sellers

**System:**
- Important announcements
- Security alerts
- Account changes

### Subscribing to Notifications

#### Web Push API

Milonexa uses the Web Push API for notifications.

**Getting VAPID Key:**

```bash
GET /api/messaging/notifications/vapid-public-key

Response:
{
  "publicKey": "BCabcdef123..."
}
```

This key is needed to encrypt notification subscriptions.

**Subscription Process:**

1. Browser requests permission
2. User grants notification access
3. Browser generates subscription object
4. App sends subscription to server

```javascript
// Request permission
Notification.requestPermission()
  .then(permission => {
    if (permission === 'granted') {
      // Subscribe to push
      navigator.serviceWorker.ready
        .then(registration => {
          return registration.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: 
              urlBase64ToUint8Array(vapidKey)
          });
        })
        .then(subscription => {
          // Send to server
          fetch('/api/messaging/notifications/subscribe', {
            method: 'POST',
            body: JSON.stringify(subscription)
          });
        });
    }
  });
```

#### Subscribe via API

**Endpoint:**

```bash
POST /api/messaging/notifications/subscribe
Content-Type: application/json
Authorization: Bearer {token}

{
  "endpoint": "https://fcm.googleapis.com/fcm/...",
  "keys": {
    "p256dh": "base64-encoded-key",
    "auth": "base64-encoded-auth"
  }
}
```

**Response:**

```json
{
  "subscriptionId": "sub-123",
  "subscribed": true,
  "timestamp": "2024-01-15T15:00:00Z",
  "topics": ["messages", "social", "orders"]
}
```

### Enabling Notifications

**First Time:**

1. Visit Milonexa
2. Browser prompts: **"Allow notifications?"**
3. Click **"Allow"** to enable
4. Click **"Block"** to disable

**If previously blocked:**

1. Go to **Settings → Notifications**
2. Toggle **"Push Notifications"** on
3. Browser may re-request permission

### Managing Notification Settings

Navigate to **Settings → Notifications**:

```
Push Notifications
─────────────────────────────────────
Enable notifications: [Toggle ✓]

Notification Types:
  ✓ New Messages
  ✓ Friend Requests
  ✓ Mentions
  ✓ Comments
  ○ Order Updates
  ✓ Announcements
  ○ Suggestions

Do Not Disturb:
  From: [9:00 PM]  To: [8:00 AM]
  
Quiet Hours: [Mute notifications during sleep]
```

### Notification Format

Example notification:

```
┌──────────────────────────────┐
│ 🔔 Milonexa                  │
│                              │
│ John Doe: Hey, how are you?  │
│                              │
│ [Reply]     [Dismiss]        │
└──────────────────────────────┘
```

### Browser Notification Access

Each browser has its own notification settings:

**Chrome:**
1. Menu (⋮) → Settings
2. Privacy & Security → Site Settings
3. Notifications
4. Find Milonexa and adjust

**Firefox:**
1. Menu (≡) → Options
2. Privacy & Security
3. Permissions → Notifications
4. Find Milonexa and adjust

**Safari:**
1. Preferences → Websites
2. Notifications (left sidebar)
3. Find Milonexa and adjust

### Troubleshooting Notifications

**Notifications not showing?**

1. Check if notifications are enabled:
   - Browser settings
   - OS settings
   - Milonexa settings

2. Check connection:
   - Internet must be connected
   - Service worker must be active

3. Check permission:
   - Browser must have permission
   - Not blocked by browser or OS

4. Try restart:
   - Close and reopen Milonexa
   - Browser notifications may have queued

---

## Service Worker

### What is a Service Worker?

A service worker is a JavaScript program that runs in the background, separate from the main browser thread.

### Service Worker Responsibilities

1. **Caching**
   - Cache static assets (HTML, CSS, JS)
   - Cache API responses
   - Update cache as user browses

2. **Handling Network Requests**
   - Intercept fetch requests
   - Serve from cache if offline
   - Fallback to network when online

3. **Push Notifications**
   - Listen for push events
   - Display notifications
   - Handle notification clicks

4. **Background Sync**
   - Queue failed requests
   - Sync when connectivity returns
   - Report sync status

### Service Worker Lifecycle

```
Installation:
  1. Browser detects new service worker
  2. Downloads and parses the script
  3. "install" event fired
  4. Cache assets

Activation:
  1. Old service worker unregistered (if any)
  2. New service worker takes over
  3. "activate" event fired
  4. Clean up old caches

Active:
  1. Service worker running in background
  2. Listening for events
  3. Handling requests
  4. Updating cache
```

### Service Worker Update

```javascript
// Check for updates periodically
setInterval(() => {
  navigator.serviceWorker.getRegistration()
    .then(reg => reg.update());
}, 3600000); // Check hourly
```

When an update is available, user sees prompt:

```
┌──────────────────────────────┐
│ New version available!        │
│ An update is ready.          │
│                              │
│ [Ignore]  [Refresh]         │
└──────────────────────────────┘
```

---

## App Manifest

### What is the App Manifest?

The app manifest is a JSON file that describes your app:

**Location:** `/.well-known/manifest.json`

### Manifest Contents

```json
{
  "name": "Milonexa",
  "short_name": "Milonexa",
  "description": "Connect, create, and collaborate",
  "start_url": "/",
  "scope": "/",
  "display": "standalone",
  "theme_color": "#007AFF",
  "background_color": "#FFFFFF",
  "orientation": "portrait-primary",
  
  "icons": [
    {
      "src": "/icon-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-512x512.png",
      "sizes": "512x512",
      "type": "image/png",
      "purpose": "any"
    },
    {
      "src": "/icon-maskable-192x192.png",
      "sizes": "192x192",
      "type": "image/png",
      "purpose": "maskable"
    }
  ],
  
  "screenshots": [
    {
      "src": "/screenshot-540x720.png",
      "sizes": "540x720",
      "type": "image/png",
      "form_factor": "narrow"
    },
    {
      "src": "/screenshot-1280x720.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    }
  ],
  
  "categories": ["social", "productivity"],
  "prefer_related_applications": false
}
```

### Manifest Properties

| Property | Purpose |
|----------|---------|
| `name` | Full app name |
| `short_name` | Short name for home screen |
| `description` | App description |
| `start_url` | URL to open on launch |
| `scope` | URLs included in PWA scope |
| `display` | App display mode (standalone, fullscreen, etc.) |
| `theme_color` | Browser toolbar color |
| `background_color` | Splash screen background |
| `icons` | App icons for various sizes |
| `screenshots` | App screenshots for app store |

### Icon Specifications

**Standard Icons:**
- 192×192 px: Home screen icon
- 512×512 px: Splash screen, larger displays

**Maskable Icons:**
- For adaptive icons on Android
- 192×192 px, 512×512 px
- Should be centered in safe zone

**Icon Tips:**
- Square format (1:1 aspect ratio)
- No rounded corners (OS handles)
- High contrast for visibility
- PNG format recommended

---

## Background Sync

### What is Background Sync?

Background Sync allows your browser to sync data when you reconnect to the internet, even if Milonexa is closed.

### Example Scenario

1. You're offline and compose a message
2. Message is queued locally
3. You close Milonexa
4. You regain internet connection
5. Browser syncs the message in background
6. You get a notification when done

### API Usage

```javascript
// Queue data for sync
navigator.serviceWorker.ready
  .then(registration => {
    return registration.sync.register('send-message');
  });

// Handle sync event
self.addEventListener('sync', event => {
  if (event.tag === 'send-message') {
    event.waitUntil(
      // Send queued messages
      sendQueuedMessages()
    );
  }
});
```

### What Syncs Automatically

- **Messages**: Queued messages are sent
- **Document edits**: Pending edits sync
- **Uploads**: Queued file uploads
- **Posts**: Pending posts are published

### Sync Status

View pending sync operations:

**Settings → Offline & Sync**

```
Pending Sync Actions
─────────────────────────────────────
3 messages pending
  Waiting for connection...
  [Retry Now]

2 documents pending edit
  Last attempt: 5 min ago
  [Retry Now]
```

---

## Updating the PWA

### Automatic Updates

Service workers check for updates:

1. **Check frequency**: Every time you load Milonexa
2. **Silent update**: Updates download in background
3. **Notification**: User is notified when ready

### Update Prompt

When a new version is available:

```
┌────────────────────────────────┐
│ Milonexa Update Available      │
│                                │
│ A new version is ready.        │
│ Refresh to update.             │
│                                │
│ [Later]  [Update Now]         │
└────────────────────────────────┘
```

### Force Refresh

If update prompt doesn't appear:

1. Manually refresh the page
2. Hold Shift while refreshing (hard refresh)
3. Or use browser developer tools

**Keyboard shortcuts:**
- Chrome/Edge: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Firefox: Ctrl+Shift+R (Windows) or Cmd+Shift+R (Mac)
- Safari: Cmd+Shift+R (requires developer tools)

### What's Updated

Each update may include:

- Bug fixes
- New features
- Performance improvements
- Security patches
- UI/UX improvements

Updates are deployed gradually:

```
Day 1: 25% of users
Day 2: 50% of users
Day 3: 75% of users
Day 4: 100% of users
```

This allows for rollback if issues occur.

---

## Storage

### Storage Types

Milonexa uses different storage mechanisms:

#### IndexedDB (Large Data)

```javascript
// Large-scale data storage
const db = new IDBFactory().open('milonexa');
db.objectStore('messages').add({
  id: 'msg-123',
  content: 'Hello',
  timestamp: 1705353600000
});
```

**Used for:**
- Message history
- Document content
- Media metadata
- User cache

#### LocalStorage (Settings)

```javascript
// Settings and preferences
localStorage.setItem('theme', 'dark');
localStorage.setItem('language', 'en');
```

**Used for:**
- User preferences
- Authentication tokens
- Recent searches
- UI state

#### Service Worker Cache (Static Assets)

```javascript
// Cache static assets
caches.open('milonexa-v1').then(cache => {
  cache.addAll([
    '/',
    '/styles.css',
    '/app.js',
    '/offline.html'
  ]);
});
```

**Used for:**
- HTML, CSS, JavaScript
- Images
- Fonts
- Other static assets

### Storage Limits

Browsers limit PWA storage:

```
Typical Limits:
├─ Standard browsers: 50 MB
├─ Chrome: Can request more (via Permissions API)
├─ Firefox: 10 MB (can increase)
└─ Safari: 50 MB
```

**Check available storage:**

```javascript
if (navigator.storage && navigator.storage.estimate) {
  navigator.storage.estimate().then(estimate => {
    console.log('Used:', estimate.usage);      // Bytes used
    console.log('Available:', estimate.quota); // Total available
  });
}
```

### Storage Management

**See what's stored:**

1. Browser Developer Tools
2. Application tab (Chrome) or Storage tab (Firefox)
3. Shows IndexedDB, LocalStorage, Caches

**Clear storage:**

```
Chrome:
1. Settings → Privacy and security
2. Clear browsing data
3. Select: Cookies, Cache, Etc.
4. Clear data

Firefox:
1. Preferences → Privacy & Security
2. Cookies and Site Data
3. Find milonexa.app → Remove
```

### Data Persistence

When you clear cache/storage:

- ✓ **Preserved**: Account login state
- ✗ **Cleared**: Offline cache, local messages
- ✗ **Cleared**: Preferences and settings
- ✗ **Cleared**: Search history

---

## Troubleshooting

### Installation Issues

**Problem: Install button not appearing**

**Solutions:**
1. Check if using supported browser (Chrome, Edge, Firefox, Safari)
2. Ensure HTTPS connection (not HTTP)
3. Check browser version (must be recent)
4. Refresh page and try again

**Problem: Installation fails**

**Solutions:**
1. Try hard refresh (Ctrl+Shift+R)
2. Clear browser cache
3. Check browser storage isn't full
4. Try different browser
5. Check browser permissions

### Offline Issues

**Problem: Offline mode not working**

**Solutions:**
1. Turn off WiFi and use cellular data test
2. Check Settings → Notifications for service worker
3. Service worker may not be installed yet
4. Try hard refresh to install/update
5. Reinstall the app

**Problem: Content not cached**

**Solutions:**
1. You must view content while online first
2. Limited cache space (50 MB typical)
3. Very recent content may not be cached yet
4. Clear cache/storage and reload

### Push Notification Issues

**Problem: Notifications not working**

**Solutions:**
1. Check OS notification settings
2. Check browser notification settings
3. Milonexa must be allowed to send notifications
4. Check if device is in Do Not Disturb mode
5. Restart browser

**Problem: Notification permission blocked**

**Solutions:**
1. Open browser settings
2. Find notification permissions for milonexa.app
3. Change from "Block" to "Allow"
4. Reload Milonexa

### Performance Issues

**Problem: App slow to load offline**

**Solutions:**
1. Offline mode only shows cached content
2. Search/filtering slow because no internet
3. Clear cache and reload to refresh
4. Check available device storage

**Problem: High battery usage**

**Solutions:**
1. Disable background sync
2. Disable push notifications
3. Reduce offline content cache
4. Close PWA when not in use

### Update Issues

**Problem: Not getting update prompt**

**Solutions:**
1. Check Settings → About for version
2. Manual refresh: Ctrl+Shift+R (or Cmd+Shift+R)
3. Service worker may be stuck
4. Try reinstalling the PWA
5. Check browser auto-update settings

---

## Browser Support

### Installation Support

| Browser | Windows | macOS | Linux | Android | iOS |
|---------|---------|-------|-------|---------|-----|
| Chrome | ✓ | ✓ | ✓ | ✓ | ✗ |
| Firefox | ✓ | ✓ | ✓ | ✓ | ✗ |
| Edge | ✓ | ✓ | ✓ | ✓ | ✗ |
| Safari | ✓ | ✓ | ✗ | ✗ | ◐ |
| Opera | ✓ | ✓ | ✓ | ✓ | ✗ |

**Legend:**
- ✓ Fully supported
- ◐ Partially supported (iOS: web clip only)
- ✗ Not supported

### Feature Support

| Feature | Chrome | Firefox | Edge | Safari |
|---------|--------|---------|------|--------|
| Installation | ✓ | ✓ | ✓ | ◐ |
| Service Worker | ✓ | ✓ | ✓ | ✓ |
| Offline | ✓ | ✓ | ✓ | ◐ |
| Push Notifications | ✓ | ✓ | ✓ | ✗ |
| Background Sync | ✓ | ✓ | ✓ | ✗ |

---

## Best Practices

### Getting Started with Milonexa PWA

1. **Install once**: Install from your favorite browser
2. **Explore offline**: Try features when offline
3. **Enable notifications**: Allow push notifications
4. **Update regularly**: Accept PWA updates
5. **Check settings**: Customize Notifications & Offline settings

### Performance Tips

1. **Limit cache**: Milonexa auto-manages cache size
2. **Regular updates**: Keep PWA updated
3. **Clear cache periodically**: Prevents bloat
4. **Use WiFi for first visit**: Faster initial cache build
5. **Close app when done**: Save battery and resources

### Privacy & Security

1. **Use HTTPS always**: Connection is encrypted
2. **Log out before sharing**: Don't leave device unattended
3. **Review permissions**: Control notifications, location, etc.
4. **Clear storage if needed**: For shared devices
5. **Keep browser updated**: Security patches

---

## Advanced Topics

### Service Worker Caching Strategy

Milonexa uses "Network First" strategy:

```
User Request
    ↓
├─ Try Network
│  ├─ Success? → Return & Cache
│  └─ Fail ↓
└─ Return from Cache
```

This prioritizes fresh data while falling back to cache.

### Manifest File Location

```
https://milonexa.app/.well-known/manifest.json
```

Reference in HTML:
```html
<link rel="manifest" href="/.well-known/manifest.json">
```

### HTTPS Requirement

Service workers require HTTPS:

```
✓ Works: https://milonexa.app
✗ Won't work: http://localhost:8000 (except localhost)
```

---

## Need Help?

- **PWA Guide**: `/hubs/helpcenter#pwa`
- **Offline Issues**: `/hubs/helpcenter#offline-support`
- **Notifications Help**: `/hubs/helpcenter#push-notifications`
- **Support Ticket**: `/hubs/helpcenter#support`
- **Community**: `/hubs/forum#pwa`

Last updated: 2024-01-15
