import { copyToClipboard } from "@earendil-works/pi-coding-agent";
import type { ExtensionAPI, ExtensionCommandContext, ExtensionContext, ThemeColor } from "@earendil-works/pi-coding-agent";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const WIDGET_KEY = "codeblock-copy";
const DEFAULT_COMMANDS = ["copy-code", "cc"];
const DEFAULT_VIEW_COMMANDS = ["view-code", "vc"];
const DEFAULT_LEADER_SHORTCUT = "ctrl+x";
const DEFAULT_DIRECT_SHORTCUT = "ctrl+shift+y";
const DEFAULT_LEADER_TIMEOUT_MS = 2000;
const SKIPPED_LANGUAGES = new Set(["md", "markdown", "mdoc", "mdx"]);

interface SupportedLanguage {
	name: string;
	extension: string;
	aliases: string[];
	color: ThemeColor;
}

interface ParsedLanguage {
	name: string;
	extension: string;
	color: ThemeColor;
	supported: boolean;
}

const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
	{ name: "bash", extension: "sh", aliases: ["bash", "sh", "shell"], color: "success" },
	{ name: "css", extension: "css", aliases: ["css"], color: "accent" },
	{ name: "diff", extension: "diff", aliases: ["diff", "patch"], color: "warning" },
	{ name: "html", extension: "html", aliases: ["html"], color: "warning" },
	{ name: "javascript", extension: "js", aliases: ["javascript", "js"], color: "warning" },
	{ name: "json", extension: "json", aliases: ["json"], color: "accent" },
	{ name: "jsx", extension: "jsx", aliases: ["jsx", "javascriptreact"], color: "warning" },
	{ name: "lua", extension: "lua", aliases: ["lua"], color: "accent" },
	{ name: "python", extension: "py", aliases: ["python", "py"], color: "error" },
	{ name: "sql", extension: "sql", aliases: ["sql"], color: "accent" },
	{ name: "text", extension: "txt", aliases: ["text", "txt", "plain", "plaintext"], color: "dim" },
	{ name: "typescript", extension: "ts", aliases: ["typescript", "ts"], color: "accent" },
	{ name: "tsx", extension: "tsx", aliases: ["tsx", "typescriptreact"], color: "accent" },
	{ name: "toml", extension: "toml", aliases: ["toml"], color: "accent" },
	{ name: "yaml", extension: "yaml", aliases: ["yaml", "yml"], color: "accent" },
	{ name: "zsh", extension: "zsh", aliases: ["zsh"], color: "success" },
];

const SUPPORTED_LANGUAGE_BY_ALIAS = new Map(
	SUPPORTED_LANGUAGES.flatMap((language) => language.aliases.map((alias) => [alias, language] as const)),
);

interface CodeBlock {
	index: number;
	language: string;
	code: string;
	lineCount: number;
	preview: string;
}

