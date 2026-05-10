# Expressions and the n8n data model

Every node sees an array:

```
[ { json: { ... }, binary?: { ... } }, { json: { ... } }, ... ]
```

Most nodes **auto-iterate**: they run once *per item*. You almost never need an explicit loop. If a previous node returned 10 items, the next node executes 10 times automatically.

## Expression cheat sheet

Expressions go inside `={{ ... }}` (the leading `=` matters; without it the value is a literal).

- `$json` - the *current* item's `json` payload (most common)
- `$json.field.nested` - dot-walk into the current item
- `$input.all()` - full array of items entering this node
- `$input.first()` / `$input.last()` - shortcuts
- `$("Node Name").item.json` - the matching item from another node (paired by run index)
- `$("Node Name").all()` - all items from another node, regardless of pairing
- `$("Node Name").first().json` - first item from another node
- `$node["Node Name"].json` - legacy syntax, still works but `$()` is preferred

## Defensive expressions

Items can be undefined. Use optional chaining and nullish coalescing:

```js
={{ $json.user?.email ?? 'no-email@example.com' }}
={{ ($('HTTP Request').first().json.results || []).length }}
```

## Common mistakes

1. **`$json[0]` because the input panel shows an array.** The array IS the item list - n8n already split it. Use `$json` (singular) and trust auto-iteration.
2. **`$('Node name')` (lowercase) when the node is `Node Name`.** Node references are case-sensitive and use the exact `name` field, not the `displayName`.
3. **Forgetting the `=` prefix.** `{{ $json.foo }}` is a literal string `"{{ $json.foo }}"`. Only `={{ $json.foo }}` evaluates.
4. **Mixing item indexes across runs.** `$("Other Node").item` pairs by run index (the *Nth time the workflow ran this node for this iteration*). If you need the first item regardless, use `.first()`.

## Built-in helpers

- `$now`, `$today` - DateTime objects (Luxon)
- `$workflow.id`, `$workflow.name`
- `$execution.id`, `$execution.mode` (`'manual' | 'trigger' | ...`)
- `$env.VAR_NAME` - env vars (must be enabled in n8n config)
- `$vars.NAME` - workflow variables (Enterprise)
- `$itemIndex`, `$runIndex` - position in current iteration / run
