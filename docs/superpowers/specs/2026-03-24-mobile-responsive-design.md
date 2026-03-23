# Mobile Responsive Design Spec

## Goal

Make `index.html` usable on phones (≤640px) without changing the desktop layout.

## Scope

- Breakpoint: `max-width: 640px` only
- No tablet-specific layout
- No changes to desktop CSS or JS behaviour

---

## Scroll Model

On mobile, `#topbar` and `#sidebar` are `position: fixed` — taken out of flex flow. This means:

- `body` needs **no changes**. The desktop `body` already has `overflow: hidden`, which prevents body-level scroll on all viewports. On desktop, `#topbar` and `#overlay-backdrop` are `display: none` (base CSS), keeping them out of the `display: flex` (row) layout. On mobile they are `position: fixed`, also removing them from flex flow. If `display: none` is ever removed from those base rules, the desktop layout will break.
- `#main` remains the scroll container (`overflow-y: auto; height: 100vh; flex: 1`). The `IntersectionObserver` (root: `#main`) continues to work. Its `rootMargin: '-10% 0px -80% 0px'` is relative to `#main`'s scroll viewport, not the window — `-10%` of `#main`'s 100vh ≈ 64px on a 640px screen, which adequately clears the 44px top bar.
- `body.sidebar-open #main { overflow: hidden }` is added as extra protection against iOS Safari scroll bleed-through behind the overlay.

---

## Top Bar

`#topbar` is `position: fixed; top: 0; left: 0; width: 100%; height: 44px; z-index: 100`. Because it is `position: fixed`, it establishes a containing block for absolutely positioned children.

Layout:
- Left: `☰` hamburger button (`#topbar-menu`)
- Center: active language name (`#topbar-lang`) — centered via `position: absolute; left: 50%; transform: translateX(-50%)`, which is relative to the fixed containing block (the full viewport width), achieving true center regardless of button width. `white-space: nowrap; overflow: hidden; max-width: calc(100% - 80px)` prevents the label from overlapping the hamburger button on narrow screens.

`#topbar` is `<div id="topbar">` inserted as **first child of `<body>`**. `display: none` in base CSS; `display: flex; align-items: center` in media query.

Initial `#topbar-lang` text is set by JS at page load from `.lang-tab.active` text content (the span starts empty in HTML).

---

## Sidebar Overlay

Desktop `#sidebar` properties preserved (not overridden):
- `background: #161b22`
- `border-right: 1px solid #30363d`
- `overflow-y: auto`
- `display: flex; flex-direction: column`

Mobile override adds/changes:
```
position: fixed; top: 0; left: 0
width: 85vw; height: 100vh
min-width: 0          /* overrides desktop min-width: 220px */
transform: translateX(-100%); transition: transform 0.25s ease
z-index: 200
/* width: 220px from desktop is overridden by 85vw */
```

`width: 85vw` leaves a 15vw strip on the right where the backdrop is visible and tappable.

When `body.sidebar-open` (inside media query):
```
#sidebar            { transform: translateX(0) }
#overlay-backdrop   { display: block; position: fixed; inset: 0; z-index: 199; background: rgba(0,0,0,0.5) }
```

Both `.sidebar-open` rules **must live inside the `@media (max-width: 640px)` block**.

**Resize edge case**: a `matchMedia` change listener clears `sidebar-open` when the viewport transitions above 640px.

### Close button

`<button id="sidebar-close" aria-label="Close menu">✕</button>` — first child of `<nav id="sidebar">`.

In `#sidebar`'s `flex-direction: column` layout, `align-self: flex-end` positions the button at the right edge (cross axis). `margin-bottom: 4px` separates it from `.lang-tabs` below. Base CSS: `display: none`. Media query: `display: block; align-self: flex-end`.

---

## Backdrop

`<div id="overlay-backdrop">` — second child of `<body>`.

Base CSS: `display: none` — this already removes the element from hit-testing; no `pointer-events` override is needed. Shown only by `body.sidebar-open #overlay-backdrop` inside the media query. The backdrop covers the full viewport (`inset: 0`) and intercepts all pointer events, so `#main` content behind it is not tappable.

---

## Content Area (#main)

Media query overrides:

```css
#main {
  padding: 44px 12px 64px;
  scroll-padding-top: 44px;   /* anchor jumps clear the fixed top bar */
  width: 100%;
  min-width: 0;               /* prevents edge-case horizontal overflow */
}
body.sidebar-open #main {
  overflow: hidden;           /* extra scroll-lock behind overlay on iOS Safari */
}
```

`height: 100vh` and `overflow-y: auto` are **not changed**.

