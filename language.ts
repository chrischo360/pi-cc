import { SUPPORTED_LANGUAGES } from "./languages.ts";
import { firstToken } from "./text.ts";
import type { Language, ParsedLanguage } from "./types.ts";

function cleanLanguageToken(token: string): string {
	return token.replace(/^\{+/, "").replace(/\}+$/, "").replace(/^\./, "").toLowerCase();
}

function findLanguage(alias: string): Language | null {
	return SUPPORTED_LANGUAGES.find((language) => language.aliases.includes(alias)) ?? null;
}

export function parseLanguage(info: string): ParsedLanguage {
	const rawLanguage = cleanLanguageToken(firstToken(info)) || "text";
	const supported = findLanguage(rawLanguage);
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
