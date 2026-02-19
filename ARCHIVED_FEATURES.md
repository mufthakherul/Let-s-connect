# Archived Features Documentation

**IMPORTANT UPDATE (February 19, 2026)**: Several features have been restored based on user requirements. See [FEATURE_RESTORATION.md](./FEATURE_RESTORATION.md) for details.

## Features Restored from Archive:
1. ✅ **Radio & TV Streaming** - Unique feature essential for independent media access, especially in Bangladesh
2. ✅ **Pages** - Core social media feature like Facebook Pages
3. ✅ **Debate Mode** - Platform for debating clubs, popular in Bangladesh

---

This document catalogs features that remain archived from Let's Connect platform. These features were determined to be either duplicate, overengineered, or not core to a social media platform.

## Archive Date
February 19, 2026

## Features That Remain Archived

### 1. Discord Admin Panel
**Location**: `archive_code/frontend/DiscordAdmin.js`  
**Routes Removed**: `/discord/admin`  
**Backend**: N/A (frontend only)

**Reason**: This feature replicated Discord's admin interface within our platform. It created maintenance burden for an external service and confused platform identity. Users should manage Discord servers directly in Discord.

**Features Removed**:
- Server management interface
- Role management UI
- Channel management
- Webhook integration
- Discord bot configuration

**Reinstatement Guide**: If needed in future:
1. Restore frontend component from archive
2. Add route back to App.js: `<Route path="/discord/admin" element={<DiscordAdmin />} />`
3. Ensure Discord API credentials are configured
4. Update navigation menu to include Discord Admin link

---

### 2. Database Views Builder
**Location**: `archive_code/frontend/DatabaseViews.js`  
**Routes Removed**: `/databases/views`  
**Backend**: `archive_code/backend/database-views-routes.js` (if exists)

**Reason**: This was a Notion/Airtable-style database builder - far too complex for core social media functionality. No evidence of integration with user content.

**Features Removed**:
- Custom database view creation
- Property/field management
- Advanced filtering and sorting
- Database templates

**Reinstatement Guide**: If needed in future:
1. Restore frontend component from archive
2. Add route back to App.js
3. Restore backend API routes if they existed
4. Create database migrations for views table

---

### 3. Elasticsearch Advanced Search
**Location**: `archive_code/frontend/ElasticsearchSearch.js`  
**Routes Removed**: `/search/advanced`  
**Backend**: Elasticsearch service integration code

**Reason**: Duplicate search functionality. The basic search (`/search`) provides sufficient functionality for a social platform without the complexity of Elasticsearch.

**Features Removed**:
- Elasticsearch integration
- Advanced query DSL interface
- Complex filtering UI
- Search analytics

**Reinstatement Guide**: If needed in future:
1. Set up Elasticsearch cluster
2. Restore search component from archive
3. Create search indexing pipeline
4. Add route back to App.js

---

### 4. ~~Pages Feature~~ **✅ RESTORED**
**Location**: ~~`archive_code/frontend/Pages.js`~~ → Restored to `frontend/src/components/`  
**Routes**: `/pages` - **NOW ACTIVE**  
**Backend**: Pages service endpoints - **ACTIVE**

**Original Archive Reason**: Considered content duplication with Blog, Docs, and Projects.

**Restoration Reason**: **Pages is a core social media feature** (like Facebook Pages). Every major social platform has pages for organizations, communities, and public figures. This is not a duplicate but an essential feature.

**Status**: ✅ **FULLY RESTORED** - Being enhanced to merge concepts from Docs, Projects, and Blog into a unified content platform. See [FEATURE_RESTORATION.md](./FEATURE_RESTORATION.md) for details.

**Enhanced Features**:
- Support for multiple content types (docs, projects, blogs, theses)
- Professional page templates
- Page analytics and insights
- Advanced customization options

---

### 5. Projects Feature
**Location**: `archive_code/frontend/Projects.js`  
**Routes Removed**: `/projects`  
**Backend**: Projects service endpoints

**Reason**: Overlaps with Docs and Blog. Projects feature competed with other content creation tools rather than complementing them.

**Features Removed**:
- Project management interface
- Task tracking
- Project collaboration
- Project milestones

**Reinstatement Guide**: If needed in future:
1. Restore Projects component from archive
2. Restore collaboration-service project endpoints
3. Update database schema
4. Add to navigation

---

### 5. ~~Radio & TV Streaming Services~~ **✅ RESTORED**
**Location**: 
- ~~`archive_code/frontend/Radio.js`~~ → Restored to `frontend/src/components/`
- ~~`archive_code/frontend/TV.js`~~ → Restored to `frontend/src/components/`
- ~~`archive_code/backend/streaming-service/`~~ → Restored to `services/`

**Routes**: `/radio`, `/tv` - **NOW ACTIVE**  
**Backend**: streaming-service microservice - **NOW ACTIVE**

**Original Archive Reason**: Considered media aggregator, not core social media functionality.

**Restoration Reason**: This is a **unique feature essential for independent media access**, especially relevant in Bangladesh after the July movement when the government cut off local TV cables. It provides users with access to television and radio content they otherwise wouldn't have.

**Status**: ✅ **FULLY RESTORED** - See [FEATURE_RESTORATION.md](./FEATURE_RESTORATION.md) for enhancement roadmap.

---

### 7. Folder Browser
**Location**: `archive_code/frontend/FolderBrowser.js`  
**Routes Removed**: `/folders`  
**Backend**: Folder hierarchy endpoints

**Reason**: Overlaps with document hierarchy in Docs feature. Users can organize content within the standard document structure.

