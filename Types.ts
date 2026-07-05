import type { ThemeColor } from "@earendil-works/pi-coding-agent";

export interface Language {
	readonly name: string;
	readonly extension: string;
	readonly aliases: readonly string[];
	readonly color: ThemeColor;
}

export interface ParsedLanguage extends Pick<Language, "name" | "extension" | "color"> {
	supported: boolean;
}

export interface CodeBlock {
	index: number;
	language: string;
	code: string;
	lineCount: number;
	preview: string;
}
