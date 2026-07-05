# pi-codeblock-copy

`pi-cc` is an extension for quickly copying Pi (https://pi.dev/) outputs without fighting tmux copy-mode, broken line breaks, terminal wrapping, or accidental prompt text.

# Demo

https://github.com/user-attachments/assets/1fbab0d8-a050-490b-b3f0-3726c4eaa13b

## What it does

`pi-cc` detects code blocks in the latest Pi response and displays a compact copy panel with numbered entries, language labels, and previews for quick selection.

Use it to:

- Copy a specific code block to your clipboard
- Pick from multiple code blocks with a selector
- Open a code block in Pi's editor before copying or editing it

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

After an assistant response contains code blocks, use either commands or shortcuts.

### Commands

```text
/cc
/cc 2
/vc
/vc 2
/cc-help
```

| Command | Description |
| --- | --- |
| `/cc` or `/copy-code` | Copy a code block from the latest assistant response |
| `/cc 2` | Copy block 2 directly |
| `/vc` or `/view-code` | Open a code block in the Pi editor |
| `/vc 2` | Open block 2 directly |
| `/cc-help` or `/codeblock-copy-help` | Open command and shortcut help |

### Shortcuts

| Shortcut | Description |
| --- | --- |
| `ctrl+shift+y` | Copy a block from the latest assistant response |
| `ctrl+shift+x` | Start prefix mode |
| `ctrl+shift+x`, then `c` | Pick and copy a block |
| `ctrl+shift+x`, then `v` | Pick and view a block |
| `ctrl+shift+x`, then `1`-`9` | Copy that numbered block |
| `esc` | Cancel prefix mode |

## Configuration

Configure with environment variables or a local `config.json` next to `index.ts`. Environment variables take precedence.

### Environment variables

```bash
PI_CODEBLOCK_COPY_COMMANDS="copy-code,cc"
PI_CODEBLOCK_COPY_VIEW_COMMANDS="view-code,vc"
PI_CODEBLOCK_COPY_HELP_COMMANDS="codeblock-copy-help,cc-help"
PI_CODEBLOCK_COPY_LEADER_SHORTCUT="ctrl+shift+x"
PI_CODEBLOCK_COPY_DIRECT_SHORTCUT="ctrl+shift+y"
PI_CODEBLOCK_COPY_LEADER_TIMEOUT_MS="2000"
```

Set a shortcut to `false`, `none`, or `off` to disable it.

### config.json

```json
{
  "commands": ["copy-code", "cc"],
  "viewCommands": ["view-code", "vc"],
  "helpCommands": ["codeblock-copy-help", "cc-help"],
  "leaderShortcut": "ctrl+shift+x",
  "directShortcut": "ctrl+shift+y",
  "leaderTimeoutMs": 2000
}
```

`config.json` is ignored by git so local shortcut preferences stay private.

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

## Development

```bash
yarn install
```
