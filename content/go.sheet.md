# Go language cheat sheet (for Java/Kotlin developers)
<!-- Language + idioms; the stdlib reference lives in the Go tab of index.html. Checked against Go 1.27 docs via Context7. -->

## Java/Kotlin → Go
### Rosetta stone
> class / data class → struct + methods
```go
type Point struct{ X, Y float64 }               // data class Point(val x: Double, val y: Double)
func (p Point) Dist() float64 { return math.Hypot(p.X, p.Y) }
p := Point{X: 3, Y: 4}                           // no `new`, no constructor
```

> interface implements → implicit satisfaction
```go
type Shape interface{ Area() float64 }
type Square struct{ S float64 }
func (s Square) Area() float64 { return s.S * s.S } // Square is a Shape — no keyword
```

> try/catch → error values
```go
v, err := strconv.Atoi(s)
if err != nil {
    return 0, fmt.Errorf("parse %q: %w", s, err)
}
```

> null / Optional → zero values, pointers, comma-ok
```go
var p *User          // nil
v, ok := m[key]      // ok=false when missing
u, err := find(id)   // (nil, ErrNotFound) instead of null
```

> extends → embedding (composition)
```go
type Base struct{ ID string }
func (b Base) Describe() string { return "id=" + b.ID }
type Node struct {
    Base             // n.Describe(), n.ID promoted
    Labels map[string]string
}
```

> Thread / ExecutorService / coroutines → goroutines + channels
```go
go worker(ctx, jobs)             // launch { worker() }
ch := make(chan Result, 16)      // Channel<Result>(16)
res := <-ch                      // ch.receive()
```

> synchronized / ReentrantLock → sync.Mutex (not reentrant!)
```go
mu.Lock()
defer mu.Unlock()
```

> try-with-resources / finally → defer
```go
f, err := os.Open(p)
if err != nil { return err }
defer f.Close()
```

> enum class → typed constants + iota
```go
type Phase int
const (
    Pending Phase = iota
    Running
    Succeeded
)
```

> when / switch → switch (no fall-through), type switch
```go
switch {
case n < 0:  return "neg"
case n == 0: return "zero"
default:     return "pos"
}
```

> ternary / elvis → none; write the if
```go
name := "anon"
if u != nil { name = u.Name }
```

> Lambdas / function types
```go
desc := func(a, b int) int { return cmp.Compare(b, a) }   // negative/0/positive like Comparator
slices.SortFunc(xs, desc)
```

> List<T> / Map<K,V> / Set<T>
```go
xs := []string{"a", "b"}                // ArrayList-like
xs = append(xs, "c")
m := map[string]int{"a": 1}             // HashMap (random iteration order)
set := map[string]struct{}{"a": {}}     // Set — struct{} takes no memory
_, has := set["a"]
```

## Declarations
> Variables and constants
```go
var count int            // zero value 0
var name = "svc"         // inferred
port := 8080             // short form, inside functions only
const timeout = 5 * time.Second
a, b := b, a             // swap via multiple assignment
```

> Functions: multiple returns, variadics, named results
```go
func split(sum int) (x, y int) { x = sum * 4 / 9; y = sum - x; return }
func join(sep string, parts ...string) string { return strings.Join(parts, sep) }
join(",", xs...)          // spread a slice
```

> Control flow
```go
for i := 0; i < 10; i++ {}       // classic
for cond {}                        // while
for {}                             // forever
for i := range 10 {}               // 0..9 (Go 1.22+)
for i, v := range xs {}            // index, copy of value
for k, v := range m {}
if err := do(); err != nil {}      // init statement scoped to if
outer:
for _, a := range as { for _, b := range bs { if a == b { break outer } } }
```

> Pointers (no arithmetic)
```go
x := 1
p := &x     // *int
*p = 2      // x == 2
u := &User{Name: "a"}
u.Name = "b" // auto-deref for fields and methods
```
Go passes everything **by value**; pointers are how you share/mutate. Slices, maps, channels contain internal pointers, so passing them shares data.

