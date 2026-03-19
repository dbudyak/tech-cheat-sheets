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

### Existing Structure (unchanged except where noted)

```
index.html
├── <style>          inline CSS (shared for all languages)
├── #sidebar
│   ├── .lang-tabs   [Kotlin] [Go]
│   ├── <div class="cat-list" id="kotlin-nav" data-lang="kotlin">  ← add data-lang attr
│   └── <div class="cat-list" data-lang="go" style="display:none"> ← new
└── #main
    ├── <section id="kotlin" class="lang-section visible">  ← existing, unchanged
    └── <section id="go" class="lang-section">              ← new
```

### Sidebar Change

**Critical:** The existing Kotlin sidebar links are already wrapped in `<div class="cat-list" id="kotlin-nav">` at line 202. Do NOT re-wrap them. Instead, **add `data-lang="kotlin"` to that existing div**:

```html
<!-- Before -->
<div class="cat-list" id="kotlin-nav">

<!-- After -->
<div class="cat-list" id="kotlin-nav" data-lang="kotlin">
```

Then add a new Go sidebar block immediately after:

```html
<div class="cat-list" data-lang="go" style="display:none">
  <a class="cat-link" href="#go-fmt">fmt</a>
  <a class="cat-link" href="#go-strings">strings</a>
  <a class="cat-link" href="#go-strconv">strconv</a>
  <a class="cat-link" href="#go-bytes">bytes</a>
  <a class="cat-link" href="#go-regexp">regexp</a>
  <a class="cat-link" href="#go-slices">slices</a>
  <a class="cat-link" href="#go-maps">maps</a>
  <a class="cat-link" href="#go-sort">sort</a>
  <a class="cat-link" href="#go-errors">errors</a>
  <a class="cat-link" href="#go-io">io</a>
  <a class="cat-link" href="#go-os">os</a>
  <a class="cat-link" href="#go-bufio">bufio</a>
  <a class="cat-link" href="#go-filepath">path/filepath</a>
  <a class="cat-link" href="#go-time">time</a>
  <a class="cat-link" href="#go-context">context</a>
  <a class="cat-link" href="#go-sync">sync</a>
  <a class="cat-link" href="#go-atomic">sync/atomic</a>
  <a class="cat-link" href="#go-math">math</a>
  <a class="cat-link" href="#go-http">net/http</a>
  <a class="cat-link" href="#go-json">encoding/json</a>
  <a class="cat-link" href="#go-slog">log/slog</a>
  <a class="cat-link" href="#go-testing">testing</a>
</div>
```

Note: use the full import path as the link label for multi-segment packages (`path/filepath`, `sync/atomic`, `net/http`, `encoding/json`, `log/slog`) to avoid ambiguity.

### JS Tab Switcher Change

The existing tab-switch handler (around line 1823 in `index.html`) toggles `.lang-section` visibility. Extend it by inserting two additional lines **inside the existing click handler, after the `classList.add('visible')` call**:

```js
// Existing handler (do not replace — extend):
document.querySelectorAll('.lang-tab').forEach(tab => {
  tab.addEventListener('click', () => {
    const lang = tab.dataset.lang;
    document.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    document.querySelectorAll('.lang-section').forEach(s => s.classList.remove('visible'));
    document.getElementById(lang).classList.add('visible');

    // ADD THESE TWO LINES:
    document.querySelectorAll('.cat-list').forEach(cl => {
      cl.style.display = cl.dataset.lang === lang ? '' : 'none';
    });
    document.getElementById('main').scrollTop = 0;  // reset scroll on tab switch
  });
});
```

**Important:** Use `''` (empty string) to re-show `.cat-list`, not `'block'` or `'flex'`. The CSS rule `.cat-list { flex: 1; }` controls the display type — setting `''` lets the stylesheet take over. Setting `'block'` would break the flex layout.

**Scroll reset:** `scrollTop = 0` on `#main` (the scroll container) prevents the user landing mid-document in the new language section after switching tabs.

### IntersectionObserver

The existing observer queries `.section-heading[id], details[id]` **once at page load**. Go `<h2 class="section-heading">` elements present in the DOM at load time will be auto-registered — no JS change needed for observation.

Known limitation: the `links` NodeList (`.cat-link`) is also queried once and includes both Kotlin and Go links. When a Go section scrolls into view while the Kotlin tab is active (or vice versa), the corresponding hidden sidebar link may receive the `.active` class. This causes no visual glitch (hidden links are invisible) but the state is not perfectly clean. Acceptable for this use case.

### CSS

