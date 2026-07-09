import assert from "node:assert/strict";
import { test } from "node:test";
import loadExtension from "../index.ts";
import { captureCopiedText, createHarness } from "./pi-mock.ts";

const TWO_BLOCKS = [
	"Here is some python:",
	"",
	"```python",
	'print("hello")',
	"```",
	"",
	"And a bash block:",
	"",
	"```bash",
	"echo hi",
	"ls",
	"```",
].join("\n");

function harnessWith(texts: string[], options?: { hasUI?: boolean }) {
	const h = createHarness(loadExtension, options);
	h.setAssistantMessages(texts);
	return h;
}

test("registers all copy, view, and help command aliases", () => {
	const h = harnessWith([]);
	assert.deepEqual(h.registeredCommands().sort(), [
		"cc",
		"cc-help",
		"codeblock-copy-help",
		"copy-code",
		"vc",
		"view-code",
	]);
});

test("/cc <n> copies the requested block and notifies", async () => {
	const h = harnessWith([TWO_BLOCKS]);

	const copied = await captureCopiedText(() => h.runCommand("cc", "1"));
	assert.equal(copied, 'print("hello")');
	assert.deepEqual(h.notifications.at(-1), { message: "Copied [1] (.py, 1 line)", type: "info" });

	const copied2 = await captureCopiedText(() => h.runCommand("cc", "2"));
	assert.equal(copied2, "echo hi\nls");
	assert.deepEqual(h.notifications.at(-1), { message: "Copied [2] (.sh, 2 lines)", type: "info" });
});

test("/cc with no arg opens a selector and copies the chosen block", async () => {
	const h = harnessWith([TWO_BLOCKS]);
	h.queueSelect("2.");

	const copied = await captureCopiedText(() => h.runCommand("cc"));

	assert.equal(copied, "echo hi\nls");
	assert.equal(h.lastSelect?.title, "Copy code block");
	assert.deepEqual(h.lastSelect?.options, [
		"1. .py — 1 line — print(\"hello\")",
		"2. .sh — 2 lines — echo hi ... ls",
	]);
});

test("/cc <n> out of range reports available range", async () => {
	const h = harnessWith([TWO_BLOCKS]);
	await h.runCommand("cc", "5");
	assert.deepEqual(h.notifications.at(-1), {
		message: "No code block 5. Available: 1-2. Use /cc [n] or /cc-help.",
		type: "error",
	});
});

test("/cc with a non-numeric arg is rejected before touching the response", async () => {
	const h = harnessWith([TWO_BLOCKS]);
	await h.runCommand("cc", "abc");
	assert.deepEqual(h.notifications.at(-1), {
		message: "Codeblock copy expects a block number. Use /cc-help for help.",
		type: "error",
	});
});

test("/cc with no assistant response notifies the user", async () => {
	const h = harnessWith([]);
	await h.runCommand("cc");
	assert.deepEqual(h.notifications.at(-1), { message: "No assistant response found", type: "error" });
});

test("/vc <n> opens the block in the editor", async () => {
	const h = harnessWith([TWO_BLOCKS]);
	await h.runCommand("vc", "1");
	assert.deepEqual(h.editors.at(-1), {
		title: "Code block 1 (.py, 1 line)",
		content: 'print("hello")',
	});
});

test("help command and `/cc help` both open the help editor", async () => {
	const h = harnessWith([TWO_BLOCKS]);
	await h.runCommand("cc-help");
	await h.runCommand("cc", "help");
	assert.equal(h.editors.length, 2);
	assert.ok(h.editors.every((e) => e.title === "Codeblock copy help"));
});

test("session_start and message_end populate the copy-panel widget", async () => {
	const h = harnessWith([]);

	h.setAssistantMessages([TWO_BLOCKS]);
	await h.emit("session_start", {});
	assert.deepEqual(h.widget.content, [
		"/cc [n]",
		"[1] .py print(\"hello\")",
		"[2] .sh echo hi ... ls",
	]);

	h.setAssistantMessages([]);
	await h.emit("message_end", { message: { role: "assistant", content: [{ type: "text", text: "no code here" }] } });
	assert.equal(h.widget.content, undefined);
});
