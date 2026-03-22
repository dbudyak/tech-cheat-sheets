# Java SE 26 Stdlib Refresher — Design Spec

## Goal

Add a comprehensive Java SE 26 standard library tab to `index.html`, covering 11 `<h2>` sections across 10 sidebar categories with ≥90% public non-deprecated API coverage per section. Content validated via context7 against Java SE 26 docs. Real-world memorable snippets throughout — better than javadoc examples.

## Non-Goals

- No third-party libraries (no JUnit, no Guava, no Spring)
- No build tool integration, no module-system deep dive
- No collapsible / "Advanced" sections — all entries flat and visible
- No new files — single `index.html` modification only
- No search/filter UI

---

## Architecture

Single-file modification. All Java content added to the existing `index.html` as a new `<section id="java" class="lang-section">` alongside Kotlin and Go. The existing tab-switch JS already toggles `.lang-section` visibility and `.cat-list` sidebars by `data-lang` — no JS changes required.

### Changes to index.html

| Location | Change |
|----------|--------|
| `.lang-tabs` div | Add `<button class="lang-tab" data-lang="java">Java</button>` |
| After Go `cat-list` closing `</div>` | Add Java `cat-list` with 10 sidebar links |
| After Go `</section>` | Add `<section id="java" class="lang-section">` with 11 `<h2>` sections (java.io and java.nio.file are separate) |

---

## Sidebar Structure

```html
<div class="cat-list" data-lang="java" style="display:none">
  <div class="cat-group">Language</div>
  <a class="cat-link" href="#java-lang-features">Language Features</a>
  <div class="cat-group">Core</div>
  <a class="cat-link" href="#java-lang">java.lang</a>
  <a class="cat-link" href="#java-util">java.util</a>
  <a class="cat-link" href="#java-stream">java.util.stream</a>
  <a class="cat-link" href="#java-time">java.time</a>
  <div class="cat-group">I/O &amp; Files</div>
  <a class="cat-link" href="#java-io">java.io</a>
  <a class="cat-link" href="#java-nio">java.nio.file</a>
  <div class="cat-group">Concurrency</div>
  <a class="cat-link" href="#java-concurrent">java.util.concurrent</a>
  <div class="cat-group">Network</div>
  <a class="cat-link" href="#java-http">java.net.http</a>
  <div class="cat-group">Text</div>
  <a class="cat-link" href="#java-regex">java.util.regex</a>
</div>
```

---

## Entry Format

Identical to Kotlin and Go sections:

```html
<div class="entry">
  <code class="sig">static String String.format(String format, Object... args)</code>
  <code class="snippet"><span class="kw">var</span> line = String.<span class="fn">format</span>(<span class="str">"[%s] %-8s %s"</span>, instant, level, msg);</code>
  <span class="desc">Formats a string using printf-style verbs; prefer for fixed-layout output where String templates are overkill.</span>
</div>
```

Syntax highlight span classes:
- `.kw` — Java keywords: `class`/`record`/`sealed`/`interface`/`var`/`new`/`return`/`if`/`for`/`while`/`try`/`catch`/`finally`/`throws`/`static`/`final`/`null`/`this`/`super`/`instanceof`/`yield`/`switch`/`case`/`permits`/`void`/`true`/`false`
- `.fn` — method/constructor calls
- `.ty` — type names
- `.str` — string/char literals
- `.num` — numeric literals
- `.cm` — `// comments`

Sub-headings within a section use `<div class="sub-heading">` (e.g., separating `java.util.function` within the stream section, or separating `java.io` legacy from NIO).

Version annotations: `(Java 21+)` or `(Java 26)` appended to the sig line where applicable.

---

## Section Coverage

### Task 1: API Validation via context7

Before writing content, validate all 10 sections against Java SE 26 docs using context7. Record included/total counts per section. Target ≥90% of public non-deprecated APIs.

### Task 2: Scaffold — Java tab button, sidebar, empty section

Wire up tab button, sidebar `cat-list`, empty `<section id="java">` with 10 `<h2>` placeholders.

Verify:
- Java tab button present
- Sidebar hidden by default (`style="display:none"`)
- Tab switching works (existing JS handles it)
- 10 section IDs present

### Task 3: Language Features

**Section ID:** `#java-lang-features`

