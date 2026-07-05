import { copyToClipboard } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext } from "@earendil-works/pi-coding-agent";
import {
	COMMANDS,
	DIRECT_SHORTCUT,
	EXCLUDE_LANGUAGES as CONFIG_EXCLUDE_LANGUAGES,
	HELP_COMMANDS,
	LEADER_SHORTCUT,
	LEADER_TIMEOUT_MS,
	SUPPORTED_LANGUAGES,
	VIEW_COMMANDS,
	WIDGET_KEY,
} from "./Config.ts";
import type { CodeBlock, ParsedLanguage } from "./Types.ts";

const SUPPORTED_LANGUAGE_BY_ALIAS = new Map(
	SUPPORTED_LANGUAGES.flatMap((language) => language.aliases.map((alias) => [alias, language] as const)),
);

const PRIMARY_COMMAND = COMMANDS[0];
const PRIMARY_VIEW_COMMAND = VIEW_COMMANDS[0];
const PRIMARY_HELP_COMMAND = HELP_COMMANDS[0];
const EXCLUDE_LANGUAGE_NAMES = new Set(CONFIG_EXCLUDE_LANGUAGES.map((language) => parseLanguage(language).name));
const COPY_STATUS_FLASH_MS = 750;
let copyStatusFlashTimer: ReturnType<typeof setTimeout> | undefined;

function isTextBlock(block: unknown): block is { type: "text"; text: string } {
	return (
		typeof block === "object" &&
		block !== null &&
		(block as { type?: unknown }).type === "text" &&
		typeof (block as { text?: unknown }).text === "string"
	);
}

function getMessageText(message: unknown): string | undefined {
	const content = (message as { content?: unknown })?.content;
	if (!Array.isArray(content)) return undefined;

	const text = content.filter(isTextBlock).map((block) => block.text).join("");
	return text.trim() || undefined;
}

function getLastAssistantText(ctx: ExtensionContext): string | undefined {
	const entries = ctx.sessionManager.getBranch();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as { type?: string; message?: { role?: string } };
		if (entry.type !== "message" || entry.message?.role !== "assistant") continue;
		const text = getMessageText(entry.message);
		if (text) return text;
	}
	return undefined;
}

function cleanLanguageToken(token: string): string {
	return token.replace(/^\{+/, "").replace(/\}+$/, "").replace(/^\./, "").toLowerCase();
}

function parseLanguage(info: string): ParsedLanguage {
	const rawLanguage = cleanLanguageToken(info.trim().split(/\s+/, 1)[0] || "") || "text";
	const supported = SUPPORTED_LANGUAGE_BY_ALIAS.get(rawLanguage);
	if (supported) {
		return {
			name: supported.name,
			extension: supported.extension,
			color: supported.color,
			supported: true,
		};
	}

	return {
		name: rawLanguage,
		extension: rawLanguage,
		color: "dim",
		supported: false,
	};
}

function shorten(text: string, maxLength: number): string {
	return text.length > maxLength ? `${text.slice(0, maxLength - 3)}...` : text;
}

function getPreview(code: string): string {
	const lines = code
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter(Boolean);
	const first = shorten(lines[0] || "blank", 34);
	const last = shorten(lines[lines.length - 1] || first, 34);
	return first === last ? first : `${first} ... ${last}`;
}

function shouldIncludeLanguage(language: ParsedLanguage): boolean {
	return !EXCLUDE_LANGUAGE_NAMES.has(language.name);
}

