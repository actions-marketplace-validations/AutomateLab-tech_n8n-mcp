# AI Agent / LangChain cluster nodes

n8n's AI nodes use a different connection model from regular nodes. The root is `@n8n/n8n-nodes-langchain.agent` (older workflows: `n8n-nodes-langchain.agent`). Sub-nodes attach *upward* via specialized connection types, **not** the normal `main` flow.

## Connection types

| Sub-node role | Connection type | Examples |
|---|---|---|
| Language model | `ai_languageModel` | `lmChatOpenAi`, `lmChatAnthropic`, `lmChatOllama`, `lmChatGoogleGemini`, `lmChatGroq` |
| Memory | `ai_memory` | `memoryBufferWindow`, `memoryPostgresChat`, `memoryRedisChat`, `memoryMongoDbChat` |
| Tools | `ai_tool` | `toolHttpRequest`, `toolCode`, `toolWorkflow`, `toolVectorStore`, `mcpClientTool` |
| Output parser | `ai_outputParser` | `outputParserStructured`, `outputParserItemList` |
| Embeddings | `ai_embedding` | `embeddingsOpenAi`, `embeddingsCohere` |
| Vector store | `ai_vectorStore` | `vectorStorePinecone`, `vectorStoreSupabase`, `vectorStoreInMemory` |
| Document loader | `ai_document` | `documentDefaultDataLoader` |
| Text splitter | `ai_textSplitter` | `textSplitterRecursiveCharacterTextSplitter` |

## Connection direction

In `connections`, the *sub-node* is the source and the agent is the target, with the connection type set:

```json
"connections": {
  "OpenAI Chat Model": {
    "ai_languageModel": [[{ "node": "AI Agent", "type": "ai_languageModel", "index": 0 }]]
  },
  "Buffer Window Memory": {
    "ai_memory": [[{ "node": "AI Agent", "type": "ai_memory", "index": 0 }]]
  },
  "HTTP Request Tool": {
    "ai_tool": [[{ "node": "AI Agent", "type": "ai_tool", "index": 0 }]]
  }
}
```

This is reversed from how it looks in the UI canvas (the agent appears "above" sub-nodes), but matches the data flow: the LLM/memory/tool **provides** capabilities to the agent.

## Minimum viable agent

```
trigger → AI Agent (root)
          ↑ ai_languageModel  (e.g. OpenAI Chat Model)
          ↑ ai_memory         (optional, e.g. Window Buffer Memory)
          ↑ ai_tool           (optional, 0-N tools)
          → main → next downstream node
```

The agent itself flows downstream via `main`.

## Tool nodes

Tools wrap arbitrary capabilities the agent can call:

- `toolHttpRequest` - call an external HTTP API. The tool's `toolDescription` is what the LLM reads to decide whether to call it; write it as if explaining to the model.
- `toolWorkflow` - call another n8n workflow. Reference by `workflowId`. Useful for reusable sub-flows.
- `toolCode` - inline JS/Python. Same sandbox rules as the Code node.
- `mcpClientTool` - hook in another MCP server. Lets the agent call tools from any MCP-compatible service.
- `toolVectorStore` - retrieve from a vector store. Pair with an embeddings sub-node.

## Common AI Agent failures

- **No `ai_languageModel` connected** → agent has no brain; n8n usually surfaces a "no language model" error at run time. (Lint catches this statically.)
- **Memory connected but `sessionKey` not set** → all sessions collide; conversation history leaks across users. Set `sessionIdType: "customKey"` and route a stable user ID into `sessionKey`.
- **Tools connected but the LLM never calls them** → either the model doesn't support function-calling (older models) or the tool descriptions are too vague. GPT-4o-mini, Claude 3.5+, Gemini 1.5+ all support function-calling natively.
- **Output parser set but agent returns plain text** → the parser is on the wrong sub-node or `outputFormatting: "json"` is missing. Use `outputParserStructured` and ensure the agent's output configuration is set to use it.
