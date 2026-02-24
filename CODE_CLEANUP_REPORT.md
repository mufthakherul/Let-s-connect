# Code Cleanup Report
**Date:** February 22, 2026  
**Scope:** Full codebase audit — frontend, backend services, utilities  
**Action:** Identify duplicates, merge features into base scripts, archive superseded files, and list important unwired/placeholder features

---

## Summary of Changes Made

| Action | File | Reason |
|--------|------|--------|
| **Archived** | `frontend/src/components/LoginModern.js` → `archive_code/frontend/LoginModern.js` | Duplicate of the active `Login.js`; not imported anywhere |
| **Archived** | `frontend/src/components/common/LoadingSkeleton.js` → `archive_code/frontend/LoadingSkeleton.js` | Superseded by `EnhancedSkeleton.js`; unique exports merged first |
| **Archived** | `frontend/src/utils/accessibilityEnhanced.js` → `archive_code/frontend/accessibilityEnhanced.js` | Duplicate + extension of `accessibility.js`; unique hooks/helpers merged |
| **Archived** | `frontend/src/utils/apiEnhanced.js` → `archive_code/frontend/apiEnhanced.js` | Enhanced API layer that extends `api.js` but is not imported anywhere |
| **Merged** | `accessibilityEnhanced.js` → `accessibility.js` | Added `useKeyboardNavigation`, `useAnnouncer`, `ariaLabels`, `getAriaProps`, `useFocusManagement` |
| **Merged** | `LoadingSkeleton.js` → `EnhancedSkeleton.js` | Added `CardSkeleton`, `ListSkeleton`, `ProfileSkeleton`, `GridSkeleton`, `FeedSkeleton`, `AvatarSkeleton` |

---

## Part 1 — Archived Files

### 1.1 `LoginModern.js` (archived)
**Original path:** `frontend/src/components/LoginModern.js`  
**Archive path:** `archive_code/frontend/LoginModern.js`

**Why archived:** This is a modernized rewrite of `Login.js` that uses `useForm`/`useMutation` hooks, form validation, and `useLocalStorage`. It is a *better* implementation but was never wired into `App.js` or any other component. `Login.js` is the active component imported directly in `App.js`.

**Reinstatement guide:**  
1. Restore from `archive_code/frontend/LoginModern.js` to `frontend/src/components/LoginModern.js`  
2. In `App.js` replace `import Login from './components/Login'` with `import Login from './components/LoginModern'`  
3. Verify `useLocalStorage` import is available from `hooks/useForm.js`  
4. Test login, remember-email, OAuth redirect flows

---

### 1.2 `LoadingSkeleton.js` (archived — unique exports merged into EnhancedSkeleton)
**Original path:** `frontend/src/components/common/LoadingSkeleton.js`  
**Archive path:** `archive_code/frontend/LoadingSkeleton.js`

**Why archived:** `EnhancedSkeleton.js` is the newer, more comprehensive version. Both files defined `TableSkeleton` and `ContentSkeleton` with different implementations. Neither file was imported anywhere in the active codebase.

**What was merged into `EnhancedSkeleton.js` before archiving:**
- `CardSkeleton` — generic card with title + body text + image area
- `ListSkeleton` — simple avatar + two text lines
- `ProfileSkeleton` — full profile page (large avatar, stats, bio section)
- `GridSkeleton` — generic card grid (non-video-specific)
- `FeedSkeleton` — social post with rectangular image and action bar
- `AvatarSkeleton` — small avatar + name/subtitle row

---

### 1.3 `accessibilityEnhanced.js` (archived — unique exports merged into accessibility.js)
**Original path:** `frontend/src/utils/accessibilityEnhanced.js`  
**Archive path:** `archive_code/frontend/accessibilityEnhanced.js`

**Why archived:** Duplicate/extension of `accessibility.js`. Neither file was imported anywhere in the active codebase. The base file was kept; enhanced-only features were merged in.

**What was merged into `accessibility.js` before archiving:**
- `useKeyboardNavigation(items, options)` — arrow key list navigation hook with Home/End/Enter support
- `useAnnouncer()` — hook-based screen reader announcer (React lifecycle-safe)
- `ariaLabels` — constant object with standard ARIA label strings for buttons, forms, status, navigation
- `getAriaProps(type, options)` — generates ARIA attribute objects for button/link/input/dialog/menu/menuitem
- `useFocusManagement(dependency, elementId)` — auto-focuses an element when a dependency value changes

