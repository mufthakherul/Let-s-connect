# Privacy & Security

> Your privacy and security are a top priority on Milonexa. This page explains what controls you have, how your data is protected, and what you can do to keep your account safe.

---

## Table of Contents

1. [Privacy Controls](#1-privacy-controls)
2. [Who Can See Your Content](#2-who-can-see-your-content)
3. [Blocking and Restricting Users](#3-blocking-and-restricting-users)
4. [Two-Factor Authentication](#4-two-factor-authentication)
5. [Active Sessions & Devices](#5-active-sessions--devices)
6. [Password Security](#6-password-security)
7. [Data Storage & Encryption](#7-data-storage--encryption)
8. [Cookies & Tracking](#8-cookies--tracking)
9. [Your Data Rights](#9-your-data-rights)
10. [Downloading Your Data](#10-downloading-your-data)
11. [Reporting Suspicious Activity](#11-reporting-suspicious-activity)
12. [Third-Party Apps & Permissions](#12-third-party-apps--permissions)

---

## 1. Privacy Controls

All privacy settings are found at **Settings → Privacy**.

| Control | Options |
|---------|---------|
| **Profile visibility** | Public · Friends only · Private |
| **Who can send you friend requests** | Everyone · Friends of friends · Nobody |
| **Who can follow you** | Everyone · Approved followers only |
| **Who can message you** | Everyone · Friends only · Nobody |
| **Who can see your friends list** | Everyone · Friends · Only me |
| **Who can see your email** | Only me (always) |
| **Who can tag you in posts** | Everyone · Friends · Nobody |
| **Who can see your activity status** | Everyone · Friends · Nobody |
| **Search engine indexing** | Allow / Prevent (opt-out of Google/Bing indexing) |

---

## 2. Who Can See Your Content

Every post you create has its own visibility setting:

| Visibility Level | Who Can See It |
|-----------------|---------------|
| 🌍 **Public** | Anyone on or off Milonexa (including search engines) |
| 👥 **Friends Only** | Only your mutual friends |
| 🔒 **Private** | Only you |

You can set a **default visibility** for all new posts in **Settings → Privacy → Default Post Visibility**.

### Profile Information Visibility

Your profile has granular controls:

| Profile Field | Default Visibility | Can Change? |
|--------------|-------------------|-------------|
| Display name | Public | No (always visible) |
| Username | Public | No (always visible) |
| Profile picture | Public | Yes |
| Cover photo | Public | Yes |
| Bio | Public | Yes |
| Location | Friends only | Yes |
| Website | Public | Yes |
| Birthday (year) | Private | Yes |
| Birthday (day/month) | Friends only | Yes |
| Email address | Private | No (never public) |
| Join date | Public | Yes |

---

## 3. Blocking and Restricting Users

### Block a User

Blocking prevents someone from viewing your profile, sending you messages, or interacting with your content.

1. Visit the user's profile.
2. Click the **⋮ (More options)** menu.
3. Select **Block @username**.
4. Confirm the block.

**Effect of blocking:**
- They can no longer see your profile or posts
- They cannot send you messages or friend/follow requests
- Any existing messages are hidden from both sides
- They are not notified that they have been blocked

To manage your block list: **Settings → Privacy → Blocked Users**.

### Restrict a User

Restricting is a softer option — the user can still see your profile, but their interactions are limited:

- Their comments on your posts are only visible to them (not to others) until you approve
- They do not see when you are online
- Read receipts are hidden

To restrict: profile → ⋮ menu → **Restrict @username**.

### Mute a User

Muting hides a user's posts from your feed without unfollowing or notifying them.

To mute: profile → ⋮ menu → **Mute @username**.

---

## 4. Two-Factor Authentication

**Strongly recommended for all accounts.**

2FA means even if someone gets your password, they cannot log in without your second factor.

### Setup
1. Go to **Settings → Security → Two-Factor Authentication**.
2. Click **Enable 2FA**.
3. Scan the QR code with an authenticator app (e.g., Google Authenticator, Authy, 1Password).
4. Enter the 6-digit code from your app to confirm.
5. **Save your backup codes** — store them somewhere safe.

### Authenticator Apps (Recommended)

| App | Platform | Free? |
|-----|----------|-------|
| Google Authenticator | iOS, Android | ✅ |
| Authy | iOS, Android, Desktop | ✅ |
| 1Password | All platforms | Paid |
| Microsoft Authenticator | iOS, Android | ✅ |
| Bitwarden Authenticator | iOS, Android | ✅ |

> See [Account & Profile → 2FA](Account-and-Profile#6-two-factor-authentication-2fa) for full setup instructions.

---

## 5. Active Sessions & Devices

You can see and manage every device currently logged into your account.

1. Go to **Settings → Security → Active Sessions**.
2. You'll see a list of sessions with:
   - Device type and browser
   - Location (approximate, based on IP)
   - Last active time
3. Click **Log out** next to any session to sign out that device.
4. Click **Log out all other sessions** to sign out everywhere except your current device.

> 💡 If you see a session you don't recognise, log it out immediately and **change your password**.

---

## 6. Password Security

### Password Requirements

- Minimum 8 characters
- At least one uppercase letter (A–Z)
- At least one lowercase letter (a–z)
- At least one number (0–9)
- At least one special character (e.g., `!@#$%^&*`)

### Changing Your Password

1. Go to **Settings → Security → Password**.
2. Enter your current password.
3. Enter and confirm your new password.
4. Click **Update Password**.

### Password Best Practices

- ✅ Use a unique password for Milonexa (don't reuse passwords)
- ✅ Use a **password manager** to generate and store a strong password
- ✅ Enable **2FA** as an additional layer
- ❌ Never share your password with anyone — Milonexa support will never ask for it
- ❌ Avoid using personal info (name, birthday) in your password

---

## 7. Data Storage & Encryption

### How Your Data is Stored

| Data Type | Storage Method |
|-----------|---------------|
| Passwords | Bcrypt-hashed — never stored in plain text |
| Profile data | Encrypted PostgreSQL database |
| Messages (DMs) | End-to-end encrypted |
| Media files | Encrypted object storage (MinIO S3-compatible) |
| Session tokens | Short-lived JWTs + secure HTTP-only cookies |

### Transmission Security

- All connections use **HTTPS/TLS 1.3**
- HTTP connections are redirected to HTTPS automatically
- HSTS (HTTP Strict Transport Security) is enforced

### Data Centres

- Data is stored in secure, audited data centres.
- Your data is not sold to third parties.
- Refer to our Privacy Policy for full details.

---

## 8. Cookies & Tracking

### Cookies We Use

| Cookie Type | Purpose | Can Opt Out? |
|-------------|---------|-------------|
| **Essential** | Login sessions, security tokens | ❌ Required |
| **Functional** | Your preferences (dark mode, language) | ❌ Required for functionality |
| **Analytics** | Anonymous usage statistics | ✅ Via cookie preferences |
| **Marketing** | Personalised ads (if enabled) | ✅ Via cookie preferences |

Manage cookie preferences: **Settings → Privacy → Cookie Preferences**.

### What We Don't Do

- ❌ We do not sell your personal data to advertisers
- ❌ We do not share data with third parties without consent (except legal obligations)
- ❌ We do not track you across other websites

---

## 9. Your Data Rights

Depending on where you live, you have rights under laws like **GDPR** (EU/UK), **CCPA** (California), and others.

| Right | What It Means |
|-------|--------------|
| **Access** | Request a copy of all personal data we hold about you |
| **Rectification** | Correct inaccurate or incomplete data |
| **Erasure** | Request deletion of your data ("right to be forgotten") |
| **Portability** | Export your data in a machine-readable format |
| **Restriction** | Request that we limit how we process your data |
| **Object** | Object to specific types of processing (e.g., profiling) |
| **Withdraw consent** | Withdraw marketing consent at any time |

To exercise your rights: **Settings → Data & Privacy → Submit a Data Request** or contact support.

---

## 10. Downloading Your Data

You can export a copy of all your Milonexa data at any time.

1. Go to **Settings → Data & Privacy → Download Your Data**.
2. Select the data types you want (all selected by default):
   - Profile information
   - Posts and comments
   - Messages
   - Media files
   - Groups activity
   - Bookmarks
3. Click **Request Download**.
4. You'll receive an email with a download link (usually within 24–48 hours for large accounts).
5. The download link expires after **7 days**.

Your data is provided as a **ZIP archive** containing JSON files and your media.

---

## 11. Reporting Suspicious Activity

### Signs Your Account May Be Compromised

- Login notification from an unrecognised location
- Posts or messages you didn't create
- Changed profile information
- Password that no longer works
- Email about a password reset you didn't request

### What to Do Immediately

1. **Change your password** — Settings → Security → Password.
2. **Enable 2FA** if not already enabled.
3. **Review and revoke all active sessions** — Settings → Security → Active Sessions → Log out all.
4. **Check your email** for any Milonexa notifications you didn't initiate.
5. **Contact support** — [Help & Support](Help-and-Support).

---

## 12. Third-Party Apps & Permissions

Some third-party apps and services can connect to your Milonexa account.

### Viewing Connected Apps

1. Go to **Settings → Security → Connected Apps**.
2. You'll see all apps with access to your account.

### What Permissions Look Like

| Permission | What It Allows |
|-----------|---------------|
| `read:profile` | Read your public profile |
| `read:posts` | Read your posts (including private ones) |
| `write:posts` | Create posts on your behalf |
| `read:messages` | Read your direct messages |
| `write:messages` | Send messages on your behalf |
| `read:friends` | See your friends list |

### Revoking App Access

1. In the Connected Apps list, find the app.
2. Click **Revoke Access**.
3. The app can no longer access your account.

> 💡 Only connect apps you trust. Legitimate apps will never ask for your password — they use OAuth.

---

> ← [Account & Profile](Account-and-Profile) | [Community Guidelines →](Community-Guidelines)
