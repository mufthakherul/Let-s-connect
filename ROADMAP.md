# Milonexa — Website Features Roadmap (2026–2027)

<!-- markdownlint-disable MD022 MD024 MD032 MD047 -->

**Version:** 2.0
**Date:** March 11, 2026
**Scope:** End-user website features — landing page, authentication, home feed, social features, messaging, groups, pages, streaming (TV & Radio)

> **Note:** The original platform modernization roadmap (v1.0) has been archived to `Archives/Archive_codes/ROADMAP-v1.0-archived-2026-03-11.md`. This roadmap focuses on user-facing product feature improvements.

---

## Executive Summary

This roadmap covers the complete improvement and modernization of all user-facing pages and features of the Milonexa platform, including frontend UI/UX, backend API routes, real-time features, and performance optimizations.

---

## Pages in Scope

1. **Landing Page** (unregistered users)
2. **Login & Register Pages**
3. **Home Page** (registered users — main feed)
4. **Feeds** (activity, content, social)
5. **Friends** (discovery, requests, suggestions)
6. **Groups** (creation, management, content)
7. **Messaging** (1:1 chat, group chat, real-time)
8. **Pages** (public pages / creator pages)
9. **Streaming** (TV live streaming & Radio)

---

## Phase 1 — Q2 2026: Foundation & Core UX Polish ✅ COMPLETED

### 🖥️ Landing Page (Unregistered)

**Frontend:**
- [x] Redesign hero section with animated gradient background and value propositions
- [x] Add feature showcase cards with hover animations (recharts sparkline demos)
- [x] Social proof section: user count, testimonials, media logos
- [x] Responsive mobile-first layout (breakpoints: 320px / 768px / 1280px)
- [x] Dark mode support with system preference detection
- [x] Performance: lazy-load images, defer non-critical JS (LCP < 2.5 s target)
- [x] SEO: proper `<meta>` tags, Open Graph, Twitter Card, structured data (JSON-LD)
- [x] Accessibility: WCAG 2.1 AA — keyboard nav, skip links, color contrast ≥ 4.5:1
- [x] CTA buttons: "Get Started", "See Plans", "Watch Demo" with framer-motion animations

**Backend/Routes:**
- [x] `GET /` — serve optimized static landing with SSR-ready meta tags
- [x] `GET /api/public/stats` — public platform stats (user count, post count, uptime)
- [x] `GET /api/public/features` — feature list for dynamic landing page content
- [x] Rate limiting on public endpoints (50 req/min per IP)

---

### 🔐 Login & Register Pages

**Frontend:**
- [x] Unified Auth Hub: single-page with animated tab switching (Login ↔ Register)
- [x] OAuth providers: Google, GitHub, Discord, Apple — one-click social login buttons
- [x] Progressive disclosure registration: step 1 (email/pass) → step 2 (profile info) → step 3 (interests)
- [x] Real-time field validation with debounced API checks (username/email availability)
- [x] Password strength meter with entropy-based scoring
- [x] Remember me + persistent session token management
- [x] Forgot password: email OTP flow with countdown timer (60 s resend)
- [x] 2FA setup wizard: QR code + TOTP backup codes (framer-motion animated stepper)
- [x] Error messaging: clear, accessible inline error states (not just toast)
- [x] Redirect to originally requested URL after login (deep link support)

**Backend/Routes:**
- [x] `POST /api/auth/register` — validate, hash password (bcrypt cost 12), send verification email
- [x] `POST /api/auth/login` — return JWT + refresh token; handle 2FA challenge
- [x] `POST /api/auth/logout` — revoke refresh token
- [x] `POST /api/auth/refresh` — rotate refresh token
- [x] `POST /api/auth/forgot-password` — send OTP to email
- [x] `POST /api/auth/reset-password` — verify OTP + set new password
- [x] `POST /api/auth/verify-email` — verify email token
- [x] `GET /api/auth/oauth/:provider` — OAuth redirect
- [x] `POST /api/auth/2fa/setup` — generate TOTP secret
- [x] `POST /api/auth/2fa/verify` — verify TOTP code
- [x] Rate limiting: 5 failed login attempts → 15-minute lockout per IP + per account

---

### 🏠 Home Page (Registered — Main Feed)

**Frontend:**
- [x] Infinite scroll feed with virtualization (react-window) — 60fps smooth scroll
- [x] Post composer: rich text (bold/italic/links), image upload, emoji picker, @mentions
- [x] Feed algorithm toggle: "Top" (ranked) vs "Latest" (chronological)
- [x] Story/Highlight bar (horizontal scroll, 24-hour expiry indicator)
- [x] Right sidebar: trending topics, suggested friends, upcoming events
- [x] Left sidebar: quick-nav (feed, friends, groups, messages, pages, streaming)
- [x] Notification bell with badge counter and categorized dropdown
- [x] Keyboard shortcuts: `J/K` to navigate posts, `L` to like, `R` to reply
- [x] Dark/light/system theme from user preferences

