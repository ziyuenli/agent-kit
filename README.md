# agent-kit

Harness-neutral knowledge and tooling for my agents.

## Layout convention

- `skills/` — the single maintained copy of cross-harness skills. Each agent consumes them through symlinks from its own skills root (`~/.agents/skills/`, `~/.pi/agent/skills/`); never copy a skill into an agent directory.
- `AGENTS.md` — the single manually maintained copy of shared rules. Each agent consumes it through a symlink or a thin entry-point file; never copy its content elsewhere.
- `<agent>/` — per-agent deployment material, named after the harness: entry points, extensions, pinned profile, and deploy scripts. Install or develop an extension inside the agent's own directory here, then link it into the harness-native location that harness expects.
  - `claude/` — Claude entry point (`CLAUDE.md`), deployed as `~/.claude/CLAUDE.md`.
  - `pi/` — the Pi package: extensions, pinned profile, and deployment scripts. See [`pi/README.md`](pi/README.md).
  - `dsh/` — DSH rules link and harness notes. See [`dsh/README.md`](dsh/README.md).
- `scripts/` — repository maintenance scripts. `deploy.mjs` applies every `<agent>/deploy.json`; see "Adding a new agent".

## Adding a new agent

1. Create `<agent>/deploy.json` declaring the harness wiring:
   - `detect` — paths that prove this harness is installed here; the first existing one becomes `{home}`. A candidate naming an unset variable is skipped.
   - `rules` — `symlink` with `source` and a `{home}`-relative `target`, or `dispatch` with the `command` that runs that harness's own deployment script instead.
   - `skillRoots` — `ensure` links every `skills/` entry into that root; `report` only checks it. Use `ensure` for `~/.agents/skills` and for a harness-specific root that harness scans, `report` for a redundant root.
2. Add the entry point, extension, or profile material the harness needs inside `<agent>/`.
3. Deploy and check:

```sh
node scripts/deploy.mjs <agent> --dry-run   # print the actions
node scripts/deploy.mjs <agent>             # apply one harness
node scripts/deploy.mjs --all               # every harness detected here
```

The runner is idempotent and refuses to overwrite a regular file at a target. A harness whose rules need copying with backups, rather than linking, keeps its own script and uses `dispatch`.

## Pending review

- [Harness course distillation](reviews/harness-course/README.md) — 14 lectures, existing implementation map, and decisions awaiting Li review. Reference drafts only; not active agent rules.
