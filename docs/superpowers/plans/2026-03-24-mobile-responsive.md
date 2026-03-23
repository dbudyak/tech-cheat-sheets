# Mobile Responsive Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make index.html usable on phones (≤640px) via a hamburger-triggered sidebar overlay, fixed top bar, and mobile-adjusted content padding.

**Architecture:** All changes live in the single `index.html` file. New HTML elements (`#topbar`, `#overlay-backdrop`, `#sidebar-close`) are hidden on desktop via base CSS `display: none` and activated inside a `@media (max-width: 640px)` block. JS handlers are attached unconditionally; CSS controls visibility. The sidebar and topbar are `position: fixed` on mobile, removing them from flex flow so `#main` remains the scroll container and the existing `IntersectionObserver` continues to work unchanged.

**Tech Stack:** Vanilla HTML/CSS/JS, no build step, single file.

---

## File Map

| File | Change |
|---|---|
| `index.html` | Add 3 HTML elements, 3 base CSS rules, 1 media query block (~45 lines), 1 JS block (~25 lines) |

---

### Task 1: Add new HTML elements

**Files:**
- Modify: `index.html` — around the `<body>` open tag and `<nav id="sidebar">` open tag

- [ ] **Step 1: Insert `#topbar` and `#overlay-backdrop` after `<body>`**

Find the text `<body>` followed by a blank line and `<nav id="sidebar">`. Replace that block with:

```html
<body>

<div id="topbar">
  <button id="topbar-menu" aria-label="Open menu">☰</button>
  <span id="topbar-lang"></span>
</div>

<div id="overlay-backdrop"></div>

<nav id="sidebar">
```

- [ ] **Step 2: Insert `#sidebar-close` as first child of `<nav id="sidebar">`**

Find the line `<nav id="sidebar">`. The very next line is `  <div class="lang-tabs">`. Insert between them:

```html
  <button id="sidebar-close" aria-label="Close menu">✕</button>
```

So the block becomes:
```html
<nav id="sidebar">
  <button id="sidebar-close" aria-label="Close menu">✕</button>
  <div class="lang-tabs">
```

- [ ] **Step 3: Verify the HTML structure in a browser**

Open `index.html` in a browser at desktop width (>640px). The page must look **identical** to before — no visible topbar, no close button. Open DevTools → Elements and confirm `#topbar`, `#overlay-backdrop`, and `#sidebar-close` exist in the DOM.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add topbar, backdrop, and sidebar-close HTML elements"
```

---

### Task 2: Add base CSS (desktop hide rules)

**Files:**
- Modify: `index.html` — the `<style>` block (find `</style>` and insert immediately before it)

- [ ] **Step 1: Add hide rules immediately before `</style>`**

Find the closing `</style>` tag. Insert these lines immediately before it (after the existing scrollbar rules):

```css
/* ── Mobile elements (hidden on desktop) ────── */
#topbar           { display: none; }
#sidebar-close    { display: none; }
#overlay-backdrop { display: none; }
```

- [ ] **Step 2: Verify desktop is still unchanged**

Reload in browser at desktop width. The three new elements must be invisible. Confirm in DevTools → Elements that `#topbar` has computed style `display: none`.

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "feat(mobile): hide new mobile elements on desktop"
```

---

### Task 3: Add mobile CSS media query

**Files:**
- Modify: `index.html` — append after the hide rules added in Task 2, still inside `<style>` before `</style>`

- [ ] **Step 1: Append the media query block immediately before `</style>`**

After the three hide rules from Task 2, add the following. **All `.sidebar-open` rules must stay inside this `@media` block — do not move them outside it.**

```css
/* ── Mobile layout (≤640px) ─────────────────── */
@media (max-width: 640px) {
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
  }
  body.sidebar-open #sidebar  { transform: translateX(0); }
  body.sidebar-open #overlay-backdrop {
    display: block;
    position: fixed; inset: 0;
    z-index: 199;
    background: rgba(0,0,0,0.5);
  }
  body.sidebar-open #main { overflow: hidden; }
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
}
```

- [ ] **Step 2: Verify mobile layout in DevTools at 375px**

Open DevTools → Toggle device toolbar → set width to **375px** (iPhone SE).

Expected:
- Top bar (dark, 44px) visible with `☰` on the left and an empty center label (JS not wired yet)
- Sidebar is not visible (off-screen to the left)
- Main content fills full width with adequate top padding
- No horizontal scrollbar on the page

- [ ] **Step 3: Verify scroll-lock rule is inside `@media`**

In DevTools at 375px: add class `sidebar-open` to `<body>` manually (DevTools → Elements → double-click the class attribute). Confirm `#main` gets `overflow: hidden` and `#sidebar` slides into view. Remove the class. Confirm everything returns to normal.

