#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import {
	scaffoldNode,
	scaffoldNodeInputSchema,
} from "./tools/scaffold-node.js";
import {
	generateWorkflow,
	generateWorkflowInputSchema,
} from "./tools/generate-workflow.js";
import {
	lintWorkflow,
	lintWorkflowInputSchema,
} from "./tools/lint-workflow.js";
import {
	explainExecution,
	explainExecutionInputSchema,
} from "./tools/explain-execution.js";
import {
	activateWorkflow,
	activateWorkflowInputSchema,
	createWorkflow,
	createWorkflowInputSchema,
	getWorkflow,
	getWorkflowInputSchema,
	listExecutions,
	listExecutionsInputSchema,
	listWorkflows,
	listWorkflowsInputSchema,
} from "./tools/rest-api.js";

const VERSION = "0.3.0";

const tools = [
	{
		name: "n8n_scaffold_node",
		description:
			"Scaffold a TypeScript skeleton for an n8n custom node from a plain-English description. Returns a single TypeScript file implementing INodeType with description, credentials reference, and an execute method stub.",
		inputSchema: scaffoldNodeInputSchema,
	},
	{
		name: "n8n_generate_workflow",
		description:
			"Generate a valid n8n workflow JSON from a plain-English description. Handles webhook/schedule/RSS triggers, common action nodes (Slack, Google Sheets, Discord, Gmail, Notion, HTTP), and AI Agent setups (LangChain root agent + chat model + memory + optional HTTP tool, wired with ai_languageModel / ai_memory / ai_tool connections). Returns workflow JSON with unique node IDs, connections, positions, and typeVersion on every node.",
		inputSchema: generateWorkflowInputSchema,
	},
	{
		name: "n8n_lint_workflow",
		description:
			"Lint an n8n workflow JSON. Returns concrete errors and warnings: missing credentials, deprecated node types (Function -> Code, spreadsheetFile -> convertToFile/extractFromFile), broken connections, missing or non-numeric typeVersion, duplicate node names or IDs, AI Agent missing ai_languageModel sub-node, Webhook missing webhookId, IF node still on v1 condition schema.",
		inputSchema: lintWorkflowInputSchema,
	},
	{
		name: "n8n_explain_execution",
		description:
			"Diagnose a failed or surprising n8n execution. Paste the execution JSON (from the n8n UI 'Show details' or `GET /executions/:id?includeData=true`); returns a per-node summary highlighting nodes that returned 0 items, unresolved `={{ ... }}` expressions, errors with hints, and LLM token usage. Hits the most common debugging pain point: items 'silently disappearing' between nodes.",
		inputSchema: explainExecutionInputSchema,
	},
	{
		name: "n8n_list_workflows",
		description:
			"List workflows from a live n8n instance (requires N8N_API_URL + N8N_API_KEY env vars). Returns id, name, active, nodeCount, updatedAt, tags. Filter by active, tags, name. Use this when the user asks 'what workflows do I have?' or before n8n_get_workflow.",
		inputSchema: listWorkflowsInputSchema,
	},
	{
		name: "n8n_get_workflow",
		description:
			"Fetch a single workflow JSON by id from a live n8n instance (requires N8N_API_URL + N8N_API_KEY). Returns the full nodes/connections payload — pair with n8n_lint_workflow to audit a deployed workflow.",
		inputSchema: getWorkflowInputSchema,
	},
	{
		name: "n8n_create_workflow",
		description:
			"Create a workflow on a live n8n instance (requires N8N_API_URL + N8N_API_KEY). Strips read-only fields (id, active, createdAt, ...) before posting. Workflows are created inactive — call n8n_activate_workflow afterward. Pairs with n8n_generate_workflow for end-to-end 'describe -> deploy'.",
		inputSchema: createWorkflowInputSchema,
	},
	{
		name: "n8n_activate_workflow",
		description:
			"Activate or deactivate a workflow on a live n8n instance (requires N8N_API_URL + N8N_API_KEY). Pass `active: false` to deactivate.",
		inputSchema: activateWorkflowInputSchema,
	},
	{
		name: "n8n_list_executions",
		description:
			"List recent executions from a live n8n instance (requires N8N_API_URL + N8N_API_KEY). Filter by workflowId, status (success|error|waiting), limit. Pass `includeData: true` to get the full execution body (large) — pair with n8n_explain_execution to diagnose a specific failure.",
		inputSchema: listExecutionsInputSchema,
	},
];

const server = new Server(
	{
		name: "n8n-mcp",
		version: VERSION,
	},
	{
		capabilities: { tools: {} },
	},
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools }));

server.setRequestHandler(CallToolRequestSchema, async (req) => {
	const { name, arguments: args } = req.params;
	switch (name) {
		case "n8n_scaffold_node":
			return scaffoldNode(args ?? {});
		case "n8n_generate_workflow":
			return generateWorkflow(args ?? {});
		case "n8n_lint_workflow":
			return lintWorkflow(args ?? {});
		case "n8n_explain_execution":
			return explainExecution(args ?? {});
		case "n8n_list_workflows":
			return listWorkflows(args ?? {});
		case "n8n_get_workflow":
			return getWorkflow(args ?? {});
		case "n8n_create_workflow":
			return createWorkflow(args ?? {});
		case "n8n_activate_workflow":
			return activateWorkflow(args ?? {});
		case "n8n_list_executions":
			return listExecutions(args ?? {});
		default:
			throw new Error(`Unknown tool: ${name}`);
	}
});

async function main() {
	if (process.argv.includes("--smoke")) {
		const summary = {
			server: "n8n-mcp",
			version: VERSION,
			tools: tools.map((t) => t.name),
		};
		process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
		return;
	}
	const transport = new StdioServerTransport();
	await server.connect(transport);
}

main().catch((err) => {
	process.stderr.write(`n8n-mcp fatal: ${(err as Error).message}\n`);
	process.exit(1);
});
