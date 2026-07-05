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

After an assistant response contains code blocks, use commands, shortcuts, or the copy panel above the editor.

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

Default commands, shortcuts, and supported languages live in `Config.ts`. Edit the constants, then restart Pi.

```ts
export const DEFAULT_COMMANDS = ["copy-code", "cc"];
export const DEFAULT_VIEW_COMMANDS = ["view-code", "vc"];
export const DEFAULT_HELP_COMMANDS = ["codeblock-copy-help", "cc-help"];

export const DEFAULT_LEADER_SHORTCUT = "ctrl+shift+x";
export const DEFAULT_DIRECT_SHORTCUT = "ctrl+shift+y";
export const DEFAULT_LEADER_TIMEOUT_MS = 2000;

export const SUPPORTED_LANGUAGES = [
  { name: "bash", extension: "sh", aliases: ["bash", "sh", "shell"], color: "success" },
];
```

## Supported code fences

The extension recognizes fenced code blocks using backticks or tildes.

Built-in language aliases are defined in `Config.ts` under `SUPPORTED_LANGUAGES`.

Add support for your own language by adding a new entry with a name, file extension, aliases, and display color. Shared types live in `Types.ts`.

Unknown languages are still copyable and are shown with their fence label.

## Development

```bash
yarn install
```
