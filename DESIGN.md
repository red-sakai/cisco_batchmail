---
name: BatchMail
description: A galaxy-purple working tool for sending personalized bulk email, where every recipient is a star.
colors:
  sky: "#270a30"
  nebula-a: "#5a2299"
  nebula-b: "#7a1f7c"
  nebula-c: "#43208f"
  planet-rim: "#b79bff"
  planet-body: "#4a2390"
  planet-core: "#1c0a30"
  surface: "#241540"
  surface-2: "#2e1b4f"
  surface-3: "#3a2460"
  foreground: "#f4effc"
  muted: "#c4b9dd"
  subtle: "#a99cc9"
  line: "#4a3376"
  line-strong: "#8069b5"
  accent: "#7446f5"
  accent-strong: "#6233e0"
  accent-ink: "#cdbcff"
  accent-soft: "#3a2170"
  on-accent: "#ffffff"
  star: "#ffd98a"
  on-star: "#2a1a00"
  success: "#7ee2b0"
  warn: "#ffd166"
  warn-soft: "#33270f"
  warn-line: "#6b5213"
  danger: "#ff8fa3"
  danger-soft: "#3a1225"
  danger-line: "#7a2a45"
  shell: "#33176f"
  shell-line: "#4f2f96"
  on-shell: "#f4efff"
  on-shell-muted: "#c4b8e6"
  sky-light: "#ece6fa"
  nebula-a-light: "#d8c6ff"
  nebula-b-light: "#f5cfee"
  nebula-c-light: "#c9d2ff"
  planet-rim-light: "#efe6ff"
  planet-body-light: "#b9a3f0"
  planet-core-light: "#8f74dc"
  surface-light: "#ffffff"
  surface-2-light: "#f5f1fd"
  surface-3-light: "#e9e2f8"
  foreground-light: "#1d1238"
  muted-light: "#574a78"
  subtle-light: "#6f628f"
  line-light: "#dcd3f0"
  line-strong-light: "#8d7db5"
  accent-light: "#6d3df0"
  accent-strong-light: "#5a2dd6"
  accent-ink-light: "#5a2dd6"
  accent-soft-light: "#eee8ff"
  star-light: "#c08400"
  success-light: "#0f7a4f"
  warn-light: "#8a5a00"
  warn-soft-light: "#fff4d6"
  warn-line-light: "#ecd08a"
  danger-light: "#b4234a"
  danger-soft-light: "#ffe9ee"
  danger-line-light: "#f5b9c8"
  shell-light: "#2c1868"
  shell-line-light: "#452c8f"
  on-shell-muted-light: "#cabdeb"
  night: "#1a0a30"
  night-ink: "#efe9fb"
  star-pending: "#9d8fc7"
  star-failed: "#ff5c7f"
  paper: "#ffffff"
  paper-ink: "#111827"
typography:
  display:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 600
    lineHeight: 1.2
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.556
  stat:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.25
    fontFeature: "tnum"
  body:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.429
  prose:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.9375rem"
    fontWeight: 400
    lineHeight: 1.65
  label:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.333
  caption:
    fontFamily: "Geist, Arial, Helvetica, sans-serif"
    fontSize: "11px"
    fontWeight: 400
    lineHeight: 1.25
  mono:
    fontFamily: "Geist Mono, monospace"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.333
