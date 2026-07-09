import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { describe, expect, it } from "vitest";
import { getLastAssistantText, getMessageText } from "../messages.ts";

describe("getMessageText", () => {
	it("returns null when the message has no content array", () => {
		expect(getMessageText({})).toBeNull();
		expect(getMessageText(null)).toBeNull();
		expect(getMessageText({ content: "not an array" })).toBeNull();
	});

	it("concatenates the text of all text blocks", () => {
		const message = { content: [{ type: "text", text: "Hello, " }, { type: "text", text: "world" }] };
		expect(getMessageText(message)).toBe("Hello, world");
	});

	it("ignores non-text blocks", () => {
		const message = {
			content: [
				{ type: "image", url: "x" },
				{ type: "text", text: "keep" },
				{ type: "tool_use", name: "y" },
			],
		};
		expect(getMessageText(message)).toBe("keep");
	});

	it("trims the concatenated text", () => {
		const message = { content: [{ type: "text", text: "  spaced  " }] };
		expect(getMessageText(message)).toBe("spaced");
	});

	it("returns null when the text is empty after trimming", () => {
		const message = { content: [{ type: "text", text: "   " }] };
		expect(getMessageText(message)).toBeNull();
	});

	it("returns null when a text block has a non-string text field", () => {
		const message = { content: [{ type: "text", text: 123 }] };
		expect(getMessageText(message)).toBeNull();
	});
});

type BranchEntry = { type: string; message?: { role?: string; content?: unknown } };

function makeContext(entries: BranchEntry[]): ExtensionContext {
	return {
		sessionManager: {
			getBranch: () => entries,
		},
	} as unknown as ExtensionContext;
}

function assistantEntry(text: string): BranchEntry {
	return { type: "message", message: { role: "assistant", content: [{ type: "text", text }] } };
}

describe("getLastAssistantText", () => {
	it("returns null when the branch is empty", () => {
		expect(getLastAssistantText(makeContext([]))).toBeNull();
	});

	it("returns the text of the most recent assistant message", () => {
		const ctx = makeContext([assistantEntry("first"), assistantEntry("second")]);
		expect(getLastAssistantText(ctx)).toBe("second");
	});

	it("skips user messages and non-message entries", () => {
		const ctx = makeContext([
			assistantEntry("assistant text"),
			{ type: "message", message: { role: "user", content: [{ type: "text", text: "user text" }] } },
			{ type: "tool_call" },
		]);
		expect(getLastAssistantText(ctx)).toBe("assistant text");
	});

	it("skips assistant messages with no extractable text", () => {
		const ctx = makeContext([
			assistantEntry("has text"),
			{ type: "message", message: { role: "assistant", content: [] } },
		]);
		expect(getLastAssistantText(ctx)).toBe("has text");
	});
});