No new CSS needed. All existing classes reuse cleanly:
- `.lang-section` / `.lang-section.visible` — show/hide per language
- `.section-heading` — package `<h2>` headings
- `.entry`, `.sig`, `.snippet`, `.desc` — entry format
- `.kw`, `.fn`, `.str`, `.num`, `.cm`, `.ty` — syntax highlight spans
- `.sub-heading` — sub-grouping within a package (e.g. `fmt`: Print family / Scan family)

---

## Content Structure

### Packages (22 total, Go 1.21+)

Each package is one `<h2 class="section-heading" id="go-{pkg}">` section inside `<section id="go">`.

| ID | Package | Focus areas |
|----|---------|-------------|
| `go-fmt` | `fmt` | Printf/Sprintf/Fprintf, Println/Fprintln, Errorf, Sscanf/Fscanf, Stringer interface |
| `go-strings` | `strings` | Builder, Contains/HasPrefix/HasSuffix, Cut, Fields, Join, Split/SplitN, Replace/ReplaceAll, Trim/TrimSpace/TrimPrefix/TrimSuffix, ToLower/ToUpper, Map, NewReader, EqualFold, Count, Index/LastIndex, Repeat |
| `go-strconv` | `strconv` | Atoi/Itoa, ParseInt/ParseFloat/ParseBool, FormatInt/FormatFloat/FormatBool, AppendInt, Quote/Unquote, NumError |
| `go-bytes` | `bytes` | Buffer (Write/WriteByte/WriteString/Bytes/Reset), NewBuffer, Contains/HasPrefix/HasSuffix, Cut, Fields, Join, Split, Replace, Trim, ToLower/ToUpper, Equal, Index, NewReader |
| `go-regexp` | `regexp` | Compile/MustCompile, Match/MatchString, Find/FindAll/FindString/FindAllString, FindSubmatch/FindStringSubmatch, ReplaceAll/ReplaceAllFunc/ReplaceAllString, Split, SubexpNames |
| `go-slices` | `slices` | Contains/ContainsFunc, Index/IndexFunc, Equal/EqualFunc, Sort/SortFunc/SortStableFunc, IsSorted/IsSortedFunc, Reverse, Compact/CompactFunc, Max/MaxFunc/Min/MinFunc, BinarySearch/BinarySearchFunc, Collect, Concat, Clip/Grow, Delete/DeleteFunc, Insert, Replace |
| `go-maps` | `maps` | Keys, Values, Clone, Copy, DeleteFunc, Collect, Insert, All, Equal |
| `go-sort` | `sort` | Slice/SliceStable/SliceIsSorted, Search/SearchInts, Strings/Ints/Float64s, Reverse, Interface (Len/Less/Swap) |
| `go-errors` | `errors` | New, Is, As, Unwrap, Join |
| `go-io` | `io` | Reader/Writer/Closer/ReadWriter interfaces, Copy/CopyN/CopyBuffer, ReadAll, WriteString, Pipe, LimitReader, MultiReader/MultiWriter, TeeReader, Discard, NopCloser, EOF, ReadFull, ReadAtLeast, Seeker |
| `go-os` | `os` | Open/Create/OpenFile, ReadFile/WriteFile, MkdirAll/Mkdir, Remove/RemoveAll, Stat/Lstat, Getenv/Setenv/LookupEnv, Exit, Args, Stdin/Stdout/Stderr, Rename, TempDir/CreateTemp, File.Close/Read/Write/Seek |
| `go-bufio` | `bufio` | NewReader/NewWriter, Scanner/NewScanner, ScanLines/ScanWords/ScanRunes, ReadString/ReadLine/ReadBytes, Flush, Writer.WriteString, ReadWriter |
| `go-filepath` | `path/filepath` | Join, Base/Dir/Ext, Abs/Rel, Clean, IsAbs, WalkDir/Walk, Glob, Match, FromSlash/ToSlash, EvalSymlinks |
| `go-time` | `time` | Now/Since/Until, Parse/Format (reference time `2006-01-02`), Duration constants, Add/Sub, Sleep, After/NewTimer/NewTicker/AfterFunc, Truncate/Round, Unix/UnixMilli, Location/LoadLocation/UTC/Local |
| `go-context` | `context` | Background/TODO, WithCancel/WithCancelCause, WithTimeout/WithDeadline, WithValue, Done/Err/Cause, Value, AfterFunc (1.21) |
| `go-sync` | `sync` | Mutex (Lock/Unlock/TryLock), RWMutex (RLock/RUnlock), WaitGroup (Add/Done/Wait), Once/OnceFunc/OnceValue (1.21), Map (Load/Store/LoadOrStore/Delete/Range/Swap), Pool (Get/Put), Cond |
| `go-atomic` | `sync/atomic` | Int32/Int64/Uint32/Uint64/Bool/Uintptr typed atomics (Load/Store/Add/Swap/CompareAndSwap), Pointer[T], Value (Load/Store/Swap/CompareAndSwap) |
| `go-math` | `math` + `math/rand/v2` *(combined section, label "math")* | Abs/Ceil/Floor/Round/Sqrt/Pow/Log/Log2/Log10/Exp, Min/Max, Inf/IsInf/IsNaN, Pi/E constants; rand.IntN/rand.Float64/rand.N/rand.New/rand.NewPCG |
| `go-http` | `net/http` | Get/Post/Head, NewRequest/NewRequestWithContext, Client/Do, Handle/HandleFunc, NewServeMux, ListenAndServe, Request (Method/URL/Header/Body/Context/FormValue), ResponseWriter (Header/Write/WriteHeader), http.Error, FileServer/StripPrefix, status constants, Cookie/SetCookie, http.DefaultClient, Transport |
| `go-json` | `encoding/json` | Marshal/Unmarshal, MarshalIndent, NewEncoder/Encode, NewDecoder/Decode, RawMessage, Number, struct tags (`omitempty`/`-`/`string`), MarshalJSON/UnmarshalJSON interfaces, Decoder.DisallowUnknownFields |
| `go-slog` | `log/slog` | Default logger (Info/Error/Debug/Warn/Log), With/WithGroup, New, NewJSONHandler/NewTextHandler, HandlerOptions/Level, Attr/Group/AnyAttr, SetDefault, LogValuer interface |
| `go-testing` | `testing` | T.Run (subtests), T.Helper, T.Parallel, T.Cleanup, T.Errorf/T.Fatalf/T.FailNow, T.Logf, T.Skip, B.N/B.ResetTimer/B.ReportAllocs (benchmarks), testing.Short, TestMain |

