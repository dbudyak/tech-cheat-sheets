# Content format

`platform.html` fetches these files at runtime. Topics are registered in the `TOPICS`
array at the top of the page script.

## `<topic>.cards.md` — flashcards

```
## Section name              <- groups cards (shown as filter + card label)

Q: Question text (may continue on the next line)
A: Answer text. `inline code`, **bold**.
- bullet lines are fine
```go
// fenced code blocks become snippets (go, yaml, hcl, bash, promql)
```
```

A card starts at `Q:` and its answer runs until the next `Q:` or `##`.
Progress is stored per card in localStorage, keyed by a hash of the question text —
editing a question resets that card's progress.

## `<topic>.sheet.md` — cheat sheets

```
## Section heading           <- sidebar link
### Sub heading
> signature / command line   <- starts an entry (same look as index.html)
```lang
code
```
Description lines (until the next entry/heading).
```

Free text before the first entry of a section is rendered as an intro paragraph.
`<!-- comment -->` lines are ignored.
