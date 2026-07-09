import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { PRIMARY_COMMAND, PRIMARY_HELP_COMMAND, PRIMARY_VIEW_COMMAND, WIDGET_KEY } from "./Config.ts";
import { extractCodeBlocks } from "./code-blocks.ts";
import { parseLanguage } from "./language.ts";
import type { CodeBlock, ParsedLanguage } from "./types.ts";

const COPY_STATUS_FLASH_MS = 750;
let copyStatusFlashTimer: ReturnType<typeof setTimeout> | null = null;

function languageDisplay(language: string): ParsedLanguage {
	return parseLanguage(language);
}

export function languageLabel(language: string): string {
	return `.${languageDisplay(language).extension}`;
}

function coloredLanguageLabel(ctx: ExtensionContext, language: string): string {
	const display = languageDisplay(language);
	return ctx.ui.theme.fg(display.color, `.${display.extension}`);
}

export function lineLabel(count: number): string {
	return count === 1 ? "1 line" : `${count} lines`;
}

function widgetBlock(ctx: ExtensionContext, block: CodeBlock): string {
	const index = ctx.ui.theme.fg("accent", `[${block.index}]`);
	const language = coloredLanguageLabel(ctx, block.language);
	const preview = ctx.ui.theme.fg("muted", block.preview);
	return `${index} ${language} ${preview}`;
}

function widgetLines(ctx: ExtensionContext, blocks: CodeBlock[]): string[] {
	return [`/${PRIMARY_COMMAND} [n]`, ...blocks.map((block) => widgetBlock(ctx, block))];
}

export function clearWidget(ctx: ExtensionContext): void {
	ctx.ui.setWidget(WIDGET_KEY, undefined);
}

export function updateWidget(ctx: ExtensionContext, text: string | null): void {
	if (!ctx.hasUI) return;

	const blocks = text ? extractCodeBlocks(text) : [];
	if (blocks.length === 0) {
		clearWidget(ctx);
		return;
	}

	ctx.ui.setWidget(WIDGET_KEY, widgetLines(ctx, blocks), { placement: "aboveEditor" });
}

export function notifyCopied(ctx: ExtensionContext, block: CodeBlock): void {
	const message = `Copied [${block.index}] (${languageLabel(block.language)}, ${lineLabel(block.lineCount)})`;

	if (copyStatusFlashTimer) clearTimeout(copyStatusFlashTimer);

	ctx.ui.notify(ctx.ui.theme.fg("success", message), "info");
	copyStatusFlashTimer = setTimeout(() => {
		ctx.ui.notify(message, "info");
		copyStatusFlashTimer = null;
	}, COPY_STATUS_FLASH_MS);
}

export function notifyInvalidBlockArg(ctx: ExtensionContext): void {
	ctx.ui.notify(`Codeblock copy expects a block number. Use /${PRIMARY_HELP_COMMAND} for help.`, "error");
}

export function errorMessage(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

export function notifyError(ctx: ExtensionContext, prefix: string, error: unknown): void {
	ctx.ui.notify(`${prefix}: ${errorMessage(error)}`, "error");
}

export async function showHelp(ctx: ExtensionContext): Promise<void> {
	const lines = [
		`/${PRIMARY_COMMAND} [n] — copy block n, or pick if omitted`,
		`/${PRIMARY_VIEW_COMMAND} [n] — view block n, or pick if omitted`,
		`/${PRIMARY_HELP_COMMAND} — show this help`,
	];

	try {
		await ctx.ui.editor("Codeblock copy help", lines.join("\n"));
	} catch (error) {
		notifyError(ctx, "Failed to show help", error);
	}
}
