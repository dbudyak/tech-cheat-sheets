# Java SE 26 Stdlib Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a comprehensive Java SE 26 standard library tab to `index.html` covering 11 sections across 10 sidebar categories (≥90% API coverage per section, ≥160 total entries) with real-world memorable snippets.

**Architecture:** Single-file modification — all Java content added to the existing `index.html` as a new `<section id="java" class="lang-section">` alongside Kotlin and Go. Sidebar gets a parallel `<div class="cat-list" data-lang="java">` with 10 category links. Existing tab-switch JS handles everything — no JS changes needed.

**Tech Stack:** Plain HTML5, inline CSS (existing classes reused), vanilla JS (no changes), context7 MCP for API validation.

**Quality bar:** Snippets must be more memorable than javadoc. Prefer real call sites — `Files.readString("config/app.properties")` not `Files.readString("test.txt")`. Show modern Java 21–26 APIs (virtual threads, records, pattern matching) as first-class entries.

---

## File Map

| File | Change |
|------|--------|
| `index.html` | Add Java tab button, Java `cat-list` sidebar, Java `<section>` with 11 `<h2>` sections and all entries |

---

## Task 1: API Coverage Validation via context7

Validate the Java SE 26 API surface for all 11 sections before writing content.

**Files:** None created — produces counts used in Task 12.

- [ ] **Step 1: Resolve the Java SE library ID in context7**

  Call `mcp__context7__resolve-library-id` with:
  - libraryName: `"Java SE 26"`
  - query: `"java.lang java.util stream concurrent time nio"`

  Note the resolved library ID.

- [ ] **Step 2: Query each section**

  For each section below, call `mcp__context7__query-docs` with the resolved ID and the topic. Record public symbol counts.

  - **Language Features:** records, sealed, pattern matching switch, text blocks, var, switch expressions
  - **java.lang:** String, StringBuilder, Math, System, Thread, Runtime, Integer, Long, Double, Boolean
  - **java.util:** List, Set, Map, Optional, Collections, Arrays, Objects, Deque, PriorityQueue, SequencedCollection
  - **java.util.stream + java.util.function:** Stream, IntStream, Collectors, Function, Predicate, Consumer, Supplier
  - **java.time:** LocalDate, LocalTime, LocalDateTime, ZonedDateTime, Instant, Duration, Period, DateTimeFormatter
  - **java.io:** InputStream, OutputStream, BufferedReader, BufferedWriter, PrintWriter, ByteArrayOutputStream
  - **java.nio.file:** Path, Files, StandardOpenOption, FileVisitor
  - **java.util.concurrent:** ExecutorService, CompletableFuture, StructuredTaskScope, CountDownLatch, AtomicInteger
  - **java.net.http:** HttpClient, HttpRequest, HttpResponse, BodyHandlers
  - **java.util.regex:** Pattern, Matcher

- [ ] **Step 3: Record coverage baseline**

  Note included / total-public counts. Target ≥90% per section. These feed the coverage comments in Task 12.

---

## Task 2: Scaffold — Java Tab, Sidebar, Empty Section

Wire up the language switching infrastructure and empty Java section skeleton.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add Java tab button**

  Find the `.lang-tabs` div. It currently has:
  ```html
  <button class="lang-tab" data-lang="kotlin">Kotlin</button>
  <button class="lang-tab" data-lang="go">Go</button>
  ```
  Add:
  ```html
  <button class="lang-tab" data-lang="java">Java</button>
  ```

- [ ] **Step 2: Add Java sidebar cat-list**

  Find the closing `</div>` of the Go cat-list (the one with `data-lang="go"`). Immediately after it, before `</nav>`, insert:

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

- [ ] **Step 3: Add empty Java section with 11 placeholder headings**

  After the closing `</section>` of the Go block and before `</main>`, insert:

  ```html
  <section id="java" class="lang-section">

  <h2 class="section-heading" id="java-lang-features">Language Features</h2>
  <!-- entries coming in Task 3 -->

  <h2 class="section-heading" id="java-lang">java.lang</h2>
  <!-- entries coming in Task 4 -->

  <h2 class="section-heading" id="java-util">java.util</h2>
  <!-- entries coming in Task 5 -->

  <h2 class="section-heading" id="java-stream">java.util.stream</h2>
  <!-- entries coming in Task 6 -->

  <h2 class="section-heading" id="java-time">java.time</h2>
  <!-- entries coming in Task 7 -->

  <h2 class="section-heading" id="java-io">java.io</h2>
  <!-- entries coming in Task 8 -->

  <h2 class="section-heading" id="java-nio">java.nio.file</h2>
  <!-- entries coming in Task 8 -->

  <h2 class="section-heading" id="java-concurrent">java.util.concurrent</h2>
  <!-- entries coming in Task 9 -->

  <h2 class="section-heading" id="java-http">java.net.http</h2>
  <!-- entries coming in Task 10 -->

  <h2 class="section-heading" id="java-regex">java.util.regex</h2>
  <!-- entries coming in Task 11 -->

  </section>
  ```

- [ ] **Step 4: Verify scaffold**

  ```bash
  # All 10 sidebar section IDs present
  grep -c 'id="java-' index.html
  # Expected: ≥10 (11 h2 sections + sidebar anchors)

  # Java tab button present
  grep 'data-lang="java"' index.html | head -5

  # Sidebar hidden by default
  grep 'data-lang="java" style="display:none"' index.html
  # Expected: 1 match
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add Java language tab scaffold — sidebar, empty section"
  ```

---

## Task 3: Language Features

Replace `<!-- entries coming in Task 3 -->` under `#java-lang-features`.

**Entry format:**
```html
<div class="entry">
  <code class="sig">record Point(double x, double y) { } (Java 16+)</code>
  <code class="snippet"><span class="kw">record</span> <span class="ty">Point</span>(<span class="ty">double</span> x, <span class="ty">double</span> y) {}
<span class="kw">var</span> p = <span class="kw">new</span> <span class="ty">Point</span>(<span class="num">3.0</span>, <span class="num">4.0</span>); <span class="cm">// p.x(), p.y(), equals, hashCode, toString — all generated</span></code>
  <span class="desc">Immutable data carrier; generates accessor methods, equals, hashCode, and toString automatically — replaces boilerplate POJOs.</span>
</div>
```

