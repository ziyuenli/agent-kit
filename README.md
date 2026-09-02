# pi-extensions

Portable Pi profile for **ziyuenli**: pinned public extensions, the local `inline-comments` extension, and a reviewed copy of non-secret Pi configuration.

## What this repository syncs

- `extensions/inline-comments/`: your custom inline-feedback extension.
- `profile/packages.json`: exact, pinned npm sources for your extension stack.
- `profile/config/`: exported settings, MCP, and permission-policy configuration after you review and commit it.
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
- `~/.pi/agent/extensions/pi-permission-system/config.json`

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

## Use inline comments

On Pi versions that expose transcript selection, select assistant text and press `Alt+E` (or `Alt+Shift+E`) to add a comment. Older Pi versions remain usable through `/inline-comments:open <quoted text>`; upgrade Pi to enable selection shortcuts. Commands:

```text
/inline-comments
/inline-comments:open
/inline-comments:send
/inline-comments:clear
```

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
