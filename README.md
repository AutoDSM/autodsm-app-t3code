# AutoDSM

AutoDSM is a local-first desktop workspace for creating, customizing, reviewing, and shipping React design systems with scoped AI.

## Download & get started

Get up and running in three steps:

**1. Download the app**

Grab the latest macOS build from the [**Releases**](https://github.com/AutoDSM/autodsm-app-t3code/releases) page:

- **Apple Silicon (M1–M4):** `AutoDSM-<version>-arm64.zip`
- **Intel:** `AutoDSM-<version>-x64.zip`

Unzip it (double-click) and move **AutoDSM.app** into your **Applications** folder.

> [!IMPORTANT]
> This is an **unsigned build**, so macOS Gatekeeper quarantines it on download. Clearing that
> is one Terminal command (takes ~2 seconds):
>
> ```bash
> xattr -dr com.apple.quarantine /Applications/AutoDSM.app
> ```
>
> Then open **AutoDSM** normally (double-click). If you skip this, macOS shows *“AutoDSM is
> damaged and can’t be opened.”* — that’s just the unsigned-app warning, not a real problem; the
> command above removes the download-quarantine attribute so it launches.

**2. Connect a coding agent** (required — AutoDSM drives your own local AI CLI)

Install and sign in to at least one provider:

| Provider | Install | Sign in |
| --- | --- | --- |
| Codex | [Codex CLI](https://developers.openai.com/codex/cli) | `codex login` |
| Claude | [Claude Code](https://claude.com/product/claude-code) | `claude auth login` |
| OpenCode | [OpenCode](https://opencode.ai) | `opencode auth login` |

**3. Launch AutoDSM** from Applications, open or create a design-system workspace, and start building components.

> [!NOTE]
> Prefer the terminal? You can run AutoDSM without installing the desktop app with `npx t3` (see [Installation](#installation) below).

## Installation

> [!WARNING]
> AutoDSM currently supports Codex, Claude, and OpenCode.
> Install and authenticate at least one provider before use:
>
> - Codex: install [Codex CLI](https://developers.openai.com/codex/cli) and run `codex login`
> - Claude: install [Claude Code](https://claude.com/product/claude-code) and run `claude auth login`
> - OpenCode: install [OpenCode](https://opencode.ai) and run `opencode auth login`

### Run without installing

```bash
npx t3
```

### Desktop app

Download the latest desktop build from [GitHub Releases](https://github.com/AutoDSM/autodsm-app-t3code/releases). See [Download & get started](#download--get-started) above for the macOS install steps.

> Package-registry installs (winget / Homebrew / AUR) are not available during the beta.

## Privacy

Anonymous usage analytics are **off by default** during the beta. To opt in, set
`T3CODE_TELEMETRY_ENABLED=1` in the app's environment.

## Some notes

We are very very early in this project. Expect bugs.

We are not accepting contributions yet.

Observability guide: [docs/observability.md](./docs/observability.md)

Remote access guide: [REMOTE.md](./REMOTE.md)

Keybindings guide: [KEYBINDINGS.md](./KEYBINDINGS.md)

Product docs: [AUTODSM.md](./AUTODSM.md)

## License

MIT