rounded:
  xs: "0.25rem"
  sm: "0.375rem"
  md: "0.5rem"
  tab: "0.5625rem"
  lg: "0.75rem"
  xl: "0.875rem"
  2xl: "1rem"
  pill: "999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "12px"
  lg: "16px"
  xl: "20px"
  2xl: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "2.25rem"
  button-primary-hover:
    backgroundColor: "{colors.accent-strong}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "2.25rem"
  button-secondary-hover:
    backgroundColor: "{colors.surface-3}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-ghost-hover:
    backgroundColor: "{colors.accent-soft}"
  button-danger-hover:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
  button-shell:
    backgroundColor: "transparent"
    textColor: "{colors.on-shell}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
  button-shell-hover:
    backgroundColor: "{colors.shell-line}"
  input:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    typography: "{typography.body}"
    rounded: "{rounded.md}"
    padding: "6px 12px"
    height: "2.25rem"
  chip:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.muted}"
    typography: "{typography.label}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-accent:
    backgroundColor: "{colors.accent-soft}"
    textColor: "{colors.accent-ink}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-warn:
    backgroundColor: "{colors.warn-soft}"
    textColor: "{colors.warn}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  chip-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.pill}"
    padding: "4px 10px"
  card:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.xl}"
  modal:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.foreground}"
    rounded: "{rounded.2xl}"
  notice-danger:
    backgroundColor: "{colors.danger-soft}"
    textColor: "{colors.danger}"
    rounded: "{rounded.md}"
    padding: "8px 12px"
  app-header:
    backgroundColor: "{colors.shell}"
    textColor: "{colors.on-shell}"
  rail:
    backgroundColor: "{colors.surface}"
    rounded: "{rounded.xl}"
    padding: "6px"
  rail-tab-selected:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.on-accent}"
    rounded: "{rounded.tab}"
    padding: "8px 12px"
  rail-node-done:
    backgroundColor: "{colors.star}"
    textColor: "{colors.on-star}"
    size: "1.75rem"
  send-sky:
    backgroundColor: "{colors.night}"
    rounded: "{rounded.lg}"
    padding: "16px"
  send-star-sent:
    backgroundColor: "{colors.star}"
    size: "1.25rem"
  send-star-failed:
    backgroundColor: "{colors.star-failed}"
    size: "1.25rem"
  code-editor:
    backgroundColor: "{colors.night}"
    textColor: "{colors.night-ink}"
    typography: "{typography.mono}"
    rounded: "{rounded.lg}"
  email-surface:
    backgroundColor: "{colors.paper}"
    textColor: "{colors.paper-ink}"
    rounded: "{rounded.md}"
---

# Design System: BatchMail

## Overview

**Creative North Star: "Every Recipient Is a Star"**

BatchMail is a working tool under a night sky. A deep aubergine sky drifts behind solid violet-tinted cards, and the sky stays behind the task until a batch goes out. Then the one signature moment arrives: each recipient is a star, grouped into small constellations by batch, and each star lights as its email leaves. Gold means it went out. Rose means it did not.

The theme lives in the world, not on the controls. Buttons, inputs, tabs, and tables stay standard and legible, set in Geist, on opaque surfaces at a compact working density. The system refuses a glassy dark dashboard with neon edges, and it refuses space costume on the controls.

Dark is the default. The server renders the dark class on the root element, a script that runs before paint removes it when `batchmail_dark` is saved as `0` in localStorage, and the header toggle writes that key. Light mode is the same world at dawn: a lavender sky, white cards, the same deep violet header. Motion has three speeds. The sky moves on transform and opacity alone, over 70 to 720 seconds, with a 7 to 9 second twinkle. Interface transitions run 150 to 280ms. Completion runs longer: the rail connector and the progress bar fill over 420ms, and ignite takes 520 to 700ms. All of this CSS motion stops under prefers-reduced-motion, where the sky holds still and the interface changes state without travel.

**Key Characteristics:**
- Dark by default, with a lavender light mode behind one toggle.
- A living sky behind opaque working surfaces.
- One saturated ultraviolet for action, one gold for done, one rose for failure.
- Geist throughout, Geist Mono for code, variables, and logs.
- Email surfaces stay as recipients will see them, outside the theme.

## Colors

A violet world with two signal colors held in reserve. Every token has a dark value and a `-light` counterpart, except those that keep one value in both modes.