Syntax highlight classes: `.kw` for keywords (`class`/`record`/`sealed`/`interface`/`var`/`new`/`return`/`if`/`for`/`while`/`try`/`catch`/`finally`/`throws`/`static`/`final`/`null`/`this`/`super`/`instanceof`/`yield`/`switch`/`case`/`permits`/`void`/`true`/`false`), `.fn` for calls, `.ty` for types, `.str` for strings, `.num` for numbers, `.cm` for `// comments`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `record` entry**

  ```html
  <div class="entry">
    <code class="sig">record Point(double x, double y) { } (Java 16+)</code>
    <code class="snippet"><span class="kw">record</span> <span class="ty">User</span>(<span class="ty">long</span> id, <span class="ty">String</span> email, <span class="ty">Role</span> role) {}
  <span class="cm">// User.id(), User.email(), User.role(), equals, hashCode, toString — all generated</span></code>
    <span class="desc">Immutable data carrier; generates accessors, equals, hashCode, and toString — replaces boilerplate POJOs for DTOs, value objects, and domain events.</span>
  </div>
  ```

- [ ] **Step 2: Write `sealed` + `permits` entry**

  ```html
  <div class="entry">
    <code class="sig">sealed interface Shape permits Circle, Rectangle, Triangle { } (Java 17+)</code>
    <code class="snippet"><span class="kw">sealed</span> <span class="kw">interface</span> <span class="ty">Result</span>&lt;<span class="ty">T</span>&gt; <span class="kw">permits</span> <span class="ty">Ok</span>, <span class="ty">Err</span> {}
  <span class="kw">record</span> <span class="ty">Ok</span>&lt;<span class="ty">T</span>&gt;(<span class="ty">T</span> value) <span class="kw">implements</span> <span class="ty">Result</span>&lt;<span class="ty">T</span>&gt; {}
  <span class="kw">record</span> <span class="ty">Err</span>&lt;<span class="ty">T</span>&gt;(<span class="ty">String</span> msg) <span class="kw">implements</span> <span class="ty">Result</span>&lt;<span class="ty">T</span>&gt; {}</code>
    <span class="desc">Sealed types constrain which classes can implement/extend them; the compiler knows all subtypes, enabling exhaustive switch without a default branch.</span>
  </div>
  ```

- [ ] **Step 3: Write pattern matching `instanceof` entry**

  ```html
  <div class="entry">
    <code class="sig">if (obj instanceof TypeName varName) { ... } (Java 16+)</code>
    <code class="snippet"><span class="kw">if</span> (event <span class="kw">instanceof</span> <span class="ty">OrderPlaced</span> o &amp;&amp; o.total() &gt; <span class="num">1000</span>) {
    <span class="fn">notifyFraudTeam</span>(o);
  }</code>
    <span class="desc">Combines type check and cast in one expression; the binding variable is scoped to the true branch so no explicit cast needed.</span>
  </div>
  ```

- [ ] **Step 4: Write pattern matching `switch` entry**

  ```html
  <div class="entry">
    <code class="sig">switch (expr) { case Type t -> ...; case Type2 t when guard -> ...; } (Java 21+)</code>
    <code class="snippet"><span class="kw">var</span> area = <span class="kw">switch</span> (shape) {
    <span class="kw">case</span> <span class="ty">Circle</span> c    -&gt; Math.PI * c.radius() * c.radius();
    <span class="kw">case</span> <span class="ty">Rectangle</span> r -&gt; r.width() * r.height();
    <span class="kw">case</span> <span class="ty">Triangle</span> t  -&gt; <span class="num">0.5</span> * t.base() * t.height();
  }; <span class="cm">// exhaustive — no default needed for sealed Shape</span></code>
    <span class="desc">Type patterns in switch dispatch on runtime type; with sealed types the compiler enforces exhaustiveness, eliminating hidden default cases.</span>
  </div>
  ```

- [ ] **Step 5: Write record patterns entry**

  ```html
  <div class="entry">
    <code class="sig">case Record(Type component, ...) -> ... (Java 21+)</code>
    <code class="snippet"><span class="kw">if</span> (result <span class="kw">instanceof</span> <span class="ty">Ok</span>(<span class="kw">var</span> value)) {
    <span class="fn">render</span>(value);
  } <span class="cm">// destructures the record inline — no .value() call needed</span></code>
    <span class="desc">Record patterns deconstruct a record's components inline inside instanceof or switch; pairs with sealed hierarchies for exhaustive structural matching.</span>
  </div>
  ```

- [ ] **Step 6: Write text blocks entry**

  ```html
  <div class="entry">
    <code class="sig">"""..."""  (Java 15+)</code>
    <code class="snippet"><span class="kw">var</span> sql = <span class="str">"""
          SELECT id, email
          FROM users
          WHERE role = ?
          ORDER BY created_at DESC
          LIMIT ?
          """</span>; <span class="cm">// leading whitespace stripped to the least-indented line</span></code>
    <span class="desc">Multi-line string literal; indentation is stripped automatically, \ suppresses a newline, and \s preserves trailing spaces.</span>
  </div>
  ```

- [ ] **Step 7: Write `var` entry**

  ```html
  <div class="entry">
    <code class="sig">var name = expr;  (Java 10+)</code>
    <code class="snippet"><span class="kw">var</span> users = <span class="kw">new</span> <span class="ty">ArrayList</span>&lt;<span class="ty">User</span>&gt;();
  <span class="kw">var</span> result = userRepo.<span class="fn">findById</span>(id); <span class="cm">// type inferred from RHS</span></code>
    <span class="desc">Local variable type inference; legal only for local variables with an initializer — not for fields, parameters, or return types.</span>
  </div>
  ```

- [ ] **Step 8: Write switch expressions entry**

  ```html
  <div class="entry">
    <code class="sig">int x = switch (val) { case A -> 1; case B -> { yield compute(); } }; (Java 14+)</code>
    <code class="snippet"><span class="kw">var</span> level = <span class="kw">switch</span> (statusCode) {
    <span class="kw">case</span> <span class="num">200</span>, <span class="num">201</span> -&gt; <span class="str">"OK"</span>;
    <span class="kw">case</span> <span class="num">400</span>       -&gt; <span class="str">"BAD_REQUEST"</span>;
    <span class="kw">case</span> <span class="num">500</span>       -&gt; <span class="str">"ERROR"</span>;
    <span class="kw">default</span>        -&gt; <span class="str">"UNKNOWN"</span>;
  };</code>
    <span class="desc">Switch as an expression returning a value; arrow cases don't fall through, and yield returns from a block case.</span>
  </div>
  ```