**Backend/Routes:**
- [x] `GET /api/feed` — paginated feed (cursor-based); algorithm param: `top|latest|friends|groups`
- [x] `POST /api/feed/post` — create post (text, media, visibility: public/friends/private)
- [x] `DELETE /api/feed/post/:id` — delete own post
- [x] `POST /api/feed/post/:id/like` — toggle like
- [x] `POST /api/feed/post/:id/share` — share/repost
- [x] `GET /api/feed/stories` — fetch active stories
- [x] `POST /api/feed/story` — create story (auto-expires in 24 h)
- [x] `GET /api/feed/trending` — trending hashtags and topics
- [x] WebSocket: `ws://…/feed/live` — push new posts to connected clients (SSE fallback)

---

## Phase 2 — Q3 2026: Social Features ✅ COMPLETED

### 👥 Friends

**Frontend:**
- [x] Friend discovery: "People You May Know" based on mutual friends + interests
- [x] Friend request management: accept / decline / ignore with undo
- [x] Friend list: searchable, filterable by mutual friends, location, common groups
- [x] Follow mode: asymmetric follow (for influencer accounts) vs symmetric friend
- [ ] Birthday reminders widget
- [x] Friend activity: "X is listening to …", "Y just joined group Z"

**Backend/Routes:**
- [x] `GET /api/friends` — friend list (paginated)
- [x] `GET /api/friends/suggestions` — PYMK algorithm (mutual friends, interests, location)
- [x] `POST /api/friends/request` — send friend request: `{ targetUserId }`
- [x] `POST /api/friends/request/:id/accept` — accept friend request
- [x] `POST /api/friends/request/:id/decline` — decline friend request
- [x] `DELETE /api/friends/:userId` — unfriend
- [x] `POST /api/friends/:userId/follow` — follow (asymmetric)
- [x] `DELETE /api/friends/:userId/follow` — unfollow
- [x] `GET /api/friends/requests` — pending incoming/outgoing requests
- [x] `GET /api/friends/:userId/mutual` — mutual friends

---

### 👥 Groups

**Frontend:**
- [x] Group discovery: browse by category, trending, suggested by interests
- [x] Group creation wizard: name, description, category, privacy (public/closed/secret), cover photo
- [x] Group home: feed, members, events, files, about tabs
- [x] Member management: invite, approve/decline requests, moderator roles
- [ ] Group rules editor (rich text)
- [ ] Pinned posts + announcements
- [ ] Group events calendar integration
- [ ] Group files/media library

**Backend/Routes:**
- [x] `GET /api/groups` — list groups (filter: category, joined, suggested)
- [x] `POST /api/groups` — create group
- [x] `GET /api/groups/:id` — group details
- [x] `PUT /api/groups/:id` — update group settings (owner/admin only)
- [x] `POST /api/groups/:id/join` — join / request to join
- [x] `POST /api/groups/:id/leave` — leave group
- [x] `GET /api/groups/:id/members` — member list (paginated)
- [x] `POST /api/groups/:id/members/:userId/promote` — promote to moderator
- [x] `DELETE /api/groups/:id/members/:userId` — remove member
- [x] `GET /api/groups/:id/feed` — group feed (cursor-based)
- [x] `POST /api/groups/:id/post` — post in group

---

### 📱 Pages (Creator/Business Pages)

**Frontend:**
- [x] Page creation: category, name, description, cover/profile photos, CTA button
- [x] Page tabs: Posts, About, Events, Shop, Reviews, Insights
- [x] Page insights dashboard: reach, engagement rate, follower growth chart (recharts)
- [x] Follower/following management
- [ ] Page verification badge request flow
- [x] Scheduled posts with draft management
- [ ] Page stories (distinct from personal stories)

**Backend/Routes:**
- [x] `GET /api/pages` — list pages (filter: category, followed, suggested)
- [x] `POST /api/pages` — create page
- [x] `GET /api/pages/:id` — page details
- [x] `PUT /api/pages/:id` — update page
- [x] `POST /api/pages/:id/follow` — follow page
- [x] `POST /api/pages/:id/unfollow` — unfollow page
- [x] `GET /api/pages/:id/feed` — page posts (cursor-based)
- [x] `POST /api/pages/:id/post` — create page post
- [x] `GET /api/pages/:id/insights` — analytics (views, reach, engagement, follower growth)
- [x] `POST /api/pages/:id/schedule` — schedule a post: `{ content, scheduledAt }`