- [ ] **Step 4: Verify desktop at 768px is unchanged**

Switch DevTools to **768px**. Confirm in DevTools → Elements that `#sidebar` computed width is **220px** and `#topbar` computed display is **none**. The layout must look identical to the original desktop view.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add mobile CSS media query and overlay styles"
```

---

### Task 4: Add mobile JavaScript

**Files:**
- Modify: `index.html` — inside the existing `<script>` block

**Note:** Tasks 1–3 added ~55 lines above the script block, so line numbers have shifted. Use text search rather than line numbers. Find the literal text `headings.forEach(h => observer.observe(h));` — that is the last line of the existing JS. Insert the new block immediately after it, before `</script>`.

- [ ] **Step 1: Insert the mobile JS block after `headings.forEach(h => observer.observe(h));`**

```javascript

// ── Mobile sidebar ─────────────────────────────
document.getElementById('topbar-menu')
  .addEventListener('click', () => document.body.classList.add('sidebar-open'));

document.getElementById('sidebar-close')
  .addEventListener('click', () => document.body.classList.remove('sidebar-open'));

document.getElementById('overlay-backdrop')
  .addEventListener('click', () => document.body.classList.remove('sidebar-open'));

// Close sidebar on cat-link click (synchronous — must re-enable #main scroll
// before the browser processes the anchor jump; do not use setTimeout)
document.querySelectorAll('.cat-link').forEach(link => {
  link.addEventListener('click', () => document.body.classList.remove('sidebar-open'));
});

// Close sidebar + update top-bar label on lang switch
// (second forEach on .lang-tab — do not modify the existing tab-switch block)
document.querySelectorAll('.lang-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.body.classList.remove('sidebar-open');
    document.getElementById('topbar-lang').textContent = tab.textContent;
  });
});

// Initialise top-bar label from whichever tab has class "active" at page load
document.getElementById('topbar-lang').textContent =
  document.querySelector('.lang-tab.active').textContent;

// Clear sidebar-open if user resizes from mobile to desktop
window.matchMedia('(max-width: 640px)').addEventListener('change', e => {
  if (!e.matches) document.body.classList.remove('sidebar-open');
});
```

- [ ] **Step 2: Verify open/close in DevTools at 375px**

With DevTools at 375px:
1. Top-bar label shows the text of whichever `.lang-tab` has class `active` (e.g. "Kotlin")
2. Tap `☰` → sidebar slides in, semi-transparent backdrop visible on the right
3. Tap `✕` → sidebar closes
4. Tap `☰` → sidebar opens → tap backdrop → sidebar closes
5. Tap `☰` → sidebar opens → tap a cat-link → sidebar closes AND page scrolls to that section

- [ ] **Step 3: Verify lang switch label update**

In DevTools at 375px:
1. Tap `☰` → open sidebar
2. Tap "Go" tab → sidebar closes, top-bar label changes to "Go"
3. Tap `☰` → open sidebar → tap "Java" → label changes to "Java"

- [ ] **Step 4: Verify desktop is unaffected**

Switch DevTools to **768px**. Lang tab switching, sidebar link highlighting, and scroll behaviour must work exactly as before.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(mobile): add hamburger overlay JS and top-bar label logic"
```

---

### Task 5: Push and verify deployment

- [ ] **Step 1: Push to origin**

```bash
git push origin master
```

- [ ] **Step 2: Confirm Vercel auto-deploy**

Check the Vercel dashboard for the `tech-cheat-sheets` project. A new deployment should appear. Wait for it to complete (typically 30–60 seconds for a static site).

- [ ] **Step 3: Spot-check on a real phone**

Open `https://docs.kodatek.app` in a mobile browser. Verify:
- Top bar visible with `☰` and language label
- Tapping `☰` opens the sidebar overlay
- Tapping a section link navigates and closes the sidebar
- Desktop browser at the same URL shows the original layout unchanged

---

## Delivery Checklist

- [ ] `#topbar`, `#overlay-backdrop`, `#sidebar-close` in DOM
- [ ] Base CSS: all three hidden with `display: none` on desktop
- [ ] `@media (max-width: 640px)` block present and all `.sidebar-open` rules are **inside** it (not at top level)
- [ ] JS: hamburger open, close button close, backdrop close
- [ ] JS: `.cat-link` click removes `sidebar-open` synchronously
- [ ] JS: second `.lang-tab` forEach — closes overlay and updates label
- [ ] JS: `#topbar-lang` initialised at load from `.lang-tab.active`
- [ ] JS: `matchMedia` change listener clears `sidebar-open` on resize to desktop
- [ ] Desktop layout visually unchanged at >640px (sidebar 220px, topbar hidden)
- [ ] Deployed to `docs.kodatek.app` and verified on a real phone
