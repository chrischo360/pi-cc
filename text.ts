export function firstToken(text: string | null | undefined): string {
	return text?.trim().split(/\s+/, 1)[0] ?? "";
}

export function isDigits(token: string): boolean {
	return /^\d+$/.test(token);
}
