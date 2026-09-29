# WiseVision design system (W1)

Direction: **cinematic-technical**. Near-black canvas, one electric accent, big display type, scroll-story.
Think Linear / Vercel / Anduril, with a robotics (RViz) flavour. We keep the WiseVision logo and name.

## Single source of truth

```
src/styles/tokens.source.json   <- edit this
        │  npm run tokens  (scripts/build-tokens.mjs)
        ├─> src/styles/tokens.css   CSS custom properties (site + HyperFrames templates import this)
        └─> src/styles/tokens.json  nested + flat values (JS consumers, e.g. the three.js hero)
```

Never hand-edit `tokens.css` / `tokens.json`; CI fails if they drift from the source.
HyperFrames templates: `@import url('<path-to-site>/src/styles/tokens.css');` then use `var(--color-accent)` etc.

Custom property names are the flattened JSON path (`DEFAULT` collapses): `color.text.DEFAULT` → `--color-text`,
`color.accent.text` → `--color-accent-text`, `motion.ease.reveal` → `--motion-ease-reveal`.

## Palette

| Token | Hex | Use |
|---|---|---|
| `--color-bg-base` | `#07080B` | page base |
| `--color-bg-raised` | `#0B0E14` | end of page gradient, raised panels |
| `--color-bg-surface` | `#11151D` | cards, code blocks |
| `--color-bg-line` | `#1C222C` | hairlines, borders (not for text) |
| `--color-text` | `#F2F5F7` | primary text |
| `--color-text-muted` | `#A3ACB9` | secondary text, ledes |
| `--color-text-subtle` | `#7D8795` | captions, metadata (base/raised only) |
| `--color-accent` | `#3CFFB4` | fills, signal paths, primary CTA background, large text |
| `--color-accent-text` | `#2EE6A0` | small accent text (eyebrows, links) |
| `--color-accent-ink` | `#04110C` | text ON the accent (CTA labels) |
| `--color-danger` | `#FF6B6B` | errors |

**One accent.** `#3CFFB4` is the only saturated colour on the page (the logo's blues are the brand exception).
The hero's fleet, signal path and LaserScan ring use it; nothing else competes.

### Contrast gate
Every text/background combination we use is declared in `tokens.source.json → pairs`.
`npm run contrast` (scripts/contrast-check.mjs) fails CI below WCAG AA: 4.5:1 normal, 3:1 for pairs marked `"size": "large"`.
Adding a new text colour or surface? Add its pairs first. Current worst pair: `text.subtle` on `bg.raised` at 5.31:1.

## Type

| Role | Family | Token |
|---|---|---|
| Display (h1–h3, hero) | Space Grotesk 700 (latin subset, self-hosted, preloaded) | `--font-display` |
| Body | Inter Variable | `--font-body` |
| Code, eyebrows | JetBrains Mono Variable | `--font-mono` |

All fonts are self-hosted via `@fontsource` (`font-display: swap`); no third-party font CDN.
Scale: `--size-xs … --size-2xl`, fluid `--size-3xl` (page h1) and `--size-display` (hero, up to 6.5rem).
Display tracking `-0.035em`, leading `1.02`. Eyebrows: mono, uppercase, `0.12em` tracking, `--color-accent-text`.

## Spacing, radii, layout
4px base: `--space-1` (4px) … `--space-32` (128px). Sections breathe: `--space-24` vertical.
Radii: `sm 6 · md 10 · lg 16 · pill`. Max content width `1200px`; gutter fluid `1.25–2.5rem`; header `64px`.

## Motion

| Token | Value |
|---|---|
| `--motion-duration-reveal` | `700ms` |
| `--motion-ease-reveal` | `cubic-bezier(.16,1,.3,1)` |
| `--motion-duration-fast / base` | `160ms / 300ms` |
| `--motion-distance-reveal` | `24px` |

Rules:
- **Animate transform and opacity only.** No animating layout, filter, or blur.
- **Lenis is the only scroll loop** (`src/scripts/motion.ts`, one global instance on `window.__lenis`). Scroll-driven
  effects (the hero) subscribe to it; never add a second `requestAnimationFrame` scroll listener.
- **Reveal utility:** add `data-reveal` (optionally `style="--reveal-i:N"` to stagger 80ms per step). Content is visible without JS.
- **`prefers-reduced-motion: reduce` turns everything off:** Lenis is not started, reveals render in place,
  motion duration tokens collapse to `0ms`, and the hero must show its static poster.

## Logo
`src/assets/logo.svg` (full colour for dark backgrounds: official swirl blues, wordmark in `--color-text`),
`src/assets/logo-mono.svg` (single ink via `currentColor`; the inner swirl uses `var(--logo-cut)` so it knocks out to the background),
`public/favicon.svg` (mark only). Paths are the original 2021 Illustrator artwork, cropped to the artboard (the A4 page
viewBox and clip-path wrapper were removed). Do not redraw, recolour the mark beyond these variants, or stretch it.

## Do / don't
- Do: one dominant CTA ("Try ROS2 MCP") per view, in `--color-accent` with `--color-accent-ink` text.
- Do: large display type with generous negative space; hairline `--color-bg-line` dividers.
- Do: declare a contrast pair before shipping any new text/background combination.
- Don't: introduce a second accent, gradients in the accent, glows on body text, or glassmorphism.
- Don't: use `--color-accent` for small body text (use `--color-accent-text`).
- Don't: animate anything that isn't transform/opacity, or ship motion that ignores reduced-motion.
- Don't: show people, star/clone/pull counts, or third-party trackers.
