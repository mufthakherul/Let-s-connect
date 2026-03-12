# Accessibility Guide

Milonexa is committed to providing an accessible platform for all users. This comprehensive guide covers accessibility features and how to use them to customize your experience.

## Table of Contents

1. [WCAG 2.1 Compliance](#wcag-21-compliance)
2. [Color Modes](#color-modes)
3. [High Contrast Mode](#high-contrast-mode)
4. [Text Scaling](#text-scaling)
5. [Font Options](#font-options)
6. [Reduced Motion](#reduced-motion)
7. [Screen Reader Support](#screen-reader-support)
8. [Keyboard Navigation](#keyboard-navigation)
9. [Color Blind Support](#color-blind-support)
10. [Glassmorphism Option](#glassmorphism-option)
11. [Zoom Support](#zoom-support)
12. [Reporting Issues](#reporting-issues)

---

## WCAG 2.1 Compliance

### What is WCAG 2.1 AA?

Web Content Accessibility Guidelines (WCAG) 2.1 Level AA is an international standard for web accessibility that ensures content is usable by everyone, including people with disabilities.

The four principles of WCAG are:

1. **Perceivable**: Information is accessible to all senses
   - Text alternatives for images
   - Audio content has transcripts
   - Content doesn't rely solely on color
   - Adjustable text size and contrast

2. **Operable**: Users can navigate and interact
   - Keyboard accessible
   - Sufficient time to read and react
   - Content doesn't cause seizures
   - Navigation is consistent

3. **Understandable**: Content is clear and predictable
   - Language is clear and simple
   - Consistent navigation
   - Error prevention and correction
   - Input assistance

4. **Robust**: Works with assistive technologies
   - Valid HTML and coding
   - Compatible with screen readers
   - Works across browsers and devices

### Coverage in Milonexa

Milonexa accessibility features cover:

✓ **Visual disabilities**
- Color blindness
- Low vision
- Blindness (screen reader support)

✓ **Motor disabilities**
- Limited mobility
- Tremors
- Keyboard-only navigation

✓ **Cognitive disabilities**
- Dyslexia (special fonts)
- ADHD (reduced motion, focus tools)
- Autism (clearer language)

✓ **Hearing disabilities**
- Captions on videos
- Transcripts for audio
- Visual alerts

### Certification

Milonexa's accessibility compliance is regularly tested:

- **Annual audits**: Third-party accessibility testing
- **User testing**: Real users with disabilities test features
- **Continuous improvement**: Accessibility feedback incorporated
- **Certification**: WCAG 2.1 Level AA compliant

---

## Color Modes

### Overview

Milonexa supports three color modes to suit your preference and environment.

#### Light Mode

Best for:
- Bright environments
- Standard office lighting
- Users who prefer bright interfaces

**Colors:**
- Background: White (#FFFFFF)
- Text: Dark gray (#1A1A1A)
- Accent: Blue (#007AFF)

#### Dark Mode

Best for:
- Low-light environments
- Evening/night use
- Reduced eye strain in darkness
- Battery savings on OLED screens

**Colors:**
- Background: Dark gray (#121212)
- Text: White (#FFFFFF)
- Accent: Light blue (#5EBFFF)

#### System Mode (Default)

Automatically matches your device's system preference:

- Windows/Android: Follows system theme
- macOS/iOS: Follows system setting
- Web: Uses CSS `prefers-color-scheme` media query
- Auto-switching: Changes at sunset/sunrise

### Switching Color Mode

#### Method 1: Navigation Bar

1. Look for the sun/moon icon in the top navigation
2. Click to toggle between dark and light
3. Or click and hold to access all options

#### Method 2: Settings

1. Go to **Settings → Appearance**
2. Select **Color Mode**
3. Choose: Light, Dark, or System
4. Changes apply immediately

#### CSS Media Query (Developers)

```css
/* Light mode */
@media (prefers-color-scheme: light) {
  body {
    background-color: white;
    color: black;
  }
}

/* Dark mode */
@media (prefers-color-scheme: dark) {
  body {
    background-color: #121212;
    color: white;
  }
}
```

### Auto Transition

If you select System mode:

```
Sunrise: 6:30 AM → Light Mode
Sunset: 6:30 PM → Dark Mode
(Times based on your location or manual setting)
```

---

## High Contrast Mode

### Purpose

High contrast mode increases the contrast between text and background, making content easier to read for users with:

- Low vision
- Astigmatism
- Some types of color blindness
- Aging eyes

### Contrast Ratios

Milonexa maintains minimum contrast ratios:

```
Standard Mode:
  Normal text: 4.5:1 contrast ratio (WCAG AA)
  Large text: 3:1 contrast ratio (WCAG AA)

High Contrast Mode:
  Normal text: 7:1 contrast ratio (WCAG AAA)
  Large text: 4.5:1 contrast ratio (WCAG AAA)
```

The higher ratio makes text significantly easier to read.

### Enabling High Contrast

1. Go to **Settings → Accessibility**
2. Toggle **"High Contrast Mode"**
3. Interface updates immediately

```
Before High Contrast:
  Button: Blue background (#007AFF) with white text
  Contrast: 4.8:1

After High Contrast:
  Button: Dark blue background (#003D99) with white text
  Contrast: 7.2:1
```

### What Changes

In high contrast mode:

- **Text**: Darker or lighter for better contrast
- **Buttons**: Borders become more prominent
- **Links**: Underlined or colored more distinctly
- **Backgrounds**: More defined separation
- **Icons**: Higher contrast with background
- **Focus indicators**: More visible focus rings

---

## Text Scaling

### Overview

Adjust text size across the entire platform from 80% to 150% of the default size.

### Using Text Scaling

1. Go to **Settings → Accessibility → Text Scaling**
2. Use the slider to adjust size:

```
Slider: [├─────●─────┤]
         80%  100% 150%
         (default: 100%)
```

3. Preview shows how text will look
4. Changes apply to all text on the platform

### Size Examples

```
At 80% (Smaller):
The quick brown fox jumps over the lazy dog.
Use for: More content on screen, wide displays

At 100% (Default):
The quick brown fox jumps over the lazy dog.
Use for: Standard viewing distance

At 120% (Comfortable):
The quick brown fox jumps over the lazy dog.
Use for: Low vision, longer reading sessions

At 150% (Large):
The quick brown fox jumps over the lazy dog.
Use for: Significant vision difficulties
```

### What Scales

Text scaling affects:

✓ **Body text**: Regular paragraph text
✓ **Headings**: All heading levels
✓ **Buttons**: Button text
✓ **Navigation**: Menu items, tabs
✓ **Forms**: Input labels, placeholders
✓ **Notifications**: Alert text
✓ **Captions**: Video and image captions

✗ **Images**: Images don't scale (they're content)
✗ **Icons**: Icons size adjusts slightly
✗ **Code blocks**: Monospace font stays readable

### Proportional Scaling

All text scales proportionally:

```
Default:
  H1: 32px
  H2: 24px
  Body: 16px
  Small: 12px

At 125%:
  H1: 40px (32 × 1.25)
  H2: 30px (24 × 1.25)
  Body: 20px (16 × 1.25)
  Small: 15px (12 × 1.25)
```

---

## Font Options

### Default Font Stack

Milonexa uses a system font stack for optimal readability:

```css
font-family: -apple-system, BlinkMacSystemFont, 
             "Segoe UI", Roboto, Oxygen-Sans, 
             Ubuntu, Cantarell, sans-serif;
```

This uses your device's native font for familiarity and performance.

### OpenDyslexic Font

Specialized font for readers with dyslexia:

**Features:**
- Heavy-weight bottom strokes prevent confusion
- Italic spacing prevents letter rotation
- Thicker than most fonts
- Prevents character mirroring (b/d, p/q)

**Example:**
```
Regular: The quick brown fox jumps
OpenDyslexic: The quick brown fox jumps
```

**When to use:** If you have dyslexia or letter recognition difficulties

**Website:** https://dyslexicfont.com

### Atkinson Hyperlegible Font

High-legibility font from Braille Institute:

**Features:**
- Designed for maximum legibility
- Clear distinction between similar letters (1/l/I, 0/O)
- Wide letter spacing
- Open counters in letters

**Example:**
```
Regular: 01l1O0o
Hyperlegible: 01l1O0o (more distinct)
```

**When to use:** Low vision, astigmatism, or general readability preferences

**Website:** https://www.brailleinstitute.org/hyperlegible

### Switching Fonts

1. Go to **Settings → Appearance → Font**
2. Select:
   - Default (System Font)
   - OpenDyslexic
   - Atkinson Hyperlegible

3. Preview updates in real-time
4. Settings saved to your account

### Font Sizes With Scaling

Fonts scale with your text scaling setting:

```
At 120% text scaling:

Default: Normal sized system font × 1.2
OpenDyslexic: Slightly larger, distinctive × 1.2
Hyperlegible: Clear, spaced out × 1.2
```

---

## Reduced Motion

### Purpose

Reduce or disable animations for users who:

- Experience motion sickness from animations
- Have vestibular disorders
- Have ADHD and find motion distracting
- Prefer simpler interfaces

### Animation Examples

**Standard (with motion):**
- Transitions when switching between pages
- Hover animations on buttons
- Scroll animations
- Fade in/out effects
- Parallax scrolling

**Reduced motion:**
- All animations disabled or simplified
- Instant transitions
- No hover animations
- Content appears immediately
- Static backgrounds

### Enabling Reduced Motion

#### Method 1: Browser Setting

Most browsers support the `prefers-reduced-motion` setting:

**Windows:**
1. Settings → Ease of Access → Display
2. Turn on "Show animations"

**macOS:**
1. System Preferences → Accessibility → Display
2. Check "Reduce motion"

**iOS:**
1. Settings → Accessibility → Motion
2. Turn on "Reduce motion"

**Android:**
1. Settings → Accessibility → Remove animations
2. Turn on

Milonexa automatically detects this setting.

#### Method 2: Milonexa Settings

1. Go to **Settings → Accessibility**
2. Toggle **"Reduce Motion"**
3. All animations are disabled platform-wide

### Framer Motion Behavior

Milonexa uses Framer Motion for animations. When reduced motion is enabled:

```javascript
// With motion enabled
<motion.div
  initial={{ opacity: 0 }}
  animate={{ opacity: 1 }}
  transition={{ duration: 0.3 }}
>
  Content
</motion.div>

// With reduced motion enabled
// Animation is skipped, content appears instantly
```

### What Changes

When reduced motion is enabled:

- **Transitions**: Instant, no animation
- **Modals**: Appear immediately, no fade
- **Dropdowns**: Open instantly
- **Carousels**: No auto-scroll animation
- **Scrolling**: No smooth scroll
- **Hover effects**: Minimal or none
- **Loading**: Spinner spins without other animation

---

## Screen Reader Support

### Overview

Screen readers convert text to speech, allowing blind and low-vision users to access digital content.

### ARIA Implementation

Milonexa uses ARIA (Accessible Rich Internet Applications) labels on all interactive elements:

```html
<!-- Good -->
<button aria-label="Close menu">×</button>

<!-- Better -->
<button aria-label="Close menu" role="button">
  <span aria-hidden="true">×</span>
</button>
```

### Live Regions

Notifications and dynamic content are announced:

```html
<!-- Notifications announced to screen reader -->
<div aria-live="polite" aria-atomic="true">
  Message sent successfully
</div>
```

When new notifications appear, screen readers announce them automatically.

### Skip Navigation

Skip links at the top of each page:

```
[Skip to main content]
[Skip to navigation]
[Skip to search]
```

Press Tab at the top of the page to access skip links.

### Supported Screen Readers

Milonexa is tested with:

**Windows:**
- NVDA (free, open-source)
- JAWS (commercial)
- Narrator (built-in)

**macOS/iOS:**
- VoiceOver (built-in)

**Android:**
- TalkBack (built-in)

**Chrome:**
- ChromeVox (extension)

### Screen Reader Testing

- Manual testing with actual users
- Automated ARIA validation
- Regular audits with accessibility tools
- Ongoing improvements based on feedback

---

## Keyboard Navigation

### Full Keyboard Accessibility

All interactive elements are accessible via keyboard:

✓ **Can access:** All buttons, links, menus, forms
✓ **Can navigate:** Tab through interactive elements
✓ **Can operate:** Use keyboard to activate elements
✓ **Can close:** Press Escape to close dialogs

### Navigation Keys

| Key | Function |
|-----|----------|
| Tab | Move to next element |
| Shift+Tab | Move to previous element |
| Enter | Activate button or link |
| Space | Activate button or toggle checkbox |
| Escape | Close menu, dialog, or dropdown |
| Arrow Keys | Navigate menu items, sliders |

### Focus Management

Focus indicators show which element is active:

```
Default focus ring: Blue outline
High contrast mode: White/dark outline (thicker)
Color: Visible against all backgrounds
```

Click this button and press Tab to see focus:
```
[Button 1] [Button 2 - currently focused] [Button 3]
           ↑ Blue ring around this button
```

### Tab Order

Tab order follows logical reading order:

```
Page layout:
┌──────────────────────┐
│ [Search] [Logo]      │  ← Tab 1-3
├──────────────────────┤
│ [Nav] [Content]      │  ← Tab 4-10
│       [Content]      │
│       [Sidebar]      │  ← Tab 11-15
├──────────────────────┤
│ [Footer]             │  ← Tab 16-18
└──────────────────────┘
```

### Common Keyboard Shortcuts

**Navigation:**
- Ctrl/Cmd + `/`: Open command palette
- Ctrl/Cmd + K: Search
- Ctrl/Cmd + H: Home
- Ctrl/Cmd + U: Your profile

**Editor:**
- Ctrl/Cmd + B: Bold
- Ctrl/Cmd + I: Italic
- Ctrl/Cmd + U: Underline
- Ctrl/Cmd + Z: Undo
- Ctrl/Cmd + Shift + Z: Redo

**Lists/Menus:**
- Arrow Down: Next item
- Arrow Up: Previous item
- Home: First item
- End: Last item
- Enter: Select item

---

## Color Blind Support

### Overview

Approximately 8% of men and 0.5% of women have some form of color blindness.

### Types Supported

| Type | Prevalence | Challenge |
|------|-----------|-----------|
| Red-Green (Protanopia) | 1% | Can't see red |
| Red-Green (Deuteranopia) | 1% | Can't see green |
| Blue-Yellow (Tritanopia) | 0.001% | Can't see blue/yellow |
| Monochromacy (Achromatopsia) | Rare | See no color |

### Implementation

Milonexa avoids color-only information:

✓ **Good:**
```
Status: ✓ Approved (green checkmark + text)
Level: ⚠ Medium (icon + text label)
Rating: ★★★★☆ (stars + count: 4/5)
```

✗ **Bad:**
```
Status: [green cell] (only color indicates status)
Level: [medium blue indicator] (only color shows level)
```

### Charts & Graphs

Data visualizations use patterns, not just colors:

```
Sales by Quarter:
├─ Q1: 45% (blue, solid)
├─ Q2: 30% (blue, striped)
├─ Q3: 15% (blue, dotted)
└─ Q4: 10% (blue, hatched)
```

Each section has distinct patterns for clarity.

### Icons with Labels

All reaction icons include labels:

```
[👍 Like]   [❤️ Love]   [😂 Funny]   [😢 Sad]
Not just: [👍]        [❤️]         [😂]        [😢]
```

### Links vs Regular Text

Links are distinguished beyond color:

```
Regular: This is a link to our homepage.
         (blue text + underline, not just color)
```

---

## Glassmorphism Option

### Overview

Glassmorphism creates a "frosted glass" effect using:
- Backdrop blur
- Transparency
- Borders

Some users find this effect distracting or hard to read.

### Disabling Glassmorphism

1. Go to **Settings → Accessibility**
2. Toggle off **"Glassmorphism Effects"**
3. Frosted glass effects are disabled

### What Changes

**With glassmorphism:**
```
Modal: [Blurred background showing through semi-transparent window]
```

**Without glassmorphism:**
```
Modal: [White/dark solid background]
```

### Performance Note

Disabling glassmorphism also improves performance:
- Slightly faster rendering
- Reduced GPU usage
- Better on older devices

---

## Settings Location

### Main Accessibility Settings

**Option 1: Direct URL**
```
/settings/accessibility
```

**Option 2: Navigation**
1. Click your profile icon (top-right)
2. Select **"Settings"**
3. Navigate to **"Accessibility"**

### Settings Hub

Alternative path through Help Center:

1. Go to `/hubs/accessibility`
2. Click **"Settings"**
3. All accessibility options in one place

### Settings Overview

```
Accessibility Settings
─────────────────────────────────────────
Color Mode:              [System ▼]
  ☀️ Light    🌙 Dark    ⚙️ System

High Contrast Mode:      [Toggle]
Text Scaling:           [80% ─●─ 150%]
Font:                   [Default ▼]
  • Default
  • OpenDyslexic
  • Hyperlegible

Reduce Motion:          [Toggle]
Glassmorphism:          [Toggle]
Screen Reader Mode:     [Toggle]

[Get Help]  [Report Issue]  [Save Changes]
```

---

## Browser Zoom Support

### Zooming In/Out

Milonexa layout remains functional at up to 200% browser zoom:

**Zoom Controls:**
- Ctrl/Cmd + Plus: Zoom in (+10%)
- Ctrl/Cmd + Minus: Zoom out (-10%)
- Ctrl/Cmd + 0: Reset to 100%

### Responsive Layout

At different zoom levels:

```
100% zoom:  Three columns visible
120% zoom:  Two columns visible
150% zoom:  Single column layout
200% zoom:  Stacked layout, still usable
```

No content is cut off or hidden at any zoom level.

### Mobile Zoom

On mobile devices, Milonexa prevents pinch-zoom (can cause issues with touch controls), but respects system text scaling settings.

---

## Reporting Accessibility Issues

### Found a Problem?

Click **"Report Accessibility Issue"** in the Accessibility Hub:

```
Report Form
─────────────────────────────────────────
Issue Type:
  ○ Visual ○ Audio ○ Motor ○ Cognitive ○ Other

Description: [Describe the issue...]

Location: [URL or feature name]

Affected Screen Readers: [NVDA, JAWS, etc.]

Your Contact: [Email for follow-up]

[Submit Report]
```

### What Happens

1. Your report is reviewed by the accessibility team
2. Issue is reproduced and confirmed
3. Timeline assigned based on severity
4. You receive updates on the fix
5. Credit given in release notes (optional)

### Severity Levels

- **Critical**: Feature completely inaccessible
- **High**: Feature significantly harder to use
- **Medium**: Usable but not optimal
- **Low**: Minor improvement

### Response Timeline

- **Critical**: Fix within 48 hours
- **High**: Fix within 1 week
- **Medium**: Fix within 4 weeks
- **Low**: Fix in next update

---

## Tips for Accessible Use

### Get the Most Out of Accessibility Features

1. **Try different settings**: Find what works best for you
2. **Combine features**: Dark mode + high contrast + larger text
3. **Use keyboard shortcuts**: Faster navigation
4. **Enable screen reader**: Most comprehensive experience
5. **Report issues**: Help improve for everyone

### Temporary Accessibility

If you're temporarily disabled:
- Broken arm? Try keyboard-only navigation
- Eye surgery recovery? Use dark mode + text scaling
- Migraine? Reduce motion + dark mode
- Sick? Use larger text for easier reading

All accessibility features are available without permanent account changes.

---

## Testing & Standards

### Automated Testing

Milonexa uses automated tools:

- **Axe**: WCAG compliance checking
- **Lighthouse**: Google accessibility audits
- **WAVE**: WebAIM accessibility validation
- **Pa11y**: Command-line testing

### Manual Testing

Regular manual testing with:

- Actual users with disabilities
- Screen reader users (NVDA, JAWS, VoiceOver)
- Keyboard-only navigation users
- Low-vision users

### Continuous Improvement

- Monthly accessibility reviews
- Quarterly user testing sessions
- Community feedback integration
- Annual third-party audit

---

## Resources & References

### External Resources

- **WebAIM**: Web Accessibility In Mind
  https://webaim.org

- **WCAG Guidelines**: Official standard
  https://www.w3.org/WAI/WCAG21/quickref/

- **Accessibility Guidelines**: HTML standards
  https://www.w3.org/WAI/

- **A11y Project**: Community resource
  https://www.a11yproject.com

- **Dyslexia Help**: Font and resources
  https://www.dyslexiahelp.umich.edu

- **Braille Institute**: Hyperlegible font
  https://www.brailleinstitute.org

### Assistive Technology

- **NVDA**: Free screen reader
  https://www.nvaccess.org

- **JAWS**: Commercial screen reader
  https://www.freedomscientific.com

- **ChromeVox**: Chrome extension
  https://chrome.google.com/webstore

- **Accessibility Checker**: Browser extension
  https://www.w3.org/WAI/test-evaluate/

---

## Need Help?

- **Accessibility Hub**: `/hubs/accessibility`
- **Report Issue**: Button in Accessibility Settings
- **Support Ticket**: `/hubs/helpcenter#support`
- **Community Forum**: `/hubs/forum#accessibility`
- **Direct Contact**: accessibility@milonexa.app

Last updated: 2024-01-15
