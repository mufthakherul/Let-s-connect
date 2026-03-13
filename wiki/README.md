# GitHub Wiki Kit

This folder contains GitHub Wiki-ready markdown pages for `mufthakherul/Let-s-connect`.

## Current status

GitHub Wiki is enabled for this repository. This kit now includes a comprehensive set of user-facing and developer pages.

## Included pages

### User-Facing Pages

| Page | Description |
|------|-------------|
| `Home.md` | Welcome page with navigation to all sections |
| `Platform-Overview.md` | What Milonexa is — features, plans, device support |
| `Getting-Started.md` | New user onboarding guide |
| `Account-and-Profile.md` | Registration, login, 2FA, profile setup, account settings |
| `Privacy-and-Security.md` | Privacy controls, data protection, security settings |
| `Community-Guidelines.md` | Platform rules and conduct policy |
| `User-Guidelines.md` | Comprehensive user policy covering all usage scenarios |
| `Social-Features.md` | Feed, posts, reactions, friends, following, stories |
| `Groups-and-Communities.md` | Creating and managing groups and communities |
| `Content-Creation.md` | Posts, media, blogs, polls, Pages |
| `Bookmarks.md` | Saving and organising content |
| `Search-and-Discovery.md` | Search, hashtags, trending, Explore page |
| `Notifications.md` | Notification types, settings, push, email, DND |
| `Messaging.md` | DMs, group chats, community servers, voice/video |
| `Meetings.md` | Video meetings, screen sharing, scheduling, recording |
| `Videos-and-Media.md` | Video platform, galleries, albums, uploads |
| `Streaming.md` | Live TV (60,000+ channels) and internet radio |
| `Shop.md` | Marketplace — buying, selling, orders, safety |
| `Collaboration.md` | Documents, wikis, tasks, Kanban boards, projects |
| `Accessibility.md` | WCAG compliance, screen readers, keyboard nav, settings |
| `Mobile-and-PWA.md` | Installing as a PWA on mobile and desktop |
| `FAQ.md` | Frequently asked questions across all features |
| `Help-and-Support.md` | Reporting, account issues, contact support, crisis resources |

### Developer Pages

| Page | Description |
|------|-------------|
| `Developer-Setup.md` | Local environment setup for contributors |
| `Architecture.md` | System architecture and service overview |
| `API-Lifecycle.md` | API versioning, standards, deprecation |
| `Release-Process.md` | Release management and changelog process |
| `Architecture-Decisions.md` | Architecture Decision Records (ADRs) |
| `Operations-Runbook.md` | Operational procedures and incident response |

### Navigation

| File | Description |
|------|-------------|
| `_Sidebar.md` | Sidebar navigation for the wiki (all sections) |

---

## Publishing workflow (manual)

1. Open the repository wiki in GitHub.
2. Create or edit corresponding pages.
3. Paste content from these files.
4. Keep this folder as the source of truth.

## Publishing workflow (scripted)

Use `scripts/sync-wiki.sh` to push these pages directly to the wiki git repo.

> Prerequisites:
> - GitHub CLI authenticated (`gh auth status`)
> - push permission to `mufthakherul/Let-s-connect.wiki.git`

## Conventions

- Keep page names stable for durable links.
- User-facing pages should be written in plain language — no API code or technical jargon.
- Update `_Sidebar.md` whenever adding or removing pages.
- All user-facing pages should include a navigation footer (`← Previous | Next →`).
- Prefer tables and structured lists over walls of text.

