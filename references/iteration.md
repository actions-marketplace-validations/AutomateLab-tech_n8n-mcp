# Iteration: do you actually need a loop?

Most n8n workflows don't need explicit loops because nodes auto-iterate over input items. Reach for a loop node only when you genuinely need control flow.

## Decision tree

1. **Default: no loop.** Drop a Set / HTTP Request / Code / action node after your data source and it'll run per item.
2. **Need a loop only for:**
   - Paged API calls (loop while `nextCursor` is set)
   - Rate-limited APIs that need batching with a delay
   - Sequential side-effects where order matters and you must process N at a time
   - Self-referential transforms (e.g. accumulate, fold)

## Picking the right node

| Node | Use when |
|---|---|
| **Split Out** | One item contains an array field (e.g. `items[]`); flatten so each array element becomes its own item. Use this 90% of the time you "need to iterate over an array." |
| **Loop Over Items (Split In Batches)** | Actual loop with a configurable batch size and a back-edge connection. Use for pagination and rate-limited batching. |
| **Aggregate** | Inverse of Split Out: collapse N items back into a single item with an array field. |
| **Item Lists** | Specific list operations (sort, limit, summarize) without a full loop. |

## Loop Over Items — the back-edge gotcha

`Loop Over Items` requires connecting the *processing* branch's last node back to the loop node's main input:

```
[Source] → [Loop Over Items] → [Processing] → [Final step in branch]
                ↑__________________________________|  ← back-edge
```

Without that back-edge, the loop runs the first batch and stops. **Lint won't catch this** (the connection is technically valid, just semantically wrong); double-check connections visually.

## Pagination pattern

```
[HTTP Request: page 1] → [IF: cursor exists?]
                              ↓ true
                         [Set: cursor = $json.nextCursor]
                              ↓
                         [Loop Over Items / HTTP] → loop back
```

Or use a Code node that handles pagination internally:

```js
const allResults = [];
let cursor = null;
do {
  const url = `https://api.example.com/items?cursor=${cursor ?? ''}`;
  const res = await this.helpers.httpRequest({ url });
  allResults.push(...res.items);
  cursor = res.nextCursor;
} while (cursor);
return allResults.map(json => ({ json }));
```

(Code node can call `this.helpers.httpRequest()` even though it can't `fetch()`.)

## Rate-limited batching

For APIs that allow N calls per minute:

```
[Source] → [Loop Over Items: batchSize=N] → [HTTP] → [Wait: 60s] → loop back
```

The `Wait` node only fires per batch, not per item, so total wall time is `(items / N) * 60s`.
