import type { Language } from "./types.ts";

export const LANGUAGES = {
	bash: { name: "bash", extension: "sh", aliases: ["bash", "sh", "shell"], color: "success" },
	css: { name: "css", extension: "css", aliases: ["css"], color: "accent" },
	diff: { name: "diff", extension: "diff", aliases: ["diff", "patch"], color: "warning" },
	html: { name: "html", extension: "html", aliases: ["html"], color: "warning" },
	javascript: { name: "javascript", extension: "js", aliases: ["javascript", "js"], color: "warning" },
	json: { name: "json", extension: "json", aliases: ["json"], color: "accent" },
	jsx: { name: "jsx", extension: "jsx", aliases: ["jsx", "javascriptreact"], color: "warning" },
	lua: { name: "lua", extension: "lua", aliases: ["lua"], color: "accent" },
	markdown: { name: "markdown", extension: "md", aliases: ["md", "markdown", "mdoc", "mdx"], color: "dim" },
	python: { name: "python", extension: "py", aliases: ["python", "py"], color: "error" },
	sql: { name: "sql", extension: "sql", aliases: ["sql"], color: "accent" },
	text: { name: "text", extension: "txt", aliases: ["text", "txt", "plain", "plaintext"], color: "dim" },
	typescript: { name: "typescript", extension: "ts", aliases: ["typescript", "ts"], color: "accent" },
	tsx: { name: "tsx", extension: "tsx", aliases: ["tsx", "typescriptreact"], color: "accent" },
	toml: { name: "toml", extension: "toml", aliases: ["toml"], color: "accent" },
	yaml: { name: "yaml", extension: "yaml", aliases: ["yaml", "yml"], color: "accent" },
	zsh: { name: "zsh", extension: "zsh", aliases: ["zsh"], color: "success" },
} as const satisfies Record<string, Language>;

export const SUPPORTED_LANGUAGES: readonly Language[] = Object.values(LANGUAGES);
