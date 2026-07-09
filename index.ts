import { copyToClipboard } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import { COMMANDS, HELP_COMMANDS, PRIMARY_COMMAND, PRIMARY_HELP_COMMAND, VIEW_COMMANDS } from "./Config.ts";
import { extractCodeBlocks } from "./code-blocks.ts";
import { getLastAssistantText, getMessageText } from "./messages.ts";
import type { CodeBlock } from "./types.ts";
import { languageLabel, lineLabel, notifyCopied, notifyError, notifyInvalidBlockArg, showHelp, updateWidget } from "./ui.ts";

function availableBlocksLabel(count: number): string {
	return count === 1 ? "1" : `1-${count}`;
}

function firstArgToken(arg?: string): string | null {
	return arg?.trim().split(/\s+/, 1)[0] || null;
}

function isValidBlockArg(arg?: string): boolean {
	const token = firstArgToken(arg);
	return !token || /^\d+$/.test(token);
}

async function chooseBlock(ctx: ExtensionContext, blocks: CodeBlock[], arg?: string, title = "Copy code block"): Promise<CodeBlock | null> {
	const token = firstArgToken(arg);
	if (token) {
		const index = /^\d+$/.test(token) ? Number.parseInt(token, 10) : NaN;
		if (Number.isInteger(index) && index >= 1 && index <= blocks.length) return blocks[index - 1];

		const available = availableBlocksLabel(blocks.length);
		const usage = `/${PRIMARY_COMMAND} ${available === "1" ? "1" : "[n]"}`;
		ctx.ui.notify(`No code block ${token}. Available: ${available}. Use ${usage} or /${PRIMARY_HELP_COMMAND}.`, "error");
		return null;
	}

	if (blocks.length === 1) return blocks[0];

	const options = blocks.map((block) => `${block.index}. ${languageLabel(block.language)} — ${lineLabel(block.lineCount)} — ${block.preview}`);
	let choice: string | undefined;
	try {
		choice = await ctx.ui.select(title, options);
	} catch (error) {
		notifyError(ctx, "Failed to show code block selector", error);
		return null;
	}
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

async function copyCodeBlock(ctx: ExtensionContext, arg?: string): Promise<void> {
	if (!isValidBlockArg(arg)) {
		notifyInvalidBlockArg(ctx);
		return;
	}

	const result = await getCodeBlocks(ctx);
	if (!result) return;

	const block = await chooseBlock(ctx, result.blocks, arg);
	if (!block) return;

	try {
		await copyToClipboard(block.code);
		notifyCopied(ctx, block);
	} catch (error) {
		notifyError(ctx, "Failed to copy code block", error);
	}
}

async function viewCodeBlock(ctx: ExtensionContext, arg?: string): Promise<void> {
	if (!isValidBlockArg(arg)) {
		notifyInvalidBlockArg(ctx);
		return;
	}

	const result = await getCodeBlocks(ctx);
	if (!result) return;

	const block = await chooseBlock(ctx, result.blocks, arg, "View code block");
	if (!block) return;

	try {
		await ctx.ui.editor(`Code block ${block.index} (${languageLabel(block.language)}, ${lineLabel(block.lineCount)})`, block.code);
	} catch (error) {
		notifyError(ctx, "Failed to open code block", error);
	}
}

function isHelpArg(args: string): boolean {
	const token = args.trim().split(/\s+/, 1)[0]?.toLowerCase();
	return token === "help" || token === "--help" || token === "-help" || token === "-h" || token === "?";
}

export default function (pi: ExtensionAPI) {
	pi.on("session_start", async (_event, ctx) => {
		try {
			updateWidget(ctx, getLastAssistantText(ctx));
		} catch (error) {
			notifyError(ctx, "Failed to update code block widget", error);
		}
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "assistant") return;
		try {
			updateWidget(ctx, getMessageText(event.message));
		} catch (error) {
			notifyError(ctx, "Failed to update code block widget", error);
		}
	});

	const command = {
		description: "Copy a numbered code block from the last assistant response",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			try {
				if (isHelpArg(args)) {
					await showHelp(ctx);
					return;
				}
				await copyCodeBlock(ctx, args);
			} catch (error) {
				notifyError(ctx, "Failed to run code block copy command", error);
			}
		},
	};

	const viewCommand = {
		description: "View a numbered code block from the last assistant response",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			try {
				if (isHelpArg(args)) {
					await showHelp(ctx);
					return;
				}
				await viewCodeBlock(ctx, args);
			} catch (error) {
				notifyError(ctx, "Failed to run code block view command", error);
			}
		},
	};
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