### Primary
- **Ultraviolet** (#7446f5 dark, #6d3df0 light): the primary button, the selected step, the checked segment. Always carries white text.
- **Deep Ultraviolet** (#6233e0 dark, #5a2dd6 light): the hover state of primary actions.
- **Lilac Ink** (#cdbcff dark, #5a2dd6 light): violet as text and line, for ghost buttons, focus rings, input hover, the caret, and list markers.
- **Violet Wash** (#3a2170 dark, #eee8ff light): ghost hover, accent chips and notices, the active drop zone.

### Secondary
- **Starlight Gold** (#ffd98a dark, #c08400 light): done and delivered, and nothing else. Finished step nodes, filled step connectors, the sent part of the progress bar, and lit stars. Text on it is always Star Ink (#2a1a00).

### Tertiary
- **Failure Rose** (#ff8fa3 dark, #b4234a light): failed counts, failed bar segments, unknown variables, sign-in errors, and destructive hover. Its soft fill (#3a1225 dark, #ffe9ee light) and line (#7a2a45 dark, #f5b9c8 light) build chips and notices.
- **Caution Amber** (#ffd166 dark, #8a5a00 light): warnings that do not stop the task, always as text on its soft fill (#33270f dark, #fff4d6 light) inside its line (#6b5213 dark, #ecd08a light), or as plain text.
- **Log Mint** (#7ee2b0 dark, #0f7a4f light): the word "sent" in the send log's status column. It has no other use.

### Neutral
- **Aubergine Sky** (#270a30 dark) and **Lavender Sky** (#ece6fa light): the page behind everything, under three nebula gradients (#5a2299, #7a1f7c, #43208f dark; #d8c6ff, #f5cfee, #c9d2ff light).
- **Violet Surfaces** (#241540, #2e1b4f, #3a2460 dark; #ffffff, #f5f1fd, #e9e2f8 light): cards at the base step, table headers and chips at the second, hover and progress tracks at the third.
- **Starwhite** (#f4effc dark, #1d1238 light), **Haze** (#c4b9dd dark, #574a78 light), and **Far Haze** (#a99cc9 dark, #6f628f light): primary, secondary, and tertiary text.
- **Hairline** (#4a3376 dark, #dcd3f0 light) and **Control Line** (#8069b5 dark, #8d7db5 light): card and divider borders, then control borders that must hold at least 3:1 against the card.
- **Header Violet** (#33176f dark, #2c1868 light): the app header in both modes, with its line (#4f2f96 dark, #452c8f light) and text (#f4efff, with #c4b8e6 dark and #cabdeb light for secondary).
- **Planet tones** (#b79bff, #4a2390, #1c0a30 dark; #efe6ff, #b9a3f0, #8f74dc light): the sign-in horizon only.
- **Night** (#1a0a30) and **Night Ink** (#efe9fb): the send sky and the raw HTML editor, which stay dark in both modes. Unlit stars use #9d8fc7 and failed stars glow #ff5c7f.
- **Paper** (#ffffff) and **Paper Ink** (#111827): the email editor and the preview frame's backing, which stay light in both modes.

### Named Rules
**The Starlight Rule.** Gold means done or delivered. Primary actions, hover states, highlights, and warnings never use it, so a gold mark always means work is finished.

**The Equal Failure Rule.** A failed recipient gets the same star size, the same ignite, and a place in the same bar as a delivered one, in rose. Failures are never quieter than successes.

**The Recipient's View Rule.** The email editor and preview show the message as recipients will see it, so they stay light in dark mode and take no theme color. Outgoing templates are not part of this design system.

## Typography

**Display Font:** Geist (with Arial, Helvetica, sans-serif)
**Body Font:** Geist (with Arial, Helvetica, sans-serif)
**Label/Mono Font:** Geist Mono (with monospace)

**Character:** One plain, exact grotesque carries everything, so the sky can be the expressive part. Mono marks what is literal: code, template variables, and send logs.

### Hierarchy
- **Display** (600, 1.875rem, 1.2, -0.025em): the page title on open sky.
- **Headline** (600, 1.125rem, 1.556): card and section titles.
- **Stat** (600, 1.25rem, 1.25, tabular numerals): review figures for recipients, batches, attachments, and sender.
- **Body** (400, 0.875rem, 1.429): the working size, for controls, tables, and guidance.
- **Prose** (400, 0.9375rem, 1.65, 72ch maximum): the Help tab only, with its own headings at 1.625rem, 1.125rem, and 0.9375rem.
- **Label** (500, 0.75rem, 1.333): field labels, chips, and notices, in sentence case.
- **Caption** (400, 11px, 1.25): step rail subtext and the sign-in footnote.
- **Mono** (400, 0.75rem, 1.333): the send log and variable chips, with the raw HTML editor sized by its own zoom control.

### Named Rules
**The Literal Mono Rule.** Mono appears only on text that is literally data or code. It is never decoration.

## Layout

One centered column, 72rem at most, with 16px page padding that grows to 24px from 640px. Sections stack 20px apart and cards sit 16px apart. The order on every step is the title block on open sky, the step rail, then solid cards holding the work. The review stats move from two columns to four at 768px, and the working grids (five columns on review, three on the template library) start at 1024px, with the template list sticking below the header.

The header sticks to the top. On the review step, once sending is possible, the action bar sticks 16px above the bottom edge, so Send and any warning stay in view. Below 640px the rail keeps every step visible as a node and labels only the current one. On coarse pointers, buttons grow from 36px to 44px, and small buttons from 28px to 36px.

**The Clear Title Rule.** The star layers are masked out of the top 10.5rem of the content column, so no star reads as punctuation beside the title.

## Elevation & Depth

Depth comes from the layering of sky, opaque surface, and hairline border, with a soft shadow only to lift a surface from the sky. Shadows are tinted from a per-mode color (near-black violet in dark, mid violet in light), and they never glow. No surface is translucent. The dialog scrim is a 78 percent mix of the sky, with no blur.

### Shadow Vocabulary
- **Card** (`box-shadow: 0 8px 24px -14px rgb(var(--shadow-color) / 0.55)`): every card, including menus and the sticky action bar.
- **Tour popover** (`box-shadow: 0 16px 40px -16px rgb(var(--shadow-color) / 0.8)`): guided tour steps.
- **Modal** (`box-shadow: 0 24px 60px -20px rgb(var(--shadow-color) / 0.8)`): dialogs, the top of the stack.

### Named Rules
**The Solid Surface Rule.** Working surfaces are opaque, so text contrast never depends on where a star happens to drift. No backdrop blur and no glass.

## Shapes

Soft, consistent corners that grow with the size of the container: 4px on inline code, 6px on segments and the logo chip, 8px on buttons, inputs, and notices, 9px on rail tabs nested in the 14px rail, 12px on drop zones and the send sky, 14px on cards, 16px on dialogs. Chips and progress bars are full pills. Circles are reserved for the things that are stars or bodies: step nodes, send stars, the planet, and the orbit. Borders are 1px throughout, dashed only on the drop zone.

## Components

### Buttons
Standard, quiet, and unthemed, with a small press.
- **Shape:** gently curved (8px), 36px tall, 28px when small, square when icon-only.
- **Primary:** Ultraviolet with white text at weight 600.
- **Hover / Focus:** background shifts over 150ms, press scales to 0.97, and focus is a 2px Lilac Ink ring offset 2px. The Send icon lifts 2px up and to the right on hover over 200ms.
- **Secondary:** surface fill with a Control Line border, moving to the third surface step on hover.
- **Ghost:** transparent with Lilac Ink text, Violet Wash on hover.
- **Danger:** looks secondary at rest and turns rose only on hover.
- **Header:** transparent with the header line and on-header text.

### Chips
- **Style:** full pills at Label size with a 1px border, on the second surface step.
- **State:** accent for confirmed checks, amber for warnings, rose for errors, and transparent in the header. Variable chips in the review step use mono with 6px corners and turn rose when the variable is unknown.

### Cards / Containers
- **Corner Style:** softly rounded (14px).
- **Background:** the base surface, always opaque.
- **Shadow Strategy:** the Card shadow from Elevation & Depth.
- **Border:** 1px Hairline.
- **Internal Padding:** 12px on bars, 20px on content, up to 32px on the sign-in card.

### Inputs / Fields
- **Style:** 1px Control Line on the base surface, 8px corners, 36px tall, Far Haze placeholder.
- **Focus:** the global 2px Lilac Ink ring. Hover moves the border to Lilac Ink over 150ms.
- **Error / Disabled:** errors appear as a rose notice near the field. Disabled controls drop to 50 percent opacity with a not-allowed cursor.

### Navigation
The Step Rail is the navigation: a 14px-rounded surface bar holding numbered steps joined by short connectors, with Help set apart at the far end. A solid Ultraviolet indicator slides to the selected tab over 280ms. Each step's node is a 28px circle showing its number, then a lock when locked, then a check on gold when done, and the connector fills with gold from the left over 420ms when its step completes. Pressing a locked step shows an amber notice explaining why.

The app header is a sticky Header Violet band in both modes, holding the CNCP logo (`public/cncp-white.png`), the product and organization names, and the sign-out and theme controls.

### Notices
Compact 8px-rounded blocks at 0.75rem with accent, amber, or rose variants. They rise in over 220ms.

### Segments
The batch size control: a Control Line outlined track with faces that fill Ultraviolet when checked, with tabular numerals.

### Drop Zone
A dashed Control Line container at 12px corners. On hover or drag it fills with Violet Wash and its icon lifts 3px.

### Dialogs
A 16px-rounded surface with a Control Line border, entering over 240ms with a 10px rise and a slight scale, over a sky-tinted scrim that fades in over 180ms.

### Send Constellation
The signature. A panel of Night holds one star per recipient, joined by a faint line within each batch and offset vertically so each batch reads as a small constellation. Stars wait in pale violet, pulse white while their batch sends, and ignite into gold or rose from the live send log over 560ms. When a whole run finishes clean, every star answers once in a staggered 700ms ignite. It stays Night in both modes and is hidden from assistive technology, because the counts and log beside it carry the same information.

### Sky and Sign-in
Every page sits on the fixed, decorative sky: three drifting nebula gradients and four tiled vector star layers. Only the sign-in page adds a planet horizon that rises over 1100ms and one moon on an 80-second orbit, around a card that enters over 520ms.

### Icons
Inline SVG icons drawn in the current text color, mostly from one filled 20px-grid set. Icons are functional, never decorative.

## Do's and Don'ts

### Do:
- **Do** reserve Starlight Gold for finished steps and delivered email, with Star Ink on any gold fill.
- **Do** show every failure in Failure Rose beside a count or message that stays findable after the run.
- **Do** keep working surfaces opaque, with the sky visible only in the gaps between them.
- **Do** animate the sky with transform and opacity only, and keep interface transitions within 150 to 280ms.
- **Do** gate every new animation, including scripted scrolling, so it stops under prefers-reduced-motion.
- **Do** define new colors as a dark and light pair in both theme blocks.
- **Do** keep the CNCP logo on a Header Violet chip in light mode, because it is white with a cyan glow and washes out on light grounds, and keep the name "Cisco NetConnect PUP · Manila" in the header.

### Don't:
- **Don't** use glass, backdrop blur, or glowing borders on the interface. The only glow in the system belongs to send stars.
- **Don't** dress controls as space objects. Buttons, inputs, tabs, and tables stay standard, and the theme stays in the sky and the constellation.
- **Don't** use gold for primary actions, hover states, or warnings.
- **Don't** theme the email editor or preview, or apply these tokens to outgoing templates.
- **Don't** let stars drift behind the page title block.
- **Don't** add planets or orbits to the working app. They belong to sign-in.