---

## Phase 3 — Q4 2026: Messaging & Streaming ✅ COMPLETED

### 💬 Messaging

**Frontend:**
- [x] Conversation list sidebar: search, unread badge, typing indicator, last message preview
- [x] Chat window: virtualized message list (react-window), infinite scroll (load older messages)
- [x] Message composer: rich text, emoji, GIF search, file/media attachment, voice messages
- [x] Message reactions: emoji reaction bar on hover
- [x] Message status: sent / delivered / read receipts
- [x] Group chats: up to 256 members, admin roles, announcement mode
- [x] Ephemeral messages: disappearing messages (1 hour / 24 hours / custom)
- [x] End-to-end encryption indicator badge
- [ ] Message search within conversation
- [x] Video/voice call button (WebRTC integration)

**Backend/Routes:**
- [x] `GET /api/messages/conversations` — conversation list (paginated, sorted by last message)
- [x] `POST /api/messages/conversations` — create conversation: `{ participants[] }`
- [x] `GET /api/messages/conversations/:id/messages` — messages (cursor-based)
- [x] `POST /api/messages/conversations/:id/messages` — send message (REST)
- [x] `DELETE /api/messages/:messageId` — delete message (within 15 min window)
- [x] `POST /api/messages/:messageId/react` — react to message: `{ emoji }`
- [x] `POST /api/messages/:messageId/read` — mark as read
- [x] `GET /api/messages/unread-count` — total unread count badge
- [x] WebSocket: `ws://…/messages/live` — real-time message delivery, typing indicators
- [x] `POST /api/messages/conversations/:id/call` — initiate WebRTC call session

---

### 📺 Streaming (TV & Radio)

**Frontend — TV:**
- [x] Live stream browser: channels grid with thumbnails, viewer count, category filter
- [x] Player: Shaka Player integration, adaptive bitrate, Picture-in-Picture, full-screen
- [x] Stream creation wizard: title, category, thumbnail, stream key display
- [x] Live chat overlay (scrollable, emoji, moderation tools)
- [ ] Stream schedule / upcoming streams calendar
- [x] VOD library: recorded streams with search and playback
- [x] Clip creation: highlight 30-second clips from live stream
- [ ] Subscription tiers for premium channels

