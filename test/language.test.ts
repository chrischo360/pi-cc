import { describe, expect, it } from "vitest";
import { parseLanguage } from "../language.ts";

describe("parseLanguage", () => {
	it("resolves a canonical language name", () => {
		expect(parseLanguage("python")).toEqual({
			name: "python",
			extension: "py",
			color: "error",
			supported: true,
		});
	});

	it("resolves an alias to its canonical language", () => {
		expect(parseLanguage("js")).toMatchObject({ name: "javascript", extension: "js", supported: true });
	});

	it("is case-insensitive", () => {
		expect(parseLanguage("JavaScript")).toMatchObject({ name: "javascript", supported: true });
	});

	it("defaults to text for an empty info string", () => {
		expect(parseLanguage("")).toMatchObject({ name: "text", extension: "txt", supported: true });
	});

	it("defaults to text for a whitespace-only info string", () => {
		expect(parseLanguage("   ")).toMatchObject({ name: "text", supported: true });
	});

	it("uses only the first whitespace-delimited token", () => {
		expect(parseLanguage("ts extra tokens")).toMatchObject({ name: "typescript", supported: true });
	});

	it("strips surrounding braces from a token", () => {
		expect(parseLanguage("{python}")).toMatchObject({ name: "python", supported: true });
	});

	it("strips a leading dot from a token", () => {
		expect(parseLanguage(".ts")).toMatchObject({ name: "typescript", supported: true });
	});

	it("marks an unknown language as unsupported and echoes the token", () => {
		expect(parseLanguage("brainfuck")).toEqual({
			name: "brainfuck",
			extension: "brainfuck",
			color: "dim",
			supported: false,
		});
	});
});
