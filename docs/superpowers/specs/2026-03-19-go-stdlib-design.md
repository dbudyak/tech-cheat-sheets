# Go Stdlib Refresher — Design Spec

**Date:** 2026-03-19
**Project:** tech-recall (`/home/dima/tech-recall/index.html`)

---

## Goal

Add a comprehensive Go standard library refresher as a second language tab inside the existing single-file `index.html`. Same format as the Kotlin section: function signature + real-world snippet + one-sentence description, organized by package. Target Go 1.21+. Validate coverage via context7 (≥90% of public non-deprecated APIs per package).

## Non-Goals

- No search or filter UI
- No Go generics tutorial or language spec coverage
- No third-party libraries (stdlib only)
- No collapsible "Advanced" sections (all packages flat, all visible)
- No new files — everything in `index.html`

---

## Architecture

### Existing Structure (unchanged)

```
index.html
├── <style>          inline CSS (shared for all languages)
├── #sidebar
│   ├── .lang-tabs   [Kotlin] [Go]
│   ├── .cat-list[data-lang="kotlin"]   ← existing, wrapped
│   └── .cat-list[data-lang="go"]       ← new
└── #main
    ├── <section id="kotlin" class="lang-section visible">  ← existing
    └── <section id="go" class="lang-section">              ← new
```

### Sidebar Change

Wrap the existing Kotlin `<a class="cat-link">` links in:
```html
<div class="cat-list" data-lang="kotlin">…</div>
```

Add a parallel block:
```html
<div class="cat-list" data-lang="go" style="display:none">…</div>
```

Extend the tab-switch JS (already toggles `.lang-section`) to also toggle `.cat-list[data-lang]` visibility using the same `data-lang` attribute match.

### CSS

No new CSS needed. All existing classes reuse cleanly:
- `.lang-section` / `.lang-section.visible` — show/hide per language
- `.section-heading` — package `<h2>` headings
- `.entry`, `.sig`, `.snippet`, `.desc` — entry format
- `.kw`, `.fn`, `.str`, `.num`, `.cm`, `.ty` — syntax highlight spans (Go keywords/funcs/types map directly)
- `.sub-heading` — used within packages where sub-grouping helps (e.g. `fmt`: Print family / Scan family / Errorf)

---

## Content Structure

### Packages (18 total, Go 1.21+)

Each package is one `<h2 class="section-heading" id="go-{pkg}">` section inside `<section id="go">`.

| ID | Package | Focus areas |
|----|---------|-------------|
| `go-fmt` | `fmt` | Printf/Sprintf/Fprintf, Println/Fprintln, Errorf, Sscanf/Fscanf, Stringer |
| `go-strings` | `strings` | Builder, Contains/HasPrefix/HasSuffix, Cut, Fields, Join, Split, Replace/ReplaceAll, Trim family, Map, NewReader |
| `go-strconv` | `strconv` | Atoi/Itoa, ParseInt/ParseFloat/ParseBool, FormatInt/FormatFloat/FormatBool, AppendInt, Quote/Unquote |
| `go-regexp` | `regexp` | Compile/MustCompile, Match/MatchString, Find/FindAll/FindString, FindSubmatch, ReplaceAll/ReplaceAllFunc, Split |
| `go-slices` | `slices` | Contains/ContainsFunc, Index/IndexFunc, Equal, Sort/SortFunc/SortStableFunc, Reverse, Compact, Max/Min, BinarySearch, Collect, Concat, Clip/Grow, Delete, Insert, Replace |
| `go-maps` | `maps` | Keys, Values, Clone, Copy, DeleteFunc, Collect, Insert, All, Equal |
| `go-sort` | `sort` | Slice/SliceStable/SliceIsSorted, Search, Strings/Ints/Float64s, Reverse, Sort (interface) |
| `go-errors` | `errors` | New, Is, As, Unwrap, Join |
| `go-io` | `io` | Reader/Writer interfaces, Copy/CopyN/CopyBuffer, ReadAll, WriteString, Pipe, LimitReader, MultiReader/MultiWriter, TeeReader, Discard, NopCloser, EOF, ReadFull, ReadAtLeast |
| `go-os` | `os` | Open/Create/OpenFile, ReadFile/WriteFile, MkdirAll/Mkdir, Remove/RemoveAll, Stat/Lstat, Getenv/Setenv/LookupEnv, Exit, Args, Stdin/Stdout/Stderr, Rename, TempDir/CreateTemp |
| `go-bufio` | `bufio` | NewReader/NewWriter, Scanner/NewScanner, ReadString/ReadLine/ReadBytes, ScanLines/ScanWords/ScanRunes, Flush, Writer.WriteString |
| `go-filepath` | `path/filepath` | Join, Base/Dir/Ext, Abs/Rel, Clean, IsAbs, WalkDir, Glob, Match, FromSlash/ToSlash |
| `go-time` | `time` | Now/Since/Until, Parse/Format (reference time), Duration constants, Add/Sub, Sleep, After/NewTimer/NewTicker, Truncate/Round, Unix/UnixMilli, Location/LoadLocation |
| `go-context` | `context` | Background/TODO, WithCancel/WithCancelCause, WithTimeout/WithDeadline, WithValue, Done/Err/Cause, Value |
| `go-sync` | `sync` | Mutex/RWMutex (Lock/Unlock/RLock/RUnlock), WaitGroup (Add/Done/Wait), Once/OnceFunc, Map (Load/Store/LoadOrStore/Delete/Range), Pool, Cond |
| `go-atomic` | `sync/atomic` | Int32/Int64/Uint32/Uint64/Bool/Pointer typed atomics (Load/Store/Add/Swap/CompareAndSwap), Value |
| `go-http` | `net/http` | Get/Post/Head, NewRequest, Client/Do, Handle/HandleFunc, NewServeMux, ListenAndServe/ListenAndServeTLS, Request fields (Method/URL/Header/Body/Context), ResponseWriter, http.Error, FileServer/StripPrefix, status constants, http.DefaultClient, Transport, Cookie |
| `go-json` | `encoding/json` | Marshal/Unmarshal, NewEncoder/Encode, NewDecoder/Decode, RawMessage, Number, struct tags (omitempty/- /string), MarshalJSON/UnmarshalJSON interfaces |
| `go-slog` | `log/slog` | Default logger (Info/Error/Debug/Warn), With/WithGroup, New, NewJSONHandler/NewTextHandler, HandlerOptions/Level, Attr/Group, SetDefault, LogValuer interface |