- [ ] **Step 9: Write `@FunctionalInterface` entry**

  ```html
  <div class="entry">
    <code class="sig">@FunctionalInterface interface Name { ReturnType method(Params); }</code>
    <code class="snippet"><span class="kw">@FunctionalInterface</span>
  <span class="kw">interface</span> <span class="ty">Validator</span>&lt;<span class="ty">T</span>&gt; { <span class="ty">List</span>&lt;<span class="ty">String</span>&gt; <span class="fn">validate</span>(<span class="ty">T</span> t); }
  <span class="ty">Validator</span>&lt;<span class="ty">Order</span>&gt; v = o -&gt; o.items().<span class="fn">isEmpty</span>() ? <span class="ty">List</span>.<span class="fn">of</span>(<span class="str">"empty order"</span>) : <span class="ty">List</span>.<span class="fn">of</span>();</code>
    <span class="desc">Marks an interface as having exactly one abstract method; enables lambda/method-reference assignment and compile-time enforcement.</span>
  </div>
  ```

- [ ] **Step 10: Write unnamed patterns `_` entry**

  ```html
  <div class="entry">
    <code class="sig">case Type _ -> ...  /  catch (Ex _) { }  (Java 22+)</code>
    <code class="snippet"><span class="kw">switch</span> (event) {
    <span class="kw">case</span> <span class="ty">OrderPlaced</span> o -&gt; <span class="fn">process</span>(o);
    <span class="kw">case</span> <span class="ty">OrderCancelled</span> _ -&gt; <span class="cm">// nothing to do</span>
    <span class="kw">default</span> -&gt; {}
  }</code>
    <span class="desc">Unnamed pattern variable _ signals intentionally unused binding; also valid in catch clauses and enhanced-for when the variable is not used.</span>
  </div>
  ```

- [ ] **Step 11: Write compact record constructor entry**

  ```html
  <div class="entry">
    <code class="sig">record Name(Type field) { Name { /* validate/transform */ } } (Java 16+)</code>
    <code class="snippet"><span class="kw">record</span> <span class="ty">Email</span>(<span class="ty">String</span> address) {
    <span class="ty">Email</span> { <span class="cm">// compact constructor — params are the components</span>
      <span class="kw">if</span> (!address.<span class="fn">contains</span>(<span class="str">"@"</span>)) <span class="kw">throw new</span> <span class="ty">IllegalArgumentException</span>(address);
      address = address.<span class="fn">strip</span>().<span class="fn">toLowerCase</span>();
    }
  }</code>
    <span class="desc">Compact constructor omits parameter list; validates or normalises components before they are assigned — the canonical way to enforce record invariants.</span>
  </div>
  ```

- [ ] **Step 12: Write `instanceof` pattern with `&&` guard entry**

  ```html
  <div class="entry">
    <code class="sig">obj instanceof Type t &amp;&amp; t.method() (Java 16+)</code>
    <code class="snippet"><span class="kw">if</span> (payload <span class="kw">instanceof</span> <span class="ty">String</span> s &amp;&amp; !s.<span class="fn">isBlank</span>()) {
    <span class="fn">parseAndRoute</span>(s);
  }</code>
    <span class="desc">Pattern binding is in scope for the rest of the &&-chain; enables combined type check and predicate in a single readable expression.</span>
  </div>
  ```

- [ ] **Step 13: Verify**

  ```bash
  awk '/id="java-lang-features"/,/id="java-lang"/' index.html | grep -c 'class="entry"'
  # Expected: ≥12
  ```

- [ ] **Step 14: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add Java language features — records, sealed, pattern matching, text blocks"
  ```

---

## Task 4: java.lang

Replace `<!-- entries coming in Task 4 -->` under `#java-lang`.

Use `<div class="sub-heading">` to separate: `String`, `StringBuilder`, `Math`, `System / Runtime`, `Thread`, `Wrapper Types`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `String` entries (≥10)**

  Required: `length`/`charAt`/`substring`/`indexOf`/`lastIndexOf`, `contains`/`startsWith`/`endsWith`, `replace`/`replaceAll`, `strip`/`stripLeading`/`stripTrailing`/`isBlank`, `lines`, `repeat`, `formatted` (Java 15+), `split`, `join`, `toUpperCase`/`toLowerCase`, `toCharArray`/`chars`, `valueOf`/`String.format`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">String.formatted(Object... args) → String (Java 15+)</code>
    <code class="snippet"><span class="kw">var</span> msg = <span class="str">"User %s (id=%d) logged in from %s"</span>.<span class="fn">formatted</span>(name, id, ip);</code>
    <span class="desc">Instance-method shorthand for String.format(this, args); reads left-to-right without the static prefix.</span>
  </div>
  ```

- [ ] **Step 2: Write `StringBuilder` entries (≥5)**

  Required: `append`, `insert`, `delete`/`deleteCharAt`, `reverse`, `toString`, `length`, `charAt`, `replace`, `indexOf`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">StringBuilder append(Object obj) → StringBuilder</code>
    <code class="snippet"><span class="kw">var</span> sb = <span class="kw">new</span> <span class="ty">StringBuilder</span>();
  <span class="kw">for</span> (<span class="kw">var</span> seg : pathSegments) { sb.<span class="fn">append</span>(<span class="str">'/'</span>).<span class="fn">append</span>(seg); }
  <span class="kw">return</span> sb.<span class="fn">toString</span>();</code>
    <span class="desc">Mutable string builder; chaining append calls avoids intermediate String allocations in loops.</span>
  </div>
  ```

- [ ] **Step 3: Write `Math` entries (≥6)**

  Required: `abs`/`min`/`max`, `pow`/`sqrt`, `floor`/`ceil`/`round`, `log`/`log10`, `PI`/`E`, `clamp` (Java 21+)

- [ ] **Step 4: Write `System` / `Runtime` entries (≥5)**

  Required: `currentTimeMillis`/`nanoTime`, `arraycopy`, `getenv`, `lineSeparator`, `exit`, `gc`, `Runtime.getRuntime().availableProcessors()`/`maxMemory()`

