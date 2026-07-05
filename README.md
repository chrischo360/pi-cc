# pi-codeblock-copy

`pi-cc` is an extension for quickly copying Pi (https://pi.dev/) outputs without fighting tmux copy-mode, broken line breaks, terminal wrapping, or accidental prompt text.

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

```text
/cc
/cc 2
/cc help
/copy-code
/vc
/vc 2
/view-code
/cc-help
/codeblock-copy-help
```

| Command | Description |
| --- | --- |
| `/cc` or `/copy-code` | Pick and copy a code block from the latest assistant response |
| `/cc 2` | Copy block 2 directly |
| `/cc help`, `/cc --help`, `/cc -h`, `/cc ?` | Open command and shortcut help |
| `/vc` or `/view-code` | Pick and open a code block in Pi's editor |
| `/vc 2` | Open block 2 directly |
| `/vc help`, `/vc --help`, `/vc -h`, `/vc ?` | Open command and shortcut help |
| `/cc-help` or `/codeblock-copy-help` | Open command and shortcut help |

### Shortcuts

| Shortcut | Description |
| --- | --- |
| `ctrl+shift+y` | Copy a block from the latest assistant response |
| `ctrl+shift+x` | Start prefix mode |
| `ctrl+shift+x`, then `c` | Pick and copy a block |
| `ctrl+shift+x`, then `v` | Pick and view a block |
| `ctrl+shift+x`, then `1`-`9` | Copy that numbered block |
| `esc` or `ctrl+c` | Cancel prefix mode |

## Configuration

Default commands and shortcuts live in `Config.ts`. Edit the constants, then restart Pi.

```ts
export const DEFAULT_COMMANDS = ["copy-code", "cc"];
export const DEFAULT_VIEW_COMMANDS = ["view-code", "vc"];
export const DEFAULT_HELP_COMMANDS = ["codeblock-copy-help", "cc-help"];

export const DEFAULT_LEADER_SHORTCUT = "ctrl+shift+x";
export const DEFAULT_DIRECT_SHORTCUT = "ctrl+shift+y";
export const DEFAULT_LEADER_TIMEOUT_MS = 2000;
```

## Supported code fences

The extension recognizes fenced code blocks using backticks or tildes.

Supported languages include:

- `bash`, `sh`, `shell`
- `css`
- `diff`, `patch`
- `html`
- `javascript`, `js`
- `json`
- `jsx`
- `lua`
- `python`, `py`
- `sql`
- `text`, `txt`, `plain`, `plaintext`
- `typescript`, `ts`
- `tsx`
- `toml`
- `yaml`, `yml`
- `zsh`

Unknown languages are still copyable and are shown with their fence label.

## Development

```bash
yarn install
```
