import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { afterEach, describe, expect, it, vi } from "vitest";
import { PRIMARY_COMMAND, PRIMARY_HELP_COMMAND, PRIMARY_VIEW_COMMAND, WIDGET_KEY } from "../Config.ts";
import type { CodeBlock } from "../types.ts";
import {
	clearWidget,
	languageLabel,
	lineLabel,
	notifyCopied,
	notifyInvalidBlockArg,
	showHelp,
	updateWidget,
} from "../ui.ts";

describe("languageLabel", () => {
	it("prefixes a known language's extension with a dot", () => {
		expect(languageLabel("python")).toBe(".py");
	});

	it("resolves aliases before labeling", () => {
		expect(languageLabel("ts")).toBe(".ts");
		expect(languageLabel("js")).toBe(".js");
	});

	it("falls back to the raw token for an unknown language", () => {
		expect(languageLabel("brainfuck")).toBe(".brainfuck");
	});
});

describe("lineLabel", () => {
	it("uses the singular form for a single line", () => {
		expect(lineLabel(1)).toBe("1 line");
	});

	it("uses the plural form for zero or multiple lines", () => {
		expect(lineLabel(0)).toBe("0 lines");
		expect(lineLabel(2)).toBe("2 lines");
		expect(lineLabel(42)).toBe("42 lines");
	});
});

function makeContext(hasUI = true) {
	const setWidget = vi.fn();
	const notify = vi.fn();
	const editor = vi.fn().mockResolvedValue(undefined);
	const ctx = {
		hasUI,
		ui: {
			theme: { fg: (_color: string, text: string) => text },
			setWidget,
			notify,
			editor,
		},
	} as unknown as ExtensionContext;
	return { ctx, setWidget, notify, editor };
}

const codeBlock: CodeBlock = {
	index: 1,
	language: "python",
	code: "print('hi')",
	lineCount: 3,
	preview: "print('hi')",
};

afterEach(() => {
	vi.useRealTimers();
	vi.restoreAllMocks();
});

describe("clearWidget", () => {
	it("removes the widget by key", () => {
		const { ctx, setWidget } = makeContext();
		clearWidget(ctx);
		expect(setWidget).toHaveBeenCalledWith(WIDGET_KEY, undefined);
	});
});

describe("updateWidget", () => {
	it("does nothing when the context has no UI", () => {
		const { ctx, setWidget } = makeContext(false);
		updateWidget(ctx, "```py\nprint('hi')\n```");
		expect(setWidget).not.toHaveBeenCalled();
	});

	it("clears the widget when the text is null", () => {
		const { ctx, setWidget } = makeContext();
		updateWidget(ctx, null);
		expect(setWidget).toHaveBeenCalledWith(WIDGET_KEY, undefined);
	});

	it("clears the widget when the text contains no code blocks", () => {
		const { ctx, setWidget } = makeContext();
		updateWidget(ctx, "just prose");
		expect(setWidget).toHaveBeenCalledWith(WIDGET_KEY, undefined);
	});

	it("renders a widget line per code block above the editor", () => {
		const { ctx, setWidget } = makeContext();
		updateWidget(ctx, "```py\nprint('hi')\n```\ntext\n```js\nconst a = 1;\n```");

		expect(setWidget).toHaveBeenCalledTimes(1);
		const [key, lines, options] = setWidget.mock.calls[0];
		expect(key).toBe(WIDGET_KEY);
		expect(options).toEqual({ placement: "aboveEditor" });
		expect(lines[0]).toBe(`/${PRIMARY_COMMAND} [n]`);
		expect(lines).toHaveLength(3);
		expect(lines[1]).toContain("[1]");
		expect(lines[1]).toContain(".py");
		expect(lines[2]).toContain("[2]");
		expect(lines[2]).toContain(".js");
	});
});

describe("notifyInvalidBlockArg", () => {
	it("notifies with an error that references the help command", () => {
		const { ctx, notify } = makeContext();
		notifyInvalidBlockArg(ctx);
		expect(notify).toHaveBeenCalledTimes(1);
		const [message, level] = notify.mock.calls[0];
		expect(level).toBe("error");
		expect(message).toContain(PRIMARY_HELP_COMMAND);
	});
});

describe("notifyCopied", () => {
	it("notifies immediately and again after the flash delay", () => {
		vi.useFakeTimers();
		const { ctx, notify } = makeContext();

		notifyCopied(ctx, codeBlock);
		expect(notify).toHaveBeenCalledTimes(1);
		expect(notify.mock.calls[0][0]).toContain("Copied [1]");
		expect(notify.mock.calls[0][0]).toContain(".py");
		expect(notify.mock.calls[0][0]).toContain("3 lines");

		vi.runAllTimers();
		expect(notify).toHaveBeenCalledTimes(2);
	});

	it("resets a pending flash timer when copying again quickly", () => {
		vi.useFakeTimers();
		const clearSpy = vi.spyOn(globalThis, "clearTimeout");
		const { ctx } = makeContext();

		notifyCopied(ctx, codeBlock);
		notifyCopied(ctx, codeBlock);
		expect(clearSpy).toHaveBeenCalled();
	});
});

describe("showHelp", () => {
	it("opens an editor listing the copy, view and help commands", async () => {
		const { ctx, editor } = makeContext();
		await showHelp(ctx);

		expect(editor).toHaveBeenCalledTimes(1);
		const [title, body] = editor.mock.calls[0];
		expect(title).toBe("Codeblock copy help");
		expect(body).toContain(`/${PRIMARY_COMMAND}`);
		expect(body).toContain(`/${PRIMARY_VIEW_COMMAND}`);
		expect(body).toContain(`/${PRIMARY_HELP_COMMAND}`);
	});
});
