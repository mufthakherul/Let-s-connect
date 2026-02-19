# Archived Features Documentation

This document catalogs features that have been archived from Let's Connect platform. These features were determined to be either duplicate, overengineered, or not core to a social media platform.

## Archive Date
February 19, 2026

## Archived Features

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

### 4. Pages Feature
**Location**: `archive_code/frontend/Pages.js`  
**Routes Removed**: `/pages`  
**Backend**: Pages service endpoints

**Reason**: Content duplication - Pages overlapped significantly with Blog, Docs, and Projects features. Blog provides sufficient content creation capabilities.

**Features Removed**:
- User-created pages
- Page templates
- Page sharing and permissions
- Page versioning

**Reinstatement Guide**: If needed in future:
1. Restore Pages component
2. Restore backend API endpoints
3. Restore database migrations for pages table
4. Add navigation links

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

### 6. Radio & TV Streaming Services
**Location**: 
- `archive_code/frontend/Radio.js`
- `archive_code/frontend/TV.js`
- `archive_code/backend/streaming-service/`

**Routes Removed**: `/radio`, `/tv`  
**Backend**: Entire streaming-service microservice

**Reason**: This is a media aggregator service, not core social media functionality. Maintaining 8,000+ radio stations and TV channels creates massive overhead and competes with YouTube/Spotify.

**Features Removed**:
- Radio station browser (8,000+ stations)
- TV/IPTV channel aggregation
- Stream health checking
- Recommendation engine
- Multiple data fetchers (iptv-org, radioss, xiph)

**Reinstatement Guide**: If needed in future:
1. Restore frontend components
2. Restore entire streaming-service microservice
3. Set up stream health checking infrastructure
4. Configure external data source integrations
5. Update API gateway routing

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

### 10. Specialized Meeting Modes
**Location**: `archive_code/frontend/meeting-modes/` (specific modes)  
**Components Archived**:
- DebateMode.js
- RoundTableMode.js
- TownHallMode.js
- WorkshopMode.js
- OtherModes.js (Court, Quiz)

**Routes Impact**: Meeting creation UI simplified

**Reason**: Enterprise features beyond social media scope. Standard and Conference modes provide sufficient functionality.

**Features Removed**:
- Debate mode with evidence tracking
- Round table turn management
- Town hall Q&A system
- Workshop ideation tools
- Virtual court proceedings
- Quiz/competition modes

**Reinstatement Guide**: If needed in future:
1. Restore specific mode components
2. Update MeetingRoom.js to include mode selection
3. Restore collaboration-service mode-specific endpoints
4. Update meeting creation UI

---

## Features KEPT (Core Social Platform)

The following features remain active:

### Social & Content
- Feed (social posts)
- Groups (communities)
- Blog (content creation)
- Videos (user uploads)
- Profile & Public Profiles

### Communication
- Chat (real-time messaging)
- Meetings (Standard mode only)

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

**Frontend Components Archived**: 15+ components  
**Backend Services Archived**: 1 complete service (streaming-service)  
**Routes Removed**: 12+ routes  
**Estimated Codebase Reduction**: 30-35%  
**Maintenance Burden Reduction**: ~40%

---

## Restoration Priority

If features need to be restored, recommended priority:

**High Priority** (Could be valuable):
1. Projects (if project management becomes core)
2. WebRTC Calls (if standalone calling needed)

**Medium Priority** (Specialized use cases):
3. Folder Browser (if file organization crucial)
4. Wiki Diff Viewer (if version control essential)
5. Elasticsearch Search (if scale demands it)

**Low Priority** (Not recommended):
6. Radio/TV Streaming (too complex)
7. Discord Admin (wrong platform identity)
8. Database Views (overengineered)
9. Specialized Meeting Modes (enterprise only)

---

## Migration Notes

- No data migration required - features were archived, not deleted
- All archived code is versioned in git history
- Physical archive copies in `archive_code/` directories
- No database changes made (tables remain for potential restoration)