- [ ] **Step 5: Write `Thread` entries (≥5)**

  Required: `Thread.ofVirtual().start()` (Java 21+), `Thread.sleep`, `currentThread`, `isVirtual` (Java 21+), `getName`/`setName`, `interrupt`/`interrupted`/`isInterrupted`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">Thread.ofVirtual().start(Runnable) → Thread (Java 21+)</code>
    <code class="snippet"><span class="kw">var</span> t = <span class="ty">Thread</span>.<span class="fn">ofVirtual</span>().<span class="fn">name</span>(<span class="str">"worker-"</span>, <span class="num">0</span>).<span class="fn">start</span>(() -&gt; <span class="fn">handleRequest</span>(req));
  <span class="cm">// virtual threads are cheap — millions can exist simultaneously</span></code>
    <span class="desc">Creates and starts a virtual thread; virtual threads are lightweight JVM-managed fibers, not OS threads — ideal for high-concurrency I/O tasks.</span>
  </div>
  ```

- [ ] **Step 6: Write wrapper type entries (≥5)**

  Required: `Integer.parseInt`/`valueOf`/`toBinaryString`/`toHexString`/`compare`/`MAX_VALUE`/`MIN_VALUE`, `Double.parseDouble`/`isNaN`/`isInfinite`, `Boolean.parseBoolean`, autoboxing note

- [ ] **Step 7: Verify**

  ```bash
  awk '/id="java-lang">/,/id="java-util"/' index.html | grep -c 'class="entry"'
  # Expected: ≥20 (but use the h2 tag not anchor — adjust awk as needed)
  grep -A2 'id="java-lang"' index.html | head -3
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.lang — String, StringBuilder, Math, System, Thread, wrappers"
  ```

---

## Task 5: java.util

Replace `<!-- entries coming in Task 5 -->` under `#java-util`.

Use `<div class="sub-heading">` for: `List`, `Set`, `Map`, `Queue / Deque`, `SequencedCollection (Java 21+)`, `Collections`, `Arrays`, `Objects`, `Optional`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `List` entries (≥8)**

  Required: `List.of`/`List.copyOf`, `new ArrayList<>()`, `add`/`addAll`/`get`/`set`/`remove`/`size`/`isEmpty`, `sort`, `subList`, `contains`/`indexOf`, `iterator`, `stream`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">static &lt;E&gt; List&lt;E&gt; List.of(E... elements) → unmodifiable List</code>
    <code class="snippet"><span class="kw">var</span> roles = <span class="ty">List</span>.<span class="fn">of</span>(<span class="str">"admin"</span>, <span class="str">"editor"</span>, <span class="str">"viewer"</span>); <span class="cm">// null-hostile, fixed size</span></code>
    <span class="desc">Creates an unmodifiable list; throws NullPointerException on null elements and UnsupportedOperationException on mutation — use ArrayList for mutable lists.</span>
  </div>
  ```

- [ ] **Step 2: Write `Set` entries (≥5)**

  Required: `Set.of`/`Set.copyOf`, `new HashSet<>()`/`new TreeSet<>()`/`new LinkedHashSet<>()`, `contains`/`add`/`remove`, `Set.of` null-hostile note

- [ ] **Step 3: Write `Map` entries (≥10)**

  Required: `Map.of`/`Map.entry`/`Map.copyOf`, `new HashMap<>()`/`new TreeMap<>()`/`new LinkedHashMap<>()`, `get`/`put`/`remove`, `getOrDefault`, `putIfAbsent`, `computeIfAbsent`, `merge`, `forEach`, `entrySet`/`keySet`/`values`, `containsKey`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">V computeIfAbsent(K key, Function&lt;K,V&gt; mappingFn) → V</code>
    <code class="snippet">cache.<span class="fn">computeIfAbsent</span>(userId, id -&gt; db.<span class="fn">findUser</span>(id))
  <span class="cm">// atomically: if absent, compute and store; returns existing or new value</span></code>
    <span class="desc">Inserts the computed value only if the key is absent; thread-safe on ConcurrentHashMap — the standard lazy-loading cache pattern.</span>
  </div>
  ```

- [ ] **Step 4: Write `SequencedCollection` entries (≥3, Java 21+)**

  Required: `getFirst`/`getLast`/`addFirst`/`addLast`/`removeFirst`/`removeLast`/`reversed` on List, Deque, LinkedHashMap

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">SequencedCollection&lt;E&gt;: getFirst(), getLast(), addFirst(E), addLast(E), reversed() (Java 21+)</code>
    <code class="snippet"><span class="kw">var</span> history = <span class="kw">new</span> <span class="ty">ArrayDeque</span>&lt;<span class="ty">Event</span>&gt;();
  history.<span class="fn">addFirst</span>(latest); <span class="cm">// O(1) prepend</span>
  <span class="kw">var</span> oldest = history.<span class="fn">getLast</span>();</code>
    <span class="desc">Unified interface for ordered collections with defined first/last elements; ArrayDeque, ArrayList, LinkedHashSet, and LinkedHashMap all implement it.</span>
  </div>
  ```

- [ ] **Step 5: Write `Queue` / `Deque` entries (≥4)**

  Required: `ArrayDeque` as stack (`push`/`pop`/`peek`) and queue (`offer`/`poll`/`peek`), `PriorityQueue` with Comparator

- [ ] **Step 6: Write `Collections` entries (≥6)**

  Required: `sort`/`shuffle`/`reverse`/`unmodifiableList`/`synchronizedList`/`frequency`/`min`/`max`/`nCopies`/`disjoint`

- [ ] **Step 7: Write `Arrays` entries (≥6)**

  Required: `sort`/`binarySearch`/`copyOf`/`copyOfRange`/`fill`/`asList`/`stream`/`equals`/`deepEquals`/`toString`

- [ ] **Step 8: Write `Objects` entries (≥5)**

  Required: `requireNonNull`/`requireNonNullElse`/`isNull`/`nonNull`/`toString`/`equals`/`hash`/`checkIndex` (Java 9+)

- [ ] **Step 9: Write `Optional` entries (≥8)**

  Required: `of`/`ofNullable`/`empty`, `isPresent`/`isEmpty`, `get`/`orElse`/`orElseGet`/`orElseThrow`, `map`/`flatMap`/`filter`, `ifPresent`/`ifPresentOrElse`, `stream`, `or`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">Optional&lt;T&gt; Optional.ofNullable(T value) / .orElseGet(Supplier&lt;T&gt;) / .map(Function)</code>
    <code class="snippet"><span class="kw">var</span> city = <span class="ty">Optional</span>.<span class="fn">ofNullable</span>(user.<span class="fn">address</span>())
      .<span class="fn">map</span>(<span class="ty">Address</span>::city)
      .<span class="fn">orElse</span>(<span class="str">"Unknown"</span>);</code>
    <span class="desc">ofNullable wraps a potentially-null value; chain map/flatMap to transform, orElse/orElseGet to extract with a default — avoids null checks in pipelines.</span>
  </div>
  ```

