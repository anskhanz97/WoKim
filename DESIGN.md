---
name: WoKim Work Constellation
description: A dimensional private workspace where active projects, decisions, voice, and evidence remain visibly connected.
colors:
  constellation-cobalt: "#5146e5"
  ultraviolet: "#8b5cf6"
  signal-cyan: "#10bde8"
  checkpoint-coral: "#ff6b71"
  attention-amber: "#f0a126"
  midnight-navy: "#11152f"
  working-ink: "#12142a"
  quiet-slate: "#5f6680"
  atmospheric-paper: "#f4f5fb"
  sheet: "#ffffff"
  soft-violet: "#eeecff"
  rule: "#dde1ec"
typography:
  display:
    fontFamily: "Manrope Variable, IBM Plex Sans Variable, sans-serif"
    fontSize: "clamp(2rem, 4vw, 5.3rem)"
    fontWeight: 750
    lineHeight: 1
    letterSpacing: "-0.045em"
  body:
    fontFamily: "IBM Plex Sans Variable, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.55
  label:
    fontFamily: "IBM Plex Sans Variable, Segoe UI, sans-serif"
    fontSize: "0.78rem"
    fontWeight: 700
    lineHeight: 1.2
  mono:
    fontFamily: "IBM Plex Mono, monospace"
    fontSize: "0.72rem"
    fontWeight: 700
    lineHeight: 1.2
rounded:
  control: "0.65rem"
  surface: "1rem"
  hero: "1.5rem"
  pill: "999px"
spacing:
  xs: "0.35rem"
  sm: "0.65rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2.5rem"
components:
  button-primary:
    backgroundColor: "{colors.constellation-cobalt}"
    textColor: "{colors.sheet}"
    rounded: "{rounded.control}"
    padding: "0.75rem 1rem"
  card:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.working-ink}"
    rounded: "{rounded.surface}"
    padding: "1.25rem"
  status-chip:
    backgroundColor: "{colors.soft-violet}"
    textColor: "{colors.constellation-cobalt}"
    rounded: "{rounded.pill}"
    padding: "0.25rem 0.55rem"
---

# Design System: WoKim Work Constellation

## Overview

**Creative North Star: "Work Constellation"**

WoKim is a private developer workspace where projects appear as connected worlds rather than rows in a notebook. Deep indigo space, luminous paths, evidence planes, and compact human nodes make context visible, while standard navigation and forms keep daily operation immediate.

The interface is calm but energized: cinematic at the first viewport, structured and legible in working screens, and never dependent on color alone for meaning. Density increases below the hero; depth and differentiation keep lists from becoming monotonous.

**Key Characteristics:**

- Dimensional midnight navigation with a bright, connected content field.
- Manrope display type paired with workmanlike IBM Plex Sans body copy.
- Cobalt-to-violet actions, cyan information signals, and coral attention markers.
- Real evidence and generated product artwork instead of generic decoration.
- A single current thread remains visible across the workspace.

## Colors

The palette moves from midnight indigo to luminous cobalt, cyan, violet, and restrained warm signals over a cool atmospheric paper.

### Primary

- **Constellation Cobalt:** Primary actions, active navigation, focus paths, and interactive links.
- **Ultraviolet:** Gradient depth and secondary energy; it supports cobalt rather than competing with it.

### Secondary

- **Signal Cyan:** Informational states, audio/processing cues, and luminous connection points.
- **Checkpoint Coral:** Deadlines, urgent attention, and warm counterpoint in project art.

### Tertiary

- **Attention Amber:** Interrupted work and pending decisions where coral would overstate urgency.

### Neutral

- **Midnight Navy:** Navigation, dark hero fields, and high-focus panels.
- **Working Ink:** Primary copy and dense work content.
- **Quiet Slate:** Metadata and explanatory copy.
- **Atmospheric Paper:** App background with low-opacity radial light.
- **Sheet:** Reading, forms, and raised work surfaces.

**The Luminous Minority Rule.** Bright hues identify activity and connection; most working surface area remains neutral and readable.

## Typography

**Display Font:** Manrope Variable (with IBM Plex Sans fallback)
**Body Font:** IBM Plex Sans Variable (with Segoe UI fallback)
**Label/Mono Font:** IBM Plex Mono

**Character:** Manrope gives major moments contemporary confidence and rounded clarity. IBM Plex Sans keeps forms and dense task content practical; mono is limited to technical or state metadata.

### Hierarchy

