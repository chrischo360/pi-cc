import { EXCLUDE_LANGUAGES } from "./Config.ts";
import { parseLanguage } from "./language.ts";
import type { CodeBlock, ParsedLanguage } from "./types.ts";

const EXCLUDE_LANGUAGE_NAMES: ReadonlySet<string> = new Set(EXCLUDE_LANGUAGES.map((language) => language.name));

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

export function extractCodeBlocks(markdown: string): CodeBlock[] {
	const lines = markdown.split(/\r?\n/);
	const blocks: CodeBlock[] = [];
	let fenceChar: "`" | "~" | null = null;
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

			fenceChar = null;
			fenceLength = 0;
			info = "";
			buffer = [];
			continue;
		}

		buffer.push(line);
	}

	return blocks;
}