- [ ] **Step 10: Verify**

  ```bash
  awk '/id="java-util"/,/id="java-stream"/' index.html | grep -c 'class="entry"'
  # Expected: ≥25
  ```

- [ ] **Step 11: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.util — List, Set, Map, Optional, Collections, Arrays, Objects"
  ```

---

## Task 6: java.util.stream + java.util.function

Replace `<!-- entries coming in Task 6 -->` under `#java-stream`.

Use `<div class="sub-heading">` for: `Stream`, `IntStream / LongStream`, `Collectors`, `java.util.function`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `Stream` intermediate operation entries (≥8)**

  Required: `filter`, `map`/`mapToInt`/`mapToObj`, `flatMap`, `distinct`, `sorted`, `peek`, `limit`/`skip`, `takeWhile`/`dropWhile` (Java 9+)

- [ ] **Step 2: Write `Stream` terminal operation entries (≥8)**

  Required: `collect`, `forEach`, `count`, `findFirst`/`findAny`, `anyMatch`/`allMatch`/`noneMatch`, `reduce`, `toList` (Java 16+), `min`/`max`, `toArray`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">List&lt;T&gt; Stream.toList() → unmodifiable List (Java 16+)</code>
    <code class="snippet"><span class="kw">var</span> activeUserIds = users.<span class="fn">stream</span>()
      .<span class="fn">filter</span>(<span class="ty">User</span>::isActive)
      .<span class="fn">map</span>(<span class="ty">User</span>::id)
      .<span class="fn">toList</span>(); <span class="cm">// shorter than .collect(Collectors.toUnmodifiableList())</span></code>
    <span class="desc">Terminal shorthand returning an unmodifiable List; preferred over Collectors.toList() since Java 16.</span>
  </div>
  ```

- [ ] **Step 3: Write `Stream` creation entries (≥4)**

  Required: `Collection.stream`/`parallelStream`, `Stream.of`/`Stream.generate`/`Stream.iterate`, `Arrays.stream`, `Stream.empty`

- [ ] **Step 4: Write `IntStream` / `LongStream` entries (≥4)**

  Required: `IntStream.range`/`rangeClosed`, `sum`/`average`/`min`/`max`, `boxed`, `mapToObj`, `LongStream.range`

- [ ] **Step 5: Write `Collectors` entries (≥8)**

  Required: `toList`/`toSet`/`toMap`, `groupingBy`/`partitioningBy`, `joining`, `counting`, `summarizingInt`, `toUnmodifiableList`/`toUnmodifiableMap`, `teeing` (Java 12+)

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">Collectors.groupingBy(Function classifier) / groupingBy(Function, Collector downstream)</code>
    <code class="snippet"><span class="ty">Map</span>&lt;<span class="ty">Department</span>, <span class="ty">List</span>&lt;<span class="ty">Employee</span>&gt;&gt; byDept = employees.<span class="fn">stream</span>()
      .<span class="fn">collect</span>(<span class="ty">Collectors</span>.<span class="fn">groupingBy</span>(<span class="ty">Employee</span>::department));
  <span class="ty">Map</span>&lt;<span class="ty">Department</span>, <span class="ty">Long</span>&gt; countByDept = employees.<span class="fn">stream</span>()
      .<span class="fn">collect</span>(<span class="ty">Collectors</span>.<span class="fn">groupingBy</span>(<span class="ty">Employee</span>::department, <span class="ty">Collectors</span>.<span class="fn">counting</span>()));</code>
    <span class="desc">Groups elements by a classifier into a Map&lt;K, List&lt;V&gt;&gt;; downstream collector transforms the grouped values — counting, averaging, joining, etc.</span>
  </div>
  ```

- [ ] **Step 6: Write `java.util.function` entries (≥6)**

  Required: `Function<T,R>`/`andThen`/`compose`/`identity`, `Predicate<T>`/`negate`/`and`/`or`, `Consumer<T>`, `Supplier<T>`, `BiFunction<T,U,R>`, `UnaryOperator<T>`, `BinaryOperator<T>`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">Predicate&lt;T&gt;: test(T), negate(), and(Predicate), or(Predicate), not(Predicate) (Java 11+)</code>
    <code class="snippet"><span class="ty">Predicate</span>&lt;<span class="ty">User</span>&gt; active = <span class="ty">User</span>::isActive;
  <span class="ty">Predicate</span>&lt;<span class="ty">User</span>&gt; admin  = u -&gt; u.role() == <span class="ty">Role</span>.ADMIN;
  <span class="kw">var</span> activeAdmins = users.<span class="fn">stream</span>().<span class="fn">filter</span>(active.<span class="fn">and</span>(admin)).<span class="fn">toList</span>();</code>
    <span class="desc">Compose predicates with and/or/negate instead of nesting &&; Predicate.not(Predicate) wraps an instance method reference.</span>
  </div>
  ```

- [ ] **Step 7: Verify**

  ```bash
  awk '/id="java-stream"/,/id="java-time"/' index.html | grep -c 'class="entry"'
  # Expected: ≥22
  ```

- [ ] **Step 8: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.util.stream, Collectors, java.util.function"
  ```

---

## Task 7: java.time

Replace `<!-- entries coming in Task 7 -->` under `#java-time`.