Required entries (≥12):
- `record` — compact constructor, accessor methods, `equals`/`hashCode`/`toString` for free
- `sealed` + `permits` — sealed class hierarchy
- Pattern matching `instanceof` — `if (obj instanceof String s)`
- Pattern matching `switch` (Java 21+) — type patterns, guarded patterns (`when`)
- Record patterns in `switch` (Java 21+) — destructuring
- Text blocks — `"""..."""`, indentation stripping, `\` line continuation
- `var` — local variable type inference
- Switch expressions — `yield`, arrow cases
- Enhanced `for` with records / sequenced collections
- `@FunctionalInterface` — single abstract method interfaces
- Unnamed patterns and variables `_` (Java 22+)
- String Templates preview note (if finalized in 26)

Example entry:
```html
<div class="entry">
  <code class="sig">record Point(double x, double y) { } (Java 16+)</code>
  <code class="snippet"><span class="kw">record</span> <span class="ty">Point</span>(<span class="ty">double</span> x, <span class="ty">double</span> y) {}
<span class="kw">var</span> p = <span class="kw">new</span> <span class="ty">Point</span>(<span class="num">3.0</span>, <span class="num">4.0</span>); <span class="cm">// p.x(), p.y(), equals, hashCode, toString — all generated</span></code>
  <span class="desc">Immutable data carrier; generates accessor methods, equals, hashCode, and toString automatically — replaces boilerplate POJOs.</span>
</div>
```

### Task 4: java.lang

**Section ID:** `#java-lang`

Sub-headings: `String`, `StringBuilder`, `Math`, `System / Runtime`, `Thread`, `Wrapper Types`

Required entries (≥20):
- `String` — `length`, `charAt`, `substring`, `indexOf`, `contains`, `startsWith`, `endsWith`, `replace`, `replaceAll`, `strip`/`stripLeading`/`stripTrailing`, `isBlank`, `lines`, `repeat`, `formatted`, `toCharArray`, `chars`, `intern`, `join`, `valueOf`
- `StringBuilder` — `append`, `insert`, `delete`, `reverse`, `toString`, `length`, `charAt`, `replace`
- `Math` — `abs`, `min`/`max`, `pow`, `sqrt`, `floor`/`ceil`/`round`, `log`/`log10`, `PI`/`E`, `clamp` (Java 21+)
- `System` — `currentTimeMillis`, `nanoTime`, `arraycopy`, `getenv`, `lineSeparator`, `exit`, `gc`, `identityHashCode`
- `Runtime` — `availableProcessors`, `maxMemory`, `totalMemory`, `freeMemory`
- `Thread` — `Thread.ofVirtual()` (Java 21+), `Thread.sleep`, `currentThread`, `isVirtual`, `name`, `interrupt`/`interrupted`/`isInterrupted`
- Wrapper types — `Integer.parseInt`/`valueOf`/`toBinaryString`/`toHexString`/`compare`/`MAX_VALUE`/`MIN_VALUE`, `Double.parseDouble`/`isNaN`/`isInfinite`, `Boolean.parseBoolean`

### Task 5: java.util

**Section ID:** `#java-util`

Sub-headings: `List`, `Set`, `Map`, `Queue / Deque`, `Collections`, `Arrays`, `Objects`, `Optional`

Required entries (≥25):
- `List.of` / `List.copyOf` / `new ArrayList<>()` / `addAll` / `get` / `set` / `remove` / `sort` / `subList` / `iterator` / `listIterator`
- `Set.of` / `Set.copyOf` / `new HashSet<>()` / `new TreeSet<>()` / `new LinkedHashSet<>`
- `Map.of` / `Map.copyOf` / `Map.entry` / `new HashMap<>()` / `new TreeMap<>()` / `new LinkedHashMap<>()` / `getOrDefault` / `putIfAbsent` / `computeIfAbsent` / `merge` / `forEach` / `entrySet` / `keySet` / `values`
- `SequencedCollection` / `SequencedMap` — `getFirst`/`getLast`/`addFirst`/`addLast`/`reversed` (Java 21+)
- `ArrayDeque` — `push`/`pop`/`peek`/`offer`/`poll`
- `PriorityQueue` — constructor with `Comparator`, `poll`/`peek`/`offer`
- `Collections.sort` / `shuffle` / `reverse` / `unmodifiableList` / `synchronizedList` / `frequency` / `min` / `max` / `singletonList`
- `Arrays.sort` / `binarySearch` / `copyOf` / `copyOfRange` / `fill` / `asList` / `stream` / `equals`
- `Objects.requireNonNull` / `requireNonNullElse` / `isNull` / `toString` / `equals` / `hash` / `checkIndex` (Java 9+)
- `Optional` — `of` / `ofNullable` / `empty` / `isPresent` / `isEmpty` / `get` / `orElse` / `orElseGet` / `orElseThrow` / `map` / `flatMap` / `filter` / `ifPresent` / `stream`

### Task 6: java.util.stream + java.util.function

**Section ID:** `#java-stream`

Sub-headings: `Stream`, `IntStream / LongStream`, `Collectors`, `java.util.function`

