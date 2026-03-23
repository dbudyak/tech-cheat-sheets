# Mobile Responsive Design Spec

## Goal

Make `index.html` usable on phones (≤640px) without changing the desktop layout.

## Scope

- Breakpoint: `max-width: 640px` only
- No tablet-specific layout
- No changes to desktop CSS or JS behaviour

---

## Layout

### Desktop (>640px) — unchanged

`body` is `display: flex` (row). Sidebar is fixed 220px. `#main` is `flex: 1`.

### Mobile (≤640px)

`body` switches to `flex-column`. The sidebar is hidden off-screen by default (`transform: translateX(-100%)`). A sticky top bar is added above `#main`.

---

## Top Bar

- Height: 44px
- Background: `#161b22` (same as sidebar)
- Border-bottom: `1px solid #30363d`
- Left: `☰` hamburger button (tapping opens sidebar overlay)
- Center: active language name (e.g. "Kotlin", "Go", "Java") — updated by JS when tab is switched

The top bar is a new `<div id="topbar">` inserted before `#sidebar` in the DOM.

---

## Sidebar Overlay

When open (`body.sidebar-open`):
- Sidebar becomes a fixed full-screen overlay (100vw × 100vh, `z-index: 200`)
- Slides in from the left via CSS transition (`transform: translateX(0)`)
- Lang tabs and cat-links render exactly as on desktop
- A close button (`✕`) appears in the top-right corner of the sidebar

### Closing the overlay

- Tapping `✕`
- Tapping any `.cat-link` (then scrolling proceeds normally)
- Tapping a semi-transparent backdrop `<div id="overlay-backdrop">` that covers the rest of the screen when the sidebar is open

---

## Content Area (#main)

- `#main` becomes full width (`width: 100%`)
- Horizontal padding: `12px` (down from `32px`)
- `padding-top: 44px` added so content is not hidden under the top bar (top bar is `position: sticky` on the stacking context, so top padding on `#main` achieves the offset)

Code snippets already have `overflow-x: auto` — no change needed.

---

## JS Additions

1. **Toggle overlay**: hamburger click → add `sidebar-open` to `<body>`; close button / backdrop click → remove it
2. **Close on nav**: `.cat-link` click on mobile → remove `sidebar-open` from `<body>`
3. **Update top bar label**: when a `.lang-tab` is clicked → update `#topbar-lang` text to the tab's text content

All new JS is guarded by a `window.matchMedia('(max-width: 640px)')` check or equivalent, so it does not interfere with desktop behaviour.

---

## New HTML Elements

```html
<!-- inserted as first child of <body> -->
<div id="topbar">
  <button id="topbar-menu" aria-label="Open menu">☰</button>
  <span id="topbar-lang">Kotlin</span>
</div>

<!-- inserted as first child of <body>, after topbar -->
<div id="overlay-backdrop"></div>
```

A close button `<button id="sidebar-close">✕</button>` is inserted as the first child of `<nav id="sidebar">`.

---

## CSS Summary (all inside `@media (max-width: 640px)`)

| Selector | Change |
|---|---|
| `body` | `flex-direction: column; overflow: auto` |
| `#sidebar` | `position: fixed; top: 0; left: 0; width: 100%; height: 100%; transform: translateX(-100%); transition: transform 0.25s ease; z-index: 200` |
| `body.sidebar-open #sidebar` | `transform: translateX(0)` |
| `#topbar` | `display: flex` (hidden on desktop with `display: none`) |
| `#overlay-backdrop` | `display: none` by default; when `body.sidebar-open`: `display: block; position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.5)` |
| `#main` | `padding: 44px 12px 64px` |
| `#sidebar-close` | `display: block` (hidden on desktop) |

---

## Delivery Checklist

- [ ] New HTML elements added to `index.html`
- [ ] New CSS `@media (max-width: 640px)` block added
- [ ] `#topbar-lang` updated on tab switch
- [ ] Sidebar closes on cat-link click
- [ ] Backdrop closes sidebar on tap
- [ ] Desktop layout visually unchanged at >640px
- [ ] Tested in browser DevTools mobile viewport (e.g. iPhone SE 375px)