Use `<div class="sub-heading">` for: `LocalDate / LocalTime / LocalDateTime`, `ZonedDateTime / Instant`, `Duration / Period`, `DateTimeFormatter`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `LocalDate` entries (≥6)**

  Required: `now`/`of`/`parse`, `plusDays`/`plusMonths`/`plusYears`/`minusDays`, `isBefore`/`isAfter`/`isEqual`, `getDayOfWeek`/`getDayOfMonth`/`getMonth`/`getYear`, `withDayOfMonth`, `lengthOfMonth`, `atStartOfDay`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">static LocalDate LocalDate.parse(CharSequence text, DateTimeFormatter formatter)</code>
    <code class="snippet"><span class="kw">var</span> dob = <span class="ty">LocalDate</span>.<span class="fn">parse</span>(request.<span class="fn">getParameter</span>(<span class="str">"dob"</span>),
      <span class="ty">DateTimeFormatter</span>.<span class="fn">ofPattern</span>(<span class="str">"dd/MM/yyyy"</span>));
  <span class="kw">var</span> age = <span class="ty">Period</span>.<span class="fn">between</span>(dob, <span class="ty">LocalDate</span>.<span class="fn">now</span>()).<span class="fn">getYears</span>();</code>
    <span class="desc">Parses a date string with an explicit formatter; always specify the formatter for user-supplied input to handle locale differences.</span>
  </div>
  ```

- [ ] **Step 2: Write `LocalTime` / `LocalDateTime` entries (≥4)**

  Required: `LocalTime.now`/`of`/`parse`/`plusHours`/`isBefore`, `LocalDateTime.now`/`of`/`atZone`/`toLocalDate`/`toLocalTime`

- [ ] **Step 3: Write `ZonedDateTime` / `Instant` entries (≥5)**

  Required: `ZonedDateTime.now`/`withZoneSameInstant`/`toInstant`, `Instant.now`/`ofEpochMilli`/`toEpochMilli`/`plus`/`isBefore`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">Instant Instant.now() / ofEpochMilli(long) / toEpochMilli() → long</code>
    <code class="snippet"><span class="kw">var</span> start = <span class="ty">Instant</span>.<span class="fn">now</span>();
  <span class="fn">doWork</span>();
  <span class="kw">var</span> elapsed = <span class="ty">Duration</span>.<span class="fn">between</span>(start, <span class="ty">Instant</span>.<span class="fn">now</span>()).<span class="fn">toMillis</span>();</code>
    <span class="desc">Instant represents a point on the timeline in UTC; use for timestamps stored in databases or sent over APIs — never LocalDateTime for wall-clock comparisons.</span>
  </div>
  ```

- [ ] **Step 4: Write `Duration` / `Period` entries (≥4)**

  Required: `Duration.between`/`of`/`toMillis`/`toSeconds`/`toMinutes`/`toHours`/`plus`/`isNegative`, `Period.between`/`of`/`getYears`/`getMonths`

- [ ] **Step 5: Write `DateTimeFormatter` entries (≥4)**

  Required: `ofPattern`, `ISO_LOCAL_DATE`/`ISO_INSTANT`/`ISO_OFFSET_DATE_TIME`, `format`/`parse`, `withZone`/`withLocale`

- [ ] **Step 6: Verify**

  ```bash
  awk '/id="java-time"/,/id="java-io"/' index.html | grep -c 'class="entry"'
  # Expected: ≥18
  ```

- [ ] **Step 7: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.time — LocalDate, Instant, Duration, DateTimeFormatter"
  ```

---

## Task 8: java.io + java.nio.file

Two separate `<h2>` sections. Replace `<!-- entries coming in Task 8 -->` under both `#java-io` and `#java-nio`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `java.io` entries (≥10)**

  Use sub-heading `java.io — legacy I/O` inside the section.

  Required: `InputStream.read`/`readAllBytes`/`transferTo`, `OutputStream.write`/`flush`/`close`, `FileInputStream`/`FileOutputStream`, `InputStreamReader`/`OutputStreamWriter` (charset bridging), `BufferedReader.readLine`/`lines`/try-with-resources, `BufferedWriter`/`PrintWriter.println`/`flush`, `StringWriter`/`StringReader`, `ByteArrayOutputStream.toByteArray`, `DataInputStream`/`DataOutputStream`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">InputStream.transferTo(OutputStream out) → long (Java 9+)</code>
    <code class="snippet"><span class="kw">try</span> (<span class="kw">var</span> in  = <span class="kw">new</span> <span class="ty">FileInputStream</span>(src);
         <span class="kw">var</span> out = <span class="kw">new</span> <span class="ty">FileOutputStream</span>(dst)) {
    in.<span class="fn">transferTo</span>(out); <span class="cm">// copies all bytes; returns byte count</span>
  }</code>
    <span class="desc">Copies all bytes from this stream to out; prefer Files.copy() for file-to-file work, but transferTo is useful when you already have stream handles.</span>
  </div>
  ```

- [ ] **Step 2: Write `java.nio.file` entries (≥12)**

  Required: `Path.of`/`resolve`/`relativize`/`getParent`/`getFileName`/`normalize`/`toAbsolutePath`/`toFile`, `Files.readString`/`writeString`/`readAllBytes`/`write`/`copy`/`move`/`delete`/`deleteIfExists`/`exists`/`isDirectory`/`isRegularFile`/`size`/`createDirectories`/`createTempFile`/`list`/`walk`/`lines`/`newBufferedReader`/`newBufferedWriter`, `StandardOpenOption.CREATE`/`APPEND`/`TRUNCATE_EXISTING`, `SimpleFileVisitor`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">static String Files.readString(Path path) → String (Java 11+)</code>
    <code class="snippet"><span class="kw">var</span> config = <span class="ty">Files</span>.<span class="fn">readString</span>(<span class="ty">Path</span>.<span class="fn">of</span>(<span class="str">"config/app.properties"</span>));
  <span class="kw">var</span> props = <span class="kw">new</span> <span class="ty">Properties</span>(); props.<span class="fn">load</span>(<span class="kw">new</span> <span class="ty">StringReader</span>(config));</code>
    <span class="desc">Reads an entire file as a UTF-8 string in one call; use for config files and small assets, not streaming multi-GB files.</span>
  </div>
  ```

  ```html
  <div class="entry">
    <code class="sig">static Stream&lt;Path&gt; Files.walk(Path start, int maxDepth, FileVisitOption...) (Java 8+)</code>
    <code class="snippet"><span class="kw">try</span> (<span class="kw">var</span> stream = <span class="ty">Files</span>.<span class="fn">walk</span>(<span class="ty">Path</span>.<span class="fn">of</span>(<span class="str">"src"</span>))) {
    stream.<span class="fn">filter</span>(p -&gt; p.<span class="fn">toString</span>().<span class="fn">endsWith</span>(<span class="str">".java"</span>))
          .<span class="fn">forEach</span>(<span class="ty">System</span>.out::println);
  }</code>
    <span class="desc">Lazy depth-first walk returning a Stream&lt;Path&gt;; must be closed (try-with-resources) to release the directory handle.</span>
  </div>
  ```

- [ ] **Step 3: Verify**

  ```bash
  awk '/id="java-io"/,/id="java-concurrent"/' index.html | grep -c 'class="entry"'
  # Expected: ≥22
  ```

- [ ] **Step 4: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.io and java.nio.file"
  ```

---

## Task 9: java.util.concurrent

Replace `<!-- entries coming in Task 9 -->` under `#java-concurrent`.