function extractCodeBlocks(markdown: string): CodeBlock[] {
	const lines = markdown.split(/\r?\n/);
	const blocks: CodeBlock[] = [];
	let fenceChar: "`" | "~" | undefined;
	let fenceLength = 0;
	let info = "";
	let buffer: string[] = [];

	for (const line of lines) {
		if (!fenceChar) {
			const open = line.trimStart().match(/^(`{3,}|~{3,})(.*)$/);
			if (!open) continue;

			fenceChar = open[1][0] as "`" | "~";
			fenceLength = open[1].length;
			info = open[2].trim();
			buffer = [];
			continue;
		}

		const trimmed = line.trim();
		const isClose = trimmed.length >= fenceLength && [...trimmed].every((char) => char === fenceChar);
		if (isClose) {
			const code = buffer.join("\n");
			const language = parseLanguage(info);
			if (code.trim().length > 0 && shouldIncludeLanguage(language)) {
				blocks.push({
					index: blocks.length + 1,
					language: language.name,
					code,
					lineCount: code.split(/\r?\n/).length,
					preview: getPreview(code),
				});
			}

			fenceChar = undefined;
			fenceLength = 0;
			info = "";
			buffer = [];
			continue;
		}

		buffer.push(line);
	}

	return blocks;
}

function languageDisplay(language: string): ParsedLanguage {
	return parseLanguage(language);
}

function languageLabel(language: string): string {
	return `.${languageDisplay(language).extension}`;
}

function coloredLanguageLabel(ctx: ExtensionContext, language: string): string {
	const display = languageDisplay(language);
	return ctx.ui.theme.fg(display.color, `.${display.extension}`);
}

function lineLabel(count: number): string {
	return count === 1 ? "1 line" : `${count} lines`;
}

function widgetBlock(ctx: ExtensionContext, block: CodeBlock): string {
	const index = ctx.ui.theme.fg("accent", `[${block.index}]`);
	const language = coloredLanguageLabel(ctx, block.language);
	const preview = ctx.ui.theme.fg("muted", block.preview);
	return `${index} ${language} ${preview}`;
}

function widgetLines(ctx: ExtensionContext, blocks: CodeBlock[]): string[] {
	const hints = [LEADER_SHORTCUT ? `${LEADER_SHORTCUT}: c [$]` : undefined].filter((hint): hint is string => Boolean(hint));
	const hint = hints.length > 0 ? `  ${ctx.ui.theme.fg("dim", hints.join(" · "))}` : "";
	return [`/${PRIMARY_COMMAND} [n]${hint}`, ...blocks.map((block) => widgetBlock(ctx, block))];
}

function updateWidget(ctx: ExtensionContext, text: string | undefined): void {
	if (!ctx.hasUI) return;

	const blocks = text ? extractCodeBlocks(text) : [];
	if (blocks.length === 0) {
		ctx.ui.setWidget(WIDGET_KEY, undefined);
		return;
	}

	ctx.ui.setWidget(WIDGET_KEY, widgetLines(ctx, blocks), { placement: "aboveEditor" });
}

function notifyCopied(ctx: ExtensionContext, block: CodeBlock): void {
	const message = `Copied [${block.index}] (${languageLabel(block.language)}, ${lineLabel(block.lineCount)})`;

	if (copyStatusFlashTimer) clearTimeout(copyStatusFlashTimer);

	ctx.ui.notify(ctx.ui.theme.fg("success", message), "info");
	copyStatusFlashTimer = setTimeout(() => {
		ctx.ui.notify(message, "info");
		copyStatusFlashTimer = undefined;
	}, COPY_STATUS_FLASH_MS);
}

function availableBlocksLabel(count: number): string {
	return count === 1 ? "1" : `1-${count}`;
}

function firstArgToken(arg?: string): string | undefined {
	return arg?.trim().split(/\s+/, 1)[0] || undefined;
}

function isValidBlockArg(arg?: string): boolean {
	const token = firstArgToken(arg);
	return !token || /^\d+$/.test(token);
}

function notifyInvalidBlockArg(ctx: ExtensionContext): void {
	ctx.ui.notify(`Codeblock copy expects a block number. Use /${PRIMARY_HELP_COMMAND} for help.`, "error");
}

async function chooseBlock(ctx: ExtensionContext, blocks: CodeBlock[], arg?: string, title = "Copy code block"): Promise<CodeBlock | undefined> {
	const token = firstArgToken(arg);
	if (token) {
		const index = /^\d+$/.test(token) ? Number.parseInt(token, 10) : NaN;
		if (Number.isInteger(index) && index >= 1 && index <= blocks.length) return blocks[index - 1];

		const available = availableBlocksLabel(blocks.length);
		const usage = `/${PRIMARY_COMMAND} ${available === "1" ? "1" : "[n]"}`;
		ctx.ui.notify(`No code block ${token}. Available: ${available}. Use ${usage} or /${PRIMARY_HELP_COMMAND}.`, "error");
		return undefined;
	}

	if (blocks.length === 1) return blocks[0];

	const options = blocks.map((block) => `${block.index}. ${languageLabel(block.language)} — ${lineLabel(block.lineCount)} — ${block.preview}`);
	const choice = await ctx.ui.select(title, options);
	if (!choice) return undefined;

	const index = Number.parseInt(choice.split(".", 1)[0], 10);
	return blocks[index - 1];
}

async function getCodeBlocks(ctx: ExtensionContext): Promise<{ text: string; blocks: CodeBlock[] } | undefined> {
	const text = getLastAssistantText(ctx);
	if (!text) {
		ctx.ui.notify("No assistant response found", "error");
		return undefined;
	}

	const blocks = extractCodeBlocks(text);
	if (blocks.length === 0) {
		ctx.ui.notify("No non-markdown code blocks found in the last assistant response", "error");
		updateWidget(ctx, undefined);
		return undefined;
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
		const message = error instanceof Error ? error.message : String(error);
		ctx.ui.notify(`Failed to copy code block: ${message}`, "error");
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

	await ctx.ui.editor(`Code block ${block.index} (${languageLabel(block.language)}, ${lineLabel(block.lineCount)})`, block.code);
}

function isHelpArg(args: string): boolean {
	const token = args.trim().split(/\s+/, 1)[0]?.toLowerCase();
	return token === "help" || token === "--help" || token === "-help" || token === "-h" || token === "?";
}

async function showHelp(ctx: ExtensionContext): Promise<void> {
	const lines = [
		`/${PRIMARY_COMMAND} [n] — copy block n, or pick if omitted`,
		`/${PRIMARY_VIEW_COMMAND} [n] — view block n, or pick if omitted`,
		`/${PRIMARY_HELP_COMMAND} — show this help`,
		LEADER_SHORTCUT ? `${LEADER_SHORTCUT} then c — pick a block to copy` : undefined,
		LEADER_SHORTCUT ? `${LEADER_SHORTCUT} then v — pick a block to view` : undefined,
		LEADER_SHORTCUT ? `${LEADER_SHORTCUT} then 1-9 — copy that block` : undefined,
		DIRECT_SHORTCUT ? `${DIRECT_SHORTCUT} — copy or pick` : undefined,
	].filter((line): line is string => Boolean(line));

	await ctx.ui.editor("Codeblock copy help", lines.join("\n"));
}

function isCancelKey(data: string): boolean {
	return data === "\u001b" || data === "\u0003";
}

export default function (pi: ExtensionAPI) {
	let leaderCleanup: (() => void) | undefined;
	let leaderTimer: ReturnType<typeof setTimeout> | undefined;

	function clearLeader(ctx?: ExtensionContext): void {
		if (leaderTimer) clearTimeout(leaderTimer);
		leaderTimer = undefined;
		leaderCleanup?.();
		leaderCleanup = undefined;
		ctx?.ui.setStatus("codeblock-copy-leader", undefined);
	}

	function startLeader(ctx: ExtensionContext): void {
		clearLeader(ctx);
		ctx.ui.setStatus("codeblock-copy-leader", ctx.ui.theme.fg("accent", "prefix: c pick · 1-9 copy · esc cancel"));

		leaderTimer = setTimeout(() => clearLeader(ctx), LEADER_TIMEOUT_MS);
		leaderCleanup = ctx.ui.onTerminalInput((data) => {
			clearLeader(ctx);

			if (isCancelKey(data)) return { consume: true };
			if (data.toLowerCase() === "c") {
				void copyCodeBlock(ctx);
				return { consume: true };
			}
			if (data.toLowerCase() === "v") {
				void viewCodeBlock(ctx);
				return { consume: true };
			}
			if (/^[1-9]$/.test(data)) {
				void copyCodeBlock(ctx, data);
				return { consume: true };
			}

			return { data };
		});
	}

	pi.on("session_start", async (_event, ctx) => {
		updateWidget(ctx, getLastAssistantText(ctx));
	});

	pi.on("message_end", async (event, ctx) => {
		if (event.message.role !== "assistant") return;
		updateWidget(ctx, getMessageText(event.message));
	});

	const command = {
		description: "Copy a numbered code block from the last assistant response",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			if (isHelpArg(args)) {
				await showHelp(ctx);
				return;
			}
			await copyCodeBlock(ctx, args);
		},
	};

	const viewCommand = {
		description: "View a numbered code block from the last assistant response",
		handler: async (args: string, ctx: ExtensionCommandContext) => {
			if (isHelpArg(args)) {
				await showHelp(ctx);
				return;
			}
			await viewCodeBlock(ctx, args);
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

	if (LEADER_SHORTCUT) {
		pi.registerShortcut(LEADER_SHORTCUT, {
			description: "Pi prefix for code block copy",
			handler: (ctx) => {
				startLeader(ctx);
			},
		});
	}

	if (DIRECT_SHORTCUT) {
		pi.registerShortcut(DIRECT_SHORTCUT, {
			description: "Copy code block from last assistant response",
			handler: async (ctx) => {
				await copyCodeBlock(ctx);
			},
		});
	}
}