**Note:** The `useFocusTrap` in `accessibilityEnhanced.js` used a different API (returns a `containerRef`). The base `accessibility.js` version (accepts `elementRef` as parameter) was kept. Both approaches work; the base API is more flexible for cases where the ref is managed externally.

---

### 1.4 `apiEnhanced.js` (archived)
**Original path:** `frontend/src/utils/apiEnhanced.js`  
**Archive path:** `archive_code/frontend/apiEnhanced.js`

**Why archived:** This file provides valuable enhancements on top of `api.js` (request deduplication, automatic retry with exponential backoff, in-memory caching with TTL, batch API calls, optimistic updates). However, it was never imported in any component or hook. It is NOT a duplicate of `api.js` — it extends it.

**Reinstatement guide:**  
The features in `apiEnhanced.js` are valuable for production performance. To re-enable:  
1. Restore from archive  
2. Import `apiCall`, `apiCallWithRetry`, or `withCache` in components/hooks that need them  
3. Consider integrating `apiCallWithRetry` into the `useApi` hook in `hooks/useApi.js`  
4. Consider using `withCache` for read-heavy endpoints (feed, shop, videos)

---

## Part 2 — Features That Are Important / Usable But NOT Properly Wired

These features exist in the codebase, have real implementation, but are not connected to the active routing or UI. They represent completed (or near-complete) work that needs wiring to become active.

---

### 2.1 Frontend Components — Not Wired / Placeholder / Stub

#### 🟡 Stub: `RoundTableMode.js`, `WorkshopMode.js`, `TownHallMode.js`
**Location:** `frontend/src/components/meeting-modes/`  
**Status:** Stub — returns only a `<Typography>Mode Name</Typography>` line  
**Backend status:** ✅ FULLY IMPLEMENTED in `collaboration-service/server.js` with models `RoundTableTurn`, `RoundTableTopic`, `WorkshopIdea`, `TownHallQuestion`, `TownHallPoll` and corresponding API endpoints  
**What needs to be done:** Build the actual React UI for each mode, consuming the existing backend APIs. See `ROADMAP.md` Phase 9 for full requirements.

#### 🟡 Stub: `OtherModes.js` (CourtMode, ConferenceMode, QuizMode)
**Location:** `frontend/src/components/meeting-modes/OtherModes.js`  
**Status:** Three stub exports returning single-line Typography labels  
**Backend status:** ✅ Backend models and endpoints exist for Conference, Quiz, and Court modes in `collaboration-service/server.js`  
**What needs to be done:** Implement full React UIs for CourtMode, ConferenceMode, and QuizMode.

#### 🔴 Not Wired: `ContentHistoryViewer.js`
**Location:** `frontend/src/components/ContentHistoryViewer.js`  
**Status:** Component exists but has no route in `App.js` and is not imported anywhere  
**What needs to be done:** Add a route in `App.js` (e.g., `/content-history`) and link from the Docs or admin interface.

#### 🟡 Not Wired: `discord/PermissionManagement.js`
**Location:** `frontend/src/components/discord/PermissionManagement.js`  
**Status:** Full UI implemented for Discord-style permission management, but no route in `App.js`  
**What needs to be done:** Add route (e.g., `/discord/permissions`) and link from server/group admin settings. Also requires Discord server admin backend endpoints.

#### 🟡 Not Used: `common/EnhancedSkeleton.js` (+ newly merged types)
**Location:** `frontend/src/components/common/EnhancedSkeleton.js`  
**Status:** Fully implemented with 14 specialized skeleton types, but never imported in any component  
**What needs to be done:** Replace ad-hoc loading spinners/inline skeletons in `Feed.js`, `Homepage.js`, `Videos.js`, `Chat.js`, `Shop.js` etc. with the appropriate `EnhancedSkeleton` exports.

#### 🟡 Not Used: `common/VirtualizedList.js`
**Location:** `frontend/src/components/common/VirtualizedList.js`  
**Status:** Fully implemented virtualized list (renders only visible items), not imported anywhere  
**What needs to be done:** Replace `Array.map()` rendering in long lists in `Feed.js`, `Videos.js`, `Shop.js` with `VirtualizedList` for ~10x performance improvement on large datasets.