Use `<div class="sub-heading">` for: `Virtual Threads`, `ExecutorService`, `CompletableFuture`, `Synchronizers`, `Concurrent Collections`, `Atomic Types`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write virtual thread entries (≥3)**

  Required: `Thread.ofVirtual().start()`/`Thread.startVirtualThread`, `Executors.newVirtualThreadPerTaskExecutor`, `try-with-resources ExecutorService`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">static ExecutorService Executors.newVirtualThreadPerTaskExecutor() (Java 21+)</code>
    <code class="snippet"><span class="kw">try</span> (<span class="kw">var</span> exec = <span class="ty">Executors</span>.<span class="fn">newVirtualThreadPerTaskExecutor</span>()) {
    <span class="kw">for</span> (<span class="kw">var</span> url : urls) exec.<span class="fn">submit</span>(() -&gt; <span class="fn">fetch</span>(url));
  } <span class="cm">// auto-closes: waits for all tasks, then shuts down</span></code>
    <span class="desc">Creates a new virtual thread per submitted task; ExecutorService is AutoCloseable in Java 19+ so try-with-resources replaces shutdown/awaitTermination.</span>
  </div>
  ```

- [ ] **Step 2: Write `StructuredTaskScope` entries (≥2)**

  Required: `StructuredTaskScope.ShutdownOnFailure`/`ShutdownOnSuccess`, `fork`/`join`/`throwIfFailed`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">StructuredTaskScope.ShutdownOnFailure — fork(Callable), join(), throwIfFailed() (preview / Java 21+)</code>
    <code class="snippet"><span class="kw">try</span> (<span class="kw">var</span> scope = <span class="kw">new</span> <span class="ty">StructuredTaskScope.ShutdownOnFailure</span>()) {
    <span class="kw">var</span> user   = scope.<span class="fn">fork</span>(() -&gt; userRepo.<span class="fn">findById</span>(id));
    <span class="kw">var</span> orders = scope.<span class="fn">fork</span>(() -&gt; orderRepo.<span class="fn">findByUser</span>(id));
    scope.<span class="fn">join</span>().<span class="fn">throwIfFailed</span>();
    <span class="kw">return</span> <span class="kw">new</span> <span class="ty">Dashboard</span>(user.<span class="fn">get</span>(), orders.<span class="fn">get</span>());
  }</code>
    <span class="desc">Structured concurrency: fan out subtasks, wait for all, cancel remaining if any fails — lifetime tied to the scope block. Preview API, expected to finalize in Java 26.</span>
  </div>
  ```

- [ ] **Step 3: Write `ExecutorService` entries (≥5)**

  Required: `Executors.newFixedThreadPool`/`newCachedThreadPool`/`newSingleThreadExecutor`/`newScheduledThreadPool`, `submit`/`invokeAll`/`invokeAny`, `shutdown`/`shutdownNow`/`awaitTermination`, `Future.get`/`cancel`/`isDone`

- [ ] **Step 4: Write `CompletableFuture` entries (≥8)**

  Required: `supplyAsync`/`runAsync`, `thenApply`/`thenAccept`/`thenRun`, `thenCompose`, `thenCombine`, `exceptionally`/`handle`/`whenComplete`, `allOf`/`anyOf`, `join`/`get`/`complete`/`completeExceptionally`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">CompletableFuture.supplyAsync(Supplier, Executor).thenApply(Function).exceptionally(Function)</code>
    <code class="snippet"><span class="kw">var</span> future = <span class="ty">CompletableFuture</span>
      .<span class="fn">supplyAsync</span>(() -&gt; api.<span class="fn">fetchUser</span>(id), executor)
      .<span class="fn">thenApply</span>(<span class="ty">User</span>::toDto)
      .<span class="fn">exceptionally</span>(ex -&gt; <span class="ty">UserDto</span>.<span class="fn">unknown</span>());</code>
    <span class="desc">Async pipeline: supplyAsync runs on a thread pool, thenApply transforms the result, exceptionally handles failures — all non-blocking.</span>
  </div>
  ```

- [ ] **Step 5: Write synchronizer entries (≥4)**

  Required: `CountDownLatch.await`/`countDown`, `CyclicBarrier.await`, `Semaphore.acquire`/`release`/`tryAcquire`, `ReentrantLock.lock`/`unlock`/`tryLock`, `ReentrantReadWriteLock.readLock`/`writeLock`

- [ ] **Step 6: Write concurrent collection entries (≥3)**

  Required: `ConcurrentHashMap.putIfAbsent`/`computeIfAbsent`/`merge`/`forEach`, `CopyOnWriteArrayList`, `LinkedBlockingQueue.put`/`take`/`offer`/`poll`

- [ ] **Step 7: Write atomic type entries (≥4)**

  Required: `AtomicInteger.get`/`incrementAndGet`/`getAndAdd`/`compareAndSet`, `AtomicLong`, `AtomicReference.get`/`set`/`compareAndSet`, `AtomicBoolean`

- [ ] **Step 8: Verify**

  ```bash
  awk '/id="java-concurrent"/,/id="java-http"/' index.html | grep -c 'class="entry"'
  # Expected: ≥20
  ```

- [ ] **Step 9: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.util.concurrent — virtual threads, CompletableFuture, StructuredTaskScope"
  ```

---

## Task 10: java.net.http

Replace `<!-- entries coming in Task 10 -->` under `#java-http`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `HttpClient` entries (≥3)**

  Required: `HttpClient.newHttpClient`/`newBuilder`, builder options (`connectTimeout`/`followRedirects`/`executor`), `send`/`sendAsync`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">HttpClient.newBuilder().connectTimeout(Duration).followRedirects(Redirect).build() (Java 11+)</code>
    <code class="snippet"><span class="kw">var</span> client = <span class="ty">HttpClient</span>.<span class="fn">newBuilder</span>()
      .<span class="fn">connectTimeout</span>(<span class="ty">Duration</span>.<span class="fn">ofSeconds</span>(<span class="num">10</span>))
      .<span class="fn">followRedirects</span>(<span class="ty">HttpClient.Redirect</span>.NORMAL)
      .<span class="fn">build</span>();</code>
    <span class="desc">The HttpClient is thread-safe and should be reused across requests; NORMAL follows redirects except from HTTPS to HTTP.</span>
  </div>
  ```

- [ ] **Step 2: Write `HttpRequest` entries (≥4)**

  Required: `HttpRequest.newBuilder().uri().GET()/POST()/PUT()/DELETE().header().timeout().build()`, `BodyPublishers.ofString`/`ofFile`/`ofByteArray`/`noBody`

- [ ] **Step 3: Write sync / async send entries (≥2)**

  Required: `client.send(request, BodyHandlers.ofString())`, `client.sendAsync(request, handler).thenApply(HttpResponse::body)`

- [ ] **Step 4: Write `HttpResponse` / `BodyHandlers` entries (≥3)**

  Required: `response.statusCode`/`body`/`headers`, `BodyHandlers.ofString`/`ofFile`/`ofByteArray`/`ofInputStream`/`discarding`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">HttpClient.sendAsync(HttpRequest, BodyHandler&lt;T&gt;) → CompletableFuture&lt;HttpResponse&lt;T&gt;&gt;</code>
    <code class="snippet">client.<span class="fn">sendAsync</span>(req, <span class="ty">HttpResponse.BodyHandlers</span>.<span class="fn">ofString</span>())
      .<span class="fn">thenApply</span>(<span class="ty">HttpResponse</span>::body)
      .<span class="fn">thenAccept</span>(json -&gt; <span class="fn">process</span>(json));</code>
    <span class="desc">Non-blocking HTTP; returns a CompletableFuture — compose with thenApply/exceptionally for the full async pipeline without blocking threads.</span>
  </div>
  ```

