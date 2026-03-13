# GitHub Wiki Kit

This folder contains GitHub Wiki-ready markdown pages for `mufthakherul/Let-s-connect`.

## Current status

GitHub Wiki is already enabled for this repository.

## Included pages

- `Home.md`
- `_Sidebar.md`
- `Getting-Started.md`
- `Architecture.md`
- `API-Lifecycle.md`
- `Release-Process.md`
- `Architecture-Decisions.md`
- `Operations-Runbook.md`

## Publishing workflow (manual)

1. Open the repository wiki in GitHub.
2. Create or edit corresponding pages.
3. Paste content from these files.
4. Keep this folder as the source of truth and update wiki when changed.

## Publishing workflow (scripted)

Use `scripts/sync-wiki.sh` to push these pages directly to the wiki git repo.

> Prerequisites:
> - GitHub CLI authenticated (`gh auth status`)
> - push permission to `mufthakherul/Let-s-connect.wiki.git`

## Conventions

- Keep page names stable for durable links.
- Prefer concise pages with deep-links to `docs/` for detail.
- Update `_Sidebar.md` whenever adding/removing pages.
