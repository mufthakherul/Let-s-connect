# Collaboration Guide

Welcome to Milonexa's comprehensive collaboration features. This guide covers everything you need to know about collaborating with teammates through documents, wikis, tasks, and project management tools.

## Table of Contents

1. [Documents](#documents)
2. [Real-time Editing](#real-time-editing)
3. [Document Versioning](#document-versioning)
4. [Document Sharing](#document-sharing)
5. [Document Organization](#document-organization)
6. [Wikis](#wikis)
7. [Tasks](#tasks)
8. [Issues](#issues)
9. [Projects](#projects)
10. [Kanban Board](#kanban-board)
11. [Governance Workflows](#governance-workflows)
12. [Knowledge Base](#knowledge-base)
13. [Collaborative Sessions](#collaborative-sessions)

---

## Documents

### Overview

Documents are the heart of Milonexa's collaboration system. Create, edit, and organize rich-text documents with real-time collaboration features. Every document includes title, content, folder organization, and tagging capabilities.

### Creating a Document

Navigate to `/docs` and click the **"New Document"** button. You'll need to provide:

- **Title**: The name of your document (required)
- **Folder**: Choose where to save it or create a new folder
- **Initial content**: Start with an empty document or use a template

#### API: Create Document

```bash
POST /api/collaboration/documents
Content-Type: application/json

{
  "title": "Q4 Planning Document",
  "folderId": "folder-123",
  "content": "<h1>Q4 Planning</h1><p>Initial content here...</p>",
  "tags": ["planning", "q4-2024"]
}
```

**Response:**
```json
{
  "id": "doc-456",
  "title": "Q4 Planning Document",
  "folderId": "folder-123",
  "content": "<h1>Q4 Planning</h1><p>Initial content here...</p>",
  "tags": ["planning", "q4-2024"],
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:30:00Z",
  "owner": {
    "id": "user-123",
    "name": "John Doe",
    "email": "john@example.com"
  }
}
```

### Retrieving Documents

#### API: List Documents

```bash
GET /api/collaboration/documents
```

**Query Parameters:**
- `folderId`: Filter by folder ID
- `tags`: Filter by tags (comma-separated)
- `search`: Full-text search in title and content
- `limit`: Number of results (default: 20)
- `offset`: Pagination offset

**Response:**
```json
{
  "documents": [
    {
      "id": "doc-456",
      "title": "Q4 Planning Document",
      "folderId": "folder-123",
      "tags": ["planning", "q4-2024"],
      "owner": {
        "id": "user-123",
        "name": "John Doe"
      },
      "createdAt": "2024-01-15T10:30:00Z",
      "updatedAt": "2024-01-15T15:45:00Z",
      "collaborators": [
        {
          "id": "user-456",
          "name": "Jane Smith",
          "role": "editor"
        }
      ]
    }
  ],
  "total": 1,
  "limit": 20,
  "offset": 0
}
```

### Document Features

#### Rich Text Editor

The document editor supports:
- **Text formatting**: Bold, italic, underline, strikethrough
- **Headings**: H1 through H6
- **Lists**: Ordered and unordered lists
- **Code blocks**: With syntax highlighting for multiple languages
- **Links**: Inline links with preview
- **Images**: Embedded images from URLs
- **Tables**: Create and edit tables
- **Mentions**: @mention teammates (triggers notifications)
- **Comments**: Add inline comments to specific text sections

#### Tags

Organize documents with multiple tags:
- Add tags while creating or editing a document
- Search documents by tags
- Tags appear with a visual label in document listings
- Suggested tags based on document content

---

## Real-time Editing

### Collaborative Editing

Multiple users can edit the same document simultaneously. Milonexa uses **Operational Transformation (OT)** powered by DiffMatchPatch to resolve concurrent edits seamlessly.

#### How Real-time Editing Works

1. **Live Changes**: When any collaborator makes an edit, all other viewers see the change within milliseconds
2. **Conflict Resolution**: The OT engine ensures that even if multiple users edit overlapping text, the document remains consistent across all clients
3. **Cursor Positions**: See where each collaborator's cursor is located in real-time with color-coded indicators
4. **Typing Indicators**: Notice when teammates are actively typing in specific sections

### Collaborative Session Indicators

At the top of the document, you'll see:

```
Currently editing: John Doe (cursor at line 5), Jane Smith (cursor at line 12)
Last edited: 2 minutes ago by John Doe
```

Each collaborator gets a unique color:
- Cursor position shown with color-coded caret
- Selection ranges highlighted in the collaborator's color with transparency
- Hover over a cursor to see the user's name and role

### Live Cursor Tracking

The document tracks cursor position for all active users:

```javascript
// Example of cursor tracking in real-time
{
  userId: "user-123",
  userName: "John Doe",
  cursorPosition: {
    line: 5,
    column: 12
  },
  color: "#FF6B6B",
  isTyping: true
}
```

---

## Document Versioning

### Full History Tracking

Every change to a document is automatically tracked. Access the version history to:

- **See who changed what**: Username and timestamp for each edit
- **View diffs**: See exactly what changed between versions
- **Restore old versions**: Revert to any previous version (creates a new version entry)

### Accessing Version History

Click the **"History"** button in the document toolbar to open the version panel.

#### API: Get Document Versions

```bash
GET /api/collaboration/documents/:id/versions
```

**Query Parameters:**
- `limit`: Number of versions to return (default: 50)
- `offset`: Pagination offset

**Response:**
```json
{
  "versions": [
    {
      "id": "version-789",
      "documentId": "doc-456",
      "versionNumber": 15,
      "editor": {
        "id": "user-456",
        "name": "Jane Smith"
      },
      "timestamp": "2024-01-15T15:45:00Z",
      "summary": "Added Q4 revenue projections",
      "changeType": "edit",
      "statistics": {
        "added": 156,
        "removed": 0,
        "modified": 23
      }
    },
    {
      "id": "version-788",
      "documentId": "doc-456",
      "versionNumber": 14,
      "editor": {
        "id": "user-123",
        "name": "John Doe"
      },
      "timestamp": "2024-01-15T14:20:00Z",
      "summary": "Initial outline created",
      "changeType": "create"
    }
  ],
  "total": 15
}
```

### Viewing Differences

Select two versions to see a side-by-side or unified diff view:

```
Version 15 vs Version 14
─────────────────────

Line 12:
- Q4 projections pending review
+ Q4 revenue projections: $2.5M (conservative), $3.2M (optimistic)

Line 23:
- Timeline: TBD
+ Timeline: Jan 15 - Mar 30, 2024

Added 156 characters | Removed 0 characters | Modified 23 characters
```

### Restoring a Version

Click the **"Restore"** button next to any previous version. This:

1. Creates a new version with the restored content
2. Records who restored it and when
3. Notifies collaborators of the restoration
4. Preserves the original version for reference

---

## Document Sharing

### Share Links

Generate shareable links with different access levels:

- **Public**: Anyone with the link can view (read-only)
- **Private**: Only invited users can access
- **Team**: Only team members can access

#### Creating a Share Link

1. Click **"Share"** button in the document
2. Select access level: Public, Private, or Team
3. Copy the generated link
4. Optional: Set expiration date
5. Optional: Require password

#### Share Link URL Format

```
https://milonexa.app/shared/doc-456/abc123xyz
```

### Inviting Collaborators

Within the Share panel, add collaborators with specific roles:

- **Viewer**: Read-only access
- **Commenter**: Can read and add comments (no editing)
- **Editor**: Full edit access
- **Owner**: Can edit, share, and delete the document

### Export Options

Export documents in multiple formats:

#### PDF Export

```bash
GET /api/collaboration/documents/:id/export/pdf
```

**Features:**
- Preserves formatting and styling
- Includes images
- Adds table of contents for long documents
- Custom headers/footers with document metadata

#### DOCX Export

```bash
GET /api/collaboration/documents/:id/export/docx
```

**Features:**
- Compatible with Microsoft Word and Google Docs
- Preserves formatting, comments, and revision history
- Can be re-imported to Milonexa

#### Other Formats

- **Markdown (.md)**: Raw markdown export
- **HTML**: Full HTML with embedded styles
- **Plain Text (.txt)**: Content only, no formatting

---

## Document Organization

### Folders

Create a hierarchical folder structure to organize documents:

#### Creating Folders

1. Navigate to `/docs`
2. Click **"New Folder"**
3. Enter folder name
4. Optionally add a description and icon

#### Nested Folders

Folders can contain subfolders up to any depth:

```
/docs
├── Projects/
│   ├── Project A/
│   │   ├── Requirements.md
│   │   └── Timeline.md
│   └── Project B/
│       └── Budget.md
├── Meeting Notes/
│   ├── 2024-01-15.md
│   └── 2024-01-08.md
└── Templates/
    ├── Project Template.md
    └── Meeting Notes Template.md
```

#### Moving Documents

Drag and drop documents between folders, or use the **"Move"** option in the document menu.

### Document Tags

Tags provide flexible categorization across folders:

- **Add tags** when creating or editing a document
- **Filter by tags** in the document list
- **Tag suggestions** based on document content
- **Auto-tagging** for common patterns

---

## Wikis

### Creating a Wiki

Wikis are collections of linked pages with hierarchical organization. Navigate to `/wiki` and click **"New Wiki"** or **"New Page"**.

#### API: Create Wiki Page

```bash
POST /api/collaboration/wikis
Content-Type: application/json

{
  "title": "Getting Started Guide",
  "slug": "getting-started",
  "content": "<h1>Getting Started</h1><p>Welcome...</p>",
  "parentId": null,
  "tags": ["guide", "onboarding"]
}
```

**Response:**
```json
{
  "id": "wiki-001",
  "title": "Getting Started Guide",
  "slug": "getting-started",
  "content": "<h1>Getting Started</h1><p>Welcome...</p>",
  "url": "/wiki/getting-started",
  "parentId": null,
  "children": [],
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "editor": {
    "id": "user-123",
    "name": "John Doe"
  }
}
```

### Retrieving Wiki Pages

#### API: List Wiki Pages

```bash
GET /api/collaboration/wikis
```

**Query Parameters:**
- `parentId`: Get child pages of a specific wiki page
- `search`: Search wiki titles and content
- `limit`: Number of results (default: 50)

**Response:**
```json
{
  "pages": [
    {
      "id": "wiki-001",
      "title": "Getting Started Guide",
      "slug": "getting-started",
      "parentId": null,
      "url": "/wiki/getting-started",
      "editor": {
        "id": "user-123",
        "name": "John Doe"
      },
      "updatedAt": "2024-01-15T10:00:00Z",
      "childCount": 3
    }
  ],
  "total": 1
}
```

### Hierarchical Structure

Wiki pages support parent-child relationships:

```
Home
├── Getting Started
│   ├── Installation
│   ├── First Project
│   └── Configuration
├── User Guide
│   ├── Documents
│   ├── Tasks
│   └── Collaboration
└── API Reference
    ├── Authentication
    ├── REST API
    └── Webhooks
```

### Slug-based URLs

Each wiki page has a slug-based URL for easy access:

```
/wiki/getting-started
/wiki/getting-started/installation
/wiki/getting-started/first-project
/wiki/user-guide
/wiki/api-reference/authentication
```

Slugs are automatically generated from the page title but can be customized.

### Breadcrumb Navigation

At the top of each wiki page, breadcrumbs show your location:

```
Home > Getting Started > Installation
```

Click any breadcrumb to navigate up the hierarchy.

### Wiki Edit History

Each wiki page tracks its edit history:

```
Edited 3 hours ago by John Doe - "Added Python installation instructions"
Edited 1 day ago by Jane Smith - "Fixed typos"
Created 5 days ago by John Doe
```

Click **"History"** to see all changes with:
- **Timestamp**: When the edit was made
- **Editor**: Who made the change
- **Summary**: Brief description of the change
- **Diff view**: See exactly what changed

---

## Tasks

### Creating Tasks

Tasks are actionable items with clear ownership and deadlines.

#### API: Create Task

```bash
POST /api/collaboration/tasks
Content-Type: application/json

{
  "title": "Implement user authentication",
  "description": "Add OAuth2 and JWT support",
  "assigneeId": "user-456",
  "dueDate": "2024-02-15T23:59:59Z",
  "priority": "high",
  "projectId": "project-123",
  "tags": ["backend", "security"]
}
```

**Response:**
```json
{
  "id": "task-001",
  "title": "Implement user authentication",
  "description": "Add OAuth2 and JWT support",
  "assignee": {
    "id": "user-456",
    "name": "Jane Smith"
  },
  "creator": {
    "id": "user-123",
    "name": "John Doe"
  },
  "status": "todo",
  "priority": "high",
  "dueDate": "2024-02-15T23:59:59Z",
  "createdAt": "2024-01-15T10:00:00Z",
  "updatedAt": "2024-01-15T10:00:00Z",
  "projectId": "project-123"
}
```

### Task Fields

- **Title**: Short task name
- **Description**: Detailed description and requirements
- **Assignee**: Person responsible for the task
- **Due Date**: Target completion date
- **Priority**: Low, Medium, High, or Critical
- **Status**: Todo, In Progress, Review, or Done
- **Tags**: Categorize and filter tasks
- **Subtasks**: Break tasks into smaller steps
- **Comments**: Team discussion on the task
- **Attachments**: Link documents, files, or references

### Task Status

Track task progress with statuses:

- **Todo**: Not yet started
- **In Progress**: Actively being worked on
- **Review**: Completed but awaiting review
- **Done**: Finished and closed

Update status in the task detail view or from the Kanban board.

### Task Priority

Prioritize work with four levels:

- **Low**: Nice to have, no deadline pressure
- **Medium**: Standard priority work
- **High**: Important, should complete soon
- **Critical**: Urgent, must complete ASAP

### Listing Tasks

#### API: List Tasks

```bash
GET /api/collaboration/tasks
```

**Query Parameters:**
- `projectId`: Filter by project
- `assigneeId`: Filter by assignee
- `priority`: Filter by priority (low, medium, high, critical)
- `status`: Filter by status (todo, in_progress, review, done)
- `search`: Search in title and description
- `dueDateFrom`: Tasks due after this date
- `dueDateTo`: Tasks due before this date

---

## Issues

### Creating Issues

Issues track bugs, feature requests, and other work items with structured metadata.

**Issue Types:**
- **Bug**: Something is broken
- **Feature Request**: New capability or improvement
- **Enhancement**: Improve existing feature
- **Documentation**: Documentation needed
- **Other**: Miscellaneous issues

### Issue Features

- **Labels**: Categorize issues (bug, feature, documentation, etc.)
- **Milestones**: Group issues into release targets
- **Linked Issues**: Reference related issues
- **Assignees**: Multiple people can be assigned
- **Comments**: Team discussion
- **Attachments**: Screenshots, logs, references

### Issue Workflow

Issues progress through states:

```
Open → In Progress → Under Review → Closed
   ↓
Backlog
```

---

## Projects

### Creating Projects

Projects group related tasks and issues under a single umbrella.

**Project Information:**
- **Name**: Project title
- **Description**: Project goals and scope
- **Owner**: Project lead
- **Team Members**: Who's involved
- **Start Date**: Project kick-off
- **Target End Date**: Planned completion
- **Status**: Active, On Hold, Completed, Archived

### Project Views

- **Task List**: All tasks in the project
- **Kanban Board**: Visual workflow with columns
- **Timeline/Gantt**: Schedule and dependencies
- **Issues**: Associated issues and bugs
- **Team**: Project members and roles

### Project Settings

Configure per-project:

- **Task Templates**: Predefined task types
- **Workflows**: Custom status columns
- **Permissions**: Who can edit, view, comment
- **Notifications**: How members are notified
- **Integration**: Connect to external services

---

## Kanban Board

### Overview

The Kanban board provides a visual workflow for managing tasks.

### Default Columns

By default, a project Kanban has five columns:

1. **Backlog**: Planned but not yet started
2. **Todo**: Ready to begin
3. **In Progress**: Currently being worked on
4. **Review**: Completed, awaiting review
5. **Done**: Finished

### Using the Kanban Board

#### Creating Tasks

Click **"+ New Task"** in any column to create a task directly on the board.

#### Moving Tasks

Drag and drop task cards between columns to update status:

```
[Backlog]        [Todo]           [In Progress]    [Review]         [Done]
┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐       ┌────────┐
│Task 1  │       │Task 3  │       │Task 5  │       │Task 7  │       │Task 9  │
│        │       │        │       │        │       │        │       │        │
│Due:    │  -->  │Due:    │  -->  │Due:    │  -->  │Due:    │  -->  │Done    │
│Feb 20  │       │Feb 15  │       │Feb 10  │       │Feb 5   │       │Feb 2   │
└────────┘       └────────┘       └────────┘       └────────┘       └────────┘
```

#### Task Card Display

Each card shows:
- Task title
- Assignee avatar (click to change)
- Priority indicator (color-coded)
- Due date
- Tag labels
- Number of comments
- Attachments indicator

#### Customizing Columns

Right-click a column header to:
- **Rename**: Change column name
- **Change color**: Visual distinction
- **Set WIP limit**: Limit tasks per column
- **Delete**: Remove column (tasks moved to backlog)

### Advanced Kanban Features

- **Swimlanes**: Group by assignee, priority, or custom field
- **Card filters**: Show only tasks matching criteria
- **Bulk edit**: Select multiple cards and update properties
- **Copy board**: Duplicate a board for another project
- **Board snapshots**: Archive board state at milestones

---

## Governance Workflows

### Proposal System

Use Milonexa for structured decision-making:

#### Creating a Proposal

1. Create a document with proposal details
2. Share with relevant stakeholders
3. Set comment period deadline
4. Gather feedback through comments

#### Proposal Sections

- **Context**: Background and problem statement
- **Proposal**: Detailed solution or decision
- **Alternatives**: Other options considered
- **Impact**: Expected consequences
- **Timeline**: Implementation schedule
- **Decision Maker**: Who has final authority

### Voting System

Conduct structured votes on decisions:

#### Voting Options

- **Yes**: Approve/Support
- **No**: Disapprove/Oppose
- **Abstain**: No opinion
- **Conditional**: Support with conditions

#### Vote Results

```
Decision: Should we migrate to Kubernetes?

Votes (11 total):
✓ Yes (7 votes - 64%)
✗ No (2 votes - 18%)
- Abstain (2 votes - 18%)

Status: APPROVED (supermajority required: 66%)
Decided: 2024-01-15 at 15:30 UTC
```

### Decision Tracking

Archive decisions for future reference:

- **Accepted**: Proposal was approved
- **Rejected**: Proposal was not approved
- **Superseded**: A newer decision replaced this one
- **On Hold**: Decision postponed pending more information

---

## Knowledge Base

### Organizing Information

The Knowledge Base is a curated collection of:

- **Articles**: In-depth guides and tutorials
- **FAQs**: Frequently asked questions
- **Snippets**: Code examples and templates
- **Best Practices**: Team conventions and standards
- **Troubleshooting**: Common problems and solutions

### Creating Knowledge Base Items

Each item has:

- **Title**: Clear, searchable name
- **Category**: Organize by topic
- **Content**: Rich text, code blocks, images
- **Related Items**: Link to related articles
- **Author**: Credit to creator
- **Last Updated**: Timestamp
- **Helpful Rating**: Community feedback

### Searching the Knowledge Base

- **Full-text search**: Search titles and content
- **Filter by category**: Browse by topic
- **Sort by**: Relevance, date, popularity
- **Bookmarks**: Save articles for quick access

---

## Collaborative Sessions

### Presence Indicators

See who else is actively viewing or editing:

- **Green dot**: User is currently active
- **Gray dot**: User viewed recently but not active
- **Away status**: Idle for 5+ minutes

### User Presence Model

```javascript
{
  userId: "user-123",
  userName: "John Doe",
  status: "active", // active, idle, offline
  lastSeen: "2024-01-15T15:47:00Z",
  currentPage: "/docs/doc-456",
  cursorPosition: {
    line: 42,
    column: 15
  },
  color: "#FF6B6B"
}
```

### Collaborative Notifications

Receive notifications when:

- A collaborator joins the document
- Multiple people are editing the same section
- Mentions in comments
- Document status changes
- Due dates approaching

### Session Information

Click the **"Active Users"** button to see:

- Number of people viewing the document
- List of active collaborators
- Their current cursor positions
- Last activity timestamp

---

## Tips for Effective Collaboration

### Best Practices

1. **Use descriptive titles**: Make documents, tasks, and pages easy to find
2. **Add context**: Include background and objectives in descriptions
3. **Tag consistently**: Use a naming convention for tags
4. **Mention teammates**: Use @mentions to notify relevant people
5. **Review versions**: Check version history before major edits
6. **Organize folders**: Keep the document structure clean and logical
7. **Comment thoroughly**: Explain the "why" not just "what"
8. **Set clear deadlines**: Use due dates on tasks for accountability
9. **Prioritize tasks**: Help the team focus on what matters most
10. **Archive old projects**: Keep active projects easy to find

### Collaboration Etiquette

- **Wait for turn**: If typing in the same section, pause and let others finish
- **Lock for major edits**: Use the lock feature for large restructuring
- **Brief comments**: Keep comments concise and actionable
- **Resolve discussions**: Close threads when decisions are made
- **Respect privacy**: Don't share documents without permission
- **Give attribution**: Credit others' work in version summaries

---

## Keyboard Shortcuts

### Document Editing

- **Ctrl/Cmd + B**: Bold
- **Ctrl/Cmd + I**: Italic
- **Ctrl/Cmd + U**: Underline
- **Ctrl/Cmd + K**: Insert link
- **Ctrl/Cmd + Z**: Undo
- **Ctrl/Cmd + Shift + Z**: Redo

### General Navigation

- **Ctrl/Cmd + /**: Open command palette
- **Ctrl/Cmd + F**: Find in document
- **Ctrl/Cmd + Shift + F**: Find and replace

---

## Troubleshooting

### Sync Issues

If changes aren't syncing across users:

1. Check internet connection
2. Refresh the page (Ctrl/Cmd + R)
3. Check browser console for errors
4. Verify user is logged in

### Merge Conflicts

Milonexa's OT engine handles most conflicts automatically. If conflicts occur:

1. One version is chosen (most recent change wins)
2. Review version history to understand the change
3. Manually edit if needed
4. All changes are preserved in version history

### Permission Issues

If you can't edit a document:

1. Check your user role (Viewer vs. Editor)
2. Ask the document owner to increase your permissions
3. Verify you've accepted the sharing invitation

---

## Need Help?

- **Documentation**: `/wiki/collaboration`
- **Help Center**: `/hubs/helpcenter`
- **Support Ticket**: Create a ticket in `/hubs/helpcenter#support`
- **Community Forum**: Ask in `/hubs/forum`

Last updated: 2024-01-15
