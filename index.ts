import { copyToClipboard } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { COMMANDS, HELP_COMMANDS, PRIMARY_COMMAND, PRIMARY_HELP_COMMAND, VIEW_COMMANDS } from "./Config.ts";
import { extractCodeBlocks } from "./code-blocks.ts";
import { getLastAssistantText, getMessageText } from "./messages.ts";
import { firstToken, isDigits } from "./text.ts";
import type { CodeBlock } from "./types.ts";
import { languageLabel, lineLabel, notifyCopied, notifyInvalidBlockArg, showHelp, updateWidget } from "./ui.ts";

function availableBlocksLabel(count: number): string {
	return count === 1 ? "1" : `1-${count}`;
}

function isValidBlockArg(arg?: string): boolean {
	const token = firstToken(arg);
	return !token || isDigits(token);
}

async function chooseBlock(ctx: ExtensionContext, blocks: CodeBlock[], arg?: string, title = "Copy code block"): Promise<CodeBlock | null> {
	const token = firstToken(arg);
	if (token) {
		const index = isDigits(token) ? Number.parseInt(token, 10) : NaN;
		if (Number.isInteger(index) && index >= 1 && index <= blocks.length) return blocks[index - 1];

		const available = availableBlocksLabel(blocks.length);
		const usage = `/${PRIMARY_COMMAND} ${available === "1" ? "1" : "[n]"}`;
		ctx.ui.notify(`No code block ${token}. Available: ${available}. Use ${usage} or /${PRIMARY_HELP_COMMAND}.`, "error");
		return null;
	}

	if (blocks.length === 1) return blocks[0];

	const options = blocks.map((block) => `${block.index}. ${languageLabel(block.language)} — ${lineLabel(block.lineCount)} — ${block.preview}`);
	const choice = await ctx.ui.select(title, options);
	if (!choice) return null;

	const index = Number.parseInt(choice.split(".", 1)[0], 10);
	return blocks[index - 1] ?? null;
}

async function getCodeBlocks(ctx: ExtensionContext): Promise<{ text: string; blocks: CodeBlock[] } | null> {
	const text = getLastAssistantText(ctx);
	if (!text) {
		ctx.ui.notify("No assistant response found", "error");
		return null;
	}

	const blocks = extractCodeBlocks(text);
	if (blocks.length === 0) {
		ctx.ui.notify("No code blocks found in the last assistant response", "error");
		updateWidget(ctx, null);
		return null;
	}

	updateWidget(ctx, text);
	return { text, blocks };
}

async function resolveBlock(ctx: ExtensionContext, arg?: string, title?: string): Promise<CodeBlock | null> {
	if (!isValidBlockArg(arg)) {
		notifyInvalidBlockArg(ctx);
		return null;
	}

	const result = await getCodeBlocks(ctx);
	if (!result) return null;

	return chooseBlock(ctx, result.blocks, arg, title);
}

async function copyCodeBlock(ctx: ExtensionContext, arg?: string): Promise<void> {
	const block = await resolveBlock(ctx, arg);
	if (!block) return;

	try {
		await copyToClipboard(block.code);
		notifyCopied(ctx, block);
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		ctx.ui.notify(`Failed to copy code block: ${message}`, "error");
	}
}

async function viewCodeBlock(ctx: ExtensionContext, arg?: string): Promise<void> {
	const block = await resolveBlock(ctx, arg, "View code block");
	if (!block) return;

	await ctx.ui.editor(`Code block ${block.index} (${languageLabel(block.language)}, ${lineLabel(block.lineCount)})`, block.code);
}

function isHelpArg(args: string): boolean {
	const token = firstToken(args).toLowerCase();
	return token === "help" || token === "--help" || token === "-help" || token === "-h" || token === "?";
}

function makeBlockCommand(description: string, action: (ctx: ExtensionCommandContext, args: string) => Promise<void>) {
	return {
		description,
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			if (isHelpArg(args)) {
				await showHelp(ctx);
				return;
			}
			await action(ctx, args);
		},
	};
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		updateWidget(ctx, getLastAssistantText(ctx));
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "assistant") return;
		updateWidget(ctx, getMessageText(event.message));
	});

	const command = makeBlockCommand("Copy a numbered code block from the last assistant response", copyCodeBlock);

	const viewCommand = makeBlockCommand("View a numbered code block from the last assistant response", viewCodeBlock);

	const helpCommand = {
		description: "Show code block copy help",
		handler: async (_args: string, ctx: ExtensionCommandContext) => {
			await showHelp(ctx);
		},
	};

	for (const name of COMMANDS) {
		pi.registerCommand(name, command);
	}

	for (const name of VIEW_COMMANDS) {
		pi.registerCommand(name, viewCommand);
	}
	for (const name of HELP_COMMANDS) {
		pi.registerCommand(name, helpCommand);
	}
}
