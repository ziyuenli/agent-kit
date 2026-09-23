# agent-kit / pi

Portable Pi profile for **ziyuenli**: pinned public extensions, the local `inline-comments` and `pi-safety` extensions, and a reviewed copy of non-secret Pi configuration.

This package is the `pi/` subdirectory of the harness-neutral `agent-kit` repository; cross-harness skills live at the repository root in `skills/`.

## What this repository syncs

- `extensions/inline-comments/`: your custom inline-feedback extension.
- `extensions/safety/`: the lightweight destructive-operation guard.
- `extensions/capability-loader.ts`: the cold-load loader — lets the agent turn on heavy extensions on demand.
- `extensions/session-summary/index.ts`: automatic session summary + one-line title generation for compact session contexts.
- `profile/packages.json`: exact, pinned package sources for your extension stack.
- `profile/config/`: exported settings, MCP, and `pi-safety` configuration after you review and commit it.
- `scripts/install.mjs`: bootstraps the same Pi profile on another Mac/PC.

`auth.json`, SSH private keys, OAuth tokens, API keys, passwords, and other fields with sensitive names are **never exported**. Sign in again with `/login` on each computer. Do not commit secrets.

## First computer: export the portable configuration

```bash
cd ~/agent-kit/pi
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
git clone git@github.com:ziyuenli/agent-kit.git ~/agent-kit
cd ~/agent-kit/pi
node scripts/install.mjs
pi list
```

The installer merges `profile/config/` into `~/.pi/agent/`, saving a `.backup` copy before changing an existing configuration file. It installs every pinned package and this checked-out repository as a local Pi package.

Then run `pi` and authenticate providers again with `/login`. If you use Zotero or another local MCP service, install/start that desktop service on the new computer too.

`pi-safety` asks before destructive Git operations and non-temporary deletion, with choices for the current call, the same rule kind for the current conversation, or rejection. Temporary-path children are allowed, but the configured temporary root itself still requires confirmation. It blocks system-impacting commands and automatically backs up an existing `mv` destination under `~/.pi/agent/safety-backups/` after checking space on the backup filesystem. Session approvals are held in memory only.

## Automatic session title (zero-cost observer)

`session-summary` is a stateless observer with **no extra LLM calls** and **no extra context**. It never calls `ctx.compact()`; it only watches compaction that Pi itself already runs (`session_compact`) or reads an existing compaction entry at `session_start`.

The title is picked locally from a concrete `## Goal` section of that existing summary; no model call is spent on uncertain goals.

Rules and limits:

- Never overwrite an existing session name.
- Exploratory, placeholder, or explicitly unclear goals do not create a title.
- Context/token cost of this extension is zero: it adds no messages and triggers no summarization.
- Short sessions that never hit Pi's compaction get a local title at `session_shutdown`: all user messages are filtered through the same clarity gate, then the most descriptive one (longest within 60 chars, earliest wins ties) becomes the title — zero model calls; an all-vague session stays unnamed.
- Use `/compact` after the goal is clear if you want an immediate mid-session title.

## Ponytail

The profile pins Ponytail's official Pi adapter at `git:github.com/DietrichGebert/ponytail@v4.9.0`. It provides the `/ponytail` modes and the bundled `ponytail` skills without duplicating their rules in this repository. Install or refresh it with:

```bash
pi install git:github.com/DietrichGebert/ponytail@v4.9.0
```

Restart Pi (or reload extensions) after installation.

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

## Agent rules and maintenance skills

Shared rules live in `AGENTS.md` at the repository root and are exposed to every harness as `~/.agents/AGENTS.md`, a symlink to that file. Each agent's native entry point must explicitly read that path. The Pi entry point is maintained in `profile/AGENTS.md`; deploy it with `node scripts/sync-agent-rules.mjs --check`, then `--apply` after reviewing any differences. Git pull alone does not deploy it.

The repository maintains `skills/rules-maintenance/` and `skills/pi-ext-check/`. Expose them as same-named symlinks under `~/.agents/skills/`, targeting the actual checkout. Inspect and reconcile existing destinations before creating links; do not overwrite independent skill copies. Pi discovers this shared directory; other agents must support it or follow the explicit shared-file pointers. Verify discovery in the target agent after installation or renaming.

`rules-maintenance` handles user-triggered behavior-gap reviews, supervised session distillation, pruning, and approved publication. `pi-ext-check` supplies bounded Pi extension checks. Neither schedules background scans. Approved publication includes commit/push and agreed remote deployment, but pushing this repository does not publish the external shared file or update another machine's active configuration.

## Updating the profile

After changing extensions or safe configuration on the source computer:

```bash
cd ~/agent-kit/pi
node scripts/export-config.mjs
git diff
git add .
git commit -m "chore: update Pi profile"
git push
```

On the other computer:

```bash
cd ~/agent-kit/pi
git pull
node scripts/install.mjs
```
