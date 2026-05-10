# Workflow JSON conventions

## Required node fields

Every node MUST have:

- `id` - unique UUID per workflow
- `name` - unique display name (connections key by name, not id)
- `type` - e.g. `n8n-nodes-base.slack`, `n8n-nodes-base.webhook`
- `typeVersion` - integer or float; n8n refuses to load a node without one
- `position` - `[x, y]` array (canvas coordinates, ~220px apart horizontally)
- `parameters` - object, can be empty `{}`

Optional but common:

- `credentials` - `{ "<credentialType>": { "id": "...", "name": "..." } }`
- `disabled` - boolean
- `notes` - string shown in the UI
- `webhookId` - explicit ID for webhook-trigger nodes (otherwise n8n auto-generates one on import, changing the URL)

## Connections shape

```json
"connections": {
  "Source Node Name": {
    "main": [
      [
        { "node": "Target A", "type": "main", "index": 0 },
        { "node": "Target B", "type": "main", "index": 0 }
      ]
    ]
  }
}
```

Keyed by source node *name* (not id). The double array is real:
- Outer array: per-output-index (most nodes have one output; IF/Switch have multiple).
- Inner array: fan-out targets at that output.

For AI cluster connections, replace `"main"` with `"ai_languageModel"`, `"ai_memory"`, etc. See `ai-agents.md`.

## Workflow envelope

```json
{
  "name": "...",
  "nodes": [...],
  "connections": {...},
  "active": false,
  "settings": { "executionOrder": "v1" },
  "pinData": {}
}
```

- `executionOrder: "v1"` - the modern execution order. New workflows should use this.
- `pinData` - dev-time fixtures keyed by node name. Safe to leave empty `{}`.
- Strip `id`, `versionId`, `triggerCount`, `createdAt`, `updatedAt`, `tags`, `shared` before POSTing to `/api/v1/workflows` (n8n rejects most as read-only).

## Credentials

Nodes like `slack`, `gmail`, `googleSheets`, `notion`, `discord`, `stripe`, `httpRequest` (with auth) need a `credentials` block referencing a credential by name:

```json
"credentials": {
  "slackApi": {
    "id": "abc123",
    "name": "Slack OAuth (production)"
  }
}
```

The user creates the credential in n8n's UI; the workflow JSON only references it. **Credential names are NOT portable across instances** - if you import to a new n8n, recreate credentials with identical names or the workflow will fail at runtime.

Expression-based credential names (`={{ $vars.SLACK_CRED }}`) work but are not portable; lint warns but doesn't block.

## Common JSON-level mistakes

- **Connections reference a `displayName` instead of `name`.** Connection lookup is case-sensitive and uses the `name` field. Renaming a node in the UI updates both; renaming in raw JSON requires updating the connections map too.
- **Two nodes with the same `name`.** n8n may load the workflow but connections become ambiguous. Lint catches this.
- **`typeVersion` as a string** (`"1"` instead of `1`). n8n's loader accepts both in some versions but fails in others. Always use a number.
- **`position` outside `[0, 0]`-ish range** (e.g. `[10000, 10000]`). The workflow loads but the canvas opens centered on `(0, 0)` and you can't see anything.
