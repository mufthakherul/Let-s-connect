# Accessibility

> Milonexa is built to be accessible to everyone. This page describes the accessibility features available and how to enable them.

---

## Table of Contents

1. [Our Accessibility Commitment](#1-our-accessibility-commitment)
2. [Visual Accessibility](#2-visual-accessibility)
3. [Hearing Accessibility](#3-hearing-accessibility)
4. [Motor & Keyboard Accessibility](#4-motor--keyboard-accessibility)
5. [Cognitive Accessibility](#5-cognitive-accessibility)
6. [Screen Reader Support](#6-screen-reader-support)
7. [Accessibility Settings](#7-accessibility-settings)
8. [Keyboard Shortcuts](#8-keyboard-shortcuts)
9. [Reporting Accessibility Issues](#9-reporting-accessibility-issues)

---

## 1. Our Accessibility Commitment

Milonexa is committed to **WCAG 2.1 Level AA compliance** — the internationally recognised standard for web accessibility.

This means:
- Content is perceivable by everyone, including those using assistive technologies
- Interface components are fully operable via keyboard
- Information is understandable regardless of disability
- The platform is robust and compatible with current and future assistive tools

We continuously audit our platform for accessibility improvements.

---

## 2. Visual Accessibility

### Dark Mode

Reduce eye strain with dark mode:
1. Click the **☀️ / 🌙** icon in the navigation (usually top-right), or
2. **Settings → Appearance → Theme → Dark**

Milonexa also supports **automatic mode** — matching your device's system preference.

### High Contrast Mode

For users who need stronger colour contrast:
1. **Settings → Accessibility → High Contrast Mode → On**

This increases text/background contrast throughout the platform, exceeding WCAG AA minimums.

### Text Size

Adjust the base font size:
1. **Settings → Accessibility → Text Size**
2. Choose: Small / Medium (default) / Large / Extra Large

All layouts adapt responsively to accommodate larger text without breaking.

### Reduce Motion

Some users are sensitive to animations and transitions:
1. **Settings → Accessibility → Reduce Motion → On**
2. This disables auto-playing animations, transitions, and parallax effects

Milonexa also respects your **operating system's reduce motion setting** automatically.

### Colour Blind Modes

For users with colour vision deficiencies:
1. **Settings → Accessibility → Colour Mode**
2. Choose:
   - **Default** — standard colour palette
   - **Deuteranopia** (red-green, common)
   - **Protanopia** (red-green, red deficiency)
   - **Tritanopia** (blue-yellow)
   - **Monochromacy** — grayscale mode

### Focus Indicators

All interactive elements have visible focus indicators when navigating by keyboard (tab key). These are always visible regardless of theme.

---

## 3. Hearing Accessibility

### Closed Captions on Videos

Most videos on Milonexa support closed captions:
1. In the video player, click **CC**.
2. Choose a language.

Auto-generated captions are available for many videos via AI transcription.

### Captions in Meetings

Real-time captions during video meetings:
1. In a meeting, click **⚙️ Settings → Enable Live Captions**.
2. Captions appear at the bottom of the meeting screen.

### Visual Notifications

Instead of relying only on sounds, Milonexa uses visual banners and badges for all notifications.

To ensure sounds are not required:
1. **Settings → Notifications → Sounds → Off**
2. Visual notifications remain active regardless of sound settings.

---

## 4. Motor & Keyboard Accessibility

### Full Keyboard Navigation

The entire Milonexa platform is navigable by keyboard:
- Use **Tab** to move between interactive elements
- Use **Enter** or **Space** to activate buttons and links
- Use **Arrow keys** within menus and dropdowns
- Use **Escape** to close modals and dropdowns
- Use **Shift+Tab** to navigate backwards

### Skip Navigation Links

A **"Skip to main content"** link appears at the top of every page when you press Tab. This skips the navigation bar and jumps directly to the main content — useful for screen reader and keyboard users.

### Focus Trap

Modal dialogs and menus properly trap focus while open — focus doesn't escape to background content until the modal is closed.

### Pointer & Click Targets

All interactive elements (buttons, links, form fields) meet or exceed the **WCAG minimum target size** of 44×44 CSS pixels.

---

## 5. Cognitive Accessibility

### Plain Language

We write our interface labels, error messages, and help text in plain, clear language. We avoid jargon wherever possible.

### Error Handling

- Form errors are described clearly: "Enter a valid email address" (not just a red outline)
- Errors identify the specific field and explain how to fix them
- Submission is blocked until errors are resolved — no silent failures

### Confirmation Dialogs

Destructive actions (delete, leave group, account deletion) always require explicit confirmation, with clear consequences described.

### Timeout Warnings

If your session is about to expire, you'll see a warning with time remaining and an option to extend.

---

## 6. Screen Reader Support

Milonexa is tested with the following screen readers:

| Screen Reader | Platform | Support Level |
|-------------|---------|--------------|
| **NVDA** | Windows | Full |
| **JAWS** | Windows | Full |
| **VoiceOver** | macOS / iOS | Full |
| **TalkBack** | Android | Full |
| **Narrator** | Windows | Partial |

### ARIA Implementation

- All interactive components use appropriate **ARIA roles**, **states**, and **properties**
- Dynamic content updates use **live regions** to announce changes without requiring focus
- Images have meaningful `alt` text
- Form inputs are associated with visible labels
- Complex widgets (date pickers, autocomplete) follow WAI-ARIA authoring patterns

### Images & Alt Text

When uploading photos or images in posts, you're encouraged to add **alt text**:
1. After uploading an image → click it → **Edit Alt Text**.
2. Describe what's in the image (e.g., "Two people smiling at a café").
3. Alt text is read aloud by screen readers for users who cannot see the image.

---

## 7. Accessibility Settings

All accessibility settings are in **Settings → Accessibility**:

| Setting | Options |
|---------|---------|
| **Theme** | Light / Dark / Auto (follows system) |
| **High Contrast** | On / Off |
| **Text Size** | Small / Medium / Large / Extra Large |
| **Reduce Motion** | On / Off / Auto (follows system) |
| **Colour Mode** | Default / Deuteranopia / Protanopia / Tritanopia / Monochromacy |
| **Focus Indicators** | Enhanced (larger/more visible indicators) |
| **Notification Sounds** | On / Off |
| **Keyboard Shortcuts** | Enabled / Disabled |
| **Screen Reader Optimisations** | On / Off (additional ARIA hints) |

---

## 8. Keyboard Shortcuts

### Global Shortcuts

| Shortcut | Action |
|----------|--------|
| `/` | Focus the search bar |
| `G + H` | Go to Home |
| `G + F` | Go to Feed |
| `G + N` | Go to Notifications |
| `G + M` | Go to Messages |
| `G + P` | Go to your Profile |
| `?` | Open keyboard shortcut help |
| `Esc` | Close any open modal |

### In the Feed

| Shortcut | Action |
|----------|--------|
| `J` | Next post |
| `K` | Previous post |
| `L` | Like / React to focused post |
| `C` | Comment on focused post |
| `S` | Share focused post |
| `B` | Bookmark focused post |

### In the Text Editor

| Shortcut | Action |
|----------|--------|
| `Ctrl+B` | Bold |
| `Ctrl+I` | Italic |
| `Ctrl+K` | Insert link |
| `Ctrl+Z` | Undo |
| `Ctrl+Shift+Z` | Redo |
| `Ctrl+Enter` | Submit / Post |

---

## 9. Reporting Accessibility Issues

Found an accessibility barrier? Please let us know.

1. Go to **Help → Report Accessibility Issue** or
2. Contact support (see [Help & Support](Help-and-Support))
3. Describe:
   - The page or feature with the issue
   - The assistive technology you're using (if any)
   - What you expected to happen
   - What actually happened

We take accessibility reports seriously and aim to address issues in the next release cycle.

---

> ← [Meetings](Meetings) | [Mobile & PWA →](Mobile-and-PWA)
