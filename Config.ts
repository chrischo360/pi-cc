import type { SupportedLanguage } from "./Types.ts";

export const WIDGET_KEY = "codeblock-copy";

export const COMMANDS = ["cc", "copy-code"];
export const VIEW_COMMANDS = ["vc", "view-code"];
export const HELP_COMMANDS = ["cc-help", "codeblock-copy-help"];

export const LEADER_SHORTCUT = "ctrl+shift+x";
export const DIRECT_SHORTCUT = "ctrl+shift+y";
export const LEADER_TIMEOUT_MS = 2000;

export const EXCLUDE_LANGUAGES: string[] = [];

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
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