- [ ] **Step 5: Write `WebSocket` entry**

  Required: `HttpClient.newWebSocketBuilder().buildAsync(URI, WebSocket.Listener)`, `sendText`/`sendBinary`/`sendClose`/`request`

  ```html
  <div class="entry">
    <code class="sig">HttpClient.newWebSocketBuilder().buildAsync(URI, WebSocket.Listener) → CompletableFuture&lt;WebSocket&gt; (Java 11+)</code>
    <code class="snippet">client.<span class="fn">newWebSocketBuilder</span>()
      .<span class="fn">buildAsync</span>(<span class="ty">URI</span>.<span class="fn">create</span>(<span class="str">"wss://api.example.com/ws"</span>), listener)
      .<span class="fn">thenAccept</span>(ws -&gt; ws.<span class="fn">sendText</span>(<span class="str">"hello"</span>, <span class="kw">true</span>));</code>
    <span class="desc">Creates a WebSocket connection; the Listener receives onText/onBinary/onClose/onError callbacks — call request(n) in each callback to allow more messages.</span>
  </div>
  ```

- [ ] **Step 6: Write `HttpHeaders` entry**

  Required: `firstValue`/`allValues`/`map`

- [ ] **Step 8: Verify**

  ```bash
  awk '/id="java-http"/,/id="java-regex"/' index.html | grep -c 'class="entry"'
  # Expected: ≥10
  ```

- [ ] **Step 9: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.net.http — HttpClient, HttpRequest, HttpResponse, WebSocket"
  ```

---

## Task 11: java.util.regex

Replace `<!-- entries coming in Task 11 -->` under `#java-regex`.

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Write `Pattern` entries (≥3)**

  Required: `Pattern.compile`/`Pattern.matches`/`Pattern.quote`, `Pattern.flags` (CASE_INSENSITIVE/MULTILINE/DOTALL), `Pattern.matcher`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">static Pattern Pattern.compile(String regex, int flags)</code>
    <code class="snippet"><span class="kw">private static final</span> <span class="ty">Pattern</span> EMAIL =
      <span class="ty">Pattern</span>.<span class="fn">compile</span>(<span class="str">"^[\\w.+-]+@[\\w-]+\\.[\\w.]+$"</span>, <span class="ty">Pattern</span>.CASE_INSENSITIVE);
  <span class="cm">// compile once at class load; Matcher is created per use</span></code>
    <span class="desc">Compile regex once as a static final; Pattern is thread-safe, Matcher is not — create a new Matcher per thread/request with pattern.matcher(input).</span>
  </div>
  ```

- [ ] **Step 2: Write `Matcher` entries (≥5)**

  Required: `find`/`matches`/`lookingAt`, `group()`/`group(int)`/`group(String)`, `groupCount`, `start`/`end`, `replaceAll`/`replaceFirst`, `reset`, named groups `(?<name>...)`

  Example entry:
  ```html
  <div class="entry">
    <code class="sig">Matcher.find() → boolean / group() → String / group(String name) → String</code>
    <code class="snippet"><span class="kw">var</span> m = <span class="ty">Pattern</span>.<span class="fn">compile</span>(<span class="str">"(?&lt;year&gt;\\d{4})-(?&lt;month&gt;\\d{2})-(?&lt;day&gt;\\d{2})"</span>).<span class="fn">matcher</span>(text);
  <span class="kw">while</span> (m.<span class="fn">find</span>()) { <span class="fn">process</span>(m.<span class="fn">group</span>(<span class="str">"year"</span>), m.<span class="fn">group</span>(<span class="str">"month"</span>), m.<span class="fn">group</span>(<span class="str">"day"</span>)); }</code>
    <span class="desc">find() scans for the next match (unlike matches() which requires full-string match); named groups make extraction self-documenting.</span>
  </div>
  ```

- [ ] **Step 3: Write convenience wrapper entries (≥2)**

  Required: `String.matches(regex)`, `String.replaceAll(regex, replacement)`, `String.split(regex)`

- [ ] **Step 4: Verify**

  ```bash
  awk '/id="java-regex"/,/<\/section>/' index.html | grep -c 'class="entry"'
  # Expected: ≥8
  ```

- [ ] **Step 5: Commit**

  ```bash
  git add index.html
  git commit -m "feat: add java.util.regex — Pattern, Matcher, named groups"
  ```

---

## Task 12: Coverage Comments + Final Check

**Files:**
- Modify: `index.html`

- [ ] **Step 1: Add coverage comments before each `<h2>`**

  Using counts from Task 1, add a comment immediately before each Java `<h2>`:
  ```html
  <!-- coverage: java.lang 22/25 -->
  <h2 class="section-heading" id="java-lang">java.lang</h2>
  ```
  Do this for all 11 sections.

- [ ] **Step 2: Run delivery checklist**

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

- [ ] **Step 3: Verify tab switching (inspection)**

  Confirm in the file that the existing JS handles Java:
  ```bash
  grep 'dataset.lang' index.html
  # Expected: cl.dataset.lang === lang (already toggles all cat-lists)

  grep 'scrollTop' index.html
  # Expected: document.getElementById('main').scrollTop = 0;
  ```

- [ ] **Step 4: Final commit**

  ```bash
  git add index.html
  git commit -m "docs: add API coverage comments to all Java sections"
  ```