**Features Removed**:
- Hierarchical folder navigation
- Folder permissions
- Drag-and-drop file organization
- Folder sharing

**Reinstatement Guide**: If needed in future:
1. Restore FolderBrowser component
2. Restore folder API endpoints
3. Update document service to support folders
4. Add navigation link

---

### 8. Wiki Diff Viewer
**Location**: `archive_code/frontend/WikiDiffViewer.js`  
**Routes Removed**: `/wikis/diff`  
**Backend**: Wiki versioning endpoints

**Reason**: Over-specialized version control feature. Basic revision history in Docs is sufficient.

**Features Removed**:
- Side-by-side diff view
- Inline diff highlighting
- Version comparison
- Rollback functionality

**Reinstatement Guide**: If needed in future:
1. Restore WikiDiffViewer component
2. Restore wiki versioning backend
3. Update document service for version tracking
4. Add diff algorithm library

---

### 9. WebRTC Calls Widget
**Location**: `archive_code/frontend/WebRTCCallWidget.js`  
**Routes Removed**: `/calls`  
**Backend**: WebRTC signaling integration

**Reason**: Duplicate functionality with Meetings feature which already provides video/audio capabilities.

**Features Removed**:
- Standalone voice/video calling
- WebRTC peer connection management
- Call history
- Contact-based calling

**Reinstatement Guide**: If needed in future:
1. Restore WebRTCCallWidget component
2. Ensure WebRTC signaling server is running
3. Add route back to App.js
4. Configure STUN/TURN servers

---

### 9. ~~Specialized Meeting Modes~~ **PARTIALLY RESTORED**
**Location**: `archive_code/frontend/meeting-modes/` (specific modes)  
**Components Status**:
- ~~DebateMode.js~~ → **✅ RESTORED** to `frontend/src/components/meeting-modes/`
- RoundTableMode.js → Still archived
- TownHallMode.js → Still archived
- WorkshopMode.js → Still archived
- OtherModes.js (Court, Quiz) → Still archived

**Routes Impact**: Debate mode active in MeetingRoom

**Original Archive Reason**: Enterprise features beyond social media scope.

**DebateMode Restoration Reason**: **Debating clubs are becoming popular in Bangladesh** but lack a dedicated online platform. This fills a critical market need.

**Status**: 
- ✅ **DebateMode RESTORED** - See [FEATURE_RESTORATION.md](./FEATURE_RESTORATION.md) for enhancement roadmap with features from external debate repo
- ⏸️ Other modes remain archived (RoundTable, TownHall, Workshop, Court, Quiz)

**Restored Features**:
- Debate mode with evidence tracking
- Argument submission and management
- Voting system for judges
- Side selection (pro/con)

**Planned Enhancements**:
- Integration with external debate repo features
- Timed speaking rounds
- Enhanced scoring system
- Real-time notifications
- Professional UI improvements

---

## Features KEPT (Core Social Platform)

The following features remain active (including recently restored features):

### Social & Content
- Feed (social posts)
- Groups (communities)
- **Pages** ✅ (restored - for organizations, communities, public figures)
- Blog (content creation)
- Videos (user uploads)
- Profile & Public Profiles

### Communication & Media
- Chat (real-time messaging)
- Meetings (Standard mode + **Debate mode** ✅ restored)
- **Radio** ✅ (restored - internet radio streaming)
- **TV** ✅ (restored - live TV/IPTV channels)

### Commerce & Utility
- Shop (e-commerce)
- Cart (shopping)
- Search (basic search)

### Docs & Collaboration
- Docs (documentation/wikis)

### Admin & Settings
- Admin Dashboard
- User Management
- Content Moderation
- Theme Settings
- Accessibility Settings
- Security Settings
- Analytics

---

## Impact Summary

**Original Archive (February 19, 2026)**:
- Frontend Components Archived: 24 components  
- Backend Services Archived: 1 complete service (streaming-service)
- Routes Removed: 20+ routes

**After Restoration (February 19, 2026)**:
- Frontend Components Restored: 4 (Radio, TV, Pages, DebateMode)
- Backend Services Restored: 1 (streaming-service)
- Routes Restored: 3 (/radio, /tv, /pages)
- **Net Archived**: 17 frontend components, 12 routes

**Current Status**:
- ✅ Restored: Radio, TV, Pages, DebateMode
- ⏸️ Still Archived: Discord Admin, Database Views, Elasticsearch Search, WebRTC Calls, Folder Browser, Wiki Diff, 4 other meeting modes
- 📊 Codebase Reduction: ~20% (adjusted from initial 35%)
- 🎯 Focus: Core social features + culturally relevant features (streaming for BD, debates, pages)

---

## Restoration Priority

**Recently Restored** ✅:
1. Radio & TV Streaming - **RESTORED** (unique feature, culturally relevant)
2. Pages - **RESTORED** (core social media feature)
3. DebateMode - **RESTORED** (fills market need in BD)

**Remaining Archive - Restoration Priority**:

**Low Priority** (Not recommended):
1. Discord Admin - Wrong platform identity
2. Database Views - Overengineered for social platform
3. Elasticsearch Search - Basic search is sufficient
4. WebRTC Calls - Functionality covered by Meetings
5. Folder Browser - Not essential
6. Wiki Diff Viewer - Over-specialized
7. Other Meeting Modes (RoundTable, TownHall, Workshop, Court, Quiz) - Enterprise features

**Note**: Projects feature is being merged into Pages rather than restored separately.

---

## Migration Notes

- No data migration required - features were archived, not deleted
- All archived code is versioned in git history
- Physical archive copies in `archive_code/` directories
- No database changes made (tables remain for potential restoration)
