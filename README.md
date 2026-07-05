# pi-cc

`pi-cc` is an extension for quickly copying [Pi](https://pi.dev/) outputs without fighting tmux copy-mode, broken line breaks, terminal wrapping, or accidental prompt text.

# Demo

https://github.com/user-attachments/assets/1fbab0d8-a050-490b-b3f0-3726c4eaa13b

## What it does

`pi-cc` detects code blocks in the latest Pi response and displays a compact copy panel with numbered entries, language labels, and previews for quick selection.

Use it to:

- Copy a specific code block to your clipboard
- Pick from multiple code blocks with a selector
- Open a code block in Pi's editor for viewing or editing

## Installation

This repo is a Pi package. Add it to your Pi package configuration using the local path or package source, then restart Pi.

The package advertises its extension through `package.json`:

```json
{
  "pi": {
    "extensions": ["./index.ts"]
  }
}
```

## Usage

After an assistant response contains code blocks, use commands or the copy panel above the editor.

### Commands

#### Copy

```
/cc         # pick and copy a code block
/copy-code  # same as /cc
/cc 2       # copy block 2 directly
```

#### View

```
/vc         # pick and open a code block in the editor
/view-code  # same as /vc
/vc 2       # open block 2 directly
```

#### Help

```
/cc help              # show help
/vc help              # show help
/cc-help              # show help
/codeblock-copy-help  # same as /cc-help
```

## Configuration

Default commands live in `Config.ts`. Language aliases live in `languages.ts`. Edit the constants, then restart Pi.

```ts
import type { Language } from "./types.ts";

export const COMMANDS = ["cc", "copy-code"] as const;
export const VIEW_COMMANDS = ["vc", "view-code"] as const;
export const HELP_COMMANDS = ["cc-help", "codeblock-copy-help"] as const;

export const PRIMARY_COMMAND = COMMANDS[0];
export const PRIMARY_VIEW_COMMAND = VIEW_COMMANDS[0];
export const PRIMARY_HELP_COMMAND = HELP_COMMANDS[0];

export const EXCLUDE_LANGUAGES: readonly Language[] = [];
```

To exclude a language, use one from `languages.ts`:

```ts
import { LANGUAGES } from "./languages.ts";
import type { Language } from "./types.ts";

export const EXCLUDE_LANGUAGES: readonly Language[] = [LANGUAGES.markdown];
```

## Supported code fences

The extension recognizes fenced code blocks using backticks or tildes.

Built-in language aliases are defined in `languages.ts` under `LANGUAGES`.

Add support for your own language by adding a new `Language` entry, then restart Pi. Shared types live in `types.ts`.

Unknown languages are still copyable and are shown with their fence label.

File layout:

- `Config.ts` — commands and excluded languages
- `languages.ts` — supported language definitions
- `types.ts` — shared types
- `language.ts` — language normalization
- `code-blocks.ts` — fenced code block extraction
- `messages.ts` — latest assistant message text
- `ui.ts` — copy panel, labels, help, notifications

## Development

```bash
yarn install
yarn typecheck
```
