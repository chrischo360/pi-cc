import type { ThemeColor } from "@earendil-works/pi-coding-agent";

export interface SupportedLanguage {
	name: string;
	extension: string;
	aliases: string[];
	color: ThemeColor;
}

export interface ParsedLanguage {
	name: string;
	extension: string;
	color: ThemeColor;
	supported: boolean;
}

export interface CodeBlock {
	index: number;
	language: string;
	code: string;
	lineCount: number;
	preview: string;
}

export interface CodeblockCopyConfig {
	commands: string[];
	viewCommands: string[];
	helpCommands: string[];
	includeLanguages?: Set<string>;
	excludeLanguages: Set<string>;
	leaderShortcut?: string;
	directShortcut?: string;
	leaderTimeoutMs: number;
}
