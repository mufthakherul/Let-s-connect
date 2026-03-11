# Archive_codes — Deprecated Source Code

This directory contains source code that has been removed from the active codebase and preserved here for reference.

## Contents

### `backend_refactor_2026/`
Legacy service server files prior to the 2026 modularization refactor:
- `content-service-server-v1.js` — Content service v1 monolithic server
- `media-service-server-v1.js` — Media service v1 monolithic server
- `media-service-image-integration-v1.js` — Image integration module (v1)
- `user-service-server.js.bak` — User service backup before refactor

### `frontend/`
Legacy React components replaced by modern implementations:
- `DatabaseViews.js` — Database visualization UI (replaced by dedicated Docs/Collaboration views)
- `DiscordAdmin.js` — Discord admin panel (replaced by AdminDashboard)
- `ElasticsearchSearch.js` — Elasticsearch search UI (replaced by unified Search component)
- `FolderBrowser.js` — Folder browser (replaced by Google Drive-style integration)
- `LoadingSkeleton.js` — Legacy skeleton loader (replaced by MUI Skeleton components)
- `LoginModern.js` — Alternative login design (superseded by current Login.js)
- `Projects.js` — Project management view (replaced by collaboration features)
- `WebRTCCallWidget.js` — Floating call widget (integrated into Chat/Meeting components)
- `WikiDiffViewer.js` — Wiki diff viewer (replaced by CollaborationService integration)
- `accessibilityEnhanced.js` — Enhanced accessibility module (merged into accessibility.js)
- `apiEnhanced.js` — Enhanced API utility (merged into api.js)
- `helpcenter/` — Legacy help center guides (replaced by current docs structure)
- `meeting-modes/` — Meeting mode components (migrated to `frontend/src/components/meeting-modes/`)

### `admin_frontend/components/`
User-facing page components removed from the admin frontend to reduce bundle size. The admin frontend now only contains admin-specific components (`AdminDashboard.js`, `AdminLogin.js`, `Login.js`) and shared utilities (`common/`, `errors/`).

Archived user-side components include: AccessibilitySettings, Analytics, AppearanceSettings, Blog, Bookmarks, Cart, Chat, ContentHistoryViewer, CookiePolicy, Docs, EmailPreferences, Feed, Friends, Groups, Home, Homepage, MediaGallery, MeetingLobby, MeetingRoom, Meetings, OAuthLogin, Pages, PrivacyPolicy, ProductReview, Profile, PublicProfile, Radio, Register, ResetPassword, ResetRequest, Search, SecuritySettings, SettingsHub, Shop, TV, TermsOfService, ThemeSettings, UnregisterLanding, Videos, plus `hubs/`, `discord/`, and `meeting-modes/` subdirectories.

### `frontend/AdminDashboard.js`
Admin dashboard panel removed from user frontend. Admin functionality is now exclusively in the dedicated `admin_frontend` application.

### `admin-cli/`
Legacy standalone admin CLI directory (`admin-cli/`). Migrated to unified `admin/` directory structure (March 2026):
- `admin-cli/index.js` → `admin/cli/index.js`
- `admin-cli/admin-server.js` → `admin/rest-api/server.js`
- `admin-cli/ssh-admin-server.js` → `admin/ssh/server.js`
- `admin-cli/lib/*.js` → `admin/shared/*.js`
- `admin-cli/ssh-keys/` → `admin/ssh/ssh-keys/`

### `ROADMAP-v1.0-archived-2026-03-11.md`
Original platform modernization roadmap (v1.0, March 2026). Superseded by the new website features roadmap `ROADMAP.md` at the repository root (v2.0, March 2026).


