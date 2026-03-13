# Platform Overview

> **Milonexa** is an all-in-one social platform where you can connect with friends, create and share content, collaborate on projects, watch live streams, and shop — all in one place.

---

## Table of Contents

1. [What is Milonexa?](#what-is-milonexa)
2. [Core Features at a Glance](#core-features-at-a-glance)
3. [Who is Milonexa For?](#who-is-milonexa-for)
4. [Platform Highlights](#platform-highlights)
5. [Feature Summary](#feature-summary)
6. [Supported Devices](#supported-devices)
7. [Account Types](#account-types)
8. [Free vs. Premium](#free-vs-premium)

---

## What is Milonexa?

Milonexa (also known as **Let's Connect**) is a modern, open social platform that brings together the best features of social networking, real-time communication, creative content, and collaborative productivity tools.

Rather than switching between multiple apps for messaging, social feeds, video watching, collaborative documents, and shopping — Milonexa combines everything into a single, cohesive experience.

**Core philosophy:**
- 🔒 **Privacy first** — you control who sees your content
- 🤝 **Community driven** — built around genuine connections
- 🛠️ **Creator friendly** — rich tools for every kind of creator
- 🌐 **Open platform** — REST + GraphQL APIs for builders

---

## Core Features at a Glance

| Category | What You Can Do |
|----------|----------------|
| 👤 **Profiles** | Customise your public profile, bio, cover photo, skills |
| 📰 **Social Feed** | See posts from friends and followed accounts in real time |
| 📝 **Posts** | Share text, images, videos, links, polls, and files |
| 💬 **Messaging** | Send direct messages; create group chats and Discord-style servers |
| 🎥 **Videos** | Upload, watch, and playlist videos |
| 📡 **Streaming** | Access 60,000+ live TV channels and internet radio stations |
| 🤝 **Groups** | Create or join interest-based communities |
| 📄 **Collaboration** | Co-edit documents, maintain wikis, manage tasks and projects |
| 🛍️ **Marketplace** | Buy and sell products; integrated cart and checkout |
| 🔍 **Search** | Full-text search across users, posts, groups, media, and more |
| 🔔 **Notifications** | Customisable real-time alerts for all platform activity |
| 📌 **Bookmarks** | Save any content for later |
| 📅 **Meetings** | Video meetings with screen sharing, rooms, and guest access |
| 🤖 **AI Features** | Smart feed ranking, content recommendations, toxicity detection |
| 🔒 **Security** | 2FA/TOTP, OAuth social login, end-to-end encryption for DMs |

---

## Who is Milonexa For?

### 👥 Social Users
Connect with friends and family, share life moments, join communities around your interests, and follow creators you love.

### 🎨 Content Creators
Publish posts, upload videos, manage a Page for your audience, monetise through the marketplace, and access analytics for your content.

### 🏢 Teams & Organisations
Collaborate on documents, run project boards, hold video meetings, and communicate in structured server channels — all without leaving the platform.

### 🛒 Sellers & Buyers
List products in the Marketplace, manage inventory, and handle orders. Buyers get a secure cart and checkout experience.

### 📺 Entertainment Seekers
Watch live TV from thousands of channels worldwide, listen to internet radio, and explore community-uploaded videos.

### 👨‍💻 Developers
Access the full REST v2 + GraphQL API to build apps, bots, and integrations. See [Developer Setup](Developer-Setup) and [API Lifecycle](API-Lifecycle).

---

## Platform Highlights

### 🏠 One Platform, Everything You Need

```
┌─────────────────────────────────────────────┐
│            Your Milonexa Experience          │
├─────────────┬─────────────┬─────────────────┤
│   Social    │    Media    │  Collaboration  │
│  Feed       │  Videos     │  Documents      │
│  Friends    │  Streaming  │  Wikis          │
│  Groups     │  Gallery    │  Tasks          │
│  Pages      │  Radio      │  Meetings       │
├─────────────┴─────────────┴─────────────────┤
│         Marketplace  ·  Messaging           │
│         Search       ·  Notifications       │
└─────────────────────────────────────────────┘
```

### 🔒 Privacy by Design

- Fine-grained privacy controls on every post (Public / Friends / Private)
- Profile visibility settings — choose exactly what others see
- Two-factor authentication (2FA) via authenticator app
- Social login via Google, GitHub, Discord, and Apple — no password required
- Messages are encrypted in transit; DMs use end-to-end encryption

### 🌍 Real-Time Everything

- Live notifications as activity happens
- Real-time chat with typing indicators and read receipts
- Live collaborative document editing (no page refresh needed)
- Instant feed updates via WebSocket connections

### 🤖 AI-Powered Experience

- Smart feed that learns your preferences
- Content recommendations based on your interests
- Automatic toxicity detection to keep conversations healthy
- AI-assisted content tagging and categorisation

---

## Feature Summary

### Social Features
- Personalised feed with AI ranking
- Posts (text, images, video, files, polls)
- Reactions (like, love, laugh, sad, wow, angry)
- Comments with threaded discussions
- Reposts and shares
- Friends system + follow/unfollow
- Skills and endorsements on profiles
- Hashtags and mentions

### Communication
- Direct messages (1-to-1)
- Group conversations
- Discord-style servers with text and voice channels
- Message reactions, threads, pinning, and editing
- Scheduled messages
- Read receipts and typing indicators

### Content & Media
- Video uploads with auto-transcoding
- Photo galleries and albums
- Community-driven playlists
- 60,000+ IPTV/live TV channels (free)
- 1,000+ internet radio stations
- Podcast-style audio content

### Collaboration
- Google Docs-style collaborative document editor
- Wiki pages with version history
- Task management (assignees, due dates, labels)
- Kanban boards
- Shared calendars and meeting scheduling

### Commerce
- Marketplace for physical and digital products
- Shopping cart and saved lists
- Secure checkout (Stripe integration)
- Order tracking and seller dashboards
- Product reviews and ratings

---

## Supported Devices

| Device | Support |
|--------|---------|
| 🖥️ **Desktop browsers** | Chrome, Firefox, Safari, Edge (latest 2 versions) |
| 📱 **Mobile browsers** | iOS Safari, Android Chrome |
| 📲 **Progressive Web App (PWA)** | Install to home screen on iOS and Android |
| 💻 **Tablets** | Full responsive layout |

> **Mobile native apps** are on the roadmap. The PWA provides a near-native experience in the meantime. See [Mobile & PWA](Mobile-and-PWA).

---

## Account Types

| Type | Description |
|------|-------------|
| **Personal Account** | Standard user account — for individuals |
| **Creator Account** | Enhanced tools for content creators — Pages, analytics, monetisation |
| **Business Account** | Team features, Marketplace access, branded presence |
| **Developer Account** | Full API access, higher rate limits, webhook support |

All account types start with the same free registration. Features are unlocked as you use the platform.

---

## Free vs. Premium

> Details on premium tiers are published in platform announcements. Core social features are free.

| Feature | Free | Premium |
|---------|------|---------|
| Create account & profile | ✅ | ✅ |
| Social feed and posts | ✅ | ✅ |
| Direct messages | ✅ | ✅ |
| Groups and communities | ✅ | ✅ |
| Video uploads | ✅ (100 MB/video) | ✅ (1 GB/video) |
| Streaming (TV & Radio) | ✅ | ✅ |
| Collaboration documents | ✅ | ✅ |
| Marketplace | ✅ | ✅ |
| Storage quota | 5 GB | 50 GB |
| Analytics & Insights | Basic | Advanced |
| Priority support | ❌ | ✅ |
| Verified badge eligibility | ❌ | ✅ |

---

> ← [Home](Home) | [Getting Started →](Getting-Started)