interface CodeblockCopyConfig {
	commands: string[];
	viewCommands: string[];
	leaderShortcut?: string;
	directShortcut?: string;
	leaderTimeoutMs: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function configPath(): string {
	return join(dirname(fileURLToPath(import.meta.url)), "config.json");
}

function readFileConfig(): Record<string, unknown> {
	const path = configPath();
	if (!existsSync(path)) return {};

	try {
		const config = JSON.parse(readFileSync(path, "utf8"));
		return isRecord(config) ? config : {};
	} catch {
		return {};
	}
}

function parseCommands(value: unknown): string[] | undefined {
	const raw = typeof value === "string" ? value.split(",") : Array.isArray(value) ? value : undefined;
	if (!raw) return undefined;

	const commands = raw
		.filter((item): item is string => typeof item === "string")
		.map((item) => item.trim().replace(/^\/+/, ""))
		.filter(Boolean);

	return commands.length > 0 ? [...new Set(commands)] : undefined;
}

function parseShortcut(value: unknown): string | false | undefined {
	if (value === false || value === null) return false;
	if (typeof value !== "string") return undefined;

	const shortcut = value.trim();
	if (!shortcut || ["false", "none", "off"].includes(shortcut.toLowerCase())) return false;
	return shortcut;
}

function resolveShortcut(fallback: string, ...values: unknown[]): string | undefined {
	for (const value of values) {
		const shortcut = parseShortcut(value);
		if (shortcut !== undefined) return shortcut || undefined;
	}
	return fallback;
}

function parsePositiveInteger(value: unknown): number | undefined {
	const number = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : NaN;
	return Number.isInteger(number) && number > 0 ? number : undefined;
}

function loadConfig(): CodeblockCopyConfig {
	const fileConfig = readFileConfig();
	return {
		commands:
			parseCommands(process.env.PI_CODEBLOCK_COPY_COMMANDS) ??
			parseCommands(process.env.PI_CODEBLOCK_COPY_COMMAND) ??
			parseCommands(fileConfig.commands) ??
			parseCommands(fileConfig.command) ??
			DEFAULT_COMMANDS,
		viewCommands:
			parseCommands(process.env.PI_CODEBLOCK_COPY_VIEW_COMMANDS) ??
			parseCommands(process.env.PI_CODEBLOCK_COPY_VIEW_COMMAND) ??
			parseCommands(fileConfig.viewCommands) ??
			parseCommands(fileConfig.viewCommand) ??
			DEFAULT_VIEW_COMMANDS,
		leaderShortcut: resolveShortcut(
			DEFAULT_LEADER_SHORTCUT,
			process.env.PI_CODEBLOCK_COPY_LEADER_SHORTCUT,
			process.env.PI_CODEBLOCK_COPY_LEADER,
			fileConfig.leaderShortcut,
			fileConfig.leader,
		),
		directShortcut: resolveShortcut(
			DEFAULT_DIRECT_SHORTCUT,
			process.env.PI_CODEBLOCK_COPY_DIRECT_SHORTCUT,
			process.env.PI_CODEBLOCK_COPY_SHORTCUT,
			fileConfig.directShortcut,
			fileConfig.shortcut,
		),
		leaderTimeoutMs:
			parsePositiveInteger(process.env.PI_CODEBLOCK_COPY_LEADER_TIMEOUT_MS) ??
			parsePositiveInteger(fileConfig.leaderTimeoutMs) ??
			DEFAULT_LEADER_TIMEOUT_MS,
	};
}

const CONFIG = loadConfig();
const COMMANDS = CONFIG.commands;
const VIEW_COMMANDS = CONFIG.viewCommands;
const PRIMARY_COMMAND = COMMANDS.includes("cc") ? "cc" : COMMANDS[0] || DEFAULT_COMMANDS[0];
const PRIMARY_VIEW_COMMAND = VIEW_COMMANDS.includes("vc") ? "vc" : VIEW_COMMANDS[0] || DEFAULT_VIEW_COMMANDS[0];
const LEADER = CONFIG.leaderShortcut;
const DIRECT_SHORTCUT = CONFIG.directShortcut;
const LEADER_TIMEOUT_MS = CONFIG.leaderTimeoutMs;

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
			if (code.trim().length > 0 && !SKIPPED_LANGUAGES.has(language.name)) {
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
	const hints = [
		LEADER ? `prefix=${LEADER}` : undefined,
		LEADER ? "c picks" : undefined,
		LEADER ? "v views" : undefined,
		LEADER ? `{1-${blocks.length}} copies` : undefined,
		DIRECT_SHORTCUT ? `${DIRECT_SHORTCUT} copies` : undefined,
	].filter((hint): hint is string => Boolean(hint));
	const hint = hints.length > 0 ? `  ${ctx.ui.theme.fg("dim", hints.join(" · "))}` : "";
	return [`/${PRIMARY_COMMAND} [n] · /${PRIMARY_VIEW_COMMAND} [n]${hint}`, ...blocks.map((block) => widgetBlock(ctx, block))];
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

async function chooseBlock(ctx: ExtensionContext, blocks: CodeBlock[], arg?: string, title = "Copy code block"): Promise<CodeBlock | undefined> {
	const requested = arg?.trim();
	if (requested) {
		const index = Number.parseInt(requested, 10);
		if (Number.isInteger(index) && index >= 1 && index <= blocks.length) return blocks[index - 1];

		ctx.ui.notify(`No code block ${requested}. Available: 1-${blocks.length}`, "error");
		return undefined;
	}

	if (blocks.length === 1) return blocks[0];

	const options = blocks.map((block) => `${block.index}. ${languageLabel(block.language)} — ${lineLabel(block.lineCount)} — ${block.preview}`);
	const choice = await ctx.ui.select(title, options);
	if (!choice) return undefined;

	const index = Number.parseInt(choice.split(".", 1)[0], 10);
	return blocks[index - 1];
}

async function copyCodeBlock(ctx: ExtensionContext, arg?: string): Promise<void> {
	const text = getLastAssistantText(ctx);
	if (!text) {
		ctx.ui.notify("No assistant response found", "error");
		return;
	}

	const blocks = extractCodeBlocks(text);
	if (blocks.length === 0) {
		ctx.ui.notify("No non-markdown code blocks found in the last assistant response", "error");
		updateWidget(ctx, undefined);
		return;
	}

	updateWidget(ctx, text);

	const block = await chooseBlock(ctx, blocks, arg);
	if (!block) return;

	try {
		await copyToClipboard(block.code);
		ctx.ui.notify(`Copied code block ${block.index} (${languageLabel(block.language)}, ${lineLabel(block.lineCount)})`, "info");
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		ctx.ui.notify(`Failed to copy code block: ${message}`, "error");
	}
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
		ctx.ui.setStatus("codeblock-copy-leader", ctx.ui.theme.fg("accent", "prefix: c picker · 1-9 copy · esc cancel"));

		leaderTimer = setTimeout(() => clearLeader(ctx), LEADER_TIMEOUT_MS);
		leaderCleanup = ctx.ui.onTerminalInput((data) => {
			clearLeader(ctx);

			if (isCancelKey(data)) return { consume: true };
			if (data.toLowerCase() === "c") {
				void copyCodeBlock(ctx);
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
			await copyCodeBlock(ctx, args);
		},
	};

	for (const name of COMMANDS) {
		pi.registerCommand(name, command);
	}

	if (LEADER) {
		pi.registerShortcut(LEADER, {
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