#### 🟡 Not Used: `common/SearchAutocomplete.js`
**Location:** `frontend/src/components/common/SearchAutocomplete.js`  
**Status:** Fully implemented autocomplete search with API integration, not used in the main search or navigation  
**What needs to be done:** Wire into `App.js` navigation bar or `Search.js` page to replace or augment the current search input.

#### 🟡 Not Used: `common/PullToRefresh.js`
**Location:** `frontend/src/components/common/PullToRefresh.js`  
**Status:** Implemented, not used anywhere  
**What needs to be done:** Wrap the Feed and Chat page with this component to add mobile pull-to-refresh UX.

#### 🟡 Not Used: `common/PWAInstallBanner.js`
**Location:** `frontend/src/components/common/PWAInstallBanner.js`  
**Status:** Implemented, not used anywhere  
**What needs to be done:** Import and render in `App.js` to show users the option to install the app to their home screen. Service worker exists at `frontend/public/service-worker.js`.

#### 🟡 Not Used: `common/OfflineIndicator.js`
**Location:** `frontend/src/components/common/OfflineIndicator.js`  
**Status:** Implemented, not used anywhere  
**What needs to be done:** Import and render in `App.js` (ideally alongside `NotificationCenter`) to notify users when offline.

#### 🟡 Not Used: `common/AnimationWrappers.js`
**Location:** `frontend/src/components/common/AnimationWrappers.js`  
**Status:** Reusable Framer Motion wrapper components, not imported anywhere  
**What needs to be done:** Use in page transitions and card/list animations where Framer Motion `motion.*` components are currently used ad-hoc.

#### 🟡 Not Used: `utils/accessibility.js` (now with merged enhanced features)
**Location:** `frontend/src/utils/accessibility.js`  
**Status:** Contains `SkipLink`, `useFocusTrap`, `LiveRegion`, `VisuallyHidden`, `useKeyboardShortcut`, `useKeyboardNavigation`, `useAnnouncer`, `ariaLabels`, `getAriaProps`, `useFocusManagement`, `announce` — none are imported in the active code  
**What needs to be done:**  
- Add `<SkipLink />` to `App.js` before the nav bar  
- Add `<LiveRegion>` around dynamic content announcements  
- Use `useFocusTrap` in modal dialogs (currently using manual focus logic)  
- Use `ariaLabels` for consistent button ARIA labels across components

---

### 2.2 Frontend Utilities — Not Wired

#### 🟡 Not Used: `utils/apiEnhanced.js` features (now archived — see Part 1.4)
**Summary of what's available in archive:**  
- **Request deduplication** — prevents multiple identical API calls firing simultaneously  
- **Retry with exponential backoff** — retries on 408/429/5xx status codes  
- **In-memory cache with TTL** — avoids redundant GET requests within TTL window  
- **Batch API calls** — multiple requests in parallel with `Promise.allSettled`  
- **Optimistic update wrappers** — revert on failure  
- **Prefetch support** — pre-load data for anticipated navigation  
**Recommendation:** Integrate `apiCallWithRetry` into `hooks/useApi.js` and use `withCache` for feed, shop, and video list endpoints.

---

### 2.3 Frontend — Partial Overlap (Not Duplicates — Intentional Design)

#### ℹ️ `ThemeSettings.js` vs `AppearanceSettings.js`
**Both are routed separately and intentionally different:**
- `/settings/theme` → `ThemeSettings.js` — basic dark/light mode toggle + 5 accent color presets; unauthenticated-accessible
- `/settings/appearance` → `AppearanceSettings.js` — full appearance customization (15 fonts, 15 themes, 12 animations, layout density, dark mode override, custom CSS preview); requires authentication

`AppearanceSettings.js` redirects unauthenticated visitors to `/settings/theme`. These are **not duplicates** — they serve different access levels. No action needed.

---

### 2.4 Backend Services — Partially Wired / Placeholder Logic

#### 🟡 `services/user-service/email-service.js` — Integrated but limited
**Status:** Required in `server.js` at startup. Provides transactional email (welcome, password reset, notifications). However, email delivery requires a real `EMAIL_SERVICE`, `EMAIL_USER`, and `EMAIL_PASS` environment variable set. Without these the service logs errors silently but continues.  
**What needs to be done:** Document required environment variables. Add startup validation warning if email env vars are not set.

#### 🟡 `checkColorContrast` in `utils/accessibility.js` — Placeholder
**Status:** Function returns `true` (placeholder comment in code — no real contrast calculation)  
**What needs to be done:** Implement actual WCAG contrast ratio calculation using relative luminance formula, or integrate a library like `polished`.