Required entries (≥22):
- `Stream.of` / `Stream.generate` / `Stream.iterate` / `Collection.stream` / `parallelStream`
- Intermediate: `filter` / `map` / `flatMap` / `mapToInt` / `distinct` / `sorted` / `peek` / `limit` / `skip` / `takeWhile` / `dropWhile`
- Terminal: `collect` / `forEach` / `count` / `findFirst` / `findAny` / `anyMatch` / `allMatch` / `noneMatch` / `reduce` / `toList` (Java 16+) / `min` / `max` / `toArray`
- `IntStream.range` / `rangeClosed` / `sum` / `average` / `boxed`
- `Collectors.toList` / `toSet` / `toMap` / `groupingBy` / `partitioningBy` / `joining` / `counting` / `summarizingInt` / `toUnmodifiableList`
- `Function` / `Predicate` / `Consumer` / `Supplier` / `BiFunction` / `UnaryOperator` / `BinaryOperator` — compose, andThen, negate, and, or

### Task 7: java.time

**Section ID:** `#java-time`

Sub-headings: `LocalDate / LocalTime / LocalDateTime`, `ZonedDateTime / Instant`, `Duration / Period`, `DateTimeFormatter`

Required entries (≥18):
- `LocalDate.now` / `of` / `parse` / `plusDays`/`plusMonths`/`plusYears` / `minusDays` / `isBefore`/`isAfter` / `getDayOfWeek`/`getDayOfMonth`/`getMonth`/`getYear` / `withDayOfMonth` / `lengthOfMonth` / `atStartOfDay`
- `LocalTime.now` / `of` / `parse` / `plusHours`/`plusMinutes` / `isBefore`/`isAfter`
- `LocalDateTime.now` / `of` / `parse` / `toLocalDate`/`toLocalTime` / `atZone`
- `ZonedDateTime.now` / `of` / `withZoneSameInstant` / `toInstant`
- `Instant.now` / `ofEpochMilli` / `toEpochMilli` / `plus` / `minus` / `isBefore`/`isAfter`
- `Duration.between` / `of` / `toMillis`/`toSeconds`/`toMinutes`/`toHours` / `plus`/`minus` / `isNegative`
- `Period.between` / `of` / `getYears`/`getMonths`/`getDays`
- `DateTimeFormatter.ofPattern` / `ISO_LOCAL_DATE` / `ISO_INSTANT` / `format` / `parse`
- `ZoneId.of` / `systemDefault` / `ZoneOffset.UTC`

### Task 8: java.io + java.nio.file

Two sub-sections under separate `<h2>` tags.

**Section ID:** `#java-io`

Sub-heading: legacy I/O essentials only

Required entries (≥10):
- `InputStream` / `OutputStream` — `read`/`write`/`close`/`readAllBytes`/`transferTo`
- `FileInputStream` / `FileOutputStream`
- `InputStreamReader` / `OutputStreamWriter` (charset bridging)
- `BufferedReader` — `readLine` / `lines` / `try-with-resources`
- `BufferedWriter` / `PrintWriter` — `write`/`println`/`flush`
- `StringWriter` / `StringReader` — in-memory
- `ByteArrayOutputStream` — `toByteArray`
- `DataInputStream` / `DataOutputStream` — typed binary I/O

**Section ID:** `#java-nio`

Required entries (≥12):
- `Path.of` / `Paths.get` / `resolve` / `relativize` / `getParent` / `getFileName` / `normalize` / `toAbsolutePath` / `toFile`
- `Files.readString` / `writeString` / `readAllBytes` / `write` / `copy` / `move` / `delete` / `deleteIfExists` / `exists` / `isDirectory` / `isRegularFile` / `size` / `createDirectories` / `createTempFile` / `list` / `walk` / `walkFileTree` / `lines` / `newBufferedReader` / `newBufferedWriter`
- `StandardOpenOption` — `CREATE`/`APPEND`/`TRUNCATE_EXISTING`
- `FileVisitor` / `SimpleFileVisitor` pattern

### Task 9: java.util.concurrent

**Section ID:** `#java-concurrent`

Sub-headings: `Virtual Threads`, `ExecutorService`, `CompletableFuture`, `Synchronizers`, `Concurrent Collections`

