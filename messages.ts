import type { ExtensionContext } from "@earendil-works/pi-coding-agent";

function isTextBlock(block: unknown): block is { type: "text"; text: string } {
	return (
		typeof block === "object" &&
		block !== null &&
		(block as { type?: unknown }).type === "text" &&
		typeof (block as { text?: unknown }).text === "string"
	);
}

export function getMessageText(message: unknown): string | null {
	const content = (message as { content?: unknown })?.content;
	if (!Array.isArray(content)) return null;

	const text = content.filter(isTextBlock).map((block) => block.text).join("");
	return text.trim() || null;
}

export function getLastAssistantText(ctx: ExtensionContext): string | null {
	const entries = ctx.sessionManager.getBranch();
	for (let i = entries.length - 1; i >= 0; i--) {
		const entry = entries[i] as { type?: string; message?: { role?: string } };
		if (entry.type !== "message" || entry.message?.role !== "assistant") continue;
		const text = getMessageText(entry.message);
		if (text) return text;
	}
	return null;
}