---

## Coverage Validation

Use context7 MCP server before writing content for each package:

```
mcp__context7__resolve-library-id  query: "go standard library"
mcp__context7__query-docs          library-id: <resolved>, topic: "fmt package"
```

**Fallback:** If context7 cannot resolve the Go stdlib ID, use `pkg.go.dev/std` as the canonical public reference to count total public symbols per package.

**Target:** ≥90% coverage per package: `included / (total_public - excluded)`. Packages vary widely in size (`errors` has 5 symbols, `net/http` has 80+) — the 90% target applies per package independently; a small package meeting 90% is fine even if its absolute entry count is low.

**Exclusions (per package):** deprecated symbols; `String()`/`Error()` methods where covered by the interface entry; low-level unsafe/cgo APIs; rarely-used overloads where a primary entry covers the pattern (e.g. `Sscanln` when `Sscanf` is covered)

**Coverage comment format** (immediately before each `<h2>`):
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
- `.kw` — `func`, `var`, `const`, `type`, `if`, `for`, `range`, `return`, `defer`, `go`, `select`, `case`, `chan`, `struct`, `interface`, `nil`, `true`, `false`, `make`, `new`, `append`, `len`, `cap`, `close`, `delete`
- `.fn` — function/method calls
- `.ty` — type names (`http.Client`, `sync.Mutex`, `context.Context`, `io.Reader`, etc.)
- `.str` — string literals
- `.num` — numeric literals
- `.cm` — `// comments`

---

## Implementation Notes

- Add `<button class="lang-tab" data-lang="go">Go</button>` to `.lang-tabs`
- **Add** `data-lang="kotlin"` to the existing `<div class="cat-list" id="kotlin-nav">` at line 202
- Add new `<div class="cat-list" data-lang="go" style="display:none">` with 22 `<a class="cat-link">` links
- Extend tab-switch JS to toggle `.cat-list` elements (use `''` not `'block'` for reset)
- Add `<section id="go" class="lang-section">` containing 22 `<h2>` sections after `</section>` closing the Kotlin block
- IntersectionObserver: no change needed — Go `<h2 class="section-heading">` headings auto-register at page load

---

## Delivery Checklist

- [ ] `data-lang="kotlin"` added to existing `#kotlin-nav` div (not re-wrapped)
- [ ] Go tab button added to `.lang-tabs`
- [ ] Go sidebar `<div class="cat-list" data-lang="go">` with 22 package links (full import paths for multi-segment packages)
- [ ] Tab-switch JS extended to toggle `.cat-list` using `''` reset value
- [ ] `<section id="go" class="lang-section">` with 22 `<h2>` package sections
- [ ] ≥220 entries across all 22 packages
- [ ] Coverage comments on every `<h2>` (≥90% per package via context7)
- [ ] No external dependencies introduced
- [ ] `docker build -t tech-recall .` still succeeds