Required entries (≥20):
- `Thread.ofVirtual().start` / `Thread.startVirtualThread` (Java 21+)
- `Executors.newVirtualThreadPerTaskExecutor` (Java 21+)
- `StructuredTaskScope` / `StructuredTaskScope.ShutdownOnFailure` / `ShutdownOnSuccess` (preview — Java 21–26; expected to finalize in Java 26, sig line must carry `(preview)` note if not yet stable)
- `ExecutorService` — `submit` / `invokeAll` / `invokeAny` / `shutdown` / `shutdownNow` / `awaitTermination` / `close` (AutoCloseable Java 19+)
- `Executors.newFixedThreadPool` / `newCachedThreadPool` / `newSingleThreadExecutor` / `newScheduledThreadPool`
- `Future` — `get` / `cancel` / `isDone` / `isCancelled`
- `CompletableFuture.supplyAsync` / `thenApply` / `thenAccept` / `thenCompose` / `thenCombine` / `exceptionally` / `handle` / `whenComplete` / `allOf` / `anyOf` / `join` / `complete`
- `CountDownLatch` — `await` / `countDown`
- `CyclicBarrier` — `await`
- `Semaphore` — `acquire` / `release` / `tryAcquire`
- `ReentrantLock` — `lock` / `unlock` / `tryLock` / `newCondition`
- `ReentrantReadWriteLock` — `readLock` / `writeLock`
- `ConcurrentHashMap` — `putIfAbsent` / `computeIfAbsent` / `merge` / `forEach` / `reduce`
- `CopyOnWriteArrayList`
- `LinkedBlockingQueue` / `ArrayBlockingQueue` — `put` / `take` / `offer` / `poll`
- `AtomicInteger` / `AtomicLong` / `AtomicReference` / `AtomicBoolean` — `get`/`set`/`getAndIncrement`/`compareAndSet`

### Task 10: java.net.http

**Section ID:** `#java-http`

Required entries (≥10):
- `HttpClient.newHttpClient` / `newBuilder` — `connectTimeout` / `followRedirects` / `executor` / `authenticator`
- `HttpRequest.newBuilder` — `uri` / `GET` / `POST` / `PUT` / `DELETE` / `header` / `headers` / `timeout` / `build`
- `HttpRequest.BodyPublishers` — `ofString` / `ofFile` / `ofByteArray` / `noBody`
- `HttpClient.send` (sync) / `sendAsync` (async → `CompletableFuture`)
- `HttpResponse` — `statusCode` / `body` / `headers`
- `HttpResponse.BodyHandlers` — `ofString` / `ofFile` / `ofByteArray` / `ofInputStream` / `discarding`
- `HttpClient.WebSocket` builder — `buildAsync` / `sendText` / `sendClose`
- Redirect policies — `HttpClient.Redirect.ALWAYS` / `NEVER` / `NORMAL`
- `HttpHeaders` — `firstValue` / `allValues` / `map`

### Task 11: java.util.regex

**Section ID:** `#java-regex`

Required entries (≥8):
- `Pattern.compile` / `Pattern.matches` / `Pattern.quote`
- `Pattern.matcher` → `Matcher`
- `Matcher.find` / `matches` / `lookingAt`
- `Matcher.group` / `group(name)` / `groupCount`
- `Matcher.replaceAll` / `replaceFirst` / `appendReplacement` / `appendTail`
- `Matcher.reset` / `start` / `end`
- `String.matches` / `replaceAll` / `split` — convenience wrappers
- Named capture groups `(?<name>...)`
- `Pattern.flags` — `CASE_INSENSITIVE`, `MULTILINE`, `DOTALL`

### Task 12: Coverage Comments + Final Check

- Add `<!-- coverage: java.lang X/Y -->` comments before each `<h2>`
- Verify no external CDN/HTTP dependencies introduced
- Verify Java tab switching works (sidebar + section toggle, scroll reset)
- Verify total Java entry count ≥ 160

**Delivery checklist (run before committing):**

```bash
# Java tab button present
grep 'data-lang="java"' index.html | head -5

# All 11 section IDs present
grep -c 'id="java-' index.html
# Expected: ≥11

# Sidebar hidden by default
grep 'data-lang="java" style="display:none"' index.html

# Total Java entry count
awk '/<section id="java"/,/<\/section>/' index.html | grep -c 'class="entry"'
# Expected: ≥160

# No external dependencies
grep -i 'cdn\|https://\|http://' index.html
# Expected: no resource loads (code snippet strings are OK)

# Coverage comments present
grep -c 'coverage: java' index.html
# Expected: 11
```

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add Java tab button, Java sidebar cat-list, Java section with 10 `<h2>` sections and all entries |

No other files changed.

---

## Quality Bar

Snippets must show a realistic call site. Examples:
- `Files.readString` reads `"config/app.properties"`, not `"test.txt"`
- `CompletableFuture` chains a real async fetch → transform → persist pipeline
- `record` replaces a real DTO with boilerplate
- `StructuredTaskScope` handles concurrent fan-out with failure isolation
- Pattern matching `switch` dispatches over a sealed type hierarchy, not over `Object`

Modern Java 21–26 APIs (virtual threads, StructuredTaskScope, sequenced collections, unnamed variables) are shown as first-class entries, not optional footnotes.