`#main` already has `scroll-behavior: smooth` in base CSS — no conflict. `scroll-padding-top` applies on programmatic and anchor scrolls; the `IntersectionObserver` sidebar highlight is unaffected.

---

## JS Additions

All event listeners attached unconditionally (no `matchMedia` guard for binding). The `matchMedia` change listener is only for stale-state cleanup.

**All new JS is added as new `addEventListener` calls — do not modify the existing tab-switch handler block.**

1. **Open**: `#topbar-menu` click → `document.body.classList.add('sidebar-open')`
2. **Close**: `#sidebar-close` click, `#overlay-backdrop` click → `document.body.classList.remove('sidebar-open')`
3. **Close on nav** (`.cat-link` click): remove `sidebar-open` synchronously, before the browser processes the anchor jump. This is the correct order — `#main` scroll must be re-enabled before the anchor scroll fires. Do not defer with `setTimeout`.
4. **Close + update label on lang switch**: add a **second** `querySelectorAll('.lang-tab').forEach` block where each tab click removes `sidebar-open` and sets `document.getElementById('topbar-lang').textContent = tab.textContent`
5. **Init label**: `document.getElementById('topbar-lang').textContent = document.querySelector('.lang-tab.active').textContent` (runs at page load, after DOM is ready)
6. **Resize cleanup**: `window.matchMedia('(max-width: 640px)').addEventListener('change', e => { if (!e.matches) document.body.classList.remove('sidebar-open'); })`

---

## New HTML Elements

```html
<!-- first child of <body> -->
<div id="topbar">
  <button id="topbar-menu" aria-label="Open menu">☰</button>
  <span id="topbar-lang"></span>
</div>

<!-- second child of <body> -->
<div id="overlay-backdrop"></div>
```

`<button id="sidebar-close" aria-label="Close menu">✕</button>` — first child of `<nav id="sidebar">`.

---

## CSS Summary

### Base CSS (outside any media query)

```css
#topbar           { display: none; }
#sidebar-close    { display: none; }
#overlay-backdrop { display: none; }
```

### `@media (max-width: 640px)` — complete block

```css
#topbar {
  display: flex;
  align-items: center;
  position: fixed; top: 0; left: 0; width: 100%; height: 44px;
  z-index: 100;
  background: #161b22;
  border-bottom: 1px solid #30363d;
  padding: 0 max(12px, env(safe-area-inset-right)) 0 max(12px, env(safe-area-inset-left));
}
#topbar-menu {
  background: none; border: none; color: #c9d1d9;
  font-size: 20px; cursor: pointer; line-height: 1; flex-shrink: 0;
}
#topbar-lang {
  position: absolute; left: 50%; transform: translateX(-50%);
  font-size: 13px; font-weight: 600; color: #e6edf3;
  white-space: nowrap; overflow: hidden; max-width: calc(100% - 80px);
  pointer-events: none;
}
#sidebar {
  position: fixed; top: 0; left: 0;
  width: 85vw; height: 100vh; min-width: 0;
  transform: translateX(-100%);
  transition: transform 0.25s ease;
  z-index: 200;
  /* background, border-right, overflow-y, display, flex-direction: preserved from desktop */
}
body.sidebar-open #sidebar {
  transform: translateX(0);
}
body.sidebar-open #overlay-backdrop {
  display: block;
  position: fixed; inset: 0;
  z-index: 199;
  background: rgba(0,0,0,0.5);
}
body.sidebar-open #main {
  overflow: hidden;
}
#sidebar-close {
  display: block;
  align-self: flex-end;
  margin-bottom: 4px;
  background: none; border: none;
  color: #8b949e; font-size: 18px; cursor: pointer;
  padding: 10px 12px;
}
#main {
  padding: 44px 12px 64px;
  scroll-padding-top: 44px;
  width: 100%;
  min-width: 0;
}
```

---

## Delivery Checklist

- [ ] New HTML elements added (`#topbar`, `#overlay-backdrop`, `#sidebar-close`)
- [ ] Base CSS hides new elements on desktop
- [ ] `@media (max-width: 640px)` block added (all `.sidebar-open` rules inside it)
- [ ] JS: open/close overlay handlers (new `addEventListener` calls, not modifying existing block)
- [ ] JS: second `.lang-tab` `forEach` block — close overlay + update label
- [ ] JS: `.cat-link` click removes `sidebar-open` synchronously (no `setTimeout`)
- [ ] JS: `#topbar-lang` initialised at load
- [ ] JS: `matchMedia` change listener clears `sidebar-open` on desktop resize
- [ ] Desktop layout visually unchanged at >640px
- [ ] Tested in DevTools at 375px (iPhone SE) and 768px (iPad — desktop layout)
