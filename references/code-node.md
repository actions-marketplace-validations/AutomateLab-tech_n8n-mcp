# Code node: return shape contract

The Code node MUST return an array of items, never a raw object. This is the #1 reason Code nodes "fail mysteriously."

## Run Once for All Items (default mode)

```js
const out = [];
for (const item of $input.all()) {
  out.push({ json: { ...item.json, doubled: item.json.value * 2 } });
}
return out;
```

Returns an *array* of `{ json, binary? }` items. n8n passes it straight to the next node.

## Run Once for Each Item

```js
return { json: { ...$json, doubled: $json.value * 2 } };
```

Returns a *single item object*. n8n collects them across iterations.

## What breaks

- `return $json` - returns one item's payload, not wrapped.
  - Per-each-item: missing `json` key.
  - Per-all-items: not an array.
- `return [...]` of plain objects without `{ json: ... }` wrapping. n8n shows "Items must contain a `json` key."
- `return null` / `return undefined` - downstream nodes see 0 items and stop. Common when the function exits via an early-return that you forgot.
- `return await fetch(...)` - **`fetch` is NOT in the sandbox.** Use the HTTP Request node instead, or move the network call into a previous node.
- `require('module')` - **NOT available.** Allowed: standard JS, `$input`, `$json`, `$node`, `$workflow`, `$execution`, `crypto` (limited), `DateTime` (Luxon).
- `this.getCredentials()` / `$getCredentials()` - **NOT available in Code node.** Credentials are only accessible inside expressions on credential-aware nodes (HTTP Request, Slack, etc.). For credential-bearing logic, use the relevant action node, not Code.

## Errors and item-level failures

To fail one item but continue with the others (in per-all-items mode):

```js
const out = [];
for (const item of $input.all()) {
  try {
    out.push({ json: { result: doStuff(item.json) } });
  } catch (e) {
    out.push({ json: { error: e.message }, pairedItem: item.pairedItem ?? 0 });
  }
}
return out;
```

Setting `pairedItem` keeps the input/output mapping correct for downstream `$('Code').item` references.

## Python mode

Code node also supports Python (n8n 1.46+). Same contract, slightly different syntax:

```python
return [{ "json": { "doubled": item["json"]["value"] * 2 } } for item in _input.all()]
```

`$input` becomes `_input`, `$json` becomes `_json`. Same sandbox rules: no `import requests`, etc.
