# Archived glassmorphism behavior (legacy)

This file preserves the removed default glassmorphism behavior from:
- `frontend/src/store/themeStore.js`
- `frontend/src/App.js`

## Legacy defaults
- accessibility.glassmorphism was `true` by default
- resetAccessibilitySettings() restored `glassmorphism: true`
- App theme applied `getGlassyStyle(mode)` to AppBar/Drawer/Card when enabled

## Why archived
The current UX direction is to use the default design system (solid, consistent, professional surfaces) rather than translucent glass by default.