#### 🟡 `services/api-gateway/webhooks.js` / `webhook-routes.js` — Wired but delivery not triggered
**Status:** Webhook management (CRUD) is wired and endpoints exist. However, `deliverWebhook()` must be called from other services whenever relevant events occur (new post, new follower, etc.). Currently webhooks can be registered but events are never actually delivered.  
**What needs to be done:** Call `deliverWebhook(userId, event, payload)` from `content-service` and `user-service` at relevant event points.

#### 🟡 `services/streaming-service/channel-recommender.js` — Loaded but endpoint is admin-only
**Status:** `ChannelRecommender` is imported and used. The recommendation endpoint `/tv/channels/recommendations` is protected behind admin-only auth (see line 1505 of streaming server). Regular users cannot access recommendations.  
**What needs to be done:** Expose a user-facing recommendation endpoint or relax the auth check based on business requirements.

#### 🟡 Meeting Mode Frontend Stubs (all modes except Debate)
**See Section 2.1 above.** Backend is complete; frontend UI is missing for: RoundTable, Workshop, TownHall, VirtualCourt, Conference, Quiz.

---

### 2.5 Services — Standalone Seeding Scripts with Duplicated Model Definitions

#### ℹ️ `streaming-service/seed.js` and `streaming-service/seed-fast.js`
Both scripts duplicate the `RadioStation` and `TVChannel` model definitions that are also defined in `server.js`. This is **intentional** — seed scripts run standalone (outside the Express server) and therefore cannot import from `server.js`. No action needed, but be aware: if model schema changes in `server.js`, the same changes must be reflected in both seed scripts.  
**Recommendation:** Extract model definitions into a shared `models.js` file within the streaming service so all three scripts import from one source.

---

## Part 3 — What Was Confirmed as NOT a Duplicate (No Action Needed)

| Item | Reason |
|------|--------|
| `webhooks.js` + `webhook-routes.js` | Different roles: `webhooks.js` = model + delivery engine; `webhook-routes.js` = Express router that uses `webhooks.js` |
| `ThemeSettings.js` + `AppearanceSettings.js` | Intentionally separate: basic (public) vs advanced (authenticated) |
| `radio-browser-fetcher.js`, `radioss-fetcher.js`, `xiph-fetcher.js` | Different external API sources — not duplicates |
| `content-service/cache-integration.js`, `shop-service/cache-integration.js`, `user-service/cache-integration.js` | Service-specific middleware files, all build on `shared/caching.js` |
| `Home.js` (41 lines) vs `Homepage.js` (981 lines) | `Home.js` is an auth-routing wrapper that renders `Homepage.js` for logged-in users |
| `ProductReview.js` | Sub-component imported by `Shop.js`; does not need its own route |
| `UnregisterLanding.js` | Used by `Home.js` for unauthenticated landing page |
| `DebateMode.js` | Full implementation (not a stub) — wired in `MeetingRoom.js` |

---

## Quick Action Checklist for Future Development

- [ ] Wire `LoginModern.js` from archive to replace `Login.js`
- [ ] Add `<SkipLink />` and `<OfflineIndicator />` to `App.js`
- [ ] Add `<PWAInstallBanner />` to `App.js` 
- [ ] Implement `RoundTableMode`, `WorkshopMode`, `TownHallMode`, `CourtMode`, `ConferenceMode`, `QuizMode` frontend UIs
- [ ] Add route for `ContentHistoryViewer` (`/content-history`)
- [ ] Add route for `PermissionManagement` (`/discord/permissions`)
- [ ] Use `EnhancedSkeleton` exports in Feed, Videos, Shop, and Chat loading states
- [ ] Use `VirtualizedList` for long scrollable lists (feed, shop, videos)
- [ ] Wire `SearchAutocomplete` into the App navigation search
- [ ] Wire `PullToRefresh` around Feed and Chat on mobile
- [ ] Implement `checkColorContrast` in `accessibility.js` (replace placeholder)
- [ ] Call `deliverWebhook()` from `content-service` and `user-service` on relevant events
- [ ] Integrate `apiEnhanced` retry/cache patterns into `hooks/useApi.js`
- [ ] Extract streaming-service model definitions to shared `models.js`
- [ ] Expose user-facing TV recommendation endpoint in streaming-service