## Methods & interfaces
> Receivers
```go
func (c *Cache) Put(k string, v []byte) { ... }  // mutates → pointer
func (p Point) String() string { ... }           // small, read-only → value
```
`*T` has the methods of both `T` and `*T`; `T` has only value-receiver methods → only `&x` satisfies an interface whose methods use pointer receivers.

> Compile-time interface check
```go
var _ io.ReadCloser = (*myReader)(nil)
```

> Type assertion / switch
```go
if s, ok := v.(fmt.Stringer); ok { fmt.Println(s.String()) }
switch t := v.(type) {
case error:  log.Println(t.Error())
case string: log.Println(t)
}
```

> Stringer / error interfaces
```go
type error interface{ Error() string }
type Stringer interface{ String() string }
```

## Errors
> Wrap, inspect, join
```go
var ErrNotFound = errors.New("not found")             // sentinel

type HTTPError struct{ Code int }
func (e *HTTPError) Error() string { return fmt.Sprintf("http %d", e.Code) }

err := fmt.Errorf("load user %d: %w", id, ErrNotFound)
errors.Is(err, ErrNotFound)                          // true
var he *HTTPError
errors.As(err, &he)                                  // extracts typed error
he, ok := errors.AsType[*HTTPError](err)             // Go 1.26+
errors.Join(err1, err2)                              // multi-error
```

> Panic / recover
```go
defer func() {
    if r := recover(); r != nil {
        log.Printf("recovered: %v\n%s", r, debug.Stack())
    }
}()
```
Only for programmer bugs / impossible states; recover only works in a deferred func of the same goroutine.

## Slices & maps
> make, len, cap, append
```go
s := make([]int, 0, 100)     // len 0, cap 100 — preallocate
s = append(s, 1, 2, 3)
t := s[1:3]                  // shares backing array
u := s[1:3:3]                // cap limited → next append copies
c := slices.Clone(s)         // independent copy
copy(dst, src)               // returns n copied
```

> slices / maps packages
```go
slices.Sort(xs)
slices.SortFunc(users, func(a, b User) int { return cmp.Compare(a.Age, b.Age) })
i, found := slices.BinarySearch(xs, 42)
slices.Contains(xs, "x"); slices.Index(xs, "x"); slices.Reverse(xs)
xs = slices.DeleteFunc(xs, func(s string) bool { return s == "" })
keys := slices.Sorted(maps.Keys(m))
maps.Copy(dst, src)
```

> Iterators (Go 1.23+)
```go
func (l *List[T]) All() iter.Seq2[int, T] {
    return func(yield func(int, T) bool) {
        for i, v := range l.items {
            if !yield(i, v) { return }
        }
    }
}
for i, v := range list.All() { ... }
for line := range strings.Lines(text) { ... }  // Go 1.24
```

## Generics
> Functions, constraints, types
```go
func Keys[K comparable, V any](m map[K]V) []K { ... }

type Ordered interface{ ~int | ~int64 | ~float64 | ~string }
func Max[T Ordered](a, b T) T { if a > b { return a }; return b }   // builtin max() exists too

type Set[T comparable] map[T]struct{}
func (s Set[T]) Add(v T) { s[v] = struct{}{} }

type Pair[K comparable, V any] struct { Key K; Val V }
p := Pair[string, int]{"a", 1}
```
`cmp.Ordered` is the stdlib constraint for `<`-comparable types. Type inference usually means you don't write `[T]` at call sites.

## Concurrency patterns
> Goroutine + WaitGroup (1.25 wg.Go)
```go
var wg sync.WaitGroup
for _, n := range nodes {
    wg.Go(func() { drain(ctx, n) })
}
wg.Wait()
```

> errgroup with limit (first error cancels the rest)
```go
g, ctx := errgroup.WithContext(ctx)
g.SetLimit(10)
for _, c := range clusters {
    g.Go(func() error { return upgrade(ctx, c) })
}
return g.Wait()
```

> Producer / consumer with close
```go
func gen(ctx context.Context, n int) <-chan int {
    out := make(chan int)
    go func() {
        defer close(out)
        for i := range n {
            select {
            case out <- i:
            case <-ctx.Done(): return
            }
        }
    }()
    return out
}
for v := range gen(ctx, 5) { fmt.Println(v) }
```

