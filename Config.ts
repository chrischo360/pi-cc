import type { Language } from "./types.ts";

export const WIDGET_KEY = "codeblock-copy";

export const COMMANDS = ["cc", "copy-code"] as const;
export const VIEW_COMMANDS = ["vc", "view-code"] as const;
export const HELP_COMMANDS = ["cc-help", "codeblock-copy-help"] as const;

export const PRIMARY_COMMAND = COMMANDS[0];
export const PRIMARY_VIEW_COMMAND = VIEW_COMMANDS[0];
export const PRIMARY_HELP_COMMAND = HELP_COMMANDS[0];

export const EXCLUDE_LANGUAGES: readonly Language[] = [];
