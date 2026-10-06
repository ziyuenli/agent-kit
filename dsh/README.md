# agent-kit / dsh

DSH deployment material for this agent kit. Shared rules live at the repository root in `AGENTS.md`; cross-harness skills live in `skills/`. Nothing in this directory duplicates them.

## How DSH consumes the shared material

| Shared source | DSH path | Mechanism |
| --- | --- | --- |
| `AGENTS.md` (repository root) | `$DSH_HOME/AGENTS.md` | symlink; DSH injects it as user-global instructions into every session, whatever the working directory |
| `skills/<name>/` | `~/.agents/skills/<name>` | symlink; DSH discovers that directory as the user-level agent skills root |

Both paths are fixed by the harness, not configurable per session:

- `packages/context/agent-instructions/src/config.ts` resolves the instruction home as explicit configuration, then `$DSH_HOME`, then `~/.dsh`; the global file name is fixed at `AGENTS.md` (`src/render.ts`, `USER_GLOBAL_FILE`). `maxBytes` bounds the whole rendered batch, so the shared file competes with project instructions for that budget.
- `packages/skill/skill-filesystem/src/index.ts` `roots()` includes `<dshHome>/skills` and `<agentsHome>/skills` beside the project-level `.dsh/skills` and `.agents/skills`.

The global file links to the repository file directly rather than to `~/.agents/AGENTS.md`. Both spellings resolve to the same file; the direct link removes one hop owned by other agents. `~/.agents/AGENTS.md` stays in place for the harnesses that already consume it.

DSH has no intermediate entry-point file. Unlike `claude/CLAUDE.md`, which must ask the agent to read the shared rules, DSH injects them, so `dsh/` holds no such file.

## Deploy

```sh
node scripts/deploy.mjs dsh      # this harness only
node scripts/deploy.mjs --all    # every harness detected on this machine
```

`dsh/deploy.json` declares the wiring and the repository-root `scripts/deploy.mjs` applies it. The runner links the shared rules into the resolved home, ensures every agent-kit skill is linked under the shared hub `~/.agents/skills`, and refuses to overwrite a regular file at the target. `$DSH_HOME` differs per machine and per app build, so the home is resolved at run time from the `detect` list: `$DSH_HOME` when the variable is set, otherwise the DSH Desktop harness home, otherwise `~/.dsh`; the target is written as `{home}/AGENTS.md`, so the link always lands in the home that was detected. An earlier revision of this directory shipped `dsh/scripts/deploy.sh`; the runner replaced it and covers every harness.

## Known limitations and deferred work

- This directory holds only the rules link today. DSH plugins are installed into the profile (`package.json` dependencies plus `cordis.patch.yml` patch entries under the DSH home), and no repo-owned plugin exists yet. When the first one lands, mirror the profile inputs under `dsh/profile/` following `pi/profile/`.
- The runner writes a symlink only. It never overwrites a regular file at `$DSH_HOME/AGENTS.md`; if one exists, it stops and reports, because machine-local rules may have been placed there deliberately.