- **Display** (750, responsive clamp, tight leading): Hero greetings and page-defining statements.
- **Headline** (700–750, responsive): Page and major section titles.
- **Title** (650–750, 1.1–1.55rem): Cards, tasks, and named work objects.
- **Body** (400–600, 1rem, 1.55): Descriptions and editable work content.
- **Label** (650–750, 0.72–0.82rem): Controls and compact metadata; sentence case is preferred.

**The Two-Speed Type Rule.** Display type creates entry-point emotion; body type returns immediately to efficient reading.

## Layout

Desktop uses a fixed 17rem midnight rail, a slim current-focus strip, and centered work canvases from 58–76rem. Today opens with a wide 3:2 visual hero and then moves into an asymmetric signal-and-work grid. Project cards use a two-column gallery; forms and detailed histories use narrower reading columns.

Below 760px, the rail becomes a compact top identity bar and floating bottom dock. Content collapses to one column, project tabs scroll within their own container, and capture becomes a bottom sheet. Page padding ranges from 1rem on phones to roughly 3.6rem on wide screens.

## Elevation & Depth

Depth is atmospheric and structural. Radial page light, translucent sheets, soft ambient shadows, image planes, and overlapping hero/current-thread cards establish three layers without imitating a physical desktop.

### Shadow Vocabulary

- **Ambient Low:** `0 8px 24px rgba(35, 31, 87, .08)` for quiet controls and list surfaces.
- **Work Surface:** `0 18px 48px rgba(35, 31, 87, .13)` for cards that organize a page.
- **Modal Depth:** `0 30px 90px rgba(14, 16, 45, .3)` for capture and temporary focus layers.

**The Three-Layer Rule.** A screen may combine ground, work surface, and one elevated focus layer; further shadow stacking is noise.

## Shapes

Controls use gently curved 0.65rem corners, recurring work surfaces use 1rem, and cinematic heroes or sheets reach 1.5rem. Status is pill-shaped. Circular orbit lines and glowing nodes appear only in project visuals and brand moments; they do not replace ordinary controls.

## Components

### Buttons

- **Shape:** Tactile rounded rectangle with 0.65–0.85rem corners.
- **Primary:** Cobalt-to-violet gradient, white text, and a restrained colored shadow.
- **Hover / Focus:** Ambient lift on hover, one-pixel press on active, and a visible violet focus ring.
- **Secondary:** White or translucent dark surface with a visible border and explicit label.

### Chips

- **Style:** Pale violet or translucent dark capsule with compact label text.
- **State:** Color reinforces a written type or status; it never replaces the word.

### Cards / Containers

- **Corner Style:** 1–1.3rem curves with clipped project artwork where present.
- **Background:** Mostly translucent white over atmospheric paper; dark gradients are reserved for focus and daily clarity.
- **Shadow Strategy:** Ambient by default, stronger only for hero-adjacent or modal surfaces.
- **Border:** Low-contrast white or cool-violet edge.
- **Internal Padding:** Usually 1–1.5rem.

### Inputs / Fields

- **Style:** White field, cool border, 0.65–0.9rem corners; selects use a consistent cobalt chevron.
- **Focus:** Cobalt border with a soft four-pixel violet halo.
- **Error / Disabled:** Written message plus semantic color; disabled controls remain legible.

### Navigation

The desktop rail is midnight navy with Lucide line icons and a violet active block. Mobile uses a floating dark dock with a raised gradient capture action. Project sub-navigation is quiet, horizontally scrollable on small screens, and uses a cobalt underline for location.

### Current Thread

The cross-screen focus strip links the active task with pause, wait, and finish actions. On Today, the same thread overlaps the hero as a luminous raised surface, turning continuity into the signature interaction.

## Do's and Don'ts

### Do:

- **Do** give every major screen one clear visual anchor before dense work content begins.
- **Do** use Lucide icons with labels for navigation and consequential actions.
- **Do** preserve real screenshots, captions, OCR text, and source relationships as first-class visual evidence.
- **Do** keep responsive behavior functional down to 320px and respect reduced-motion preferences.

### Don't:

- **Don't** return to uninterrupted white rows, thin rules, and table-first layouts as the dominant experience.
- **Don't** fill pages with equal generic cards; vary hierarchy according to work state and importance.
- **Don't** use gradients, orbit geometry, or 3D art without a work-memory meaning.
- **Don't** hide state behind color, icon-only actions, or hover-only information.