---

## Coverage Validation

Use context7 MCP server before writing content:

- **Library ID:** `/go/go` or resolved via `mcp__context7__resolve-library-id` with query `"go standard library"`
- **Per-package queries:** fetch each package's public API surface
- **Target:** ≥90% coverage = `included / (total_public - excluded)` per package
- **Exclusions:** deprecated symbols, `String()`/`Error()` methods where covered by interface entry, low-level unsafe/internal APIs
- **Coverage comment format:**
  ```html
  <!-- coverage: fmt 18/20 (2 excluded: Sscan family low-use) -->
  <h2 class="section-heading" id="go-fmt">fmt</h2>
  ```

---

## Entry Format

Identical to Kotlin entries:

```html
<div class="entry">
  <code class="sig">func strings.Cut(s, sep string) (before, after string, found bool)</code>
  <code class="snippet"><span class="kw">if</span> user, domain, ok := strings.<span class="fn">Cut</span>(email, <span class="str">"@"</span>); ok { }</code>
  <span class="desc">Splits s around the first occurrence of sep; cleaner than Index+slicing for key/value splits.</span>
</div>
```

Syntax highlight mapping for Go:
- `.kw` — `func`, `var`, `const`, `type`, `if`, `for`, `range`, `return`, `defer`, `go`, `select`, `case`, `chan`, `struct`, `interface`, `nil`, `true`, `false`
- `.fn` — function/method calls
- `.ty` — type names (`http.Client`, `sync.Mutex`, `context.Context`, etc.)
- `.str` — string literals
- `.num` — numeric literals
- `.cm` — `// comments`

---

## Implementation Notes

- Add `<button class="lang-tab" data-lang="go">Go</button>` in `.lang-tabs`
- Add `<div class="cat-list" data-lang="go" style="display:none">` in sidebar with 18 `<a class="cat-link">` links
- Extend tab-switch JS: `document.querySelectorAll('.cat-list').forEach(cl => cl.style.display = cl.dataset.lang === lang ? '' : 'none')`
- IntersectionObserver already observes `.section-heading[id]` — Go sections auto-register with no JS change needed
- Wrap existing Kotlin sidebar links in `<div class="cat-list" data-lang="kotlin">`

---

## Delivery Checklist

- [ ] Kotlin sidebar links wrapped in `<div class="cat-list" data-lang="kotlin">`
- [ ] Go tab button added to `.lang-tabs`
- [ ] Go sidebar `<div class="cat-list" data-lang="go">` with 18 package links
- [ ] Tab-switch JS extended to toggle `.cat-list` visibility
- [ ] `<section id="go" class="lang-section">` with 18 `<h2>` package sections
- [ ] ≥220 entries across all 18 packages
- [ ] Coverage comments on every `<h2>` (≥90% per package via context7)
- [ ] No external dependencies introduced
- [ ] `docker build -t tech-recall .` still succeeds