**Frontend — Radio:**
- [x] Radio station browser: genre filter, language filter, country filter
- [x] Persistent mini-player (always-visible bottom bar, doesn't interrupt browsing)
- [x] Station favorites / recently played
- [x] Now Playing: album art, track info, lyrics (if available)
- [x] Sleep timer
- [x] Schedule: upcoming shows on a station with countdown

**Backend/Routes:**
- [x] `GET /api/streaming/tv/channels` — list live channels (filter: category, language, live-only)
- [x] `GET /api/streaming/tv/channels/:id` — channel details
- [x] `POST /api/streaming/tv/channels` — create channel / go live
- [x] `PUT /api/streaming/tv/channels/:id` — update stream metadata
- [x] `DELETE /api/streaming/tv/channels/:id` — end stream
- [x] `GET /api/streaming/tv/channels/:id/chat` — SSE stream of live chat messages
- [x] `POST /api/streaming/tv/channels/:id/chat` — send chat message
- [x] `GET /api/streaming/tv/vod` — VOD library (cursor-based)
- [x] `GET /api/streaming/radio/stations` — list radio stations
- [x] `GET /api/streaming/radio/stations/:id` — station details + stream URL
- [x] `POST /api/streaming/radio/favorites` — favorite a station
- [x] `DELETE /api/streaming/radio/favorites/:id` — unfavorite
- [x] `GET /api/streaming/radio/schedule/:stationId` — upcoming show schedule
- [x] `POST /api/streaming/tv/channels/:id/clips` — create highlight clip

---

## Phase 4 — Q1 2027: Notifications, Search & Personalization ✅ COMPLETED

### 🔔 Notifications

**Frontend:**
- [x] Notification center with categories: Social, Messages, Groups, Pages, Streaming, System
- [x] Actionable notifications (inline approve/dismiss friend requests, reactions)
- [ ] Push notifications via Web Push API (service worker)
- [x] Email digest: daily/weekly summary with unsubscribe management
- [x] Notification preferences per-category (in-app, email, push)

**Backend/Routes:**
- [x] `GET /api/notifications` — paginated notification list (filter: category, read/unread)
- [x] `POST /api/notifications/:id/read` — mark as read
- [x] `POST /api/notifications/read-all` — mark all read
- [x] `GET /api/notifications/preferences` — get preferences
- [x] `PUT /api/notifications/preferences` — update preferences
- [x] `POST /api/notifications/push/subscribe` — register push subscription
- [x] WebSocket: `ws://…/notifications/live` — real-time notification delivery

---

### 🔍 Search

**Frontend:**
- [x] Global search bar in navbar (keyboard shortcut: `/`)
- [x] Autocomplete suggestions: people, groups, pages, posts, hashtags
- [x] Search results page with tab filters: All / People / Groups / Pages / Posts / Media
- [x] Advanced filters: date range, location, language, media type
- [x] Search history with clear option

**Backend/Routes:**
- [x] `GET /api/search?q=…` — global search (paginated by type)
- [x] `GET /api/search/suggestions?q=…` — autocomplete (debounced, max 8 results)
- [x] `GET /api/search/people?q=…` — people search with filters
- [x] `GET /api/search/groups?q=…` — group search
- [x] `GET /api/search/pages?q=…` — page search
- [x] `GET /api/search/posts?q=…` — full-text post search

---

### ⚙️ Profile & Settings

**Frontend:**
- [x] Profile page: cover photo, avatar, bio, social links, activity stats, mutual friends
- [x] Edit profile wizard: personal info, contact, education, work, interests
- [x] Privacy settings: who can see posts, friend list, contact info (per-field granularity)
- [x] Account security: password change, active sessions, 2FA management
- [x] Appearance: theme (light/dark/system), font size, language (i18n)
- [x] Data & Privacy: download my data, delete account (GDPR)
- [x] Accessibility settings: high contrast, reduced motion, screen reader hints

**Backend/Routes:**
- [x] `GET /api/profile/:userId` — public profile
- [x] `GET /api/profile/me` — own profile (authenticated)
- [x] `PUT /api/profile/me` — update profile fields
- [x] `PUT /api/profile/me/avatar` — upload/update avatar
- [x] `PUT /api/profile/me/cover` — upload/update cover photo
- [x] `GET /api/settings` — get all settings
- [x] `PUT /api/settings/privacy` — update privacy settings
- [x] `PUT /api/settings/security` — update security settings
- [x] `PUT /api/settings/appearance` — update appearance preferences
- [x] `POST /api/settings/data/export` — trigger GDPR data export
- [x] `POST /api/settings/account/delete` — initiate account deletion (2-step confirmation)

---

## Cross-Cutting Improvements (All Phases)

### UI/UX Design System
- [ ] Implement design tokens (colors, typography, spacing, shadows, radii) consistently across all pages
- [ ] Component library audit: replace ad-hoc MUI overrides with design-token-driven variants
- [ ] Skeleton loading states for every data-loaded section
- [ ] Empty states with helpful CTAs (not just "No data")
- [ ] Error boundaries per page section with retry buttons
- [ ] Offline indicator + graceful degradation (service worker cache)
- [ ] Animation guidelines: 150ms micro-interactions, 300ms page transitions (framer-motion)
- [ ] Touch gesture support for mobile (swipe to delete, pull-to-refresh)

### Performance Targets
- [ ] **LCP** < 2.5 s (all pages)
- [ ] **FID / INP** < 100 ms
- [ ] **CLS** < 0.1
- [ ] Bundle size: main chunk < 200 KB gzipped; per-route lazy chunks < 50 KB
- [ ] API response time p95 < 200 ms for all core endpoints

### Backend Standards
- [ ] Input validation: Joi/Zod schemas on all request bodies
- [ ] Rate limiting on all user-facing endpoints (configurable per endpoint group)
- [ ] Consistent error response shape: `{ error: string, code: string, requestId: string }`
- [ ] API versioning: all new endpoints under `/api/v2/`
- [ ] Request/response logging with structured JSON (pino)
- [ ] OpenAPI 3.0 spec for all endpoints (auto-generated via JSDoc annotations)

### Testing
- [ ] Unit tests for all new shared utilities and hooks (Jest, ≥ 80% coverage)
- [ ] Integration tests for all REST API endpoints
- [ ] E2E tests for critical user flows: register → post → message → stream (Playwright)
- [ ] Visual regression tests for UI components (Storybook + Chromatic)
- [ ] Performance budgets enforced in CI (Lighthouse CI)

---

## Delivery Cadence

| Phase | Target | Focus |
|-------|--------|-------|
| Phase 1 — Q2 2026 | June 2026 | Landing page, Auth, Home Feed foundation |
| Phase 2 — Q3 2026 | September 2026 | Friends, Groups, Pages |
| Phase 3 — Q4 2026 | December 2026 | Messaging, Streaming TV & Radio |
| Phase 4 — Q1 2027 | March 2027 | Notifications, Search, Profile & Settings |

---

*Last updated: March 12, 2026*
