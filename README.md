# pi-extensions

Portable Pi profile for **ziyuenli**: pinned public extensions, the local `inline-comments` and `pi-safety` extensions, and a reviewed copy of non-secret Pi configuration.

## What this repository syncs

- `extensions/inline-comments/`: your custom inline-feedback extension.
- `extensions/safety/`: the lightweight destructive-operation guard.
- `extensions/capability-loader.ts`: the cold-load loader — lets the agent turn on heavy extensions on demand.
- `profile/packages.json`: exact, pinned npm sources for your extension stack.
- `profile/config/`: exported settings, MCP, and `pi-safety` configuration after you review and commit it.
- `scripts/install.mjs`: bootstraps the same Pi profile on another Mac/PC.

`auth.json`, SSH private keys, OAuth tokens, API keys, passwords, and other fields with sensitive names are **never exported**. Sign in again with `/login` on each computer. Do not commit secrets.

## First computer: export the portable configuration

```bash
cd ~/pi-extensions
node scripts/export-config.mjs
git diff -- profile/config
git add profile/config
git commit -m "chore: export portable Pi configuration"
git push
```

The export reads only these Pi files when they exist:

- `~/.pi/agent/settings.json`
- `~/.pi/agent/mcp.json`
- `~/.pi/agent/extensions/pi-safety/config.json`

Review the generated files before committing. The script removes sensitive JSON fields, but you remain responsible for confirming that no confidential endpoint, path, or personal data is included.

## New computer: install the same profile

```bash
git clone git@github.com:ziyuenli/pi-extensions.git ~/pi-extensions
cd ~/pi-extensions
node scripts/install.mjs
pi list
```

The installer merges `profile/config/` into `~/.pi/agent/`, saving a `.backup` copy before changing an existing configuration file. It installs every pinned package and this checked-out repository as a local Pi package.

Then run `pi` and authenticate providers again with `/login`. If you use Zotero or another local MCP service, install/start that desktop service on the new computer too.

`pi-safety` asks before destructive Git operations and non-temporary deletion, with choices for the current call, the same rule kind for the current conversation, or rejection. Temporary-path children are allowed, but the configured temporary root itself still requires confirmation. It blocks system-impacting commands and automatically backs up an existing `mv` destination under `~/.pi/agent/safety-backups/` after checking space on the backup filesystem. Session approvals are held in memory only.

## Use inline comments

On Pi versions that expose transcript selection, run `/inline-comments` to enable capture, then select assistant text and press `Alt+E` (or `Alt+Shift+E`) to add a comment. A selection made before enabling is retained and becomes available when the feature is enabled. `/inline-comments:open <quoted text>` is the text-based fallback and also works without selection support. After one or more comments are staged, press Enter with an empty chat input to send them; `/inline-comments:send` remains the explicit alternative. Commands:

```text
/inline-comments
/inline-comments:open <quoted text>
/inline-comments:send
/inline-comments:clear
```

## Cold-load (on-demand) capabilities

Heavy extensions are **installed but not autoloaded**, so cold start stays fast. The
`capability-loader` extension (always on, near-zero cost) lets the agent or you switch
them on when actually needed — it writes the package into `settings.packages` and
`ctx.reload()`s.

| Capability | Package | Enable |
| --- | --- | --- |
| web (search/fetch/PDF/video) | `pi-web-access` | `web` |
| code lens (LSP/ast-grep/structural) | `pi-lens` | `lens` |
| browser review/annotation | `@plannotator/pi-extension` | `plannotate` |
| MCP proxy (Zotero) | `pi-mcp-adapter` | `mcp` |

The agent calls the `enable_capability` tool (or you run `/capability-enable <name>`);
it loads after a short reload. Use `disable_capability` / `/capability-disable <name>`
to remove it so the next cold start is fast again. As a fallback, `piweb`, `pilens`,
and `pimcp` shell aliases start a session with the package via `-e` (added to `~/.zshrc`
by `install.mjs`).

## Updating the profile

After changing extensions or safe configuration on the source computer:

```bash
cd ~/pi-extensions
node scripts/export-config.mjs
git diff
git add .
git commit -m "chore: update Pi profile"
git push
```

On the other computer:

```bash
cd ~/pi-extensions
git pull
node scripts/install.mjs
```
