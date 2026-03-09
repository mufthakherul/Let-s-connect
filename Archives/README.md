# Archives

This directory contains all deprecated, removed, or superseded code and documentation for the **Milonexa** platform. Files here are preserved for reference only and should not be imported into the active codebase.

## Directory Structure

```
Archives/
├── Archive_codes/          # Deprecated or removed source code files
│   ├── backend_refactor_2026/   # Legacy backend service versions (pre-refactor)
│   └── frontend/                # Legacy frontend components (pre-cleanup)
│
└── Archive_docs/           # Deprecated or superseded documentation
    ├── audit-reports/           # Historical audit reports
    ├── implementation-reports/  # Phase-level implementation reports
    ├── other-docs/              # Miscellaneous archived documentation
    ├── phase-reports/           # Project phase completion reports
    ├── root-reports/            # Former root-level progress/summary docs
    └── task-reports/            # Task completion records
```

## Archiving Policy

- **Archive_codes/**: Place source code that has been replaced by newer implementations. Preserve the original to allow rollback if needed.
- **Archive_docs/**: Place documentation that is no longer current — superseded guides, phase reports, one-time summaries, and historical progress reports.

## Active Documentation

Current, active documentation lives in:
- `docs/` — architecture, API, deployment, feature guides
- `README.md` — project overview and quick start
- `QUICK_START.md` — developer quick start guide
- `TESTING.md` — testing guide

> **Note:** Files in this directory are tracked in version control for historical reference. Do not delete them.