> Timeout / ticker loop
```go
t := time.NewTicker(30 * time.Second)
defer t.Stop()
for {
    select {
    case <-ctx.Done():
        return ctx.Err()
    case <-t.C:
        if err := poll(ctx); err != nil { log.Println(err) }
    }
}
```

> Mutex-protected struct
```go
type Registry struct {
    mu    sync.RWMutex
    items map[string]Item
}
func (r *Registry) Get(k string) (Item, bool) {
    r.mu.RLock(); defer r.mu.RUnlock()
    it, ok := r.items[k]
    return it, ok
}
```

> Once / atomic
```go
var cfg = sync.OnceValue(func() *Config { return load() })   // cfg() lazy singleton
var reqs atomic.Int64
reqs.Add(1)
```

> Semaphore with a buffered channel
```go
sem := make(chan struct{}, 4)
sem <- struct{}{}        // acquire
<-sem                    // release
```

## Context
> Create and propagate
```go
ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
defer cancel()
ctx, cancel = context.WithCancel(ctx)
ctx = context.WithValue(ctx, traceKey{}, traceID)   // unexported key type
ctx, stop := signal.NotifyContext(context.Background(), syscall.SIGTERM)
```
Always first parameter, never stored in structs, always `defer cancel()`.

> Checking cancellation
```go
select {
case <-ctx.Done():
    return context.Cause(ctx)   // Canceled / DeadlineExceeded / custom cause
default:
}
```

## Testing
> Table test + subtests + helpers
```go
func TestX(t *testing.T) {
    for _, tc := range []struct{ in, want string }{{"a", "A"}, {"", ""}} {
        t.Run(tc.in, func(t *testing.T) {
            t.Parallel()
            if got := Upper(tc.in); got != tc.want {
                t.Errorf("Upper(%q) = %q, want %q", tc.in, got, tc.want)
            }
        })
    }
}
```

> Commands
```bash
go test ./...                     # all packages
go test -run 'TestX/^a$' -v ./pkg # filter subtests
go test -race -count=1 ./...      # race detector, no cache
go test -cover -coverprofile=c.out && go tool cover -html=c.out
go test -bench=. -benchmem
```

> httptest
```go
rec := httptest.NewRecorder()
h.ServeHTTP(rec, httptest.NewRequest("GET", "/healthz", nil))
if rec.Code != 200 { t.Fatal(rec.Code) }
```

## Modules & tooling
> go.mod
```go
module github.com/acme/platform-api

go 1.27

require (
    k8s.io/client-go v0.37.0
    k8s.io/apimachinery v0.37.0
)
```
`go.sum` pins hashes; `replace` for local forks; `tool` directives (1.24+) track dev tools like `controller-gen`.

> Everyday commands
```bash
go mod tidy
go build -o bin/api ./cmd/api
CGO_ENABLED=0 GOOS=linux GOARCH=arm64 go build -ldflags="-s -w -X main.version=$VER" ./cmd/api
go vet ./... && golangci-lint run
govulncheck ./...
go tool pprof http://localhost:6060/debug/pprof/heap
```

> Minimal container image
```bash
# Dockerfile (multi-stage)
FROM golang:1.27 AS build
WORKDIR /src
COPY go.* ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /app ./cmd/api
FROM gcr.io/distroless/static:nonroot
COPY --from=build /app /app
ENTRYPOINT ["/app"]
```
Static binary + distroless = ~10–20 MB image, no shell, runs as non-root.

## Gotchas
> Typed nil in interface
`var p *T = nil; var i any = p; i != nil` — return literal `nil` errors.

> Loop variables
Since Go 1.22 each iteration has its own variable — but only if `go.mod` says `go 1.22`+.

> Map concurrency
Concurrent map write = fatal error, not an exception. Protect with a mutex.

> Slices alias
`append` may write into a shared backing array; clone when handing out internal slices.

> Copying locks
Structs with `sync.Mutex` must be passed by pointer; `go vet` reports copies.

> HTTP client defaults
`http.DefaultClient` has no timeout; always close `resp.Body`.

> Unused = error
Unused imports and local variables don't compile; use `_` deliberately.
