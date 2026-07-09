import { describe, expect, it } from "vitest";
import { extractCodeBlocks } from "../code-blocks.ts";

describe("extractCodeBlocks", () => {
	it("returns an empty array when there are no fenced blocks", () => {
		expect(extractCodeBlocks("just some prose\nwith no code")).toEqual([]);
	});

	it("extracts a single backtick-fenced block with language, code and metadata", () => {
		const markdown = ["```js", "const a = 1;", "const b = 2;", "```"].join("\n");
		const blocks = extractCodeBlocks(markdown);

		expect(blocks).toHaveLength(1);
		expect(blocks[0]).toMatchObject({
			index: 1,
			language: "javascript",
			code: "const a = 1;\nconst b = 2;",
			lineCount: 2,
		});
	});

	it("supports tilde fences", () => {
		const markdown = ["~~~python", "print('hi')", "~~~"].join("\n");
		const blocks = extractCodeBlocks(markdown);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].language).toBe("python");
		expect(blocks[0].code).toBe("print('hi')");
	});

	it("does not treat a tilde fence as closed by backticks (and vice versa)", () => {
		const markdown = ["~~~", "code", "```", "still code", "~~~"].join("\n");
		const blocks = extractCodeBlocks(markdown);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].code).toBe("code\n```\nstill code");
	});

	it("numbers multiple blocks sequentially", () => {
		const markdown = ["```js", "a", "```", "text", "```py", "b", "```"].join("\n");
		const blocks = extractCodeBlocks(markdown);

		expect(blocks.map((block) => block.index)).toEqual([1, 2]);
		expect(blocks.map((block) => block.language)).toEqual(["javascript", "python"]);
	});

	it("skips blocks whose content is only whitespace", () => {
		const markdown = ["```js", "   ", "", "```"].join("\n");
		expect(extractCodeBlocks(markdown)).toEqual([]);
	});

	it("labels a fence without an info string as text", () => {
		const markdown = ["```", "plain", "```"].join("\n");
		expect(extractCodeBlocks(markdown)[0].language).toBe("text");
	});

	it("only reads the first info token as the language", () => {
		const markdown = ["```ts title=example.ts", "const x = 1;", "```"].join("\n");
		expect(extractCodeBlocks(markdown)[0].language).toBe("typescript");
	});

	it("requires the closing fence to be at least as long as the opening fence", () => {
		const markdown = ["````js", "code```", "still```", "````"].join("\n");
		const blocks = extractCodeBlocks(markdown);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].code).toBe("code```\nstill```");
	});

	it("ignores an unterminated fence", () => {
		const markdown = ["```js", "const a = 1;"].join("\n");
		expect(extractCodeBlocks(markdown)).toEqual([]);
	});

	it("handles carriage-return line endings", () => {
		const markdown = "```js\r\nconst a = 1;\r\n```";
		const blocks = extractCodeBlocks(markdown);

		expect(blocks).toHaveLength(1);
		expect(blocks[0].code).toBe("const a = 1;");
		expect(blocks[0].lineCount).toBe(1);
	});

	it("recognizes indented fences", () => {
		const markdown = ["   ```js", "const a = 1;", "   ```"].join("\n");
		expect(extractCodeBlocks(markdown)).toHaveLength(1);
	});

	describe("preview", () => {
		it("uses the single trimmed line when first and last are identical", () => {
			const markdown = ["```js", "  const a = 1;  ", "```"].join("\n");
			expect(extractCodeBlocks(markdown)[0].preview).toBe("const a = 1;");
		});

		it("joins the first and last non-empty lines with an ellipsis", () => {
			const markdown = ["```js", "first", "middle", "last", "```"].join("\n");
			expect(extractCodeBlocks(markdown)[0].preview).toBe("first ... last");
		});

		it("truncates long lines to 34 characters with an ellipsis", () => {
			const longLine = "x".repeat(50);
			const markdown = ["```js", longLine, "```"].join("\n");
			const preview = extractCodeBlocks(markdown)[0].preview;

			expect(preview).toHaveLength(34);
			expect(preview.endsWith("...")).toBe(true);
		});
	});
});
