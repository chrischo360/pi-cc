import type {
	ExtensionAPI,
	ExtensionCommandContext,
	ThemeColor,
} from "@earendil-works/pi-coding-agent";

// Minimal stand-in for a Pi runtime: it captures the commands and event
// handlers an extension registers, and provides a fake ExtensionContext whose
// UI interactions are recorded so tests can assert on them.

export interface Notification {
	message: string;
	type: "info" | "warning" | "error";
}

export interface EditorCall {
	title: string;
	content: string;
}

export interface WidgetState {
	content: string[] | undefined;
}

interface Command {
	description: string;
	handler: (args: string, ctx: ExtensionCommandContext) => Promise<void> | void;
}

type EventHandler = (event: unknown, ctx: ExtensionCommandContext) => Promise<void> | void;

export interface Harness {
	/** Run a registered command by name, as if the user typed `/name args`. */
	runCommand(name: string, args?: string): Promise<void>;
	/** Emit a lifecycle event (e.g. "session_start", "message_end"). */
	emit(event: string, payload?: unknown): Promise<void>;
	/** Queue the option string the next `ctx.ui.select` call should return. */
	queueSelect(choice: string | undefined): void;
	/** Set the assistant messages that `getLastAssistantText` will see (oldest first). */
	setAssistantMessages(texts: string[]): void;
	registeredCommands(): string[];
	notifications: Notification[];
	editors: EditorCall[];
	widget: WidgetState;
	lastSelect: { title: string; options: string[] } | null;
}

export function createHarness(loadExtension: (pi: ExtensionAPI) => void, options?: { hasUI?: boolean }): Harness {
	const commands = new Map<string, Command>();
	const events = new Map<string, EventHandler[]>();
	const selectQueue: (string | undefined)[] = [];
	let assistantTexts: string[] = [];

	const notifications: Notification[] = [];
	const editors: EditorCall[] = [];
	const widget: WidgetState = { content: undefined };
	let lastSelect: { title: string; options: string[] } | null = null;

	const messageEntries = () =>
		assistantTexts.map((text) => ({
			type: "message" as const,
			message: { role: "assistant" as const, content: [{ type: "text" as const, text }] },
		}));

	const ctx = {
		hasUI: options?.hasUI ?? true,
		mode: "tui",
		cwd: process.cwd(),
		sessionManager: {
			getBranch: () => messageEntries(),
		},
		ui: {
			notify(message: string, type: "info" | "warning" | "error" = "info") {
				notifications.push({ message, type });
			},
			async select(title: string, opts: string[]) {
				lastSelect = { title, options: opts };
				return selectQueue.length > 0 ? selectQueue.shift() : undefined;
			},
			async editor(title: string, prefill = "") {
				editors.push({ title, content: prefill });
				return prefill;
			},
			setWidget(_key: string, content: string[] | undefined) {
				widget.content = content;
			},
			theme: {
				// Pass text through unchanged so assertions match on plain strings.
				fg(_color: ThemeColor, text: string) {
					return text;
				},
			},
		},
	} as unknown as ExtensionCommandContext;

	const pi = {
		registerCommand(name: string, opts: Command) {
			commands.set(name, opts);
		},
		on(event: string, handler: EventHandler) {
			const list = events.get(event) ?? [];
			list.push(handler);
			events.set(event, list);
		},
	} as unknown as ExtensionAPI;

	loadExtension(pi);

	return {
		async runCommand(name: string, args = "") {
			const command = commands.get(name);
			if (!command) throw new Error(`Command not registered: ${name}`);
			await command.handler(args, ctx);
		},
		async emit(event: string, payload?: unknown) {
			for (const handler of events.get(event) ?? []) await handler(payload, ctx);
		},
		queueSelect(choice) {
			selectQueue.push(choice);
		},
		setAssistantMessages(texts) {
			assistantTexts = texts;
		},
		registeredCommands: () => [...commands.keys()],
		notifications,
		editors,
		widget,
		get lastSelect() {
			return lastSelect;
		},
	};
}

// Copying goes through the real `copyToClipboard`, which on a headless machine
// falls back to writing an OSC 52 escape sequence to stdout. We force that path
// (by marking the session remote) and decode the sequence to recover the exact
// text that was copied.
export async function captureCopiedText(action: () => Promise<void>): Promise<string | null> {
	const originalWrite = process.stdout.write.bind(process.stdout);
	const originalSsh = process.env.SSH_CONNECTION;
	process.env.SSH_CONNECTION = "1.2.3.4 1 5.6.7.8 22";

	let copied: string | null = null;
	const osc52 = /\x1b]52;c;([A-Za-z0-9+/=]*)\x07/;
	(process.stdout as { write: unknown }).write = (chunk: string | Uint8Array, ...rest: unknown[]): boolean => {
		const str = typeof chunk === "string" ? chunk : Buffer.from(chunk).toString();
		const match = str.match(osc52);
		if (match) copied = Buffer.from(match[1], "base64").toString("utf8");
		return (originalWrite as (...a: unknown[]) => boolean)(chunk, ...rest);
	};

	try {
		await action();
	} finally {
		(process.stdout as { write: unknown }).write = originalWrite;
		if (originalSsh === undefined) delete process.env.SSH_CONNECTION;
		else process.env.SSH_CONNECTION = originalSsh;
	}
	return copied;
}
