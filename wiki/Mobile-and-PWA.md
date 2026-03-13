# Mobile App & PWA

> Milonexa is a Progressive Web App (PWA) — install it on your phone, tablet, or desktop for a near-native app experience without visiting an app store.

---

## Table of Contents

1. [What Is a PWA?](#1-what-is-a-pwa)
2. [Installing on Android](#2-installing-on-android)
3. [Installing on iOS (iPhone / iPad)](#3-installing-on-ios-iphone--ipad)
4. [Installing on Desktop](#4-installing-on-desktop)
5. [Push Notifications](#5-push-notifications)
6. [Offline Mode](#6-offline-mode)
7. [App Updates](#7-app-updates)
8. [Uninstalling the PWA](#8-uninstalling-the-pwa)
9. [PWA vs. Browser — Feature Comparison](#9-pwa-vs-browser--feature-comparison)

---

## 1. What Is a PWA?

A **Progressive Web App (PWA)** is a website that behaves like a native app:

- 📲 **Installable** — add to your home screen like any app
- 🔔 **Push notifications** — receive alerts even when the app is closed
- 📶 **Offline support** — browse cached content without an internet connection
- ⚡ **Fast** — loads quickly with service workers and caching
- 🔄 **Auto-updates** — always runs the latest version, no manual updates

There is no separate "Milonexa app" to download — the PWA **is** the app.

---

## 2. Installing on Android

### Chrome (Recommended)

1. Open **Chrome** on your Android device.
2. Navigate to **milonexa.com** (or your platform URL).
3. Log in to your account.
4. A banner usually appears at the bottom: **"Add Milonexa to Home Screen"** — tap it.

**If the banner doesn't appear:**
1. Tap the **⋮ (three dots)** menu in Chrome.
2. Tap **"Add to Home Screen"** or **"Install app"**.
3. Tap **Install** or **Add** to confirm.
4. The Milonexa icon appears on your home screen.

### Samsung Internet

1. Open **Samsung Internet**.
2. Navigate to milonexa.com.
3. Tap the **☰ Menu** → **Add page to** → **Home Screen**.
4. Confirm installation.

---

## 3. Installing on iOS (iPhone / iPad)

### Safari (Required — PWA install only works in Safari on iOS)

1. Open **Safari** on your iPhone or iPad.
2. Navigate to **milonexa.com**.
3. Log in.
4. Tap the **↑ Share** button (bottom centre on iPhone, top right on iPad).
5. Scroll down and tap **"Add to Home Screen"**.
6. Edit the app name if desired.
7. Tap **Add** (top right).
8. The Milonexa icon appears on your home screen.

> ⚠️ **Important:** PWA installation on iOS only works through Safari. If you're using Chrome or Firefox on iOS, switch to Safari for installation.

### Push Notifications on iOS

Push notifications for PWAs require **iOS 16.4 or later**:
1. Install the PWA using the steps above.
2. Open the installed Milonexa app (from your home screen — not Safari).
3. When prompted, allow notifications.
4. Configure which notifications you want in **Settings → Notifications**.

---

## 4. Installing on Desktop

### Chrome / Edge (Windows, macOS, Linux)

1. Open Chrome or Edge.
2. Navigate to milonexa.com.
3. Log in.
4. Look for an **Install icon** (⊞ or ⊕) in the address bar.
5. Click it → click **Install**.
6. The app opens in its own window, separate from your browser.
7. A shortcut is created on your desktop and/or taskbar.

**Via browser menu:**
- Chrome: ⋮ → **Install Milonexa...**
- Edge: ⋯ → **Apps → Install this site as an app**

### macOS Safari

1. Open Safari on macOS.
2. Go to milonexa.com.
3. **File → Add to Dock** (macOS Sonoma and later).
4. Click **Add**.
5. Milonexa appears in your Dock.

---

## 5. Push Notifications

Push notifications let Milonexa notify you even when you're not actively using the app.

### Enabling Push Notifications

**Via the platform:**
1. Click the 🔔 bell icon → **Enable push notifications**.
2. Your browser will ask for permission.
3. Click **Allow**.

**Via Settings:**
1. **Settings → Notifications → Push Notifications → Enable**.
2. Grant permission when prompted.

### What You Can Be Notified About

- New messages and DMs
- Reactions and comments on your posts
- Friend requests
- Mentions and tags
- Group activity
- Order updates (Marketplace)
- Security alerts (new login, password change)

Configure each category at **Settings → Notifications → Push**.

### Troubleshooting Push Notifications

| Issue | Solution |
|-------|---------|
| Not receiving notifications | Check browser notification permissions (browser settings) |
| Notifications not working on iOS | Must be using the installed PWA (not Safari browser) + iOS 16.4+ |
| Notifications delayed | Check your device's battery saver mode (may delay push delivery) |

---

## 6. Offline Mode

When you lose internet connection, the PWA continues to work in limited mode.

### What Works Offline

- 🟢 **Browse cached content** — posts and pages you've recently visited
- 🟢 **Read saved bookmarks** (if previously loaded)
- 🟢 **Compose messages** — queued and sent when back online
- 🟢 **Write post drafts** — saved locally until reconnected

### What Requires Connection

- 🔴 Loading new posts from your feed
- 🔴 Sending messages (they queue instead)
- 🔴 Uploading photos or videos
- 🔴 Streaming (Live TV and Radio)
- 🔴 Marketplace checkout

### Reconnection

When your device reconnects:
- Queued messages and posts are sent automatically
- The feed refreshes with new content
- A banner may appear: "You're back online — refresh for latest content"

---

## 7. App Updates

The PWA updates automatically. There's no manual "Check for updates" step.

When a major update is deployed:
1. The app detects the new version in the background.
2. A banner may appear: **"A new version is available — click to update"**.
3. Click the banner to reload and get the latest version.
4. Or it will update automatically the next time you open the app.

---

## 8. Uninstalling the PWA

### Android

1. Long-press the Milonexa icon on your home screen.
2. Drag to **Uninstall** (or tap **Uninstall** in the menu).
3. Confirm.

### iOS

1. Long-press the Milonexa icon.
2. Tap **Remove App**.
3. Tap **Delete App** to confirm.

### Desktop (Chrome / Edge)

1. Open the Milonexa PWA.
2. Click ⋮ (menu) → **Uninstall Milonexa**.
3. Confirm.

> Uninstalling the PWA does not delete your account or data — it only removes the installed app. Your account is fully accessible via any browser.

---

## 9. PWA vs. Browser — Feature Comparison

| Feature | Browser | PWA |
|---------|---------|-----|
| Access to all features | ✅ | ✅ |
| Runs in its own window | ❌ | ✅ |
| Home screen icon | ❌ | ✅ |
| Push notifications | ⚠️ Tab must be open | ✅ |
| Offline browsing | ❌ | ✅ |
| Camera & microphone | ✅ | ✅ |
| Auto-updates | ✅ | ✅ |
| Uses device storage for cache | Minimal | More (better performance) |
| No app store needed | ✅ | ✅ |

The PWA is recommended for the best Milonexa experience on mobile devices.

---

> ← [Accessibility](Accessibility) | [FAQ →](FAQ)
