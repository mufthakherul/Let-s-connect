# Changelog Policy

Defines how changes are documented for contributors and operators.

## Goals

- Make releases understandable quickly.
- Capture operationally relevant changes.
- Keep historical context searchable.

## Changelog categories

- Added
- Changed
- Deprecated
- Removed
- Fixed
- Security

## Entry requirements

Every significant change should include:

- impacted area/service,
- user/operator impact,
- migration or rollout notes (if any),
- issue/PR reference.

## Source of truth

- Repository-level release notes + PR history
- For major milestones, summarize in project changelog artifacts

## Writing rules

- Use concise, outcome-focused language.
- Avoid internal-only jargon where possible.
- Include risk notes for potentially disruptive changes.

## Example entry

- **Changed:** API gateway improved route governance for v2 traffic.
- **Impact:** Lower accidental route drift across services.
- **Action:** No client changes required.
